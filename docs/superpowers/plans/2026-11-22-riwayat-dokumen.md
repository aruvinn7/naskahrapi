# Riwayat Dokumen — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (inline). Tanpa commit (user commit sendiri saat mau).

**Goal:** Beberapa dokumen tersimpan dengan daftar Riwayat di sidebar — arsip otomatis saat dokumen baru dibuat, pulihkan/hapus dari sidebar, swap dua arah tanpa kehilangan.

**Architecture:** Util `docHistory.ts` (localStorage key `skripsi-rapi-history-v1`, batas 10 entri, fallback kuota: buang terlama → strip dataUrl gambar → lewati diam-diam); App menyimpan `history` state + `archiveCurrentDoc()`; AppSidebar menampilkan section Riwayat.

**Spec:** `docs/superpowers/specs/2026-11-22-riwayat-dokumen-design.md`

## Global Constraints

- Dokumen aktif tidak pernah hilang (arsip dulu sebelum replace/kosongkan).
- Dokumen kosong/blank tidak diarsipkan (guard rawText kosong & cover blank).
- Tanpa commit.

## Review Focus

- Swap dua arah tidak menduplikasi/menghilangkan entri. → browser Task 3.
- Guard dokumen kosong (blank template & hasil Kosongkan tidak masuk riwayat). → test Task 1.
- Quota penuh: entri terlama dikorbankan dulu, gambar besar di-strip, aktif aman. → test Task 1.

### Task 1: util `docHistory.ts` + tests (TDD)

Create: `src/utils/docHistory.ts`, `src/utils/__tests__/docHistory.test.ts`.
Interfaces: `HistoryEntry { id, name, savedAt, doc: ParsedDocument, config: DocumentConfig }`; `loadHistory()`, `saveHistory(entries): boolean` (quota fallback), `addToHistory(entries, doc, config): HistoryEntry[]` (guard kosong + dedup rawText identik + cap 10), `removeHistoryEntry(entries, id)`.
- [ ] test (RED): add memasukkan; dokumen kosong tak masuk; rawText identik tak diduplikasi; cap 10; quota → buang terlama; quota + dataUrl besar → dataUrl di-strip (jadi `data:stripped`); remove.
- [ ] implement → GREEN + build.

### Task 2: wiring App + sidebar

Modify: `src/App.tsx` (state history; archiveCurrentDoc; archive di handleProcessFromHome/handleFormatText/handleConfirmClear; handleRestoreHistory/handleDeleteHistory; props ke AppSidebar), `src/components/AppSidebar.tsx` (section Riwayat: daftar nama+tanggal, klik pulihkan, ✕ hapus, teks kosong), `src/components/ClearConfirmModal.tsx` (copy: dokumen diarsipkan ke riwayat).
- [ ] wiring + `pnpm test` + `pnpm build`.

### Task 3: verifikasi browser + ledger + memory

- [ ] Buat dokumen baru dari beranda → lama masuk riwayat; pulihkan swap dua arah; hapus entri; Kosongkan mengarsipkan; screenshots.
- [ ] `pnpm test` + `pnpm build`; ledger + memory.
