import { DocumentConfig, DocumentTemplate, JournalConfig } from '../types/document';
import { DEFAULT_HEADING_RULES, DEFAULT_PAGE_SETUP } from './formatEngine';

type TemplatePreset = Pick<
  DocumentConfig,
  'margin' | 'lineSpacing' | 'firstLineIndent' | 'fontSize'
>;

export const TEMPLATE_PRESETS: Record<Exclude<DocumentTemplate, 'kustom'>, TemplatePreset> = {
  makalah: {
    margin: { top: 3, bottom: 3, left: 4, right: 3 },
    lineSpacing: 1.5,
    firstLineIndent: 0.75,
    fontSize: { title: 14, subTitle: 12, body: 12, table: 10, caption: 10 }
  },
  skripsi: {
    margin: { top: 4, bottom: 3, left: 4, right: 3 },
    lineSpacing: 2.0,
    firstLineIndent: 1.27,
    fontSize: { title: 14, subTitle: 12, body: 12, table: 10, caption: 10 }
  },
  jurnal: {
    margin: { top: 2.5, bottom: 2.5, left: 2.5, right: 2.5 },
    lineSpacing: 1.0,
    firstLineIndent: 0.75,
    fontSize: { title: 14, subTitle: 12, body: 11, table: 10, caption: 10 }
  }
};

export const TEMPLATE_DESCRIPTIONS: Record<DocumentTemplate, string> = {
  makalah:
    'Format umum makalah kuliah: A4, margin 4-3-3-3 cm, Times New Roman 12 pt, spasi 1,5.',
  skripsi:
    'Format standar skripsi/tesis: A4, margin 4-3-3-3 cm (beberapa kampus 4-4-3-3), Times New Roman 12 pt, spasi 2,0.',
  jurnal:
    'Format artikel jurnal ilmiah: A4 dua kolom, margin 2,5 cm, font 11 pt, spasi 1,0, header jurnal + pustaka bernomor.',
  kustom:
    'Pengaturan kustom: sesuaikan margin, jenis font, ukuran, spasi, dan indentasi sesuai pedoman kampus Anda.'
};

/** Halaman & heading baku per template — ganti template mengembalikan baku. */
const TEMPLATE_PAGE_SETUP: Record<Exclude<DocumentTemplate, 'kustom'>, DocumentConfig['pageSetup']> = {
  makalah: { ...DEFAULT_PAGE_SETUP, pageNumberPosition: 'top-right', newPagePerBab: true, headerEnabled: false },
  skripsi: { ...DEFAULT_PAGE_SETUP, pageNumberPosition: 'top-right', newPagePerBab: true, headerEnabled: false },
  jurnal: {
    ...DEFAULT_PAGE_SETUP,
    pageNumberPosition: 'bottom-center',
    newPagePerBab: false,
    headerEnabled: false,
    headerText: ''
  }
};

const TEMPLATE_HEADING_RULES: Record<Exclude<DocumentTemplate, 'kustom'>, DocumentConfig['headingRules']> = {
  makalah: { ...DEFAULT_HEADING_RULES },
  skripsi: { ...DEFAULT_HEADING_RULES },
  jurnal: {
    ...DEFAULT_HEADING_RULES,
    h1: { ...DEFAULT_HEADING_RULES.h1, allCaps: false, alignment: 'left', spaceBefore: 12, spaceAfter: 6 },
    numberingFormat: 'none',
    babTitleStyle: 'joined'
  }
};

const EMPTY_JOURNAL: JournalConfig = { name: '', volumeInfo: '', issn: '' };

export function applyTemplatePreset(
  config: DocumentConfig,
  template: DocumentTemplate
): DocumentConfig {
  if (template === 'kustom') {
    return { ...config, template };
  }

  const preset = TEMPLATE_PRESETS[template];
  return {
    ...config,
    template,
    margin: { ...preset.margin },
    lineSpacing: preset.lineSpacing,
    firstLineIndent: preset.firstLineIndent,
    fontSize: { ...preset.fontSize },
    pageSetup: { ...TEMPLATE_PAGE_SETUP[template], headerText: template === 'jurnal' ? '' : config.pageSetup.headerText },
    headingRules: { ...TEMPLATE_HEADING_RULES[template] },
    journal: template === 'jurnal' ? (config.journal ?? EMPTY_JOURNAL) : config.journal
  };
}
