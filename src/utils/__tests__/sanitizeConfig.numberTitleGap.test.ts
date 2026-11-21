import { describe, it, expect } from 'vitest';
import { sanitizeConfig } from '../../App';
import type { DocumentConfig } from '../../types/document';

// sanitizeConfig bertipe Partial<DocumentConfig> (headingRules utuh), tapi di
// runtime field parsial tetap diterima lewat merge — test memakai cast.
const partial = (headingRules: Record<string, unknown>) =>
  ({ headingRules }) as unknown as Partial<DocumentConfig>;

describe('sanitize numberTitleGapCm', () => {
  it('menjepit nilai di luar 0–5', () => {
    expect(sanitizeConfig(partial({ numberTitleGapCm: 8 })).headingRules.numberTitleGapCm).toBe(5);
    expect(sanitizeConfig(partial({ numberTitleGapCm: -1 })).headingRules.numberTitleGapCm).toBe(0);
  });
  it('nilai di bawah 0,5 cm (bukan 0) dinaikkan ke 0,5 cm agar judul tidak menempel', () => {
    expect(sanitizeConfig(partial({ numberTitleGapCm: 0.75 })).headingRules.numberTitleGapCm).toBe(0.75);
    expect(sanitizeConfig(partial({ numberTitleGapCm: 0.3 })).headingRules.numberTitleGapCm).toBe(0.5);
  });
  it('nilai valid lolos, field hilang kembali ke default 0', () => {
    expect(sanitizeConfig(partial({ numberTitleGapCm: 1.27 })).headingRules.numberTitleGapCm).toBe(1.27);
    expect(sanitizeConfig({}).headingRules.numberTitleGapCm).toBe(0);
  });
  it('default menjorok baris pertama paragraf 0,75 cm', () => {
    expect(sanitizeConfig({}).firstLineIndent).toBe(0.75);
  });
});
