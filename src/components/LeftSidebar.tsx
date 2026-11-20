import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  FileText,
  Layers,
  Search,
  X
} from 'lucide-react';
import { ParsedDocument, DocumentSection } from '../types/document';
import { SectionPageMap } from '../utils/previewLayout';
import { stripInlineMarkdown } from '../utils/inlineFormat';

interface LeftSidebarProps {
  doc: ParsedDocument;
  activeSectionId: string | null;
  onSelectSection: (id: string) => void;
  currentPage: number;
  onSelectPage: (page: number) => void;
  sectionPages: SectionPageMap;
  blockPages: Record<string, number>;
  totalPages: number;
}

type SidebarTab = 'bagian' | 'struktur';

const tabClass = (active: boolean) =>
  `flex-1 rounded-lg py-2 px-2.5 flex items-center justify-center space-x-1.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
    active
      ? 'bg-white text-teal-700 font-semibold shadow-xs'
      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
  }`;

// DAFTAR ISI / DAFTAR TABEL / DAFTAR GAMBAR / sampul tidak punya hierarki sub-bab.
const FLAT_SECTION_TYPES = new Set([
  'cover',
  'daftar_isi',
  'daftar_tabel',
  'daftar_gambar',
  'daftar_pustaka',
  'daftar_lampiran'
]);

const subHeadingsOf = (section: DocumentSection) =>
  FLAT_SECTION_TYPES.has(section.type)
    ? []
    : section.blocks.filter((b) => b.type === 'heading_2' || b.type === 'heading_3');

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  doc,
  activeSectionId,
  onSelectSection,
  currentPage,
  onSelectPage,
  sectionPages,
  blockPages,
  totalPages
}) => {
  const [activeTab, setActiveTab] = useState<SidebarTab>('bagian');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Halaman sampul sengaja tanpa nomor cetak; jangan tampilkan label kosong.
  const pageOf = (section: DocumentSection, index: number) => {
    const info = sectionPages[section.id];
    if (!info) return { number: index + 1, label: '—' };
    return { number: info.page, label: info.label || '—' };
  };

  // Bab yang sedang dibaca otomatis terbuka di tab Struktur.
  useEffect(() => {
    if (!activeSectionId) return;
    setExpanded((prev) =>
      prev[activeSectionId] ? prev : { ...prev, [activeSectionId]: true }
    );
  }, [activeSectionId]);

  const term = query.trim().toLowerCase();

  const sections = useMemo(() => {
    if (!term) return doc.sections;
    return doc.sections.filter(
      (section) =>
        section.title.toLowerCase().includes(term) ||
        subHeadingsOf(section).some((b) =>
          stripInlineMarkdown(b.formattedContent).toLowerCase().includes(term)
        )
    );
  }, [doc.sections, term]);

  const goTo = (sectionId: string, pageNumber: number) => {
    onSelectSection(sectionId);
    onSelectPage(pageNumber);
  };

  const progress = totalPages > 0 ? Math.min(100, Math.max(0, (currentPage / totalPages) * 100)) : 0;

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 h-full overflow-hidden no-print">
      <div
        role="tablist"
        aria-label="Navigasi dokumen"
        className="flex border-b border-slate-200 text-xs font-medium bg-slate-50/60 p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'bagian'}
          onClick={() => setActiveTab('bagian')}
          className={tabClass(activeTab === 'bagian')}
        >
          <FileText className="w-3.5 h-3.5" aria-hidden />
          <span>Bagian</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'struktur'}
          onClick={() => setActiveTab('struktur')}
          className={tabClass(activeTab === 'struktur')}
        >
          <Layers className="w-3.5 h-3.5" aria-hidden />
          <span>Struktur</span>
        </button>
      </div>

      <div className="px-2 pt-2 pb-2 border-b border-slate-100">
        <label className="relative flex items-center">
          <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-slate-400" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setQuery('');
            }}
            placeholder="Cari bab atau sub-bab…"
            aria-label="Cari bagian dokumen"
            className="w-full rounded-lg border border-slate-200 bg-slate-50/80 py-1.5 pl-8 pr-7 text-[11px] text-slate-700 placeholder-slate-400 focus:border-teal-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-100 [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Bersihkan pencarian"
              className="absolute right-1.5 rounded p-0.5 text-slate-400 hover:bg-slate-200/70 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              <X className="h-3 w-3" aria-hidden />
            </button>
          )}
        </label>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sections.length === 0 && (
          <div className="px-3 py-8 text-center text-[11px] text-slate-400">
            Tidak ada bagian yang cocok dengan “{query.trim()}”.
          </div>
        )}

        {activeTab === 'bagian' && sections.length > 0 && (
          <ul className="space-y-0.5 p-1.5">
            {sections.map((section) => {
              const index = doc.sections.indexOf(section);
              const { number, label } = pageOf(section, index);
              const isActive = activeSectionId === section.id;
              const subCount = subHeadingsOf(section).length;

              return (
                <li key={section.id}>
                  <button
                    type="button"
                    onClick={() => goTo(section.id, number)}
                    aria-current={isActive ? 'true' : undefined}
                    title={`${section.title} — ${label === '—' ? 'tanpa nomor halaman' : `halaman ${label}`}`}
                    className={`group relative flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                      isActive
                        ? 'bg-teal-50 text-teal-900 ring-1 ring-inset ring-teal-200'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {isActive && (
                      <span
                        aria-hidden
                        className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-teal-600"
                      />
                    )}
                    <span
                      className={`mt-0.5 w-8 shrink-0 rounded-md py-0.5 text-center text-[10px] font-medium leading-4 tabular-nums transition-colors ${
                        isActive
                          ? 'bg-teal-600 text-white'
                          : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200/70'
                      }`}
                    >
                      {label}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11.5px] font-semibold uppercase tracking-tight">
                        {section.title}
                      </span>
                      {subCount > 0 && (
                        <span className="mt-0.5 block text-[11px] text-slate-500">
                          {subCount} sub-bab
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {activeTab === 'struktur' && sections.length > 0 && (
          <ul className="space-y-1 p-1.5">
            {sections.map((section) => {
              const index = doc.sections.indexOf(section);
              const { number, label } = pageOf(section, index);
              const isActive = activeSectionId === section.id;
              const subHeadings = subHeadingsOf(section);
              const isOpen = Boolean(expanded[section.id]);
              const hasChildren = subHeadings.length > 0;

              return (
                <li key={section.id} className="rounded-xl">
                  <div
                    className={`flex items-center gap-1 rounded-xl pr-1 transition-colors ${
                      isActive ? 'bg-teal-50 ring-1 ring-inset ring-teal-200' : 'hover:bg-slate-50'
                    }`}
                  >
                    <button
                      type="button"
                      aria-expanded={hasChildren ? isOpen : undefined}
                      aria-label={
                        hasChildren
                          ? `${isOpen ? 'Tutup' : 'Buka'} sub-bab ${section.title}`
                          : undefined
                      }
                      onClick={() =>
                        hasChildren &&
                        setExpanded((prev) => ({ ...prev, [section.id]: !prev[section.id] }))
                      }
                      disabled={!hasChildren}
                      className="ml-1 rounded-md p-1 text-slate-400 hover:bg-white hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-0"
                    >
                      {isOpen ? (
                        <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => goTo(section.id, number)}
                      aria-current={isActive ? 'true' : undefined}
                      title={`${section.title} — ${label === '—' ? 'tanpa nomor halaman' : `halaman ${label}`}`}
                      className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                    >
                      <BookOpen
                        className={`h-3 w-3 shrink-0 ${isActive ? 'text-teal-600' : 'text-slate-400'}`}
                        aria-hidden
                      />
                      <span
                        className={`min-w-0 truncate text-[11.5px] font-semibold uppercase tracking-tight ${
                          isActive ? 'text-teal-800' : 'text-slate-700'
                        }`}
                      >
                        {section.title}
                      </span>
                      <span className="ml-auto pl-1 font-mono text-[10px] text-slate-400">{label}</span>
                    </button>
                  </div>

                  {hasChildren && isOpen && (
                    <ul className="ml-5 mt-0.5 space-y-0.5 border-l border-slate-200 pl-2 pb-1">
                      {subHeadings.map((block) => (
                        <li key={block.id}>
                          <button
                            type="button"
                            onClick={() => goTo(section.id, blockPages[block.id] ?? number)}
                            title={stripInlineMarkdown(block.formattedContent)}
                            className="block w-full truncate rounded-md px-1.5 py-1 text-left text-[11px] text-slate-600 hover:bg-slate-100 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                          >
                            {stripInlineMarkdown(block.formattedContent)}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="border-t border-slate-200 bg-slate-50/80 px-3 py-2.5">
        <div className="flex items-center justify-between text-[11px] font-medium text-slate-600">
          <span>
            Halaman {currentPage} dari {totalPages}
          </span>
          <span className="tabular-nums text-slate-500">{Math.round(progress)}%</span>
        </div>
        <div
          role="progressbar"
          aria-label="Posisi baca"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-200"
        >
          <div
            className="h-full rounded-full bg-teal-500 transition-[width] duration-150"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </aside>
  );
};