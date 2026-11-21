import type { DocumentConfig } from '../../types/document';

// Duplikat DEFAULT_CONFIG dari App (margin 4-3-3-3, Times New Roman 12,
// spasi 1.5, semua rule aktif) sebagai config minimal untuk test parser.
export const DEFAULT_CONFIG_MAKALAH: DocumentConfig = {
  template: 'makalah',
  margin: { top: 3, bottom: 3, left: 4, right: 3 },
  fontFamily: 'Times New Roman',
  fontSize: { title: 14, subTitle: 12, body: 12, table: 10, caption: 10 },
  lineSpacing: 1.5,
  firstLineIndent: 0.75,
  hangingIndent: 1.27,
  tableStyle: { borderWidth: 1, headerBold: true, cellAlignment: 'left' },
  alignment: 'justify',
  headingRules: {
    h1: { bold: true, italic: false, allCaps: true, alignment: 'center', spaceBefore: 24, spaceAfter: 18 },
    h2: { bold: true, italic: false, allCaps: false, alignment: 'left', spaceBefore: 18, spaceAfter: 6 },
    h3: { bold: true, italic: true, allCaps: false, alignment: 'left', spaceBefore: 12, spaceAfter: 6 },
    numberingFormat: 'bab-roman',
    babTitleStyle: 'separate',
    h2Numbering: 'numeric',
    numberTitleGapCm: 0
  },
  pageSetup: {
    paperSize: 'a4',
    orientation: 'portrait',
    headerText: '',
    headerEnabled: false,
    pageNumberPosition: 'bottom-center',
    newPagePerBab: true
  },
  coverLayout: { variant: 'klasik' },
  rules: {
    margin: true,
    font: true,
    font_size: true,
    line_spacing: true,
    indent: true,
    alignment: true,
    clean_markdown: true,
    clean_chatter: true,
    numbering: true,
    hanging_indent: true,
    page_numbers: true,
    header_footer: true
  }
};
