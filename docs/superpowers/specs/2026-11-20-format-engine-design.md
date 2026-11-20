# SkripsiRapi — Mesin Format Dalam + Preset + Deteksi (Design)

Tanggal: 2026-11-20. Status: disetujui untuk eksekusi langsung (user opted out of questions).

## Intent & Why

Aplikasi harus "powerful": menyelesaikan banyak masalah sekaligus dan robust
terhadap pedoman makalah/skripsi yang berbeda-beda antar kampus/dosen.
Saat ini gaya heading **hardcoded** (semua uppercase, judul BAB digabung),
cover satu model tetap, layout halaman tidak bisa diatur, preset hanya
menyimpan margin/spasi/font. Solusi: mesin format dalam yang bisa disimpan
sebagai preset bernama + deteksi otomatis.

## Goals

- T1: Gaya per level heading (bold/italic/kapital/alignment/spasi/penomoran,
  gaya judul BAB gabung vs terpisah) — diatur user, dirender pratinjau,
  diekspor DOCX.
- T2: Cover variatif (3 layout: logo-kiri, logo-tengah, tabel) + field opsional
  (motto, pembimbing 1/2, penguji 1/2, tanggal sidang).
- T3: Ukuran kertas (A4/F4/Letter), orientasi, header running-head,
  posisi nomor halaman, setiap BAB mulai halaman baru.
- T4: Preset kustom bernama — simpan seluruh pengaturan (T1–T3 + layout cover),
  daftar, terapkan, hapus, ekspor/impor JSON. Preset bawaan disemai dari
  TEMPLATE_PRESETS.
- B: Deteksi otomatis — tebak tipe dokumen (makalah/skripsi/jurnal), gaya
  sitasi, kelengkapan struktur, anomali vs preset; tampil sebagai panel
  "Diagnosa Format" dengan saran tindakan.

## Non-goals / Anti-goals

- Bukan pengganti Word lengkap.
- Bukan cloud/multi-user (lokal-first, IndexedDB/localStorage).
- Deteksi TIDAK bisa menebak margin/font dari teks mentah (batas fisik) —
  bagian layout tetap dari preset/pilihan user.

## Constraints

- Arsitektur eksisting: `DocumentConfig` + `config.rules` booleans +
  `EffectiveConfig` (netralisasi aturan). Ekstensi mengikuti pola ini.
- Pratinjau A4 + ekspor DOCX harus membaca field baru yang sama.
- localStorage kuota terbatas (preset disimpan di sana; ukuran kecil).

## Approaches

1. **M1 (dipilih):** perpanjang `DocumentConfig` dengan struktur baru
   (`headingStyles`, `pageSetup`, `coverLayout`); preset = snapshot config
   bernama. Type-safe, sesuai arsitektur, ekspor tinggal baca field.
2. M2 engine CSS-like: terlalu kompleks untuk codebase ini.
3. M3 preset eksternal JSON sebagai tema: tidak lebih kuat dari M1+ekspor.

## Keputusan desain (call saya)

- Preset = snapshot `DocumentConfig` + `coverLayout`; data dokumen (judul,
  anggota, dsb.) TIDAK ikut preset.
- Gaya heading diterapkan langsung (bukan rule toggle baru); rule eksisting
  (font_size, line_spacing, dsb.) tetap menetralkan bagiannya.
- Preset bawaan: "Makalah", "Skripsi", "Jurnal" disemai dari TEMPLATE_PRESETS
  + gaya heading default (BAB I joined, centered, caps; sub-bab numerik).
- Simpan state: localStorage key `skripsira pi-presets-v1`.
- Rilis: T4+T1 → T2 → T3 → B → improvement lanjutan.

## Yang terserah builder

- Detail UI kontrol per level (kompak, sesuai pola RightSidebar).
- Default spacing sebelum/sesudah heading (0 pt / 6 pt dll.) mengikuti Word.
