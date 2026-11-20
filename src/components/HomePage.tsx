import React, { useState } from 'react';
import { 
  UploadCloud, 
  Sparkles, 
  FileText, 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  BookOpen, 
  Layers, 
  FileCheck2,
  Copy,
  Zap,
  Check,
  AlertCircle
} from 'lucide-react';
import { DocumentTemplate, DocumentConfig } from '../types/document';
import { SAMPLE_AI_RAW_TEXT } from '../data/sampleDocument';
import { TEMPLATE_DESCRIPTIONS } from '../utils/templatePresets';
import mammoth from 'mammoth';

interface HomePageProps {
  onProcessText: (text: string, fileName: string, template: DocumentTemplate) => void;
  onOpenSample: () => void;
  currentConfig: DocumentConfig;
}

export const HomePage: React.FC<HomePageProps> = ({
  onProcessText,
  onOpenSample,
  currentConfig
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  
  // Upload State
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Paste State
  const [pastedText, setPastedText] = useState('');
  const [documentTitle, setDocumentTitle] = useState('MAKALAH.docx');

  // Selected Template
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate>('makalah');

  // Handle Drag & Drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = async (file: File) => {
    setSelectedFile(file);
    setIsReadingFile(true);
    setUploadError(null);

    try {
      if (file.name.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        setFileContent(result.value);
        setDocumentTitle(file.name);
      } else if (file.name.endsWith('.txt')) {
        const text = await file.text();
        setFileContent(text);
        setDocumentTitle(file.name.replace(/\.txt$/, '.docx'));
      } else {
        setUploadError('Format tidak didukung. Mohon unggah file .docx atau .txt');
        setSelectedFile(null);
      }
    } catch (err) {
      console.error(err);
      setUploadError('Gagal membaca file. Pastikan dokumen tidak rusak.');
      setSelectedFile(null);
    } finally {
      setIsReadingFile(false);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setPastedText(text);
      } else {
        alert('Clipboard kosong atau belum ada teks yang disalin.');
      }
    } catch (err) {
      alert('Izin clipboard browser belum diberikan. Silakan gunakan Ctrl+V langsung di kotak teks.');
    }
  };

  const handleLoadSample = () => {
    setPastedText(SAMPLE_AI_RAW_TEXT);
    setDocumentTitle('MAKALAH_DAMPAK_AI.docx');
    setSelectedTemplate('makalah');
    setActiveTab('paste');
  };

  const handleSubmit = () => {
    if (activeTab === 'upload') {
      if (!fileContent.trim()) {
        alert('Silakan pilih file Word (.docx) terlebih dahulu.');
        return;
      }
      onProcessText(fileContent, selectedFile?.name || 'DOKUMEN_RAPI.docx', selectedTemplate);
    } else {
      if (!pastedText.trim()) {
        alert('Silakan tempel (Ctrl+V) teks makalah atau skripsi terlebih dahulu.');
        return;
      }
      onProcessText(pastedText, documentTitle || 'MAKALAH.docx', selectedTemplate);
    }
  };

  return (
    <div className="flex-1 bg-slate-100 overflow-y-auto px-4 py-4 md:py-6 flex flex-col items-center">
      <div className="w-full max-w-4xl space-y-4 pb-6">
        {/* Hero Section */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-[11px] font-semibold shadow-xs">
            <Sparkles className="w-3 h-3" />
            <span>Pemformat Makalah & Skripsi Otomatis</span>
          </div>

          <h1 className="text-xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Rapikan Draf AI Jadi Dokumen Resmi{' '}
            <span className="text-teal-600">Standar Akademik Indonesia</span>
          </h1>

          <p className="text-xs md:text-sm text-slate-600 max-w-2xl mx-auto leading-snug">
            Unggah file Word atau tempel teks dari AI untuk diformat otomatis sesuai margin 4-3-3-3 cm, Times New Roman 12 pt, dan spasi 1.5.
          </p>
        </div>

        {/* Main Input Card (Upload / Paste) */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200/80 overflow-hidden">
          {/* Card Tabs: Upload File Word vs Tempel Teks AI */}
          <div className="flex border-b border-slate-200 bg-slate-50/70 p-1">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${
                activeTab === 'upload'
                  ? 'bg-white text-teal-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Unggah File Word (.docx)</span>
            </button>

            <button
              onClick={() => setActiveTab('paste')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${
                activeTab === 'paste'
                  ? 'bg-white text-teal-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Tempel Teks dari AI (Copas)</span>
            </button>
          </div>

          <div className="p-4 md:p-5 space-y-4">
            {/* TAB 1: UPLOAD FILE WORD */}
            {activeTab === 'upload' && (
              <div className="space-y-3">
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl px-4 py-5 md:py-6 text-center transition-all flex flex-col items-center justify-center cursor-pointer ${
                    dragActive
                      ? 'border-teal-500 bg-teal-50/50 scale-[0.99]'
                      : selectedFile
                        ? 'border-emerald-400 bg-emerald-50/20'
                        : 'border-slate-300 hover:border-teal-400 bg-slate-50/50 hover:bg-slate-50'
                  }`}
                  onClick={() => document.getElementById('home-file-input')?.click()}
                >
                  <input
                    id="home-file-input"
                    type="file"
                    accept=".docx,.txt"
                    onChange={handleFileInput}
                    className="hidden"
                  />

                  {selectedFile ? (
                    <div className="flex items-center space-x-3 text-left">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                        <FileCheck2 className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 text-xs md:text-sm truncate">
                          {selectedFile.name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {(selectedFile.size / 1024).toFixed(1)} KB · Siap dirapikan ·{' '}
                          <span className="text-teal-600 font-medium">ganti file</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-3 text-left">
                      <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800 text-xs md:text-sm">
                          Tarik & Lepas File Word di Sini
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          atau{' '}
                          <span className="text-teal-600 font-medium underline">
                            Pilih File dari Komputer
                          </span>
                          <span className="text-slate-400">
                            {' '}
                            · .docx atau .txt
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {uploadError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: TEMPEL TEKS AI */}
            {activeTab === 'paste' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">
                    Kotak Salin-Tempel (Ctrl+V):
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handlePasteFromClipboard}
                      className="text-teal-600 hover:text-teal-700 font-medium inline-flex items-center space-x-1 hover:underline"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Tempel Clipboard</span>
                    </button>
                    <span>·</span>
                    <button
                      type="button"
                      onClick={handleLoadSample}
                      className="text-teal-600 hover:text-teal-700 font-medium inline-flex items-center space-x-1 hover:underline"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Coba Contoh AI</span>
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <textarea
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Tempel teks makalah atau skripsi dari ChatGPT, Gemini, Claude, atau DeepSeek di sini...&#10;&#10;Contoh:&#10;Tentu, ini draf makalah:&#10;# BAB I PENDAHULUAN&#10;1.1 **Latar Belakang**..."
                    rows={8}
                    className="w-full text-xs font-mono p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 placeholder-slate-400 resize-none leading-relaxed"
                  />
                  {pastedText && (
                    <div className="absolute right-3 bottom-3 text-[10px] text-slate-400 bg-white/90 px-2 py-1 rounded border border-slate-200 font-mono">
                      {pastedText.length} karakter · ± {Math.ceil(pastedText.split(/\s+/).length / 250)} halaman
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Template Pedoman Selector */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="space-y-0.5">
                <label className="text-[11px] font-semibold text-slate-700 block">
                  Pilih Format Pedoman:
                </label>
                <div className="text-[10px] text-slate-500 leading-snug">
                  {TEMPLATE_DESCRIPTIONS[selectedTemplate]}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedTemplate('makalah')}
                  className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium border transition-all ${
                    selectedTemplate === 'makalah'
                      ? 'bg-teal-50 border-teal-600 text-teal-700 font-semibold'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Makalah Kuliah
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTemplate('skripsi')}
                  className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium border transition-all ${
                    selectedTemplate === 'skripsi'
                      ? 'bg-teal-50 border-teal-600 text-teal-700 font-semibold'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Skripsi / Tugas Akhir
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTemplate('jurnal')}
                  className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium border transition-all ${
                    selectedTemplate === 'jurnal'
                      ? 'bg-teal-50 border-teal-600 text-teal-700 font-semibold'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Jurnal Ilmiah
                </button>
              </div>
            </div>

            {/* Action Button: Rapikan & Buka Editor */}
            <div className="pt-1">
              <button
                onClick={handleSubmit}
                disabled={isReadingFile}
                className="w-full py-2.5 px-5 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-semibold text-xs md:text-sm rounded-lg shadow-md shadow-orange-600/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 group"
              >
                <Sparkles className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
                <span>
                  {isReadingFile ? 'Sedang Membaca Dokumen...' : 'Otomatis Rapikan & Buka di Editor'}
                </span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs space-y-1.5">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-slate-800 text-xs">
              Hapus Jejak AI Otomatis
            </h3>
            <p className="text-[11px] text-slate-500 leading-snug">
              Menghilangkan basa-basi chatbot ("Tentu, ini draf...", "Semoga membantu!"), simbol bintang (**), pagar (#), dan bullet liar.
            </p>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs space-y-1.5">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-slate-800 text-xs">
              Standar Kampus Indonesia
            </h3>
            <p className="text-[11px] text-slate-500 leading-snug">
              A4, margin 4-3-3-3 cm (atau 4-4-3-3), Times New Roman 12 pt, spasi 1.5/2.0, rata kanan-kiri, indentasi 1 cm.
            </p>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs space-y-1.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileCheck2 className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-slate-800 text-xs">
              Unduh Word (.docx) Asli
            </h3>
            <p className="text-[11px] text-slate-500 leading-snug">
              Word asli dengan Daftar Isi bertitik-titik dan Daftar Pustaka hanging indent, siap diserahkan ke dosen.
            </p>
          </div>
        </div>

        {/* Security & Privacy Banner */}
        <div className="bg-teal-50/70 border border-teal-200/70 rounded-lg px-3 py-2 flex items-center space-x-2 text-[11px] text-teal-900">
          <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
          <span>
            <strong>100% Aman & Privat:</strong> dokumen diproses di browser Anda — teks tidak diunggah atau disimpan di server luar.
          </span>
        </div>
      </div>
    </div>
  );
};
