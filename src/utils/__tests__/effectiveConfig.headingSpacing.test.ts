import { describe, it, expect } from 'vitest';
import { getEffectiveConfig } from '../effectiveConfig';
import { DEFAULT_CONFIG_MAKALAH } from './helpers';

describe('jarak judul & sub-judul di kolom Aturan', () => {
  it('mengikuti nilai headingRules saat aturan aktif', () => {
    const config = {
      ...DEFAULT_CONFIG_MAKALAH,
      headingRules: {
        ...DEFAULT_CONFIG_MAKALAH.headingRules,
        h1: { ...DEFAULT_CONFIG_MAKALAH.headingRules.h1, spaceBefore: 30, spaceAfter: 12 },
        h2: { ...DEFAULT_CONFIG_MAKALAH.headingRules.h2, spaceBefore: 18, spaceAfter: 9 }
      }
    };

    const effective = getEffectiveConfig(config);

    expect(effective.headingRules.h1.spaceBefore).toBe(30);
    expect(effective.headingRules.h2.spaceBefore).toBe(18);
    expect(effective.headingRules.h2.spaceAfter).toBe(9);
  });

  it('jarak judul jadi 0 pt saat aturan dimatikan, gaya lain tetap', () => {
    const config = {
      ...DEFAULT_CONFIG_MAKALAH,
      rules: { ...DEFAULT_CONFIG_MAKALAH.rules, heading_spacing: false }
    };

    const effective = getEffectiveConfig(config);

    expect(effective.headingRules.h1.spaceBefore).toBe(0);
    expect(effective.headingRules.h1.spaceAfter).toBe(0);
    expect(effective.headingRules.h2.spaceBefore).toBe(0);
    expect(effective.headingRules.h2.spaceAfter).toBe(0);
    // Gaya teks judul (tebal, huruf besar) tidak ikut berubah.
    expect(effective.headingRules.h1.bold).toBe(true);
    expect(effective.headingRules.h1.allCaps).toBe(true);
  });

  it('posisi judul sub-bab diteruskan ke effective config', () => {
    const config = {
      ...DEFAULT_CONFIG_MAKALAH,
      headingRules: { ...DEFAULT_CONFIG_MAKALAH.headingRules, numberTitleGapCm: 1.27 }
    };
    expect(getEffectiveConfig(config).headingRules.numberTitleGapCm).toBe(1.27);
  });
});
