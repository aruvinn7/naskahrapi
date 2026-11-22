import { DocumentBlock, DocumentSection } from '../types/document';
import { stripInlineMarkdown } from './inlineFormat';

export type CitationStyle = 'apa7' | 'harvard' | 'ieee';

export interface CitationRef {
  raw: string;
  key: string;
}

export interface CitationAnalysis {
  styleDetected: CitationStyle;
  totalEntries: number;
  inTextCitations: string[];
  isSortedAlphabetically: boolean;
  missingFromBibliography: string[];
  unusedReferences: string[];
}

export function sortBibliographyBlocks(blocks: DocumentBlock[]): DocumentBlock[] {
  // Sort items of type 'daftar_pustaka_item' or general bibliography paragraphs alphabetically
  const sorted = [...blocks].sort((a, b) => {
    // Strip leading numbering if any (e.g., [1], 1.)
    const cleanA = stripInlineMarkdown(a.formattedContent).replace(/^\[\d+\]\s*|^\d+\.\s*/, '').trim().toLowerCase();
    const cleanB = stripInlineMarkdown(b.formattedContent).replace(/^\[\d+\]\s*|^\d+\.\s*/, '').trim().toLowerCase();
    return cleanA.localeCompare(cleanB, 'id', { sensitivity: 'base' });
  });

  return sorted;
}

/**
 * Kata pengantar non-sitasi yang sering muncul sebelum nama dalam kurung
 * ("Lihat Prasetyo, 2023") — bukan sitasi, jangan dilaporkan.
 */
const NON_CITATION_LEADS = new Set([
  'lihat',
  'bandingkan',
  'misal',
  'misalnya',
  'contoh',
  'cf',
  'ibid',
  'op',
  'cit',
  'sumber',
  'kutipan'
]);

/** Kata pertama nama sebagai komponen kunci: "Sari dkk." → "sari", "sumber:" → "sumber". */
function firstWordKey(name: string): string {
  const cleaned = name.replace(/\s+(?:dkk\.|et\s+al\.)\s*$/i, '').trim();
  const first = cleaned.split(/\s+/)[0] ?? '';
  return first.replace(/[.,:;]+$/, '').toLowerCase();
}

/**
 * Ekstrak sitasi nama-tahun dari satu blok teks. Dua jalur:
 * 1) Parenthetical "(Sari, 2022; Wibowo, 2023)" — di-split per ";";
 * 2) Naratif "Prasetyo (2023) menyatakan".
 * Kurung bukan sitasi (tanpa tahun, atau diawali kata seperti "Lihat")
 * diabaikan. Kunci = kataPertamaNama::tahun (sufiks huruf 2023a ikut).
 */
export function extractCitationRefs(content: string): CitationRef[] {
  const refs: CitationRef[] = [];
  const push = (name: string, year: string, raw: string) => {
    const firstWord = firstWordKey(name);
    if (!firstWord || NON_CITATION_LEADS.has(firstWord)) return;
    refs.push({ raw: raw.replace(/\s+$/, ''), key: `${firstWord}::${year}` });
  };

  // 1) Parenthetical — isi kurung tanpa nesting, sitasi ganda di-split ";".
  const parenRegex = /\(([^()]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = parenRegex.exec(content)) !== null) {
    for (const item of match[1].split(';')) {
      const citation = item.trim().match(/^(.+?),\s*((?:19|20)\d{2}[a-z]?)$/);
      if (!citation) continue;
      const name = citation[1].trim();
      push(name, citation[2], `${name}, ${citation[2]}`);
    }
  }

  // 2) Naratif — Nama (Tahun), satu atau beberapa penulis dipisah dan/&/and
  //    ("Sari dan Wibowo (2022)"); kata pertama menjadi komponen kunci.
  const narrativeRegex =
    /\b([A-Z][a-zA-Z]+(?:\s+(?:dkk\.|et\s+al\.))?(?:(?:\s+dan|\s*&|\s+and)\s+[A-Z][a-zA-Z]+)*)\s*\(((?:19|20)\d{2}[a-z]?)\)/g;
  while ((match = narrativeRegex.exec(content)) !== null) {
    push(match[1].trim(), match[2], `${match[1].trim()}, ${match[2]}`);
  }

  return refs;
}

/**
 * Kunci entri daftar pustaka: kata pertama nama + tahun pertama
 * (termasuk sufiks huruf). Penomoran awal [1] / 1. di-strip. Entri tanpa
 * tahun mengembalikan null (tidak bisa dicocokkan).
 */
export function extractBibliographyKey(entryText: string): string | null {
  const text = stripInlineMarkdown(entryText)
    .replace(/^\s*(\[\d+\]|\d+[.)])\s*/, '')
    .trim();
  const yearMatch = text.match(/\b((?:19|20)\d{2})[a-z]?\b/);
  if (!yearMatch) return null;
  const suffixMatch = text.match(/\b((?:19|20)\d{2})[a-z]\b/);
  const year = suffixMatch ? `${suffixMatch[1]}${suffixMatch[0].slice(-1)}` : yearMatch[1];
  const nameMatch = text.match(/[A-Za-zÀ-ÿ'’-]+/);
  if (!nameMatch) return null;
  return `${nameMatch[0].toLowerCase()}::${year}`;
}

export function analyzeCitations(sections: DocumentSection[]): CitationAnalysis {
  const bibSection = sections.find(s => s.type === 'daftar_pustaka' || s.title.toUpperCase().includes('DAFTAR PUSTAKA'));
  const bibBlocks = bibSection ? bibSection.blocks.filter(b => b.type === 'daftar_pustaka_item' || b.type === 'paragraph') : [];

  // Sitasi teks: APA (parenthetical + naratif) dan IEEE [n].
  const refs: CitationRef[] = [];
  const ieeeCitations: string[] = [];
  let ieeeCount = 0;

  sections.forEach(sec => {
    if (sec.type === 'daftar_pustaka' || sec.title.toUpperCase().includes('DAFTAR PUSTAKA')) return;
    sec.blocks.forEach(b => {
      refs.push(...extractCitationRefs(b.formattedContent));
      const ieeeRegex = /\[(\d+)\]/g;
      let match;
      while ((match = ieeeRegex.exec(b.formattedContent)) !== null) {
        ieeeCitations.push(`[${match[1]}]`);
        ieeeCount++;
      }
    });
  });

  const styleDetected: CitationStyle = ieeeCount > refs.length ? 'ieee' : 'apa7';
  const inTextCitations = [...refs.map((r) => r.raw), ...ieeeCitations];

  // Check if bibliography is sorted
  let isSortedAlphabetically = true;
  for (let i = 0; i < bibBlocks.length - 1; i++) {
    const a = stripInlineMarkdown(bibBlocks[i].formattedContent).trim().toLowerCase();
    const b = stripInlineMarkdown(bibBlocks[i + 1].formattedContent).trim().toLowerCase();
    if (a.localeCompare(b, 'id') > 0) {
      isSortedAlphabetically = false;
      break;
    }
  }

  // Kunci semua entri pustaka (nama+tahun) untuk pencocokan dua arah.
  const entryKeys = new Set<string>();
  bibBlocks.forEach((b) => {
    const key = extractBibliographyKey(b.formattedContent);
    if (key) entryKeys.add(key);
  });
  const citationKeys = new Set(refs.map((r) => r.key));

  // Sitasi teks tanpa entri pasangan (nama DAN tahun harus sama).
  const missingFromBibliography: string[] = [];
  const seenMissing = new Set<string>();
  refs.forEach((ref) => {
    if (entryKeys.has(ref.key)) return;
    if (seenMissing.has(`${ref.key}|${ref.raw}`)) return;
    seenMissing.add(`${ref.key}|${ref.raw}`);
    if (!missingFromBibliography.includes(ref.raw)) missingFromBibliography.push(ref.raw);
  });

  // Entri pustaka yang tidak pernah disitasi (hanya bila ada pustaka).
  // Gaya IEEE murni tidak dicocokkan angka ↔ urutan entri — jangan melapor
  // "semua entri tak terpakai" untuk gaya yang tidak memakai nama-tahun.
  const isIeeeOnly = refs.length === 0 && ieeeCitations.length > 0;
  const unusedReferences =
    bibBlocks.length > 0 && !isIeeeOnly
      ? bibBlocks
          .map((b) => ({
            key: extractBibliographyKey(b.formattedContent),
            text: stripInlineMarkdown(b.formattedContent).trim()
          }))
          .filter((entry) => entry.key !== null && !citationKeys.has(entry.key))
          .map((entry) => (entry.text.length > 80 ? `${entry.text.slice(0, 80)}…` : entry.text))
      : [];

  return {
    styleDetected,
    totalEntries: bibBlocks.length,
    inTextCitations,
    isSortedAlphabetically,
    missingFromBibliography,
    unusedReferences
  };
}
