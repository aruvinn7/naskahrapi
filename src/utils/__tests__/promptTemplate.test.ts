import { describe, it, expect } from 'vitest';
import { buildAiPromptTemplate } from '../promptTemplate';

describe('buildAiPromptTemplate', () => {
  it('memuat aturan format 1:1 dengan parser', () => {
    const template = buildAiPromptTemplate();
    expect(template).toContain('# BAB');
    expect(template).toContain('## 1.1');
    expect(template).toContain('|---');
    expect(template).toContain('Tabel 2.1:');
    expect(template).toContain('DAFTAR PUSTAKA');
    expect(template).toContain('jangan dibubuhi kalimat pembuka');
    expect(template).toContain('[TOPIK]');
    expect(template).toContain('[JENIS DOKUMEN]');
  });
});
