# Korektor Bahasa Asing (PUEBI) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (inline, sesuai preferensi user). Steps pakai checkbox.

**Goal:** Kartu "Korektor Bahasa Asing (PUEBI)" di tab Analisis — 3 lapis: istilah umum terkurasi (fix-all), kandidat dari kamus KBBI (per istilah), input manual.

**Architecture:** Util `foreignTermCorrector.ts` (deteksi + pembungkus `*…*` memakai `parseInlineSegments` agar tidak merusak format yang sudah ada), aset `src/assets/kbbi-words.txt` (114 ribu kata, dimuat lambat), handler generik di App, kartu UI meniru kartu KBBI.

**Tech Stack:** React + TypeScript, vitest, aset txt Vite (`?url` + fetch).

**Spec:** `docs/superpowers/specs/2026-11-21-korektor-bahasa-asing-design.md`

## Global Constraints

- Pembungkusan italic memakai `parseInlineSegments`/`inlineFormat.ts` — segmen yang sudah bold/italic TIDAK disentuh (tanpa dobel/mangling).
- Huruf asli dipertahankan; operasi idempoten.
- Kandidat kamus TIDAK auto-fix — hanya per istilah via tombol.
- Merek/kapital awal, singkatan kapital-semua, kata ≤ 2 huruf tersaring dari kandidat.
- Daftar terkurasi: 25 istilah di spec; extensible.

## Review Focus

- Round-trip `parseInlineSegments` → rebuild: `***bold italic***`, `**bold**`, `*italic*` tidak rusak. → test Task 1.
- Kata yang muncul kadang kapital (nama) tidak jadi kandidat. → test Task 1.
- Aset kamus ada & benar ("zaman" ada, "software" tidak). → test Task 1 (baca via fs).
- Badge Analisis ikut bertambah. → verifikasi browser Task 3.

---

### Task 1: Aset kamus + util + tests

**Files:**
- Create: `src/assets/kbbi-words.txt` (dari `.superpowers/tmp-kbbi/kbbi.txt`, filter `[a-z]+`, sort -u)
- Create: `src/utils/foreignTermCorrector.ts`
- Create: `src/utils/__tests__/foreignTermCorrector.test.ts`

**Interfaces (produces):**
- `FOREIGN_TERMS: string[]` (26 istilah, lihat spec)
- `detectForeignTermIssues(text: string): { term: string; count: number }[]` — pada segmen non-italic
- `italicizeTerm(text: string, term: string): { text: string; totalReplaced: number }` — wrap `*…*` pada segmen plain saja
- `detectForeignCandidates(text: string, kbbiWords: ReadonlySet<string>): { word: string; count: number }[]`

- [ ] Step 1: generate aset (`grep -xE "[a-z]+" … | sort -u`), cek jumlah baris ≈ 114 ribu
- [ ] Step 2: tulis test (RED): deteksi frasa/baris baru/sudah-miring; wrap idempoten + huruf asli; round-trip bold/italic; kandidat (baku tidak kena, asing kena, kapital tersaring); aset via `fs` (zaman ada, software tidak)
- [ ] Step 3: jalankan test → RED
- [ ] Step 4: implement util → GREEN penuh (`pnpm test`)

### Task 2: Handler App + kartu UI

**Files:**
- Modify: `src/App.tsx` (import util; `handleItalicizeTerm(term)`, `handleItalicizeCuratedAll()`; props ke RightSidebar)
- Modify: `src/components/RightSidebar.tsx` (props baru; kartu setelah kartu KBBI; lazy load `kbbi-words.txt?url` via useEffect+fetch; badge)

- [ ] Step 1: handler App (meniru handleFixAllKbbi; notify `${n} istilah dimiringkan`)
- [ ] Step 2: kartu UI 3 bagian + badge; loading state kandidat ("memuat kamus…" / sembunyikan bila gagal)
- [ ] Step 3: `pnpm test` + `pnpm build` hijau

### Task 3: Verifikasi browser + ledger

- [ ] Analisis: kartu tampil, daftar istilah umum & kandidat sesuai isi dokumen; badge bertambah
- [ ] Klik satu [Miringkan] kandidat → pratinjau miring; klik "Miringkan semua istilah umum" → miring di pratinjau; cek hasil tetap benar setelah selesai (idempoten)
- [ ] Input manual satu istilah → bekerja
- [ ] Ledger + memory update
