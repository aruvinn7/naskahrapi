import {
  BabTitleStyle,
  ChapterNumberingFormat,
  HeadingRules,
  PageSetup,
  PaperSize
} from '../types/document';

/** Angka Arab → Romawi (1–3999). */
export function toRoman(value: number): string {
  const numerals: Array<[number, string]> = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I']
  ];

  let remainder = Math.max(1, Math.floor(value));
  let result = '';

  for (const [number, symbol] of numerals) {
    while (remainder >= number) {
      result += symbol;
      remainder -= number;
    }
  }

  return result;
}

/** Angka Romawi → Arab. Mengembalikan null jika bukan romawi valid. */
export function romanToArabic(value: string): number | null {
  const map: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  const cleaned = value.trim().toUpperCase();
  if (!/^[IVXLCDM]+$/.test(cleaned)) return null;

  let total = 0;
  let prev = 0;
  for (let i = cleaned.length - 1; i >= 0; i -= 1) {
    const current = map[cleaned[i]];
    if (current < prev) total -= current;
    else {
      total += current;
      prev = current;
    }
  }
  return total;
}

export interface ChapterParts {
  /** Nomor asli dari teks, mis. "I" untuk "BAB I PENDAHULUAN" atau null. */
  number: string | null;
  /** Judul setelah nomor, mis. "PENDAHULUAN". */
  title: string;
}

/**
 * Memisahkan judul bab "BAB I PENDAHULUAN" / "BAB 1 PENDAHULUAN" / "I. PENDAHULUAN"
 * menjadi nomor + judul. Mengembalikan null jika bukan judul bab.
 */
export function parseChapterHeading(text: string): ChapterParts | null {
  const clean = text.replace(/\s+/g, ' ').trim();
  const bab = clean.match(/^BAB\s+([IVXLCDM]+|\d+)\s*[.:\-–]?\s*(.+)$/i);
  if (bab) {
    const number = bab[1].toUpperCase();
    const title = bab[2].replace(/^[.:\-–]\s*/, '').trim();
    return { number, title: title || '' };
  }

  const plain = clean.match(/^([IVXLCDM]+)\.\s+(.+)$/i);
  if (plain) return { number: plain[1].toUpperCase(), title: plain[2].trim() };

  return null;
}

/** Normalisasi nomor bab ke format yang diminta. */
function normalizeNumber(
  number: string | null,
  format: ChapterNumberingFormat
): string | null {
  if (!number) return null;
  const arabic = /^\d+$/.test(number);
  const romanValue = romanToArabic(number);

  switch (format) {
    case 'bab-roman':
      // BAB I (konversi "BAB 1" → "BAB I")
      return arabic ? toRoman(parseInt(number, 10)) : number;
    case 'bab-arabic':
      // BAB 1 (konversi "BAB I" → "BAB 1")
      return romanValue !== null ? String(romanValue) : number;
    case 'roman':
      // I. (tanpa kata BAB)
      return romanValue !== null ? toRoman(romanValue) : toRoman(parseInt(number, 10));
    case 'none':
      return null;
  }
}

export interface RenderedChapterHeading {
  /** Baris label, mis. "BAB I" atau "I."; null jika tidak ada label. */
  label: string | null;
  /** Judul, mis. "PENDAHULUAN". */
  title: string;
  /** Teks gabungan satu baris untuk gaya `joined`. */
  joined: string;
}

/**
 * Mengubah judul bab mentah ("BAB I PENDAHULUAN") menjadi tampilan
 * sesuai aturan penomoran & gaya baris. Dipakai bersama oleh pratinjau
 * dan ekspor DOCX agar hasil identik.
 */
export function formatChapterHeading(
  text: string,
  numberingFormat: ChapterNumberingFormat,
  babTitleStyle: BabTitleStyle
): RenderedChapterHeading {
  const parts = parseChapterHeading(text);
  if (!parts) {
    const clean = text.replace(/\s+/g, ' ').trim();
    return { label: null, title: clean, joined: clean };
  }

  const number = normalizeNumber(parts.number, numberingFormat);
  const title = parts.title;
  const label = number === null ? null : numberingFormat === 'roman' ? `${number}.` : `BAB ${number}`;

  const joined = label ? `${label} ${title}`.trim() : title;
  if (babTitleStyle === 'joined') return { label, title, joined };
  return { label, title, joined };
}

/** Dimensi kertas (mm) per ukuran; dipakai pratinjau & ekspor DOCX. */
export const PAPER_SIZES: Record<PaperSize, { widthMm: number; heightMm: number }> = {
  a4: { widthMm: 210, heightMm: 297 },
  f4: { widthMm: 210, heightMm: 330 },
  letter: { widthMm: 215.9, heightMm: 279.4 }
};

export function paperDimensions(size: PaperSize, landscape: boolean) {
  const dims = PAPER_SIZES[size];
  return landscape
    ? { widthMm: dims.heightMm, heightMm: dims.widthMm }
    : { widthMm: dims.widthMm, heightMm: dims.heightMm };
}

/**
 * Mengubah nomor sub-bab "1.1 Latar Belakang" → "I.1 Latar Belakang"
 * saat gaya romawi dipilih. Tidak mengubah teks lain.
 */
export function formatSubHeadingNumber(text: string, mode: 'numeric' | 'roman'): string {
  if (mode === 'numeric') return text;
  const clean = text.trim();
  const match = clean.match(/^(\d+)\.(\d+)(.*)$/);
  if (!match) return text;
  return `${toRoman(parseInt(match[1], 10))}.${match[2]}${match[3]}`;
}

export const DEFAULT_HEADING_RULES: HeadingRules = {
  h1: { bold: true, italic: false, allCaps: true, alignment: 'center', spaceBefore: 0, spaceAfter: 6 },
  h2: { bold: true, italic: false, allCaps: false, alignment: 'left', spaceBefore: 12, spaceAfter: 6 },
  h3: { bold: true, italic: true, allCaps: false, alignment: 'left', spaceBefore: 10, spaceAfter: 4 },
  numberingFormat: 'bab-roman',
  babTitleStyle: 'separate',
  h2Numbering: 'numeric'
};

export const DEFAULT_PAGE_SETUP: PageSetup = {
  paperSize: 'a4',
  orientation: 'portrait',
  headerText: '',
  headerEnabled: false,
  pageNumberPosition: 'top-right',
  newPagePerBab: true
};

export const DEFAULT_COVER_LAYOUT = { variant: 'klasik' as const };
