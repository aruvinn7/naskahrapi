# Design: Audit Sitasi ↔ Daftar Pustaka

Tanggal: 2026-11-22
Status: disetujui (percakapan, "dua duanya")

## Intent & Why

Sitasi di teks dan DAFTAR PUSTAKA sering tidak sinkron — dua kesalahan yang
paling sering dicatat dosen saat bimbingan/sidang:

1. **Sitasi tanpa entri** — teks mengutip `(Prasetyo, 2020)` tetapi pustaka
   hanya berisi "Prasetyo, A. (2023)" (tahun beda / entri hilang).
2. **Entri tak terpakai** — entri pustaka yang tidak pernah disitasi di
   seluruh dokumen (sisa salin-tempel).

Tab Analisis sudah punya cek kasus 1 (`analyzeCitations` di
`src/utils/citationHelper.ts`), tapi lemah: pencocokan hanya nama (tahun
diabaikan — Prasetyo 2020 dianggap cocok dengan Prasetyo 2023), regex tidak
membaca sitasi ganda `(Sari, 2022; Wibowo, 2023)`, `dkk.`/`et al.`, sitasi
naratif `Prasetyo (2023)`, dan tahun berhuruf `(2023a)`. Kasus 2 tidak dicek
sama sekali.

## Goals

- Deteksi sitasi lebih tangguh: sitasi ganda (pemisah `;`), `dkk.`/`et al.`,
  sitasi naratif `Nama (Tahun)`, tahun berhuruf `(2023a)`.
- Pencocokan **nama + tahun**, bukan nama saja.
- Temuan baru: daftar entri pustaka yang tidak pernah disitasi.
- Hasil tetap tampil di kartu "Format Sitasi & Referensi" yang sudah ada di
  tab Analisis (konsolidasi, tidak ada kartu baru).

## Non-goals / Anti-goals

- Tidak ada perbaikan otomatis: menambah entri pustaka dari sitasi butuh
  data sumber lengkap yang tidak kita punya; menghapus entri otomatis
  berisiko. Output hanya temuan.
- Tidak memindahkan/mengubah kartu sitasi yang ada.
- Gaya IEEE `[1]` tidak diubah perilakunya (tetap dideteksi sebagai gaya,
  pencocokan angka tetap sederhana).

## Pendekatan

Satu cara yang masuk akal: perkuat `analyzeCitations` di
`src/utils/citationHelper.ts` (sumber kebenaran tunggal untuk sitasi), lalu
tampilkan temuan baru di `RightSidebar.tsx` pada kartu yang sudah ada.
Alternatif kartu terpisah ditolak (dublikasi UI); tombol perbaikan otomatis
ditolak (di atas).

## Desain teknis

- Ekstraksi sitasi: dua regex —
  - Parenthetical: isi kurung dibagi per `;` → tiap item `Nama..., Tahun`.
  - Naratif: `Nama (Tahun)` dengan Nama dimulai kapital, mendahului kata
    `(` langsung (bukan tanda baca lain).
- Kunci sitasi = nama keluarga pertama (lowercase, strip `et al.`/`dkk.`/
  titik/koma) + tahun 4 digit (+ huruf sufiks bila ada).
- Kunci entri pustaka = nama sebelum koma pertama (lowercase) + tahun
  pertama `\((19|20)\d{2}[a-z]?\)` dalam teks entri.
- `missingFromBibliography`: sitasi yang kuncinya tidak muncul di entri mana
  pun (nama DAN tahun harus sama).
- `unusedReferences` (baru): entri pustaka yang kuncinya tidak muncul di
  kunci sitasi mana pun.
- `CitationAnalysis` ditambah field `unusedReferences: string[]`.
- UI: blok temuan amber baru di kartu sitasi, sejajar gaya blok
  "Sitasi teks tanpa entri di pustaka" yang sudah ada.

## Pengujian

TDD di `src/utils/__tests__/citationHelper.test.ts` (RED → GREEN):
skenario sitasi ganda, naratif, dkk., tahun berhuruf, tahun beda tidak cocok,
unused references, dokumen tanpa pustaka (tidak ada temuan pustaka tak
terpakai yang palsu), pengecualian nama organisasi/akronim.
Verifikasi UI via browser (dokumen contoh dengan ketiga kasus).
