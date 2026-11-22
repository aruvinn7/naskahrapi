import React from 'react';
import { BookOpen, ArrowRight, CheckCircle } from 'lucide-react';
import { NavPage } from './AppSidebar';
import { DocumentTemplate } from '../types/document';

interface PedomanPageProps {
  onNavigate: (page: NavPage) => void;
  onUsePreset: (template: DocumentTemplate) => void;
}

/** Baris spesifikasi "Label → Nilai" untuk kartu pedoman. */
const SpecRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex items-baseline justify-between gap-3 text-xs">
    <span className="text-slate-500 shrink-0">{label}</span>
    <span className="font-semibold text-slate-800 text-right">{value}</span>
  </div>
);

/** Catatan singkat di bawah baris spesifikasi. */
const SpecNote: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[10px] text-slate-400 leading-snug">{children}</p>
);

/** Chip preset yang benar-benar memilih template di Beranda. */
const PresetChip: React.FC<{
  template: DocumentTemplate;
  onUsePreset: (template: DocumentTemplate) => void;
}> = ({ template, onUsePreset }) => (
  <button
    type="button"
    onClick={() => onUsePreset(template)}
    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-[10px] font-semibold hover:bg-teal-600 hover:text-white hover:border-teal-600 transition-colors capitalize"
    title={`Terapkan preset ${template} di Beranda`}
  >
    <CheckCircle className="w-3 h-3" />
    <span>Gunakan preset {template}</span>
  </button>
);

export const PedomanPage: React.FC<PedomanPageProps> = ({ onNavigate, onUsePreset }) => {
  return (
    <div className="flex-1 bg-slate-100 overflow-y-auto p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-4xl space-y-5 pb-12">
        {/* Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-semibold">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Panduan Standar Penulisan Ilmiah Indonesia</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Pedoman Format Makalah & Skripsi Perguruan Tinggi
          </h1>
          <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
            Aturan format yang umum dipakai kampus — semuanya sudah otomatis di
            preset aplikasi ini.
          </p>
        </div>

        {/* Grid Pedoman */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Kertas & Margin */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-800 text-sm flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-teal-600"></span>
              <span>1. Kertas & Margin</span>
            </h3>
            <div className="space-y-1.5">
              <SpecRow label="Kertas" value="A4 (210 × 297 mm)" />
              <SpecRow label="Margin makalah" value="4-3-3-3 cm" />
              <SpecRow label="Margin skripsi" value="4-4-3-3 cm*" />
            </div>
            <SpecNote>
              * Beberapa kampus memakai 4-4-3-3 (kiri untuk penjilidan, atas lebih
              longgar) — lainnya tetap 4-3-3-3.
            </SpecNote>
          </div>

          {/* Card 2: Font & Spasi */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-800 text-sm flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-teal-600"></span>
              <span>2. Font & Spasi</span>
            </h3>
            <div className="space-y-1.5">
              <SpecRow label="Font" value="Times New Roman 12 pt" />
              <SpecRow label="Alternatif" value="Arial / Calibri 11 pt" />
              <SpecRow label="Spasi makalah" value="1,5" />
              <SpecRow label="Spasi skripsi" value="2,0" />
              <SpecRow label="Abstrak & pustaka" value="1,0" />
            </div>
            <SpecNote>
              Jarak antarparagraf (spacing before/after) wajib 0 pt — cukup
              indentasi baris pertama.
            </SpecNote>
          </div>

          {/* Card 3: Paragraf & Indentasi */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-800 text-sm flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-teal-600"></span>
              <span>3. Paragraf & Indentasi</span>
            </h3>
            <div className="space-y-1.5">
              <SpecRow label="Perataan" value="Rata kanan-kiri (justify)" />
              <SpecRow label="Indentasi" value="0,75 cm" />
              <SpecRow label="Enter ganda" value="Tidak perlu" />
            </div>
            <SpecNote>
              Alternatif indentasi 1 cm / 1,27 cm — cukup pilih salah satu, jangan
              digabung Enter ganda.
            </SpecNote>
          </div>

          {/* Card 4: Nomor Halaman */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-800 text-sm flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-teal-600"></span>
              <span>4. Nomor Halaman</span>
            </h3>
            <div className="space-y-1.5">
              <SpecRow label="Bagian awal" value="Romawi kecil (i, ii, iii)" />
              <SpecRow label="Posisi awal" value="Tengah bawah" />
              <SpecRow label="Bagian isi" value="Angka Arab (1, 2, 3)" />
              <SpecRow label="Posisi isi" value="Kanan atas" />
            </div>
            <SpecNote>
              Halaman judul bab baru boleh tanpa nomor tercetak, tapi tetap
              dihitung.
            </SpecNote>
          </div>
        </div>

        {/* CTA ke Editor: satu tempat untuk memilih preset */}
        <div className="p-5 bg-gradient-to-r from-teal-600 to-teal-600 rounded-2xl text-white flex flex-col lg:flex-row items-center justify-between gap-4 shadow-lg shadow-teal-500/20">
          <div>
            <div className="font-bold text-sm md:text-base">Semua aturan ini diterapkan otomatis</div>
            <div className="text-xs text-teal-100 mt-0.5">
              Pilih preset di bawah, tempel draf AI, dan unduh dokumen siap kumpul.
            </div>
          </div>
          <div className="flex flex-col items-center lg:items-end gap-2 shrink-0">
            <div className="flex flex-wrap justify-center gap-1.5">
              {(['makalah', 'skripsi', 'jurnal'] as DocumentTemplate[]).map((template) => (
                <button
                  key={template}
                  type="button"
                  onClick={() => onUsePreset(template)}
                  className="px-3 py-1.5 rounded-full bg-white/10 border border-white/40 text-white text-[11px] font-semibold hover:bg-white hover:text-teal-700 transition-colors capitalize"
                  title={`Terapkan preset ${template} di Beranda`}
                >
                  ✓ Preset {template}
                </button>
              ))}
            </div>
            <button
              onClick={() => onNavigate('beranda')}
              className="px-4 py-2 bg-white text-teal-700 font-semibold text-xs rounded-xl hover:bg-teal-50 transition-colors shadow-sm w-full lg:w-auto flex items-center justify-center space-x-1.5"
            >
              <span>Mulai Sekarang</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
