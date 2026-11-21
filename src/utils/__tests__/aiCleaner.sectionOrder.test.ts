import { describe, it, expect } from 'vitest';
import { parseRawDocument } from '../aiCleaner';
import { SAMPLE_AI_RAW_TEXT } from '../../data/sampleDocument';
import { DEFAULT_CONFIG_MAKALAH } from './helpers';

function sectionTypes(raw: string) {
  return parseRawDocument(raw, DEFAULT_CONFIG_MAKALAH).sections.map((s) => s.type);
}

describe('urutan baku section front-matter', () => {
  it('auto-inject daftar tabel/gambar/isi tetap di urutan baku setelah kata pengantar', () => {
    const raw = [
      '# MAKALAH',
      'Analisis Dampak AI',
      '---',
      'KATA PENGANTAR',
      'Puji syukur kami panjatkan ke hadirat Tuhan Yang Maha Esa.',
      '---',
      'BAB I PENDAHULUAN',
      '1.1 Latar Belakang',
      'Perkembangan AI sangat pesat akhir-akhir ini.',
      'Tabel 1. Estimasi konsumsi air',
      '| Tahap | Volume |',
      '| --- | --- |',
      '| Pelatihan GPT-3 | 700.000 liter |',
      'Gambar 1. Skema aliran pendingin',
      '---',
      'DAFTAR PUSTAKA',
      'Gao, P., & Zhang, Y. (2024). Measuring footprints. Journal of Green Computing, 12(3), 145-162.'
    ].join('\n');

    expect(sectionTypes(raw)).toEqual([
      'cover',
      'kata_pengantar',
      'daftar_isi',
      'daftar_tabel',
      'daftar_gambar',
      'bab',
      'daftar_pustaka'
    ]);
  });

  it('urutan tempelan user yang terbalik dinormalkan', () => {
    const raw = [
      '# MAKALAH',
      'DAFTAR TABEL',
      'Tabel 1. Estimasi konsumsi air',
      '---',
      'KATA PENGANTAR',
      'Puji syukur kami panjatkan ke hadirat Tuhan Yang Maha Esa.',
      '---',
      'BAB I PENDAHULUAN',
      '1.1 Latar Belakang',
      'Isi latar belakang.'
    ].join('\n');

    expect(sectionTypes(raw)).toEqual([
      'cover',
      'kata_pengantar',
      'daftar_isi',
      'daftar_tabel',
      'bab'
    ]);
  });

  it('contoh bawaan (Coba Contoh AI) memuat DAFTAR GAMBAR dan urutan baku', () => {
    const types = sectionTypes(SAMPLE_AI_RAW_TEXT);
    expect(types.slice(0, 5)).toEqual([
      'cover',
      'kata_pengantar',
      'daftar_isi',
      'daftar_tabel',
      'daftar_gambar'
    ]);
    const doc = parseRawDocument(SAMPLE_AI_RAW_TEXT, DEFAULT_CONFIG_MAKALAH);
    const gambar = doc.sections.find((s) => s.type === 'daftar_gambar');
    expect(gambar?.blocks.length).toBeGreaterThanOrEqual(1);
  });
});
