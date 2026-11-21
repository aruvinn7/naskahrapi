import { describe, it, expect } from 'vitest';
import { parseRawDocument } from '../aiCleaner';
import { DEFAULT_CONFIG_MAKALAH as cfg } from './helpers';
import { SAMPLE_AI_RAW_TEXT } from '../../data/sampleDocument';

const KATA_PENGANTAR_DUA_BARIS = `KATA PENGANTAR

Puji syukur kami panjatkan ke hadirat Tuhan Yang Maha Esa.

Jakarta, 19 November 2026
Tim Penulis

---

BAB I PENDAHULUAN
1.1 Latar Belakang
Isi paragraf.
`;

const KATA_PENGANTAR_SATU_BARIS = `KATA PENGANTAR

Puji syukur kami panjatkan ke hadirat Tuhan Yang Maha Esa.

Jakarta, 19 November 2026 Tim Penulis

---

BAB I PENDAHULUAN
1.1 Latar Belakang
Isi paragraf.
`;

describe('penutup KATA PENGANTAR', () => {
  it('memisahkan kota/tanggal dan nama penulis jadi blok signature', () => {
    const doc = parseRawDocument(KATA_PENGANTAR_DUA_BARIS, cfg);
    const block = doc.sections.flatMap((s) => s.blocks).find((b) => b.type === 'signature');

    expect(block).toBeDefined();
    expect(block!.meta).toMatchObject({
      place: 'Jakarta',
      date: '19 November 2026',
      signer: 'Tim Penulis'
    });
  });

  it('tidak menggabungkan penutup ke paragraf sebelumnya', () => {
    const doc = parseRawDocument(KATA_PENGANTAR_DUA_BARIS, cfg);
    const paragraphs = doc.sections
      .flatMap((s) => s.blocks)
      .filter((b) => b.type === 'paragraph');

    expect(paragraphs.some((p) => p.formattedContent.includes('Tim Penulis'))).toBe(false);
    expect(paragraphs.some((p) => p.formattedContent.includes('19 November 2026'))).toBe(false);
  });

  it('menangani kasus satu baris "kota, tanggal penulis"', () => {
    const doc = parseRawDocument(KATA_PENGANTAR_SATU_BARIS, cfg);
    const block = doc.sections.flatMap((s) => s.blocks).find((b) => b.type === 'signature');

    expect(block).toBeDefined();
    expect(block!.meta).toMatchObject({
      place: 'Jakarta',
      date: '19 November 2026',
      signer: 'Tim Penulis'
    });
  });
});

describe('DAFTAR ISI otomatis', () => {
  it('dibuat otomatis saat dokumen punya BAB tanpa DAFTAR ISI', () => {
    const doc = parseRawDocument(KATA_PENGANTAR_DUA_BARIS, cfg);
    const tocSections = doc.sections.filter((s) => s.type === 'daftar_isi');

    expect(tocSections).toHaveLength(1);
    expect(tocSections[0].title).toBe('DAFTAR ISI');
    // Diletakkan sebelum BAB pertama.
    const tocIndex = doc.sections.findIndex((s) => s.type === 'daftar_isi');
    const firstBabIndex = doc.sections.findIndex((s) => s.type === 'bab');
    expect(tocIndex).toBeLessThan(firstBabIndex);
  });

  it('tidak dobel kalau user sudah menulis DAFTAR ISI sendiri', () => {
    const input = `KATA PENGANTAR

Puji syukur.

DAFTAR ISI

BAB I PENDAHULUAN
1.1 Latar Belakang
Isi paragraf.
`;
    const doc = parseRawDocument(input, cfg);
    expect(doc.sections.filter((s) => s.type === 'daftar_isi')).toHaveLength(1);
  });

  it('tidak dibuat kalau tidak ada BAB sama sekali', () => {
    const doc = parseRawDocument('KATA PENGANTAR\n\nPuji syukur.', cfg);
    expect(doc.sections.some((s) => s.type === 'daftar_isi')).toBe(false);
    expect(doc.issues.some((i) => i.id === 'missing-daftar-isi')).toBe(true);
  });

  it('contoh AI bawaan (Coba Contoh AI) mendapat DAFTAR ISI', () => {
    const doc = parseRawDocument(SAMPLE_AI_RAW_TEXT, cfg);
    expect(doc.sections.some((s) => s.type === 'daftar_isi')).toBe(true);
  });
});
