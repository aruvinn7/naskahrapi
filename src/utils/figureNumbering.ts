import { ParsedDocument, DocumentSection, DocumentBlock, BlockType } from '../types/document';
import { romanToArabic } from './formatEngine';
import { splitChapterHeading } from './inlineFormat';

/**
 * Penomoran caption gambar & tabel per BAB (konvensi skripsi):
 * "Gambar {nomor-bab}.{urut-dalam-bab} {judul}" — dipanggil saat parse
 * (normalisasi caption tempelan) dan setelah insert/hapus gambar, lalu
 * section DAFTAR GAMBAR / DAFTAR TABEL diisi ulang dari hasilnya.
 */

interface ListEntry {
  text: string;
  blockId: string;
  sectionId: string;
}

const FIGURE_LABEL_PATTERN = /^Gambar\s+[\d.]+\s*[:.]?\s*/i;
const TABLE_LABEL_PATTERN = /^Tabel\s+[\d.]+\s*[:.]?\s*/i;

const LULUH_NOTE = 'Judul setelah label lama dipertahankan; nomor baru dihitung dari posisi.';

function babNumberOf(section: DocumentSection): number | null {
  if (section.type !== 'bab') return null;
  const heading = splitChapterHeading(section.title);
  if (!heading) return null;
  const match = heading.label.match(/^BAB\s+(.+)$/i);
  if (!match) return null;
  const token = match[1].trim();
  if (/^\d+$/.test(token)) return parseInt(token, 10);
  return romanToArabic(token);
}

function stripLabel(text: string, pattern: RegExp): string {
  return text.replace(pattern, '').trim();
}

function rebuildList(
  doc: ParsedDocument,
  type: BlockType,
  title: string,
  itemType: BlockType,
  entries: ListEntry[]
): void {
  if (entries.length === 0) return;

  const blocks: DocumentBlock[] = entries.map((entry, index) => ({
    id: `blk-${type}-${index}`,
    type: itemType,
    rawContent: entry.text,
    formattedContent: entry.text,
    meta: { captionBlockId: entry.blockId, sectionId: entry.sectionId }
  }));

  const existing = doc.sections.find((section) => section.type === type);
  if (existing) {
    existing.blocks = blocks;
    existing.blockCount = blocks.length;
    return;
  }

  const section: DocumentSection = {
    id: `sec-${type}`,
    title,
    type,
    blockCount: blocks.length,
    startPageEstimate: 1,
    blocks
  };
  const firstBabIndex = doc.sections.findIndex((item) => item.type === 'bab');
  if (firstBabIndex >= 0) doc.sections.splice(firstBabIndex, 0, section);
  else doc.sections.push(section);
}

export function renumberCaptions(doc: ParsedDocument): void {
  let globalFigure = 0;
  let globalTable = 0;
  let babNumber: number | null = null;
  let figureInBab = 0;
  let tableInBab = 0;
  const gambarEntries: ListEntry[] = [];
  const tabelEntries: ListEntry[] = [];

  for (const section of doc.sections) {
    if (section.type === 'bab') {
      babNumber = babNumberOf(section);
      figureInBab = 0;
      tableInBab = 0;
    }

    for (const block of section.blocks) {
      if (block.type === 'figure_caption') {
        const title = stripLabel(block.formattedContent, FIGURE_LABEL_PATTERN);
        const label =
          babNumber !== null
            ? `Gambar ${babNumber}.${++figureInBab}`
            : `Gambar ${++globalFigure}.`;
        block.formattedContent = `${label} ${title}`.trim();
        block.rawContent = block.formattedContent;
        gambarEntries.push({
          text: block.formattedContent,
          blockId: block.id,
          sectionId: section.id
        });
      } else if (block.type === 'table_caption') {
        const title = stripLabel(block.formattedContent, TABLE_LABEL_PATTERN);
        const label =
          babNumber !== null
            ? `Tabel ${babNumber}.${++tableInBab}`
            : `Tabel ${++globalTable}.`;
        block.formattedContent = `${label} ${title}`.trim();
        block.rawContent = block.formattedContent;
        tabelEntries.push({
          text: block.formattedContent,
          blockId: block.id,
          sectionId: section.id
        });
      }
    }
  }

  rebuildList(doc, 'daftar_gambar', 'DAFTAR GAMBAR', 'daftar_gambar_item', gambarEntries);
  rebuildList(doc, 'daftar_tabel', 'DAFTAR TABEL', 'daftar_tabel_item', tabelEntries);
}

/** Baca file gambar jadi data URL. */
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('gagal membaca file'));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('gagal memuat gambar'));
    image.src = dataUrl;
  });
}

/**
 * Kompresi gambar saat insert: lebar di atas 1600 px di-resize, file besar
 * (> 500 KB) dijadikan JPEG 0.85 agar autosave localStorage (~5 MB) aman.
 * Gambar kecil lolos apa adanya. Mengembalikan juga dimensi akhir (px) untuk
 * skala ekspor Word.
 */
export async function compressImageFile(
  file: File,
  opts: { maxPx?: number; quality?: number; maxBytes?: number } = {}
): Promise<{ dataUrl: string; width: number; height: number }> {
  const { maxPx = 1600, quality = 0.85, maxBytes = 500 * 1024 } = opts;
  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(dataUrl);

  const needsResize = image.width > maxPx;
  const needsReencode = file.size > maxBytes;
  if (!needsResize && !needsReencode) {
    return { dataUrl, width: image.width, height: image.height };
  }

  const scale = needsResize ? maxPx / image.width : 1;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const context = canvas.getContext('2d');
  if (!context) return { dataUrl, width: image.width, height: image.height };
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return {
    dataUrl: canvas.toDataURL('image/jpeg', quality),
    width: canvas.width,
    height: canvas.height
  };
}
