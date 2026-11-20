# Parser Robustness + Template Prompt AI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Parser menangani output AI beragam (hard-wrap Pandoc, simple-table, escape, heading lepas) tanpa kerusakan blok, plus fitur "Template Prompt AI" yang bisa disalin user ke AI lain.

**Architecture:** Semua perbaikan parser di `src/utils/aiCleaner.ts`: pre-pass `normalizePandocArtifacts()` (escape + tabel Pandoc → pipe) + perbaikan titik krusial di loop baris (regex list, merge baris lanjutan, heading `#` level-1 → section). Template prompt jadi konstanta di `src/utils/promptTemplate.ts` + panel lipat di `PasteModal`.

**Tech Stack:** React 18 + TypeScript + Vite 6; vitest (devDependency baru) untuk unit test parser.

**Spec:** `docs/superpowers/specs/2026-11-20-parser-robustness-prompt-template-design.md`

## Global Constraints

- Tidak ada dependensi runtime baru; hanya `vitest` sebagai devDependency.
- `parseRawDocument(rawText: string, config: DocumentConfig)` tetap satu-satunya pintu; signature tidak berubah.
- Tipe blok keluaran tetap: `paragraph`/`list_item`/`table`/`heading_*`/`daftar_pustaka_item`; tabel memakai `meta.header`/`meta.rows` (bentuk `string[][]`), sama dengan jalur pipe-table yang ada.
- Marker `**tebal**`/`*miring*` TIDAK dihapus di parser (dirender rich di pratinjau & DOCX) — by design.
- Baris murni dash satu run (`-{3,}`) tetap dianggap HR/section-breaker, bukan tabel.
- Komentar & copy UI berbahasa Indonesia, mengikuti gaya kode yang ada.

## Review Focus

1. Bullet `-`/`*`/`•` khas ChatGPT tetap jadi `list_item` — uji di Task 3.
2. URL ber-`--` (mis. `https://a--b.com`) tidak berubah jadi en-dash — uji negative-lookbehind di Task 2.
3. Sample bawaan (`SAMPLE_AI_RAW_TEXT`) tidak regresi — golden assertions di Task 8.
4. Entri Daftar Pustaka yang hard-wrap bergabung jadi satu entri, bukan pecah — uji di Task 4.
5. Tabel pipe markdown biasa tetap terdeteksi setelah normalisasi (regresi jalur lama) — uji di Task 5.

---

### Task 1: Normalisasi artefak Pandoc (T4 + T6) + setup vitest

**Files:**
- Modify: `src/utils/aiCleaner.ts` (fungsi baru + pemanggilan di `parseRawDocument`)
- Modify: `package.json` (script `test`, devDependency `vitest`)
- Create: `src/utils/__tests__/aiCleaner.normalize.test.ts`

**Interfaces:**
- Produces: `export function normalizePandocArtifacts(text: string): string` — dipanggil sebagai baris pertama pengolahan teks di `parseRawDocument` (setelah `cleanAiResiduals`, sebelum `split(/\r?\n/)`). Task 5 menambah konversi tabel di dalamnya.

- [ ] **Step 1: Setup vitest**

`pnpm add -D vitest`; tambah script `"test": "vitest run"` di package.json.

- [ ] **Step 2: Tulis test gagal**

```ts
import { describe, it, expect } from 'vitest';
import { normalizePandocArtifacts } from '../aiCleaner';

describe('normalizePandocArtifacts', () => {
  it('meng-unescape escape Pandoc', () => {
    expect(normalizePandocArtifacts('denda US\\$5 miliar')).toBe('denda US$5 miliar');
    expect(normalizePandocArtifacts('\\*bukan miring\\*')).toBe('*bukan miring*');
    expect(normalizePandocArtifacts('a\\_b \\#c \\[d\\] e\\\\f'))
      .toBe('a_b #c [d] e\\f');
  });
  it('membuang backtick kode', () => {
    expect(normalizePandocArtifacts('istilah `metaverse` populer')).toBe('istilah metaverse populer');
  });
  it('en-dash kontekstual, URL aman', () => {
    expect(normalizePandocArtifacts('periode 2016--2026')).toBe('periode 2016–2026');
    expect(normalizePandocArtifacts('lihat https://a--b.com/x')).toBe('lihat https://a--b.com/x');
  });
  it('membuang backslash lanjutan-baris di akhir baris', () => {
    expect(normalizePandocArtifacts('**Disusun untuk memenuhi tugas**\\\nMata Kuliah: ...'))
      .toBe('**Disusun untuk memenuhi tugas**\nMata Kuliah: ...');
  });
  it('baris dash utuh (HR tidak dirusak)', () => {
    expect(normalizePandocArtifacts('---\n\n-----')).toBe('---\n\n-----');
  });
});
```

Ditambah satu test integrasi: `parseRawDocument('Denda US\\$5 miliar.', config)` menghasilkan blok paragraf berisi `US$5` (bukan `US\$5`).

- [ ] **Step 3: Jalankan, pastikan gagal** — `pnpm test` → FAIL (fungsi tidak ada).

- [ ] **Step 4: Implementasi di `aiCleaner.ts`**

Urutan per baris: (1) buang `\` tunggal di akhir baris (hard break); (2) unescape `\\`→`\`, lalu `\$ \* \_ \# \[ \]` (pasangan, via satu regex `\\([\\$*_#\[\]])` → `$1`); (3) buang backtick pasangan; (4) en-dash `/(?<![:\/])([A-Za-z0-9])--([A-Za-z0-9])/g` → `$1–$2` dengan **skip baris yang trim-nya match `^[-=_]{3,}$`**. Panggil `normalizePandocArtifacts` di `parseRawDocument`.

- [ ] **Step 5: `pnpm test` → PASS**

- [ ] **Step 6: Commit** — `git add package.json pnpm-lock.yaml src/utils/aiCleaner.ts src/utils/__tests__/ && git commit -m "feat: normalize pandoc escapes, en-dash, and hard-break artifacts"`

### Task 2: Regex penanda list diperketat (T1)

**Files:**
- Modify: `src/utils/aiCleaner.ts` (baris listMatch, ~340)
- Create: `src/utils/__tests__/aiCleaner.list.test.ts`

**Interfaces:** tidak ada API baru; hanya perilaku `list_item`.

- [ ] **Step 1: Test gagal**

```ts
import { describe, it, expect } from 'vitest';
import { parseRawDocument } from '../aiCleaner';
import { DEFAULT_CONFIG_MAKALAH } from './helpers'; // config minimal template 'makalah'

describe('deteksi list', () => {
  it('"Kata. kalimat..." TIDAK dianggap list (bug utama)', () => {
    const doc = parseRawDocument('## 1.1 Latar Belakang\n\nSalah satu peristiwa paling dikenal adalah skandal Cambridge\nAnalytica. Komisi Perdagangan Federal menyatakan pelanggaran.', cfg);
    const types = doc.sections.flatMap(s => s.blocks.map(b => b.type));
    expect(types).not.toContain('list_item');
  });
  it('penanda sah tetap jadi list_item', () => {
    for (const marker of ['1.', '1)', 'a.', 'a)', '-', '*', '•']) {
      const doc = parseRawDocument(`${marker} item pertama`, cfg);
      expect(doc.sections.some(s => s.blocks.some(b => b.type === 'list_item'))).toBe(true);
    }
  });
  it('"A. Latar Belakang" tetap heading_2 sub-bab', () => {
    const doc = parseRawDocument('A. Latar Belakang', cfg);
    expect(doc.sections.some(s => s.blocks.some(b => b.type === 'heading_2'))).toBe(true);
  });
});
```

Helper `./helpers.ts`: export `DEFAULT_CONFIG_MAKALAH` = duplikat DEFAULT_CONFIG dari App (margin 4-3-3-3, TNR 12, spasi 1.5, rules semua true) — buat file `src/utils/__tests__/helpers.ts` di task ini.

- [ ] **Step 2: FAIL** — test pertama gagal (`Analytica.` muncul sebagai list_item).

- [ ] **Step 3: Ganti regex**

`withoutHash.match(/^(\d+[.)]|[a-z][.)]|[-*•])\s+([\s\S]+)$/)` — angka bebas, huruf kecil tunggal saja, strip/bintang/bullet. (Huruf besar `A.` tetap masuk jalur subMatch lebih dulu.)

- [ ] **Step 4: PASS** — `pnpm test`

- [ ] **Step 5: Commit** — `feat: restrict list markers to stop mid-sentence splits`

### Task 3: Gabung baris lanjutan list & pustaka (T2)

**Files:**
- Modify: `src/utils/aiCleaner.ts` (loop baris)
- Create: `src/utils/__tests__/aiCleaner.continuation.test.ts`

**Interfaces:** internal: flag `lastListBlockId: string | null` di scope loop (di-set saat push `list_item`/`daftar_pustaka_item`, di-null-kan saat baris kosong/commit section/heading/caption/tabel).

- [ ] **Step 1: Test gagal**

```ts
it('list hard-wrap Pandoc bergabung', () => {
  const doc = parseRawDocument('1.  Apa yang menyebabkan Meta menjadi salah satu perusahaan\n    paling kontroversial dalam satu dekade terakhir?', cfg);
  const items = doc.sections.flatMap(s => s.blocks.filter(b => b.type === 'list_item'));
  expect(items).toHaveLength(1);
  expect(items[0].formattedContent).toContain('perusahaan paling kontroversial dalam satu dekade terakhir?');
});
it('entri pustaka hard-wrap bergabung jadi satu entri', () => {
  const doc = parseRawDocument('# DAFTAR PUSTAKA\n\nFederal Trade Commission. (2019). *FTC imposes penalty\n    on Facebook*.', cfg);
  const entries = doc.sections.flatMap(s => s.blocks.filter(b => b.type === 'daftar_pustaka_item'));
  expect(entries).toHaveLength(1);
});
it('paragraf biasa ter-indent tetap wajar (tanpa list sebelumnya)', () => {
  const doc = parseRawDocument('Kalimat pembuka.\n    Kalimat lanjutan paragraf.', cfg);
  expect(doc.sections.flatMap(s => s.blocks).every(b => b.type === 'paragraph' || b.type.startsWith('heading'))).toBe(true);
});
```

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Implementasi**

Sebelum jalur "Regular paragraph continuation": jika `sourceIndent >= 2 && bufferParagraph kosong && lastListBlockId` cocok dengan blok terakhir `currentSection.blocks` bertipe `list_item`/`daftar_pustaka_item` → append ` ' ' + withoutHash` ke `formattedContent`, `rawContent`, dan `meta.text` (bila ada), `addWords`, `continue`. Set/reset flag `lastListBlockId` di semua titik push list & di baris kosong/commit.

- [ ] **Step 4: PASS**

- [ ] **Step 5: Commit** — `feat: merge hard-wrapped list and bibliography continuation lines`

### Task 4: Tabel Pandoc simple-table → pipe (T3)

**Files:**
- Modify: `src/utils/aiCleaner.ts` (`convertSimpleTables` dipanggil di awal `normalizePandocArtifacts`, SEBELUM unescape/en-dash)
- Create: `src/utils/__tests__/aiCleaner.pandocTable.test.ts` (fixture snippet inline)

**Interfaces:**
- Produces: `function convertSimpleTables(text: string): string` (internal/exported untuk test) — baris separator multi-run `^(\s*-+\s*){2,}$` menentukan batas kolom; header = baris di atasnya sampai baris kosong/border `^-{3,}$`; body = baris di bawahnya sampai baris kosong/border/EOF; baris logis baru dimulai saat kolom-0 terisi; wrap digabung per kolom dengan spasi; output baris pipe `| a | b |`.

- [ ] **Step 1: Test gagal**

Fixture snippet tabel 2.3 dokumen Meta (border, header wrap 3 baris, separator 4 run, 5 baris data wrap). Assertions:
- `parseRawDocument(snippet, cfg)` menghasilkan ≥1 blok `table` dengan `meta.header` length 4 dan `meta.rows` length 5;
- sel wrap bergabung: `meta.rows[0][1]` === `'Jejaring sosial, grup, halaman, dan berbagi konten'`;
- tidak ada blok paragraf yang mengandung `---`.
Test kedua (regresi Review Focus #5): tabel pipe `| A | B |` + `|---|---|` + 1 baris data tetap jadi blok `table`.
Test ketiga (fallback): region dashed tanpa baris body valid → tetap paragraf, tanpa crash.

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Implementasi `convertSimpleTables`**

Scan baris; saat ketemu separator multi-run, kumpulkan region (header di atas sampai blank/border, body di bawah sampai blank/border); slice per batas kolom dari run separator; header kosong (separator tepat setelah blank/border) → biarkan teks apa adanya (fallback); hasil < 1 baris body → fallback. Ganti region dengan baris pipe. Panggil di awal `normalizePandocArtifacts`.

- [ ] **Step 4: PASS**

- [ ] **Step 5: Commit** — `feat: convert pandoc simple tables to pipe tables`

### Task 5: Heading `#` level-1 jadi section sendiri (T5)

**Files:**
- Modify: `src/utils/aiCleaner.ts` (cabang mdHeading)
- Create: `src/utils/__tests__/aiCleaner.headingSection.test.ts`

**Interfaces:** tidak ada API baru; perilaku section.

- [ ] **Step 1: Test gagal**

```ts
it('# CATATAN PENYUSUNAN setelah DAFTAR PUSTAKA jadi section sendiri', () => {
  const doc = parseRawDocument('# DAFTAR PUSTAKA\n\nFTC. (2019). *Penalty*.\n\n# CATATAN PENYUSUNAN\n\n1.  Catatan pertama.', cfg);
  const catatan = doc.sections.find(s => s.title === 'CATATAN PENYUSUNAN');
  expect(catatan).toBeDefined();
  expect(catatan!.blocks.some(b => b.type === 'list_item')).toBe(true);
  const pustaka = doc.sections.find(s => s.type === 'daftar_pustaka')!;
  expect(pustaka.blocks.filter(b => b.type === 'daftar_pustaka_item')).toHaveLength(1);
});
it('# MAKALAH baris pertama tetap tinggal di section cover', () => {
  const doc = parseRawDocument('# MAKALAH\n\n## JUDUL PENELITIAN CONTOH PANJANG', cfg);
  expect(doc.sections[0].type).toBe('cover');
  expect(doc.sections[0].blocks.length).toBeGreaterThanOrEqual(2);
});
```

- [ ] **Step 2: FAIL** (test pertama: CATATAN nyasar di daftar_pustaka)

- [ ] **Step 3: Implementasi**

Di cabang mdHeading: jika `level === 1 && currentSection.type !== 'cover'` → `flushParagraph(); commitSection(headingText, 'bab');` lalu push blok `heading_1` (title = headingText) ke section baru. Level 2–3 perilaku lama.

- [ ] **Step 4: PASS**

- [ ] **Step 5: Commit** — `feat: level-1 md heading opens its own section`

### Task 6: Template Prompt AI (T7)

**Files:**
- Create: `src/utils/promptTemplate.ts`
- Modify: `src/components/PasteModal.tsx`
- Create: `src/utils/__tests__/promptTemplate.test.ts`

**Interfaces:**
- Produces: `export function buildAiPromptTemplate(): string` — teks prompt Indonesia dengan placeholder `[TOPIK]`, `[JENIS DOKUMEN]`; aturan 1:1 dengan parser: `# BAB I JUDUL` / `## 1.1 Sub-bab` / `### 1.1.1`, satu paragraf satu baris (tanpa wrap), list `1.`/`a.`/`-`, tabel pipe `| A | B |` + `|---|---|`, caption `Tabel 2.1: Judul`, pustaka satu entri per baris, TANPA basa-basi pembuka/penutup, TANPA catatan penyusunan.

- [ ] **Step 1: Test gagal** — `buildAiPromptTemplate()` mengandung `# BAB`, `## 1.1`, `|---`, `Tabel 2.1:`, `DAFTAR PUSTAKA`, dan frasa larang basa-basi (mis. `jangan dibubuhi kalimat pembuka`).

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Implementasi konstanta + UI**

`promptTemplate.ts`: fungsi mengembalikan template (string literal, ±30 baris). PasteModal: panel lipat (useState, default tertutup) di bawah judul modal — judul "Template Prompt AI", ringkas 1 baris kegunaan, tombol `Salin Template` (ikon Copy lucide) → `navigator.clipboard.writeText(buildAiPromptTemplate())` + label berubah `Tersalin!` 2 detik (try/catch: fallback `document.execCommand` tidak perlu, cukup toast error). Gaya mengikuti kontrol modal yang ada (teks-xs, border-slate, teal).

- [ ] **Step 4: PASS (`pnpm test`) + `npx tsc --noEmit` bersih**

- [ ] **Step 5: Commit** — `feat: add copyable AI prompt template to paste modal`

### Task 7: Integrasi penuh + regresi + E2E browser

**Files:**
- Create: `src/utils/__tests__/fixtures/meta-pandoc.md` (salinan `D:\Download\Installer\Makalah_Kontroversi_Meta_Platforms.md`)
- Create: `src/utils/__tests__/aiCleaner.integration.test.ts`

**Interfaces:** — .

- [ ] **Step 1: Test integrasi gagal→lulus**

Baca fixture via `readFileSync(new URL('./fixtures/meta-pandoc.md', import.meta.url), 'utf8')`; assertions:
- urutan section: cover, ABSTRAK, BAB I–V, DAFTAR PUSTAKA, CATATAN PENYUSUNAN (9 section);
- tepat 8 blok `table`, semuanya punya `meta.header`;
- tidak ada blok yang mengandung `\$` atau `\*`;
- `daftar_pustaka_item` = 7;
- item pertama Rumusan Masalah mengandung `paling kontroversial dalam satu dekade terakhir?` (bukan pecahan);
- golden regresi `SAMPLE_AI_RAW_TEXT`: section ≥ 5, ada `DAFTAR PUSTAKA`, tidak ada blok mengandung `#` di awal formattedContent.

- [ ] **Step 2: Implementasi bila ada kebocoran** dari Task 1–6 (perbaiki di titik terkait).

- [ ] **Step 3: `pnpm test` + `npx tsc --noEmit` + `pnpm build` semua hijau**

- [ ] **Step 4: E2E browser** (dev server jalan): buka app → Tempel Teks AI → panel "Template Prompt AI" terbuka & tombol Salin berfungsi → tempel isi fixture → Format → daftar section memuat CATATAN PENYUSUNAN, tabel ter-render sebagai tabel, zoom 100% BAB III tabel terlihat rapi. (Data lama user ada backup di `backup/state-sebelum-uji-2026-11-20.json`.)

- [ ] **Step 5: Commit** — `test: full pandoc document integration coverage`
