import { describe, it, expect } from 'vitest';
import { Packer } from 'docx';
import { unzipSync, strFromU8 } from 'fflate';
import { buildDocxDocument } from '../docxExporter';
import { DEFAULT_CONFIG_MAKALAH } from './helpers';

// PNG 1x1 transparan (base64)
const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function docWithImage() {
  const doc = {
    title: 'uji',
    fileName: 'uji.docx',
    rawText: '',
    sections: [
      {
        id: 'sec-bab',
        title: 'BAB I PENDAHULUAN',
        type: 'bab',
        blockCount: 2,
        startPageEstimate: 1,
        blocks: [
          {
            id: 'blk-img',
            type: 'image',
            rawContent: '',
            formattedContent: '',
            meta: { dataUrl: TINY_PNG, width: 400, height: 300 }
          },
          {
            id: 'blk-cap',
            type: 'figure_caption',
            rawContent: 'Gambar 1.1 Skema aliran',
            formattedContent: 'Gambar 1.1 Skema aliran'
          }
        ]
      }
    ],
    totalBlocks: 2,
    totalWords: 5,
    estimatedPages: 1,
    issues: []
  };
  return doc as unknown as Parameters<typeof buildDocxDocument>[0];
}

describe('ekspor DOCX blok gambar', () => {
  it('menghasilkan w:drawing untuk blok image dan caption di bawahnya', async () => {
    const buffer = (await Packer.pack(buildDocxDocument(docWithImage(), DEFAULT_CONFIG_MAKALAH), 'nodebuffer')) as Buffer;
    const files = unzipSync(new Uint8Array(buffer));
    const xml = strFromU8(files['word/document.xml']);
    expect(xml).toContain('<w:drawing>');
    expect(xml).toContain('Gambar 1.1');
    expect(xml).toContain('Skema aliran');
  });
});
