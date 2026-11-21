import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  FOREIGN_TERMS,
  detectForeignTermIssues,
  italicizeTerm,
  detectForeignCandidates,
  isBibliographySection,
  collectDetectionText
} from '../foreignTermCorrector';
import type { DocumentSection, ParsedDocument } from '../../types/document';

const KBBI_MOCK = new Set(['zaman', 'komputer', 'data', 'penelitian', 'air', 'besar']);

describe('deteksi istilah asing terkurasi', () => {
  it('menghitung frasa utuh, case-insensitive, lintas baris', () => {
    const text = 'Data center besar menggunakan AI. Machine learning\nmachine learning makin umum.';
    const issues = detectForeignTermIssues(text);
    const byTerm = Object.fromEntries(issues.map((i) => [i.term, i.count]));
    expect(byTerm['data center']).toBe(1);
    expect(byTerm['machine learning']).toBe(2);
  });
  it('tidak menghitung istilah yang sudah miring (*…*)', () => {
    const text = 'Perusahaan *data center* besar tumbuh.';
    const byTerm = Object.fromEntries(detectForeignTermIssues(text).map((i) => [i.term, i.count]));
    expect(byTerm['data center']).toBeUndefined();
  });
  it('FOREIGN_TERMS memuat istilah inti', () => {
    for (const term of ['artificial intelligence', 'machine learning', 'data center', 'smartphone']) {
      expect(FOREIGN_TERMS).toContain(term);
    }
  });
});

describe('italicizeTerm', () => {
  it('membungkus dengan huruf asli dipertahankan', () => {
    const result = italicizeTerm('Data center besar menyerap air.', 'data center');
    expect(result.text).toBe('*Data center* besar menyerap air.');
    expect(result.totalReplaced).toBe(1);
  });
  it('idempoten — panggilan kedua tidak menambah apa pun', () => {
    const first = italicizeTerm('Smartphone dan smartphone baru.', 'smartphone');
    expect(first.totalReplaced).toBe(2);
    const second = italicizeTerm(first.text, 'smartphone');
    expect(second.totalReplaced).toBe(0);
    expect(second.text).toBe(first.text);
  });
  it('segmen yang sudah miring/tebal tidak disentuh (round-trip aman)', () => {
    const text = 'Model **machine learning** dan *deep learning* berkembang. Big data menunjang.';
    const result = italicizeTerm(text, 'big data');
    expect(result.text).toBe('Model **machine learning** dan *deep learning* berkembang. *Big data* menunjang.');
    // istilah di dalam segmen kaya tidak dobel
    const again = italicizeTerm(result.text, 'machine learning');
    expect(again.totalReplaced).toBe(0);
    const third = italicizeTerm(result.text, 'deep learning');
    expect(third.totalReplaced).toBe(0);
  });
  it('miringkan judul panjang yang memuat istilah tidak merusak format', () => {
    const text = 'Buku *deep learning untuk pengelolaan air* terbit 2023.';
    const result = italicizeTerm(text, 'deep learning');
    expect(result.text).toBe(text);
    expect(result.totalReplaced).toBe(0);
  });
});

describe('detectForeignCandidates (kamus KBBI)', () => {
  it('kata baku tidak jadi kandidat, kata asing jadi kandidat', () => {
    const text = 'Komputer memproses overfitting pada data besar. Overfitting menurunkan akurasi.';
    const candidates = detectForeignCandidates(text, KBBI_MOCK);
    const words = candidates.map((c) => c.word);
    expect(words).toContain('overfitting');
    expect(words).not.toContain('komputer');
    expect(words).not.toContain('data');
    const overfitting = candidates.find((c) => c.word === 'overfitting');
    expect(overfitting?.count).toBe(2);
  });
  it('kata yang pernah muncul berkapital (nama/merek) tersaring', () => {
    const text = 'ChatGPT populer. Pengguna chatGPT bertambah.';
    const words = detectForeignCandidates(text, KBBI_MOCK).map((c) => c.word);
    expect(words).not.toContain('chatgpt');
  });
  it('singkatan kapital semua dan kata pendek tersaring; yang sudah miring dihitung nol', () => {
    const text = 'GPU dan AI dipakai *streaming* dari IoT itu.';
    const words = detectForeignCandidates(text, KBBI_MOCK).map((c) => c.word);
    expect(words).not.toContain('gpu');
    expect(words).not.toContain('ai');
    expect(words).not.toContain('iot');
    expect(words).not.toContain('streaming');
  });
  it('kata Indonesia berimbuhan tidak jadi kandidat walau lemanya saja ada di KBBI', () => {
    const text = 'Penggunaan didorong diharapkan diperkirakan khususnya meningkat.';
    const KBBI_LEMMA = new Set(['dorong', 'harap', 'kira', 'khusus', 'tingkat', 'guna']);
    const words = detectForeignCandidates(text, KBBI_LEMMA).map((c) => c.word);
    expect(words).not.toContain('didorong');
    expect(words).not.toContain('diharapkan');
    expect(words).not.toContain('diperkirakan');
    expect(words).not.toContain('khususnya');
    expect(words).not.toContain('meningkat');
  });
  it('stopword Inggris umum tidak jadi kandidat', () => {
    const text = 'the and of in to for with is are was were that this it as an or be been at by from.';
    const words = detectForeignCandidates(text, KBBI_MOCK).map((c) => c.word);
    expect(words).toEqual([]);
  });
});

describe('pengecualian daftar pustaka', () => {
  const bodySection: DocumentSection = {
    id: 'sec-bab',
    title: 'BAB I PENDAHULUAN',
    type: 'bab',
    blockCount: 1,
    startPageEstimate: 1,
    blocks: [
      {
        id: 'blk-1',
        type: 'paragraph',
        rawContent: 'Menilai software baru.',
        formattedContent: 'Menilai software baru.'
      }
    ]
  };
  const pustakaSection: DocumentSection = {
    id: 'sec-pustaka',
    title: 'DAFTAR PUSTAKA',
    type: 'daftar_pustaka',
    blockCount: 1,
    startPageEstimate: 1,
    blocks: [
      {
        id: 'blk-2',
        type: 'daftar_pustaka_item',
        rawContent: 'Gao, P., & Zhang, Y. (2024). Measuring software footprints. UNESCO Publishing.',
        formattedContent: 'Gao, P., & Zhang, Y. (2024). Measuring software footprints. UNESCO Publishing.'
      }
    ]
  };
  const doc = {
    title: 'uji',
    fileName: 'uji.docx',
    rawText: '',
    sections: [bodySection, pustakaSection],
    totalBlocks: 2,
    totalWords: 10,
    estimatedPages: 1,
    issues: []
  } as unknown as ParsedDocument;

  it('isBibliographySection mengenali type maupun judul PUSTAKA', () => {
    expect(isBibliographySection(pustakaSection)).toBe(true);
    expect(isBibliographySection({ ...pustakaSection, type: 'bab', title: 'DAFTAR PUSTAKA' })).toBe(true);
    expect(isBibliographySection(bodySection)).toBe(false);
  });
  it('deteksi mengabaikan isi Daftar Pustaka — hanya isi bab yang dihitung', () => {
    const issues = detectForeignTermIssues(collectDetectionText(doc));
    const byTerm = Object.fromEntries(issues.map((i) => [i.term, i.count]));
    expect(byTerm['software']).toBe(1);
  });
  it('kandidat juga mengabaikan isi Daftar Pustaka', () => {
    const candidates = detectForeignCandidates(collectDetectionText(doc), KBBI_MOCK);
    const words = candidates.map((c) => c.word);
    expect(words).toContain('menilai');
    expect(words).not.toContain('footprints');
    expect(words).not.toContain('gao');
  });
});

describe('aset kamus KBBI', () => {
  const assetPath = join(__dirname, '..', '..', 'assets', 'kbbi-words.txt');
  it('file aset ada dan berisi kata baku, tanpa istilah asing', () => {
    expect(existsSync(assetPath)).toBe(true);
    const content = readFileSync(assetPath, 'utf-8');
    const words = new Set(content.split('\n').filter(Boolean));
    expect(words.has('zaman')).toBe(true);
    expect(words.has('komputer')).toBe(true);
    expect(words.has('software')).toBe(false);
    expect(words.has('website')).toBe(false);
    expect(words.size).toBeGreaterThan(100000);
  });
});
