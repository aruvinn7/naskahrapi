import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { addToHistory, loadHistory, removeHistoryEntry, saveHistory } from '../docHistory';
import type { HistoryEntry } from '../docHistory';
import { DEFAULT_CONFIG_MAKALAH } from './helpers';

function makeEntry(id: string, rawText: string, extra: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    id,
    name: `${id}.docx`,
    savedAt: 1700000000000,
    doc: {
      title: id,
      fileName: `${id}.docx`,
      rawText,
      sections: [],
      totalBlocks: 0,
      totalWords: 0,
      estimatedPages: 1,
      issues: []
    },
    config: DEFAULT_CONFIG_MAKALAH,
    ...extra
  };
}

function fakeStorage(opts: { failAbove?: number } = {}) {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      if (opts.failAbove && value.length > opts.failAbove) {
        throw new Error('QuotaExceededError');
      }
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    _size: () => (store['skripsi-rapi-history-v1'] ?? '').length
  };
}

describe('addToHistory', () => {
  it('menambahkan entri dokumen berisi', () => {
    const entries = addToHistory([], makeEntry('a', 'Isi makalah A.').doc, DEFAULT_CONFIG_MAKALAH);
    expect(entries.length).toBe(1);
    expect(entries[0].name).toBe('a.docx');
  });

  it('dokumen kosong/blank tidak masuk riwayat', () => {
    const entries = addToHistory([], makeEntry('blank', '').doc, DEFAULT_CONFIG_MAKALAH);
    expect(entries.length).toBe(0);
    const blankDoc = makeEntry('blank2', '').doc;
    blankDoc.sections = [
      {
        id: 's1',
        title: 'MAKALAH',
        type: 'cover',
        blockCount: 1,
        startPageEstimate: 1,
        blocks: [
          {
            id: 'b1',
            type: 'cover',
            title: 'MAKALAH',
            rawContent: 'JUDUL MAKALAH BARU',
            formattedContent: 'JUDUL MAKALAH BARU'
          }
        ]
      }
    ];
    const doc: any = { ...blankDoc, rawText: '' };
    const entries2 = addToHistory([], doc as any, DEFAULT_CONFIG_MAKALAH);
    expect(entries2.length).toBe(0);
    expect(doc.sections.length).toBe(1);
  });

  it('rawText identik tidak diduplikasi', () => {
    let entries = addToHistory([], makeEntry('a', 'Isi sama.').doc, DEFAULT_CONFIG_MAKALAH);
    entries = addToHistory(entries, makeEntry('b', 'Isi sama.').doc, DEFAULT_CONFIG_MAKALAH);
    expect(entries.length).toBe(1);
  });

  it('maksimal 10 entri — terlama dibuang', () => {
    let entries: HistoryEntry[] = [];
    for (let i = 1; i <= 12; i++) {
      entries = addToHistory(entries, makeEntry(`doc-${i}`, `Isi ${i}.`).doc, DEFAULT_CONFIG_MAKALAH);
    }
    expect(entries.length).toBe(10);
    expect(entries[0].name).toBe('doc-3.docx');
    expect(entries.at(-1)?.name).toBe('doc-12.docx');
  });
});

describe('saveHistory — fallback kuota', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('menyimpan normal tanpa galat', () => {
    vi.stubGlobal('localStorage', fakeStorage());
    expect(saveHistory([makeEntry('a', 'Isi.')])).toBe(true);
    expect(loadHistory().length).toBe(1);
  });

  it('kuota penuh → entri terlama dibuang lalu dicoba lagi', () => {
    const storage = fakeStorage({ failAbove: 3000 });
    vi.stubGlobal('localStorage', storage);
    const entries = Array.from({ length: 5 }, (_, i) =>
      makeEntry(`d${i}`, 'X'.repeat(400))
    );
    expect(saveHistory(entries)).toBe(true);
    expect(loadHistory().length).toBeLessThan(5);
    expect(loadHistory().at(-1)?.id).toBe('d4');
  });

  it('tetap gagal → dataUrl gambar di-strip lalu tersimpan', () => {
    const storage = fakeStorage({ failAbove: 3000 });
    vi.stubGlobal('localStorage', storage);
    const entry = makeEntry('big', 'X'.repeat(900));
    entry.doc.sections = [
      {
        id: 's1',
        title: 'BAB I',
        type: 'bab',
        blockCount: 1,
        startPageEstimate: 1,
        blocks: [
          {
            id: 'img',
            type: 'image',
            rawContent: '',
            formattedContent: '',
            meta: { dataUrl: `data:image/png;base64,${'Y'.repeat(2000)}`, width: 800, height: 600 }
          }
        ]
      }
    ] as any;
    expect(saveHistory([entry])).toBe(true);
    const saved = loadHistory()[0];
    const imgBlock: any = saved.doc.sections[0].blocks[0];
    expect(imgBlock.meta.dataUrl).toBe('data:image/stripped');
  });

  it('tetap gagal total → saveHistory mengembalikan false', () => {
    const storage = fakeStorage({ failAbove: 10 });
    vi.stubGlobal('localStorage', storage);
    expect(saveHistory([makeEntry('a', 'Isi panjang sekali.')])).toBe(false);
  });
});

describe('removeHistoryEntry & loadHistory', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', fakeStorage());
  });
  afterEach(() => vi.unstubAllGlobals());

  it('menghapus entri berdasarkan id', () => {
    saveHistory([makeEntry('a', 'A.'), makeEntry('b', 'B.')]);
    const entries = removeHistoryEntry(loadHistory(), 'a');
    expect(entries.map((e) => e.id)).toEqual(['b']);
  });

  it('loadHistory dari storage kosong → array kosong', () => {
    expect(loadHistory()).toEqual([]);
  });
});
