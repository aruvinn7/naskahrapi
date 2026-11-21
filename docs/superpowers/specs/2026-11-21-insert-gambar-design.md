# Desain: Sisip Gambar + Caption Otomatis Daftar Gambar

**Tanggal:** 2026-11-21
**Status:** menunggu persetujuan
**Ukuran:** proyek UI + parser + ekspor

## Intent & why

Saat ini caption gambar hanya berupa teks "Gambar N. Judul" — tidak ada
gambar sungguhan. User ingin cara mudah memasukkan gambar ke makalah dengan
caption yang otomatis muncul di DAFTAR GAMBAR dan ikut ke Word.

Pilihan user: ketiga cara insert (tombol toolbar **wajib**, drag & drop,
Ctrl+V) + **penomoran otomatis** ("Gambar 1, 2, 3…" menyesuaikan posisi).

## Pondasi yang sudah ada (hasil rekon)

- Ekspor Word: `dataUrlToImageRun` (pola logo cover) — data URL base64 →
  `ImageRun`; tinggal dipakai untuk blok gambar isi.
- Caption "Gambar N. Judul" → blok `figure_caption` → otomatis terkumpul ke
  DAFTAR GAMBAR (nomor halaman bergaris titik) — pipeline utuh.
- Yang belum ada: blok gambar, UI unggah, kompresi, penomoran dinamis.

## Desain

### 1. Model data

- Blok baru `'image'`: `meta: { dataUrl: string; captionBlockId: string }`.
- Caption = blok `figure_caption` tepat di bawahnya dengan
  `meta.autoCaption: true` + teks `Judul gambar` (tanpa "Gambar N." — nomor
  dirender dinamis). Editable via Edit Teks Langsung seperti teks biasa.
- Caption hasil parse teks ("Gambar 2. Judul" dari tempelan AI) tetap jalan;
  nomornya ikut dinormalkan saat regenerasi.

### 2. Cara memasukkan (3 jalur, satu pintu masuk)

- **Tombol toolbar** "🖼 Sisipkan Gambar" di kontrol atas pratinjau → file
  picker.
- **Ctrl+V** gambar dari clipboard saat pratinjau fokus (handler paste).
- **Drag & drop** file gambar ke area pratinjau.
- Ketiganya memanggil satu handler `insertImage(dataUrl)`: blok image +
  caption disisipkan **di akhir section yang sedang aktif di layar**
  (activeSectionId) — posisi predictable; lalu DAFTAR GAMBAR diregenerasi.
- Kompresi otomatis saat insert: jika file > ~500 KB atau lebar > 1600 px →
  canvas resize (maks 1600px) + JPEG 0.85; PNG kecil tetap PNG.

### 3. Penomoran per BAB & regenerasi daftar

- **Nomor mengikuti BAB** (keputusan user): gambar di BAB I → "Gambar 1.1",
  dua gambar → "1.1, 1.2", di BAB III → "Gambar 3.1", dst. Format:
  `Gambar {nomor-bab}.{urut-dalam-bab}`; di luar BAB (mis. kata pengantar)
  fallback nomor global "Gambar 1, 2, …".
- **Tabel memakai aturan sama** (keputusan saya, untuk konsistensi): caption
  tabel → "Tabel {bab}.{urut}" — caption tempelan "Tabel 1. …" ikut
  dinormalkan.
- Helper bersama `renumberCaptions(doc)`: jalan berurutan seluruh section;
  nomor bab diambil dari judul section bab ("BAB II" → 2); setiap
  figure_caption (milik image maupun teks) dan table_caption ditulis ulang
  dengan nomor barunya (judul setelah "Gambar N." dipertahankan).
- Dipanggil saat parse (normalisasi) dan setelah insert/hapus gambar →
  section `daftar_gambar`/`daftar_tabel` diisi ulang entri teks barunya —
  daftar, nomor halaman, dan pratinjau selalu konsisten.

### 4. Pratinjau & ekspor

- Preview: blok image → `<img>` rata tengah `max-width: 100%` di halaman A4 +
  caption di bawahnya (style caption gambar yang sudah ada).
- DOCX: blok image → paragraf rata tengah `ImageRun` (lebar dikunci maks
  lebar konten 16 cm, tinggi proporsional — pola `coverLogoBox`); caption
  memakai paragraf caption yang sudah ada.

### 5. Penghapusan & batas

- Mode Edit Teks Langsung menampilkan tombol ✕ kecil di bawah gambar untuk
  menghapus (image + caption) → regenerasi daftar.
- Batas praktis: gambar dikompres (± 100–400 KB/gambar) → puluhan gambar aman
  di autosave localStorage (~5 MB). Migrasi IndexedDB = non-goal dulu.

## Non-goal

- Resize/crop gambar di dalam app; galeri/reorder gambar; ekspor gambar ke
  PDF; pengeditan gambar.

## Verifikasi

- Unit: parser tetap jalan; `renumberFigures` (insert di tengah → nomor
  bergeser; hapus → menyesuaikan); regenerasi daftar; ekspor berisi ImageRun.
- Browser: 3 jalur insert di HP & desktop, caption editable, daftar gambar
  ter-update, ekspor Word berisi gambar+caption.
