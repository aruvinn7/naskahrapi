import { describe, it, expect } from 'vitest';
import { applyTemplatePreset } from '../templatePresets';
import { DEFAULT_CONFIG_MAKALAH } from './helpers';

describe('preset template jurnal ala PDF', () => {
  const config = applyTemplatePreset(DEFAULT_CONFIG_MAKALAH, 'jurnal');

  it('margin 2,5 cm empat sisi & spasi 1,0', () => {
    expect(config.margin).toEqual({ top: 2.5, bottom: 2.5, left: 2.5, right: 2.5 });
    expect(config.lineSpacing).toBe(1.0);
    expect(config.firstLineIndent).toBe(0.75);
  });

  it('ukuran isi 11 pt', () => {
    expect(config.fontSize.body).toBe(11);
    expect(config.fontSize.title).toBe(14);
  });

  it('nomor halaman bawah tengah, BAB tidak patah halaman, header makalah mati', () => {
    expect(config.pageSetup.pageNumberPosition).toBe('bottom-center');
    expect(config.pageSetup.newPagePerBab).toBe(false);
    expect(config.pageSetup.headerEnabled).toBe(false);
    expect(config.pageSetup.headerText).toBe('');
  });

  it('heading tanpa nomor BAB', () => {
    expect(config.headingRules.numberingFormat).toBe('none');
    expect(config.headingRules.babTitleStyle).toBe('joined');
  });

  it('field header jurnal tersedia dengan default kosong', () => {
    expect(config.journal).toEqual({ name: '', volumeInfo: '', issn: '' });
  });
});
