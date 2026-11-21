# Desain: Responsif untuk Tablet & HP

**Tanggal:** 2026-11-21
**Status:** menunggu persetujuan
**Ukuran:** proyek UI (menyentuh banyak file, tapi perubahan mekanis per breakpoint)

## Intent & why

Aplikasi harus nyaman dipakai di HP dan tablet: semua halaman terbaca tanpa
scroll horizontal, tidak ada elemen terpotong. Kondisi sekarang di HP (390px):
sidebar navigasi memakan ~40% lebar, halaman A4 editor terpotong kiri-kanan,
header terpotong. Tablet (768px) hampir baik — hanya header terpotong.

Viewport meta sudah benar; breakpoint Tailwind: HP (default), tablet `md`(768),
desktop `lg`(1024). Pola drawer untuk panel editor sudah ada dari WIP
(fixed + backdrop + tombol Escape) — pola yang sama dipakai di sini.

## Ruang lingkup (4 bagian)

### 1. Sidebar navigasi → drawer di HP

- HP: AppSidebar jadi drawer off-canvas kiri (default tertutup): wrapper
  `fixed inset-y-0 left-0 z-40 transition-transform` + `translate-x-0` saat
  terbuka / `-translate-x-full` tertutup, backdrop gelap klik-untuk-tutup,
  tombol Escape menutup (pola sama dengan drawer editor).
- Tombol ☰ pemanggil: muncul di atas konten (md:hidden) — di header Beranda
  dan banner Editor.
- Tablet/desktop (≥md): perilaku sekarang tetap — aside inline, tombol collapse
  ke rail 96px tetap berfungsi (sidebar dibuka mobile otomatis full 232px).
- Navigasi memilih halaman → drawer tertutup otomatis.

### 2. Pratinjau A4 fit-to-width

- Zoom sekarang: `transform: scale(zoom/100)` — layout width tidak ikut
  menyusut → overflow horizontal di HP.
- Fix: A4PaperPreview mengukur lebar kontainernya (ref + ResizeObserver) dan
  menghitung `fitZoom` (persen, clamp 25–100) dari lebar halaman A4 px.
  `zoomEfektif = Math.min(zoom, fitZoom)` di semua layar — di desktop dengan
  lebar cukup, fitZoom ≥ 100 sehingga perilaku manual seperti sekarang.
- Preset tombol "Pas Layar" → set `zoom = fitZoom` (dinamis).
- Pembungkus kolom halaman diberi ukuran hasil skala (width = halaman×zoom)
  + `overflow-hidden` agar tidak ada scroll horizontal; halaman tetap center.

### 3. Header & toolbar editor

- Banner: `flex-wrap`; nama dokumen `truncate min-w-0`; chip meta
  (KB/halaman/tanggal/autosave) `hidden sm:inline-flex`; tombol aksi tetap
  tapi ikon menyusut label di HP bila perlu.
- Toolbar halaman & zoom: `flex-wrap` + gap; kontainer pratinjau tanpa
  padding berlebih di HP.

### 4. Halaman lain & modal

- HomePage/PedomanPage: grid sudah `md:` responsive ✓ — cukup rapikan padding
  kontainer HP & ukuran hero (font-size turun di HP bila perlu).
- Semua modal (Tempel Teks, Bandingkan, dsb.): konten `w-[min(92vw,64rem)]`
  + `max-h-[85vh] overflow-y-auto` agar tergulir di HP.
- Toast, tombol floating drawer editor: sudah responsif dari WIP ✓.

## Non-goal

- Tidak mengubah tampilan desktop (≥1024) selain perilaku zoom baru yang
  identik bila ruang cukup.
- Tidak ada redesign visual tema/warna.

## Verifikasi

- Browser: screenshot 390×844 dan 768×1024 di Beranda/Editor/Pedoman + modal,
  sebelum (sudah direkam) dan sesudah — semua tanpa overflow horizontal
  (cek `document.scrollingElement.scrollWidth <= innerWidth`).
- `pnpm test` + `pnpm build` tetap hijau.
