import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  RotateCcw,
  Edit3,
  Check
} from 'lucide-react';
import { Button } from './ui/button';
import { ParsedDocument, DocumentConfig } from '../types/document';
import { cssFontFamily, getEffectiveConfig } from '../utils/effectiveConfig';
import {
  FlowItem,
  PaginationInfo,
  buildFlowItems,
  buildTocEntries,
  computePageMeta,
  paginate,
  splitTallItems
} from '../utils/previewLayout';
import { parseInlineSegments, splitChapterHeading } from '../utils/inlineFormat';
import { LIST_INDENT_CM, buildListLabels, stripListMarker } from '../utils/listNumbering';
import { MEMBER_COLUMN_GAP_MM, buildCoverLines, coverLogoBox, CoverLine } from '../utils/cover';
import { formatChapterHeading, formatSubHeadingNumber, paperDimensions, splitHeadingNumberTitle } from '../utils/formatEngine';
import { buildJournalFront, JournalFront } from '../utils/journalFormat';
import { JournalConfig } from '../types/document';

interface A4PaperPreviewProps {
  doc: ParsedDocument;
  config: DocumentConfig;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  activeSectionId: string | null;
  onSelectSection?: (id: string) => void;
  onUpdateBlockContent: (blockId: string, newText: string) => void;
  onUpdateTitle: (newTitle: string) => void;
  onUpdateSectionTitle: (sectionId: string, newTitle: string) => void;
  onPaginationChange: (info: PaginationInfo) => void;
  onDeleteImage?: (blockId: string) => void;
  onInsertImageAt?: (file: File, afterBlockId?: string) => void;
  onInsertTable?: (afterBlockId: string | undefined, rows: number, cols: number) => void;
  onTableOp?: (
    blockId: string,
    op: 'addRow' | 'addCol' | 'delRow' | 'delCol' | 'delTable',
    row: number,
    col: number
  ) => void;
  onUpdateTableCell?: (blockId: string, row: number, col: number, value: string) => void;
  /** Data header jurnal — hanya dipakai saat template 'jurnal'. */
  journal?: JournalConfig;
}

const PX_PER_MM = 96 / 25.4;

export const A4PaperPreview: React.FC<A4PaperPreviewProps> = ({
  doc,
  config,
  zoom,
  setZoom,
  currentPage,
  setCurrentPage,
  activeSectionId,
  onSelectSection,
  onUpdateBlockContent,
  onUpdateTitle,
  onUpdateSectionTitle,
  onPaginationChange,
  onDeleteImage,
  onInsertImageAt,
  onInsertTable,
  onTableOp,
  onUpdateTableCell,
  journal
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const lastPaginationKey = useRef('');
  const suppressSpyUntil = useRef(0);
  const [isEditMode, setIsEditMode] = useState(false);
  const [heights, setHeights] = useState<Record<string, number>>({});
  const [imageTick, setImageTick] = useState(0);
  const [contextMenu, setContextMenu] = useState<
    {
      x: number;
      y: number;
      blockId: string | null;
      isImage: boolean;
      isTable: boolean;
      row: number;
      col: number;
    } | null
  >(null);
  const contextFileRef = useRef<HTMLInputElement>(null);
  const contextAfterBlockId = useRef<string | undefined>(undefined);
  const [tableGrid, setTableGrid] = useState<
    { x: number; y: number; afterBlockId: string | null } | null
  >(null);
  const [gridHover, setGridHover] = useState({ rows: 2, cols: 3 });
  const [pageInput, setPageInput] = useState('1');
  const pageInputRef = useRef<HTMLInputElement>(null);

  const effective = useMemo(() => getEffectiveConfig(config), [config]);
  const isJournal = effective.template === 'jurnal';
  const tocEntries = useMemo(() => buildTocEntries(doc), [doc]);
  const listLabels = useMemo(() => {
    const merged = new Map<string, { label: string; level: number }>();
    doc.sections.forEach((section) => {
      buildListLabels(section.blocks).forEach((value, key) => merged.set(key, value));
    });
    return merged;
  }, [doc]);
  const baseItems = useMemo(
    () => buildFlowItems(doc, tocEntries, effective.pageSetup.newPagePerBab, isJournal),
    [doc, tocEntries, effective.pageSetup.newPagePerBab, isJournal]
  );
  const journalFront: JournalFront | null = useMemo(
    () => (isJournal ? buildJournalFront(doc) : null),
    [doc, isJournal]
  );

  const paper = paperDimensions(
    effective.pageSetup.paperSize,
    effective.pageSetup.orientation === 'landscape'
  );

  // Cetak/PDF harus mengikuti ukuran kertas & orientasi yang dipilih, bukan A4 tetap.
  const printPaperStyle = useMemo(() => {
    const heightMm = Math.max(1, paper.heightMm - 1);
    return `@media print {
  @page { size: ${paper.widthMm}mm ${paper.heightMm}mm; margin: 0; }
  .a4-paper-sheet {
    width: ${paper.widthMm}mm !important;
    height: ${heightMm}mm !important;
    min-height: ${heightMm}mm !important;
    max-height: ${heightMm}mm !important;
  }
}`;
  }, [paper.widthMm, paper.heightMm]);

  const contentWidthMm = Math.max(
    10,
    paper.widthMm - (effective.margin.left + effective.margin.right) * 10
  );

  const contentHeightMm = Math.max(
    20,
    paper.heightMm - (effective.margin.top + effective.margin.bottom) * 10
  );

  const capacityPx = Math.max(160, contentHeightMm * PX_PER_MM - 12);

  const items = useMemo(
    () => splitTallItems(baseItems, heights, capacityPx),
    [baseItems, heights, capacityPx]
  );

  const itemSignature = useMemo(
    () => items.map((item) => `${item.id}:${item.text}:${item.kind}`).join('|'),
    [items]
  );

  // Jurnal dua kolom: satu halaman memuat dua kolom — kapasitas paginasi
  // dikali dua (tinggi item diukur pada lebar satu kolom).
  const pageCapacityPx = capacityPx * (isJournal ? 2 : 1);
  // Lebar satu kolom untuk pengukuran tinggi (kolom sempit = paragraf lebih tinggi).
  const measureWidthMm = isJournal ? Math.max(20, (contentWidthMm - 5) / 2) : contentWidthMm;

  const fontStack = cssFontFamily(effective.fontFamily);

  // Ukur tinggi tiap blok memakai lebar konten yang sama dengan halaman A4.
  useLayoutEffect(() => {
    const container = measureRef.current;
    if (!container) return;

    const measure = () => {
      const next: Record<string, number> = {};
      container.querySelectorAll<HTMLElement>('[data-flow-item]').forEach((node) => {
        const id = node.dataset.flowItem;
        if (id) next[id] = node.offsetHeight;
      });

      setHeights((previous) => {
        const nextKeys = Object.keys(next);
        const previousKeys = Object.keys(previous);
        const same =
          nextKeys.length === previousKeys.length &&
          nextKeys.every((key) => previous[key] === next[key]);
        return same ? previous : next;
      });
    };

    measure();
    document.fonts?.ready.then(measure).catch(() => undefined);
  }, [itemSignature, effective, imageTick]);

  const pages = useMemo(
    () => paginate(items, heights, pageCapacityPx),
    [items, heights, pageCapacityPx]
  );

  const meta = useMemo(() => computePageMeta(pages, doc.sections), [pages, doc.sections]);

  // Kolom nomor halaman mengikuti halaman aktif, kecuali sedang diketik.
  useEffect(() => {
    if (document.activeElement !== pageInputRef.current) {
      setPageInput(String(currentPage));
    }
  }, [currentPage]);


  const paginationKey = useMemo(
    () => `${meta.totalPages}:${JSON.stringify(meta.sectionPages)}`,
    [meta.totalPages, meta.sectionPages]
  );

  useEffect(() => {
    if (lastPaginationKey.current === paginationKey) return;
    lastPaginationKey.current = paginationKey;
    onPaginationChange({
      totalPages: meta.totalPages,
      sectionPages: meta.sectionPages,
      blockPages: meta.blockPages
    });
  }, [paginationKey, meta.totalPages, meta.sectionPages, onPaginationChange]);

  useEffect(() => {
    if (currentPage > meta.totalPages) {
      setCurrentPage(meta.totalPages);
    }
  }, [currentPage, meta.totalPages, setCurrentPage]);

  const totalPages = meta.totalPages;

  // Fit-to-width: di layar sempit zoom efektif dibatasi agar halaman A4
  // selalu pas lebar kontainer (tidak terpotong). Manual (± / preset)
  // mematikan auto-fit; tombol Pas Layar menyalakannya lagi.
  const [fitPercent, setFitPercent] = useState(100);
  const [autoFit, setAutoFit] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const updateFit = () => {
      const pageWidthPx = paper.widthMm * PX_PER_MM;
      const available = container.clientWidth - 32; // padding p-4 (16px × 2)
      if (available <= 0 || pageWidthPx <= 0) return;
      const percent = Math.round((available / pageWidthPx) * 100);
      setFitPercent(Math.max(25, Math.min(150, percent)));
    };
    updateFit();
    const observer = new ResizeObserver(updateFit);
    observer.observe(container);
    return () => observer.disconnect();
  }, [paper.widthMm]);

  const effectiveZoom = autoFit ? Math.min(zoom, fitPercent) : zoom;

  // Jurnal: teks pratinjau sudah di-strip ("PENDAHULUAN"). Menulis balik teks
  // yang identik dengan tampilan akan menghapus "BAB I"/"1.1" dari dokumen —
  // lewati kecuali user benar-benar mengubah isi.
  const skipDisplayWrite = (item: FlowItem, value: string) =>
    isJournal && value.trim() === item.text.trim();

  const handleZoomIn = () => {
    setAutoFit(false);
    setZoom((previous) => Math.min(150, previous + 5));
  };
  const handleZoomOut = () => {
    setAutoFit(false);
    setZoom((previous) => Math.max(50, previous - 5));
  };
  const handleResetZoom = () => setAutoFit(true);

  // Navigasi halaman eksplisit: gulir kontainer sendiri (bukan scrollIntoView,
  // yang salah hitung saat pratinjau di-zoom) lalu tahan scroll-spy sebentar.
  const scrollToPage = (pageNumber: number) => {
    const target = Math.min(totalPages, Math.max(1, pageNumber));
    const container = containerRef.current;
    const element = document.getElementById(`page-${target}`);
    if (!container || !element) return;

    suppressSpyUntil.current = Date.now() + 300;
    const delta =
      element.getBoundingClientRect().top - container.getBoundingClientRect().top;
    // `instant` wajib: CSS scroll-behavior:smooth membuat animasi tidak selesai
    // pada kanvas yang di-transform scale, sehingga klik navigasi terlihat mati.
    container.scrollTo({ top: Math.max(0, container.scrollTop + delta - 8), behavior: 'instant' });
    setCurrentPage(target);
  };

  // Scroll-spy: sinkronkan halaman & section aktif saat pengguna menggulir.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let timeoutId = 0;
    const handleScroll = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        if (Date.now() < suppressSpyUntil.current) return;

        const containerRect = container.getBoundingClientRect();
        const scanLine = containerRect.top + container.clientHeight * 0.35;
        const sheets = container.querySelectorAll<HTMLElement>('.a4-paper-sheet');

        for (let index = 0; index < sheets.length; index++) {
          const sheet = sheets[index];
          const rect = sheet.getBoundingClientRect();
          const top = rect.top;
          const bottom = rect.bottom;

          if (scanLine >= top && scanLine <= bottom) {
            const pageNumber = Number(sheet.dataset.page || '1');
            const sectionId = sheet.dataset.sectionId || null;

            if (pageNumber !== currentPage) setCurrentPage(pageNumber);
            if (sectionId && sectionId !== activeSectionId && onSelectSection) {
              onSelectSection(sectionId);
            }
            break;
          }
        }
      }, 40);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.clearTimeout(timeoutId);
    };
  }, [currentPage, activeSectionId, onSelectSection, setCurrentPage, totalPages]);

  // Ikuti perubahan halaman dari sidebar kiri / tombol navigasi.
  // Hanya menggulir bila halaman tujuan belum terlihat, agar tidak
  // melawan posisi gulir pengguna.
  useEffect(() => {
    if (Date.now() < suppressSpyUntil.current) return;

    const container = containerRef.current;
    const target = document.getElementById(`page-${currentPage}`);
    if (!container || !target) return;

    const containerRect = container.getBoundingClientRect();
    const rect = target.getBoundingClientRect();
    const scanLine = containerRect.top + container.clientHeight * 0.35;

    if (scanLine < rect.top || scanLine > rect.bottom) {
      const delta = rect.top - containerRect.top;
      container.scrollTo({ top: Math.max(0, container.scrollTop + delta - 8), behavior: 'instant' });
    }
  }, [currentPage, totalPages]);

  const editableClass =
    'outline-none rounded transition-colors focus:ring-2 focus:ring-teal-400 focus:bg-teal-50/30';

  const renderInline = (text: string) =>
    parseInlineSegments(text).map((segment, index) => {
      if (segment.bold && segment.italic) {
        return (
          <strong key={index}>
            <em>{segment.text}</em>
          </strong>
        );
      }
      if (segment.bold) return <strong key={index}>{segment.text}</strong>;
      if (segment.italic) return <em key={index}>{segment.text}</em>;
      return <React.Fragment key={index}>{segment.text}</React.Fragment>;
    });

  const renderItem = (item: FlowItem, editable: boolean): React.ReactNode => {
    const canEdit = editable && isEditMode;

    if (item.kind === 'cover-sheet') {
      const cover = doc.cover;
      if (!cover) return null;

      const lines = buildCoverLines(cover, {
        placeholders: true,
        variant: effective.coverLayout.variant
      });
      const bodySize = effective.fontSize.body;
      const titleSize = effective.fontSize.title;

      return (
        <div
          key={item.id}
          data-flow-item={item.id}
          className="w-full text-center"
          style={{ color: '#0f172a', lineHeight: 1.5 }}
        >
          {(() => {
            const nodes: React.ReactNode[] = [];

            for (let index = 0; index < lines.length; index += 1) {
              const line = lines[index];
              const spacing = { marginTop: `${line.spaceBefore}em` };

              if (line.kind === 'member') {
                const group: CoverLine[] = [];
                const groupStart = index;

                while (index < lines.length && lines[index].kind === 'member') {
                  group.push(lines[index]);
                  index += 1;
                }
                index -= 1;

                nodes.push(
                  <div
                    key={`members-${groupStart}`}
                    style={{
                      ...spacing,
                      display: 'inline-grid',
                      gridTemplateColumns: 'auto auto',
                      columnGap: `${MEMBER_COLUMN_GAP_MM}mm`,
                      fontSize: `${bodySize}pt`,
                      textAlign: 'left'
                    }}
                  >
                    {group.map((member) => (
                      <React.Fragment key={member.key}>
                        <span>{member.name}</span>
                        <span>{member.nim}</span>
                      </React.Fragment>
                    ))}
                  </div>
                );
                continue;
              }

              if (line.kind === 'logo') {
                if (!cover.logo) {
                  nodes.push(
                    <div
                      key={line.key}
                      style={{
                        ...spacing,
                        fontSize: `${bodySize}pt`,
                        color: '#475569'
                      }}
                    >
                      {line.text}
                    </div>
                  );
                  continue;
                }

                nodes.push(
                  <div key={line.key} style={spacing}>
                    <img
                      src={cover.logo}
                      alt="Logo institusi"
                      style={{
                        display: 'inline-block',
                        ...coverLogoBox(cover)
                      }}
                    />
                  </div>
                );
                continue;
              }

              nodes.push(
                <div
                  key={line.key}
                  style={{
                    ...spacing,
                    fontSize: `${line.size === 'title' ? titleSize : bodySize}pt`,
                    fontWeight: line.bold ? 700 : 400,
                    fontStyle: line.italic ? 'italic' : 'normal',
                    textTransform: line.uppercase ? 'uppercase' : 'none',
                    letterSpacing: line.key === 'title' ? '0.02em' : undefined
                  }}
                >
                  {line.text}
                </div>
              );
            }

            return nodes;
          })()}
        </div>
      );
    }

    if (item.kind === 'cover') {
      const isHeading = Boolean(item.isCoverHeading);
      const isTitle = Boolean(item.isCoverTitle);
      const fontSize = isHeading
        ? effective.fontSize.title + 2
        : isTitle
          ? effective.fontSize.title
          : effective.fontSize.body;

      const style: React.CSSProperties = {
        fontSize: `${fontSize}pt`,
        fontWeight: isHeading || isTitle ? 700 : 400,
        textTransform: isHeading || isTitle ? 'uppercase' : 'none',
        letterSpacing: isHeading ? '0.04em' : undefined,
        paddingBottom: '0.45em'
      };

      if (!item.block) {
        return (
          <div key={item.id} data-flow-item={item.id} className="text-center">
            <div
              contentEditable={canEdit}
              suppressContentEditableWarning
              onBlur={(event) => onUpdateTitle(event.currentTarget.textContent || '')}
              className={canEdit ? editableClass : undefined}
              style={style}
            >
              {item.text}
            </div>
          </div>
        );
      }

      const blockId = item.block.id;
      return (
        <div key={item.id} data-flow-item={item.id} className="text-center">
          <p
            contentEditable={canEdit}
            suppressContentEditableWarning
            onBlur={(event) => {
              const value = event.currentTarget.textContent || '';
              if (!skipDisplayWrite(item, value)) onUpdateBlockContent(blockId, value);
              if (isTitle) onUpdateTitle(value);
            }}
            className={canEdit ? editableClass : undefined}
            style={style}
          >
            {renderInline(item.text)}
          </p>
        </div>
      );
    }

    if (item.kind === 'section-heading') {
      const chapter = splitChapterHeading(item.text);
      const hr = effective.headingRules;

      return (
        <div key={item.id} data-flow-item={item.id}>
          <h2
            contentEditable={canEdit}
            suppressContentEditableWarning
            onBlur={(event) => {
              // "BAB I" + "PENDAHULUAN" digabung kembali agar tetap satu judul.
              const lines = Array.from(
                event.currentTarget.querySelectorAll<HTMLElement>('[data-chapter-line]')
              );
              const value = lines.length
                ? lines.map((line) => (line.textContent || '').trim()).filter(Boolean).join(' ')
                : event.currentTarget.textContent || '';
              if (!skipDisplayWrite(item, value)) onUpdateSectionTitle(item.sectionId, value);
            }}
            className={canEdit ? editableClass : undefined}
            style={{
              fontSize: `${effective.fontSize.title}pt`,
              fontWeight: hr.h1.bold ? 700 : 400,
              fontStyle: hr.h1.italic ? 'italic' : 'normal',
              textTransform: hr.h1.allCaps ? 'uppercase' : 'none',
              textAlign: hr.h1.alignment,
              lineHeight: 1.5,
              paddingTop: '0.35em',
              paddingBottom: '0.55em'
            }}
          >
            {chapter ? (
              <>
                <span data-chapter-line="label" style={{ display: 'block' }}>
                  {chapter.label}
                </span>
                <span data-chapter-line="title" style={{ display: 'block' }}>
                  {chapter.title}
                </span>
              </>
            ) : (
              renderInline(item.text)
            )}
          </h2>
        </div>
      );
    }

    if (item.kind === 'toc-entry') {
      const entry = item.toc;
      if (!entry) return null;

      const pageLabel = entry.blockId
        ? meta.blockPageLabels[entry.blockId]
        : meta.sectionPages[entry.sectionId]?.label;
      const indent = entry.level >= 3 ? '3em' : entry.level === 2 ? '1.5em' : '0';

      return (
        <div
          key={item.id}
          data-flow-item={item.id}
          className="dot-leader-row"
          style={{
            fontSize: `${Math.max(9, effective.fontSize.body - 1)}pt`,
            fontWeight: entry.isBab ? 700 : 400,
            paddingTop: entry.isBab ? '0.45em' : '0.12em',
            paddingLeft: indent
          }}
        >
          <span className="dot-leader-title">{entry.title}</span>
          <span className="dot-leader-dots" />
          <span className="dot-leader-page">{pageLabel || '—'}</span>
        </div>
      );
    }

    const block = item.block;
    if (!block) return null;

    const blockId = block.id;
    const updateBlock = (event: React.FocusEvent<HTMLElement>) => {
      const value = event.currentTarget.textContent || '';
      if (!skipDisplayWrite(item, value)) onUpdateBlockContent(blockId, value);
    };

    if (block.type === 'image') {
      const dataUrl = (block.meta?.dataUrl as string) || '';
      return (
        <div
          key={item.id}
          data-flow-item={item.id}
          style={{ paddingBottom: '0.5em', position: 'relative' }}
        >
          {canEdit && onDeleteImage && (
            <button
              type="button"
              onClick={() => onDeleteImage(item.block?.id ?? item.id.replace(/^block-/, ''))}
              title="Hapus gambar"
              className="absolute top-1 right-1 z-10 rounded-md bg-white/90 border border-slate-300 px-1.5 py-0.5 text-[10px] text-slate-600 hover:text-red-600 hover:border-red-300 no-print"
            >
              ✕ Hapus
            </button>
          )}
          <img
            src={dataUrl}
            alt=""
            style={{ maxWidth: '100%', display: 'block', margin: '0 auto' }}
            onLoad={() => setImageTick((t) => t + 1)}
          />
        </div>
      );
    }

    if (block.type === 'table_caption' || block.type === 'figure_caption') {
      // Label diambil dari formattedContent agar nomor hasil renumber
      // ("Gambar 2.1 …") selalu tampil terbaru.
      const match = block.formattedContent.match(
        /^((?:Gambar|Tabel)\s+[\d.]+)\s*[:.]?\s*(.*)$/i
      );
      const label = match?.[1] ?? (block.meta?.label as string) ?? '';
      const description = match?.[2] ?? (block.meta?.description as string) ?? '';

      return (
        <div
          key={item.id}
          data-flow-item={item.id}
          contentEditable={canEdit}
          suppressContentEditableWarning
          onBlur={updateBlock}
          className={canEdit ? editableClass : undefined}
          style={{
            fontSize: `${effective.fontSize.table}pt`,
            textAlign: 'center',
            paddingTop: '0.35em',
            paddingBottom: '0.3em'
          }}
        >
          {label && <strong>{label}</strong>}
          {description ? `: ${description}` : ''}
        </div>
      );
    }

    if (block.type === 'table') {
      const header = (block.meta?.header ?? []) as string[];
      const rows = (block.meta?.rows ?? []) as string[][];
      const tableStyle = effective.tableStyle;
      const borderWidth = Math.max(0.25, tableStyle.borderWidth);
      const cellStyle: React.CSSProperties = {
        border: `${borderWidth}pt solid #64748b`,
        padding: '2px 4px',
        verticalAlign: 'top',
        textAlign: tableStyle.cellAlignment
      };

      const blockIdForCells = item.block?.id ?? item.id.replace(/^block-/, '');
      const cellBlur = (row: number, col: number) =>
        onUpdateTableCell
          ? (event: React.FocusEvent<HTMLTableCellElement>) =>
              onUpdateTableCell(blockIdForCells, row, col, event.currentTarget.textContent || '')
          : undefined;

      return (
        <div key={item.id} data-flow-item={item.id} style={{ paddingBottom: '0.55em' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: `${effective.fontSize.table}pt`,
              lineHeight: 1.3
            }}
          >
            <thead>
              <tr>
                {header.map((cell, index) => (
                  <th
                    key={index}
                    contentEditable={canEdit}
                    suppressContentEditableWarning
                    onBlur={cellBlur(-1, index)}
                    className={canEdit ? editableClass : undefined}
                    style={{
                      ...cellStyle,
                      fontWeight: tableStyle.headerBold ? 700 : 400,
                      textAlign: tableStyle.cellAlignment
                    }}
                  >
                    {renderInline(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      contentEditable={canEdit}
                      suppressContentEditableWarning
                      onBlur={cellBlur(rowIndex, cellIndex)}
                      className={canEdit ? editableClass : undefined}
                      style={cellStyle}
                    >
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (block.type === 'signature') {
      // Penutup KATA PENGANTAR: kota & tanggal, lalu nama penulis, rata kanan.
      const meta = (block.meta ?? {}) as { place?: string; date?: string; signer?: string };
      const dateLine = [meta.place, meta.date].filter(Boolean).join(', ') || item.text;

      return (
        <div
          key={item.id}
          data-flow-item={item.id}
          style={{ marginTop: '2em', textAlign: 'right' }}
        >
          <p style={{ textIndent: 0, margin: 0, textAlign: 'right' }}>{renderInline(dateLine)}</p>
          {meta.signer ? (
            <p style={{ textIndent: 0, marginTop: '2.5em', textAlign: 'right' }}>
              {renderInline(meta.signer)}
            </p>
          ) : null}
        </div>
      );
    }

    if (block.type === 'heading_1') {
      const hr = effective.headingRules;
      const rendered = formatChapterHeading(item.text, hr.numberingFormat, hr.babTitleStyle);

      return (
        <div key={item.id} data-flow-item={item.id}>
          <h2
            contentEditable={canEdit}
            suppressContentEditableWarning
            onBlur={(event) => {
              const chapter = splitChapterHeading(item.text);
              if (!chapter) {
                const value = event.currentTarget.textContent || '';
                if (!skipDisplayWrite(item, value)) onUpdateBlockContent(block.id, value);
                return;
              }
              // Dua baris judul disatukan kembali menjadi "BAB I PENDAHULUAN".
              const lines = Array.from(
                event.currentTarget.querySelectorAll<HTMLElement>('[data-chapter-line]')
              );
              const joined = lines.length
                ? lines.map((line) => (line.textContent || '').trim()).filter(Boolean).join(' ')
                : (event.currentTarget.textContent || '').trim();
              if (!skipDisplayWrite(item, joined)) onUpdateBlockContent(block.id, joined);
            }}
            className={canEdit ? editableClass : undefined}
            style={{
              fontSize: `${effective.fontSize.title}pt`,
              fontWeight: hr.h1.bold ? 700 : 400,
              fontStyle: hr.h1.italic ? 'italic' : 'normal',
              textTransform: hr.h1.allCaps ? 'uppercase' : 'none',
              textAlign: hr.h1.alignment,
              lineHeight: 1.5,
              paddingTop: `${hr.h1.spaceBefore}pt`,
              paddingBottom: `${hr.h1.spaceAfter}pt`
            }}
          >
            {hr.babTitleStyle === 'joined' || !rendered.label ? (
              renderInline(rendered.joined)
            ) : (
              <>
                <span data-chapter-line="label" style={{ display: 'block' }}>
                  {rendered.label}
                </span>
                <span data-chapter-line="title" style={{ display: 'block' }}>
                  {rendered.title}
                </span>
              </>
            )}
          </h2>
        </div>
      );
    }

    if (block.type === 'heading_2') {
      const hr = effective.headingRules;
      const text = formatSubHeadingNumber(item.text, hr.h2Numbering);
      // Posisi judul (cm): nomor dalam kotak selebar posisi, judul mulai rata
      // di posisi yang sama — meniru tab stop pada ekspor DOCX.
      const gap = hr.numberTitleGapCm;
      const parts = gap > 0 ? splitHeadingNumberTitle(text) : null;
      return (
        <div key={item.id} data-flow-item={item.id}>
          <h3
            contentEditable={canEdit}
            suppressContentEditableWarning
            onBlur={updateBlock}
            className={canEdit ? editableClass : undefined}
            style={{
              fontSize: `${effective.fontSize.subTitle}pt`,
              fontWeight: hr.h2.bold ? 700 : 400,
              fontStyle: hr.h2.italic ? 'italic' : 'normal',
              textTransform: hr.h2.allCaps ? 'uppercase' : 'none',
              textAlign: hr.h2.alignment,
              paddingTop: `${hr.h2.spaceBefore}pt`,
              paddingBottom: `${hr.h2.spaceAfter}pt`
            }}
          >
            {parts ? (
              <>
                <span style={{ display: 'inline-block', minWidth: `${gap}cm` }}>
                  {renderInline(parts.number)}
                  {/* nbsp: nomor lebih lebar dari posisi tetap tidak pernah
                      menempel dengan judul (Word maju ke stop berikutnya). */}
                  {'\u00A0'}
                </span>
                {renderInline(parts.title)}
              </>
            ) : (
              renderInline(text)
            )}
          </h3>
        </div>
      );
    }

    if (block.type === 'heading_3') {
      const hr = effective.headingRules;
      const gap = hr.numberTitleGapCm;
      const parts = gap > 0 ? splitHeadingNumberTitle(item.text) : null;
      return (
        <div key={item.id} data-flow-item={item.id}>
          <h4
            contentEditable={canEdit}
            suppressContentEditableWarning
            onBlur={updateBlock}
            className={canEdit ? editableClass : undefined}
            style={{
              fontSize: `${effective.fontSize.subTitle}pt`,
              fontWeight: hr.h3.bold ? 700 : 400,
              fontStyle: hr.h3.italic ? 'italic' : 'normal',
              textTransform: hr.h3.allCaps ? 'uppercase' : 'none',
              textAlign: hr.h3.alignment,
              paddingTop: `${hr.h3.spaceBefore}pt`,
              paddingBottom: `${hr.h3.spaceAfter}pt`
            }}
          >
            {parts ? (
              <>
                <span style={{ display: 'inline-block', minWidth: `${gap}cm` }}>
                  {renderInline(parts.number)}
                  {/* nbsp: nomor lebih lebar dari posisi tetap tidak pernah
                      menempel dengan judul (Word maju ke stop berikutnya). */}
                  {'\u00A0'}
                </span>
                {renderInline(parts.title)}
              </>
            ) : (
              renderInline(item.text)
            )}
          </h4>
        </div>
      );
    }

    if (block.type === 'list_item') {
      const text = stripListMarker(block.formattedContent);
      const numbering = listLabels.get(block.id);
      const level = numbering?.level ?? 1;

      if (!effective.numbering) {
        return (
          <div key={item.id} data-flow-item={item.id}>
            <p
              contentEditable={canEdit}
              suppressContentEditableWarning
              onBlur={updateBlock}
              className={canEdit ? editableClass : undefined}
              style={{
                textAlign: effective.alignment,
                paddingLeft: `${(level - 1) * LIST_INDENT_CM}cm`,
                paddingBottom: '0.3em'
              }}
            >
              {renderInline(text)}
            </p>
          </div>
        );
      }

      return (
        <div
          key={item.id}
          data-flow-item={item.id}
          className="flex items-start"
          style={{
            paddingLeft: `${(level - 1) * LIST_INDENT_CM}cm`,
            paddingBottom: '0.3em'
          }}
        >
          <span
            aria-hidden
            style={{
              width: `${LIST_INDENT_CM}cm`,
              flexShrink: 0,
              textAlign: 'left'
            }}
          >
            {numbering?.label ?? '1.'}
          </span>
          <span
            contentEditable={canEdit}
            suppressContentEditableWarning
            onBlur={(event) => onUpdateBlockContent(blockId, event.currentTarget.textContent || '')}
            className={canEdit ? editableClass : undefined}
            style={{ flex: 1, textAlign: effective.alignment }}
          >
            {renderInline(text)}
          </span>
        </div>
      );
    }

    if (block.type === 'daftar_pustaka_item') {
      const hanging = effective.hangingIndent;
      return (
        <div key={item.id} data-flow-item={item.id}>
          <p
            contentEditable={canEdit}
            suppressContentEditableWarning
            onBlur={updateBlock}
            className={canEdit ? editableClass : undefined}
            style={{
              textAlign: 'left',
              paddingLeft: `${hanging}cm`,
              textIndent: `-${hanging}cm`,
              paddingBottom: '0.4em'
            }}
          >
            {renderInline(item.text)}
          </p>
        </div>
      );
    }

    return (
      <div key={item.id} data-flow-item={item.id}>
        <p
          contentEditable={canEdit}
          suppressContentEditableWarning
          onBlur={updateBlock}
          className={canEdit ? editableClass : undefined}
          style={{
            textAlign: effective.alignment,
            textIndent: `${effective.firstLineIndent}cm`,
            paddingBottom: '0.55em'
          }}
        >
          {renderInline(item.text)}
        </p>
      </div>
    );
  };

  const sheetStyle: React.CSSProperties = {
    paddingTop: `${effective.margin.top}cm`,
    paddingBottom: `${effective.margin.bottom}cm`,
    paddingLeft: `${effective.margin.left}cm`,
    paddingRight: `${effective.margin.right}cm`,
    fontFamily: fontStack,
    lineHeight: effective.lineSpacing,
    fontSize: `${effective.fontSize.body}pt`,
    width: `${paper.widthMm}mm`,
    height: `${paper.heightMm}mm`,
    minHeight: `${paper.heightMm}mm`,
    overflow: 'hidden',
    boxSizing: 'border-box',
    color: '#111827'
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-200/80 overflow-hidden relative select-text preview-root">
      <style>{printPaperStyle}</style>
      {/* Kontrol atas */}
      <div className="min-h-12 py-1 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-3 md:px-6 flex flex-wrap items-center justify-between gap-y-1 text-xs text-slate-600 shrink-0 z-20 shadow-2xs no-print">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => scrollToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            title="Halaman Sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div className="flex items-center space-x-1.5 font-medium select-none">
            <label htmlFor="page-jump" className="text-slate-600">
              Halaman
            </label>
            <input
              id="page-jump"
              ref={pageInputRef}
              type="number"
              min={1}
              max={totalPages}
              value={pageInput}
              onChange={(event) => setPageInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  const next = Number(pageInput);
                  if (Number.isFinite(next) && next >= 1 && next <= totalPages) {
                    scrollToPage(next);
                  }
                  event.currentTarget.blur();
                }
                if (event.key === 'Escape') {
                  setPageInput(String(currentPage));
                  event.currentTarget.blur();
                }
              }}
              onBlur={() => setPageInput(String(currentPage))}
              aria-label="Nomor halaman tujuan"
              title="Ketik nomor halaman lalu tekan Enter"
              className="w-12 rounded-md border border-slate-300 bg-white px-1 py-0.5 text-center text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <span className="text-slate-600">dari {totalPages}</span>
          </div>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => scrollToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            title="Halaman Selanjutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant={isEditMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => setIsEditMode(!isEditMode)}
            className={isEditMode ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs' : ''}
            title="Aktifkan untuk mengedit teks langsung di atas kertas A4"
          >
            {isEditMode ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1.5 stroke-[3]" />
                <span>Selesai Mengedit</span>
              </>
            ) : (
              <>
                <Edit3 className="w-3.5 h-3.5 mr-1.5 text-teal-600" />
                <span>Edit Teks Langsung</span>
              </>
            )}
          </Button>
        </div>

        <div className="flex items-center space-x-1.5">
          <Button variant="ghost" size="icon-sm" onClick={handleZoomOut} title="Perkecil">
            <Minus className="w-3.5 h-3.5" />
          </Button>

          <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            {[75, 80, 100].map((preset) => (
              <button
                key={preset}
                onClick={() => {
                  setAutoFit(false);
                  setZoom(preset);
                }}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                  !autoFit && zoom === preset
                    ? 'bg-white font-bold text-teal-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {preset}%
              </button>
            ))}
          </div>

          <Button variant="ghost" size="icon-sm" onClick={handleZoomIn} title="Perbesar">
            <Plus className="w-3.5 h-3.5" />
          </Button>

          <span
            className="text-[10px] font-mono text-slate-500 w-9 text-center"
            title="Zoom efektif saat ini"
          >
            {Math.round(effectiveZoom)}%
          </span>

          <div className="h-4 w-px bg-slate-200 mx-1" />

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleResetZoom}
            title={`Pas Layar (${Math.round(fitPercent)}%)`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {isEditMode && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-900 flex items-center justify-between shrink-0 z-10 no-print">
          <div className="flex items-center space-x-2">
            <Edit3 className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Mode Edit Langsung Aktif:</strong> klik judul, paragraf, atau poin di atas
              kertas A4. Perubahan otomatis tersimpan dan ikut ke ekspor Word.
            </span>
          </div>
          <Button
            variant="outline"
            size="xs"
            onClick={() => setIsEditMode(false)}
            className="border-amber-300 bg-amber-100/70 text-amber-900 hover:bg-amber-100"
          >
            Tutup Mode Edit
          </Button>
        </div>
      )}

      {/* Pengukur tinggi tersembunyi */}
      <div
        ref={measureRef}
        aria-hidden
        className="preview-measure"
        style={{
          position: 'fixed',
          top: 0,
          left: '-10000px',
          width: `${measureWidthMm}mm`,
          fontFamily: fontStack,
          lineHeight: effective.lineSpacing,
          fontSize: `${effective.fontSize.body}pt`,
          visibility: 'hidden',
          pointerEvents: 'none'
        }}
      >
        {items.map((item) => renderItem(item, false))}
      </div>

      {/* Kanvas dokumen */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 flex flex-col items-center scroll-smooth preview-scroll"
        style={{ scrollBehavior: 'smooth' }}
        onContextMenu={(event) => {
          // Klik kanan ala Word: di mode edit, menu konteks menawarkan
          // sisip gambar/tabel (di blok yang diklik kanan) atau operasi
          // tabel bila klik kanan jatuh di sel tabel.
          if (!isEditMode) return;
          const target = event.target as HTMLElement;
          const flowEl = target.closest('[data-flow-item]');
          if (!flowEl) return;
          const blockId = (flowEl.getAttribute('data-flow-item') ?? '').replace(/^block-/, '');
          const cellEl = target.closest('td,th') as HTMLTableCellElement | null;
          const inTable = Boolean(cellEl && flowEl.querySelector('table'));
          let row = 0;
          let col = 0;
          if (cellEl && inTable) {
            col = cellEl.cellIndex ?? 0;
            const tr = cellEl.closest('tr');
            const siblings = tr?.parentElement?.children;
            row =
              tr?.parentElement?.tagName === 'THEAD'
                ? -1
                : siblings
                  ? Array.from(siblings).indexOf(tr as Element)
                  : 0;
          }
          event.preventDefault();
          setContextMenu({
            x: event.clientX,
            y: event.clientY,
            blockId,
            isImage: (flowEl.querySelector(':scope > img') ?? null) !== null,
            isTable: inTable,
            row,
            col
          });
        }}
      >
        {/* zoom (bukan transform scale): layout ikut menyusut, halaman tidak
            terpotong di layar sempit, dan offset klik/scroll tetap akurat. */}
        <div
          className="flex flex-col items-center space-y-10 pb-24 preview-scale"
          style={{ zoom: effectiveZoom / 100 }}
        >
          {pages.map((pageItems, pageIndex) => {
            const pageLabel = meta.labels[pageIndex] ?? { phase: 'body' as const, label: '' };
            const firstItem = pageItems[0];
            const isCover = pageLabel.phase === 'cover';

            return (
              <div
                key={pageIndex}
                id={`page-${pageIndex + 1}`}
                data-page={pageIndex + 1}
                data-section-id={firstItem?.sectionId || ''}
                className="a4-paper-sheet flow-page transition-shadow hover:shadow-xl"
                style={sheetStyle}
              >
                <div
                  className="flex flex-col"
                  style={{ minHeight: '100%' }}
                >
                  {/* Header jurnal di atas setiap halaman: kiri nama+edisi italic,
                      kanan ISSN — ala PDF Berkala Fisika. */}
                  {isJournal &&
                    (journal?.name?.trim() ||
                      journal?.volumeInfo?.trim() ||
                      journal?.issn?.trim()) && (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '0.4cm',
                        fontSize: '10pt',
                        lineHeight: 1.4
                      }}
                    >
                      <div style={{ fontStyle: 'italic' }}>
                        {journal?.name?.trim() && <div style={{ fontWeight: 700 }}>{journal.name}</div>}
                        {journal?.volumeInfo?.trim() && <div>{journal.volumeInfo}</div>}
                      </div>
                      {journal?.issn?.trim() && (
                        <div style={{ fontStyle: 'italic', fontWeight: 700 }}>{journal.issn}</div>
                      )}
                    </div>
                  )}

                  {/* Front matter artikel: judul + penulis + abstrak — satu
                      kolom penuh, hanya di halaman pertama. */}
                  {isJournal && pageIndex === 0 && journalFront && (
                    <div style={{ marginBottom: '0.4cm' }}>
                      <div
                        style={{
                          textAlign: 'center',
                          fontWeight: 700,
                          fontSize: '14pt',
                          marginBottom: '0.3cm'
                        }}
                      >
                        {journalFront.title}
                      </div>
                      {journalFront.author && (
                        <div
                          style={{
                            textAlign: 'center',
                            fontStyle: 'italic',
                            fontWeight: 700,
                            fontSize: '11pt'
                          }}
                        >
                          {journalFront.author}
                        </div>
                      )}
                      {journalFront.affiliation && (
                        <div
                          style={{
                            textAlign: 'center',
                            fontStyle: 'italic',
                            fontSize: '10pt',
                            marginBottom: '0.4cm'
                          }}
                        >
                          {journalFront.affiliation}
                        </div>
                      )}
                      {journalFront.abstracts.map((abs, index) => (
                        <div key={`${abs.heading}-${index}`} style={{ marginBottom: '0.35cm' }}>
                          <div
                            style={{
                              textAlign: 'center',
                              fontWeight: 700,
                              fontSize: '11pt',
                              marginBottom: '0.15cm'
                            }}
                          >
                            {abs.heading}
                          </div>
                          {abs.body && (
                            <div
                              style={{
                                fontStyle: 'italic',
                                textAlign: 'justify',
                                fontSize: '10pt',
                                lineHeight: 1.3
                              }}
                            >
                              {abs.body}
                            </div>
                          )}
                          {abs.keywords && (
                            <div style={{ fontStyle: 'italic', fontSize: '10pt', marginTop: '0.15cm' }}>
                              {abs.heading.toLowerCase() === 'abstract' ? 'Keyword' : 'Kata kunci'} :{' '}
                              {abs.keywords}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {isJournal ? (
                    <div className="journal-columns">{pageItems.map((item) => renderItem(item, true))}</div>
                  ) : (
                    pageItems.map((item) => renderItem(item, true))
                  )}
                </div>

                {effective.pageNumbers && pageLabel.label && !isCover &&
                  effective.pageSetup.pageNumberPosition !== 'none' && (
                  <div
                    style={{
                      position: 'absolute',
                      fontSize: '10pt',
                      color: '#334155',
                      ...(effective.pageSetup.pageNumberPosition === 'bottom-center'
                        ? { bottom: '1.2cm', left: 0, right: 0, textAlign: 'center' }
                        : effective.pageSetup.pageNumberPosition === 'bottom-right'
                          ? { bottom: '1.2cm', right: '1.2cm' }
                          : { top: '1.2cm', right: '1.2cm' })
                    }}
                  >
                    {pageLabel.label}
                  </div>
                )}

                {effective.pageSetup.headerEnabled &&
                  effective.pageSetup.headerText.trim() &&
                  !isCover &&
                  pageLabel.phase !== 'front' && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '0.8cm',
                      left: 0,
                      right: 0,
                      textAlign: 'center',
                      fontSize: '10pt',
                      color: '#334155'
                    }}
                  >
                    {effective.pageSetup.headerText}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Menu konteks klik kanan (mode edit) — ala Word: sisip gambar di
          blok yang diklik kanan, atau hapus gambar. */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40 no-print"
            onClick={() => setContextMenu(null)}
            onContextMenu={(event) => {
              event.preventDefault();
              setContextMenu(null);
            }}
          />
          <div
            className="fixed z-50 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[200px] no-print"
            style={{
              left: Math.min(contextMenu.x, window.innerWidth - 230),
              top: Math.min(contextMenu.y, window.innerHeight - 200)
            }}
          >
            {contextMenu.isTable && onTableOp ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onTableOp(contextMenu.blockId ?? '', 'addRow', contextMenu.row, contextMenu.col);
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-teal-50 hover:text-teal-700"
                >
                  ▥ Tambah baris di bawah
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onTableOp(contextMenu.blockId ?? '', 'addCol', contextMenu.row, contextMenu.col);
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-teal-50 hover:text-teal-700"
                >
                  ▥ Tambah kolom di kanan
                </button>
                {contextMenu.row >= 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      onTableOp(contextMenu.blockId ?? '', 'delRow', contextMenu.row, contextMenu.col);
                      setContextMenu(null);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-amber-50 hover:text-amber-700"
                  >
                    ▥ Hapus baris
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    onTableOp(contextMenu.blockId ?? '', 'delCol', contextMenu.row, contextMenu.col);
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-amber-50 hover:text-amber-700"
                >
                  ▥ Hapus kolom
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onTableOp(contextMenu.blockId ?? '', 'delTable', contextMenu.row, contextMenu.col);
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50"
                >
                  🗑 Hapus tabel
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    contextAfterBlockId.current = contextMenu.blockId ?? undefined;
                    contextFileRef.current?.click();
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-teal-50 hover:text-teal-700 flex items-center space-x-2"
                >
                  <span>🖼 Sisipkan Gambar di sini</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTableGrid({
                      x: contextMenu.x,
                      y: contextMenu.y,
                      afterBlockId: contextMenu.blockId
                    });
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-teal-50 hover:text-teal-700 flex items-center space-x-2"
                >
                  <span>▦ Sisipkan Tabel</span>
                </button>
                {contextMenu.isImage && onDeleteImage && (
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteImage(contextMenu.blockId ?? '');
                      setContextMenu(null);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center space-x-2"
                  >
                    <span>🗑 Hapus gambar</span>
                  </button>
                )}
              </>
            )}
          </div>
        </>
      )}

      {tableGrid && (
        <>
          <div className="fixed inset-0 z-40 no-print" onClick={() => setTableGrid(null)} />
          <div
            className="fixed z-50 bg-white border border-slate-200 rounded-lg shadow-lg p-2 no-print"
            style={{
              left: Math.min(tableGrid.x, window.innerWidth - 200),
              top: Math.min(tableGrid.y, window.innerHeight - 240)
            }}
          >
            <div className="text-[10px] text-slate-500 mb-1 font-mono text-center">
              {gridHover.rows} × {gridHover.cols} tabel
            </div>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(8, 18px)' }}>
              {Array.from({ length: 64 }).map((_, index) => {
                const rows = Math.floor(index / 8) + 1;
                const cols = (index % 8) + 1;
                const active = rows <= gridHover.rows && cols <= gridHover.cols;
                return (
                  <div
                    key={index}
                    onMouseEnter={() => setGridHover({ rows, cols })}
                    onClick={() => {
                      onInsertTable?.(tableGrid.afterBlockId ?? undefined, rows, cols);
                      setTableGrid(null);
                    }}
                    className={active ? 'bg-teal-200 border border-teal-400' : 'bg-slate-50 border border-slate-200'}
                    style={{ width: 18, height: 18 }}
                  />
                );
              })}
            </div>
          </div>
        </>
      )}
      <input
        ref={contextFileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden no-print"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file && onInsertImageAt) onInsertImageAt(file, contextAfterBlockId.current);
          event.currentTarget.value = '';
          contextAfterBlockId.current = undefined;
        }}
      />
    </div>
  );
};
