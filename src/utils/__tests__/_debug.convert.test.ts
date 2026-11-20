import { describe, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { convertSimpleTables, parseRawDocument } from '../aiCleaner';
import { DEFAULT_CONFIG_MAKALAH } from './helpers';

const fixture = readFileSync(new URL('./fixtures/meta-pandoc.md', import.meta.url), 'utf8');

describe('debug', () => {
  it('dump tabel 3.2', () => {
    const converted = convertSimpleTables(fixture);
    const idx = converted.indexOf('Tabel 3.2');
    console.log('=== REGION 3.2 SETELAH KONVERSI ===');
    console.log(JSON.stringify(converted.slice(idx, idx + 400)));

    const doc = parseRawDocument(fixture, DEFAULT_CONFIG_MAKALAH);
    const bab3 = doc.sections.find((s) => s.title.includes('METODE'));
    console.log('=== BLOK BAB III ===');
    for (const b of bab3!.blocks) {
      console.log(b.type, '|', (b.formattedContent || '').slice(0, 80).replace(/\n/g, '\\n'));
    }
  });
});
