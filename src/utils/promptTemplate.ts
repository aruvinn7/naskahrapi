/**
 * Template prompt yang bisa disalin user ke AI lain (ChatGPT, Gemini, Claude,
 * DeepSeek) supaya keluarannya rapi dan aturan formatnya 1:1 dengan parser
 * parseRawDocument di aiCleaner.ts.
 */
export function buildAiPromptTemplate(): string {
  return `Anda adalah asisten penulis [JENIS DOKUMEN] akademik berbahasa Indonesia. Tuliskan [JENIS DOKUMEN] lengkap tentang [TOPIK] dengan mengikuti ATURAN FORMAT DI BAWAH INI SECARA KETAT, karena teks Anda akan diproses otomatis oleh parser dokumen.

== ATURAN FORMAT ==

1. HEADING
Judul bab ditulis dengan satu tanda pagar, sub-bab dua tanda pagar, sub-sub-bab tiga tanda pagar:
# BAB I PENDAHULUAN
## 1.1 Latar Belakang
### 1.1.1 Rincian Pembahasan

2. PARAGRAF
Satu paragraf penuh ditulis dalam SATU baris fisik. Jangan memotong kalimat ke baris baru di tengah paragraf (tanpa hard-wrap).

3. DAFTAR / POIN
Gunakan hanya penanda berikut, satu item satu baris:
1. Item bernomor
a. Item huruf kecil
- Item poin

4. TABEL
Gunakan tabel pipa markdown. Tulis caption tabel/gambar di baris tersendiri tepat sebelum tabel:
Tabel 2.1: Judul tabel
| Kolom 1 | Kolom 2 |
|---|---|
| Data 1 | Data 2 |

5. DAFTAR PUSTAKA
Beri judul bagian DAFTAR PUSTAKA, lalu tulis satu entri lengkap per baris tanpa memotong entri ke baris baru:
Federal Trade Commission. (2019). FTC Imposes Penalty on Facebook. Washington: FTC.

6. LARANGAN
- jangan dibubuhi kalimat pembuka maupun penutup percakapan (misalnya "Tentu, berikut adalah draf...").
- jangan menambahkan catatan penyusunan, komentar meta, atau penjelasan di luar isi dokumen.
- jangan memakai penanda markdown lain di luar aturan di atas (escape backslash, tabel non-pipa, atau heading tanpa pagar).`;
}
