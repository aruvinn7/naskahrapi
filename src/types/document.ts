export type DocumentTemplate = 'makalah' | 'skripsi' | 'jurnal' | 'kustom';

export interface FormattingRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export interface HeadingStyle {
  bold: boolean;
  italic: boolean;
  allCaps: boolean;
  alignment: 'center' | 'left' | 'justify';
  spaceBefore: number; // pt
  spaceAfter: number;  // pt
}

export type ChapterNumberingFormat = 'bab-roman' | 'bab-arabic' | 'roman' | 'none';
export type BabTitleStyle = 'separate' | 'joined';

export interface HeadingRules {
  h1: HeadingStyle;
  h2: HeadingStyle;
  h3: HeadingStyle;
  /** Format penomoran BAB: "BAB I", "BAB 1", "I.", atau tanpa label. */
  numberingFormat: ChapterNumberingFormat;
  /** "BAB I" + "PENDAHULUAN" dua baris, atau satu baris "BAB I PENDAHULUAN". */
  babTitleStyle: BabTitleStyle;
  /** Gaya nomor sub-bab: "1.1" numerik atau "I.1" romawi. */
  h2Numbering: 'numeric' | 'roman';
}

export type PaperSize = 'a4' | 'f4' | 'letter';

export interface PageSetup {
  paperSize: PaperSize;
  orientation: 'portrait' | 'landscape';
  headerText: string;
  headerEnabled: boolean;
  pageNumberPosition: 'top-right' | 'bottom-center' | 'bottom-right' | 'none';
  /** Setiap BAB/DAFTAR PUSTAKA mulai di halaman baru. */
  newPagePerBab: boolean;
}

export type CoverLayoutVariant = 'klasik' | 'logo-atas' | 'minimal';

export interface CoverLayout {
  variant: CoverLayoutVariant;
}

export interface DocumentConfig {
  template: DocumentTemplate;
  margin: {
    top: number;    // in cm
    bottom: number; // in cm
    left: number;   // in cm
    right: number;  // in cm
  };
  fontFamily: 'Times New Roman' | 'Arial' | 'Calibri';
  fontSize: {
    title: number;    // BAB I: 14pt
    subTitle: number; // 1.1: 12pt bold
    body: number;     // 12pt
    table: number;    // 10pt
    caption: number;  // 10pt
  };
  lineSpacing: number; // 1.5 or 2.0
  firstLineIndent: number; // in cm (1.0 or 1.27)
  alignment: 'justify' | 'left' | 'center';
  headingRules: HeadingRules;
  pageSetup: PageSetup;
  coverLayout: CoverLayout;
  rules: Record<string, boolean>;
}

export interface SavedPreset {
  id: string;
  name: string;
  description: string;
  config: DocumentConfig;
  createdAt: number;
}

export interface CoverMember {
  id: string;
  name: string;
  nim: string;
}

export interface CoverData {
  enabled: boolean;
  showLogo: boolean;
  logo?: string;          // data URL (PNG/JPEG)
  logoWidth?: number;     // piksel asli setelah diskalakan
  logoHeight?: number;
  documentType: string;   // MAKALAH / SKRIPSI / ...
  title: string;
  subtitle: string;       // "Disusun untuk Memenuhi Tugas ..."
  course: string;         // Mata kuliah
  lecturer: string;       // Dosen pengampu
  authorPrefix: string;   // "Disusun oleh:"
  members: CoverMember[]; // Nama & NIM anggota
  studyProgram: string;
  department: string;
  faculty: string;
  institution: string;
  city: string;
  year: string;
  // Field opsional (muncul di cover hanya jika diisi):
  motto: string;
  pembimbing1: string;
  pembimbing2: string;
  penguji1: string;
  penguji2: string;
  sidangTanggal: string;
}

export type BlockType = 
  | 'cover'
  | 'kata_pengantar'
  | 'daftar_isi'
  | 'daftar_tabel'
  | 'daftar_gambar'
  | 'daftar_lampiran'
  | 'abstrak'
  | 'heading_1'   // e.g. BAB I PENDAHULUAN
  | 'heading_2'   // e.g. 1.1 Latar Belakang
  | 'heading_3'   // e.g. 1.1.1 Sub-bagian
  | 'paragraph'
  | 'list_item'
  | 'table'
  | 'table_caption'
  | 'figure_caption'
  | 'daftar_tabel_item'
  | 'daftar_gambar_item'
  | 'daftar_pustaka_item'
  | 'raw';

export interface DocumentBlock {
  id: string;
  type: BlockType;
  title?: string;
  rawContent: string;
  formattedContent: string;
  level?: number;
  pageEstimate?: number;
  meta?: Record<string, any>;
}

export interface DocumentSection {
  id: string;
  title: string;
  type: string;
  blockCount: number;
  startPageEstimate: number;
  blocks: DocumentBlock[];
}

export interface InspectionIssue {
  id: string;
  type: 'warning' | 'info' | 'error';
  category: 'markdown_ai' | 'basa_basi_ai' | 'typo' | 'struktur' | 'format';
  title: string;
  description: string;
  location?: string;
  autoFixAvailable?: boolean;
}

export interface ParsedDocument {
  title: string;
  fileName: string;
  rawText: string;
  sections: DocumentSection[];
  totalBlocks: number;
  totalWords: number;
  estimatedPages: number;
  issues: InspectionIssue[];
  cover?: CoverData;
}
