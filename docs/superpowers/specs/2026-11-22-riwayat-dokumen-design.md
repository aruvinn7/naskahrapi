# Desain: Riwayat Dokumen

**Tanggal:** 2026-11-22
**Status:** menunggu persetujuan
**Ukuran:** sedang

## Intent & why

Saat ini aplikasi hanya punya **satu dokumen aktif** — membuat dokumen baru
(tempel/unggah) menggantikan yang lama tanpa jejak. Riwayat Dokumen menyimpan
beberapa dokumen sekaligus dengan daftar di sidebar, sehingga user bisa
pindah-pindah makalah tanpa kehilangan yang lama.

## Desain

### Penyimpanan

- Key baru `skripsi-rapi-history-v1` (key lama dengan spasi dibiarkan —
  migrasi non-goal): `{ entries: [{ id, name, savedAt, doc, config }] }`.
- **Batas 10 entri** — entri terlama dibuang saat penuh. Quota localStorage
  (~5 MB) ditangani: setItem gagal → buang entri terlama & coba lagi (maks 3),
  tetap gagal → arsipkan tanpa gambar (strip dataUrl) → tetap gagal, lewati
  diam-diam (dokumen aktif tidak pernah hilang).

### Perilaku

- **Arsip otomatis**: saat dokumen baru dibuat (tempel/unggah/contoh diproses
  di Beranda), dokumen aktif saat ini diarsipkan dulu (kalau ada isinya).
- **Pulihkan**: klik entri di sidebar → dokumen aktif saat ini diarsipkan
  dulu (swap), entri terpilih jadi aktif → buka editor.
- **Hapus**: tombol ✕ per entri.
- **Kosongkan**: sekarang ikut mengarsipkan dulu sebelum mengosongkan
  (teks konfirmasi modal diperbarui).
- Autosave dokumen aktif tidak berubah; entri riwayat = snapshot (tidak
  ikut berubah saat aktif diedit).

### UI

- Sidebar (di bawah kartu "Dokumen aktif"): section **"Riwayat"** — daftar
  entri (nama + tanggal, maks tinggi tergulir), klik = pulihkan, ✕ = hapus;
  kosong → teks kecil "Belum ada riwayat".

## Non-goal

- IndexedDB (perlu bila user sering pakai gambar besar — iterasi nanti);
  rename entri; pencarian riwayat; sinkronisasi antar perangkat.

## Verifikasi

- Unit: util docHistory (add/restore/remove/cap/quota-fallback via mock
  localStorage sederhana).
- Browser: buat dokumen baru → lama masuk riwayat; pulihkan/hapus; swap dua
  arah; Kosongkan mengarsipkan.
