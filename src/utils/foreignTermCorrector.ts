import { parseInlineSegments } from './inlineFormat';
import { DocumentSection, ParsedDocument } from '../types/document';

/**
 * Korektor bahasa asing (PUEBI): kata/istilah asing yang belum diserap
 * ditulis miring. Tiga lapis: daftar terkurasi, kandidat dari kamus KBBI,
 * dan istilah manual dari user. Perbaikan = membungkus dengan `*…*` yang
 * dirender miring di pratinjau dan di ekspor DOCX.
 */

/** Istilah asing yang sering muncul di karya ilmiah dan belum diserap KBBI. */
export const FOREIGN_TERMS: string[] = [
  'artificial intelligence',
  'machine learning',
  'deep learning',
  'big data',
  'cloud computing',
  'data center',
  'internet of things',
  'smartphone',
  'smartwatch',
  'software',
  'hardware',
  'website',
  'e-commerce',
  'dataset',
  'blockchain',
  'chatbot',
  'deepfake',
  'streaming',
  'online',
  'offline',
  'download',
  'upload',
  'framework',
  'workflow',
  'smart city'
];

/** Pengecualian PUEBI: judul asing dalam entri Daftar Pustaka (dalam tanda
 * kutip) ditulis tegak — korektor tidak membaca section tersebut. */
export function isBibliographySection(section: DocumentSection): boolean {
  return section.type === 'daftar_pustaka' || section.title.toUpperCase().includes('PUSTAKA');
}

/** Teks untuk deteksi/perbaikan bahasa asing: seluruh blok KECUALI Daftar
 * Pustaka (lihat isBibliographySection). */
export function collectDetectionText(doc: ParsedDocument): string {
  return doc.sections
    .filter((section) => !isBibliographySection(section))
    .map((section) => section.blocks.map((block) => block.formattedContent).join('\n'))
    .join('\n');
}

export interface ForeignTermIssue {
  term: string;
  count: number;
}

export interface ForeignCandidate {
  word: string;
  count: number;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Regex frasa utuh: kata-kata istilah disambung \s+ (toleran baris baru). */
function termRegex(term: string): RegExp {
  const pattern = term
    .trim()
    .split(/\s+/)
    .map(escapeRegex)
    .join('\\s+');
  return new RegExp(`(?<![\\w*])${pattern}(?![\\w*])`, 'gi');
}

/**
 * Teks yang terlihat: gabungan segmen NON-italic saja — istilah yang sudah
 * miring tidak ikut terdeteksi, penanda markdown tidak mengganggu.
 */
function visibleText(text: string): string {
  return parseInlineSegments(text)
    .filter((segment) => !segment.italic)
    .map((segment) => segment.text)
    .join(' ');
}

export function detectForeignTermIssues(text: string): ForeignTermIssue[] {
  const visible = visibleText(text);
  const issues: ForeignTermIssue[] = [];
  for (const term of FOREIGN_TERMS) {
    const matches = visible.match(termRegex(term));
    if (matches && matches.length > 0) {
      issues.push({ term, count: matches.length });
    }
  }
  return issues;
}

function renderSegment(text: string, bold?: boolean, italic?: boolean): string {
  if (bold && italic) return `***${text}***`;
  if (bold) return `**${text}**`;
  if (italic) return `*${text}*`;
  return text;
}

/**
 * Membungkus setiap kemunculan `term` dengan `*…*` — hanya pada segmen teks
 * polos; segmen yang sudah bold/italic dibiarkan utuh agar tidak rusak.
 * Idempoten: hasilnya bisa diproses lagi tanpa perubahan.
 */
export function italicizeTerm(text: string, term: string): { text: string; totalReplaced: number } {
  const regex = termRegex(term);
  let totalReplaced = 0;
  const rebuilt = parseInlineSegments(text)
    .map((segment) => {
      if (segment.bold || segment.italic) {
        return renderSegment(segment.text, segment.bold, segment.italic);
      }
      const wrapped = segment.text.replace(regex, (match) => {
        totalReplaced += 1;
        return `*${match}*`;
      });
      return wrapped;
    })
    .join('');
  return { text: rebuilt, totalReplaced };
}

const WORD_TOKEN_PATTERN = /[A-Za-zÀ-ÿ]+/g;

/**
 * Stopword Inggris yang sangat umum — di teks Indonesia hampir selalu potongan
 * judul asing dalam tanda kutip (yang memang tidak boleh dimiringkan).
 */
const ENGLISH_STOPWORDS = new Set([
  'the', 'and', 'of', 'in', 'to', 'for', 'with', 'on', 'at', 'by', 'from',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'that', 'this', 'these',
  'those', 'it', 'its', 'as', 'an', 'or', 'if', 'then', 'than', 'but', 'not',
  'has', 'have', 'had', 'do', 'does', 'did', 'will', 'would', 'can', 'could',
  'may', 'might', 'shall', 'should', 'must', 'about', 'into', 'over', 'under',
  'between', 'through', 'during', 'after', 'before', 'while', 'when', 'where',
  'which', 'who', 'what', 'how', 'all', 'any', 'some', 'such', 'only', 'more',
  'most', 'other', 'also', 'using', 'based'
]);

const ID_PREFIXES = [
  'di', 'ke', 'se', 'ber', 'ter', 'me', 'mem', 'men', 'meng', 'meny',
  'pe', 'pem', 'pen', 'peng', 'peny', 'per', 'diper', 'dipeng', 'diber',
  'diter', 'kau', 'ku', 'mu'
];
const ID_SUFFIXES = ['nya', 'lah', 'kah', 'kan', 'an', 'i', 'ku', 'mu'];

/**
 * Cek kasar apakah `word` adalah kata Indonesia: bentuk aslinya atau hasil
 * melepas imbuhan (maksimal 3 lapis) ada di kamus KBBI. Kamus KBBI hanya
 * berisi lema, jadi bentuk berimbuhan (didorong, diharapkan, khususnya) perlu
 * dilucuti dulu agar tidak salah jadi kandidat istilah asing.
 */
function hasIndonesianStem(word: string, kbbiWords: ReadonlySet<string>, depth = 3): boolean {
  if (kbbiWords.has(word)) return true;
  if (depth === 0) return false;
  for (const suffix of ID_SUFFIXES) {
    if (word.endsWith(suffix) && word.length > suffix.length + 2) {
      if (hasIndonesianStem(word.slice(0, -suffix.length), kbbiWords, depth - 1)) return true;
    }
  }
  for (const prefix of ID_PREFIXES) {
    if (word.startsWith(prefix) && word.length > prefix.length + 2) {
      const stripped = word.slice(prefix.length);
      if (hasIndonesianStem(stripped, kbbiWords, depth - 1)) return true;
      // Luluh meN-/peN-: konsonan awal lema (p/t/k/s) bisa lebur, mis.
      // me + tingkat → meningkat. Tempel balik konsonan untuk menguji.
      if (['me', 'mem', 'men', 'meng', 'meny', 'pe', 'pem', 'pen', 'peng', 'peny'].includes(prefix)) {
        for (const consonant of ['p', 't', 'k', 's']) {
          if (hasIndonesianStem(consonant + stripped, kbbiWords, depth - 1)) return true;
        }
      }
    }
  }
  return false;
}

/**
 * Kandidat istilah asing: kata dokumen yang tidak ada di kamus KBBI. Nama/
 * merek tersaring (kata yang pernah muncul berkapital), juga singkatan
 * kapital-semua, kata pendek, dan yang sudah miring. Kandidat TIDAK boleh
 * di-auto-fix — user memilih per istilah.
 */
export function detectForeignCandidates(
  text: string,
  kbbiWords: ReadonlySet<string>
): ForeignCandidate[] {
  const visible = visibleText(text);

  interface TokenStat {
    count: number;
    /** Ada huruf kapital selain huruf pertama (ChatGPT, iPhone, IoT). */
    hasInternalCapital: boolean;
    /** Kapital di tengah kalimat (bukan awal kalimat) → nama/merek. */
    hasMidSentenceCapital: boolean;
    /** Semua kemunculan kapital semua → singkatan (GPU, AI). */
    isAlwaysAllCaps: boolean;
    everLowercase: boolean;
  }
  const stats = new Map<string, TokenStat>();
  const tokenMatches = [...visible.matchAll(new RegExp(WORD_TOKEN_PATTERN.source, 'g'))];
  for (const match of tokenMatches) {
    const token = match[0];
    const lower = token.toLowerCase();
    const stat =
      stats.get(lower) ??
      { count: 0, hasInternalCapital: false, hasMidSentenceCapital: false, isAlwaysAllCaps: true, everLowercase: false };
    stat.count += 1;
    if (/[A-ZÀ-Ý]/.test(token.slice(1))) stat.hasInternalCapital = true;
    // Kapital di awal kalimat sah: mundur melewati spasi/baris baru ke
    // karakter terakhir sebelum token; tanda baca = batas kalimat.
    let previousChar = '';
    for (let k = match.index - 1; k >= 0; k--) {
      const ch = visible[k];
      if (!/\s/.test(ch)) {
        previousChar = ch;
        break;
      }
    }
    if (/^[A-ZÀ-Ý]/.test(token) && previousChar && !/[.!?\n\r]/.test(previousChar)) {
      stat.hasMidSentenceCapital = true;
    }
    if (token !== token.toUpperCase()) stat.isAlwaysAllCaps = false;
    if (token !== token.toLowerCase()) stat.everLowercase = true;
    stats.set(lower, stat);
  }

  const curated = new Set(FOREIGN_TERMS.flatMap((term) => term.split(/\s+/)));
  const candidates: ForeignCandidate[] = [];
  for (const [word, stat] of stats) {
    if (stat.hasInternalCapital) continue;
    if (stat.hasMidSentenceCapital) continue;
    // Singkatan: selalu kapital semua dan pernah benar-benar ditulis begitu.
    if (stat.isAlwaysAllCaps && !stat.everLowercase) continue;
    if (word.length <= 2) continue;
    if (ENGLISH_STOPWORDS.has(word)) continue;
    if (kbbiWords.has(word)) continue;
    if (curated.has(word)) continue;
    // Kata Indonesia berimbuhan: lema yang dilucuti imbuhan ada di KBBI.
    if (hasIndonesianStem(word, kbbiWords)) continue;
    candidates.push({ word, count: stat.count });
  }
  candidates.sort((a, b) => (b.count - a.count) || a.word.localeCompare(b.word));
  return candidates;
}
