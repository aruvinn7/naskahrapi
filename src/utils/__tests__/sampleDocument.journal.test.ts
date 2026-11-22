import { describe, it, expect } from 'vitest';
import { parseRawDocument } from '../aiCleaner';
import { buildJournalFront } from '../journalFormat';
import { buildAiPromptTemplate } from '../promptTemplate';
import { SAMPLE_JOURNAL_RAW_TEXT, SAMPLE_AI_RAW_TEXT, getSampleAiText, getSampleFileName } from '../../data/sampleDocument';
import { DEFAULT_CONFIG_MAKALAH } from './helpers';

function parseJournal() {
  return parseRawDocument(SAMPLE_JOURNAL_RAW_TEXT, { ...DEFAULT_CONFIG_MAKALAH, template: 'jurnal' });
}

describe('contoh draf AI — artikel jurnal', () => {
  const doc = parseJournal();

  it('ter-parse dengan judul artikel', () => {
    expect(doc.title.toUpperCase()).toContain('SENSOR PERGESERAN TANAH');
  });

  it('dua section abstrak (EN + ID)', () => {
    const abstrak = doc.sections.filter((s) => s.type === 'abstrak');
    expect(abstrak.length).toBe(2);
  });

  it('bab tanpa nomor: Pendahuluan, Dasar Teori, Metoda Penelitian, Hasil dan Pembahasan', () => {
    const babTitles = doc.sections.filter((s) => s.type === 'bab').map((s) => s.title);
    expect(babTitles.join('|')).toContain('Pendahuluan');
    expect(babTitles.join('|')).toContain('Dasar Teori');
    expect(babTitles.join('|')).toContain('Metoda Penelitian');
    expect(babTitles.join('|')).toContain('Hasil dan Pembahasan');
    expect(babTitles.join('|')).not.toContain('BAB I');
  });

  it('front matter jurnal: judul, penulis Suryono, afiliasi UNDIP, kata kunci', () => {
    const front = buildJournalFront(doc);
    expect(front.title.toUpperCase()).toContain('SENSOR PERGESERAN');
    expect(front.author).toBe('Suryono');
    expect(front.affiliation).toContain('UNDIP');
    expect(front.abstracts.length).toBe(2);
    expect(front.abstracts[0].keywords.toLowerCase()).toContain('displacement');
    expect(front.abstracts[1].keywords.toLowerCase()).toContain('pergeseran');
  });

  it('pustaka terdeteksi tanpa nomor di sumber', () => {
    const pustaka = doc.sections.find((s) => s.type === 'daftar_pustaka');
    expect(pustaka?.blocks.length).toBeGreaterThanOrEqual(5);
  });
});

describe('getSampleAiText / getSampleFileName', () => {
  it('jurnal → contoh jurnal; lainnya → makalah', () => {
    expect(getSampleAiText('jurnal')).toBe(SAMPLE_JOURNAL_RAW_TEXT);
    expect(getSampleAiText('makalah')).toBe(SAMPLE_AI_RAW_TEXT);
    expect(getSampleAiText('skripsi')).toBe(SAMPLE_AI_RAW_TEXT);
    expect(getSampleAiText(undefined)).toBe(SAMPLE_AI_RAW_TEXT);
    expect(getSampleFileName('jurnal')).toContain('JURNAL');
    expect(getSampleFileName('makalah')).toContain('MAKALAH');
  });
});

describe('buildAiPromptTemplate — dua varian', () => {
  it('makalah/skripsi: struktur BAB + kata pengantar', () => {
    const makalah = buildAiPromptTemplate('makalah');
    expect(makalah).toContain('# BAB I PENDAHULUAN');
    expect(makalah).toContain('KATA PENGANTAR');
    expect(buildAiPromptTemplate('skripsi')).toContain('# BAB I PENDAHULUAN');
  });

  it('jurnal: tanpa BAB, ada abstrak dua bahasa & sitasi [1]', () => {
    const jurnal = buildAiPromptTemplate('jurnal');
    expect(jurnal).toContain('# Pendahuluan');
    expect(jurnal).not.toContain('# BAB I PENDAHULUAN');
    expect(jurnal).toContain('Keyword :');
    expect(jurnal).toContain('Kata kunci :');
    expect(jurnal).toContain('[1]');
    expect(jurnal).toContain('TANPA nomor di awal');
  });

  it('default tanpa argumen = makalah', () => {
    expect(buildAiPromptTemplate()).toContain('# BAB I PENDAHULUAN');
  });
});
