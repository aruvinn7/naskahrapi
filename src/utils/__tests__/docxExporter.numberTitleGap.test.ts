import { describe, it, expect } from 'vitest';
import { Packer } from 'docx';
import { unzipSync, strFromU8 } from 'fflate';
import { buildDocxDocument } from '../docxExporter';
import { parseRawDocument } from '../aiCleaner';
import { DEFAULT_CONFIG_MAKALAH } from './helpers';

const RAW = ['BAB II METODOLOGI', '2.6 Dampak Lingkungan dari Konsumsi Air AI', 'Isi paragraf pembuka.'].join('\n');

// Packer mengembalikan paket ZIP (.docx); isi word/document.xml yang diuji.
async function documentXml(config: typeof DEFAULT_CONFIG_MAKALAH): Promise<string> {
  const buffer = (await Packer.pack(buildDocxDocument(parseRawDocument(RAW, config), config), 'nodebuffer')) as Buffer;
  const files = unzipSync(new Uint8Array(buffer));
  return strFromU8(files['word/document.xml']);
}

describe('ekspor DOCX posisi judul sub-bab', () => {
  it('menambah tab stop pada posisi cm saat gap > 0', async () => {
    const config = {
      ...DEFAULT_CONFIG_MAKALAH,
      headingRules: { ...DEFAULT_CONFIG_MAKALAH.headingRules, numberTitleGapCm: 1.27 }
    };
    const xml = await documentXml(config);
    expect(xml).toContain('w:pos="720"'); // 1.27 cm × 567 ≈ 720 twip
    expect(xml).toContain('<w:tab/>');
  });
  it('mode romawi tetap kena tab stop', async () => {
    const config = {
      ...DEFAULT_CONFIG_MAKALAH,
      headingRules: {
        ...DEFAULT_CONFIG_MAKALAH.headingRules,
        numberTitleGapCm: 1.27,
        h2Numbering: 'roman' as const
      }
    };
    const xml = await documentXml(config);
    expect(xml).toContain('w:pos="720"');
  });
  it('gap 0 tidak menambah tab stop', async () => {
    const xml = await documentXml(DEFAULT_CONFIG_MAKALAH);
    expect(xml).not.toContain('w:pos="720"');
  });
});
