import { CoverData, CoverLayoutVariant, CoverMember, DocumentSection } from '../types/document';
import { stripInlineMarkdown } from './inlineFormat';

export const DEFAULT_COVER_SUBTITLE = 'Disusun guna memenuhi tugas mata kuliah';

const DOCUMENT_TYPE =
  '(MAKALAH|SKRIPSI|TUGAS\\s+AKHIR|LAPORAN|PROPOSAL(?:\\s+(?:SKRIPSI|PENELITIAN))?|KARYA\\s+ILMIAH|PRAKTIK\\s+KERJA(?:\\s+(?:LAPANGAN|NYATA))?|PKL|PPL)';

const DOCUMENT_TYPES = new RegExp(`^${DOCUMENT_TYPE}$`, 'i');
const INLINE_DOCUMENT_TYPE = new RegExp(`^${DOCUMENT_TYPE}\\s*:\\s*(.+)$`, 'i');

const STRUCTURE_PATTERN =
  /^(BAB\s+[IVXLCDM]+|KATA\s+PENGANTAR|DAFTAR\s+(ISI|TABEL|GAMBAR|LAMPIRAN|PUSTAKA)|ABSTRAK|ABSTRACT|PENDAHULUAN|TINJAUAN\s+PUSTAKA|METODE\s+PENELITIAN|HASIL\s+(DAN\s+)?PEMBAHASAN|KESIMPULAN|LAMPIRAN|RIWAYAT\s+HIDUP)\b/i;

const SECTION_BOUNDARY =
  /^(BAB\s+[IVXLCDM]+\b|KATA\s+PENGANTAR\b|DAFTAR\s+(ISI|TABEL|GAMBAR|LAMPIRAN|PUSTAKA)\b|ABSTRAK\b|ABSTRACT\b|PENDAHULUAN\b|TINJAUAN\s+PUSTAKA\b|METODE\s+PENELITIAN\b|HASIL\s+(DAN\s+)?PEMBAHASAN\b|KESIMPULAN\b|RIWAYAT\s+HIDUP\b)/i;

const STUDY_PROGRAM_LINE = /^PROGRAM\s+STUDI\b\s*:?\s*(.*)$/i;
const PRODI_LINE = /^PRODI\b\s*:?\s*(.*)$/i;
const DEPARTMENT_LINE = /^(?:DEPARTEMEN|JURUSAN)\b\s*:?\s*(.*)$/i;
const FACULTY_LINE = /^FAKULTAS\b\s*:?\s*(.*)$/i;
const INSTITUTION_LINE =
  /^(?:UNIVERSITAS|UNIVERSITET|INSTITUT|INSTITUTE|POLITEKNIK|SEKOLAH\s+TINGGI|STIE|STMIK|STAIN|IAIN|UIN|AKADEMI)\b|^UNIV\./i;

const COURSE_LINE = /^(?:MATA\s+KULIAH|MATAKULIAH)\s*(?::\s*(.+))?$/i;
const LECTURER_LINE =
  /^(?:DOSEN(?:\s+(?:PENGAMPU|PEMBIMBING|PEMBINA|PENGASUH))?|PENGAMPU|PEMBIMBING)\s*(?::\s*(.*))?$/i;
const AUTHOR_LINE =
  /^(?:DISUSUN\s+OLEH|DISUSUN|OLEH|PENULIS|NAMA\s+PENULIS)\s*(?::\s*(.*))?$/i;

const SUBTITLE_LINE =
  /^(?:DISUSUN|DIAJUKAN)\s+(?:UNTUK|GUNA|SEBAGAI|DALAM\s+RANGKA|PADA)\b/i;

const LOCATION_YEAR =
  /^([A-ZÀ-ÿa-z][A-ZÀ-ÿa-z.'\-\s]{1,40}?)\s*,\s*(?:(\d{1,2})\s+([A-Za-zÀ-ÿ]+)\s+)?((?:19|20)\d{2})$/;

function cleanLine(text: string): string {
  return stripInlineMarkdown(text)
    .replace(/^#{1,6}\s+/, '')
    .replace(/^>\s?/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isYearLine(line: string): boolean {
  return /^(19|20)\d{2}$/.test(line.trim());
}

function stripPrefix(line: string, pattern: RegExp): string {
  return line.replace(pattern, '').replace(/^[:\s]+/, '').trim();
}

function isStructureLine(line: string): boolean {
  return SECTION_BOUNDARY.test(line) || /^[-=_]{3,}$/.test(line);
}

/** Mengambil baris-baris bagian cover dari teks mentah sebelum Bab I. */
function collectCoverLines(text: string): string[] {
  const lines: string[] = [];

  for (const raw of text.split(/\r?\n/)) {
    const line = cleanLine(raw);
    if (!line) continue;

    // Pemisah markdown menandai akhir blok cover.
    if (/^[-=_]{3,}$/.test(line)) break;

    // Baris seperti "BAB I PENDAHULUAN" tidak termasuk cover.
    if (isStructureLine(line)) break;

    lines.push(line);
    if (lines.length >= 60) break;
  }

  return lines;
}

/** Memecah kalimat "Disusun ... Mata Kuliah X" menjadi keterangan + nama mata kuliah. */
function splitSubtitleCourse(line: string): { subtitle: string; course: string } {
  const match = line.match(/^(.*?\bmata\s+kuliah)\b\s*[:–\-]?\s+(.+)$/i);
  if (!match) return { subtitle: line, course: '' };

  // Hindari memakan kata sambung umum yang bukan nama mata kuliah.
  const course = match[2]
    .replace(/^(?:yaitu|yakni|yang|dengan\s+judul)\s+/i, '')
    .replace(/[.,;:]+$/, '')
    .trim();

  return { subtitle: match[1].trim(), course };
}

function looksLikeInstitution(line: string): boolean {
  return (
    STUDY_PROGRAM_LINE.test(line) ||
    PRODI_LINE.test(line) ||
    DEPARTMENT_LINE.test(line) ||
    FACULTY_LINE.test(line) ||
    INSTITUTION_LINE.test(line)
  );
}

const AUTHOR_NUMBERING = /^\s*\d+[.)]\s*/;

/** Memecah baris penulis ("Nama (NIM)") menjadi kolom nama dan NIM. */
export function parseCoverMembers(lines: string[]): CoverMember[] {
  const members: CoverMember[] = [];

  lines.forEach((line) => {
    const cleaned = line.replace(AUTHOR_NUMBERING, '').trim();
    if (!cleaned) return;

    const match = cleaned.match(/^(.*?)\s*\(([^()]{1,40})\)\s*$/);
    if (match) {
      members.push({
        id: `member-${members.length}`,
        name: match[1].trim(),
        nim: match[2].trim()
      });
      return;
    }

    // Format tabular tanpa tanda kurung: "Nama Lengkap      235060700111037".
    const trailingNim = cleaned.match(/^(.*?)\s+(\d{6,})$/);
    if (trailingNim) {
      members.push({
        id: `member-${members.length}`,
        name: trailingNim[1].trim(),
        nim: trailingNim[2].trim()
      });
      return;
    }

    const spaced = cleaned.match(/^(.*?)\s{2,}(\S+)$/);
    if (spaced && /\d/.test(spaced[2])) {
      members.push({
        id: `member-${members.length}`,
        name: spaced[1].trim(),
        nim: spaced[2].trim()
      });
      return;
    }

    members.push({
      id: `member-${members.length}`,
      name: cleaned,
      nim: ''
    });
  });

  return members;
}

const LOGO_PLACEHOLDER_LINE = /^\[.*\blogo\b.*\]$/i;
const UPPERCASE_LABEL = /^[A-Z][A-Z\s.&()/-]{4,}$/;

function extractFromLines(lines: string[], fallbackTitle: string): CoverData {
  const cover = createBlankCover(fallbackTitle);
  const used = new Set<number>();

  // "[Tempel logo universitas di sini]" bukan isi cover: buang sebelum ekstraksi.
  lines.forEach((line, index) => {
    if (LOGO_PLACEHOLDER_LINE.test(line)) used.add(index);
  });

  if (lines.length === 0) {
    cover.enabled = false;
    return cover;
  }

  // 1. Jenis dokumen & judul.
  let title = '';
  let typeIndex = -1;

  lines.forEach((line, index) => {
    if (typeIndex >= 0) return;
    if (DOCUMENT_TYPES.test(line)) {
      typeIndex = index;
      cover.documentType = line.toUpperCase();
    } else {
      const inline = line.match(INLINE_DOCUMENT_TYPE);
      if (inline && inline[2].trim().length >= 8) {
        typeIndex = index;
        cover.documentType = inline[1].replace(/\s+/g, ' ').toUpperCase();
        title = inline[2].trim();
      }
    }
  });

  if (typeIndex >= 0) used.add(typeIndex);
  if (!cover.documentType) cover.documentType = 'MAKALAH';

  if (!title) {
    for (let index = 0; index < lines.length; index++) {
      if (used.has(index)) continue;
      const line = lines[index];
      if (line.length < 8) continue;
      if (SUBTITLE_LINE.test(line)) continue;
      if (LECTURER_LINE.test(line) || AUTHOR_LINE.test(line)) continue;
      if (looksLikeInstitution(line) || isYearLine(line)) continue;
      if (STRUCTURE_PATTERN.test(line)) continue;

      title = line;
      used.add(index);
      break;
    }
  }
  const typePrefix = new RegExp(`^${cover.documentType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[:\\-–]\\s*`, 'i');
  cover.title = (title || fallbackTitle).replace(typePrefix, '').trim();

  // 2. Kalimat "Disusun untuk/guna ..." sebagai subjudul.
  const subtitleIndex = lines.findIndex(
    (line, index) => !used.has(index) && SUBTITLE_LINE.test(line)
  );

  if (subtitleIndex >= 0) {
    const { subtitle, course } = splitSubtitleCourse(lines[subtitleIndex]);
    cover.subtitle = subtitle;
    if (course) cover.course = course;
    used.add(subtitleIndex);
  }

  // 3. Mata kuliah: eksplisit ("Mata Kuliah: X") atau baris setelah subjudul.
  if (!cover.course) {
    const courseIndex = lines.findIndex(
      (line, index) => !used.has(index) && COURSE_LINE.test(line) && Boolean(line.match(COURSE_LINE)?.[1]?.trim())
    );

    if (courseIndex >= 0) {
      cover.course = stripPrefix(lines[courseIndex], COURSE_LINE);
      used.add(courseIndex);
    } else {
      for (let index = subtitleIndex + 1; subtitleIndex >= 0 && index < lines.length; index++) {
        if (used.has(index)) continue;
        const line = lines[index];

        if (
          LECTURER_LINE.test(line) ||
          AUTHOR_LINE.test(line) ||
          looksLikeInstitution(line) ||
          isYearLine(line) ||
          LOCATION_YEAR.test(line) ||
          line.length > 140
        ) {
          break;
        }

        cover.course = line;
        used.add(index);
        break;
      }
    }
  }

  // 4. Dosen pengampu/pembimbing.
  const lecturerIndex = lines.findIndex(
    (line, index) => !used.has(index) && LECTURER_LINE.test(line)
  );

  if (lecturerIndex >= 0) {
    const inline = stripPrefix(lines[lecturerIndex], LECTURER_LINE);
    used.add(lecturerIndex);

    if (inline) {
      cover.lecturer = inline;
    } else {
      for (let index = lecturerIndex + 1; index < lines.length; index++) {
        if (used.has(index)) continue;
        const line = lines[index];
        if (
          AUTHOR_LINE.test(line) ||
          looksLikeInstitution(line) ||
          isYearLine(line) ||
          LOCATION_YEAR.test(line) ||
          SUBTITLE_LINE.test(line)
        ) {
          break;
        }
        cover.lecturer = line;
        used.add(index);
        break;
      }
    }
  }

  // 5. Blok penulis.
  const authorIndex = lines.findIndex(
    (line, index) => !used.has(index) && AUTHOR_LINE.test(line)
  );

  if (authorIndex >= 0) {
    const match = lines[authorIndex].match(AUTHOR_LINE);
    cover.authorPrefix = /^DISUSUN/i.test(match?.[0] ?? '') ? 'Disusun oleh:' : 'Oleh:';
    used.add(authorIndex);

    const inline = (match?.[1] ?? '').trim();
    const authors: string[] = [];
    if (inline) authors.push(inline);

    for (let index = authorIndex + 1; index < lines.length; index++) {
      if (used.has(index)) continue;
      const line = lines[index];

      if (
        DOCUMENT_TYPES.test(line) ||
        looksLikeInstitution(line) ||
        LECTURER_LINE.test(line) ||
        SUBTITLE_LINE.test(line) ||
        isYearLine(line) ||
        LOCATION_YEAR.test(line) ||
        STRUCTURE_PATTERN.test(line) ||
        // Label institusi tanpa titik dua, mis. "TEKNIK INDUSTRI".
        (UPPERCASE_LABEL.test(line) && !/\d/.test(line))
      ) {
        break;
      }

      // Nama/NIM boleh panjang; hindari menyerap paragraf penjelasan.
      if (line.length <= 120) {
        authors.push(line);
        used.add(index);
      }

      if (authors.length >= 12) break;
    }

    cover.members = parseCoverMembers(authors);
  }

  // 6. Identitas institusi.
  lines.forEach((line, index) => {
    if (used.has(index)) return;
    if (STRUCTURE_PATTERN.test(line)) return;

    const study = line.match(STUDY_PROGRAM_LINE);
    if (study) {
      cover.studyProgram = stripPrefix(line, STUDY_PROGRAM_LINE);
      used.add(index);
      return;
    }

    const prodi = line.match(PRODI_LINE);
    if (prodi) {
      cover.studyProgram = stripPrefix(line, PRODI_LINE);
      used.add(index);
      return;
    }

    if (DEPARTMENT_LINE.test(line)) {
      cover.department = stripPrefix(line, DEPARTMENT_LINE);
      used.add(index);
      return;
    }

    if (FACULTY_LINE.test(line)) {
      cover.faculty = line;
      used.add(index);
      return;
    }

    if (INSTITUTION_LINE.test(line)) {
      cover.institution = line;
      used.add(index);
    }
  });

  // 6b. Baris label huruf besar yang tersisa (mis. "TEKNIK INDUSTRI") = program studi.
  if (!cover.studyProgram) {
    const label = lines.find(
      (line, index) =>
        !used.has(index) &&
        UPPERCASE_LABEL.test(line) &&
        !/\d/.test(line) &&
        line.length <= 60
    );

    if (label) {
      cover.studyProgram = label;
      used.add(lines.indexOf(label));
    }
  }

  // 7. Kota & tahun.
  lines.forEach((line, index) => {
    if (used.has(index)) return;

    const cityYear = line.match(LOCATION_YEAR);
    if (cityYear) {
      cover.city = cityYear[1].trim();
      cover.year = cityYear[4];
      used.add(index);
      return;
    }

    if (isYearLine(line)) {
      cover.year = line.trim();
      used.add(index);
    }
  });

  // 8. Subjudul sisa (baris panjang yang belum terpakai) sebagai pelengkap.
  if (!cover.subtitle) {
    const leftover = lines.find(
      (line, index) =>
        !used.has(index) &&
        line.length >= 12 &&
        line.length <= 180 &&
        !STRUCTURE_PATTERN.test(line) &&
        !DOCUMENT_TYPES.test(line) &&
        !looksLikeInstitution(line) &&
        !isYearLine(line)
    );
    if (leftover) cover.subtitle = leftover;
  }

  cover.enabled = lines.length > 0;
  return cover;
}

/**
 * Mengambil data cover dari dokumen.
 * Prioritas memakai baris-baris teks asli (sebelum digabung menjadi paragraf)
 * agar nama mata kuliah, dosen, penulis, dan institusi tidak saling menempel.
 */
export function extractCoverData(
  sections: DocumentSection[],
  fallbackTitle = '',
  sourceText?: string
): CoverData {
  if (sourceText && sourceText.trim()) {
    const lines = collectCoverLines(sourceText);
    if (lines.length > 0) return extractFromLines(lines, fallbackTitle);
  }

  const coverSection = sections.find((section) => section.type === 'cover');
  const lines = (coverSection?.blocks ?? [])
    .map((block) => cleanLine(block.formattedContent))
    .filter(Boolean);

  return extractFromLines(lines, fallbackTitle);
}

export function createBlankCover(title = ''): CoverData {
  return {
    enabled: false,
    showLogo: true,
    logo: undefined,
    logoWidth: undefined,
    logoHeight: undefined,
    documentType: 'MAKALAH',
    title,
    subtitle: '',
    course: '',
    lecturer: '',
    authorPrefix: 'Disusun oleh:',
    members: [],
    studyProgram: '',
    department: '',
    faculty: '',
    institution: '',
    city: '',
    year: String(new Date().getFullYear()),
    motto: '',
    pembimbing1: '',
    pembimbing2: '',
    penguji1: '',
    penguji2: '',
    sidangTanggal: ''
  };
}

export function normalizeCover(raw: Partial<CoverData> | undefined, fallbackTitle = ''): CoverData {
  const base = createBlankCover(fallbackTitle);
  if (!raw) return base;

  const pick = (value: unknown, fallback: string) =>
    typeof value === 'string' ? value : fallback;

  const legacyAuthor = (raw as { author?: unknown }).author;

  const members: CoverMember[] =
    Array.isArray(raw.members) && raw.members.length > 0
      ? raw.members.map((member, index) => ({
          id: pick(member?.id, `member-${index}`),
          name: pick(member?.name, ''),
          nim: pick(member?.nim, '')
        }))
      : typeof legacyAuthor === 'string'
        ? parseCoverMembers(legacyAuthor.split(/\r?\n/))
        : [];

  return {
    ...base,
    ...raw,
    enabled: raw.enabled ?? base.enabled,
    showLogo: raw.showLogo ?? base.showLogo,
    documentType: pick(raw.documentType, base.documentType),
    title: pick(raw.title, base.title || fallbackTitle),
    subtitle: pick(raw.subtitle, base.subtitle),
    course: pick(raw.course, base.course),
    lecturer: pick(raw.lecturer, base.lecturer),
    authorPrefix: pick(raw.authorPrefix, base.authorPrefix),
    members,
    studyProgram: pick(raw.studyProgram, base.studyProgram),
    department: pick(raw.department, base.department),
    faculty: pick(raw.faculty, base.faculty),
    institution: pick(raw.institution, base.institution),
    motto: pick(raw.motto, ''),
    pembimbing1: pick(raw.pembimbing1, ''),
    pembimbing2: pick(raw.pembimbing2, ''),
    penguji1: pick(raw.penguji1, ''),
    penguji2: pick(raw.penguji2, ''),
    sidangTanggal: pick(raw.sidangTanggal, ''),
    city: pick(raw.city, base.city),
    year: pick(raw.year, base.year)
  };
}

export function coverHasContent(cover: CoverData | undefined): boolean {
  if (!cover) return false;
  return Boolean(
    cover.title.trim() ||
      cover.documentType.trim() ||
      cover.subtitle.trim() ||
      cover.course.trim() ||
      cover.lecturer.trim() ||
      cover.members.some((member) => member.name.trim() || member.nim.trim()) ||
      cover.studyProgram.trim() ||
      cover.faculty.trim() ||
      cover.institution.trim() ||
      cover.logo
  );
}

export function coverLocationLine(cover: CoverData): string {
  const city = cover.city.trim();
  const year = cover.year.trim();
  if (city && year) return `${city}, ${year}`;
  return city || year;
}


/** Kotak logo pada halaman A4 (px @96dpi): maksimal 55mm x 32mm. */
export function coverLogoBox(cover: CoverData): { width: number; height: number } {
  const naturalWidth = cover.logoWidth && cover.logoWidth > 0 ? cover.logoWidth : 1;
  const naturalHeight = cover.logoHeight && cover.logoHeight > 0 ? cover.logoHeight : 1;
  const scale = Math.min(208 / naturalWidth, 121 / naturalHeight);

  return {
    width: Math.max(1, Math.round(naturalWidth * scale)),
    height: Math.max(1, Math.round(naturalHeight * scale))
  };
}

/** Teks contoh yang tampil di pratinjau selama kolom cover masih kosong. */
export const COVER_PLACEHOLDERS = {
  title: '[JUDUL DOKUMEN]',
  course: '[NAMA MATA KULIAH]',
  lecturer: '[Nama dosen pengampu]',
  authorName: '[Nama Anggota 1]',
  nim: 'NIM',
  studyProgram: '[PROGRAM STUDI]',
  faculty: '[FAKULTAS]',
  institution: '[UNIVERSITAS]',
  logo: '[Tempel logo / foto di sini]'
} as const;

export interface CoverLine {
  key: string;
  kind: 'text' | 'logo' | 'member';
  text: string;
  bold: boolean;
  italic?: boolean;
  uppercase: boolean;
  size: 'title' | 'body';
  /** Jarak atas dalam em (relatif terhadap ukuran teks isi). */
  spaceBefore: number;
  /** Khusus `kind: 'member'`: kolom nama dan kolom NIM. */
  name?: string;
  nim?: string;
}

/** Jarak tetap antara kolom nama dan kolom NIM pada cover (mm). */
export const MEMBER_COLUMN_GAP_MM = 20;

/**
 * Menyusun baris-baris halaman cover dari data terstruktur.
 * Dipakai bersama oleh pratinjau A4 dan ekspor Word agar hasilnya identik.
 * `placeholders` hanya untuk pratinjau: kolom kosong ditampilkan sebagai teks contoh.
 */
export function buildCoverLines(
  cover: CoverData,
  options: { placeholders?: boolean; variant?: CoverLayoutVariant } = {}
): CoverLine[] {
  const placeholders = options.placeholders ?? false;
  const variant = options.variant ?? 'klasik';

  const fill = (raw: string, placeholder: string): string => {
    const text = (raw ?? '').trim();
    if (text) return text;
    return placeholders ? placeholder : '';
  };

  const lines: CoverLine[] = [];
  const push = (line: CoverLine) => {
    if (line.kind !== 'text' || line.text) lines.push(line);
  };

  const pushLogo = (spaceBefore: number) => {
    if (!cover.showLogo) return;
    lines.push({
      key: 'logo',
      kind: 'logo',
      text: cover.logo ? '' : COVER_PLACEHOLDERS.logo,
      bold: false,
      uppercase: false,
      size: 'body',
      spaceBefore
    });
  };

  if (variant === 'logo-atas') {
    pushLogo(0);
  }

  push({
    key: 'type',
    kind: 'text',
    text: cover.documentType.trim() || 'MAKALAH',
    bold: true,
    uppercase: true,
    size: 'title',
    spaceBefore: 0
  });

  push({
    key: 'title',
    kind: 'text',
    text: fill(cover.title, COVER_PLACEHOLDERS.title),
    bold: true,
    uppercase: true,
    size: 'title',
    spaceBefore: 0.85
  });

  push({
    key: 'subtitle',
    kind: 'text',
    text: cover.subtitle.trim() || DEFAULT_COVER_SUBTITLE,
    bold: false,
    uppercase: false,
    size: 'body',
    spaceBefore: 1.5
  });

  push({
    key: 'course',
    kind: 'text',
    text: fill(cover.course, COVER_PLACEHOLDERS.course),
    bold: true,
    uppercase: true,
    size: 'body',
    spaceBefore: 0.85
  });

  const lecturer = fill(cover.lecturer, COVER_PLACEHOLDERS.lecturer);
  if (lecturer) {
    push({
      key: 'lecturer-label',
      kind: 'text',
      text: 'Dosen Pengampu:',
      bold: false,
      uppercase: false,
      size: 'body',
      spaceBefore: 1.15
    });
    push({
      key: 'lecturer',
      kind: 'text',
      text: lecturer,
      bold: false,
      uppercase: false,
      size: 'body',
      spaceBefore: 0.22
    });
  }

  if (variant === 'klasik') {
    pushLogo(3.75);
  }

  const members = cover.members;

  if (members.length > 0 || placeholders) {
    push({
      key: 'author-prefix',
      kind: 'text',
      text: cover.authorPrefix.trim() || 'Disusun oleh:',
      bold: false,
      uppercase: false,
      size: 'body',
      spaceBefore: 2.05
    });

    const rows: Array<{ key: string; name: string; nim: string }> = members.map(
      (member, index) => ({
        key: `member-${member.id || index}`,
        name: member.name.trim() || (placeholders ? `[Nama Anggota ${index + 1}]` : ''),
        nim: member.nim.trim() || (placeholders ? COVER_PLACEHOLDERS.nim : '')
      })
    );

    if (rows.length === 0) {
      rows.push({
        key: 'member-placeholder',
        name: COVER_PLACEHOLDERS.authorName,
        nim: COVER_PLACEHOLDERS.nim
      });
    }

    rows.forEach((row) => {
      if (!row.name && !row.nim) return;

      lines.push({
        key: row.key,
        kind: 'member',
        text: row.nim ? `${row.name} (${row.nim})` : row.name,
        name: row.name,
        nim: row.nim,
        bold: false,
        uppercase: false,
        size: 'body',
        spaceBefore: 0
      });
    });
  }

  const studyProgram = fill(cover.studyProgram, COVER_PLACEHOLDERS.studyProgram);
  if (studyProgram) {
    push({
      key: 'study-program',
      kind: 'text',
      text: studyProgram,
      bold: true,
      uppercase: true,
      size: 'title',
      spaceBefore: 0.25
    });
  }

  const department = fill(cover.department, '');
  if (department) {
    push({
      key: 'department',
      kind: 'text',
      text: department,
      bold: false,
      uppercase: true,
      size: 'body',
      spaceBefore: 0.5
    });
  }

  const faculty = fill(cover.faculty, COVER_PLACEHOLDERS.faculty);
  if (faculty) {
    push({
      key: 'faculty',
      kind: 'text',
      text: faculty,
      bold: true,
      uppercase: true,
      size: 'title',
      spaceBefore: 0.5
    });
  }

  const institution = fill(cover.institution, COVER_PLACEHOLDERS.institution);
  if (institution) {
    push({
      key: 'institution',
      kind: 'text',
      text: institution,
      bold: true,
      uppercase: true,
      size: 'title',
      spaceBefore: 0.5
    });
  }

  const motto = (cover.motto ?? '').trim();
  if (motto) {
    push({
      key: 'motto',
      kind: 'text',
      text: motto,
      bold: false,
      italic: true,
      uppercase: false,
      size: 'body',
      spaceBefore: 1.15
    });
  }

  const extraFields: Array<{ key: string; label: string; value: string }> = [
    { key: 'pembimbing1', label: 'Pembimbing I:', value: cover.pembimbing1 ?? '' },
    { key: 'pembimbing2', label: 'Pembimbing II:', value: cover.pembimbing2 ?? '' },
    { key: 'penguji1', label: 'Penguji I:', value: cover.penguji1 ?? '' },
    { key: 'penguji2', label: 'Penguji II:', value: cover.penguji2 ?? '' },
    { key: 'sidang', label: 'Tanggal Sidang:', value: cover.sidangTanggal ?? '' }
  ];

  extraFields.forEach((field) => {
    const value = field.value.trim();
    if (!value) return;
    push({
      key: `${field.key}-label`,
      kind: 'text',
      text: field.label,
      bold: true,
      uppercase: false,
      size: 'body',
      spaceBefore: 1.15
    });
    push({
      key: field.key,
      kind: 'text',
      text: value,
      bold: false,
      uppercase: false,
      size: 'body',
      spaceBefore: 0.22
    });
  });

  const place = coverLocationLine(cover);
  if (place) {
    push({
      key: 'place',
      kind: 'text',
      text: place,
      bold: true,
      uppercase: false,
      size: 'title',
      spaceBefore: 0.55
    });
  }

  return lines;
}
