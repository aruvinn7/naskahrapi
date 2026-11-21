# Responsif Tablet & HP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (inline, sesuai preferensi user). Steps pakai checkbox.

**Goal:** Semua halaman terbaca tanpa overflow horizontal di HP (390px) & tablet (768px), tanpa mengubah desktop (≥1024px).

**Architecture:** (1) Sidebar navigasi jadi drawer `<md` mengikuti pola drawer editor yang ada; (2) pratinjau A4 fit-to-width via `zoom` CSS (menggantikan `transform: scale` yang menyebabkan overflow layout) dengan auto-fit default dan kontrol manual; (3) header/toolbar wrap; (4) rapikan halaman & modal.

**Tech Stack:** React + Tailwind (breakpoint `md`=768). Verifikasi visual via browser (tanpa unit test UI — ruling: pengganti test = E2E screenshot + cek `scrollWidth`).

**Spec:** `docs/superpowers/specs/2026-11-21-responsif-tablet-hp-design.md`

## Global Constraints

- Desktop (≥1024px) tidak berubah: sidebar tetap inline, zoom default tetap 80% saat ruang cukup.
- Pola drawer yang sudah ada (backdrop `bg-slate-900/30`, `z-40`, Escape, klik backdrop) dipakai konsisten.
- Setelah tiap task: `pnpm test` + `pnpm build` hijau.
- Verifikasi visual: 390×844 & 768×1024, semua halaman, cek `document.scrollingElement.scrollWidth <= innerWidth`.

## Review Focus

- Scroll-spy & navigasi halaman tetap benar setelah transform→zoom (task 2; paling berisiko). Fallback bila rusak: bungkus kolom halaman dengan div berukuran pagePx×zoom.
- Drawer sidebar: navigasi menutup drawer; Escape menutup; tidak mengganggu drawer "Bagian"/"Format".
- Edit langsung (contentEditable) tetap bekerja di zoom kecil.

---

### Task 1: Sidebar navigasi → drawer di HP + top bar ☰

**Files:**
- Modify: `src/App.tsx` (state `isMobileNavOpen`, Escape, wrapper AppSidebar, top bar `md:hidden` dengan tombol ☰)
- Modify: `src/components/AppSidebar.tsx` (mobile: selalu expand — `isCollapsed` dipaksa false saat drawer)

**Interfaces:** App menambah state & handler; AppSidebar props tidak berubah.

- [ ] Step 1: state + Escape (perluas handler Escape yang sudah ada) + wrapper:
  ```
  {isMobileNavOpen && backdrop md:hidden}
  <div className={`${isMobileNavOpen ? 'flex' : 'hidden'} md:flex fixed md:static inset-y-0 left-0 z-40 md:z-30`}>
    <AppSidebar isCollapsed={isMobileNavOpen ? false : isSidebarCollapsed} … />
  </div>
  ```
  `navigate(page)` dibungkus agar menutup drawer; buka drawer mobile → `setIsSidebarCollapsed(false)`.
- [ ] Step 2: top bar mobile (`md:hidden`, ☰ + logo "SkripsiRapi") di atas konten `app-content`.
- [ ] Step 3: `pnpm test` + `pnpm build`; browser 390px: drawer buka/tutup/Escape/navigasi.

### Task 2: Pratinjau A4 fit-to-width

**Files:**
- Modify: `src/components/A4PaperPreview.tsx`

**Interfaces:** prop `zoom`/`setZoom` tetap; internal: `fitPercent`, `autoFit` state; `effectiveZoom = autoFit ? Math.min(zoom, fitPercent) : zoom`.

- [ ] Step 1: ResizeObserver pada kontainer scroll (containerRef) → `fitPercent = clamp(round((width − 2×pad) / (paper.widthMm×PX_PER_MM) × 100), 25, 150)`
- [ ] Step 2: `effectiveZoom`; ganti `transform: scale()` → style `zoom: effectiveZoom/100` pada kolom halaman; label persen efektif di toolbar; +/-/preset → `setAutoFit(false)`; tombol RotateCcw ("Pas Layar") → `setAutoFit(true)`; tambah `overflow-x-hidden` pada kontainer scroll
- [ ] Step 3: `pnpm test` + `pnpm build`; browser 390px: A4 pas lebar, tak ada scroll horizontal; 768px & desktop: perilaku lama; scroll-spy/klik halaman/edit tetap bekerja (Review Focus)

### Task 3: Header & toolbar editor wrap

**Files:**
- Modify: `src/components/Header.tsx` (banner), `src/components/A4PaperPreview.tsx` (toolbar atas)

- [ ] Step 1: banner `flex-wrap` + nama dokumen `min-w-0 truncate` + chip meta `hidden sm:inline-flex` + tombol aksi menyusut label di HP bila perlu
- [ ] Step 2: toolbar halaman/zoom `flex-wrap gap-y-1`
- [ ] Step 3: `pnpm build`; browser 390/768: semua tombol terlihat/tergulir rapi

### Task 4: Modal & halaman lain

**Files:**
- Modify: `src/components/PasteModal.tsx`, `CompareModal.tsx`, `ClearConfirmModal.tsx` (bila perlu), `src/components/HomePage.tsx` (hero/padding HP), `PedomanPage.tsx` (padding)

- [ ] Step 1: cek modal di 390px — panel `max-h-[90vh] overflow-y-auto` + lebar `min(92vw, max-w)`; perbaiki bila terpotong
- [ ] Step 2: HomePage/PedomanPage: turunkan padding/ukuran teks hero di HP bila perlu
- [ ] Step 3: `pnpm build`; browser verifikasi

### Task 5: Verifikasi menyeluruh + ledger

- [ ] 390×844 & 768×1024: Beranda/Editor/Pedoman + modal — screenshot, cek `scrollWidth <= innerWidth` di tiap halaman, uji navigasi drawer, fit A4, edit teks, scroll-spy
- [ ] Perbaiki sisa masukan visual
- [ ] `pnpm test` + `pnpm build`; ledger + memory
