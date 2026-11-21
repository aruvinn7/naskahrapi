# Desain: Korektor Bahasa Asing (Italic) di Tab Analisis

**Tanggal:** 2026-11-21
**Status:** menunggu persetujuan (revisi 2 — cakupan diperluas atas masukan user)
**Ukuran:** sedang (kamus + util + UI)

## Intent & why

Aturan penulisan (PUEBI): kata/istilah asing yang **belum diserap** ditulis
*miring*. User ingin korektor di tab Analisis yang mendeteksi istilah asing dan
miringkannya — dan menolak cakupan terbatas pada daftar terkurasi saja
("gimana kalo istilah asing lain?").

## Pendekatan (final, atas masukan user)

Tiga lapis dalam satu kartu Analisis:

1. **Istilah umum terkurasi** — daftar 25 istilah pasti-asing (fix-all, seperti
   korektor KBBI).
2. **Kandidat dari kamus KBBI** — aplikasi membawa daftar 114.085 kata murni
   KBBI v6 (aset ~1,1 MB, dimuat lambat). Kata dokumen yang **tidak ada di
   KBBI** jadi kandidat istilah asing; karena tak bisa dibedakan dari
   typo/nama, kandidat tampil per istilah dengan tombol [Miringkan] — user
   yang memilih.
3. **Input manual** — kolom "miringkan istilah lain" untuk istilah apa pun.

## Desain

- **Aset** `src/assets/kbbi-words.txt` — satu kata a–z per baris, dibangkitkan
  dari dump KBBI v6 (`all_entries_v6.1.0.txt`, filter `[a-z]+`, dedupe, sort).
  Dimuat lambat via `?url` + fetch saat tab Analisis dibuka; jika gagal
  dimuat, bagian kandidat disembunyikan (lapis 1 & 3 tetap jalan).
- **Util** `src/utils/foreignTermCorrector.ts`:
  - `FOREIGN_TERMS` (terkurasi), `detectForeignTermIssues(text)` (frasa utuh,
    case-insensitive, skip yang sudah `*…*`).
  - `italicizeTerm(text, term)` — bungkus match dengan `*…*`, huruf asli
    dipertahankan, idempoten.
  - `detectForeignCandidates(text, kbbiWords)` — tokenisasi; skip token yang
    pernah muncul berkapital (nama/merek), singkatan kapital-semua, panjang
    ≤ 2, yang sudah miring, dan yang ada di daftar terkurasi; kandidat =
    kata lowercase tidak ada di KBBI; output `{ word, count }[]` urut
    jumlah terbanyak.
- **App.tsx**: `handleItalicizeTerm(term)` (generik — dipakai kandidat &
  manual) + `handleItalicizeCuratedAll()`; keduanya meniru `handleFixAllKbbi`
  (update rawText + semua blok).
- **RightSidebar (Analisis)**: kartu "Korektor Bahasa Asing (PUEBI)" setelah
  kartu KBBI; badge tab Analisis = jumlah istilah umum + kandidat.

## Non-goal

- Merek (ChatGPT, Google); istilah serapan baku (internet, laptop, server —
  ada di KBBI, otomatis bukan kandidat); "et al." (risiko daftar pustaka);
  auto-fix kandidat kamus tanpa persetujuan user.

## Tests

- Util: deteksi terkurasi (frasa/baris baru/sudah miring), pembungkus
  idempoten & mempertahankan huruf, kandidat (kata baku tak jadi kandidat,
  kata asing jadi kandidat, nama berkapital tersaring).
- Aset: file ada, memuat "zaman", tidak memuat "software".
- Browser: kartu tampil, fix-all & per-istilah memiringkan di pratinjau +
  Word, input manual bekerja.
