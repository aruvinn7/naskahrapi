export interface InlineSegment {
  text: string;
  bold?: boolean;
  italic?: boolean;
}

/**
 * Memecah teks Markdown ringan menjadi segmen kaya:
 * **tebal**, *miring*, ***tebal miring***, dan `kode` (dibersihkan).
 * Sengaja tidak mendukung garis bawah (_) agar nama file/URL tidak rusak.
 */
const INLINE_PATTERN = /\*\*\*([^*]+)\*\*\*|\*\*([^*]+)\*\*|\*([^*\n]+)\*|`([^`]+)`/g;

export function parseInlineSegments(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  INLINE_PATTERN.lastIndex = 0;
  while ((match = INLINE_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index) });
    }

    if (match[1] !== undefined) {
      segments.push({ text: match[1], bold: true, italic: true });
    } else if (match[2] !== undefined) {
      segments.push({ text: match[2], bold: true });
    } else if (match[3] !== undefined) {
      segments.push({ text: match[3], italic: true });
    } else if (match[4] !== undefined) {
      segments.push({ text: match[4] });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ text }];
}

export function stripInlineMarkdown(text: string): string {
  return parseInlineSegments(text)
    .map((segment) => segment.text)
    .join('');
}

export interface ChapterHeading {
  /** "BAB I" */
  label: string;
  /** "PENDAHULUAN" */
  title: string;
}

/**
 * Judul bab pada naskah akademik ditulis dua baris dan terpusat:
 *
 *     BAB I
 *     PENDAHULUAN
 *
 * Bukan "BAB I PENDAHULUAN" dalam satu baris. Mengembalikan null untuk judul
 * satu baris (DAFTAR PUSTAKA, KATA PENGANTAR, ABSTRAK, ...).
 */
export function splitChapterHeading(text: string): ChapterHeading | null {
  const clean = stripInlineMarkdown(text).replace(/\s+/g, ' ').trim();
  const match = clean.match(/^BAB\s+([IVXLCDM]+|\d+)\s*[.:\-–]?\s+(.+)$/i);
  if (!match) return null;

  const title = match[2].replace(/^[.:\-–]\s*/, '').trim();
  if (!title) return null;

  return { label: `BAB ${match[1].toUpperCase()}`, title };
}
