import { describe, it, expect } from 'vitest';
import { Packer } from 'docx';
import { unzipSync, strFromU8 } from 'fflate';
import { buildDocxDocument } from '../docxExporter';
import { applyTemplatePreset } from '../templatePresets';
import { DEFAULT_CONFIG_MAKALAH } from './helpers';
import { DocumentConfig, DocumentBlock, DocumentSection, ParsedDocument } from '../../types/document';

// PNG 1x1 transparan (base64)
const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function journalConfig(): DocumentConfig {
  const config = applyTemplatePreset(DEFAULT_CONFIG_MAKALAH, 'jurnal');
  return {
    ...config,
    journal: {
      name: 'Berkala Fisika',
      volumeInfo: 'Vol 11, No.4, Oktober 2008 hal 147-152',
      issn: 'ISSN : 1410 - 9662'
    }
  };
}

function block(type: string, text: string): DocumentBlock {
  return { id: `b-${Math.random().toString(36).slice(2)}`, type: type as DocumentBlock['type'], rawContent: text, formattedContent: text };
}
function section(type: string, title: string, blocks: DocumentBlock[]): DocumentSection {
  return { id: `s-${Math.random().toString(36).slice(2)}`, title, type, blockCount: blocks.length, startPageEstimate: 1, blocks };
}

function journalDoc(): ParsedDocument {
  return {
    title: 'Rancang Bangun Sensor Pergeseran Tanah Digital',
    fileName: 'JURNAL.docx',
    rawText: 'x',
    sections: [
      section('abstrak', 'Abstrak', [
        block('paragraph', 'Pada penelitian telah dilakukan pembuatan sensor sistem pergeseran tanah digital.'),
        block('paragraph', 'Kata kunci : pergeseran, digital, serial')
      ]),
      section('bab', 'BAB I PENDAHULUAN', [
        block('heading_2', '1.1 Latar Belakang'),
        block('paragraph', 'Pembangunan perumahan untuk memenuhi kebutuhan.')
      ]),
      section('daftar_pustaka', 'DAFTAR PUSTAKA', [
        block('daftar_pustaka_item', 'Das, B., 1998, Mekanika Tanah, Erlangga, Jakarta.'),
        block('daftar_pustaka_item', 'Fraden, J. 1996, Handbook of Modern Sensors.')
      ])
    ],
    totalBlocks: 5,
    totalWords: 60,
    estimatedPages: 1,
    issues: []
  };
}

async function packXml(doc: ParsedDocument, config: DocumentConfig) {
  const buffer = (await Packer.pack(buildDocxDocument(doc, config), 'nodebuffer')) as Buffer;
  const files = unzipSync(new Uint8Array(buffer));
  const concat = (prefix: string) =>
    Object.keys(files)
      .filter((name) => name.startsWith(prefix))
      .map((name) => strFromU8(files[name]))
      .join('\n');
  return {
    document: strFromU8(files['word/document.xml']),
    headers: concat('word/header'),
    footers: concat('word/footer')
  };
}

describe('ekspor DOCX template jurnal', () => {
  it('section isi dua kolom (w:cols num=2) dan continuous', async () => {
    const { document } = await packXml(journalDoc(), journalConfig());
    expect(document).toContain('w:num="2"');
    expect(document).toContain('continuous');
  });

  it('header jurnal berisi nama jurnal, edisi, ISSN (italic) di file header', async () => {
    const { headers } = await packXml(journalDoc(), journalConfig());
    expect(headers).toContain('Berkala Fisika');
    expect(headers).toContain('Vol 11, No.4, Oktober 2008 hal 147-152');
    expect(headers).toContain('ISSN : 1410 - 9662');
    expect(headers).toContain('<w:i/>');
  });

  it('judul bab di-strip (PENDAHULUAN tanpa "BAB I") dan sub-bab tanpa nomor', async () => {
    const { document } = await packXml(journalDoc(), journalConfig());
    expect(document).toContain('PENDAHULUAN');
    expect(document).toContain('Latar Belakang');
    expect(document).not.toContain('BAB I PENDAHULUAN');
    expect(document).not.toContain('1.1 Latar Belakang');
  });

  it('abstrak italic + kata kunci di front matter', async () => {
    const { document } = await packXml(journalDoc(), journalConfig());
    expect(document).toContain('Kata kunci');
    expect(document).toContain('pergeseran, digital, serial');
  });

  it('pustaka bernomor "1). " tanpa indentasi menggantung', async () => {
    const { document } = await packXml(journalDoc(), journalConfig());
    expect(document).toContain('1). ');
    expect(document).toContain('2). ');
    expect(document).not.toContain('w:hanging');
  });

  it('caption gambar memakai gaya caption (label: keterangan, center)', async () => {
    const doc = journalDoc();
    doc.sections[1].blocks.push({
      id: 'blk-cap',
      type: 'figure_caption',
      rawContent: 'Gambar 1.1 Skema aliran',
      formattedContent: 'Gambar 1.1 Skema aliran'
    });
    const { document } = await packXml(doc, journalConfig());
    expect(document).toContain('Gambar 1.1');
    expect(document).toContain(': Skema aliran');
  });

  it('gambar dibatasi lebar satu kolom (tidak overflow)', async () => {
    const doc = journalDoc();
    doc.sections[1].blocks.push({
      id: 'blk-img',
      type: 'image',
      rawContent: '',
      formattedContent: '',
      meta: { dataUrl: TINY_PNG, width: 400, height: 300 }
    });
    const { document } = await packXml(doc, journalConfig());
    const extents = Array.from(document.matchAll(/<wp:extent cx="(\d+)"/g)).map((m) => Number(m[1]));
    expect(extents.length).toBeGreaterThan(0);
    // Lebar kolom jurnal (A4, margin 2,5 cm, gap 0,5 cm) ≈ 292 px ≈ 2,78 jt EMU.
    extents.forEach((cx) => expect(cx).toBeLessThan(3_000_000));
  });

  it('header jurnal kosong → tanpa teks header, tidak crash', async () => {
    const config = applyTemplatePreset(DEFAULT_CONFIG_MAKALAH, 'jurnal');
    const { headers } = await packXml(journalDoc(), config);
    expect(headers).not.toContain('Berkala Fisika');
  });
});

describe('kontrol: template makalah tidak dua kolom', () => {
  it('tanpa w:cols num=2', async () => {
    const { document } = await packXml(journalDoc(), DEFAULT_CONFIG_MAKALAH);
    expect(document).not.toContain('w:num="2"');
  });
});
