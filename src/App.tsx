import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { AppSidebar, NavPage } from './components/AppSidebar';
import { HomePage } from './components/HomePage';
import { PedomanPage } from './components/PedomanPage';
import { Header } from './components/Header';
import { LeftSidebar } from './components/LeftSidebar';
import { A4PaperPreview } from './components/A4PaperPreview';
import { RightSidebar } from './components/RightSidebar';
import { PasteModal } from './components/PasteModal';
import { CompareModal } from './components/CompareModal';
import { ClearConfirmModal } from './components/ClearConfirmModal';
import {
  CoverData,
  DocumentConfig,
  DocumentTemplate,
  ParsedDocument,
  BlockType
} from './types/document';
import { parseRawDocument } from './utils/aiCleaner';
import { SAMPLE_AI_RAW_TEXT } from './data/sampleDocument';
import { applyKbbiCorrections } from './utils/kbbiCorrector';
import { sortBibliographyBlocks } from './utils/citationHelper';
import { applyTemplatePreset } from './utils/templatePresets';
import { isTitleBlock, PaginationInfo } from './utils/previewLayout';
import { createBlankCover, normalizeCover } from './utils/cover';
import { DEFAULT_HEADING_RULES, DEFAULT_PAGE_SETUP, DEFAULT_COVER_LAYOUT } from './utils/formatEngine';
import { DetectedDocumentType } from './utils/formatDiagnosis';

const STORAGE_KEY = 'skripsira pi-state-v2';

const DEFAULT_CONFIG: DocumentConfig = {
  template: 'makalah',
  margin: {
    top: 3,
    bottom: 3,
    left: 4,
    right: 3
  },
  fontFamily: 'Times New Roman',
  fontSize: {
    title: 14,
    subTitle: 12,
    body: 12,
    table: 10,
    caption: 10
  },
  lineSpacing: 1.5,
  firstLineIndent: 1.0,
  alignment: 'justify',
  headingRules: DEFAULT_HEADING_RULES,
  pageSetup: DEFAULT_PAGE_SETUP,
  coverLayout: DEFAULT_COVER_LAYOUT,
  rules: {
    margin: true,
    font: true,
    font_size: true,
    line_spacing: true,
    indent: true,
    alignment: true,
    clean_markdown: true,
    clean_chatter: true,
    numbering: true,
    hanging_indent: true,
    page_numbers: true,
    header_footer: true
  }
};

const TEMPLATES: DocumentTemplate[] = ['makalah', 'skripsi', 'jurnal', 'kustom'];
const FONT_FAMILIES: DocumentConfig['fontFamily'][] = ['Times New Roman', 'Arial', 'Calibri'];

function sanitizeConfig(raw: Partial<DocumentConfig> | undefined): DocumentConfig {
  if (!raw) return DEFAULT_CONFIG;

  return {
    ...DEFAULT_CONFIG,
    ...raw,
    template: TEMPLATES.includes(raw.template as DocumentTemplate)
      ? (raw.template as DocumentTemplate)
      : DEFAULT_CONFIG.template,
    fontFamily: FONT_FAMILIES.includes(raw.fontFamily as DocumentConfig['fontFamily'])
      ? (raw.fontFamily as DocumentConfig['fontFamily'])
      : DEFAULT_CONFIG.fontFamily,
    margin: { ...DEFAULT_CONFIG.margin, ...(raw.margin || {}) },
    fontSize: { ...DEFAULT_CONFIG.fontSize, ...(raw.fontSize || {}) },
    headingRules: {
      ...DEFAULT_CONFIG.headingRules,
      ...(raw.headingRules || {}),
      h1: { ...DEFAULT_CONFIG.headingRules.h1, ...((raw.headingRules || {}).h1 || {}) },
      h2: { ...DEFAULT_CONFIG.headingRules.h2, ...((raw.headingRules || {}).h2 || {}) },
      h3: { ...DEFAULT_CONFIG.headingRules.h3, ...((raw.headingRules || {}).h3 || {}) }
    },
    pageSetup: { ...DEFAULT_CONFIG.pageSetup, ...(raw.pageSetup || {}) },
    coverLayout: { ...DEFAULT_CONFIG.coverLayout, ...(raw.coverLayout || {}) },
    rules: { ...DEFAULT_CONFIG.rules, ...(raw.rules || {}) }
  };
}

function isValidDocument(value: unknown): value is ParsedDocument {
  const candidate = value as ParsedDocument | null;
  return Boolean(
    candidate &&
      typeof candidate === 'object' &&
      typeof candidate.rawText === 'string' &&
      Array.isArray(candidate.sections)
  );
}

function loadSavedState(): { doc: ParsedDocument; config: DocumentConfig } | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as {
      doc?: unknown;
      config?: Partial<DocumentConfig>;
    };

    if (!isValidDocument(parsed.doc)) return null;

    const config = sanitizeConfig(parsed.config);

    // Dokumen lama tersimpan tanpa info indentasi daftar, sehingga penomoran
    // bertingkat tidak bisa direkonstruksi. Parse ulang dari teks asli, tapi
    // pertahankan data yang memang milik pengguna (sampul & nama file).
    const legacyLists = parsed.doc.sections.some((section) =>
      section.blocks.some(
        (block) => block.type === 'list_item' && typeof block.meta?.indent !== 'number'
      )
    );

    if (legacyLists && parsed.doc.rawText.trim()) {
      const reparsed = parseRawDocument(parsed.doc.rawText, config);
      reparsed.fileName = parsed.doc.fileName || reparsed.fileName;
      reparsed.cover = normalizeCover(parsed.doc.cover, parsed.doc.title);

      return { doc: reparsed, config };
    }

    return {
      doc: {
        ...parsed.doc,
        cover: normalizeCover(parsed.doc.cover, parsed.doc.title),
        issues: parsed.doc.issues || []
      },
      config
    };
  } catch {
    return null;
  }
}

function countDocumentWords(doc: ParsedDocument): number {
  return doc.sections.reduce(
    (total, section) =>
      total +
      section.blocks.reduce(
        (sum, block) => sum + block.formattedContent.trim().split(/\s+/).filter(Boolean).length,
        0
      ),
    0
  );
}

export function App() {
  const savedState = useMemo(loadSavedState, []);
  const [activePage, setActivePage] = useState<NavPage>('beranda');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const [config, setConfig] = useState<DocumentConfig>(
    savedState?.config ?? DEFAULT_CONFIG
  );
  const [doc, setDoc] = useState<ParsedDocument>(() =>
    savedState?.doc ?? parseRawDocument(SAMPLE_AI_RAW_TEXT, DEFAULT_CONFIG)
  );

  const [pagination, setPagination] = useState<PaginationInfo>({
    totalPages: doc.estimatedPages || 1,
    sectionPages: {},
    blockPages: {}
  });

  const [zoom, setZoom] = useState<number>(80);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(
    doc.sections[0]?.id ?? null
  );
  const [viewMode, setViewMode] = useState<'formatted' | 'raw'>('formatted');

  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const toastTimer = useRef<number | null>(null);

  const notify = useCallback((message: string) => {
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    setToastMessage(message);
    toastTimer.current = window.setTimeout(() => setToastMessage(null), 3500);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    };
  }, []);

  // Autosave: dokumen & konfigurasi tetap ada setelah refresh.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ doc, config, savedAt: Date.now() })
        );
      } catch {
        // Kuota localStorage penuh: abaikan, aplikasi tetap berjalan.
      }
    }, 500);

    return () => window.clearTimeout(timer);
  }, [doc, config]);

  const handlePaginationChange = useCallback((info: PaginationInfo) => {
    setPagination(info);
  }, []);

  // Navigasi halaman + rail: di Editor rail otomatis ikon-saja (lebih lebar untuk kanvas A4).
  const navigate = (page: NavPage) => {
    setActivePage(page);
    setIsSidebarCollapsed(page === 'editor');
  };

  const handleProcessFromHome = (text: string, fileName: string, template: DocumentTemplate) => {
    const updatedConfig = applyTemplatePreset(config, template);
    const parsed = parseRawDocument(text, updatedConfig);
    parsed.fileName = fileName;

    setConfig(updatedConfig);
    setDoc(parsed);
    setCurrentPage(1);
    setActiveSectionId(parsed.sections[0]?.id ?? null);
    navigate('editor');
    notify('Dokumen berhasil dirapikan dan dimuat di editor!');
  };

  const handleFormatText = (text: string, fileName?: string) => {
    const parsed = parseRawDocument(text, config);
    if (fileName) parsed.fileName = fileName;

    setDoc(parsed);
    setCurrentPage(1);
    setActiveSectionId(parsed.sections[0]?.id ?? null);
    notify('Dokumen berhasil dibersihkan & diformat!');
  };

  // Formatting diterapkan secara langsung oleh pratinjau.
  // Fungsi ini hanya menyegarkan hasil audit tanpa membuang hasil edit manual.
  const handleApplyFormatting = () => {
    const fresh = parseRawDocument(doc.rawText, config);
    setDoc((previous) => ({ ...previous, issues: fresh.issues }));
    notify('Format standar berhasil diperbarui!');
  };

  const handleRecheck = () => {
    const fresh = parseRawDocument(doc.rawText, config);

    setDoc((previous) => {
      const totalWords = countDocumentWords(previous);
      return {
        ...previous,
        issues: fresh.issues,
        totalWords,
        estimatedPages: Math.max(previous.sections.length, Math.ceil(totalWords / 250))
      };
    });

    notify('Pemeriksaan ulang selesai: format siap diunduh.');
  };

  const handleUpdateBlockContent = (blockId: string, newText: string) => {
    setDoc((previous) => ({
      ...previous,
      sections: previous.sections.map((section) => ({
        ...section,
        blocks: section.blocks.map((block) =>
          block.id === blockId
            ? {
                ...block,
                formattedContent: newText,
                rawContent: newText
              }
            : block
        )
      }))
    }));
  };

  const handleChangeCover = useCallback((patch: Partial<CoverData>) => {
    setDoc((previous) => {
      const base = previous.cover ?? createBlankCover(previous.title);
      return {
        ...previous,
        cover: { ...base, ...patch, enabled: true }
      };
    });
  }, []);

  const handleUpdateTitle = (newTitle: string) => {
    setDoc((previous) => ({ ...previous, title: newTitle }));
  };

  const handleUpdateSectionTitle = (sectionId: string, newTitle: string) => {
    setDoc((previous) => ({
      ...previous,
      sections: previous.sections.map((section) => {
        if (section.id !== sectionId) return section;

        const blocks = [...section.blocks];
        if (blocks.length > 0 && isTitleBlock(blocks[0])) {
          blocks[0] = {
            ...blocks[0],
            formattedContent: newTitle,
            rawContent: newTitle
          };
        }

        return { ...section, title: newTitle, blocks };
      })
    }));
  };

  const handleFixAllKbbi = () => {
    const { correctedText, totalReplaced } = applyKbbiCorrections(doc.rawText);

    const updatedSections = doc.sections.map((section) => ({
      ...section,
      blocks: section.blocks.map((block) => {
        const result = applyKbbiCorrections(block.formattedContent);
        return {
          ...block,
          formattedContent: result.correctedText,
          rawContent: result.correctedText
        };
      })
    }));

    setDoc((previous) => ({
      ...previous,
      rawText: correctedText,
      sections: updatedSections
    }));

    notify(`${totalReplaced} kata tidak baku berhasil diperbaiki sesuai KBBI!`);
  };

  const handleSortBibliography = () => {
    setDoc((previous) => ({
      ...previous,
      sections: previous.sections.map((section) => {
        if (section.type === 'daftar_pustaka' || section.title.toUpperCase().includes('PUSTAKA')) {
          return {
            ...section,
            blocks: sortBibliographyBlocks(section.blocks)
          };
        }
        return section;
      })
    }));

    notify('Daftar Pustaka berhasil diurutkan berdasarkan abjad A-Z!');
  };

  /**
   * "Rapikan otomatis" dari panel Diagnosa: terapkan preset tipe dokumen,
   * urutkan entri pustaka (tanpa memindahkan judul bagian), dan perbaiki
   * kata tidak baku. Isi & struktur teks tidak dihapus.
   */
  const handleSmartFix = (template: DetectedDocumentType) => {
    const nextConfig = applyTemplatePreset(config, template);
    const correctedText = applyKbbiCorrections(doc.rawText);
    let hasBibliography = false;

    const sections = doc.sections.map((section) => {
      const blocks = section.blocks.map((block) => {
        const result = applyKbbiCorrections(block.formattedContent);
        return {
          ...block,
          formattedContent: result.correctedText,
          rawContent: result.correctedText
        };
      });

      const isBibliography =
        section.type === 'daftar_pustaka' || section.title.toUpperCase().includes('PUSTAKA');
      if (!isBibliography) return { ...section, blocks };

      const entries = blocks.filter((block) => block.type === 'daftar_pustaka_item');
      const others = blocks.filter((block) => block.type !== 'daftar_pustaka_item');
      if (entries.length > 1) hasBibliography = true;

      return {
        ...section,
        blocks: [...others, ...sortBibliographyBlocks(entries)]
      };
    });

    setConfig(nextConfig);
    setDoc((previous) => ({
      ...previous,
      rawText: correctedText.correctedText,
      sections
    }));

    const parts = [`Format ${template} diterapkan`];
    if (hasBibliography) parts.push('entri pustaka diurutkan A–Z');
    if (correctedText.totalReplaced > 0) {
      parts.push(`${correctedText.totalReplaced} kata tidak baku diperbaiki`);
    }
    notify(`${parts.join(', ')}.`);
  };

  const handleConfirmClear = () => {
    const blankBlock: ParsedDocument['sections'][number]['blocks'][number] = {
      id: 'blk-1',
      type: 'cover' as BlockType,
      title: 'MAKALAH',
      rawContent: 'JUDUL MAKALAH BARU',
      formattedContent: 'JUDUL MAKALAH BARU'
    };

    const blankDoc: ParsedDocument = {
      title: 'JUDUL MAKALAH BARU',
      fileName: 'DOKUMEN_BARU.docx',
      rawText: '',
      sections: [
        {
          id: 'sec-cover',
          title: 'MAKALAH',
          type: 'cover',
          blockCount: 1,
          startPageEstimate: 1,
          blocks: [blankBlock]
        }
      ],
      totalBlocks: 1,
      totalWords: 3,
      estimatedPages: 1,
      issues: []
    };

    setDoc(blankDoc);
    setCurrentPage(1);
    setActiveSectionId('sec-cover');
    notify('Editor telah dikosongkan.');
    setIsPasteModalOpen(true);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 font-sans text-slate-800 app-shell">
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 text-white text-xs px-4 py-2.5 rounded-full shadow-lg border border-slate-700/50 flex items-center space-x-2 animate-in fade-in slide-in-from-top-2 no-print">
          <Sparkles className="w-4 h-4" aria-hidden />
          <span>{toastMessage}</span>
        </div>
      )}

      <AppSidebar
        activePage={activePage}
        onNavigate={navigate}
        hasDocument={Boolean(doc)}
        docTitle={doc.fileName}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      <div className="flex-1 flex flex-col overflow-hidden app-content">
        {activePage === 'beranda' && (
          <HomePage
            onProcessText={handleProcessFromHome}
            onOpenSample={() => {
              navigate('editor');
              notify('Membuka pratinjau contoh dokumen.');
            }}
            currentConfig={config}
          />
        )}

        {activePage === 'editor' && (
          <div className="flex-1 flex flex-col overflow-hidden editor-shell">
            <Header
              doc={doc}
              config={config}
              totalPages={pagination.totalPages || doc.estimatedPages || 1}
              viewMode={viewMode}
              setViewMode={setViewMode}
              onOpenPasteModal={() => setIsPasteModalOpen(true)}
              onOpenCompareModal={() => setIsCompareModalOpen(true)}
              onNotify={notify}
              onNavigateHome={() => navigate('beranda')}
              onClearEditor={() => setIsClearModalOpen(true)}
            />

            <div className="flex-1 flex overflow-hidden editor-main">
              <LeftSidebar
                doc={doc}
                activeSectionId={activeSectionId}
                onSelectSection={(id) => setActiveSectionId(id)}
                currentPage={currentPage}
                onSelectPage={(page) => setCurrentPage(page)}
                sectionPages={pagination.sectionPages}
                blockPages={pagination.blockPages}
                totalPages={pagination.totalPages || doc.estimatedPages || 1}
              />

              {viewMode === 'formatted' ? (
                <A4PaperPreview
                  doc={doc}
                  config={config}
                  zoom={zoom}
                  setZoom={setZoom}
                  currentPage={currentPage}
                  setCurrentPage={setCurrentPage}
                  activeSectionId={activeSectionId}
                  onSelectSection={(id) => setActiveSectionId(id)}
                  onUpdateBlockContent={handleUpdateBlockContent}
                  onUpdateTitle={handleUpdateTitle}
                  onUpdateSectionTitle={handleUpdateSectionTitle}
                  onPaginationChange={handlePaginationChange}
                />
              ) : (
                <div className="flex-1 p-6 md:p-10 overflow-y-auto bg-slate-50 flex flex-col items-center">
                  <div className="w-full max-w-4xl bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <span className="font-semibold text-xs uppercase tracking-wider text-slate-500">
                        Teks Asli Sebelum Diformat (Hasil Copas AI)
                      </span>
                      <span className="text-xs text-teal-600 font-mono">
                        {doc.rawText.length} karakter
                      </span>
                    </div>
                    <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {doc.rawText}
                    </pre>
                  </div>
                </div>
              )}

              <RightSidebar
                doc={doc}
                config={config}
                onChangeConfig={(newConfig) => setConfig(newConfig)}
                issues={doc.issues}
                onApplyFormatting={handleApplyFormatting}
                onRecheck={handleRecheck}
                onFixAllKbbi={handleFixAllKbbi}
                onSortBibliography={handleSortBibliography}
                onChangeCover={handleChangeCover}
                onSmartFix={handleSmartFix}
              />
            </div>
          </div>
        )}

        {activePage === 'pedoman' && (
          <PedomanPage onNavigate={navigate} />
        )}
      </div>

      <div className="no-print">
        <PasteModal
          isOpen={isPasteModalOpen}
          onClose={() => setIsPasteModalOpen(false)}
          onFormatText={handleFormatText}
        />

        <CompareModal
          isOpen={isCompareModalOpen}
          onClose={() => setIsCompareModalOpen(false)}
          doc={doc}
          config={config}
        />

        <ClearConfirmModal
          isOpen={isClearModalOpen}
          onClose={() => setIsClearModalOpen(false)}
          onConfirm={handleConfirmClear}
        />
      </div>
    </div>
  );
}

export default App;
