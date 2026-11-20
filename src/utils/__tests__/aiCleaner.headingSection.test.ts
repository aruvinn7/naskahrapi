import { describe, it, expect } from 'vitest';
import { parseRawDocument } from '../aiCleaner';
import { DEFAULT_CONFIG_MAKALAH } from './helpers';

const cfg = DEFAULT_CONFIG_MAKALAH;

describe('heading markdown level-1 membuka section sendiri', () => {
  it('# CATATAN PENYUSUNAN setelah DAFTAR PUSTAKA jadi section sendiri', () => {
    const doc = parseRawDocument(
      '# DAFTAR PUSTAKA\n\nFTC. (2019). *Penalty*.\n\n# CATATAN PENYUSUNAN\n\n1.  Catatan pertama.',
      cfg
    );
    const catatan = doc.sections.find((s) => s.title === 'CATATAN PENYUSUNAN');
    expect(catatan).toBeDefined();
    expect(catatan!.blocks.some((b) => b.type === 'list_item')).toBe(true);

    const pustaka = doc.sections.find((s) => s.type === 'daftar_pustaka')!;
    expect(pustaka.blocks.filter((b) => b.type === 'daftar_pustaka_item')).toHaveLength(1);
  });

  it('# MAKALAH baris pertama tetap tinggal di section cover', () => {
    const doc = parseRawDocument('# MAKALAH\n\n## JUDUL PENELITIAN CONTOH PANJANG', cfg);
    expect(doc.sections[0].type).toBe('cover');
    expect(doc.sections[0].blocks.length).toBeGreaterThanOrEqual(2);
  });
});
