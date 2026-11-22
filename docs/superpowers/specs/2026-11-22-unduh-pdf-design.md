# Design: Unduh PDF

Tanggal: 2026-11-22
Status: disetujui (percakapan, "dua duanya")

## Intent & Why

Banyak kampus meminta versi PDF untuk pengumpulan final. Aplikasi saat ini
hanya bisa mengunduh .docx. Cara unduh PDF yang murah dan berkualitas tinggi:
dialog cetak browser → "Save as PDF" — hasilnya teks vektor asli (tajam,
bisa dicopas), tanpa dependensi baru.

Feedback user (persyaratan eksplisit):

1. Labelnya **"Unduh PDF"**, bukan "ekspor".
2. **Zoom pratinjau tidak boleh memengaruhi output**: user pernah mencetak
   saat pratinjau di-zoom 80% dan PDF-nya kecil. PDF harus selalu 100%
   (A4 utuh, teks ukuran normal) apa pun zoom di layar.

## Goals

- Entri menu unduh baru "Unduh PDF" di header, di samping Word (.docx).
- Saat dicetak: hanya halaman A4 pratinjau yang tercetak (sidebar UI
  tersembunyi — class `no-print` sudah ada), zoom di-reset ke 100%.
- Verifikasi: set zoom kecil (mis. 50–80%) → unduh PDF → hasil tetap
  ukuran penuh.

## Non-goals

- Tidak memakai jsPDF/html2canvas (hasil raster buruk, file besar).
- Tidak membuat generator PDF dari struktur dokumen (kompleksitas besar,
  duplikasi layout engine).
- Tidak menyembunyikan dialog cetak browser (tidak bisa dari web).

## Pendekatan

`window.print()` + CSS `@media print`. `src/index.css` sudah punya blok
`@media print` dan `.a4-print-container` — infrastruktur teruji dari fitur
cetak sebelumnya. Alternatif ditolak seperti di Non-goals.

## Desain teknis

- `Header.tsx`: tambah entri menu unduh "Unduh PDF" → `window.print()`
  (mengikuti pola `handleDownloadDocx` yang sudah ada, termasuk menutup
  menu unduh).
- `index.css`: di dalam `@media print`, pastikan container pratinjau dan
  elemen ber-CSS `zoom` (state `zoom`/`effectiveZoom` di
  `A4PaperPreview.tsx`) dicetak pada zoom 1 — mis. rule
  `@media print { .a4-zoom-wrapper, .a4-paper { zoom: 1 !important; } }`
  (nama class mengikuti implementasi aktual yang dicek saat eksekusi).
- Zoom preview adalah inline style — perlu wrapper/class yang bisa
  ditimpa `!important` saat print, atau set style print-spesifik.

## Pengujian

- Manual di browser: set zoom 80% → print preview (dan PDF hasil) harus
  A4 penuh 100%; halaman non-pratinjau tidak ikut tercetak.
- Cek build/test suite tetap hijau.
