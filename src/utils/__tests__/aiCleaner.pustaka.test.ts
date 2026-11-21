import { describe, it, expect } from 'vitest';
import { parseRawDocument } from '../aiCleaner';
import { DEFAULT_CONFIG_MAKALAH } from './helpers';

const REFS = [
  'Gao, P., & Zhang, Y. (2024). Measuring the Environmental Footprint of Modern Data Centers. Journal of Green Computing, 12(3), 145-162.',
  'Li, P., Yang, J., Islam, M. A., & Ren, S. (2023). Making AI Less "Thirsty": Uncovering and Addressing the Secret Water Footprint of AI Models. arXiv preprint arXiv:2304.03271.',
  'Mytton, D. (2021). Data centre water consumption. npj Clean Water, 4(1), 1-6.',
  'UNESCO. (2023). The United Nations World Water Development Report 2023: Partnerships and cooperation for water. UNESCO Publishing.'
];

function pustakaItems(raw: string) {
  const doc = parseRawDocument(raw, DEFAULT_CONFIG_MAKALAH);
  const section = doc.sections.find((s) => s.type === 'daftar_pustaka');
  return (section?.blocks ?? []).filter((b) => b.type === 'daftar_pustaka_item');
}

describe('pemisahan entri DAFTAR PUSTAKA', () => {
  it('memecah aliran teks pustaka yang menempel jadi satu entri per sumber', () => {
    // Sumber dari AI: semua referensi menempel tanpa baris kosong/penanda list.
    const raw = `DAFTAR PUSTAKA\n${REFS.join(' ')}`;
    const items = pustakaItems(raw);

    expect(items.length).toBe(4);
    expect(items[0].formattedContent.startsWith('Gao, P., & Zhang, Y.')).toBe(true);
    expect(items[1].formattedContent.startsWith('Li, P., Yang, J.')).toBe(true);
    expect(items[2].formattedContent.startsWith('Mytton, D.')).toBe(true);
    expect(items[3].formattedContent.startsWith('UNESCO. (2023)')).toBe(true);
  });

  it('entri yang sudah dipisah baris kosong tetap satu blok per entri', () => {
    const raw = `DAFTAR PUSTAKA\n${REFS.join('\n\n')}`;
    const items = pustakaItems(raw);
    expect(items.length).toBe(4);
    expect(items[2].formattedContent.startsWith('Mytton, D.')).toBe(true);
  });

  it('satu referensi yang di-hard-wrap beberapa baris tidak terpecah', () => {
    const raw = [
      'DAFTAR PUSTAKA',
      'Mytton, D. (2021). Data centre water consumption. npj Clean Water, 4(1),',
      '1-6. https://doi.org/10.1038/s41545-021-0019-2'
    ].join('\n');
    const items = pustakaItems(raw);
    expect(items.length).toBe(1);
    expect(items[0].formattedContent).toContain('npj Clean Water');
  });
});
