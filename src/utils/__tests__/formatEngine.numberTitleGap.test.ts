import { describe, it, expect } from 'vitest';
import { splitHeadingNumberTitle } from '../formatEngine';

describe('splitHeadingNumberTitle', () => {
  it('memecah "2.6 Dampak Lingkungan" menjadi nomor + judul', () => {
    expect(splitHeadingNumberTitle('2.6 Dampak Lingkungan dari Konsumsi Air AI')).toEqual({
      number: '2.6',
      title: 'Dampak Lingkungan dari Konsumsi Air AI'
    });
  });
  it('spasi ganda dari teks sumber tetap terpecah', () => {
    expect(splitHeadingNumberTitle('2.6  Dampak')?.title).toBe('Dampak');
  });
  it('menangani nomor tiga tingkat dan romawi', () => {
    expect(splitHeadingNumberTitle('2.6.1 Penggunaan Air')).toEqual({ number: '2.6.1', title: 'Penggunaan Air' });
    expect(splitHeadingNumberTitle('II.3 Metodologi')).toEqual({ number: 'II.3', title: 'Metodologi' });
  });
  it('judul tanpa nomor atau tanpa judul mengembalikan null', () => {
    expect(splitHeadingNumberTitle('Kesimpulan')).toBeNull();
    expect(splitHeadingNumberTitle('2.6')).toBeNull();
  });
});
