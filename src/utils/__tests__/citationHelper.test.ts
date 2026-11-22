import { describe, it, expect } from 'vitest';
import {
  extractCitationRefs,
  extractBibliographyKey,
  analyzeCitations
} from '../citationHelper';
import { DocumentSection, DocumentBlock } from '../../types/document';

function block(type: string, text: string): DocumentBlock {
  return { id: `b-${Math.random().toString(36).slice(2)}`, type: type as DocumentBlock['type'], rawContent: text, formattedContent: text };
}
function section(type: string, title: string, blocks: DocumentBlock[]): DocumentSection {
  return { id: `s-${Math.random().toString(36).slice(2)}`, title, type, blockCount: blocks.length, startPageEstimate: 1, blocks };
}
function bibSection(entries: string[]): DocumentSection {
  return section('daftar_pustaka', 'DAFTAR PUSTAKA', entries.map((e) => block('daftar_pustaka_item', e)));
}

describe('extractCitationRefs', () => {
  it('deteksi sitasi ganda dalam satu kurung', () => {
    const refs = extractCitationRefs('Hasil serupa (Sari, 2022; Wibowo, 2023) ditemukan.');
    expect(refs.map((r) => r.key)).toEqual(['sari::2022', 'wibowo::2023']);
  });
  it('deteksi sitasi naratif Prasetyo (2023)', () => {
    expect(extractCitationRefs('Prasetyo (2023) menyatakan bahwa.')[0].key).toBe('prasetyo::2023');
  });
  it('dkk. dan et al. memakai kata pertama', () => {
    expect(extractCitationRefs('(Sari dkk., 2022)')[0].key).toBe('sari::2022');
    expect(extractCitationRefs('(Prasetyo et al., 2020)')[0].key).toBe('prasetyo::2020');
  });
  it('tahun berhuruf ikut kunci', () => {
    expect(extractCitationRefs('(Sari, 2023a)')[0].key).toBe('sari::2023a');
  });
  it('kurung non-sitasi diabaikan', () => {
    expect(extractCitationRefs('(Lihat Prasetyo, 2023) serta (misalnya pemerintah pusat)')).toEqual([]);
    expect(extractCitationRefs('lihat bagian (Lampiran 1)')).toEqual([]);
  });
});

describe('extractBibliographyKey', () => {
  it('entri APA dengan penomoran di-strip', () => {
    expect(extractBibliographyKey('[1] Prasetyo, A. (2023). Metodologi.')).toBe('prasetyo::2023');
    expect(extractBibliographyKey('1. Sari, B. (2022a). Judul.')).toBe('sari::2022a');
  });
});

describe('analyzeCitations', () => {
  it('sitasi beda tahun dilaporkan missing', () => {
    const doc = [
      section('bab', 'BAB I', [block('paragraph', 'Hasil awal (Prasetyo, 2020) menunjukkan.')]),
      bibSection(['Prasetyo, A. (2023). Metodologi.'])
    ];
    const result = analyzeCitations(doc);
    expect(result.missingFromBibliography).toContain('Prasetyo, 2020');
  });
  it('entri pustaka yang tak pernah disitasi dilaporkan unused', () => {
    const doc = [
      section('bab', 'BAB I', [block('paragraph', 'Penelitian Sari (2023) menunjukkan.')]),
      bibSection(['Sari, B. (2023). Judul satu.', 'Wibowo, C. (2021). Judul dua.'])
    ];
    const result = analyzeCitations(doc);
    expect(result.unusedReferences).toHaveLength(1);
    expect(result.unusedReferences[0]).toContain('Wibowo');
  });
  it('dokumen tanpa pustaka: unusedReferences kosong', () => {
    const doc = [section('bab', 'BAB I', [block('paragraph', 'Kutipan (Sari, 2023).')])];
    expect(analyzeCitations(doc).unusedReferences).toEqual([]);
  });
  it('sitasi IEEE [1] tidak dihitung missing', () => {
    const doc = [
      section('bab', 'BAB I', [block('paragraph', 'Model [1] terbukti.')]),
      bibSection(['Prasetyo, A. (2023). Metodologi.'])
    ];
    expect(analyzeCitations(doc).missingFromBibliography).toEqual([]);
  });
  it('sufiks tahun wajib sama (2023a ≠ 2023)', () => {
    const doc = [
      section('bab', 'BAB I', [block('paragraph', 'Kajian (Sari, 2023a) berkembang.')]),
      bibSection(['Sari, B. (2023). Judul.'])
    ];
    expect(analyzeCitations(doc).missingFromBibliography).toContain('Sari, 2023a');
  });
});
