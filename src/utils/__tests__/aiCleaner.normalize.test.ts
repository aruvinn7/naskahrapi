import { describe, it, expect } from 'vitest';
import { normalizePandocArtifacts, parseRawDocument } from '../aiCleaner';
import type { DocumentConfig } from '../../types/document';
import { TEMPLATE_PRESETS } from '../templatePresets';

// Konfigurasi minimal untuk pengujian integrasi parseRawDocument.
const config: DocumentConfig = {
  template: 'makalah',
  ...TEMPLATE_PRESETS.makalah,
  fontFamily: 'Times New Roman',
  hangingIndent: 1.27,
  tableStyle: { borderWidth: 1, headerBold: true, cellAlignment: 'left' },
  alignment: 'justify',
  headingRules: {
    h1: { bold: true, italic: false, allCaps: true, alignment: 'center', spaceBefore: 24, spaceAfter: 18 },
    h2: { bold: true, italic: false, allCaps: false, alignment: 'left', spaceBefore: 18, spaceAfter: 6 },
    h3: { bold: true, italic: true, allCaps: false, alignment: 'left', spaceBefore: 12, spaceAfter: 6 },
    numberingFormat: 'bab-roman',
    babTitleStyle: 'separate',
    h2Numbering: 'numeric',
    numberTitleGapCm: 0
  },
  pageSetup: {
    paperSize: 'a4',
    orientation: 'portrait',
    headerText: '',
    headerEnabled: false,
    pageNumberPosition: 'bottom-center',
    newPagePerBab: true
  },
  coverLayout: { variant: 'klasik' },
  rules: { clean_chatter: true, clean_markdown: true }
};

describe('normalizePandocArtifacts', () => {
  it('meng-unescape escape Pandoc', () => {
    expect(normalizePandocArtifacts('denda US\\$5 miliar')).toBe('denda US$5 miliar');
    expect(normalizePandocArtifacts('\\*bukan miring\\*')).toBe('*bukan miring*');
    expect(normalizePandocArtifacts('a\\_b \\#c \\[d\\] e\\\\f'))
      .toBe('a_b #c [d] e\\f');
  });
  it('membuang backtick kode', () => {
    expect(normalizePandocArtifacts('istilah `metaverse` populer')).toBe('istilah metaverse populer');
  });
  it('en-dash kontekstual, URL aman', () => {
    expect(normalizePandocArtifacts('periode 2016--2026')).toBe('periode 2016–2026');
    expect(normalizePandocArtifacts('lihat https://a--b.com/x')).toBe('lihat https://a--b.com/x');
  });
  it('membuang backslash lanjutan-baris di akhir baris', () => {
    expect(normalizePandocArtifacts('**Disusun untuk memenuhi tugas**\\\nMata Kuliah: ...'))
      .toBe('**Disusun untuk memenuhi tugas**\nMata Kuliah: ...');
  });
  it('baris dash utuh (HR tidak dirusak)', () => {
    expect(normalizePandocArtifacts('---\n\n-----')).toBe('---\n\n-----');
  });
});

describe('parseRawDocument + normalizePandocArtifacts (integrasi)', () => {
  it('escape dolar Pandoc tidak bocor ke blok keluaran', () => {
    const doc = parseRawDocument('Denda US\\$5 miliar.', config);
    const blocks = doc.sections.flatMap((section) => section.blocks);
    const paragraph = blocks.find((block) => block.type === 'paragraph');

    expect(paragraph).toBeDefined();
    expect(paragraph?.formattedContent).toContain('US$5');
    expect(paragraph?.formattedContent).not.toContain('US\\$5');
  });
});
