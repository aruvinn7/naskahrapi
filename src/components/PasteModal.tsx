import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Upload,
  FileText,
  Check,
  AlertCircle,
  ClipboardList,
  Copy,
  ChevronDown
} from 'lucide-react';
import { SAMPLE_AI_RAW_TEXT } from '../data/sampleDocument';
import { buildAiPromptTemplate } from '../utils/promptTemplate';
import mammoth from 'mammoth';

interface PasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFormatText: (text: string, fileName?: string) => void;
}

export const PasteModal: React.FC<PasteModalProps> = ({
  isOpen,
  onClose,
  onFormatText
}) => {
  const [inputText, setInputText] = useState('');
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [uploadedName, setUploadedName] = useState<string | null>(null);
  const [showTemplate, setShowTemplate] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopyTemplate = async () => {
    try {
      await navigator.clipboard.writeText(buildAiPromptTemplate());
      setCopyError(null);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Gagal menyalin template prompt', err);
      setCopied(false);
      setCopyError('Gagal menyalin ke clipboard. Coba lagi atau salin manual.');
    }
  };

  const handleUseSample = () => {
    setInputText(SAMPLE_AI_RAW_TEXT);
    setUploadedName('MAKALAH_SAMPLE_AI.docx');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedName(file.name);
    setIsReadingFile(true);

    try {
      if (file.name.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        setInputText(result.value);
      } else {
        const text = await file.text();
        setInputText(text);
      }
    } catch (err) {
      console.error('Gagal membaca file', err);
      alert('Gagal membaca file. Pastikan format file adalah .docx atau .txt');
    } finally {
      setIsReadingFile(false);
    }
  };

  const handleSubmit = () => {
    if (!inputText.trim()) {
      alert('Silakan tempel teks atau unggah file terlebih dahulu.');
      return;
    }
    onFormatText(inputText, uploadedName || 'MAKALAH.docx');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">
                Tempel Hasil AI atau Unggah Dokumen
              </h3>
              <p className="text-xs text-slate-500">
                Salin langsung dari ChatGPT, Gemini, Claude, atau DeepSeek
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

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Panel Template Prompt AI (lipat, default tertutup) */}
          <div>
            <button
              type="button"
              onClick={() => setShowTemplate((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <span className="inline-flex items-center space-x-1.5 text-xs font-medium text-slate-700">
                <ClipboardList className="w-3.5 h-3.5 text-teal-600" />
                <span>Template Prompt AI</span>
              </span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showTemplate ? 'rotate-180' : ''}`} />
            </button>

            {showTemplate && (
              <div className="mt-2 border border-teal-200 bg-teal-50/50 rounded-lg p-3 space-y-2">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Salin template ini dan tempel ke AI (ChatGPT, Gemini, Claude, DeepSeek)
                  agar keluarannya rapi serta langsung kompatibel dengan parser TulisRapi.
                </p>
                <button
                  type="button"
                  onClick={handleCopyTemplate}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-sm transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? 'Tersalin!' : 'Salin Template'}</span>
                </button>
                {copyError && (
                  <p className="text-xs text-red-600">{copyError}</p>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-700">Teks Dokumen:</span>
            <button
              onClick={handleUseSample}
              className="text-teal-600 hover:text-teal-700 font-medium inline-flex items-center space-x-1 hover:underline"
            >
              <Sparkles className="w-3 h-3" />
              <span>Gunakan Contoh Draf AI (Uji Coba)</span>
            </button>
          </div>

          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Tempel (Ctrl+V) draf makalah atau skripsi dari AI di sini... Termasuk jika masih ada tanda **, ###, atau kata pembuka AI."
            rows={12}
            className="w-full text-xs font-mono p-3.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 placeholder-slate-400 resize-none leading-relaxed"
          />

          {/* Or Upload file */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <label className="cursor-pointer inline-flex items-center space-x-2 px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700 transition-colors">
              <Upload className="w-4 h-4 text-slate-500" />
              <span>{isReadingFile ? 'Membaca file...' : 'Unggah File (.docx / .txt)'}</span>
              <input
                type="file"
                accept=".docx,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {uploadedName && (
              <span className="text-xs text-emerald-600 font-medium flex items-center space-x-1">
                <Check className="w-3.5 h-3.5" />
                <span className="truncate max-w-[200px]">{uploadedName}</span>
              </span>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end space-x-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-lg transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            className="px-5 py-2 text-xs font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-sm flex items-center space-x-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Format & Rapikan Sekarang</span>
          </button>
        </div>
      </div>
    </div>
  );
};
