import { describe, it, expect } from 'vitest';
import { getEffectiveConfig } from '../effectiveConfig';
import { DEFAULT_CONFIG_MAKALAH } from './helpers';

describe('pengaturan tabel di kolom Aturan', () => {
  it('memakai nilai dari config saat aturan tabel aktif', () => {
    const config = {
      ...DEFAULT_CONFIG_MAKALAH,
      fontSize: { ...DEFAULT_CONFIG_MAKALAH.fontSize, table: 9 },
      tableStyle: { borderWidth: 1.5, headerBold: false, cellAlignment: 'center' as const }
    };

    const effective = getEffectiveConfig(config);

    expect(effective.fontSize.table).toBe(9);
    expect(effective.tableStyle).toEqual({
      borderWidth: 1.5,
      headerBold: false,
      cellAlignment: 'center'
    });
  });

  it('kembali ke gaya netral saat aturan tabel dimatikan', () => {
    const config = {
      ...DEFAULT_CONFIG_MAKALAH,
      tableStyle: { borderWidth: 1.5, headerBold: true, cellAlignment: 'center' as const },
      rules: { ...DEFAULT_CONFIG_MAKALAH.rules, table_format: false }
    };

    const effective = getEffectiveConfig(config);

    expect(effective.tableStyle).toEqual({
      borderWidth: 0.5,
      headerBold: false,
      cellAlignment: 'left'
    });
  });
});
