import React from 'react';
import { BookOpen, CheckCircle, Info, FileText, ArrowRight } from 'lucide-react';
import { NavPage } from './AppSidebar';

interface PedomanPageProps {
  onNavigate: (page: NavPage) => void;
}

export const PedomanPage: React.FC<PedomanPageProps> = ({ onNavigate }) => {
  return (
    <div className="flex-1 bg-slate-100 overflow-y-auto p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-4xl space-y-6 pb-12">
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
            Ringkasan aturan tata letak, margin, spasi, dan tipografi resmi yang umum diberlakukan di kampus-kampus Indonesia (UI, UGM, ITB, UNDIP, UNAIR, UNPAD, dll.).
          </p>
        </div>

        {/* Grid Pedoman */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Margin & Kertas */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-800 text-sm flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-teal-600"></span>
              <span>1. Ukuran Kertas & Margin (Batas Tepi)</span>
            </h3>
            <div className="space-y-2 text-xs text-slate-600">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <div className="font-semibold text-slate-800">Format Makalah Kuliah:</div>
                <div>• Kertas: <strong>A4 (210 x 297 mm)</strong>, 70/80 gsm</div>
                <div>• <strong>Margin 4 - 3 - 3 - 3 cm</strong>:</div>
                <div className="pl-3 text-[11px] text-slate-500">
                  - Kiri: 4 cm (ruang penjilidan lakban/spiral)<br />
                  - Atas: 3 cm<br />
                  - Kanan: 3 cm<br />
                  - Bawah: 3 cm
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <div className="font-semibold text-slate-800">Format Skripsi / Tugas Akhir:</div>
                <div>• Beberapa kampus menerapkan <strong>Margin 4 - 4 - 3 - 3 cm</strong> (Kiri 4cm, Atas 4cm, Kanan 3cm, Bawah 3cm) atau 4-3-3-3 cm.</div>
              </div>
            </div>
          </div>

          {/* Card 2: Font & Spasi */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-800 text-sm flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-teal-600"></span>
              <span>2. Jenis Huruf (Font) & Spasi Baris</span>
            </h3>
            <div className="space-y-2 text-xs text-slate-600">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <div className="font-semibold text-slate-800">Standar Font:</div>
                <div>• <strong>Times New Roman 12 pt</strong> (Paling umum di Indonesia)</div>
                <div>• Alternatif: Arial 11 pt / Calibri 11 pt (sesuai panduan fakultas)</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <div className="font-semibold text-slate-800">Aturan Spasi (Line Spacing):</div>
                <div>• <strong>Spasi 1.5</strong>: Makalah, karya ilmiah umum, dan proposal</div>
                <div>• <strong>Spasi 2.0 (Ganda)</strong>: Draf skripsi, tesis, dan disertasi</div>
                <div>• <strong>Spasi 1.0 (Tunggal)</strong>: Abstrak, kutipan panjang (&gt;4 baris), tabel, dan daftar pustaka</div>
                <div>• <strong>Spacing Before & After</strong>: Wajib 0 pt (tidak boleh renggang antar paragraf)</div>
              </div>
            </div>
          </div>

          {/* Card 3: Paragraf & Perataan */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-800 text-sm flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-teal-600"></span>
              <span>3. Paragraf & Indentasi</span>
            </h3>
            <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <div>• <strong>Perataan Teks</strong>: Rata Kanan-Kiri (<strong>Justify</strong>).</div>
                <div>• <strong>Indentasi Baris Pertama</strong>: Baris pertama setiap paragraf menjorok ke dalam sejauh <strong>0,75 cm</strong> (atau 1 cm / 1,27 cm).</div>
                <div>• Tidak perlu memberikan jarak spasi kosong (Enter ganda) antar paragraf jika baris pertama sudah diberi indentasi.</div>
              </div>
            </div>
          </div>

          {/* Card 4: Penomoran Halaman */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-800 text-sm flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-teal-600"></span>
              <span>4. Aturan Penomoran Halaman</span>
            </h3>
            <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <div>• <strong>Bagian Awal Dokumen</strong>:</div>
                <div className="pl-3 text-[11px] text-slate-500">
                  Halaman Judul, Kata Pengantar, Daftar Isi, Daftar Tabel menggunakan <strong>angka Romawi kecil (i, ii, iii, iv, dst.)</strong> di posisi tengah bawah.
                </div>
                <div>• <strong>Bagian Isi Dokumen</strong>:</div>
                <div className="pl-3 text-[11px] text-slate-500">
                  Mulai dari BAB I Pendahuluan hingga Daftar Pustaka menggunakan <strong>angka Arab (1, 2, 3, dst.)</strong> di sudut kanan atas (atau tengah bawah pada halaman judul Bab baru).
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA to open Editor */}
        <div className="p-5 bg-gradient-to-r from-teal-600 to-teal-600 rounded-2xl text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg shadow-teal-500/20">
          <div>
            <div className="font-bold text-sm md:text-base">Siap merapikan dokumen Anda?</div>
            <div className="text-xs text-teal-100 mt-0.5">
              Terapkan semua aturan di atas secara instan ke teks atau file Word Anda.
            </div>
          </div>
          <button
            onClick={() => onNavigate('beranda')}
            className="px-5 py-2.5 bg-white text-teal-700 font-semibold text-xs rounded-xl hover:bg-teal-50 transition-colors shadow-sm shrink-0 flex items-center space-x-1.5"
          >
            <span>Mulai Unggah / Tempel Dokumen</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
