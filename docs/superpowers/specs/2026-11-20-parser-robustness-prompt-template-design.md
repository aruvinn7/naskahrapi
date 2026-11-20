# SkripsiRapi — Parser Robust Multi-Format AI + Template Prompt (Design)

Tanggal: 2026-11-20. Status: menunggu persetujuan user.
Pendekatan: **C — keduanya** (user memilih dari 3 opsi: A parser saja, B template saja, C keduanya).

## Intent & Why

Dokumen hasil ChatGPT/Pandoc (hard-wrap ±72 karakter, tabel rata-spasi, escape
`US\$5`, `2016--2026`, garis lanjut `\`) membuat hasil parse berantakan:
paragraf & list pecah di tengah kalimat, 8 tabel jadi paragraf kacau, dan
`# CATATAN PENYUSUNAN` telan masuk DAFTAR PUSTAKA (risiko ikut terurut A–Z).
User ingin: (1) parser tahan terhadap banyak format output AI, dan
(2) Template Prompt AI yang bisa disalin user ke AI lain agar output langsung
cocok dengan parser — "tinggal ambil template, suruh AI lain ikuti".

## Diagnosis terverifikasi (dari dokumen uji Meta Platforms)

1. `aiCleaner.ts` list regex `\w+\.` terlalu rakus: baris awalan "Kata."
   (mis. `Messenger. Sebelum berganti…`) dianggap item list → paragraf pecah.
   Penyebab ±80 blok rusak. Terbesar.
2. Tabel Pandoc simple-table (kolom rata spasi + separator `---`) tidak
   dikenali (deteksi saat ini hanya pipe `|`).
3. Artefak Pandoc tidak dibersihkan: `\$`, `--` (en dash), `\` di akhir baris
   (hard line break), backtick.
4. Heading `#` di tengah dokumen tidak memecah section baru → konten
   menyatu ke section sebelumnya (kasus nyata: CATATAN PENYUSUNAN →
   DAFTAR PUSTAKA, menjadi `daftar_pustaka_item`).
5. Catatan: `**tebal**`/`*miring*` disimpan sebagai marker adalah by design —
   dirender rich di pratinjau & ekspor DOCX via `inlineFormat.ts`. Bukan bug.

## Goals

- T1: Baris list hanya dikenali dari marker sah: `1.` `1)` `a.` `a)` `-` `*` `•`.
  Huruf tunggal saja untuk `a.` (bukan `\w+`), sehingga `Inc.`/`Messenger.`/
  `Analytica.` tidak lagi memecah paragraf.
- T2: Reflow: baris lanjutan list (indent ≥2 spasi setelah `list_item`)
  digabung ke item sebelumnya; paragraf tetap digabung via buffer ada.
- T3: Deteksi Pandoc simple-table: baris separator berisi ≥2 run `---` menentukan
  batas kolom; header = baris di atasnya, body digabung per baris (baris baru
  saat kolom pertama terisi). Output jadi blok `table` (meta header/rows) sama
  dengan pipe-table. Gagal batas kolom → fallback paragraf (tidak lebih buruk).
- T4: Normalisasi artefak: `\$`→`$`, `\*`→`*`, `\#`/`\_`/`\[`/`\]`/`\\`,
  backtick dibuang, `kata--kata`→`kata–kata` (kontekstual, tidak menyentuh
  baris separator), `\` akhir baris dibuang.
- T5: Heading `#` (non-BAB, non-special) di tengah dokumen → commit section
  baru bertipe `bab` (judul apa adanya), sehingga CATATAN PENYUSUNAN/LAMPIRAN
  berdiri sendiri.
- T6: Cover Pandoc (field bertitik: `Mata Kuliah: ...`, `\` hard-break) tidak
  meninggalkan `\` dan bertitik-titik di blok cover; field yang dikenali masuk
  `CoverData` (kosong → placeholder editor). Minimal: `\` dibuang, baris
  bertitik tidak jadi paragraf kacau.
- T7: Fitur "Template Prompt AI": teks template kanonik berbahasa Indonesia
  (`src/utils/promptTemplate.ts`) + UI di PasteModal (panel lipat + tombol
  Salin ke clipboard + toast). Isi template = aturan yang 1:1 dikenali parser:
  `#`/`##`/`###`, satu paragraf = satu baris fisik, `1.`/`a.`/`-` untuk list,
  pipe-table `| A | B |`, caption `Tabel 3.1:`, pustaka satu entri per baris,
  tanpa basa-basi pembuka/penutup.

## Non-goals / Anti-goals

- Tidak mendukung seluruh spec Markdown (grid table `+---+`, blockquote
  bersarang, gambar base64, LaTeX).
- Tidak mengubah arsitektur `DocumentConfig`/`EffectiveConfig`/ekspor.
- Tidak mengganti renderer inline (`**`/`*` tetap dipertahankan).
- Template prompt bukan penjaga mutu isi AI (halusinasi, sitasi palsu) —
  hanya format.

## Constraints

- `parseRawDocument` tetap satu pintu (dipakai HomePage, PasteModal, autosave
  legacy, Smart Fix). Perubahan murni di dalam pipeline + helper baru.
- Pratinjau A4 & ekspor DOCX tidak boleh perlu perubahan: blok keluaran tetap
  `paragraph`/`list_item`/`table`/`heading_*`/`daftar_pustaka_item`.
- Renderer tabel yang ada mengonsumsi `meta.header`/`meta.rows` — ikuti bentuk itu.
- localStorage autosave: dokumen lama tetap tampil (sudah ada jalur re-parse).

## Approaches (cara bangun)

1. **Pre-pass normalisasi + perbaikan titik krusial (dipilih):** satu fungsi
   `normalizePandocArtifacts(text)` di awal `parseRawDocument`, perbaikan regex
   list, detektor simple-table sebagai helper terpisah, dan aturan `#`→section.
   Kecil, terlokalisasi di `aiCleaner.ts` (+ helper di file sama), mudah diuji.
2. Parser Markdown lengkap (remark/unified): kuat tapi menambah dependensi
   besar dan tetap perlu pemetaan ke blok makalah — overkill.
3. Hanya template prompt tanpa memperbaiki parser: ditolak user (pilihan C).

## Keputusan desain (call saya)

- En dash untuk `--` hanya kontekstual `(\w)--(\w)` agar baris `---` dan
  rentang tabel tidak rusak.
- `a)`/`1)` juga diterima sebagai marker list (format AI lain).
- Section generik dari `#` bertipe `bab` agar mewarisi render + page-break
  per BAB; judul tetap asli (mis. CATATAN PENYUSUNAN).
- UI template prompt hanya di PasteModal (pintu masuk teks AI); HomePage bisa
  menyusul bila diminta.
- Template prompt disimpan sebagai konstanta TS (bukan file .txt) agar mudah
  diimpor & diuji.

## Yang terserah builder

- Urutan & nama helper internal di `aiCleaner.ts`.
- Perincian copywriting template prompt (jelas, singkat, tanpa jargon).
- Penanganan kasus tabel ragged (fallback paragraf).

## Verifikasi

- Harness node (esbuild bundle `aiCleaner.ts`) atas 3 input: dokumen Meta
  (Pandoc), sample bawaan, varian pipe-table ChatGPT biasa.
  Ekspektasi Meta: 0 `\$`, 8 tabel jadi blok `table`, tanpa paragraf pecah
  (<70 char tanpa lanjutan), CATATAN PENYUSUNAN jadi section sendiri,
  7 entri pustaka.
- E2E browser: tempel dokumen Meta via PasteModal, cek pratinjau & daftar
  section; salin template dari UI; type-check `tsc --noEmit`.
