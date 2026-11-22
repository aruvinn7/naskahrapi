# Template Jurnal Dua Kolom — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Template **jurnal** meniru PDF Berkala Fisika: dua kolom, header jurnal (nama/vol/ISSN), front matter artikel (judul/penulis/Abstract/Abstrak italic), sub-bab tanpa "BAB I", pustaka bernomor `1).` — di pratinjau A4 dan file Word.

**Architecture:** Config baru `journal` (3 field teks) + preset jurnal baru; util `journalFormat.ts` bersama (strip BAB, front matter extractor); preview memakai CSS `column-count: 2` dengan kapasitas pagination ×2 dan header/footer jurnal per halaman; exporter memakai dua section docx (front 1 kolom → CONTINUOUS 2 kolom). Semua jalur (pratinjau/format/ekspor) memakai util yang sama agar "BAB I PENDAHULUAN" → "Pendahuluan" konsisten.

**Tech Stack:** React 18 + TS, vitest (TDD), CSS columns, docx v9 (`SectionType.CONTINUOUS`, `column.count`), fflate untuk test XML.

**Spec:** `docs/superpowers/specs/2026-11-22-template-jurnal-design.md`

## Global Constraints

- Data header jurnal: `DocumentConfig.journal?: { name, volumeInfo, issn }` — semuanya string, boleh kosong (baris header terkait dilewati).
- Penulis/afiliasi dari `doc.cover` (members[0].name; studyProgram/department/institution) — kosong = baris dilewati.
- Front matter makalah (cover, kata_pengantar, daftar_isi/tabel/gambar) disembunyikan saat template jurnal; konten tetap ada di doc.
- localStorage keys & data user tidak tersentuh.
- Suite tetap hijau; commit SATU kali comprehensif di Task 5 + push (preferensi user).

## Review Focus

1. **Teks bab "BAB I PENDAHULUAN" dari draf AI** — saat jurnal harus tampil "Pendahuluan" di pratinjau, format, ekspor (satu util `stripBabPrefix`). → Task 1/2/4 test.
2. **Dokumen tanpa cover/abstrak** — front matter artikel boleh kosong: hanya judul artikel yang dirender, tidak crash. → Task 2 test.
3. **Kembali ke template makalah/skripsi** — front matter & nomor BAB kembali normal (tidak ada strip BAB permanen). → Task 3 verifikasi browser.
4. **Pustaka bernomor saat jurnal** — "1). " prefix, tanpa hanging indent; saat makalah/skripsi hanging tetap. → Task 4 test.
5. **Header jurnal kosong** — bila 3 field kosong, header halaman hanya nomor halaman; tidak crash. → Task 4 test.

---

### Task 1: Config jurnal + preset baru + util `journalFormat.ts` (TDD)

**Files:**
- Modify: `src/types/document.ts` (tambah `JournalConfig`, `DocumentConfig.journal?`)
- Modify: `src/utils/templatePresets.ts` (preset & deskripsi jurnal baru)
- Modify: `src/App.tsx` (DEFAULT_CONFIG + `sanitizeConfig` field journal)
- Create: `src/utils/journalFormat.ts`
- Test: `src/utils/__tests__/journalFormat.test.ts`, `src/utils/__tests__/templatePresets.journal.test.ts`

**Interfaces:**
- Produces (dipakai Task 2–4):
  - `JournalConfig { name: string; volumeInfo: string; issn: string }`
  - `stripBabPrefix(text: string): string` — `/^BAB\s+[IVXLCDM0-9]+\s*[:.\-–]?\s*/i` dihapus; bukan bab → teks utuh.
  - `isJournalTemplate(config: DocumentConfig): boolean` — `config.template === 'jurnal'`.
  - `buildJournalFront(doc: ParsedDocument): { title, author, affiliation, abstracts: Array<{ heading, body, keywords }> }` — judul dari `doc.cover?.title || doc.title`; author = `cover.members[0]?.name` (+NIM? tidak — nama saja); affiliation = gabungan `studyProgram`, `department`, `institution` (non-kosong, join ', '); abstracts dari section `type === 'abstrak'`: heading = judul section yang di-strip ("Abstract"/"Abstrak"), body = gabungan blok `paragraph` (join '\n\n') yang TIDAK diawali keyword-marker, keywords = blok yang diawali `/^(keyword|kata\s*kunci)\s*[:.]?/i` (dipotong prefix-nya).

- [ ] **Step 1: Write the failing tests** — `templatePresets.journal.test.ts`: preset jurnal → margin {2.5,2.5,2.5,2.5}, lineSpacing 1.0, firstLineIndent 0.75, fontSize.body 11, pageSetup.pageNumberPosition 'bottom-center', newPagePerBab false, headingRules.numberingFormat 'none', journal default `{name:'',volumeInfo:'',issn:''}`. `journalFormat.test.ts`: stripBabPrefix 4 kasus (BAB I/tidak bab/uppercase/campur); buildJournalFront dari doc minimal (cover members 1 + 2 section abstrak EN/ID dengan blok paragraph + kata kunci).

- [ ] **Step 2: Run tests — Expected: FAIL** (`pnpm vitest run src/utils/__tests__/journalFormat.test.ts src/utils/__tests__/templatePresets.journal.test.ts`)

- [ ] **Step 3: Implement** — types, preset (di `applyTemplatePreset` branch jurnal set pageSetup/headingRules/journal mempertahankan nilai user bila sudah ada → hanya isi default bila kosong), DEFAULT_CONFIG.journal, sanitizeConfig.journal (trim string), journalFormat.ts.

- [ ] **Step 4: Run tests — Expected: PASS semua + `pnpm vitest run` hijau.**

### Task 2: Flow pratinjau jurnal di `previewLayout.ts` (TDD)

**Files:**
- Modify: `src/utils/previewLayout.ts` (`buildFlowItems(doc, tocEntries, newPagePerBab, isJournal = false)`)
- Test: `src/utils/__tests__/previewLayout.journal.test.ts`

**Interfaces:**
- Consumes: `stripBabPrefix`, `isJournalTemplate` dari Task 1.
- Produces: flow items jurnal — section cover/kata_pengantar/daftar_* di-skip; `abstrak` juga di-skip (masuk front matter Task 3); section-heading & heading_1 melewati `stripBabPrefix`; pustaka tidak page-break.

- [ ] **Step 1: Write the failing tests** — doc dengan sections: cover, kata_pengantar, daftar_isi, abstrak, bab "BAB I PENDAHULUAN" (blocks heading_1 "BAB I PENDAHULUAN", heading_2 "1.1 Latar Belakang"), daftar_pustaka. `buildFlowItems(doc, [], false, true)`: tidak ada item sectionType cover/kata_pengantar/daftar_isi/abstrak; ada item text 'Pendahuluan' (bukan 'BAB I PENDAHULUAN'); section-heading pustaka tidak `pageBreakBefore`. Kontrol: isJournal=false → perilaku lama utuh (masih ada cover & 'BAB I PENDAHULUAN').
- [ ] **Step 2: Run — Expected: FAIL**
- [ ] **Step 3: Implement** — param `isJournal` (default false; backward-compatible — pemanggil lama tidak berubah); saat jurnal: filter section + strip judul; heading_2 TIDAK diubah (biarkan "1.1" apa adanya? PDF jurnal tanpa nomor sub-bab → juga strip `/^\d+(\.\d+)*\s+/` pada heading_2/3 saat jurnal — uji: '1.1 Latar Belakang' → 'Latar Belakang').
- [ ] **Step 4: Run — Expected: PASS + suite hijau.**

### Task 3: Pratinjau & form UI jurnal (browser-verified)

**Files:**
- Modify: `src/components/A4PaperPreview.tsx` — props baru `journal?: JournalConfig`; saat jurnal: halaman render header jurnal (kiri 2 baris italic / kanan ISSN bold italic, hanya bila field terisi), container isi `class journal-columns` (CSS `column-count:2; column-gap:0.5cm` di index.css, + aturan @media print sama), capacity pagination ×2 (kapasitas kolom ganda), front matter halaman pertama: blok journal-front satu kolom (judul center bold 14pt, penulis italic bold center, afiliasi italic center, per abstrak: heading center bold + isi italic + keywords italic) dibangun via `buildJournalFront` + section abstrak sumber (skip dari flow biasa).
- Modify: `src/components/RightSidebar.tsx` — kartu "Header Jurnal" (3 input, label: Nama jurnal; Volume/No/Tahun/Halaman; ISSN) hanya bila `config.template === 'jurnal'`; onChange `updateConfig({ journal: { ...config.journal, [field]: value } })`.
- Modify: `src/App.tsx` — pass `config.journal` ke A4PaperPreview.
- Modify: `src/index.css` — `.journal-columns` + versi @media print.

**Interfaces:**
- Consumes: Task 1 (config + util), Task 2 (flow items).
- Produces: pratinjau jurnal visual; form menyimpan config (autosave).

- [ ] **Step 1: Implement** UI/CSS/pagination.
- [ ] **Step 2: Verifikasi browser** (pola backup-restore localStorage): pilih template jurnal → pratinjau 2 kolom + header jurnal + front matter; isi form header → header halaman ikut; ganti ke makalah → tampilan normal kembali (front matter muncul lagi). Suite tetap hijau.

### Task 4: Exporter docx jurnal (TDD)

**Files:**
- Modify: `src/utils/docxExporter.ts` — `buildDocxDocument` branch jurnal → `buildJournalDocument(docData, config, estimator)`.
- Test: `src/utils/__tests__/docxExporter.journal.test.ts`

**Interfaces:**
- Consumes: Task 1 (util), heading styles dari config preset jurnal.
- Produces: file Word — section 1 (front matter, 1 kolom, header jurnal, footer bottom-center, pageNumbers DECIMAL) + section 2 (`SectionType.CONTINUOUS`, `column: { count: 2, space: cmToTwip(0.5) }`, children isi + pustaka bernomor "1). " tanpa hanging).

- [ ] **Step 1: Write the failing test** (pola `docxExporter.image.test.ts` — fflate unzip `word/document.xml`): config template jurnal + doc minimal (1 bab + 2 entri pustaka) → XML memuat `<w:cols w:num="2"`, header berisi nama jurnal & ISSN, teks "Pendahuluan" TANPA "BAB I", entri pustaka berawalan "1). " dan tanpa `w:ind` hanging, ada `<w:type w:val="continuous"/>`. Kontrol makalah: tidak ada `w:num="2"`.
- [ ] **Step 2: Run — Expected: FAIL**
- [ ] **Step 3: Implement** — `journalHeader(config)` (2 baris kiri italic: name bold; volumeInfo; kanan ISSN bold italic via tab stop RIGHT, skip baris kosong), front matter paragraphs (judul/penulis/afiliasi/abstrak italic justify), body children pakai `headingParagraph` + `stripBabPrefix`, pustaka: paragraf "1). " + runs tanpa indent, section CONTINUOUS dua kolom.
- [ ] **Step 4: Run — Expected: PASS + suite hijau.**

### Task 5: Verifikasi akhir + commit comprehensif

- [ ] **Step 1:** `pnpm vitest run && pnpm build` — hijau.
- [ ] **Step 2:** Sanity browser final: preset jurnal → pratinjau ala PDF (header, 2 kolom, front matter, pustaka bernomor); pulihkan dokumen user; template makalah normal.
- [ ] **Step 3:**
```bash
git add -A
git commit -m "feat: template jurnal dua kolom ala PDF — header jurnal, front matter artikel, sub-bab tanpa BAB, pustaka bernomor"
git push origin main
```
