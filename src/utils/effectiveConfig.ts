import { DocumentConfig } from '../types/document';
import {
  DEFAULT_HEADING_RULES,
  DEFAULT_PAGE_SETUP,
  DEFAULT_COVER_LAYOUT,
  DEFAULT_TABLE_STYLE
} from './formatEngine';

/**
 * Konfigurasi yang benar-benar dipakai oleh pratinjau & ekspor.
 * Setiap aturan yang dimatikan di panel "Aturan yang diterapkan"
 * akan mengembalikan nilai netral (default Word), bukan diabaikan diam-diam.
 */
export interface EffectiveConfig {
  template: DocumentConfig['template'];
  margin: DocumentConfig['margin'];
  fontFamily: DocumentConfig['fontFamily'];
  fontSize: DocumentConfig['fontSize'];
  lineSpacing: number;
  firstLineIndent: number;
  alignment: DocumentConfig['alignment'];
  headingRules: DocumentConfig['headingRules'];
  pageSetup: DocumentConfig['pageSetup'];
  coverLayout: DocumentConfig['coverLayout'];
  hangingIndent: number;
  tableStyle: DocumentConfig['tableStyle'];
  numbering: boolean;
  pageNumbers: boolean;
  headerFooter: boolean;
  cleanMarkdown: boolean;
  cleanChatter: boolean;
}

const NEUTRAL_MARGIN = { top: 2.54, bottom: 2.54, left: 2.54, right: 2.54 };
const NEUTRAL_FONT_SIZE = { title: 12, subTitle: 11, body: 11, table: 10, caption: 10 };
// Tanpa aturan tabel: garis tipis bawaan Word, judul kolom tidak tebal, rata kiri.
const NEUTRAL_TABLE_STYLE: DocumentConfig['tableStyle'] = {
  borderWidth: 0.5,
  headerBold: false,
  cellAlignment: 'left'
};

export function isRuleEnabled(config: DocumentConfig, key: string): boolean {
  return config.rules[key] !== false;
}

export function getEffectiveConfig(config: DocumentConfig): EffectiveConfig {
  const fontFamily = isRuleEnabled(config, 'font') ? config.fontFamily : 'Calibri';
  const headingRules = config.headingRules ?? DEFAULT_HEADING_RULES;
  // Tanpa aturan jarak judul, semua jarak atas/bawah judul dibuat 0 pt.
  const headingSpacing = isRuleEnabled(config, 'heading_spacing')
    ? headingRules
    : {
        ...headingRules,
        h1: { ...headingRules.h1, spaceBefore: 0, spaceAfter: 0 },
        h2: { ...headingRules.h2, spaceBefore: 0, spaceAfter: 0 },
        h3: { ...headingRules.h3, spaceBefore: 0, spaceAfter: 0 }
      };
  const pageNumbers = isRuleEnabled(config, 'page_numbers') && isRuleEnabled(config, 'header_footer');

  return {
    template: config.template,
    margin: isRuleEnabled(config, 'margin') ? config.margin : NEUTRAL_MARGIN,
    fontFamily,
    fontSize: isRuleEnabled(config, 'font_size') ? config.fontSize : NEUTRAL_FONT_SIZE,
    lineSpacing: isRuleEnabled(config, 'line_spacing') ? config.lineSpacing : 1,
    firstLineIndent: isRuleEnabled(config, 'indent') ? config.firstLineIndent : 0,
    alignment: isRuleEnabled(config, 'alignment') ? config.alignment : 'left',
    headingRules: headingSpacing,
    pageSetup: config.pageSetup ?? DEFAULT_PAGE_SETUP,
    coverLayout: config.coverLayout ?? DEFAULT_COVER_LAYOUT,
    hangingIndent: isRuleEnabled(config, 'hanging_indent') ? config.hangingIndent ?? 1.27 : 0,
    tableStyle: isRuleEnabled(config, 'table_format')
      ? config.tableStyle ?? DEFAULT_TABLE_STYLE
      : NEUTRAL_TABLE_STYLE,
    numbering: isRuleEnabled(config, 'numbering'),
    pageNumbers,
    headerFooter: isRuleEnabled(config, 'header_footer'),
    cleanMarkdown: isRuleEnabled(config, 'clean_markdown'),
    cleanChatter: isRuleEnabled(config, 'clean_chatter'),
  };
}

export function cssFontFamily(font: string): string {
  if (font === 'Times New Roman') return '"Times New Roman", Times, serif';
  if (font === 'Arial') return 'Arial, Helvetica, sans-serif';
  return `"${font}", system-ui, sans-serif`;
}
