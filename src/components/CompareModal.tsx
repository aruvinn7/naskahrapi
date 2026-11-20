import React from 'react';
import { X, Columns, CheckCircle2, ArrowRight } from 'lucide-react';
import { ParsedDocument, DocumentConfig } from '../types/document';
import { stripInlineMarkdown } from '../utils/inlineFormat';

interface CompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  doc: ParsedDocument;
  config: DocumentConfig;
}

export const CompareModal: React.FC<CompareModalProps> = ({
  isOpen,
  onClose,
  doc,
  config
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center">
              <Columns className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">
                Bandingkan: Draf Asli AI vs Format Standar Rapi
              </h3>
              <p className="text-xs text-slate-500">
                Melihat perbandingan sebelum dan sesudah pembersihan serta penyesuaian tata letak
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comparison Body: 2 Columns */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 overflow-hidden">
          {/* Column 1: Asli (Sebelum) */}
          <div className="flex flex-col h-full bg-slate-50/70 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-200 bg-red-50/50 flex items-center justify-between">
              <span className="text-xs font-semibold text-red-700 flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                <span>Teks Asli (Copas AI)</span>
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Basa-basi AI & Markdown tersisa
              </span>
            </div>

            <div className="flex-1 p-4 overflow-y-auto text-xs font-mono text-slate-700 whitespace-pre-wrap leading-relaxed select-text space-y-2">
              <div className="bg-red-100/60 p-2 rounded border border-red-200 text-red-800 text-[11px] mb-3">
                ⚠️ Masih ada kalimat pembuka AI, tanda **tebal**, tag # heading, dan spasi yang tidak teratur.
              </div>
              {doc.rawText}
            </div>
          </div>

          {/* Column 2: Hasil Rapi (Sesudah) */}
          <div className="flex flex-col h-full bg-white overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-200 bg-emerald-50/50 flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-700 flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Hasil Standar Akademik Indonesia</span>
              </span>
              <span className="text-[11px] text-emerald-600 font-medium flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Siap Cetak / Dosen</span>
              </span>
            </div>

            <div className="flex-1 p-6 overflow-y-auto font-serif text-[11pt] text-slate-800 leading-relaxed select-text space-y-4">
              <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 text-emerald-800 text-xs font-sans mb-3 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Basa-basi AI dibersihkan, margin/spasi/font mengikuti template aktif, perataan
                  dan penomoran sub-bab distandarkan otomatis.
                </span>
              </div>

              {doc.sections.map((sec) => (
                <div key={sec.id} className="space-y-3 pb-3 border-b border-slate-100 last:border-0">
                  <div className="font-bold text-center uppercase tracking-wide pt-2 text-[12pt]">
                    {sec.title}
                  </div>
                  {sec.blocks.map((blk) => (
                    <div 
                      key={blk.id} 
                      className={`text-justify leading-relaxed ${
                        blk.type === 'heading_2' 
                          ? 'font-bold pt-2' 
                          : blk.type === 'daftar_pustaka_item' 
                            ? 'pl-6 text-[10pt]' 
                            : 'indent-6'
                      }`}
                    >
                      {stripInlineMarkdown(blk.formattedContent)}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Memformat otomatis sesuai Pedoman Penulisan Karya Ilmiah Kemendikbud / Kampus Indonesia</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors"
          >
            Tutup Perbandingan
          </button>
        </div>
      </div>
    </div>
  );
};
