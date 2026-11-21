# Desain: Pengaturan Jarak Nomor–Judul Sub-bab

**Tanggal:** 2026-11-21
**Status:** menunggu persetujuan
**Ukuran:** perubahan kecil

## Intent & why

User ingin bisa mengatur jarak antara nomor sub-bab (mis. "2.6") dan judulnya
("Dampak Lingkungan dari Konsumsi Air AI"). Saat ini jaraknya satu spasi biasa
dari teks sumber dan tidak bisa diatur. Pratinjau dan ekspor DOCX harus tetap
identik.

## Pendekatan yang dipertimbangkan

1. **Posisi judul dalam cm (tab stop) — DIPILIH.** Judul selalu mulai pada
   posisi tetap dari margin kiri; hasil konsisten walau panjang nomor beda
   (2.6 vs 2.10); ini cara standar Word untuk penomoran heading.
2. Dropdown gaya pemisah (spasi biasa / spasi lebar) — ditolak: tidak bisa
   diatur halus.
3. Jumlah spasi (n spasi) — ditolak: rataan ikut lebar nomor, tidak rapi.

## Desain

- Field baru `numberTitleGapCm: number` di `HeadingRules`
  (src/types/document.ts). Default **0** = "mengikuti teks sumber" — perilaku
  sekarang, jadi dokumen/preset lama tidak berubah tampilan.
- Nilai > 0 → judul dimulai pada posisi tersebut dari margin kiri (tab stop
  kiri), berlaku untuk heading **h2 dan h3** yang teksnya berpola nomor
  (`2.6`, `2.6.1`, atau `II.3` setelah konversi romawi). Teks tanpa nomor dan
  h1 (BAB) tidak berubah.
- **Tanpa toggle rule baru** — nilai 0 sudah berfungsi sebagai "mati", jadi
  panel Aturan tidak bertambah tombol. (Berbeda dari pattern `table_format`
  yang butuh toggle karena nilainya objek.)
- **UI:** input angka (cm) di panel Aturan (RightSidebar), dekat pengaturan
  nomor sub-bab. Di-sanitize 0–5 cm di `sanitizeConfig` (App.tsx).
- **Preview (A4PaperPreview):** nomor dibungkus
  `<span style="display:inline-block; min-width: Xcm">`, judul menyusul —
  posisi judul = X cm; baris yang wrap kembali ke margin (perilaku sama
  dengan Word tanpa hanging indent).
- **DOCX (docxExporter):** tab stop kiri di `cmToTwip(X)`, lalu run nomor +
  tab + run judul.
- Preset lama & import JSON otomatis dapat default 0 lewat merge
  `DEFAULT_HEADING_RULES` (backward compatible).

## Non-goal

- Mengubah gaya judul BAB (h1) — sudah ada `babTitleStyle`.
- Indentasi menggantung daftar pustaka — sudah ada `hangingIndent`.

## Tests

- Pola nomor terdeteksi & dipecah saat gap > 0; teks utuh satu spasi saat
  gap 0.
- Mode romawi (`II.3`) tetap kena; teks tanpa nomor tidak berubah.
- Sanitize config: nilai < 0 / > 5 dijepit ke batas.
- Render DOCX: tab stop pada posisi cm + struktur run nomor+tab+judul.
