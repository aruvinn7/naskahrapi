import { describe, it, expect } from 'vitest';
import { parseRawDocument } from '../aiCleaner';
import { DEFAULT_CONFIG_MAKALAH } from './helpers';

const cfg = DEFAULT_CONFIG_MAKALAH;

describe('deteksi list', () => {
  it('"Kata. kalimat..." TIDAK dianggap list (bug utama)', () => {
    const doc = parseRawDocument(
      '## 1.1 Latar Belakang\n\nSalah satu peristiwa paling dikenal adalah skandal Cambridge\nAnalytica. Komisi Perdagangan Federal menyatakan pelanggaran.',
      cfg
    );
    const types = doc.sections.flatMap((s) => s.blocks.map((b) => b.type));
    expect(types).not.toContain('list_item');
  });

  it('penanda sah tetap jadi list_item', () => {
    for (const marker of ['1.', '1)', 'a.', 'a)', '-', '*', '•']) {
      const doc = parseRawDocument(`${marker} item pertama`, cfg);
      expect(
        doc.sections.some((s) => s.blocks.some((b) => b.type === 'list_item'))
      ).toBe(true);
    }
  });

  it('"A. Latar Belakang" tetap heading_2 sub-bab', () => {
    const doc = parseRawDocument('A. Latar Belakang', cfg);
    expect(doc.sections.some((s) => s.blocks.some((b) => b.type === 'heading_2'))).toBe(true);
  });
});
