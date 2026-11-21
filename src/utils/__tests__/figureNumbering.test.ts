import { describe, it, expect } from 'vitest';
import { parseRawDocument } from '../aiCleaner';
import { renumberCaptions } from '../figureNumbering';
import { DEFAULT_CONFIG_MAKALAH } from './helpers';
import type { ParsedDocument } from '../../types/document';

function parseDoc(raw: string): ParsedDocument {
  return parseRawDocument(raw, DEFAULT_CONFIG_MAKALAH);
}

function captionTexts(doc: ParsedDocument) {
  return doc.sections
    .flatMap((s) => s.blocks)
    .filter((b) => b.type === 'figure_caption' || b.type === 'table_caption')
    .map((b) => b.formattedContent);
}

function daftarGambarTexts(doc: ParsedDocument) {
  const section = doc.sections.find((s) => s.type === 'daftar_gambar');
  return (section?.blocks ?? []).map((b) => b.formattedContent);
}

function daftarTabelTexts(doc: ParsedDocument) {
  const section = doc.sections.find((s) => s.type === 'daftar_tabel');
  return (section?.blocks ?? []).map((b) => b.formattedContent);
}

const RAW_DUA_BAB = [
  '# MAKALAH',
  'Analisis AI',
  '---',
  'BAB I PENDAHULUAN',
  '1.1 Latar Belakang',
  'Perkembangan AI sangat pesat.',
  'Gambar 1. Aliran pendingin',
  '---',
  'BAB II PEMBAHASAN',
  '2.1 Pengertian',
  'Kecerdasan buatan adalah bidang ilmu komputer.',
  'Gambar 3. Skema evaporatif',
  'Gambar 9. Imersi cairan',
  'Tabel 1. Estimasi air',
  '---',
  'DAFTAR PUSTAKA',
  'Gao, P., & Zhang, Y. (2024). Measuring footprints. Journal of Green Computing, 12(3), 145-162.'
].join('\n');

describe('renumberCaptions — penomoran per BAB', () => {
  it('caption mengikuti nomor bab: BAB I → 1.1, BAB II → 2.1, 2.2', () => {
    const doc = parseDoc(RAW_DUA_BAB);
    renumberCaptions(doc);
    expect(captionTexts(doc)).toEqual([
      'Gambar 1.1 Aliran pendingin',
      'Gambar 2.1 Skema evaporatif',
      'Gambar 2.2 Imersi cairan',
      'Tabel 2.1 Estimasi air'
    ]);
  });

  it('daftar gambar & daftar tabel diregenerasi dengan teks baru', () => {
    const doc = parseDoc(RAW_DUA_BAB);
    renumberCaptions(doc);
    expect(daftarGambarTexts(doc)).toEqual([
      'Gambar 1.1 Aliran pendingin',
      'Gambar 2.1 Skema evaporatif',
      'Gambar 2.2 Imersi cairan'
    ]);
    expect(daftarTabelTexts(doc)).toEqual(['Tabel 2.1 Estimasi air']);
  });

  it('menghapus caption di tengah menggeser nomor di bawahnya', () => {
    const doc = parseDoc(RAW_DUA_BAB);
    // buang caption tengah BAB II ("Skema evaporatif")
    for (const section of doc.sections) {
      section.blocks = section.blocks.filter(
        (b) => !(b.type === 'figure_caption' && b.formattedContent.includes('Skema evaporatif'))
      );
    }
    renumberCaptions(doc);
    expect(captionTexts(doc)).toContain('Gambar 2.1 Imersi cairan');
    expect(captionTexts(doc)).toContain('Tabel 2.1 Estimasi air');
  });

  it('caption di luar BAB memakai nomor global', () => {
    const raw = [
      '# MAKALAH',
      'KATA PENGANTAR',
      'Puji syukur kami panjatkan.',
      'Gambar 4. Diagram penulis',
      '---',
      'BAB I PENDAHULUAN',
      '1.1 Latar Belakang',
      'Isi bab.',
      'Gambar 2. Aliran pendingin'
    ].join('\n');
    const doc = parseDoc(raw);
    renumberCaptions(doc);
    expect(captionTexts(doc)).toEqual(['Gambar 1. Diagram penulis', 'Gambar 1.1 Aliran pendingin']);
  });

  it('section daftar_gambar dibuat bila belum ada', () => {
    const doc = parseDoc(RAW_DUA_BAB);
    doc.sections = doc.sections.filter((s) => s.type !== 'daftar_gambar');
    renumberCaptions(doc);
    expect(daftarGambarTexts(doc).length).toBe(3);
  });
});
