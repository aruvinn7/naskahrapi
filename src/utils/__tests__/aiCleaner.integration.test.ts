import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseRawDocument } from '../aiCleaner';
import { DEFAULT_CONFIG_MAKALAH } from './helpers';
import { SAMPLE_AI_RAW_TEXT } from '../../data/sampleDocument';

const cfg = DEFAULT_CONFIG_MAKALAH;
const fixture = readFileSync(new URL('./fixtures/meta-pandoc.md', import.meta.url), 'utf8');

describe('integrasi penuh: dokumen Meta hasil render Pandoc', () => {
  const doc = parseRawDocument(fixture, cfg);
  const allBlocks = doc.sections.flatMap((s) => s.blocks);

  it('urutan section lengkap dengan CATATAN PENYUSUNAN di akhir', () => {
    // "daftar_tabel" disisipkan otomatis karena fixture punya caption tabel;
    // "daftar_isi" disisipkan otomatis karena fixture punya BAB tanpa DAFTAR ISI.
    // Urutan baku front-matter dinormalkan: abstrak → daftar isi → daftar tabel.
    expect(doc.sections.map((s) => s.type)).toEqual([
      'cover',
      'abstrak',
      'daftar_isi',
      'daftar_tabel',
      'bab',
      'bab',
      'bab',
      'bab',
      'bab',
      'daftar_pustaka',
      'bab'
    ]);
    expect(doc.sections[10].title).toBe('CATATAN PENYUSUNAN');
    expect(doc.sections[9].type).toBe('daftar_pustaka');
  });

  it('tepat 8 blok tabel dan semuanya memiliki header', () => {
    const tables = allBlocks.filter((b) => b.type === 'table');
    expect(tables).toHaveLength(8);
    expect(tables.every((t) => Array.isArray(t.meta!.header) && t.meta!.header.length > 0)).toBe(true);
  });

  it('tidak ada blok yang mengandung escape \\$ atau \\*', () => {
    for (const block of allBlocks) {
      expect(block.formattedContent).not.toContain('\\$');
      expect(block.formattedContent).not.toContain('\\*');
      expect(block.rawContent).not.toContain('\\$');
      expect(block.rawContent).not.toContain('\\*');
    }
  });

  it('daftar pustaka berisi 7 entri', () => {
    const entries = allBlocks.filter((b) => b.type === 'daftar_pustaka_item');
    expect(entries).toHaveLength(7);
  });

  it('item pertama Rumusan Masalah utuh (tidak pecah)', () => {
    const firstListItem = allBlocks.find((b) => b.type === 'list_item');
    expect(firstListItem).toBeDefined();
    expect(firstListItem!.formattedContent).toContain('paling kontroversial dalam satu dekade terakhir?');
  });

  it('escape Pandoc dinormalkan: dolar, en-dash, dan backtick', () => {
    expect(allBlocks.some((b) => b.formattedContent.includes('US$5 miliar'))).toBe(true);
    expect(allBlocks.some((b) => b.formattedContent.includes('2016–2026'))).toBe(true);
    expect(allBlocks.some((b) => b.formattedContent.includes('metaverse'))).toBe(true);
    expect(allBlocks.some((b) => b.formattedContent.includes('`'))).toBe(false);
  });

  it('tidak ada paragraf liar header tabel simple-table sebelum blok tabel', () => {
    // Setiap table_caption harus langsung diikuti blok tabel, bukan paragraf
    // sisa header simple-table yang gagal terkonversi.
    for (const section of doc.sections) {
      section.blocks.forEach((block, index) => {
        if (block.type !== 'table_caption') return;
        const next = section.blocks[index + 1];
        expect(next?.type).toBe('table');
      });
    }
  });

  it('cover tidak menyimpan sisa backslash hard-break Pandoc', () => {
    expect(JSON.stringify(doc.cover)).not.toContain('\\');
  });

  it('contoh AI bawaan memuat tabel contoh beserta judulnya', () => {
    const sample = parseRawDocument(SAMPLE_AI_RAW_TEXT, cfg);
    const blocks = sample.sections.flatMap((s) => s.blocks);
    const table = blocks.find((b) => b.type === 'table');

    expect(table).toBeDefined();
    expect((table?.meta?.header as string[]) ?? []).toHaveLength(3);
    expect((table?.meta?.rows as string[][]) ?? []).toHaveLength(3);
    expect(blocks.some((b) => b.type === 'table_caption')).toBe(true);
  });

  it('golden regresi SAMPLE_AI_RAW_TEXT tidak mengalami regresi', () => {
    const sample = parseRawDocument(SAMPLE_AI_RAW_TEXT, cfg);
    expect(sample.sections.length).toBeGreaterThanOrEqual(5);
    expect(sample.sections.some((s) => s.type === 'daftar_pustaka')).toBe(true);
    const startingWithHash = sample.sections
      .flatMap((s) => s.blocks)
      .filter((b) => b.formattedContent.startsWith('#'));
    expect(startingWithHash).toHaveLength(0);
  });
});
