import { DocumentTemplate } from '../types/document';

const COMMON_RULES = `1. PARAGRAF
Satu paragraf penuh ditulis dalam SATU baris fisik. Jangan memotong kalimat ke baris baru di tengah paragraf (tanpa hard-wrap).

2. DAFTAR / POIN
Gunakan hanya penanda berikut, satu item satu baris:
1. Item bernomor
a. Item huruf kecil
- Item poin

3. TABEL
Gunakan tabel pipa markdown. Tulis caption tabel/gambar di baris tersendiri tepat sebelum tabel:
Tabel 2.1: Judul tabel
| Kolom 1 | Kolom 2 |
|---|---|
| Data 1 | Data 2 |

4. LARANGAN
- jangan dibubuhi kalimat pembuka maupun penutup percakapan (misalnya "Tentu, berikut adalah draf...").
- jangan menambahkan catatan penyusunan, komentar meta, atau penjelasan di luar isi dokumen.
- jangan memakai penanda markdown lain di luar aturan di atas (escape backslash, tabel non-pipa, atau heading tanpa pagar).`;

const MAKALAH_SKRIPTI_BODY = `== ATURAN FORMAT ==

1. HEADING
Judul bab ditulis dengan satu tanda pagar, sub-bab dua tanda pagar, sub-sub-bab tiga tanda pagar:
# BAB I PENDAHULUAN
## 1.1 Latar Belakang
### 1.1.1 Rincian Pembahasan

2. STRUKTUR
Susun lengkap: halaman judul (MAKALAH/SKRIPSI + judul + identitas penyusun), KATA PENGANTAR, isi per BAB (BAB I PENDAHULUAN, BAB II PEMBAHASAN, BAB III PENUTUP), lalu DAFTAR PUSTAKA. Pisahkan antar bagian dengan baris berisi tiga tanda hubung (---).

3. DAFTAR PUSTAKA
Beri judul bagian DAFTAR PUSTAKA, lalu tulis satu entri lengkap per baris tanpa memotong entri ke baris baru:
Federal Trade Commission. (2019). FTC Imposes Penalty on Facebook. Washington: FTC.

${COMMON_RULES}`;

const JURNAL_BODY = `== ATURAN FORMAT ==

1. HEADING
Tulis satu baris judul artikel, satu baris nama penulis, satu baris afiliasi (lab/jurusan/universitas) — tanpa tanda pagar dan tanpa kata "MAKALAH/SKRIPSI". Kemudian setiap nama bagian ditulis dengan SATU tanda pagar TANPA nomor bab dan TANPA nomor sub-bab:
# Abstract
# Abstrak
# Pendahuluan
# Dasar Teori
# Metoda Penelitian
# Hasil dan Pembahasan
# Daftar Pustaka

2. STRUKTUR
Susun lengkap sesuai urutan: judul artikel, penulis, afiliasi, ABSTRACT (bahasa Inggris, satu paragraf) diikuti baris "Keyword : kata1, kata2", ABSTRAK (bahasa Indonesia, satu paragraf) diikuti baris "Kata kunci : kata1, kata2", Pendahuluan, Dasar Teori, Metoda Penelitian, Hasil dan Pembahasan, Daftar Pustaka. TIDAK ADA kata pengantar, daftar isi, atau pembagian BAB.

3. SITASI
Gunakan sitasi bernomor dalam kurung siku sesuai urutan kemunculan: [1], [2], atau gabungan [1], [3].

4. DAFTAR PUSTAKA
Beri judul bagian Daftar Pustaka (dengan tanda pagar), lalu tulis satu entri lengkap per baris TANPA nomor di awal (nomor akan dirapikan otomatis):
Das, B., 1998, Mekanika Tanah (Prinsip-Prinsip Rekayasa Geoteknis) Jilid-1, Penerbit Erlangga, Jakarta.

${COMMON_RULES}`;

/**
 * Template prompt yang bisa disalin user ke AI lain (ChatGPT, Gemini, Claude,
 * DeepSeek) supaya keluarannya rapi dan aturan formatnya 1:1 dengan parser
 * parseRawDocument di aiCleaner.ts. Versi jurnal memakai struktur artikel
 * (tanpa BAB, dengan abstrak dua bahasa dan sitasi [1]).
 */
export function buildAiPromptTemplate(template: DocumentTemplate = 'makalah'): string {
  const docName =
    template === 'jurnal' ? 'artikel jurnal' : template === 'skripsi' ? 'skripsi' : 'makalah';
  const body = template === 'jurnal' ? JURNAL_BODY : MAKALAH_SKRIPTI_BODY;
  return `Anda adalah asisten penulis ${docName} akademik berbahasa Indonesia. Tuliskan ${docName} lengkap tentang [TOPIK] dengan mengikuti ATURAN FORMAT DI BAWAH INI SECARA KETAT, karena teks Anda akan diproses otomatis oleh parser dokumen.

${body}`;
}
