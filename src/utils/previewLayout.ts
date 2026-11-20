import { DocumentBlock, DocumentSection, ParsedDocument } from '../types/document';
import { coverHasContent } from './cover';

export type PagePhase = 'cover' | 'front' | 'body';

export interface TocEntry {
  title: string;
  sectionId: string;
  blockId?: string;
  isBab: boolean;
  level: number;
}

export interface FlowItem {
  id: string;
  sectionId: string;
  sectionType: string;
  kind: 'cover' | 'cover-sheet' | 'section-heading' | 'block' | 'toc-entry';
  text: string;
  block?: DocumentBlock;
  toc?: TocEntry;
  level?: number;
  isCoverHeading?: boolean;
  isCoverTitle?: boolean;
  pageBreakBefore?: boolean;
  /** Jangan biarkan item ini menjadi item terakhir di halaman (mis. caption tabel). */
  keepWithNext?: boolean;
  /** Pemecahan paragraf yang lebih tinggi dari satu halaman. */
  sourceId?: string;
  chunkIndex?: number;
  chunkCount?: number;
  isContinuation?: boolean;
}

export interface SectionPageInfo {
  label: string;
  page: number;
}

export type SectionPageMap = Record<string, SectionPageInfo>;

export interface PageLabel {
  phase: PagePhase;
  label: string;
}

export interface PageMeta {
  labels: PageLabel[];
  sectionPages: SectionPageMap;
  blockPageLabels: Record<string, string>;
  blockPages: Record<string, number>;
  totalPages: number;
}

export interface PaginationInfo {
  totalPages: number;
  sectionPages: SectionPageMap;
  blockPages: Record<string, number>;
}

const FRONT_MATTER_TYPES = new Set([
  'cover',
  'kata_pengantar',
  'daftar_isi',
  'daftar_tabel',
  'daftar_gambar',
  'daftar_lampiran',
  'abstrak'
]);

const COVER_HEADINGS = /^(MAKALAH|SKRIPSI|TUGAS AKHIR|LAPORAN|PROPOSAL)$/i;

export function isFrontMatterType(type: string): boolean {
  return FRONT_MATTER_TYPES.has(type);
}

export function isMajorSection(section: DocumentSection): boolean {
  if (isFrontMatterType(section.type)) return true;
  if (section.type === 'bab' || section.type === 'daftar_pustaka') return true;
  return /^(BAB\s+[IVXLCDM]+|DAFTAR\s+PUSTAKA|KATA\s+PENGANTAR|DAFTAR\s+ISI|ABSTRAK)/i.test(
    section.title.trim()
  );
}

export function normalizeTitle(text: string): string {
  return text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

export function isTitleBlock(block: DocumentBlock): boolean {
  return [
    'heading_1',
    'kata_pengantar',
    'daftar_isi',
    'daftar_tabel',
    'daftar_gambar',
    'abstrak'
  ].includes(block.type);
}

export function isCoverHeadingText(text: string): boolean {
  return COVER_HEADINGS.test(text.trim());
}

export function findCoverHeadingBlock(blocks: DocumentBlock[]): DocumentBlock | undefined {
  return blocks.find((block) => isCoverHeadingText(block.formattedContent));
}

export function findCoverTitleBlock(blocks: DocumentBlock[]): DocumentBlock | undefined {
  const heading = findCoverHeadingBlock(blocks);
  return blocks.find(
    (block) =>
      block !== heading && block.formattedContent.trim().length > 0 && !isCoverHeadingText(block.formattedContent)
  );
}

export function buildTocEntries(doc: ParsedDocument): TocEntry[] {
  const entries: TocEntry[] = [];

  doc.sections.forEach((section) => {
    if (section.type === 'cover') return;
    // Daftar Isi tidak mencantumkan dirinya sendiri.
    if (section.type === 'daftar_isi') return;

    entries.push({
      title: section.title,
      sectionId: section.id,
      isBab: true,
      level: 1
    });

    section.blocks.forEach((block) => {
      if (block.type !== 'heading_2' && block.type !== 'heading_3') return;
      if (normalizeTitle(block.formattedContent) === normalizeTitle(section.title)) return;

      // Sub-bab berhuruf (A., B., ...) menjorok satu tingkat lebih dalam
      // daripada sub-bab bernomor (1.1, 1.2, ...) seperti pada pedoman.
      const isLettered = /^[A-Z]\.\s+/.test(block.formattedContent.trim());

      entries.push({
        title: block.formattedContent,
        sectionId: section.id,
        blockId: block.id,
        isBab: false,
        level: block.type === 'heading_3' || isLettered ? 3 : 2
      });
    });
  });

  return entries;
}

export function buildFlowItems(
  doc: ParsedDocument,
  tocEntries: TocEntry[],
  newPagePerBab: boolean = true
): FlowItem[] {
  const items: FlowItem[] = [];

  const coverSection = doc.sections.find((section) => section.type === 'cover');
  const useStructuredCover = Boolean(doc.cover?.enabled && coverHasContent(doc.cover));

  if (useStructuredCover) {
    items.push({
      id: 'cover-sheet',
      sectionId: coverSection?.id ?? 'sec-cover',
      sectionType: 'cover',
      kind: 'cover-sheet',
      text: doc.cover?.title || doc.title,
      pageBreakBefore: true
    });
  }

  doc.sections.forEach((section, sectionIndex) => {
    if (section.type === 'cover') {
      // Cover terstruktur sudah dirender dari data cover, bukan dari blok teks.
      if (useStructuredCover) return;

      const blocks = section.blocks.filter((block) => block.formattedContent.trim().length > 0);

      if (blocks.length === 0) {
        items.push({
          id: `cover-fallback-${section.id}`,
          sectionId: section.id,
          sectionType: section.type,
          kind: 'cover',
          text: doc.title,
          isCoverTitle: true,
          pageBreakBefore: sectionIndex === 0
        });
        return;
      }

      const headingBlock = findCoverHeadingBlock(blocks);
      const titleBlock = findCoverTitleBlock(blocks);

      blocks.forEach((block, blockIndex) => {
        items.push({
          id: `cover-${block.id}`,
          sectionId: section.id,
          sectionType: section.type,
          kind: 'cover',
          block,
          text: block.formattedContent,
          isCoverHeading: block === headingBlock,
          isCoverTitle: block === titleBlock,
          pageBreakBefore: sectionIndex === 0 && blockIndex === 0
        });
      });
      return;
    }

    const pageBreak =
      isMajorSection(section) && (isFrontMatterType(section.type) || newPagePerBab);
    let firstItemOfSection = true;

    const add = (item: FlowItem) => {
      if (pageBreak && firstItemOfSection) {
        item.pageBreakBefore = true;
      }
      firstItemOfSection = false;
      items.push(item);
    };

    add({
      id: `section-title-${section.id}`,
      sectionId: section.id,
      sectionType: section.type,
      kind: 'section-heading',
      text: section.title
    });

    if (section.type === 'daftar_isi') {
      tocEntries.forEach((entry, index) => {
        add({
          id: `toc-${index}-${entry.sectionId}-${entry.blockId || 'section'}`,
          sectionId: section.id,
          sectionType: section.type,
          kind: 'toc-entry',
          text: entry.title,
          toc: entry,
          level: entry.level
        });
      });
      return;
    }

    if (section.type === 'daftar_tabel' || section.type === 'daftar_gambar') {
      section.blocks
        .filter((block) => block.type === 'daftar_tabel_item' || block.type === 'daftar_gambar_item')
        .forEach((block, index) => {
          add({
            id: `caption-list-${section.id}-${index}`,
            sectionId: section.id,
            sectionType: section.type,
            kind: 'toc-entry',
            text: block.formattedContent,
            toc: {
              title: block.formattedContent,
              sectionId: (block.meta?.sectionId as string) ?? section.id,
              blockId: (block.meta?.captionBlockId as string) ?? undefined,
              isBab: false,
              level: 1
            }
          });
        });
      return;
    }

    let blocks = section.blocks;
    if (
      blocks.length > 0 &&
      isTitleBlock(blocks[0]) &&
      normalizeTitle(blocks[0].formattedContent) === normalizeTitle(section.title)
    ) {
      blocks = blocks.slice(1);
    }

    blocks.forEach((block) => {
      if (!block.formattedContent.trim()) return;
      add({
        id: `block-${block.id}`,
        sectionId: section.id,
        sectionType: section.type,
        kind: 'block',
        text: block.formattedContent,
        block,
        keepWithNext: block.type === 'table_caption'
      });
    });
  });

  return items;
}

function isHeadingItem(item: FlowItem): boolean {
  if (item.kind === 'section-heading') return true;
  if (item.kind !== 'block' || !item.block) return false;
  return item.block.type === 'heading_1' || item.block.type === 'heading_2' || item.block.type === 'heading_3';
}

export function paginate(
  items: FlowItem[],
  heights: Record<string, number>,
  capacityPx: number,
  breakBefore?: Set<string>
): FlowItem[][] {
  const pages: FlowItem[][] = [];
  let current: FlowItem[] = [];
  let currentHeight = 0;

  const flush = () => {
    if (current.length > 0) {
      pages.push(current);
      current = [];
      currentHeight = 0;
    }
  };

  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    // Halaman cover selalu memenuhi satu lembar penuh.
    const height =
      item.kind === 'cover-sheet' ? capacityPx : heights[item.id] ?? 0;

    if (item.pageBreakBefore || breakBefore?.has(item.id)) {
      flush();
    }

    // Caption tabel harus tetap satu halaman dengan tabel di bawahnya.
    if (item.keepWithNext) {
      const next = items[index + 1];
      const needed = height + (next ? heights[next.id] ?? 0 : 0);
      if (current.length > 0 && currentHeight + needed > capacityPx) flush();
    }

    const wouldOverflow = current.length > 0 && currentHeight + height > capacityPx;

    // Jangan biarkan judul menggantung sendiri di dasar halaman.
    if (wouldOverflow && isHeadingItem(item) === false && isHeadingItem(current[current.length - 1])) {
      const lastHeading = current.pop()!;
      currentHeight -= heights[lastHeading.id] ?? 0;
      flush();
      current.push(lastHeading);
      currentHeight += heights[lastHeading.id] ?? 0;
    }

    if (current.length > 0 && currentHeight + height > capacityPx) {
      flush();
    }

    current.push(item);
    currentHeight += height;
  }

  flush();
  return pages.length > 0 ? pages : [[]];
}

function splitTextIntoParts(text: string, parts: number): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized || parts <= 1) return [normalized];

  const words = normalized.split(' ');
  const targetLength = normalized.length / parts;
  const chunks: string[] = [];
  let current: string[] = [];
  let currentLength = 0;

  for (const word of words) {
    const nextLength = currentLength === 0 ? word.length : currentLength + 1 + word.length;

    if (
      current.length > 0 &&
      chunks.length < parts - 1 &&
      nextLength > targetLength * (chunks.length + 1)
    ) {
      chunks.push(current.join(' '));
      current = [word];
      currentLength = word.length;
      continue;
    }

    current.push(word);
    currentLength = nextLength;
  }

  if (current.length > 0) chunks.push(current.join(' '));

  return chunks.filter((chunk) => chunk.trim().length > 0);
}

/**
 * Memecah paragraf yang lebih tinggi dari satu halaman menjadi beberapa
 * potongan agar tidak pernah terpotong oleh tepi kertas.
 */
export function splitTallItems(
  items: FlowItem[],
  heights: Record<string, number>,
  capacityPx: number
): FlowItem[] {
  const limit = capacityPx * 0.96;
  const result: FlowItem[] = [];

  for (const item of items) {
    const height = heights[item.id] ?? 0;
    const tableRows = (item.block?.meta?.rows ?? []) as string[][];

    // Tabel yang lebih tinggi dari satu halaman dipecah per baris; header diulang.
    if (
      item.kind === 'block' &&
      item.block?.type === 'table' &&
      item.chunkIndex === undefined &&
      height > limit &&
      tableRows.length > 1
    ) {
      const rowsPerChunk = Math.max(1, Math.floor(tableRows.length * (limit / height)) - 1);
      const chunks: string[][][] = [];

      for (let start = 0; start < tableRows.length; start += rowsPerChunk) {
        chunks.push(tableRows.slice(start, start + rowsPerChunk));
      }

      chunks.forEach((chunk, index) => {
        result.push({
          ...item,
          id: `${item.id}::t${index}`,
          chunkIndex: index,
          chunkCount: chunks.length,
          isContinuation: index > 0,
          pageBreakBefore: index === 0 ? item.pageBreakBefore : false,
          block: {
            ...item.block!,
            meta: { ...(item.block!.meta ?? {}), rows: chunk }
          }
        });
      });
      continue;
    }

    const canSplit =
      item.kind === 'block' &&
      Boolean(item.block) &&
      (item.block?.type === 'paragraph' || item.block?.type === 'raw');

    if (!canSplit) {
      result.push(item);
      continue;
    }

    if (height <= limit) {
      result.push(item);
      continue;
    }

    const parts = Math.min(24, Math.max(2, Math.ceil(height / limit)));
    const chunks = splitTextIntoParts(item.text, parts);

    if (chunks.length <= 1) {
      result.push(item);
      continue;
    }

    chunks.forEach((chunk, index) => {
      result.push({
        ...item,
        id: `${item.id}::${index}`,
        text: chunk,
        sourceId: item.id,
        chunkIndex: index,
        chunkCount: chunks.length,
        isContinuation: index > 0,
        pageBreakBefore: index === 0 ? item.pageBreakBefore : false
      });
    });
  }

  return result;
}

/**
 * Menyeragamkan judul bab pada Daftar Isi, mis. "BAB I PENDAHULUAN"
 * menjadi "BAB I: PENDAHULUAN".
 */
export function formatTocTitle(title: string, isBab: boolean): string {
  const clean = title.trim().replace(/\s+/g, ' ');
  if (!isBab) return clean;

  const match = clean.match(/^BAB\s+([IVXLCDM]+)\s*[:\-–]?\s*(.*)$/i);
  if (!match) return clean;

  const roman = match[1].toUpperCase();
  const rest = match[2].trim();
  return rest ? `BAB ${roman}: ${rest}` : `BAB ${roman}`;
}

function toRoman(value: number): string {
  const numerals: Array<[number, string]> = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I']
  ];

  let remainder = Math.max(1, Math.floor(value));
  let result = '';

  for (const [number, symbol] of numerals) {
    while (remainder >= number) {
      result += symbol;
      remainder -= number;
    }
  }

  return result;
}

export function computePageMeta(
  pages: FlowItem[][],
  sections: DocumentSection[]
): PageMeta {
  const sectionTypeById = new Map(sections.map((section) => [section.id, section.type]));
  const hasCover = pages[0]?.[0]?.sectionType === 'cover';

  let frontCount = hasCover ? 1 : 0;
  let bodyCount = 0;

  const labels: PageLabel[] = pages.map((page) => {
    const first = page[0];

    if (!first) return { phase: 'body', label: '' };
    if (first.sectionType === 'cover') return { phase: 'cover', label: '' };

    const isFront = isFrontMatterType(first.sectionType);
    if (isFront) {
      frontCount += 1;
      return { phase: 'front', label: toRoman(frontCount).toLowerCase() };
    }

    bodyCount += 1;
    return { phase: 'body', label: String(bodyCount) };
  });

  const sectionPages: SectionPageMap = {};
  const blockPageLabels: Record<string, string> = {};
  const blockPages: Record<string, number> = {};

  pages.forEach((page, pageIndex) => {
    const label = labels[pageIndex]?.label ?? '';

    page.forEach((item) => {
      if (!sectionPages[item.sectionId]) {
        sectionPages[item.sectionId] = { label, page: pageIndex + 1 };
      }
      if (item.block) {
        blockPageLabels[item.block.id] = label;
        blockPages[item.block.id] = pageIndex + 1;
      }
    });
  });

  // Pastikan semua section punya entri, termasuk yang kosong.
  sections.forEach((section) => {
    if (!sectionPages[section.id]) {
      const firstPage = pages.findIndex((page) =>
        page.some((item) => item.sectionId === section.id)
      );
      const pageIndex = firstPage >= 0 ? firstPage : 0;
      sectionPages[section.id] = {
        label: labels[pageIndex]?.label ?? '',
        page: pageIndex + 1
      };
    }
  });

  return {
    labels,
    sectionPages,
    blockPageLabels,
    blockPages,
    totalPages: pages.length
  };
}
