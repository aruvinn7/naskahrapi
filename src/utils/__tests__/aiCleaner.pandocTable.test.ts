import { describe, it, expect } from 'vitest';
import { convertSimpleTables, parseRawDocument } from '../aiCleaner';
import { DEFAULT_CONFIG_MAKALAH } from './helpers';

const cfg = DEFAULT_CONFIG_MAKALAH;

// Fixture snippet tabel 2.3 dokumen Meta (border atas, header wrap 3 baris,
// separator 4 run, 5 baris data dengan wrap). Baris dibangun dengan padEnd
// agar posisi kolom presisi terhadap run separator.
const colWidths = [12, 28, 14, 13];
const padRow = (cells: string[]) =>
  cells
    .map((cell, idx) => (idx === cells.length - 1 ? cell : cell.padEnd(colWidths[idx] + 2, ' ')))
    .join('');
const sepRow = colWidths.map((w, idx) => '-'.repeat(w) + (idx < colWidths.length - 1 ? '  ' : '')).join('');
const borderRow = '-'.repeat(colWidths.reduce((a, b) => a + b + 2, 0));

const snippet = [
  'Tabel 2.3: Karakteristik Platform Meta',
  '',
  borderRow,
  padRow(['Platform', 'Deskripsi', 'Pengguna aktif', 'Tahun rilis']),
  padRow(['', 'fitur utama platform', '', '']),
  sepRow,
  padRow(['Facebook', 'Jejaring sosial, grup,', '3.09 miliar', '2004']),
  padRow(['', 'halaman, dan berbagi konten', '', '']),
  padRow(['Instagram', 'Berbagi foto dan video', '2.00 miliar', '2010']),
  padRow(['WhatsApp', 'Pesan instan terenkripsi', '2.70 miliar', '2009']),
  padRow(['Messenger', 'Pesan langsung dan video', '1.00 miliar', '2011']),
  padRow(['Threads', 'Diskusi teks berbasis', '0.10 miliar', '2023']),
  padRow(['', 'feed', '', '']),
  borderRow
].join('\n');

describe('convertSimpleTables', () => {
  it('mengonversi simple-table Pandoc menjadi baris pipe', () => {
    const converted = convertSimpleTables(snippet);
    expect(converted).toContain('| Platform | Deskripsi fitur utama platform | Pengguna aktif | Tahun rilis |');
    expect(converted).toContain('| Facebook | Jejaring sosial, grup, halaman, dan berbagi konten | 3.09 miliar | 2004 |');
    expect(converted).toContain('| Threads | Diskusi teks berbasis feed | 0.10 miliar | 2023 |');
  });
});

describe('parseRawDocument + convertSimpleTables (integrasi)', () => {
  it('tabel 2.3 Meta menjadi blok table dengan header 4 kolom dan 5 baris', () => {
    const doc = parseRawDocument(snippet, cfg);
    const tables = doc.sections.flatMap((s) => s.blocks.filter((b) => b.type === 'table'));
    expect(tables.length).toBeGreaterThanOrEqual(1);

    const table = tables[0];
    expect(table.meta!.header).toHaveLength(4);
    expect(table.meta!.rows).toHaveLength(5);
    expect(table.meta!.rows[0][1]).toBe('Jejaring sosial, grup, halaman, dan berbagi konten');

    // Border dash tidak bocor menjadi blok paragraf.
    const dashParagraphs = doc.sections
      .flatMap((s) => s.blocks)
      .filter((b) => b.type === 'paragraph' && b.formattedContent.includes('---'));
    expect(dashParagraphs).toHaveLength(0);
  });

  it('tabel pipe markdown biasa tetap terdeteksi (regresi jalur lama)', () => {
    const doc = parseRawDocument('| A | B |\n|---|---|\n| 1 | 2 |', cfg);
    const tables = doc.sections.flatMap((s) => s.blocks.filter((b) => b.type === 'table'));
    expect(tables).toHaveLength(1);
    expect(tables[0].meta!.header).toEqual(['A', 'B']);
    expect(tables[0].meta!.rows).toEqual([['1', '2']]);
  });

  it('fallback: region dashed tanpa body valid tetap paragraf tanpa crash', () => {
    const doc = parseRawDocument('Teks pengantar.\n\n----  ----\n\nIsi setelah tabel rusak.', cfg);
    const blocks = doc.sections.flatMap((s) => s.blocks);
    expect(blocks.some((b) => b.type === 'paragraph')).toBe(true);
    expect(blocks.some((b) => b.formattedContent.includes('Isi setelah tabel rusak'))).toBe(true);
    expect(blocks.filter((b) => b.type === 'table')).toHaveLength(0);
  });
});
