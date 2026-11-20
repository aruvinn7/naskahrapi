import { describe, it, expect } from 'vitest';
import { parseRawDocument } from '../aiCleaner';
import { DEFAULT_CONFIG_MAKALAH } from './helpers';

const cfg = DEFAULT_CONFIG_MAKALAH;

describe('penggabungan baris lanjutan (hard-wrap Pandoc)', () => {
  it('list hard-wrap Pandoc bergabung', () => {
    const doc = parseRawDocument(
      '1.  Apa yang menyebabkan Meta menjadi salah satu perusahaan\n    paling kontroversial dalam satu dekade terakhir?',
      cfg
    );
    const items = doc.sections.flatMap((s) => s.blocks.filter((b) => b.type === 'list_item'));
    expect(items).toHaveLength(1);
    expect(items[0].formattedContent).toContain('perusahaan paling kontroversial dalam satu dekade terakhir?');
  });

  it('entri pustaka hard-wrap bergabung jadi satu entri', () => {
    const doc = parseRawDocument(
      '# DAFTAR PUSTAKA\n\nFederal Trade Commission. (2019). *FTC imposes penalty\n    on Facebook*.',
      cfg
    );
    const entries = doc.sections.flatMap((s) => s.blocks.filter((b) => b.type === 'daftar_pustaka_item'));
    expect(entries).toHaveLength(1);
    expect(entries[0].formattedContent).toContain('on Facebook*');
  });

  it('paragraf biasa ter-indent tetap wajar (tanpa list sebelumnya)', () => {
    const doc = parseRawDocument('Kalimat pembuka.\n    Kalimat lanjutan paragraf.', cfg);
    expect(
      doc.sections
        .flatMap((s) => s.blocks)
        .every((b) => b.type === 'paragraph' || b.type.startsWith('heading'))
    ).toBe(true);
  });

  it('baris lanjutan setelah baris kosong tidak menggabung lintas item', () => {
    const doc = parseRawDocument(
      '1.  Item pertama\n\n2.  Item kedua',
      cfg
    );
    const items = doc.sections.flatMap((s) => s.blocks.filter((b) => b.type === 'list_item'));
    expect(items).toHaveLength(2);
  });
});
