# Pengaturan Jarak Nomor–Judul Sub-bab — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menambahkan pengaturan posisi judul sub-bab (cm) — judul h2/h3 bernomor selalu mulai di posisi tetap dari margin kiri, di pratinjau dan ekspor DOCX.

**Architecture:** Satu helper `splitHeadingNumberTitle` di `formatEngine.ts` dipakai bersama pratinjau dan ekspor agar hasil identik. Nilai disimpan di `HeadingRules.numberTitleGapCm` (default 0 = perilaku lama), di-clamp di `sanitizeConfig`, di-input lewat `RuleField` di panel Format → Gaya judul.

**Tech Stack:** React + TypeScript, vitest, library `docx` (sudah ada).

**Spec:** `docs/superpowers/specs/2026-11-21-jarak-nomor-judul-subbab-design.md`

## Global Constraints

- Logika pemecah nomor–judul hanya ada di `formatEngine.ts`; pratinjau & ekspor hanya mengonsumsi (DRY, hasil identik).
- `numberTitleGapCm` default `0` = "mengikuti spasi teks sumber" — dokumen/preset lama tidak boleh berubah tampilan.
- Tanpa toggle rule baru di tab Aturan; nilai 0 adalah posisi mati.
- Clamp nilai 0–5 cm di `sanitizeConfig` (App.tsx), mengikuti pola `hangingIndent`.
- Copy UI bahasa Indonesia.
- Test: `pnpm test` (vitest run) harus hijau penuh di setiap akhir task.
- **Catatan commit:** working tree sudah berisi WIP lama (belum di-commit) di file yang sama (App.tsx, RightSidebar.tsx, docxExporter.ts, helpers.ts, dll.). Langkah commit di bawah memakai `git add` eksplisit per file — WIP lama di file itu akan ikut masuk. Jika user memilih tanpa commit saat handoff, lewati semua langkah commit.

## Review Focus

- Spasi ganda dari teks sumber (`"2.6  Dampak"`) — split tetap benar, judul tanpa spasi depan. → Test Task 1.
- Nomor romawi `II.3` (hasil konversi `h2Numbering: 'roman'`) — tetap terpecah & kena tab. → Test Task 1 & Task 4.
- Preset lama di localStorage tanpa field baru — kembali ke default 0, tidak crash. → Test Task 2.
- Judul tanpa nomor (`"Kesimpulan"`) saat gap aktif — dirender utuh satu baris, tanpa span/tab, tidak hilang. → Test Task 1 (null) + cek manual Task 3.
- `h2.allCaps` aktif — uppercase diterapkan per run; nomor & judul tetap terpecah, bukan satu teks. → Cek manual Task 3 & 4 (default h2 allCaps false).

---

### Task 1: Tipe, default, dan helper `splitHeadingNumberTitle`

**Files:**
- Modify: `src/types/document.ts:22-33` (interface `HeadingRules`)
- Modify: `src/utils/formatEngine.ts:171-175` (`DEFAULT_HEADING_RULES`) + tambah fungsi baru
- Modify: `src/utils/__tests__/helpers.ts` (literal `headingRules` — tambah field)
- Modify: `src/utils/__tests__/aiCleaner.normalize.test.ts:14-20` (literal `headingRules` — tambah field)
- Create: `src/utils/__tests__/formatEngine.numberTitleGap.test.ts`

**Interfaces:**
- Produces: `splitHeadingNumberTitle(text: string): { number: string; title: string } | null` (dari `formatEngine.ts`, dipakai Task 3 & 4)
- Produces: `HeadingRules.numberTitleGapCm: number` (dipakai semua task berikut)

- [ ] **Step 1: Write the failing test**

```ts
// src/utils/__tests__/formatEngine.numberTitleGap.test.ts
import { describe, it, expect } from 'vitest';
import { splitHeadingNumberTitle } from '../formatEngine';

describe('splitHeadingNumberTitle', () => {
  it('memecah "2.6 Dampak Lingkungan" menjadi nomor + judul', () => {
    expect(splitHeadingNumberTitle('2.6 Dampak Lingkungan dari Konsumsi Air AI')).toEqual({
      number: '2.6',
      title: 'Dampak Lingkungan dari Konsumsi Air AI'
    });
  });
  it('spasi ganda dari teks sumber tetap terpecah', () => {
    expect(splitHeadingNumberTitle('2.6  Dampak')?.title).toBe('Dampak');
  });
  it('menangani nomor tiga tingkat dan romawi', () => {
    expect(splitHeadingNumberTitle('2.6.1 Penggunaan Air')).toEqual({ number: '2.6.1', title: 'Penggunaan Air' });
    expect(splitHeadingNumberTitle('II.3 Metodologi')).toEqual({ number: 'II.3', title: 'Metodologi' });
  });
  it('judul tanpa nomor atau tanpa judul mengembalikan null', () => {
    expect(splitHeadingNumberTitle('Kesimpulan')).toBeNull();
    expect(splitHeadingNumberTitle('2.6')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/utils/__tests__/formatEngine.numberTitleGap.test.ts`
Expected: FAIL — `splitHeadingNumberTitle` tidak ada (dan error tipe field baru).

- [ ] **Step 3: Implement**

1. `src/types/document.ts` — di interface `HeadingRules` (setelah `h2Numbering`):
   ```ts
   /** Posisi judul sub-bab dari margin kiri (cm); 0 = mengikuti spasi teks sumber. */
   numberTitleGapCm: number;
   ```
2. `src/utils/formatEngine.ts` — `DEFAULT_HEADING_RULES` ditambah `numberTitleGapCm: 0`; tambahkan fungsi eksport:
   ```ts
   export function splitHeadingNumberTitle(text: string): { number: string; title: string } | null {
     const match = text.trim().match(/^(\d+(?:\.\d+)*|[IVXLCDM]+\.\d+)\s+(.+)$/);
     return match ? { number: match[1], title: match[2].trim() } : null;
   }
   ```
3. Tambahkan `numberTitleGapCm: 0` ke literal `headingRules` di `src/utils/__tests__/helpers.ts` dan `src/utils/__tests__/aiCleaner.normalize.test.ts` (wajib — tanpa itu tsc gagal).

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test`
Expected: PASS seluruh suite (mengonfirmasi literal helper/normalize sudah lengkap).

- [ ] **Step 5: Commit**

```bash
git add src/types/document.ts src/utils/formatEngine.ts src/utils/__tests__/helpers.ts src/utils/__tests__/aiCleaner.normalize.test.ts src/utils/__tests__/formatEngine.numberTitleGap.test.ts
git commit -m "feat: tipe numberTitleGapCm + helper splitHeadingNumberTitle"
```

---

### Task 2: Sanitize clamp + passthrough effectiveConfig

**Files:**
- Modify: `src/App.tsx:97-104` (`sanitizeConfig` — merge `headingRules`; tambah `export` pada fungsinya)
- Modify: `src/utils/__tests__/effectiveConfig.headingSpacing.test.ts` (tambah satu `it`)
- Create: `src/utils/__tests__/sanitizeConfig.numberTitleGap.test.ts`

**Interfaces:**
- Consumes: `HeadingRules.numberTitleGapCm` (Task 1)
- Produces: `sanitizeConfig` diekspor dari `App.tsx` (dipakai test ini)

- [ ] **Step 1: Write the failing test**

```ts
// src/utils/__tests__/sanitizeConfig.numberTitleGap.test.ts
import { describe, it, expect } from 'vitest';
import { sanitizeConfig } from '../../App';

describe('sanitize numberTitleGapCm', () => {
  it('menjepit nilai di luar 0–5', () => {
    expect(sanitizeConfig({ headingRules: { numberTitleGapCm: 8 } }).headingRules.numberTitleGapCm).toBe(5);
    expect(sanitizeConfig({ headingRules: { numberTitleGapCm: -1 } }).headingRules.numberTitleGapCm).toBe(0);
  });
  it('nilai valid lolos, field hilang kembali ke default 0', () => {
    expect(sanitizeConfig({ headingRules: { numberTitleGapCm: 1.27 } }).headingRules.numberTitleGapCm).toBe(1.27);
    expect(sanitizeConfig({}).headingRules.numberTitleGapCm).toBe(0);
  });
});
```

Dan tambah `it` di `effectiveConfig.headingSpacing.test.ts`:

```ts
it('posisi judul sub-bab diteruskan ke effective config', () => {
  const config = {
    ...DEFAULT_CONFIG_MAKALAH,
    headingRules: { ...DEFAULT_CONFIG_MAKALAH.headingRules, numberTitleGapCm: 1.27 }
  };
  expect(getEffectiveConfig(config).headingRules.numberTitleGapCm).toBe(1.27);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/utils/__tests__/sanitizeConfig.numberTitleGap.test.ts src/utils/__tests__/effectiveConfig.headingSpacing.test.ts`
Expected: FAIL — `sanitizeConfig` belum diekspor / clamp belum ada. (Test passthrough `getEffectiveConfig` mungkin sudah hijau karena hanya spread — tetap pertahankan sebagai pengunci perilaku.)

- [ ] **Step 3: Implement**

Di `sanitizeConfig` (App.tsx), ganti blok `headingRules` menjadi:

```ts
headingRules: {
  ...DEFAULT_CONFIG.headingRules,
  ...(raw.headingRules || {}),
  numberTitleGapCm:
    typeof raw.headingRules?.numberTitleGapCm === 'number' &&
    Number.isFinite(raw.headingRules.numberTitleGapCm)
      ? Math.min(5, Math.max(0, raw.headingRules.numberTitleGapCm))
      : DEFAULT_CONFIG.headingRules.numberTitleGapCm,
  h1: { ...DEFAULT_CONFIG.headingRules.h1, ...((raw.headingRules || {}).h1 || {}) },
  h2: { ...DEFAULT_CONFIG.headingRules.h2, ...((raw.headingRules || {}).h2 || {}) },
  h3: { ...DEFAULT_CONFIG.headingRules.h3, ...((raw.headingRules || {}).h3 || {}) }
},
```

Ubah `function sanitizeConfig(` → `export function sanitizeConfig(`. `getEffectiveConfig` tidak perlu perubahan (spread `headingRules` meneruskan field).

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test`
Expected: PASS penuh.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/utils/__tests__/sanitizeConfig.numberTitleGap.test.ts src/utils/__tests__/effectiveConfig.headingSpacing.test.ts
git commit -m "feat: sanitize & passthrough numberTitleGapCm"
```

---

### Task 3: Pratinjau h2 & h3 mengikuti posisi judul

**Files:**
- Modify: `src/components/A4PaperPreview.tsx:688-708` (cabang `heading_2`) dan `:713-734` (cabang `heading_3`)

**Interfaces:**
- Consumes: `splitHeadingNumberTitle` (Task 1), `effective.headingRules.numberTitleGapCm` (Task 2)

- [ ] **Step 1: Implement di cabang `heading_2`**

Ganti `{renderInline(text)}` pada elemen `<h3>` dengan:

```tsx
{gap > 0 && parts ? (
  <>
    <span style={{ display: 'inline-block', minWidth: `${gap}cm` }}>
      {renderInline(parts.number)}
    </span>
    {renderInline(parts.title)}
  </>
) : (
  renderInline(text)
)}
```

dengan di atas cabang:

```tsx
const gap = hr.numberTitleGapCm;
const parts = gap > 0 ? splitHeadingNumberTitle(text) : null;
```

(`text` adalah hasil `formatSubHeadingNumber(item.text, hr.h2Numbering)` yang sudah ada; `splitHeadingNumberTitle` ditambahkan ke import dari `../utils/formatEngine`.)

- [ ] **Step 2: Implement pola sama di cabang `heading_3`**

Sama persis, dengan `const parts = gap > 0 ? splitHeadingNumberTitle(item.text) : null;` (h3 tidak melalui konversi romawi saat ini) pada elemen `<h4>`.

- [ ] **Step 3: Run test to verify nothing breaks**

Run: `pnpm test`
Expected: PASS (unit test tidak mengeksekusi komponen; ini menjaga regresi modul util).

- [ ] **Step 4: Verifikasi visual manual**

Run: `pnpm dev` (cek port aktual di log — 5173 bisa terpakai). Lewat browser: buka editor, tempel teks berisi `2.6 Dampak Lingkungan dari Konsumsi Air AI` dan `2.10 Penanganan Alternatif` di bawah BAB, atur **Format → Gaya judul → Posisi judul = 1.27**. Expected: judul "Dampak…" dan "Penanganan…" mulai rata di posisi sama; kembali ke 0 → tampilan persis seperti semula. Judul tanpa nomor (mis. "Kesimpulan") tampil utuh satu baris.

- [ ] **Step 5: Commit**

```bash
git add src/components/A4PaperPreview.tsx
git commit -m "feat: pratinjau mengikuti posisi judul sub-bab"
```

---

### Task 4: Ekspor DOCX dengan tab stop

**Files:**
- Modify: `src/utils/docxExporter.ts:46` (import), `:130-181` (`headingParagraph` cabang `level 2 | 3`)
- Create: `src/utils/__tests__/docxExporter.numberTitleGap.test.ts`

**Interfaces:**
- Consumes: `splitHeadingNumberTitle` (Task 1), `hr.numberTitleGapCm` lewat `typography.heading` (Task 2)
- Note: `CM_TO_TWIP = 567` sudah ada di file (baris 55); `cmToTwip(1.27) === 720`.

- [ ] **Step 1: Write the failing test**

```ts
// src/utils/__tests__/docxExporter.numberTitleGap.test.ts
import { describe, it, expect } from 'vitest';
import { Packer } from 'docx';
import { buildDocxDocument } from '../docxExporter';
import { parseRawDocument } from '../aiCleaner';
import { DEFAULT_CONFIG_MAKALAH } from './helpers';

const RAW = ['BAB II METODOLOGI', '2.6 Dampak Lingkungan dari Konsumsi Air AI', 'Isi paragraf pembuka.'].join('\n');

describe('ekspor DOCX posisi judul sub-bab', () => {
  it('menambah tab stop pada posisi cm saat gap > 0', async () => {
    const config = {
      ...DEFAULT_CONFIG_MAKALAH,
      headingRules: { ...DEFAULT_CONFIG_MAKALAH.headingRules, numberTitleGapCm: 1.27 }
    };
    const xml = await Packer.pack(buildDocxDocument(parseRawDocument(RAW, config), config), 'string');
    expect(xml).toContain('w:pos="720"'); // 1.27 cm × 567 ≈ 720 twip
    expect(xml).toContain('<w:tab/>');
  });
  it('mode romawi tetap kena tab stop', async () => {
    const config = {
      ...DEFAULT_CONFIG_MAKALAH,
      headingRules: {
        ...DEFAULT_CONFIG_MAKALAH.headingRules,
        numberTitleGapCm: 1.27,
        h2Numbering: 'roman' as const
      }
    };
    const xml = await Packer.pack(buildDocxDocument(parseRawDocument(RAW, config), config), 'string');
    expect(xml).toContain('w:pos="720"');
  });
  it('gap 0 tidak menambah tab stop', async () => {
    const xml = await Packer.pack(buildDocxDocument(parseRawDocument(RAW, DEFAULT_CONFIG_MAKALAH), DEFAULT_CONFIG_MAKALAH), 'string');
    expect(xml).not.toContain('w:pos="720"');
  });
});
```

(Catatan: `parseRawDocument` mengubah `2.6 Dampak…` menjadi blok `heading_2` di bawah BAB — pola parsing lihat `aiCleaner.signatureToc.test.ts`.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/utils/__tests__/docxExporter.numberTitleGap.test.ts`
Expected: FAIL — test 1 & 2 gagal karena heading dirender satu run tanpa tab stop.

- [ ] **Step 3: Implement di `headingParagraph`**

1. Tambah ke import `docx`: `Tab`, `TabStopType`; tambah import `splitHeadingNumberTitle` dari `./formatEngine`.
2. Ganti cabang `else` (level 2/3, baris ~157-160):

```ts
} else {
  const display = level === 2 ? formatSubHeadingNumber(text, hr.h2Numbering) : text;
  const parts = hr.numberTitleGapCm > 0 ? splitHeadingNumberTitle(display) : null;
  children = parts
    ? [
        new TextRun(runOptions(parts.number)),
        new TextRun({ children: [new Tab()], font: typography.font, size }),
        new TextRun(runOptions(parts.title))
      ]
    : [new TextRun(runOptions(display))];
}
```

3. Tambahkan tab stop pada `Paragraph` yang dikembalikan (hanya bila dipakai):

```ts
const tabStops =
  level > 1 && hr.numberTitleGapCm > 0
    ? [{ type: TabStopType.LEFT, position: cmToTwip(hr.numberTitleGapCm) }]
    : undefined;
```

lalu `new Paragraph({ heading: …, alignment: …, spacing: …, tabStops, children })`. Deklarasikan `parts` di scope luar cabang `else` atau hitung ulang untuk `tabStops` — pilih satu bentuk agar tidak dobel logika.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test`
Expected: PASS penuh (termasuk test lama — pastikan test `aiCleaner.integration` yang mengeksport docx tetap hijau).

- [ ] **Step 5: Verifikasi file Word**

Jalankan sekali lewat UI dev server (atau script kecil): export docx dengan gap 1.27, buka hasilnya — judul sub-bab tampil dengan judul rata di posisi yang sama seperti pratinjau.

- [ ] **Step 6: Commit**

```bash
git add src/utils/docxExporter.ts src/utils/__tests__/docxExporter.numberTitleGap.test.ts
git commit -m "feat: ekspor DOCX tab stop posisi judul sub-bab"
```

---

### Task 5: Input UI di panel Format + verifikasi menyeluruh

**Files:**
- Modify: `src/components/RightSidebar.tsx:864-886` (setelah label "Nomor sub-bab", sebelum `<p>` penjelas)

**Interfaces:**
- Consumes: `config.headingRules.numberTitleGapCm` (Task 1–2), komponen `RuleField` yang sudah ada di file (baris 81)

- [ ] **Step 1: Tambah input**

Setelah `</label>` "Nomor sub-bab" (sebelum penutup `</div>` grid, baris ~880):

```tsx
<RuleField
  label="Posisi judul"
  value={config.headingRules.numberTitleGapCm}
  suffix="cm"
  min={0}
  max={5}
  step={0.1}
  onChange={(v) =>
    updateConfig({
      headingRules: { ...config.headingRules, numberTitleGapCm: v }
    })
  }
/>
```

Tambahkan satu kalimat ke `<p>` penjelas (baris ~882): "Posisi judul mengatur jarak nomor ke judul sub-bab dari margin kiri; 0 cm mengikuti spasi teks asli."

- [ ] **Step 2: Run test to verify it passes**

Run: `pnpm test`
Expected: PASS penuh.

- [ ] **Step 3: Verifikasi build & visual akhir**

Run: `pnpm build` — Expected: sukses tanpa error tipe.
Run: `pnpm dev` → end-to-end di browser: ubah "Posisi judul" ke 1.27 → pratinjau berubah langsung; ekspor DOCX → hasil Word sama dengan pratinjau; refresh halaman (autosave) → nilai bertahan; preset lama tanpa field → 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/RightSidebar.tsx
git commit -m "feat: input posisi judul sub-bab di panel Format"
```
