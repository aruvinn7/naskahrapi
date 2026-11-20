import React, { useEffect, useRef, useState } from 'react';
import { 
  FileText, 
  Download, 
  Columns, 
  ClipboardCopy, 
  FileDown, 
  Sparkles,
  ChevronDown,
  Printer,
  ChevronLeft,
  Check,
  Trash2
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ParsedDocument, DocumentConfig } from '../types/document';
import { exportToDocx } from '../utils/docxExporter';
import { stripInlineMarkdown } from '../utils/inlineFormat';

interface HeaderProps {
  doc: ParsedDocument;
  config: DocumentConfig;
  totalPages: number;
  viewMode: 'formatted' | 'raw';
  setViewMode: (mode: 'formatted' | 'raw') => void;
  onOpenPasteModal: () => void;
  onOpenCompareModal: () => void;
  onNotify: (msg: string) => void;
  onNavigateHome?: () => void;
  onClearEditor?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  doc,
  config,
  totalPages,
  viewMode,
  setViewMode,
  onOpenPasteModal,
  onOpenCompareModal,
  onNotify,
  onNavigateHome,
  onClearEditor
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const downloadMenuRef = useRef<HTMLDivElement>(null);

  // Tutup menu ekspor saat klik di luar atau tekan Escape.
  useEffect(() => {
    if (!showDownloadMenu) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!downloadMenuRef.current?.contains(event.target as Node)) {
        setShowDownloadMenu(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowDownloadMenu(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showDownloadMenu]);

  const handleDownloadDocx = async () => {
    try {
      setIsExporting(true);
      await exportToDocx(doc, config);
      onNotify('File Word (.docx) berhasil dibuat dan diunduh!');
    } catch (err) {
      console.error(err);
      onNotify('Gagal mengekspor dokumen Word.');
    } finally {
      setIsExporting(false);
      setShowDownloadMenu(false);
    }
  };

  const handleCopyCleanText = () => {
    let allText = '';
    doc.sections.forEach(sec => {
      allText += `\n\n=== ${sec.title} ===\n\n`;
      sec.blocks.forEach(b => {
        allText += `${stripInlineMarkdown(b.formattedContent)}\n\n`;
      });
    });
    navigator.clipboard.writeText(allText.trim());
    onNotify('Teks bersih tersalin ke clipboard!');
    setShowDownloadMenu(false);
  };

  const handlePrint = () => {
    window.print();
    setShowDownloadMenu(false);
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/90 px-4 md:px-6 flex items-center justify-between z-30 shrink-0 shadow-2xs no-print">
      {/* Left: Document info matching screenshot */}
      <div className="flex items-center space-x-3">
        {onNavigateHome && (
          <Button
            variant="outline"
            size="sm"
            onClick={onNavigateHome}
            className="flex items-center space-x-1 mr-1"
            title="Kembali ke Beranda"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Beranda</span>
          </Button>
        )}

        <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200/70 flex items-center justify-center text-teal-600 shadow-2xs">
          <FileText className="w-5 h-5" />
        </div>

        <div>
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-800 text-sm md:text-base tracking-tight truncate max-w-[200px] md:max-w-xs">
              {doc.fileName || 'MAKALAH.docx'}
            </span>
            <Badge variant="success" className="px-2 py-0.5 text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
              Siap diunduh
            </Badge>
          </div>
          <div className="text-[11px] text-slate-500 flex items-center space-x-1.5 mt-0.5 font-mono">
            <span>{Math.max(1, Math.round(doc.rawText.length / 1024))} KB</span>
            <span>·</span>
            <span className="capitalize">{config.template}</span>
            <span>·</span>
            <span>± {totalPages} halaman A4</span>
            <span>·</span>
            <span>{new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            <span>·</span>
            <span className="text-emerald-600">Autosave</span>
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center space-x-2 md:space-x-2.5">
        {/* Kosongkan Editor Button */}
        {onClearEditor && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearEditor}
            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
            title="Kosongkan seluruh teks editor untuk memulai dokumen baru"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1 text-red-500" />
            <span className="hidden sm:inline">Kosongkan</span>
          </Button>
        )}

        {/* Tempel Teks AI Button */}
        <Button
          variant="subtle"
          size="sm"
          onClick={onOpenPasteModal}
          className="hidden sm:inline-flex items-center space-x-1.5"
          title="Tempel teks baru dari AI atau upload file"
        >
          <Sparkles className="w-3.5 h-3.5 text-teal-600" />
          <span>Tempel Teks AI</span>
        </Button>

        {/* Bandingkan Button (Split Diff) */}
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenCompareModal}
          className="inline-flex items-center space-x-1.5"
          title="Bandingkan Teks Asli AI vs Hasil Rapi"
        >
          <Columns className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden md:inline">Bandingkan</span>
        </Button>

        {/* View mode toggle: Asli | Hasil */}
        <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200/80 text-xs font-medium">
          <button
            onClick={() => setViewMode('raw')}
            className={`px-2.5 py-1 rounded-md text-xs transition-all ${
              viewMode === 'raw' 
                ? 'bg-white text-slate-900 shadow-xs font-semibold' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Asli
          </button>
          <button
            onClick={() => setViewMode('formatted')}
            className={`px-2.5 py-1 rounded-md text-xs transition-all ${
              viewMode === 'formatted' 
                ? 'bg-white text-teal-700 shadow-xs font-semibold' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Hasil
          </button>
        </div>

        {/* Unduh: klik utama langsung ekspor Word, panah membuka opsi lain */}
        <div className="relative flex" ref={downloadMenuRef}>
          <Button
            variant="default"
            size="sm"
            onClick={handleDownloadDocx}
            disabled={isExporting}
            className="space-x-1.5 rounded-r-none shadow-sm font-medium"
            title="Unduh dokumen Word (.docx)"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Memproses...' : 'Unduh Word'}</span>
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => setShowDownloadMenu((open) => !open)}
            disabled={isExporting}
            aria-haspopup="menu"
            aria-expanded={showDownloadMenu}
            aria-label="Opsi ekspor lainnya"
            title="Opsi ekspor lainnya"
            className="rounded-l-none border-l border-teal-500/50 px-1.5 shadow-sm"
          >
            <ChevronDown className="w-3 h-3 opacity-90" />
          </Button>

          {showDownloadMenu && (
            <div
              role="menu"
              aria-label="Opsi ekspor"
              className="absolute right-0 top-full mt-2 w-60 bg-white rounded-xl shadow-xl border border-slate-200/90 py-1.5 z-50 animate-in fade-in slide-in-from-top-2"
            >
              <div className="px-3.5 py-1.5 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Pilihan Ekspor Dokumen
              </div>
              <button
                role="menuitem"
                onClick={handleDownloadDocx}
                className="w-full text-left px-3.5 py-2.5 text-xs text-slate-700 hover:bg-teal-50 hover:text-teal-700 focus-visible:bg-teal-50 focus-visible:outline-none flex items-center space-x-3 transition-colors"
              >
                <FileDown className="w-4 h-4 text-teal-600 shrink-0" />
                <div>
                  <div className="font-semibold text-slate-800">Unduh Word (.docx)</div>
                  <div className="text-[10px] text-slate-400">Format resmi A4, margin & heading siap cetak</div>
                </div>
              </button>
              <button
                role="menuitem"
                onClick={handlePrint}
                className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-teal-50 hover:text-teal-700 flex items-center space-x-3 transition-colors"
              >
                <Printer className="w-4 h-4 text-slate-500 shrink-0" />
                <div>
                  <div className="font-medium text-slate-800">Cetak / Simpan ke PDF</div>
                  <div className="text-[10px] text-slate-400">Gunakan dialog cetak browser</div>
                </div>
              </button>
              <button
                role="menuitem"
                onClick={handleCopyCleanText}
                className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-teal-50 hover:text-teal-700 flex items-center space-x-3 transition-colors"
              >
                <ClipboardCopy className="w-4 h-4 text-slate-500 shrink-0" />
                <div>
                  <div className="font-medium text-slate-800">Salin Teks Bersih</div>
                  <div className="text-[10px] text-slate-400">Tanpa tanda markdown AI</div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
