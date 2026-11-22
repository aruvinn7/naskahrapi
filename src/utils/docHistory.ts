import { ParsedDocument, DocumentConfig } from '../types/document';

/**
 * Riwayat Dokumen: snapshot beberapa dokumen terakhir di localStorage agar
 * user pindah-pindah makalah tanpa kehilangan yang lama. Dokumen aktif tidak
 * pernah dihilangkan — arsip dulu sebelum replace/kosongkan.
 */

export interface HistoryEntry {
  id: string;
  name: string;
  savedAt: number;
  doc: ParsedDocument;
  config: DocumentConfig;
}

export const HISTORY_KEY = 'skripsi-rapi-history-v1';
export const HISTORY_LIMIT = 10;

/** Dokumen kosong/blank: hanya cover template, tidak layak diarsipkan. */
function isEmptyDoc(doc: ParsedDocument): boolean {
  if (doc.rawText.trim().length > 0) return false;
  const hasRealContent = doc.sections.some((section) =>
    section.blocks.some(
      (block) =>
        block.type !== 'cover' && (block.formattedContent || '').trim().length > 0
    )
  );
  return !hasRealContent;
}

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = globalThis.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.entries) ? parsed.entries : [];
  } catch {
    return [];
  }
}

/**
 * Simpan riwayat dengan fallback kuota localStorage: bila setItem gagal,
 * buang entri terlama (maks 3 ronde); bila masih gagal, gambar besar
 * ditangalkan (dataUrl → placeholder); bila tetap gagal, kembalikan false
 * (riwayat dilewati diam-diam — dokumen aktif aman).
 */
function stripImageEntries(entries: HistoryEntry[]): HistoryEntry[] {
  return entries.map((entry) => ({
    ...entry,
    doc: {
      ...entry.doc,
      sections: entry.doc.sections.map((section) => ({
        ...section,
        blocks: section.blocks.map((block) => {
          if (block.type === 'image' && block.meta?.dataUrl) {
            return { ...block, meta: { ...block.meta, dataUrl: 'data:image/stripped' } };
          }
          return block;
        })
      }))
    }
  }));
}

export function saveHistory(entries: HistoryEntry[]): boolean {
  // Urutan preferensi: pertahankan semua entri (plain → gambar di-strip),
  // baru buang entri terlama bertahap bila kuota tetap penuh.
  const variants: HistoryEntry[][] = [];
  for (let drop = 0; drop <= entries.length; drop++) {
    const kept = entries.slice(drop);
    variants.push(kept);
    variants.push(stripImageEntries(kept));
  }
  // Jangan pernah menyimpan riwayat kosong — lebih baik gagal (dokumen
  // aktif tetap aman) daripada kehilangan seluruh riwayat.
  const nonEmpty = variants.filter((attempt) => attempt.length > 0);
  for (const attempt of nonEmpty) {
    try {
      globalThis.localStorage.setItem(
        HISTORY_KEY,
        JSON.stringify({ entries: attempt, savedAt: Date.now() })
      );
      return true;
    } catch {
      // coba strategi berikutnya
    }
  }
  return false;
}
export function addToHistory(
  entries: HistoryEntry[],
  doc: ParsedDocument,
  config: DocumentConfig
): HistoryEntry[] {
  if (isEmptyDoc(doc)) return entries;
  // RawText identik = dokumen yang sama, jangan diduplikasi.
  if (entries.some((entry) => entry.doc.rawText === doc.rawText)) return entries;

  const entry: HistoryEntry = {
    id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: doc.fileName || 'DOKUMEN.docx',
    savedAt: Date.now(),
    doc: JSON.parse(JSON.stringify(doc)),
    config: JSON.parse(JSON.stringify(config))
  };
  const next = [...entries, entry];
  return next.length > HISTORY_LIMIT ? next.slice(next.length - HISTORY_LIMIT) : next;
}

export function removeHistoryEntry(entries: HistoryEntry[], id: string): HistoryEntry[] {
  return entries.filter((entry) => entry.id !== id);
}
