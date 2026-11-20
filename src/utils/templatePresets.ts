import { DocumentConfig, DocumentTemplate } from '../types/document';

type TemplatePreset = Pick<
  DocumentConfig,
  'margin' | 'lineSpacing' | 'firstLineIndent' | 'fontSize'
>;

export const TEMPLATE_PRESETS: Record<Exclude<DocumentTemplate, 'kustom'>, TemplatePreset> = {
  makalah: {
    margin: { top: 3, bottom: 3, left: 4, right: 3 },
    lineSpacing: 1.5,
    firstLineIndent: 1.0,
    fontSize: { title: 14, subTitle: 12, body: 12, table: 10, caption: 10 }
  },
  skripsi: {
    margin: { top: 4, bottom: 3, left: 4, right: 3 },
    lineSpacing: 2.0,
    firstLineIndent: 1.27,
    fontSize: { title: 14, subTitle: 12, body: 12, table: 10, caption: 10 }
  },
  jurnal: {
    margin: { top: 3, bottom: 3, left: 3, right: 3 },
    lineSpacing: 1.15,
    firstLineIndent: 0.8,
    fontSize: { title: 12, subTitle: 11, body: 11, table: 9, caption: 9 }
  }
};

export const TEMPLATE_DESCRIPTIONS: Record<DocumentTemplate, string> = {
  makalah:
    'Format umum makalah kuliah: A4, margin 4-3-3-3 cm, Times New Roman 12 pt, spasi 1,5.',
  skripsi:
    'Format standar skripsi/tesis: A4, margin 4-3-3-3 cm (beberapa kampus 4-4-3-3), Times New Roman 12 pt, spasi 2,0.',
  jurnal:
    'Format artikel jurnal ilmiah: A4, margin 3-3-3-3 cm, font 11 pt, spasi 1,15.',
  kustom:
    'Pengaturan kustom: sesuaikan margin, jenis font, ukuran, spasi, dan indentasi sesuai pedoman kampus Anda.'
};

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
    fontSize: { ...preset.fontSize }
  };
}
