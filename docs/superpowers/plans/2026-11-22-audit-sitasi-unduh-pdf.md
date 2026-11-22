# Audit Sitasi ↔ Pustaka + Unduh PDF — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Audit sitasi↔pustaka dua arah di tab Analisis + entri menu "Unduh PDF" yang selalu mencetak 100% terlepas dari zoom pratinjau.

**Architecture:** Perkuat `analyzeCitations` di `src/utils/citationHelper.ts` menjadi sumber kebenaran sitasi (ekstraksi kunci nama+keterangan tahun dua sisi) dan tampilkan temuan baru di kartu sitasi yang sudah ada di `RightSidebar.tsx`. Untuk PDF: pakai `window.print()` yang sudah ada (entri menu "Cetak / Simpan ke PDF" diganti label "Unduh PDF") dan tambahkan reset `zoom` pada `@media print` di `src/index.css`.

**Tech Stack:** React 18 + TS, vitest (TDD RED→GREEN untuk logic), CSS `@media print`.

**Spec:**
- `docs/superpowers/specs/2026-11-22-audit-sitasi-design.md`
- `docs/superpowers/specs/2026-11-22-unduh-pdf-design.md`

## Global Constraints

- UI dan pesan berbahasa Indonesia; label PDF = **"Unduh PDF"** (bukan "ekspor"/"cetak").
- Output PDF harus 100% ukuran asli apa pun zoom pratinjau (persyaratan eksplisit user).
- Tidak ada perbaikan otomatis pada temuan sitasi — hanya daftar temuan.
- Tidak menambah dependensi baru.
- Suite harus tetap hijau (kini 100/100) sebelum commit.
- Commit: **SATU commit comprehensif di akhir** (preferensi user yang mapan), mencakup juga perubahan lama yang belum ter-commit (sisip tabel, riwayat, pedoman, copy beranda); push ke `origin main`.

## Review Focus

1. **Kurung bukan sitasi** — "(Lihat Prasetyo, 2023)" / "(misalnya pemerintah)" harus bukan temuan → Task 1 (test stoplist & tanpa tahun).
2. **Dokumen tanpa DAFTAR PUSTAKA** — audit tidak boleh melapor "entri tak terpakai" palsu → Task 1 (test tanpa pustaka).
3. **Tahun berhuruf** — sitasi `(Sari, 2023a)` hanya cocok dengan entri bertahun `2023a`, bukan `2023` → Task 1 (test sufiks).
4. **Entri pustaka bernomor** — prefix `[1]` / `1.` harus dibuang sebelum menarik nama → Task 1 (test strip penomoran).
5. **Zoom pratinjau non-100% saat mencetak** — hasil cetak tetap 100% → Task 3 (rule CSS) + verifikasi browser Task 4.

---

### Task 1: Ekstraksi sitasi & kunci di `citationHelper.ts` (TDD)

**Files:**
- Test (Create): `src/utils/__tests__/citationHelper.test.ts`
- Modify: `src/utils/citationHelper.ts`

**Interfaces:**
- Consumes: `stripInlineMarkdown` dari `src/utils/inlineFormat.ts` (sudah dipakai), tipe `DocumentSection`.
- Produces (dipakai Task 2 & kode lama):
  - `export interface CitationRef { raw: string; key: string }`
  - `export function extractCitationRefs(content: string): CitationRef[]`
  - `export function extractBibliographyKey(entryText: string): string | null`
  - `CitationAnalysis` ditambah `unusedReferences: string[]` (field baru; field lama tidak dihapus).
  - Format kunci: `${kataPertamaNamaLowercase}::${tahun4}${sufiksHurufJikaAda}` (contoh: `sari::2022`, `sari::2023a`).

- [ ] **Step 1: Write the failing test**

Helper test membangun section minimal; pola objek mengikuti `types/document.ts` (`DocumentSection` wajib punya `id, title, type, blockCount, startPageEstimate, blocks`; block wajib `id, type, rawContent, formattedContent`). Test:

```ts
import { describe, it, expect } from 'vitest';
import {
  extractCitationRefs,
  extractBibliographyKey,
  analyzeCitations
} from '../citationHelper';
import { DocumentSection, DocumentBlock } from '../../types/document';

function block(type: string, text: string): DocumentBlock {
  return { id: `b-${Math.random().toString(36).slice(2)}`, type: type as DocumentBlock['type'], rawContent: text, formattedContent: text };
}
function section(type: string, title: string, blocks: DocumentBlock[]): DocumentSection {
  return { id: `s-${Math.random().toString(36).slice(2)}`, title, type, blockCount: blocks.length, startPageEstimate: 1, blocks };
}
function bibSection(entries: string[]): DocumentSection {
  return section('daftar_pustaka', 'DAFTAR PUSTAKA', entries.map((e) => block('daftar_pustaka_item', e)));
}

describe('extractCitationRefs', () => {
  it('deteksi sitasi ganda dalam satu kurung', () => {
    const refs = extractCitationRefs('Hasil serupa (Sari, 2022; Wibowo, 2023) ditemukan.');
    expect(refs.map((r) => r.key)).toEqual(['sari::2022', 'wibowo::2023']);
  });
  it('deteksi sitasi naratif Prasetyo (2023)', () => {
    expect(extractCitationRefs('Prasetyo (2023) menyatakan bahwa.')[0].key).toBe('prasetyo::2023');
  });
  it('dkk. dan et al. memakai kata pertama', () => {
    expect(extractCitationRefs('(Sari dkk., 2022)')[0].key).toBe('sari::2022');
    expect(extractCitationRefs('(Prasetyo et al., 2020)')[0].key).toBe('prasetyo::2020');
  });
  it('tahun berhuruf ikut kunci', () => {
    expect(extractCitationRefs('(Sari, 2023a)')[0].key).toBe('sari::2023a');
  });
  it('kurung non-sitasi diabaikan', () => {
    expect(extractCitationRefs('(Lihat Prasetyo, 2023) serta (misalnya pemerintah pusat)')).toEqual([]);
    expect(extractCitationRefs('lihat bagian (Lampiran 1)')).toEqual([]);
  });
});

describe('extractBibliographyKey', () => {
  it('entri APA dengan penomoran di-strip', () => {
    expect(extractBibliographyKey('[1] Prasetyo, A. (2023). Metodologi.')).toBe('prasetyo::2023');
    expect(extractBibliographyKey('1. Sari, B. (2022a). Judul.')).toBe('sari::2022a');
  });
});

describe('analyzeCitations', () => {
  it('sitasi beda tahun dilaporkan missing', () => {
    const doc = [
      section('bab', 'BAB I', [block('paragraph', 'Hasil awal (Prasetyo, 2020) menunjukkan.')]),
      bibSection(['Prasetyo, A. (2023). Metodologi.'])
    ];
    const result = analyzeCitations(doc);
    expect(result.missingFromBibliography).toContain('Prasetyo, 2020');
  });
  it('entri pustaka yang tak pernah disitasi dilaporkan unused', () => {
    const doc = [
      section('bab', 'BAB I', [block('paragraph', 'Penelitian Sari (2023) menunjukkan.')]),
      bibSection(['Sari, B. (2023). Judul satu.', 'Wibowo, C. (2021). Judul dua.'])
    ];
    const result = analyzeCitations(doc);
    expect(result.unusedReferences).toHaveLength(1);
    expect(result.unusedReferences[0]).toContain('Wibowo');
  });
  it('dokumen tanpa pustaka: unusedReferences kosong', () => {
    const doc = [section('bab', 'BAB I', [block('paragraph', 'Kutipan (Sari, 2023).')])];
    expect(analyzeCitations(doc).unusedReferences).toEqual([]);
  });
  it('sitasi IEEE [1] tidak dihitung missing', () => {
    const doc = [
      section('bab', 'BAB I', [block('paragraph', 'Model [1] terbukti.')]),
      bibSection(['Prasetyo, A. (2023). Metodologi.'])
    ];
    expect(analyzeCitations(doc).missingFromBibliography).toEqual([]);
  });
  it('sufiks tahun wajib sama (2023a ≠ 2023)', () => {
    const doc = [
      section('bab', 'BAB I', [block('paragraph', 'Kajian (Sari, 2023a) berkembang.')]),
      bibSection(['Sari, B. (2023). Judul.'])
    ];
    expect(analyzeCitations(doc).missingFromBibliography).toContain('Sari, 2023a');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/utils/__tests__/citationHelper.test.ts`
Expected: FAIL — `extractCitationRefs`/`extractBibliographyKey` belum ada; `unusedReferences` undefined.

- [ ] **Step 3: Implement di `src/utils/citationHelper.ts`**

- `extractCitationRefs(content)`: dua jalur —
  - Parenthetical: `/\(([^()]+)\)/g` → split isi per `;` → tiap item cocok `/^(.+?),\s*((?:19|20)\d{2}[a-z]?)$/` (nama sebelum koma terakhir).
  - Naratif: `/\b([A-Z][a-zA-Z]+(?:\s+(?:dkk\.|et\s+al\.))?)\s*\(((?:19|20)\d{2}[a-z]?)\)/g`.
  - Stoplist kata pertama (case-insensitive) yang dibuang: `lihat, bandingkan, misal, misalnya, contoh, cf, ibid, op, cit, sumber, kutipan`.
  - `raw` = teks sitasi persis seperti sumber (contoh: `Sari, 2022`); `key` = `${kataPertamaNamaLowercase}::${tahun}`.
- `extractBibliographyKey(entry)`: strip penomoran awal `/^\s*(\[\d+\]|\d+[.)])\s*/` + `stripInlineMarkdown` → nama = kata pertama token kapital/organisasi setelah strip → tahun = match pertama `/\b((?:19|20)\d{2})[a-z]?\b/` (sertakan sufiks bila ada); null bila tidak ada tahun.
- `analyzeCitations`: pakai kedua fungsi di atas; `missingFromBibliography` = raw sitasi yang key-nya tidak ada di set kunci entri (sitasi `[\d+]` IEEE di-skip dari cross-check tapi tetap masuk `inTextCitations`); `unusedReferences` = raw entri (dipotong ±80 char) yang key-nya tidak ada di set kunci sitasi; hanya diisi bila `bibBlocks.length > 0`. Perilaku lama lainnya (styleDetected, isSortedAlphabetically) tidak berubah.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/utils/__tests__/citationHelper.test.ts`
Expected: PASS semua.

- [ ] **Step 5: Run seluruh suite**

Run: `pnpm vitest run`
Expected: 100/100 + test baru — tidak ada regresi (perilaku missing berubah: kini nama+tahun).

---

### Task 2: Temuan "entri tak terpakai" di kartu sitasi (UI)

**Files:**
- Modify: `src/components/RightSidebar.tsx` (kartu "Format Sitasi & Referensi", sekitar baris 1360-1409)

**Interfaces:**
- Consumes: `citationAnalysis.unusedReferences` dari Task 1.
- Produces: blok temuan amber baru di kartu sitasi yang sudah ada (tanpa komponen baru).

- [ ] **Step 1: Tambah blok temuan unusedReferences**

Setelah blok `missingFromBibliography` yang sudah ada, tambah blok sejenis (amber, `AlertCircle`, daftar `<ul>`):

- Judul: **"Entri pustaka yang tidak pernah disitasi:"**
- Item: satu baris per entri (`citationAnalysis.unusedReferences.map`).
- Hanya dirender bila panjang > 0.

- [ ] **Step 2: Verifikasi browser**

Dev server (cek port dari log `pnpm dev`), verifikasi via browser IAB `evaluate()` (bukan locator):
- Buat/atur dokumen contoh berisi satu sitasi `(Sari, 2023)` + dua entri pustaka.
- Tab **Analisis** → kartu **Format Sitasi & Referensi** menampilkan blok amber "Entri pustaka yang tidak pernah disitasi" berisi entri Wibowo; blok "Sitasi teks tanpa entri" kosong (tidak dirender).
- Pulihkan dokumen user setelah uji (pola insiden Tabel 2.1 — JANGAN pakai selector `.at(-1)`; simpan snapshot localStorage sebelum uji dan restore).

---

### Task 3: Unduh PDF (label + reset zoom print)

**Files:**
- Modify: `src/components/Header.tsx:259-269` (entri menu cetak)
- Modify: `src/index.css:147-152` (rule `.preview-scale` di `@media print`)

**Interfaces:**
- Consumes: `handlePrint` (sudah ada di Header) dan `@media print` yang sudah ada.
- Produces: entri menu "Unduh PDF"; pratinjau selalu tercetak pada zoom 1.

- [ ] **Step 1: Ganti label & icon entri menu**

Di `Header.tsx` blok tombol `handlePrint` (baris 259-269):
- Label: `Cetak / Simpan ke PDF` → **`Unduh PDF`**
- Sub-label: `Gunakan dialog cetak browser` → **`Ukuran asli 100% — pilih "Save as PDF" di dialog cetak`**
- Icon: `Printer` → `FileDown` (sudah diimport, `text-teal-600` agar seragam dengan entri Word). Import `Printer` dibuang bila tak terpakai lain.

- [ ] **Step 2: Reset zoom saat print di `index.css`**

Dalam blok `@media print` pada rule `.preview-scale` (baris 147-152), tambahkan `zoom: 1 !important;` — menghilangkan zoom inline (fit-to-width / preset user) sehingga PDF selalu 100%.

- [ ] **Step 3: Verifikasi CSS & UI**

- Browser: menu unduh menampilkan "Unduh PDF" dengan sub-label baru.
- `evaluate()`: scan `document.styleSheets` → rule `@media print` berisi selector `.preview-scale` dengan `zoom: 1 !important` (bukti reset zoom; hasil cetak final dikonfirmasi user sekali cetak manual).

---

### Task 4: Verifikasi akhir + commit comprehensif

- [ ] **Step 1: Suite & build**

Run: `pnpm vitest run && pnpm build`
Expected: semua PASS; build sukses.

- [ ] **Step 2: Sanity UI**

Browser: tab Analisis kartu sitasi menampilkan kedua blok temuan; menu unduh "Unduh PDF" ada. Pulihkan state dokumen user bila terubah.

- [ ] **Step 3: Satu commit comprehensif + push**

```bash
git add -A
git commit -m "feat: audit sitasi-pustaka dua arah, unduh PDF ukuran asli, sisip/edit tabel, riwayat dokumen, pedoman baru"
git push origin main
```

(Mencakup perubahan lama yang belum ter-commit: sisip/edit tabel, riwayat dokumen, redesign pedoman, copy beranda.)
