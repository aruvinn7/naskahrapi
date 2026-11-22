import { describe, it, expect } from 'vitest';
import { buildFlowItems } from '../previewLayout';
import { DocumentBlock, DocumentSection, ParsedDocument } from '../../types/document';

function block(type: string, text: string): DocumentBlock {
  return { id: `b-${Math.random().toString(36).slice(2)}`, type: type as DocumentBlock['type'], rawContent: text, formattedContent: text };
}
function section(type: string, title: string, blocks: DocumentBlock[]): DocumentSection {
  return { id: `s-${Math.random().toString(36).slice(2)}`, title, type, blockCount: blocks.length, startPageEstimate: 1, blocks };
}

function makeJournalDoc(): ParsedDocument {
  return {
    title: 'Judul Artikel',
    fileName: 'JURNAL.docx',
    rawText: 'x',
    sections: [
      section('cover', 'MAKALAH', [block('cover', 'MAKALAH')]),
      section('kata_pengantar', 'KATA PENGANTAR', [block('kata_pengantar', 'KATA PENGANTAR')]),
      section('daftar_isi', 'DAFTAR ISI', []),
      section('daftar_tabel', 'DAFTAR TABEL', []),
      section('abstrak', 'Abstrak', [block('paragraph', 'Isi abstrak.')]),
      section('bab', 'BAB I PENDAHULUAN', [
        block('heading_1', 'BAB I PENDAHULUAN'),
        block('paragraph', 'Pembangunan perumahan untuk memenuhi kebutuhan.'),
        block('heading_2', '1.1 Latar Belakang'),
        block('paragraph', 'Tanah merupakan material agregat.')
      ]),
      section('bab', 'BAB II PEMBAHASAN', [block('heading_1', 'BAB II PEMBAHASAN')]),
      section('daftar_pustaka', 'DAFTAR PUSTAKA', [
        block('daftar_pustaka_item', 'Das, B., 1998, Mekanika Tanah.')
      ])
    ],
    totalBlocks: 8,
    totalWords: 60,
    estimatedPages: 2,
    issues: []
  };
}

describe('buildFlowItems — template jurnal', () => {
  const doc = makeJournalDoc();
  const items = buildFlowItems(doc, [], false, true);
  const sectionTypes = new Set(items.map((i) => i.sectionType));

  it('front matter makalah disembunyikan (cover, kata pengantar, daftar isi/tabel, abstrak)', () => {
    expect(sectionTypes.has('cover')).toBe(false);
    expect(sectionTypes.has('kata_pengantar')).toBe(false);
    expect(sectionTypes.has('daftar_isi')).toBe(false);
    expect(sectionTypes.has('daftar_tabel')).toBe(false);
    expect(sectionTypes.has('abstrak')).toBe(false);
  });

  it('judul bab di-strip: prefix BAB hilang, casing mengikuti sumber', () => {
    const pendahuluan = items.find((i) => i.kind === 'section-heading' && i.text.includes('PENDAHULUAN'));
    expect(pendahuluan?.text).toBe('PENDAHULUAN');
    // heading_1 yang identik dengan judul section memang dihilangkan sebagai
    // duplikat (perilaku lama) — strip juga diterapkan bila teksnya beda.
    const babII = items.filter((i) => i.sectionType === 'bab' && i.text.includes('PEMBAHASAN'));
    expect(babII.every((i) => !i.text.includes('BAB II'))).toBe(true);
  });

  it('nomor sub-bab dihapus: "Latar Belakang"', () => {
    const heading2 = items.find((i) => i.kind === 'block' && i.block?.type === 'heading_2');
    expect(heading2?.text).toBe('Latar Belakang');
  });

  it('pustaka tidak patah halaman', () => {
    const pustaka = items.find((i) => i.sectionType === 'daftar_pustaka' && i.kind === 'section-heading');
    expect(pustaka?.pageBreakBefore).toBeFalsy();
  });

  it('isi bab tetap ada di flow', () => {
    expect(sectionTypes.has('bab')).toBe(true);
    expect(items.some((i) => i.text.includes('Pembangunan perumahan'))).toBe(true);
    expect(sectionTypes.has('daftar_pustaka')).toBe(true);
  });
});

describe('buildFlowItems — non-jurnal utuh (backward compatible)', () => {
  it('tanpa isJournal: cover & BAB tetap ada, judul tidak di-strip', () => {
    const doc = makeJournalDoc();
    const items = buildFlowItems(doc, [], false, false);
    const sectionTypes = new Set(items.map((i) => i.sectionType));
    expect(sectionTypes.has('cover')).toBe(true);
    expect(sectionTypes.has('abstrak')).toBe(true);
    const pendahuluan = items.find((i) => i.kind === 'section-heading' && i.text.includes('PENDAHULUAN'));
    expect(pendahuluan?.text).toBe('BAB I PENDAHULUAN');
    const heading2 = items.find((i) => i.kind === 'block' && i.block?.type === 'heading_2');
    expect(heading2?.text).toBe('1.1 Latar Belakang');
  });
});
