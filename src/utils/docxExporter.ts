import {
  AlignmentType,
  Bookmark,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  NumberFormat,
  PageBreak,
  PageNumber,
  PageOrientation,
  PageReference,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableOfContents,
  TableRow,
  Tab,
  TabStopType,
  LeaderType,
  SectionType,
  TextRun,
  WidthType
} from 'docx';
import type { FileChild, ISectionOptions, PageNumberEstimator, ParagraphChild } from 'docx';
import { saveAs } from 'file-saver';
import { ParsedDocument, DocumentConfig, DocumentBlock, DocumentSection, CoverData } from '../types/document';
import { EffectiveConfig, getEffectiveConfig } from './effectiveConfig';
import { parseInlineSegments } from './inlineFormat';
import {
  LIST_INDENT_CM,
  ListLabel,
  buildListLabels,
  stripListMarker
} from './listNumbering';
import {
  MEMBER_COLUMN_GAP_MM,
  buildCoverLines,
  coverHasContent,
  coverLogoBox,
  CoverLine
} from './cover';
import { formatChapterHeading, formatSubHeadingNumber, paperDimensions, splitHeadingNumberTitle } from './formatEngine';
import { buildJournalFront, stripBabPrefix, stripSectionNumber } from './journalFormat';
import {
  findCoverHeadingBlock,
  findCoverTitleBlock,
  isFrontMatterType,
  isTitleBlock,
  normalizeTitle
} from './previewLayout';

const CM_TO_TWIP = 567;
const A4_WIDTH_TWIP = 11906;

const cmToTwip = (cm: number) => Math.round(cm * CM_TO_TWIP);
const ptToHalfPoints = (pt: number) => Math.round(pt * 2);

function bodyAlignment(effective: EffectiveConfig) {
  if (effective.alignment === 'center') return AlignmentType.CENTER;
  if (effective.alignment === 'left') return AlignmentType.LEFT;
  return AlignmentType.JUSTIFIED;
}

function inlineRuns(
  text: string,
  font: string,
  size: number,
  options: { bold?: boolean; italics?: boolean; color?: string } = {}
): TextRun[] {
  return parseInlineSegments(text).map(
    (segment) =>
      new TextRun({
        text: segment.text,
        font,
        size,
        bold: options.bold || segment.bold,
        italics: options.italics || segment.italic,
        color: options.color
      })
  );
}

interface Typography {
  font: string;
  line: number;
  titleSize: number;
  subTitleSize: number;
  bodySize: number;
  captionSize: number;
  tableSize: number;
  tableStyle: EffectiveConfig['tableStyle'];
  firstLineIndent: number;
  hangingIndent: number;
  alignment: (typeof AlignmentType)[keyof typeof AlignmentType];
  numbering: boolean;
  heading: EffectiveConfig['headingRules'];
  pageSetup: EffectiveConfig['pageSetup'];
  coverLayout: EffectiveConfig['coverLayout'];
  /** Lebar konten halaman dalam px (96 dpi) — batas lebar gambar isi. */
  contentWidthPx: number;
}

function buildTypography(effective: EffectiveConfig): Typography {
  const mm = paperDimensions(
    effective.pageSetup.paperSize,
    effective.pageSetup.orientation === 'landscape'
  );
  const contentWidthMm = mm.widthMm - (effective.margin.left + effective.margin.right) * 10;
  return {
    font: effective.fontFamily,
    line: Math.round(effective.lineSpacing * 240),
    titleSize: ptToHalfPoints(effective.fontSize.title),
    subTitleSize: ptToHalfPoints(effective.fontSize.subTitle),
    bodySize: ptToHalfPoints(effective.fontSize.body),
    captionSize: ptToHalfPoints(effective.fontSize.caption),
    tableSize: ptToHalfPoints(effective.fontSize.table),
    tableStyle: effective.tableStyle,
    firstLineIndent: cmToTwip(effective.firstLineIndent),
    hangingIndent: cmToTwip(effective.hangingIndent),
    alignment: bodyAlignment(effective),
    numbering: effective.numbering,
    heading: effective.headingRules,
    pageSetup: effective.pageSetup,
    coverLayout: effective.coverLayout,
    contentWidthPx: Math.round(contentWidthMm * (96 / 25.4))
  };
}

function pageBreakParagraph(): Paragraph {
  return new Paragraph({ children: [new PageBreak()] });
}

function headingParagraph(
  text: string,
  level: 1 | 2 | 3,
  typography: Typography
): Paragraph {
  const hr = typography.heading;
  const style = level === 1 ? hr.h1 : level === 2 ? hr.h2 : hr.h3;
  const size =
    level === 1 ? typography.titleSize : typography.subTitleSize;

  const runOptions = (runText: string) => ({
    text: style.allCaps ? runText.toUpperCase() : runText,
    font: typography.font,
    size,
    bold: style.bold,
    italics: style.italic,
    color: '000000' as const
  });

  let children: ParagraphChild[];
  let headingParts: { number: string; title: string } | null = null;
  if (level === 1) {
    const rendered = formatChapterHeading(text, hr.numberingFormat, hr.babTitleStyle);
    if (hr.babTitleStyle === 'joined' || !rendered.label) {
      children = [new TextRun(runOptions(rendered.joined))];
    } else {
      children = [
        new TextRun(runOptions(rendered.label)),
        new TextRun({ ...runOptions(rendered.title), break: 1 })
      ];
    }
  } else {
    const display = level === 2 ? formatSubHeadingNumber(text, hr.h2Numbering) : text;
    // Posisi judul (cm): run nomor + tab + run judul, dengan tab stop kiri di
    // posisi tersebut — judul selalu mulai rata seperti di pratinjau.
    headingParts = hr.numberTitleGapCm > 0 ? splitHeadingNumberTitle(display) : null;
    children = headingParts
      ? [
          new TextRun(runOptions(headingParts.number)),
          new TextRun({ children: [new Tab()], font: typography.font, size }),
          new TextRun(runOptions(headingParts.title))
        ]
      : [new TextRun(runOptions(display))];
  }

  const tabStops =
    headingParts && hr.numberTitleGapCm > 0
      ? [{ type: TabStopType.LEFT, position: cmToTwip(hr.numberTitleGapCm) }]
      : undefined;

  return new Paragraph({
    heading:
      level === 1
        ? HeadingLevel.HEADING_1
        : level === 2
          ? HeadingLevel.HEADING_2
          : HeadingLevel.HEADING_3,
    alignment: (style.alignment === 'center'
      ? AlignmentType.CENTER
      : style.alignment === 'left'
        ? AlignmentType.LEFT
        : AlignmentType.JUSTIFIED) as (typeof AlignmentType)[keyof typeof AlignmentType],
    spacing: {
      before: Math.round(style.spaceBefore * 20),
      after: Math.round(style.spaceAfter * 20),
      line: typography.line
    },
    tabStops,
    children
  });
}

function plainHeadingParagraph(text: string, typography: Typography): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 240, after: 200, line: typography.line },
    children: inlineRuns(text.toUpperCase(), typography.font, typography.titleSize, {
      bold: true,
      color: '000000'
    })
  });
}

function blocksWithoutDuplicateTitle(section: DocumentSection): DocumentBlock[] {
  const blocks = section.blocks;
  if (
    blocks.length > 0 &&
    isTitleBlock(blocks[0]) &&
    normalizeTitle(blocks[0].formattedContent) === normalizeTitle(section.title)
  ) {
    return blocks.slice(1);
  }
  return blocks;
}

function blockParagraph(
  block: DocumentBlock,
  typography: Typography,
  listLabels: Map<string, ListLabel>
): Paragraph {
  const text = block.formattedContent;

  if (block.type === 'heading_1') {
    return headingParagraph(text, 1, typography);
  }

  if (block.type === 'heading_2') {
    return headingParagraph(text, 2, typography);
  }

  if (block.type === 'heading_3') {
    return headingParagraph(text, 3, typography);
  }

  if (block.type === 'list_item') {
    const body = stripListMarker(text);
    const numbering = listLabels.get(block.id);
    const level = numbering?.level ?? 1;
    const step = cmToTwip(LIST_INDENT_CM);

    return new Paragraph({
      alignment: typography.alignment,
      indent: typography.numbering
        ? { left: step * level, hanging: step }
        : { left: step * (level - 1) },
      spacing: { before: 40, after: 40, line: typography.line },
      children: typography.numbering
        ? [
            new TextRun({
              text: numbering?.label ?? '1.',
              font: typography.font,
              size: typography.bodySize
            }),
            // Tab eksplisit: berhenti tepat di posisi left indent (= awal teks).
            new TextRun({
              children: [new Tab()],
              font: typography.font,
              size: typography.bodySize
            }),
            ...inlineRuns(body, typography.font, typography.bodySize)
          ]
        : inlineRuns(body, typography.font, typography.bodySize)
    });
  }

  if (block.type === 'image') {
    const meta = (block.meta ?? {}) as { dataUrl?: string; width?: number; height?: number };
    const naturalWidth = meta.width ?? typography.contentWidthPx;
    const naturalHeight = meta.height ?? Math.round(naturalWidth * 0.75);
    const scale = Math.min(1, typography.contentWidthPx / Math.max(1, naturalWidth));
    const width = Math.max(1, Math.round(naturalWidth * scale));
    const height = Math.max(1, Math.round(naturalHeight * scale));
    const image = dataUrlToImageRun(meta.dataUrl ?? '', width, height);
    if (!image) {
      return new Paragraph({ children: [] });
    }
    return new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 120, line: typography.line },
      children: [image]
    });
  }

  if (block.type === 'signature') {
    const meta = (block.meta ?? {}) as { place?: string; date?: string; signer?: string };
    const dateLine = [meta.place, meta.date].filter(Boolean).join(', ') || text;
    const signer = typeof meta.signer === 'string' ? meta.signer : '';

    return new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 360, after: 0, line: typography.line },
      children: [
        ...inlineRuns(dateLine, typography.font, typography.bodySize),
        ...(signer
          ? [
              new TextRun({
                text: signer,
                break: 3,
                font: typography.font,
                size: typography.bodySize
              })
            ]
          : [])
      ]
    });
  }

  if (block.type === 'daftar_pustaka_item') {
    return new Paragraph({
      alignment: AlignmentType.LEFT,
      indent:
        typography.hangingIndent > 0
          ? { left: typography.hangingIndent, hanging: typography.hangingIndent }
          : undefined,
      spacing: { before: 40, after: 80, line: typography.line },
      children: inlineRuns(text, typography.font, typography.bodySize)
    });
  }

  return new Paragraph({
    alignment: typography.alignment,
    indent: typography.firstLineIndent > 0 ? { firstLine: typography.firstLineIndent } : undefined,
    spacing: { before: 0, after: 0, line: typography.line },
    children: inlineRuns(text, typography.font, typography.bodySize)
  });
}

function coverParagraphs(section: DocumentSection, typography: Typography): Paragraph[] {
  const blocks = section.blocks.filter((block) => block.formattedContent.trim().length > 0);

  if (blocks.length === 0) {
    return [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 240, after: 200, line: typography.line },
        children: inlineRuns(section.title, typography.font, typography.titleSize, { bold: true })
      })
    ];
  }

  const headingBlock = findCoverHeadingBlock(blocks);
  const titleBlock = findCoverTitleBlock(blocks);

  return blocks.map((block) => {
    const isHeading = block === headingBlock;
    const isTitle = block === titleBlock;
    const size = isHeading
      ? ptToHalfPoints(typography.titleSize / 2 + 2)
      : isTitle
        ? typography.titleSize
        : typography.bodySize;

    return new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: {
        before: isHeading ? 200 : 80,
        after: 120,
        line: typography.line
      },
      children: inlineRuns(
        block.formattedContent,
        typography.font,
        size,
        { bold: isHeading || isTitle, color: '000000' }
      )
    });
  });
}

function dataUrlToImageRun(dataUrl: string, width: number, height: number): ImageRun | null {
  if (!dataUrl) return null;

  const match = dataUrl.match(/^data:image\/(png|jpe?g);base64,([\s\S]+)$/i);
  if (!match) return null;

  const type = match[1].toLowerCase() === 'png' ? 'png' : 'jpg';

  let bytes: Uint8Array;
  try {
    const binary = atob(match[2]);
    bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) {
      bytes[index] = binary.charCodeAt(index);
    }
  } catch {
    return null;
  }

  return new ImageRun({ type, data: bytes, transformation: { width, height } });
}

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };

function memberTable(rows: CoverLine[], typography: Typography): Table {
  const cellParagraph = (text: string) =>
    new Paragraph({
      spacing: { line: typography.line, after: 0 },
      children: [
        new TextRun({
          text,
          font: typography.font,
          size: typography.bodySize,
          bold: true,
          color: '000000'
        })
      ]
    });

  return new Table({
    alignment: AlignmentType.CENTER,
    layout: TableLayoutType.AUTOFIT,
    borders: {
      top: NO_BORDER,
      bottom: NO_BORDER,
      left: NO_BORDER,
      right: NO_BORDER,
      insideHorizontal: NO_BORDER,
      insideVertical: NO_BORDER
    },
    rows: rows.map(
      (row) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 0, type: WidthType.AUTO },
              margins: { top: 0, bottom: 0, left: 0, right: cmToTwip(MEMBER_COLUMN_GAP_MM / 10) },
              children: [cellParagraph(row.name ?? '')]
            }),
            new TableCell({
              width: { size: 0, type: WidthType.AUTO },
              margins: { top: 0, bottom: 0, left: 0, right: 0 },
              children: [cellParagraph(row.nim ?? '')]
            })
          ]
        })
    )
  });
}

/** Cover terstruktur: sumber data yang sama dengan pratinjau A4. */
function structuredCoverParagraphs(cover: CoverData, typography: Typography): FileChild[] {
  const bodyPt = typography.bodySize / 2;
  const lines = buildCoverLines(cover, {
    placeholders: false,
    variant: typography.coverLayout.variant
  });
  const children: FileChild[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (line.kind === 'member') {
      const group: CoverLine[] = [];
      while (index < lines.length && lines[index].kind === 'member') {
        group.push(lines[index]);
        index += 1;
      }
      index -= 1;

      children.push(memberTable(group, typography));
      continue;
    }

    const linePt = line.size === 'title' ? typography.titleSize / 2 : bodyPt;
    const before = Math.round(line.spaceBefore * linePt * 20);

    if (line.kind === 'logo') {
      const box = coverLogoBox(cover);
      const image = dataUrlToImageRun(cover.logo ?? '', box.width, box.height);
      if (!image) continue;

      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before, after: 60 },
          children: [image]
        })
      );
      continue;
    }

    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before, after: 0, line: typography.line },
        children: inlineRuns(
          line.uppercase ? line.text.toUpperCase() : line.text,
          typography.font,
          line.size === 'title' ? typography.titleSize : typography.bodySize,
          { bold: line.bold, italics: line.italic, color: '000000' }
        )
      })
    );
  }

  return children;
}

function tableBorder(typography: Typography) {
  // docx memakai satuan 1/8 pt untuk ketebalan garis.
  const size = Math.max(2, Math.round(typography.tableStyle.borderWidth * 8));
  return { style: BorderStyle.SINGLE, size, color: '64748B' };
}

function tableBlock(block: DocumentBlock, typography: Typography): Table {
  const header = ((block.meta?.header ?? []) as string[]).filter(Boolean);
  const rows = ((block.meta?.rows ?? []) as string[][]).filter((row) => row.some(Boolean));
  const border = tableBorder(typography);
  const cellAlignment =
    typography.tableStyle.cellAlignment === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT;

  const tableRow = (cells: string[], bold: boolean) =>
    new TableRow({
      tableHeader: bold,
      children: cells.map(
        (cell) =>
          new TableCell({
            margins: { top: 40, bottom: 40, left: 80, right: 80 },
            children: [
              new Paragraph({
                alignment: cellAlignment,
                spacing: { line: 240, before: 0, after: 0 },
                children: inlineRuns(cell, typography.font, typography.tableSize, {
                  bold: bold && typography.tableStyle.headerBold
                })
              })
            ]
          })
      )
    });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: border,
      bottom: border,
      left: border,
      right: border,
      insideHorizontal: border,
      insideVertical: border
    },
    rows: [
      ...(header.length > 0 ? [tableRow(header, true)] : []),
      ...rows.map((row) => tableRow(row, false))
    ]
  });
}

const captionBookmarkId = (blockId: string) => `cap_${blockId.replace(/[^A-Za-z0-9_]/g, '')}`;

/** Caption tabel/gambar: label tebal, keterangan biasa, 10 pt. */
function captionParagraph(block: DocumentBlock, typography: Typography): Paragraph {
  // Label/diambil dari formattedContent bila meta kosong agar nomor hasil
  // renumberCaptions ("Gambar 2.1 …") selalu tampil terbaru.
  const match = block.formattedContent.match(
    /^((?:Gambar|Tabel)\s+[\d.]+)\s*[:.]?\s*(.*)$/i
  );
  const label =
    (block.meta?.label as string) ?? (match?.[1] ?? '');
  const description =
    (block.meta?.description as string) ?? (match?.[2] ?? '');
  const runs: ParagraphChild[] = [];

  if (label) {
    runs.push(
      new TextRun({
        text: label,
        bold: true,
        font: typography.font,
        size: typography.captionSize,
        color: '000000'
      })
    );
  }

  if (description) {
    runs.push(
      new TextRun({
        text: `: ${description}`,
        font: typography.font,
        size: typography.captionSize,
        color: '000000'
      })
    );
  }

  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 80, line: typography.line },
    keepNext: block.type === 'table_caption',
    children: [new Bookmark({ id: captionBookmarkId(block.id), children: runs })]
  });
}

/** Entri Daftar Tabel/Gambar dengan titik-titik dan nomor halaman (PAGEREF). */
function captionListParagraph(
  block: DocumentBlock,
  typography: Typography,
  textWidth: number
): Paragraph {
  const captionId = block.meta?.captionBlockId as string | undefined;
  const children: ParagraphChild[] = [
    new TextRun({
      text: block.formattedContent,
      font: typography.font,
      size: typography.bodySize,
      color: '000000'
    }),
    new TextRun({ text: '\t', font: typography.font, size: typography.bodySize })
  ];

  if (captionId) {
    children.push(new PageReference(captionBookmarkId(captionId), { hyperlink: true }));
  }

  return new Paragraph({
    spacing: { before: 40, after: 40, line: typography.line },
    tabStops: [{ type: TabStopType.RIGHT, position: textWidth, leader: LeaderType.DOT }],
    children
  });
}

function sectionBodyParagraphs(section: DocumentSection, typography: Typography): FileChild[] {
  const children: FileChild[] = [];

  const listLabels = buildListLabels(section.blocks);

  for (const block of blocksWithoutDuplicateTitle(section)) {
    // Blok image punya formattedContent kosong — jangan ter-skip.
    if (!block.formattedContent.trim() && block.type !== 'image' && block.type !== 'table') continue;

    if (block.type === 'table_caption' || block.type === 'figure_caption') {
      children.push(captionParagraph(block, typography));
      continue;
    }

    children.push(
      block.type === 'table'
        ? tableBlock(block, typography)
        : blockParagraph(block, typography, listLabels)
    );
  }

  return children;
}

function tocEntry(typography: Typography): TableOfContents {
  return new TableOfContents('Daftar Isi', {
    hyperlink: true,
    headingStyleRange: '1-3'
  });
}

function pageSize(effective: EffectiveConfig) {
  const mm = paperDimensions(effective.pageSetup.paperSize, effective.pageSetup.orientation === 'landscape');
  const width = Math.round(mm.widthMm * 56.7);
  const height = Math.round(mm.heightMm * 56.7);
  return {
    width,
    height,
    orientation: effective.pageSetup.orientation === 'landscape' ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT
  };
}

function pageMargins(effective: EffectiveConfig) {
  return {
    top: cmToTwip(effective.margin.top),
    bottom: cmToTwip(effective.margin.bottom),
    left: cmToTwip(effective.margin.left),
    right: cmToTwip(effective.margin.right),
    header: 708,
    footer: 708
  };
}

function footerCenter(typography: Typography): Footer {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            children: [PageNumber.CURRENT],
            font: typography.font,
            size: typography.captionSize
          })
        ]
      })
    ]
  });
}

function emptyFooter(): Footer {
  return new Footer({ children: [new Paragraph('')] });
}

function footerRight(typography: Typography): Footer {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({
            children: [PageNumber.CURRENT],
            font: typography.font,
            size: typography.captionSize
          })
        ]
      })
    ]
  });
}

function headerRight(typography: Typography): Header {
  return new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({
            children: [PageNumber.CURRENT],
            font: typography.font,
            size: typography.captionSize
          })
        ]
      })
    ]
  });
}

/** Header dengan running-head di kiri/tepi dan nomor halaman di kanan (tab stop). */
function headerRunningHead(typography: Typography, runningHead: string): Header {
  return new Header({
    children: [
      new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: 9350 }],
        children: [
          new TextRun({
            text: runningHead,
            font: typography.font,
            size: typography.captionSize,
            color: '000000'
          }),
          new TextRun({
            children: [new Tab(), PageNumber.CURRENT],
            font: typography.font,
            size: typography.captionSize,
            color: '000000'
          })
        ]
      })
    ]
  });
}

/** Header berisi running-head saja, rata tengah. */
function headerCenteredHead(typography: Typography, runningHead: string): Header {
  return new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: runningHead,
            font: typography.font,
            size: typography.captionSize,
            color: '000000'
          })
        ]
      })
    ]
  });
}

function furnitureHeader(
  typography: Typography,
  effective: EffectiveConfig,
  includeRunningHead: boolean
): Header | undefined {
  const position = effective.pageSetup.pageNumberPosition;
  const runningHead = includeRunningHead && effective.pageSetup.headerEnabled
    ? effective.pageSetup.headerText.trim()
    : '';

  if (position === 'top-right') {
    if (runningHead) return headerRunningHead(typography, runningHead);
    return headerRight(typography);
  }
  if (runningHead) return headerCenteredHead(typography, runningHead);
  return undefined;
}

function furnitureFooter(
  typography: Typography,
  effective: EffectiveConfig
): Footer | undefined {
  const position = effective.pageSetup.pageNumberPosition;
  if (position === 'bottom-center') return footerCenter(typography);
  if (position === 'bottom-right') return footerRight(typography);
  return undefined;
}

/** Header jurnal: kiri nama (italic bold) + edisi (italic), kanan ISSN (italic bold). */
function journalHeader(effective: EffectiveConfig, typography: Typography): Header | undefined {
  const journal = effective.journal;
  const name = journal?.name?.trim() ?? '';
  const volumeInfo = journal?.volumeInfo?.trim() ?? '';
  const issn = journal?.issn?.trim() ?? '';
  if (!name && !volumeInfo && !issn) return undefined;

  const children: ParagraphChild[] = [];
  if (name) {
    children.push(
      new TextRun({
        text: name,
        italics: true,
        bold: true,
        font: typography.font,
        size: typography.captionSize,
        color: '000000'
      })
    );
  }
  if (volumeInfo) {
    children.push(
      new TextRun({
        text: volumeInfo,
        italics: true,
        font: typography.font,
        size: typography.captionSize,
        color: '000000',
        break: children.length ? 1 : undefined
      })
    );
  }
  if (issn) {
    children.push(
      new TextRun({
        children: [new Tab(), issn],
        italics: true,
        bold: true,
        font: typography.font,
        size: typography.captionSize,
        color: '000000'
      })
    );
  }

  return new Header({
    children: [
      new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: 9350 }],
        children
      })
    ]
  });
}

/** Entri pustaka jurnal: bernomor "1). " tanpa indentasi menggantung. */
function journalBibliographyParagraph(text: string, index: number, typography: Typography): Paragraph {
  return new Paragraph({
    alignment: typography.alignment,
    spacing: { after: 60, line: typography.line },
    children: [
      new TextRun({
        text: `${index + 1}). `,
        font: typography.font,
        size: typography.bodySize,
        color: '000000'
      }),
      ...inlineRuns(text, typography.font, typography.bodySize)
    ]
  });
}

function journalTransformBlock(block: DocumentBlock): DocumentBlock {
  if (block.type === 'heading_1') {
    return { ...block, formattedContent: stripBabPrefix(block.formattedContent) };
  }
  if (block.type === 'heading_2' || block.type === 'heading_3') {
    return { ...block, formattedContent: stripSectionNumber(block.formattedContent) };
  }
  return block;
}

/**
 * Dokumen jurnal: section 1 = front matter artikel (judul, penulis, abstrak)
 * satu kolom; section 2 = isi artikel dua kolom (CONTINUOUS) + pustaka
 * bernomor. Header jurnal di kedua section.
 */
function buildJournalDocument(
  docData: ParsedDocument,
  pageNumbers: PageNumberEstimator | undefined,
  effective: EffectiveConfig,
  typography: Typography
): Document {
  const showNumbers = effective.pageNumbers;
  const front = buildJournalFront(docData);
  const headingLabel = (heading: string) => (heading.toLowerCase() === 'abstract' ? 'Keyword' : 'Kata kunci');

  const frontChildren: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 160, line: typography.line },
      children: inlineRuns(front.title, typography.font, typography.titleSize, {
        bold: true,
        color: '000000'
      })
    })
  ];
  if (front.author) {
    frontChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60, line: typography.line },
        children: inlineRuns(front.author, typography.font, typography.bodySize, {
          bold: true,
          italics: true,
          color: '000000'
        })
      })
    );
  }
  if (front.affiliation) {
    frontChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200, line: typography.line },
        children: inlineRuns(front.affiliation, typography.font, typography.captionSize, {
          italics: true,
          color: '000000'
        })
      })
    );
  }
  front.abstracts.forEach((abs) => {
    frontChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 80, line: typography.line },
        children: inlineRuns(abs.heading, typography.font, typography.bodySize, {
          bold: true,
          color: '000000'
        })
      })
    );
    if (abs.body) {
      frontChildren.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 80, line: typography.line },
          children: inlineRuns(abs.body, typography.font, typography.captionSize, {
            italics: true,
            color: '000000'
          })
        })
      );
    }
    if (abs.keywords) {
      frontChildren.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 120, line: typography.line },
          children: inlineRuns(`${headingLabel(abs.heading)} : ${abs.keywords}`, typography.font, typography.captionSize, {
            italics: true,
            color: '000000'
          })
        })
      );
    }
  });

  const bodySections = docData.sections.filter(
    (section) => !isFrontMatterType(section.type)
  );
  // Gambar dibatasi lebar satu kolom (bukan lebar halaman) agar tidak
  // meluber ke kolom sebelah di section dua kolom.
  const columnGapPx = Math.round(0.5 * (96 / 2.54));
  const columnTypography: Typography = {
    ...typography,
    contentWidthPx: Math.max(120, Math.round((typography.contentWidthPx - columnGapPx) / 2))
  };
  const bodyChildren: FileChild[] = [];
  bodySections.forEach((section) => {
    bodyChildren.push(headingParagraph(stripBabPrefix(section.title), 1, typography));

    if (section.type === 'daftar_pustaka') {
      blocksWithoutDuplicateTitle(section).forEach((block, index) => {
        if (!block.formattedContent.trim()) return;
        bodyChildren.push(journalBibliographyParagraph(block.formattedContent.trim(), index, typography));
      });
      return;
    }

    const listLabels = buildListLabels(section.blocks);
    blocksWithoutDuplicateTitle(section).forEach((block) => {
      if (!block.formattedContent.trim() && block.type !== 'image' && block.type !== 'table') return;
      const transformed = journalTransformBlock(block);
      if (transformed.type === 'table_caption' || transformed.type === 'figure_caption') {
        bodyChildren.push(captionParagraph(transformed, typography));
        return;
      }
      bodyChildren.push(
        transformed.type === 'table'
          ? tableBlock(transformed, typography)
          : blockParagraph(transformed, columnTypography, listLabels)
      );
    });
  });

  const header = journalHeader(effective, typography);
  const footer = showNumbers ? furnitureFooter(typography, effective) : undefined;
  const pageProps = { size: pageSize(effective), margin: pageMargins(effective) };

  return new Document({
    creator: 'NaskahRapi',
    title: docData.title,
    description: 'Dokumen akademik yang diformat dengan NaskahRapi',
    features: { updateFields: true },
    ...(pageNumbers ? { pageNumbers } : {}),
    styles: {
      default: {
        document: {
          run: { font: typography.font, size: typography.bodySize }
        }
      },
      paragraphStyles: [1, 2, 3].map((level) => ({
        id: `TOC${level}`,
        name: `toc ${level}`,
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: {
          font: typography.font,
          size: level === 1 ? typography.bodySize : typography.captionSize
        },
        paragraph: {
          spacing: { line: typography.line, after: level === 1 ? 120 : 40 }
        }
      }))
    },
    sections: [
      {
        properties: {
          page: { ...pageProps, pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL } }
        },
        headers: header ? { default: header } : undefined,
        footers: footer ? { default: footer } : undefined,
        children: frontChildren.length > 0 ? frontChildren : [new Paragraph('')]
      },
      {
        properties: {
          type: SectionType.CONTINUOUS,
          page: pageProps,
          column: { count: 2, space: cmToTwip(0.5) }
        },
        headers: header ? { default: header } : undefined,
        footers: footer ? { default: footer } : undefined,
        children: bodyChildren.length > 0 ? bodyChildren : [new Paragraph('')]
      }
    ]
  });
}

export function buildDocxDocument(
  docData: ParsedDocument,
  config: DocumentConfig,
  pageNumbers?: PageNumberEstimator
): Document {
  const effective = getEffectiveConfig(config);
  const typography = buildTypography(effective);
  const showPageNumbers = effective.pageNumbers;

  // Template jurnal: jalur terpisah — front matter artikel 1 kolom + isi dua kolom.
  if (effective.template === 'jurnal') {
    return buildJournalDocument(docData, pageNumbers, effective, typography);
  }

  const firstBodyIndex = docData.sections.findIndex(
    (section) => !isFrontMatterType(section.type)
  );
  const frontSections =
    firstBodyIndex === -1 ? docData.sections : docData.sections.slice(0, firstBodyIndex);
  const bodySections = firstBodyIndex === -1 ? [] : docData.sections.slice(firstBodyIndex);
  // Halaman judul hanya boleh menonaktifkan nomor pada halaman cover pertama.
  const hasCover = frontSections[0]?.type === 'cover';
  const structuredCover =
    docData.cover?.enabled && coverHasContent(docData.cover) ? docData.cover : undefined;
  const textWidth =
    A4_WIDTH_TWIP - cmToTwip(effective.margin.left) - cmToTwip(effective.margin.right);

  const showNumbers = showPageNumbers && effective.pageSetup.pageNumberPosition !== 'none';
  const frontFooter = furnitureFooter(typography, effective);
  const frontHeader = furnitureHeader(typography, effective, false);
  const bodyFooter = furnitureFooter(typography, effective);
  const bodyHeader = furnitureHeader(typography, effective, true);
  const newPagePerBab = effective.pageSetup.newPagePerBab;

  const frontChildren: FileChild[] = [];
  frontSections.forEach((section, index) => {
    if (index > 0) frontChildren.push(pageBreakParagraph());

    if (section.type === 'cover') {
      frontChildren.push(
        ...(structuredCover
          ? structuredCoverParagraphs(structuredCover, typography)
          : coverParagraphs(section, typography))
      );
      return;
    }

    if (section.type === 'daftar_isi') {
      frontChildren.push(plainHeadingParagraph('DAFTAR ISI', typography));
      frontChildren.push(tocEntry(typography));
      return;
    }

    if (section.type === 'daftar_tabel' || section.type === 'daftar_gambar') {
      frontChildren.push(plainHeadingParagraph(section.title, typography));
      section.blocks.forEach((block) => {
        if (!block.formattedContent.trim()) return;
        frontChildren.push(captionListParagraph(block, typography, textWidth));
      });
      return;
    }

    frontChildren.push(headingParagraph(section.title, 1, typography));
    frontChildren.push(...sectionBodyParagraphs(section, typography));
  });

  const bodyChildren: FileChild[] = [];
  bodySections.forEach((section, index) => {
    if (index > 0 && newPagePerBab) bodyChildren.push(pageBreakParagraph());

    if (section.type === 'daftar_isi') {
      bodyChildren.push(plainHeadingParagraph('DAFTAR ISI', typography));
      bodyChildren.push(tocEntry(typography));
      return;
    }

    bodyChildren.push(headingParagraph(section.title, 1, typography));
    bodyChildren.push(...sectionBodyParagraphs(section, typography));
  });

  const documentSections: ISectionOptions[] = [];

  if (frontSections.length > 0) {
    documentSections.push({
      properties: {
        page: {
          size: pageSize(effective),
          margin: pageMargins(effective),
          pageNumbers: { start: 1, formatType: NumberFormat.LOWER_ROMAN }
        },
        titlePage: hasCover && showNumbers ? true : undefined
      },
      footers: showNumbers && frontFooter
        ? {
            default: frontFooter,
            ...(hasCover ? { first: emptyFooter() } : {})
          }
        : undefined,
      headers: showNumbers ? (frontHeader ? { default: frontHeader } : undefined) : undefined,
      children: frontChildren.length > 0 ? frontChildren : [new Paragraph('')]
    });
  }

  if (bodySections.length > 0) {
    documentSections.push({
      properties: {
        page: {
          size: pageSize(effective),
          margin: pageMargins(effective),
          pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL }
        }
      },
      headers: showNumbers && bodyHeader ? { default: bodyHeader } : undefined,
      footers: showNumbers && bodyFooter ? { default: bodyFooter } : undefined,
      children: bodyChildren.length > 0 ? bodyChildren : [new Paragraph('')]
    });
  }

  if (documentSections.length === 0) {
    documentSections.push({
      properties: {
        page: {
          size: pageSize(effective),
          margin: pageMargins(effective),
          pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL }
        }
      },
      children: [new Paragraph('')]
    });
  }

  return new Document({
    creator: 'NaskahRapi',
    title: docData.title,
    description: 'Dokumen akademik yang diformat dengan NaskahRapi',
    features: { updateFields: true },
    ...(pageNumbers ? { pageNumbers } : {}),
    styles: {
      default: {
        document: {
          run: { font: typography.font, size: typography.bodySize }
        }
      },
      paragraphStyles: [1, 2, 3].map((level) => ({
        id: `TOC${level}`,
        name: `toc ${level}`,
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: {
          font: typography.font,
          size: level === 1 ? typography.bodySize : typography.captionSize
        },
        paragraph: {
          spacing: { line: typography.line, after: level === 1 ? 120 : 40 }
        }
      }))
    },
    sections: documentSections
  });
}

export async function exportToDocx(docData: ParsedDocument, config: DocumentConfig) {
  let estimator: PageNumberEstimator | undefined;

  try {
    const layout = await import('docx/layout');
    estimator = layout.estimatePageNumbers;
  } catch {
    // Estimator opsional: jika gagal dimuat, Word akan mengisi TOC saat dibuka.
    estimator = undefined;
  }

  let blob: Blob;

  try {
    blob = await Packer.toBlob(buildDocxDocument(docData, config, estimator));
  } catch (error) {
    console.warn('Estimasi halaman gagal; mengekspor tanpa nomor TOC otomatis.', error);
    blob = await Packer.toBlob(buildDocxDocument(docData, config));
  }

  saveAs(blob, docData.fileName || 'MAKALAH_RAPI.docx');
}
