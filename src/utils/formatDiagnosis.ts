import {
  DocumentConfig,
  DocumentSection,
  DocumentTemplate,
  ParsedDocument
} from '../types/document';
import { analyzeCitations, CitationStyle } from './citationHelper';
import { parseChapterHeading } from './formatEngine';
import { detectKbbiIssues } from './kbbiCorrector';
import { TEMPLATE_PRESETS } from './templatePresets';

/** Tipe dokumen yang bisa ditebak dari isi & struktur. */
export type DetectedDocumentType = Exclude<DocumentTemplate, 'kustom'>;

export type DiagnosisSeverity = 'ok' | 'info' | 'warning' | 'error';

export interface DiagnosisCheck {
  id: string;
  severity: DiagnosisSeverity;
  title: string;
  detail: string;
  hint?: string;
}

export interface SectionRequirement {
  id: string;
  label: string;
  required: boolean;
  present: boolean;
}

export interface DiagnosisFixes {
  /** Template yang sebaiknya diterapkan, null jika konfigurasi sudah cocok. */
  template: DetectedDocumentType | null;
  sortBibliography: boolean;
  kbbiCount: number;
}

export interface FormatDiagnosis {
  detectedType: DetectedDocumentType;
  confidence: number;
  evidence: string[];
  citationStyle: CitationStyle;
  score: number;
  checks: DiagnosisCheck[];
  requirements: SectionRequirement[];
  wordCount: number;
  chapterCount: number;
  bibliographyCount: number;
  fixes: DiagnosisFixes;
}

const TYPE_LABEL: Record<DetectedDocumentType, string> = {
  makalah: 'Makalah',
  skripsi: 'Skripsi / Tugas Akhir',
  jurnal: 'Artikel Jurnal'
};

export function documentTypeLabel(type: DetectedDocumentType): string {
  return TYPE_LABEL[type];
}

function hasSection(sections: DocumentSection[], types: string[]): boolean {
  return sections.some((section) => types.includes(section.type));
}

function sectionHas(sections: DocumentSection[], predicate: (section: DocumentSection) => boolean) {
  return sections.some(predicate);
}

function bibliographySection(sections: DocumentSection[]): DocumentSection | undefined {
  return sections.find(
    (section) =>
      section.type === 'daftar_pustaka' ||
      section.title.toUpperCase().includes('DAFTAR PUSTAKA')
  );
}

function chapterHeadings(sections: DocumentSection[]): string[] {
  const headings: string[] = [];

  sections.forEach((section) => {
    if (section.type === 'bab') headings.push(section.title);

    section.blocks.forEach((block) => {
      if (block.type === 'heading_1') headings.push(block.formattedContent);
    });
  });

  return headings;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('id-ID').format(value);
}

/**
 * Menebak tipe dokumen dari judul, struktur bagian, jumlah bab, dan panjang teks.
 * Deteksi hanya memakai metadata & pola teks — tidak menebak margin/font.
 */
export function detectDocumentType(doc: ParsedDocument): {
  type: DetectedDocumentType;
  confidence: number;
  evidence: string[];
  chapterCount: number;
} {
  const sections = doc.sections;
  const wordCount = doc.totalWords || 0;
  const chapterCount = sections.filter((section) => section.type === 'bab').length;
  const titleSource = [
    doc.title,
    doc.cover?.documentType,
    doc.cover?.title
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const allHeadings = chapterHeadings(sections).join(' ').toLowerCase();
  const rawText = doc.rawText.toLowerCase();

  const scores: Record<DetectedDocumentType, number> = {
    makalah: 0,
    skripsi: 0,
    jurnal: 0
  };
  const evidence: string[] = [];

  const add = (type: DetectedDocumentType, points: number) => {
    scores[type] += points;
  };

  // 1. Kata kunci pada judul / halaman sampul.
  if (/skripsi|tesis|tugas\s+akhir/.test(titleSource)) {
    add('skripsi', 5);
    evidence.push('Judul menyebut skripsi/tesis/tugas akhir');
  } else if (/jurnal|artikel\s+ilmiah/.test(titleSource)) {
    add('jurnal', 5);
    evidence.push('Judul menyebut jurnal/artikel ilmiah');
  } else if (/makalah/.test(titleSource)) {
    add('makalah', 4);
    evidence.push('Judul menyebut makalah');
  }

  // 2. Kelengkapan bagian khas tiap jenis karya.
  if (hasSection(sections, ['abstrak'])) {
    add('skripsi', 2);
    add('jurnal', 3);
    evidence.push('Ada bagian abstrak');
  }
  if (hasSection(sections, ['kata_pengantar'])) {
    add('skripsi', 3);
    add('makalah', 2);
    evidence.push('Ada kata pengantar');
  }
  if (hasSection(sections, ['daftar_isi'])) {
    add('skripsi', 1);
    add('makalah', 1);
  }
  if (hasSection(sections, ['daftar_tabel', 'daftar_gambar'])) {
    add('skripsi', 2);
    evidence.push('Ada daftar tabel/gambar');
  }
  if (hasSection(sections, ['daftar_lampiran'])) {
    add('skripsi', 2);
    evidence.push('Ada daftar lampiran');
  }

  // 3. Jumlah bab isi.
  if (chapterCount >= 5) {
    add('skripsi', 4);
    evidence.push(`${chapterCount} bab isi terdeteksi`);
  } else if (chapterCount >= 3) {
    add('makalah', 3);
    evidence.push(`${chapterCount} bab isi terdeteksi`);
  } else if (chapterCount > 0) {
    add('makalah', 1);
  }

  // 4. Panjang dokumen (kasar, bukan penentu tunggal).
  if (wordCount >= 12000) {
    add('skripsi', 3);
    evidence.push(`${formatNumber(wordCount)} kata — panjang khas skripsi`);
  } else if (wordCount > 0 && wordCount <= 6000) {
    add('jurnal', 2);
    add('makalah', 1);
    evidence.push(`${formatNumber(wordCount)} kata — panjang khas artikel/makalah`);
  } else if (wordCount > 6000) {
    add('makalah', 1);
  }

  // 5. Pola IMRAD (pendahuluan–metode–hasil–pembahasan) → jurnal.
  const imradSource = `${allHeadings} ${rawText}`;
  const imradHits = [
    /pendahuluan/,
    /metode|metodologi/,
    /hasil/,
    /pembahasan|diskusi/,
    /kesimpulan|penutup/
  ].filter((pattern) => pattern.test(imradSource)).length;
  if (imradHits >= 4) {
    add('jurnal', 3);
    evidence.push('Struktur mirip artikel jurnal (pendahuluan–metode–hasil–kesimpulan)');
  }

  const ranked = (Object.keys(scores) as DetectedDocumentType[]).sort(
    (a, b) => scores[b] - scores[a]
  );
  const type = scores[ranked[0]] > 0 ? ranked[0] : 'makalah';
  const total = Object.values(scores).reduce((sum, value) => sum + value, 0);
  const confidence = total > 0 ? Math.min(1, Math.max(0.3, scores[type] / total)) : 0.3;

  if (evidence.length === 0) {
    evidence.push('Belum cukup penanda struktur — memakai format makalah sebagai default');
  }

  return { type, confidence, evidence: evidence.slice(0, 5), chapterCount };
}

function buildRequirements(
  type: DetectedDocumentType,
  sections: DocumentSection[],
  chapterCount: number,
  rawText: string
): SectionRequirement[] {
  const hasCover = hasSection(sections, ['cover']);
  const hasAbstract = hasSection(sections, ['abstrak']) || /\babstrak\b/i.test(rawText);
  const hasPreface = hasSection(sections, ['kata_pengantar']);
  const hasToc = hasSection(sections, ['daftar_isi']);
  const hasBibliography = sectionHas(sections, (section) => section.type === 'daftar_pustaka');
  const hasMethod = /metode|metodologi/i.test(rawText);
  const hasResult = /hasil|pembahasan/i.test(rawText);
  const hasConclusion = /kesimpulan|penutup/i.test(rawText);
  const hasIntroduction = /pendahuluan/i.test(rawText);

  if (type === 'skripsi') {
    return [
      { id: 'cover', label: 'Halaman sampul', required: true, present: hasCover },
      { id: 'abstrak', label: 'Abstrak', required: true, present: hasAbstract },
      { id: 'kata_pengantar', label: 'Kata pengantar', required: true, present: hasPreface },
      { id: 'daftar_isi', label: 'Daftar isi', required: true, present: hasToc },
      {
        id: 'bab',
        label: 'Minimal 5 bab isi',
        required: true,
        present: chapterCount >= 5
      },
      { id: 'daftar_pustaka', label: 'Daftar pustaka', required: true, present: hasBibliography }
    ];
  }

  if (type === 'jurnal') {
    return [
      { id: 'abstrak', label: 'Abstrak', required: true, present: hasAbstract },
      { id: 'pendahuluan', label: 'Pendahuluan', required: true, present: hasIntroduction },
      { id: 'metode', label: 'Metode penelitian', required: true, present: hasMethod },
      { id: 'hasil', label: 'Hasil & pembahasan', required: true, present: hasResult },
      { id: 'kesimpulan', label: 'Kesimpulan', required: true, present: hasConclusion },
      { id: 'daftar_pustaka', label: 'Daftar pustaka', required: true, present: hasBibliography }
    ];
  }

  return [
    { id: 'cover', label: 'Halaman sampul', required: true, present: hasCover },
    { id: 'daftar_isi', label: 'Daftar isi', required: false, present: hasToc },
    { id: 'bab', label: 'Minimal 3 bab isi', required: true, present: chapterCount >= 3 },
    {
      id: 'daftar_pustaka',
      label: 'Daftar pustaka',
      required: true,
      present: hasBibliography
    }
  ];
}

function templateDifferences(config: DocumentConfig, type: DetectedDocumentType): string[] {
  const preset = TEMPLATE_PRESETS[type];
  const differences: string[] = [];

  const marginKeys: Array<keyof DocumentConfig['margin']> = ['top', 'bottom', 'left', 'right'];
  const marginLabels: Record<keyof DocumentConfig['margin'], string> = {
    top: 'atas',
    bottom: 'bawah',
    left: 'kiri',
    right: 'kanan'
  };
  marginKeys.forEach((key) => {
    if (Math.abs(config.margin[key] - preset.margin[key]) > 0.05) {
      differences.push(
        `margin ${marginLabels[key]} ${config.margin[key]} cm (preset ${preset.margin[key]} cm)`
      );
    }
  });

  if (Math.abs(config.lineSpacing - preset.lineSpacing) > 0.05) {
    differences.push(`spasi ${config.lineSpacing} (preset ${preset.lineSpacing})`);
  }
  if (Math.abs(config.firstLineIndent - preset.firstLineIndent) > 0.05) {
    differences.push(
      `indentasi ${config.firstLineIndent} cm (preset ${preset.firstLineIndent} cm)`
    );
  }
  if (config.fontSize.body !== preset.fontSize.body) {
    differences.push(`font isi ${config.fontSize.body} pt (preset ${preset.fontSize.body} pt)`);
  }
  if (config.fontFamily !== 'Times New Roman') {
    differences.push(`font ${config.fontFamily} (preset Times New Roman)`);
  }

  return differences;
}

function numberingChecks(sections: DocumentSection[]): DiagnosisCheck[] {
  const checks: DiagnosisCheck[] = [];
  const chapters = chapterHeadings(sections)
    .map((heading) => parseChapterHeading(heading))
    .filter((parts): parts is NonNullable<typeof parts> => Boolean(parts));

  const hasArabic = chapters.some((parts) => /^\d+$/.test(parts.number || ''));
  const hasRoman = chapters.some((parts) => /^[IVXLCDM]+$/.test(parts.number || ''));
  if (hasArabic && hasRoman) {
    checks.push({
      id: 'numbering-mixed',
      severity: 'warning',
      title: 'Penomoran BAB tidak konsisten',
      detail: 'Ada bab bernomor angka (BAB 1) dan romawi (BAB I) dalam satu dokumen.',
      hint: 'Pilih satu format di panel Formatting → Gaya judul → Penomoran BAB.'
    });
  }

  let duplicateSubHeading = '';
  sections.forEach((section) => {
    const seen = new Set<string>();
    section.blocks.forEach((block) => {
      if (block.type !== 'heading_2') return;
      const number = block.formattedContent.trim().match(/^(\d+\.\d+)/)?.[1];
      if (!number) return;
      if (seen.has(number) && !duplicateSubHeading) duplicateSubHeading = number;
      seen.add(number);
    });
  });

  if (duplicateSubHeading) {
    checks.push({
      id: 'numbering-duplicate',
      severity: 'warning',
      title: 'Nomor sub-bab duplikat',
      detail: `Nomor ${duplicateSubHeading} muncul lebih dari sekali dalam satu bab.`,
      hint: 'Periksa urutan sub-bab; nomor ganda membingungkan pembaca dan daftar isi.'
    });
  }

  return checks;
}

/**
 * Menganalisis dokumen terhadap preset & kelengkapan struktur, lalu
 * menghasilkan temuan yang bisa ditindaklanjuti (apply preset, urutkan
 * pustaka, perbaiki KBBI).
 */
export function diagnoseDocument(doc: ParsedDocument, config: DocumentConfig): FormatDiagnosis {
  const detection = detectDocumentType(doc);
  const { type, confidence, evidence, chapterCount } = detection;
  const sections = doc.sections;
  const checks: DiagnosisCheck[] = [];

  const citation = analyzeCitations(sections);
  const bibSection = bibliographySection(sections);
  const bibliographyCount = bibSection
    ? bibSection.blocks.filter(
        (block) => block.type === 'daftar_pustaka_item' || block.type === 'paragraph'
      ).length
    : 0;

  const requirements = buildRequirements(type, sections, chapterCount, doc.rawText);
  const missingRequired = requirements.filter((item) => item.required && !item.present);

  // 1. Anomali konfigurasi terhadap preset tipe dokumen.
  const differences = templateDifferences(config, type);
  const templateMismatch = config.template !== type || differences.length > 0;
  if (templateMismatch) {
    checks.push({
      id: 'template-mismatch',
      severity: config.template === type ? 'warning' : 'info',
      title: `Pengaturan belum sesuai preset ${documentTypeLabel(type)}`,
      detail:
        differences.length > 0
          ? `Perbedaan: ${differences.slice(0, 4).join('; ')}.`
          : `Template aktif "${config.template}" berbeda dari tipe dokumen terdeteksi.`,
      hint: `Terapkan preset ${documentTypeLabel(type)} agar margin, spasi, dan font konsisten.`
    });
  } else {
    checks.push({
      id: 'template-match',
      severity: 'ok',
      title: `Pengaturan sesuai preset ${documentTypeLabel(type)}`,
      detail: 'Margin, spasi, indentasi, dan ukuran font sudah cocok dengan tipe dokumen.'
    });
  }

  // 2. Penomoran heading.
  checks.push(...numberingChecks(sections));

  // 3. Daftar pustaka & sitasi.
  if (!bibSection && citation.inTextCitations.length > 0) {
    checks.push({
      id: 'bibliography-missing',
      severity: 'error',
      title: 'Daftar pustaka tidak ditemukan',
      detail: `Ada ${citation.inTextCitations.length} sitasi di teks, tetapi bagian Daftar Pustaka tidak terdeteksi.`,
      hint: 'Tambahkan bagian DAFTAR PUSTAKA di akhir dokumen.'
    });
  } else if (bibSection && bibliographyCount === 0) {
    checks.push({
      id: 'bibliography-empty',
      severity: 'warning',
      title: 'Daftar pustaka masih kosong',
      detail: 'Bagian Daftar Pustaka ada, tetapi belum berisi entri.',
      hint: 'Tambahkan entri pustaka; setiap sitasi di teks harus punya rujukan.'
    });
  } else if (bibSection) {
    if (!citation.isSortedAlphabetically && bibliographyCount > 1) {
      checks.push({
        id: 'bibliography-unsorted',
        severity: 'warning',
        title: 'Daftar pustaka belum urut A–Z',
        detail: `${bibliographyCount} entri terdeteksi, tetapi urutannya belum abjad.`,
        hint: 'Gunakan tombol urutkan atau "Rapikan otomatis" di panel ini.'
      });
    }
    if (citation.missingFromBibliography.length > 0) {
      checks.push({
        id: 'citation-missing-entry',
        severity: 'warning',
        title: 'Sitasi tanpa entri pustaka',
        detail: `${citation.missingFromBibliography.length} sitasi tidak ditemukan di Daftar Pustaka: ${citation.missingFromBibliography
          .slice(0, 3)
          .join(', ')}${citation.missingFromBibliography.length > 3 ? ', …' : ''}.`,
        hint: 'Lengkapi entri yang hilang agar tidak dianggap plagiarisme.'
      });
    }
  }

  // 4. Kata tidak baku (KBBI).
  const kbbiIssues = detectKbbiIssues(doc.rawText);
  const kbbiCount = kbbiIssues.reduce((total, issue) => total + issue.count, 0);
  if (kbbiCount > 0) {
    checks.push({
      id: 'kbbi',
      severity: 'warning',
      title: `${kbbiCount} kata belum baku`,
      detail: `Contoh: ${kbbiIssues
        .slice(0, 3)
        .map((issue) => `${issue.rule.wrong} → ${issue.rule.correct}`)
        .join(', ')}.`,
      hint: 'Perbaiki otomatis lewat panel ini atau tab Pemeriksaan.'
    });
  }

  // 5. Sisa penanda Markdown / basa-basi AI.
  const markdownIssues = doc.issues.filter((issue) => issue.category === 'markdown_ai');
  if (markdownIssues.length > 0) {
    checks.push({
      id: 'markdown-residue',
      severity: 'info',
      title: 'Masih ada penanda Markdown AI',
      detail: `${markdownIssues.length} temuan seperti **tebal**, ###, atau backtick di teks asli.`,
      hint: 'Aktifkan "Bersihkan Markdown AI" saat memuat ulang dokumen.'
    });
  }

  // 6. Panjang dokumen vs tipe yang ditebak.
  if (type === 'skripsi' && doc.totalWords > 0 && doc.totalWords < 5000) {
    checks.push({
      id: 'word-count-short',
      severity: 'info',
      title: 'Dokumen lebih pendek dari skripsi pada umumnya',
      detail: `${formatNumber(doc.totalWords)} kata — skripsi biasanya jauh lebih panjang.`,
      hint: 'Pastikan seluruh bab sudah dimuat, bukan hanya sebagian.'
    });
  }
  if (type === 'jurnal' && doc.totalWords > 12000) {
    checks.push({
      id: 'word-count-long',
      severity: 'info',
      title: 'Dokumen cukup panjang untuk artikel jurnal',
      detail: `${formatNumber(doc.totalWords)} kata — melebihi banyak batas artikel jurnal (6.000–8.000 kata).`,
      hint: 'Pertimbangkan memangkas atau memecah menjadi beberapa artikel.'
    });
  }

  // 7. Bagian wajib yang belum terdeteksi.
  missingRequired.forEach((item) => {
    checks.push({
      id: `missing-${item.id}`,
      severity: 'warning',
      title: `Bagian belum terdeteksi: ${item.label}`,
      detail: `Struktur ${documentTypeLabel(type)} biasanya memuat ${item.label.toLowerCase()}.`,
      hint: 'Tambahkan bagian ini atau pastikan judulnya ditulis sebagai heading yang jelas.'
    });
  });

  const warnings = checks.filter((check) => check.severity === 'warning').length;
  const errors = checks.filter((check) => check.severity === 'error').length;
  const score = Math.max(0, Math.min(100, 100 - warnings * 6 - errors * 14 - missingRequired.length * 4));

  const fixes: DiagnosisFixes = {
    template: templateMismatch ? type : null,
    sortBibliography: Boolean(bibSection && bibliographyCount > 1 && !citation.isSortedAlphabetically),
    kbbiCount
  };

  return {
    detectedType: type,
    confidence,
    evidence,
    citationStyle: citation.styleDetected,
    score,
    checks,
    requirements,
    wordCount: doc.totalWords || 0,
    chapterCount,
    bibliographyCount,
    fixes
  };
}
