import { DocumentBlock } from '../types/document';

/** Jarak indentasi & hanging tiap tingkat penomoran (cm). */
export const LIST_INDENT_CM = 0.75;

/** Tingkat penomoran maksimum yang didukung (1, a, 1), a), (1), (a)). */
export const MAX_LIST_LEVEL = 6;

/**
 * Penanda daftar di awal baris: bullet (-, *, •) ataupun nomor/huruf eksplisit
 * (1., a., 1), a), (1), (a)).
 */
const LIST_MARKER =
  /^\s*(?:[-*•]|\d{1,2}[.)]|[a-zA-Z][.)]|\(\d{1,2}\)|\([a-zA-Z]\))\s+/;

export interface ListLabel {
  /** Teks penanda, mis. "3." atau "b)" */
  label: string;
  /** 1..6 */
  level: number;
}

/** Membuang penanda daftar dari teks sehingga isinya bisa dinomori ulang. */
export function stripListMarker(text: string): string {
  return text.replace(LIST_MARKER, '').trim();
}

function alphaLabel(index: number): string {
  let value = index;
  let out = '';
  while (value > 0) {
    const rest = value % 26;
    out = String.fromCharCode(97 + (rest === 0 ? 25 : rest - 1)) + out;
    value = Math.floor((value - (rest === 0 ? 26 : rest)) / 26);
  }
  return out;
}

function markerFor(level: number, counter: number): string {
  switch (level) {
    case 1:
      return `${counter}.`;
    case 2:
      return `${alphaLabel(counter)}.`;
    case 3:
      return `${counter})`;
    case 4:
      return `${alphaLabel(counter)})`;
    case 5:
      return `(${counter})`;
    default:
      return `(${alphaLabel(counter)})`;
  }
}

/**
 * Menghitung nomor urut untuk blok `list_item` dalam satu section.
 *
 * Tingkat ditentukan dari indentasi baris sumber (disimpan di `meta.indent`);
 * daftar tanpa indentasi menjadi tingkat 1. Penghitung otomatis ulang saat
 * daftar baru dimulai atau saat naik ke tingkat yang lebih dangkal.
 */
export function buildListLabels(blocks: DocumentBlock[]): Map<string, ListLabel> {
  const labels = new Map<string, ListLabel>();
  const counters = new Array<number>(MAX_LIST_LEVEL).fill(0);
  const indents: number[] = [];

  for (const block of blocks) {
    if (block.type !== 'list_item') {
      indents.length = 0;
      counters.fill(0);
      continue;
    }

    const indent = typeof block.meta?.indent === 'number' ? block.meta.indent : 0;

    while (indents.length > 0 && indent < indents[indents.length - 1]) {
      indents.pop();
    }
    if (indents.length === 0 || indent > indents[indents.length - 1]) {
      indents.push(indent);
    }

    const level = Math.min(MAX_LIST_LEVEL, indents.length);
    counters[level - 1] += 1;
    for (let deeper = level; deeper < MAX_LIST_LEVEL; deeper += 1) {
      counters[deeper] = 0;
    }

    labels.set(block.id, { level, label: markerFor(level, counters[level - 1]) });
  }

  return labels;
}