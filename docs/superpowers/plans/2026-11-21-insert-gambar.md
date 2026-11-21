# Sisip Gambar + Caption per BAB — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (inline, preferensi user). Steps pakai checkbox.

**Goal:** User bisa memasukkan gambar (toolbar/Ctrl+V/drag-drop) ke makalah dengan caption bernomor per BAB ("Gambar 2.1") yang otomatis masuk DAFTAR GAMBAR dan ikut ke Word.

**Architecture:** Blok baru `'image'` (meta.dataUrl) + blok `figure_caption` di bawahnya; util `figureNumbering.ts` untuk penomoran per-BAB (`renumberCaptions`) + kompresi (`compressImageFile`); App punya satu handler insert yang dipakai 3 jalur input; ekspor Word pakai pola `ImageRun` logo cover.

**Tech Stack:** React + TypeScript, vitest (ekspor diuji via fflate unzip — pola `docxExporter.numberTitleGap.test.ts`), canvas API untuk kompresi.

**Spec:** `docs/superpowers/specs/2026-11-21-insert-gambar-design.md`

## Global Constraints

- Nomor caption: `Gambar {bab}.{urut}` / `Tabel {bab}.{urut}` per BAB (keputusan user); di luar BAB fallback nomor global.
- Kompresi insert: file > ~500 KB atau lebar > 1600 px → canvas resize + JPEG 0.85; PNG kecil tetap PNG.
- Desktop & HP sama-sama jalan (tombol di toolbar atas, paste/drop di kontainer pratinjau).
- `pnpm test` + `pnpm build` hijau tiap akhir task. Tanpa commit (working tree uncommitted, keputusan user).
- Tanpa commit — semua langkah commit di skip (ruling sama dengan plan sebelumnya).

## Review Focus

- Paste teks (Ctrl+V di paragraf contentEditable) TIDAK boleh dibajak handler gambar — guard target non-editable. → test Task 3 (unit guard) + browser.
- Gambar loading async menggeser paginasi (ukur tinggi sebelum img selesai) → onLoad memicu re-measure. → Task 2 + browser.
- Renumber di tengah dokumen: hapus Gambar 2.1 → Gambar 2.2 menjadi 2.1; nomor bab lain tak terpengaruh. → test Task 1.
- Dokumen tanpa BAB: caption tetap bernomor global (Gambar 1, 2). → test Task 1.
- Ekspor Word berisi `w:drawing` untuk blok image. → test Task 2 (fflate).

---

### Task 1: Util `figureNumbering.ts` — penomoran per BAB + kompresi

**Files:**
- Create: `src/utils/figureNumbering.ts`
- Create: `src/utils/__tests__/figureNumbering.test.ts`
- Modify: `src/types/document.ts` (BlockType + `'image'`)

**Interfaces (produces):**
- `renumberCaptions(doc: ParsedDocument): void` — mutasi in-place: renumber semua `figure_caption` & `table_caption` (format `Gambar {bab}.{urut} {judul}` / `Tabel {bab}.{urut} {judul}`; judul = teks setelah label lama di-strip), lalu regenerasi section `daftar_gambar` & `daftar_tabel` (buat bila belum ada) berisi entri `{ text, blockId, sectionId }` urut dokumen.
- `compressImageFile(file: File, opts?): Promise<{ dataUrl: string }>` — canvas: lebar > 1600 di-resize; > 500 KB → JPEG 0.85; selain itu data URL asli.
- Ekstraksi nomor bab dari judul section (`BAB II PEMBAHASAN` → 2) memakai `splitChapterHeading` + toRoman dari formatEngine.

- [ ] Step 1: tulis test (RED): nomor per BAB (BAB I → 1.1; BAB II dua gambar → 2.1, 2.2); di luar BAB → global (Gambar 1); renumber setelah "hapus" di tengah (blok image+caption tengah dibuang → 2.2 jadi 2.1); Tabel ikut ("Tabel 2.1"); judul asli dipertahankan; regenerasi daftar_gambar/daftar_tabel entri urut; `compressImageFile` — skip (butuh canvas/file, diuji browser).
- [ ] Step 2: `pnpm test …` → RED (modul belum ada)
- [ ] Step 3: implement util + tambah `'image'` ke BlockType
- [ ] Step 4: `pnpm test` → GREEN penuh; `pnpm build`

### Task 2: Blok `'image'` di pratinjau & ekspor + normalisasi saat parse

**Files:**
- Modify: `src/components/A4PaperPreview.tsx` (render blok image; onLoad → re-measure tinggi paginasi)
- Modify: `src/utils/docxExporter.ts` (`dataUrlToImageRun` digeneralisasi jadi `dataUrlToImageRun(dataUrl, { width, height })`; branch `block.type === 'image'` di `blockParagraph` — paragraf rata tengah, lebar maks lebar konten; tinggi proporsional)
- Modify: `src/utils/aiCleaner.ts` (panggil `renumberCaptions` di akhir parse, setelah normalisasi urutan front-matter)

**Interfaces:**
- Consumes: `renumberCaptions` (Task 1), `dataUrlToImageRun`
- Produces: blok `'image'` dirender & diekspor

- [ ] Step 1: test ekspor (RED): dokumen dengan blok image → `Packer.pack(nodebuffer)` + unzip → XML mengandung `<w:drawing>`; caption di bawahnya "Gambar 2.1 …"
- [ ] Step 2: implement render preview (img tengah, `max-width:100%`, onLoad memicu re-measure tinggi) + branch ekspor + wiring parse → GREEN + `pnpm build`
- [ ] Step 3: test parser: caption tempelan "Gambar 1./2." di BAB II dinormalkan "Gambar 2.1/2.2", "Tabel 1." → "Tabel 2.1" (perluas `aiCleaner.sectionOrder.test.ts` atau file baru)

### Task 3: Tiga jalur insert + hapus di App

**Files:**
- Modify: `src/App.tsx` (`handleInsertImage(fileOrDataUrl)`, `handleDeleteImage(blockId)`; props ke RightSidebar/A4PaperPreview)
- Modify: `src/components/A4PaperPreview.tsx` (tombol "Sisipkan Gambar" + hidden file input di toolbar atas; handler onPaste/onDragOver/onDrop di kontainer; tombol ✕ hapus saat mode edit)

**Interfaces:**
- Consumes: `compressImageFile`, `renumberCaptions` (Task 1)
- Aturan: insert di akhir `activeSectionId` (fallback BAB terakhir); paste hanya bila clipboard berisi file gambar dan target bukan contentEditable; drop menghindari modal.

- [ ] Step 1: handler App (mutasi sections: sisip image+caption placeholder "Judul gambar" → `renumberCaptions` → setDoc)
- [ ] Step 2: tombol toolbar + file input; paste & drop guard; tombol ✕ hapus (edit mode)
- [ ] Step 3: `pnpm test` + `pnpm build`; browser: 3 jalur, nomor per BAB, daftar ikut, paste teks tak terganggu

### Task 4: Verifikasi menyeluruh + ledger

- [ ] Browser HP & desktop: insert via toolbar (di BAB I → Gambar 1.1), drop di BAB III (→ Gambar 3.1), paste screenshot (→ Gambar 1.2 di BAB I), hapus tengah → nomor bergeser; DAFTAR GAMBAR/TABEL ter-update; ekspor Word berisi gambar
- [ ] `pnpm test` + `pnpm build`; ledger + memory
