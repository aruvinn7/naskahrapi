import { DocumentConfig, ParsedDocument } from '../types/document';

/**
 * Util template jurnal: dipakai bersama oleh pratinjau, format engine, dan
 * exporter agar "BAB I PENDAHULUAN" tampil sebagai "Pendahuluan" konsisten
 * di semua jalur.
 */

const BAB_PREFIX_RE = /^BAB\s+[IVXLCDM0-9]+\s*[:.\-–]?\s*/i;

/** "BAB I PENDAHULUAN" → "PENDAHULUAN"; teks non-bab utuh. */
export function stripBabPrefix(text: string): string {
  return text.trim().replace(BAB_PREFIX_RE, '').trim();
}

/** Sub-bab jurnal tanpa nomor: "1.1 Latar Belakang" → "Latar Belakang". */
export function stripSectionNumber(text: string): string {
  return text.trim().replace(/^\d+(\.\d+)*\s+/, '').trim();
}

export function isJournalTemplate(config: DocumentConfig): boolean {
  return config.template === 'jurnal';
}

export interface JournalAbstract {
  heading: string;
  body: string;
  keywords: string;
}

export interface JournalFront {
  title: string;
  author: string;
  affiliation: string;
  abstracts: JournalAbstract[];
}

const KEYWORDS_RE = /^(keyword|kata\s*kunci)\s*[:.]?\s*/i;

/**
 * Front matter artikel jurnal: judul + penulis + afiliasi (dari data cover —
 * kosong bila tidak diisi) + daftar abstrak (EN & ID dari section
 * `type === 'abstrak'`); baris Keyword/Kata kunci dipisah dari isi.
 */
export function buildJournalFront(doc: ParsedDocument): JournalFront {
  const cover = doc.cover;
  const title = (cover?.title || doc.title || '').trim();
  const author = (cover?.members?.[0]?.name ?? '').trim();
  const affiliation = [cover?.studyProgram, cover?.department, cover?.institution]
    .map((part) => (part ?? '').trim())
    .filter(Boolean)
    .join(', ');

  const abstracts: JournalAbstract[] = [];
  doc.sections.forEach((section) => {
    if (section.type !== 'abstrak') return;
    const heading = stripBabPrefix(section.title) || 'Abstrak';
    const paragraphs: string[] = [];
    let keywords = '';
    section.blocks.forEach((block) => {
      const text = block.formattedContent.trim();
      if (!text) return;
      const marker = text.match(KEYWORDS_RE);
      if (marker) {
        keywords = text.slice(marker[0].length).replace(/[:.]\s*$/, '').trim();
        return;
      }
      paragraphs.push(text);
    });
    abstracts.push({ heading, body: paragraphs.join('\n\n'), keywords });
  });

  return { title, author, affiliation, abstracts };
}
