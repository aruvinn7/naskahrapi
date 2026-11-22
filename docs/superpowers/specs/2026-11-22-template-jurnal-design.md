# Design: Template Jurnal Dua Kolom ala PDF (Berkala Fisika)

Tanggal: 2026-11-22
Status: pendekatan disetujui user ("Lengkap ala PDF") — menunggu approval detail

## Intent & Why

User memberikan contoh jurnal sungguhan (Berkala Fisika Vol 11 No.4 2008, ISSN
1410-9662) dan ingin: ketika template **jurnal** dipilih, dokumen mengikuti
format jurnal tersebut. Preset jurnal saat ini hanya mengatur margin/spasi/font
— tidak ada dua kolom, header jurnal, front matter bergaya artikel, sub-bab
tanpa "BAB I", atau pustaka bernomor.

## Ciri template dari PDF (sumber kebenaran)

1. Isi artikel **dua kolom**; judul artikel + penulis + abstrak satu kolom penuh.
2. **Header tiap halaman**: kiri — nama jurnal (italic bold) + info
   vol/no/bulan/tahun/halaman (italic); kanan — ISSN (italic bold).
3. Nomor halaman **bawah tengah**; tanpa header "BAB ...".
4. **Judul artikel** center bold (14 pt); **penulis** italic bold center;
   **afiliasi** italic center; **Abstract/Abstrak** heading center, isi italic,
   diikuti "Keyword :" / "Kata kunci :".
5. **Sub-bab tanpa nomor BAB**: "Pendahuluan", "Dasar Teori", "Metoda
   Penelitian", "Hasil dan Pembahasan" — bold, rata kiri, di dalam kolom.
6. **Daftar Pustaka bernomor `1).` `2).`** tanpa indentasi menggantung;
   urutan mengikuti sitasi (gaya `[1]`), bukan alfabetis.
7. Spasi 1,0; isi 11 pt; margin ±2,5 cm.

## Goals

- Semua 7 ciri di atas diterapkan saat `config.template === 'jurnal'`:
  pratinjau A4 dan file Word hasil ekspor keduanya.
- Data header jurnal diisi user via form kecil (3 field) di tab Format yang
  hanya muncul untuk template jurnal: Nama jurnal, Info volume/edisi (teks
  bebas: "Vol 11, No.4, Oktober 2008 hal 147-152"), ISSN.
- Penulis & afiliasi artikel diambil dari data cover yang ada (nama anggota
  pertama; prodi/institusi) — kosong = baris dilewati.

## Non-goals

- Persamaan matematika bernomor (1)/(2) — tidak didukung parser teks.
- Gaya jurnal IEEE/AIP lain (margin/header bervariasi) — satu template umum
  mengikuti PDF contoh.
- Mengubah localStorage keys / migrasi data.

## Pendekatan

Config baru `journal?: { name: string; volumeInfo: string; issn: string }`.
`applyTemplatePreset('jurnal')` mengisi preset baru (margin 2,5 cm, spasi 1,0,
font 11 pt, nomor halaman bawah tengah, newPagePerBab false) dan mengosongkan
header makalah. Util `stripBabPrefix()` dipakai bersama oleh format engine,
preview flow, dan exporter agar "BAB I PENDAHULUAN" → "Pendahuluan" konsisten.
Front matter makalah (cover, kata pengantar, daftar isi/tabel/gambar) tidak
ikut flow saat template jurnal (konten tetap ada, kembali bila ganti template).
Dua kolom: pratinjau memakai CSS `column-count: 2` dengan capacity pagination
dibagi dua (estimasi kasar, diterima sebagai pratinjau); exporter memakai dua
section docx (1 kolom → CONTINUOUS → 2 kolom).

Alternatif ditolak: hanya mengubah format halaman (setengah jalan — front
matter tetap gaya makalah, tidak terlihat seperti jurnal); generator PDF
terpisah (duplikasi engine).

## Desain teknis

- **Config**: `DocumentConfig.journal?: { name, volumeInfo, issn }`;
  `sanitizeConfig` membersihkan field teks; preset jurnal memakai default
  kosong (form tampil placeholder).
- **Preset jurnal**: margin {2.5×4}, lineSpacing 1.0, firstLineIndent 0.75,
  fontSize {title 14, subTitle 12, body 11, table 10, caption 10},
  pageSetup {pageNumberPosition 'bottom-center', newPagePerBab false,
  headerEnabled false}, headingRules {numberingFormat 'none', babTitleStyle
  'joined', h2Numbering 'numeric'}.
- **Util baru** `src/utils/journalFormat.ts`: `stripBabPrefix(text)`,
  `isJournalConfig(config)`, `buildJournalFront(doc)` → { title, author,
  affiliation, abstracts: Array<{ heading, body, keywords }> } (abstrak EN &
  ID dari section type 'abstrak'; baris Keyword/Kata kunci dipisah).
- **previewLayout**: saat jurnal — skip section cover & FRONT_MATTER kecuali
  'abstrak' (abstrak masuk front matter journal, bukan flow biasa); judul
  section & heading_1 melalui stripBabPrefix; pustaka tidak page-break.
- **A4PaperPreview**: saat jurnal — tiap halaman dirender dengan header jurnal
  (kiri 2 baris italic / kanan ISSN) + footer nomor halaman bawah tengah;
  container isi `column-count: 2, gap ±0.5 cm` dengan tinggi tersedia dibagi
  kapasitas kolom; front matter halaman 1 satu kolom (judul/penulis/abstrak).
- **formatEngine / exporter**: heading & section title lewat stripBabPrefix;
  entri `daftar_pustaka_item` jurnal dirender "1). teks" tanpa hanging.
- **docxExporter**: dua section — section 1 (front matter: judul, penulis,
  afiliasi, Abstract/Abstrak italic) 1 kolom; section 2 CONTINUOUS 2 kolom
  (`column: { count: 2, space }`) berisi seluruh isi + pustaka bernomor;
  header default 3 field jurnal (tab stop kanan, italic); footer nomor halaman
  bawah tengah.
- **RightSidebar tab Format**: kartu "Header Jurnal" (3 input) hanya saat
  template 'jurnal'; deskripsi template jurnal diperbarui.

## Keterbatasan jujur (dicatat)

- Pagination pratinjau 2 kolom adalah estimasi tinggi/2 — posisi patah antar
  kolom di pratinjau bisa bergeser dari hasil Word (file Word yang final).
- Persamaan bernomor tidak didukung.

## Pengujian

TDD: preset jurnal (T1), journalFormat util (T2), pustaka bernomor + strip BAB
di engine (T2/T4), exporter dua section/kolom/header/footer (T4, unzip XML),
verifikasi browser pratinjau (T3/T5). Verifikasi akhir: ekspor Word dibuka
dan dicek layout (oleh user sekali, seperti pola Unduh PDF).
