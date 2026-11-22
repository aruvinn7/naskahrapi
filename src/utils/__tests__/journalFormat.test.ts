import { describe, it, expect } from 'vitest';
import { stripBabPrefix, buildJournalFront } from '../journalFormat';
import { DocumentBlock, DocumentSection, ParsedDocument, CoverData } from '../../types/document';

function block(type: string, text: string): DocumentBlock {
  return { id: `b-${Math.random().toString(36).slice(2)}`, type: type as DocumentBlock['type'], rawContent: text, formattedContent: text };
}
function section(type: string, title: string, blocks: DocumentBlock[]): DocumentSection {
  return { id: `s-${Math.random().toString(36).slice(2)}`, title, type, blockCount: blocks.length, startPageEstimate: 1, blocks };
}

function makeCover(overrides: Partial<CoverData> = {}): CoverData {
  return {
    enabled: true,
    showLogo: false,
    documentType: 'MAKALAH',
    title: 'Judul Artikel Uji',
    subtitle: '',
    course: '',
    lecturer: '',
    authorPrefix: 'Disusun oleh:',
    members: [{ id: 'm1', name: 'Suryono', nim: '240101' }],
    studyProgram: 'Fisika',
    department: 'Jurusan Fisika',
    faculty: 'FMIPA',
    institution: 'UNDIP',
    city: 'Semarang',
    year: '2008',
    motto: '',
    pembimbing1: '',
    pembimbing2: '',
    penguji1: '',
    penguji2: '',
    sidangTanggal: '',
    ...overrides
  };
}

function makeDoc(): ParsedDocument {
  return {
    title: 'Judul Artikel Uji',
    fileName: 'UJI.docx',
    rawText: 'x',
    sections: [
      section('abstrak', 'Abstract', [
        block('paragraph', 'The research has been produced digital displacement field sensor system.'),
        block('paragraph', 'Keyword: Displacement, digital, serial')
      ]),
      section('abstrak', 'Abstrak', [
        block('paragraph', 'Pada penelitian telah dilakukan pembuatan sensor sistem pergeseran tanah digital.'),
        block('paragraph', 'Kata kunci : pergeseran, digital, serial')
      ])
    ],
    totalBlocks: 4,
    totalWords: 40,
    estimatedPages: 1,
    issues: [],
    cover: makeCover()
  };
}

describe('stripBabPrefix', () => {
  it('menghapus label BAB romawi/angka', () => {
    expect(stripBabPrefix('BAB I PENDAHULUAN')).toBe('PENDAHULUAN');
    expect(stripBabPrefix('BAB 1 PENDAHULUAN')).toBe('PENDAHULUAN');
    expect(stripBabPrefix('BAB II: PEMBAHASAN')).toBe('PEMBAHASAN');
  });
  it('teks tanpa BAB utuh', () => {
    expect(stripBabPrefix('Pendahuluan')).toBe('Pendahuluan');
    expect(stripBabPrefix('Hasil dan Pembahasan')).toBe('Hasil dan Pembahasan');
  });
  it('baris kata kunci plural "Keywords:" terpisah utuh', () => {
    const doc = makeDoc();
    doc.sections[0].blocks[1].formattedContent = 'Keywords: Displacement, digital, serial';
    const front = buildJournalFront(doc);
    expect(front.abstracts[0].keywords).toBe('Displacement, digital, serial');
    expect(front.abstracts[0].body).not.toContain('Keywords');
  });
});

describe('buildJournalFront', () => {
  const doc = makeDoc();
  const front = buildJournalFront(doc);

  it('judul dari cover', () => {
    expect(front.title).toBe('Judul Artikel Uji');
  });
  it('penulis dari anggota cover pertama', () => {
    expect(front.author).toBe('Suryono');
  });
  it('afiliasi gabungan prodi/institusi', () => {
    expect(front.affiliation).toContain('Fisika');
    expect(front.affiliation).toContain('UNDIP');
  });
  it('dua abstrak: body italic tanpa baris kata kunci, keywords terpisah', () => {
    expect(front.abstracts).toHaveLength(2);
    expect(front.abstracts[0].heading).toBe('Abstract');
    expect(front.abstracts[0].body).not.toContain('Keyword');
    expect(front.abstracts[0].body).toContain('displacement field sensor');
    expect(front.abstracts[0].keywords).toBe('Displacement, digital, serial');
    expect(front.abstracts[1].heading).toBe('Abstrak');
    expect(front.abstracts[1].keywords).toBe('pergeseran, digital, serial');
  });
  it('dokumen tanpa cover: judul dari doc.title, penulis/afiliasi kosong', () => {
    const bare = buildJournalFront({ ...makeDoc(), cover: undefined });
    expect(bare.title).toBe('Judul Artikel Uji');
    expect(bare.author).toBe('');
    expect(bare.affiliation).toBe('');
  });
});
