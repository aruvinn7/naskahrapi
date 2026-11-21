import {
  ParsedDocument,
  DocumentSection,
  DocumentBlock,
  BlockType,
  InspectionIssue,
  DocumentConfig
} from '../types/document';
import { extractCoverData } from './cover';
import { renumberCaptions } from './figureNumbering';

// List of conversational AI filler patterns (Indonesian and English)
const AI_INTRO_PATTERNS = [
  /^(?:tentu(?:lah)?|baik(?:lah)?|halo|hai|pasti)[,!]?\s*(?:berikut|ini|di bawah ini)?.*?(?:makalah|skripsi|draf|karya ilmiah|tugas|ringkasan|tulisan|laporan|penjelasan).*?[:\n\r]+/im,
  /^(?:berikut\s+(?:adalah|merupakan)\s+(?:draf|susunan|rancangan|isi|contoh)?\s*(?:makalah|skripsi|karya ilmiah|dokumen)).*?[:\n\r]+/im,
  /^here is (?:a|the) (?:complete|draft|sample)?\s*(?:paper|thesis|document|essay).*?[:\n\r]+/im,
  /^sure,?\s*(?:here is|below is|i have prepared).*?[:\n\r]+/im,
];

// Pola ini hanya diuji pada baris terakhir dokumen. Sebelumnya `.*$` + flag `s`
// memakan seluruh sisa teks, sehingga makalah terpotong di tengah (mis. setelah
// kalimat "semoga makalah ini dapat bermanfaat" di Kata Pengantar).
const AI_OUTRO_PATTERNS = [
  /(?:semoga\s+(?:draf|makalah|penjelasan|informasi|tulisan)\s+ini\s+(?:dapat\s+)?(?:membantu|bermanfaat))/i,
  /(?:apabila\s+(?:ada|terdapat)\s+(?:pertanyaan|bagian\s+yang\s+ingin\s+ditambahkan|revisi))/i,
  /(?:jangan\s+ragu\s+untuk\s+(?:bertanya|meminta\s+revisi))/i,
  /(?:hope\s+this\s+(?:helps|is\s+useful)|feel\s+free\s+to\s+ask)/i,
];

/** Membuang basa-basi penutup AI hanya pada baris akhir, bukan seluruh sisa teks. */
function stripTrailingChatter(text: string): { text: string; removed: boolean } {
  const lines = text.split(/\r?\n/);
  let removed = false;

  for (let pass = 0; pass < 3; pass++) {
    let last = lines.length - 1;
    while (last >= 0 && !lines[last].trim()) last--;
    if (last < 0) break;

    if (!AI_OUTRO_PATTERNS.some((pattern) => pattern.test(lines[last]))) break;

    lines.splice(last, 1);
    removed = true;
  }

  return { text: lines.join('\n').replace(/\s+$/, ''), removed };
}

export function cleanAiResiduals(text: string, cleanConversational = true, cleanMarkdown = true): { cleanedText: string; issues: InspectionIssue[] } {
  let cleaned = text;
  const issues: InspectionIssue[] = [];

  // 1. Remove AI conversational introduction
  if (cleanConversational) {
    for (const pattern of AI_INTRO_PATTERNS) {
      const match = pattern.exec(cleaned);
      // Hanya pembuka di awal dokumen; kalimat serupa di tengah isi tidak dihapus.
      if (!match || match.index > 400) continue;

      issues.push({
        id: `ai-intro-${Date.now()}`,
        type: 'warning',
        category: 'basa_basi_ai',
        title: 'Basa-Basi AI Pembuka Terdeteksi',
        description: 'Kalimat pembuka percakapan robot AI dihapus otomatis agar dokumen langsung formal.',
        autoFixAvailable: true
      });
      cleaned = (cleaned.slice(0, match.index) + cleaned.slice(match.index + match[0].length)).trim();
      break;
    }

    // 2. Remove AI conversational conclusion/footer (hanya baris akhir dokumen)
    const outro = stripTrailingChatter(cleaned);
    if (outro.removed) {
      issues.push({
        id: `ai-outro-${Date.now()}`,
        type: 'warning',
        category: 'basa_basi_ai',
        title: 'Basa-Basi AI Penutup Terdeteksi',
        description: 'Pesan penutup seperti "Semoga membantu tugas Anda" dihapus otomatis.',
        autoFixAvailable: true
      });
      cleaned = outro.text;
    }
  }

  // 3. Detect residual markdown markers
  const mdHeadingCount = (cleaned.match(/^#{1,6}\s+/gm) || []).length;
  const mdBoldCount = (cleaned.match(/\*\*[^*]+\*\*/g) || []).length;
  const mdBulletCount = (cleaned.match(/^[\*\-]\s+/gm) || []).length;

  if (mdHeadingCount > 0) {
    issues.push({
      id: 'md-headings',
      type: 'info',
      category: 'markdown_ai',
      title: `${mdHeadingCount} Tag Heading Markdown (#) Ditemukan`,
      description: 'Format `#`, `##` diubah menjadi gaya Heading Bab & Sub-bab standar Word.',
      autoFixAvailable: true
    });
  }

  if (mdBoldCount > 0) {
    issues.push({
      id: 'md-bold',
      type: 'info',
      category: 'markdown_ai',
      title: `${mdBoldCount} Teks Bintang Tebal (**) Ditemukan`,
      description: 'Sintaks `**teks**` dikonversi menjadi format cetak tebal (Bold) asli.',
      autoFixAvailable: true
    });
  }

  if (mdBulletCount > 0) {
    issues.push({
      id: 'md-bullet',
      type: 'info',
      category: 'markdown_ai',
      title: `${mdBulletCount} Bullet Point Strip AI (-) Ditemukan`,
      description: 'Bullet poin strip dikonversi ke sistem penomoran angka atau abjad bertingkat.',
      autoFixAvailable: true
    });
  }

  return { cleanedText: cleaned, issues };
}

// Ambil batas kolom (start & end tiap run dash) dari baris separator.
function getSeparatorRuns(line: string): Array<[number, number]> {
  const runs: Array<[number, number]> = [];
  const runRe = /-+/g;
  let match: RegExpExecArray | null;
  while ((match = runRe.exec(line)) !== null) {
    runs.push([match.index, match.index + match[0].length]);
  }
  return runs;
}

// Separator simple-table Pandoc: baris murni dash+spasi dengan minimal dua
// run dash yang terpisah spasi. Baris border satu run (`-----`) tidak termasuk.
function isSimpleTableSeparator(line: string): boolean {
  return /^\s*-{2,}(\s+-{2,})+\s*$/.test(line);
}

/**
 * Mengonversi simple-table Pandoc (kolom ditentukan run separator dash) menjadi
 * baris pipe markdown agar jalur deteksi tabel yang ada bisa memprosesnya.
 * Header = baris di atas separator sampai baris kosong/border/separator;
 * body = baris di bawahnya sampai baris kosong/border/EOF. Baris fisik yang
 * ter-wrap digabung per kolom dengan spasi; baris logis baru dimulai saat
 * kolom-0 terisi. Region tanpa header/body valid dibiarkan apa adanya.
 */
export function convertSimpleTables(text: string): string {
  const lines = text.split(/\r?\n/);
  const out: string[] = [];

  const isBlank = (l: string) => !l.trim();
  const isBorder = (l: string) => /^-{3,}\s*$/.test(l.trim());

  const toPipeRow = (cells: string[]) => `| ${cells.join(' | ')} |`;

  // Gabung baris fisik body yang ter-wrap: baris logis baru dimulai saat
  // kolom-0 terisi; sel kosong dilewati, sel terisi disambung dengan spasi.
  const mergeWrappedBody = (physical: string[], runs: Array<[number, number]>): string[][] => {
    const logical: string[][] = [];
    for (const l of physical) {
      const cells = runs.map(([start, end]) => l.slice(start, end).trim());
      if (!cells.some((c) => c)) continue;
      const prev = logical[logical.length - 1];
      if (!cells[0] && prev) {
        cells.forEach((cell, idx) => {
          if (cell) prev[idx] = prev[idx] ? `${prev[idx]} ${cell}` : cell;
        });
        continue;
      }
      logical.push(cells);
    }
    return logical;
  };

  // Header multi-baris Pandoc: sel tiap kolom adalah gabungan sel non-kosong
  // di seluruh baris fisik header (kolom bisa membungkus beberapa baris).
  const joinHeaderColumns = (physical: string[], runs: Array<[number, number]>): string[] =>
    runs.map(([start, end]) =>
      physical
        .map((l) => l.slice(start, end).trim())
        .filter(Boolean)
        .join(' ')
    );

  for (let i = 0; i < lines.length; ) {
    if (!isSimpleTableSeparator(lines[i])) {
      out.push(lines[i]);
      i++;
      continue;
    }

    const runs = getSeparatorRuns(lines[i]);

    // Header: mundur dari atas separator sampai baris kosong/border/separator.
    let headerStart = i;
    let j = i - 1;
    while (j >= 0 && !isBlank(lines[j]) && !isBorder(lines[j]) && !isSimpleTableSeparator(lines[j])) {
      headerStart = j;
      j--;
    }
    const headerLines = lines.slice(headerStart, i);

    // Body: maju dari bawah separator sampai baris kosong/border/EOF.
    let k = i + 1;
    while (k < lines.length && !isBlank(lines[k]) && !isBorder(lines[k])) {
      k++;
    }
    const bodyLines = lines.slice(i + 1, k);
    const bodyEnd = k;

    const bodyRows = mergeWrappedBody(bodyLines, runs);

    // Fallback: header kosong (separator tepat setelah blank/border) atau
    // tidak ada baris body valid — biarkan teks apa adanya, tanpa crash.
    if (headerLines.length === 0 || bodyRows.length === 0) {
      for (let l = headerStart; l < bodyEnd; l++) out.push(lines[l]);
      i = bodyEnd;
      continue;
    }

    // Baris header sudah ter-push ke `out` pada iterasi sebelumnya (loop
    // maju membacanya lebih dulu daripada separator) — buang kembali agar
    // region benar-benar diganti baris pipe, tanpa paragraf header liar.
    out.splice(out.length - (i - headerStart));

    const header = joinHeaderColumns(headerLines, runs);
    const separator = toPipeRow(runs.map(() => '---'));

    out.push(
      toPipeRow(header),
      separator,
      ...bodyRows.map(toPipeRow)
    );
    i = bodyEnd;
  }

  return out.join('\n');
}

/**
 * Menormalkan artefak hasil render Pandoc (unduhan "download md" ChatGPT):
 * escape markdown yang bocor (`US\$5`, `\*teks\*`), backtick kode, en-dash
 * rentang (`2016--2026`), dan backslash lanjutan-baris (hard break) di akhir
 * baris. Penanda **tebal** dan *miring* TIDAK disentuh; baris dash utuh (`---`)
 * dibiarkan agar horizontal rule tetap utuh.
 */
export function normalizePandocArtifacts(text: string): string {
  // Simple-table Pandoc dikonversi ke pipe lebih dahulu, sebelum escape
  // dibersihkan, agar run separator penentu batas kolom tetap utuh.
  const withPipes = convertSimpleTables(text);
  return withPipes
    .split(/\r?\n/)
    .map((line) => {
      // 1. Buang backslash tunggal di akhir baris (hard break Pandoc).
      //    Lookbehind memastikan `\\` (backslash escape) ikut lewat dulu
      //    ke tahap unescape, bukan terpotong setengah.
      let normalized = line.replace(/(?<!\\)\\$/, '');

      // 2. Unescape pasangan `\\`, `\$`, `\*`, `\_`, `\#`, `\[`, `\]`.
      //    Hasilnya bisa memunculkan penanda `*` yang memang disengaja
      //    (mis. `\*bukan miring\*`), jadi jangan pernah dibuang lagi.
      normalized = normalized.replace(/\\([\\$*_#\[\]])/g, '$1');

      // 3. Buang backtick pembungkus kode inline (berpasangan).
      normalized = normalized.replace(/`([^`]+)`/g, '$1');

      // 4. En-dash untuk rentang (`2016--2026`), kecuali di URL (setelah
      //    `:` atau `/`) dan kecuali baris dash/`=`/`_` utuh (HR/section
      //    breaker) agar tidak ikut berubah.
      if (!/^[-=_]{3,}$/.test(normalized.trim())) {
        normalized = normalized.replace(/(?<![:\/])([A-Za-z0-9])--([A-Za-z0-9])/g, '$1–$2');
      }

      return normalized;
    })
    .join('\n');
}

/**
 * Memecah aliran teks DAFTAR PUSTAKA yang menempel menjadi beberapa entri.
 * Batas entri: akhir kalimat (". ") yang langsung diikuti pola penulis APA
 * diakhiri "(Tahun)." — mis. "...145-162. Li, P., & Ren, S. (2023). Making…"
 * dipotong sebelum "Li". Token pertama harus menyerupai nama keluarga/organisasi
 * (kata kapital+huruf kecil, atau akronim kapital semua seperti "UNESCO"),
 * bukan inisial tunggal, agar daftar penulis ("…M. A., & Ren, S. (2023)") tidak
 * terpotong di tengah. Segmen penulis dibatasi 150 karakter dan tidak boleh
 * memuat ":" atau "(" agar teks seperti "arXiv:2304.03271. Mytton, D. (2021)"
 * tidak salah dipotong di tengah satu entri.
 */
export function splitBibliographyEntries(text: string): string[] {
  const boundary =
    /(?<=[.!?])\s+(?=(?:[A-ZÀ-Ý]{2,}|[A-ZÀ-Ý][a-zà-ÿ]{1,})[^():]{0,150}?\(\s*(?:19|20)\d{2}[a-z]?\s*\)\.)/g;
  return text
    .split(boundary)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function parseRawDocument(rawText: string, config: DocumentConfig): ParsedDocument {
  const { cleanedText, issues } = cleanAiResiduals(rawText, config.rules['clean_chatter'], config.rules['clean_markdown']);

  // Normalisasi artefak Pandoc setelah pembersihan residu AI, sebelum
  // teks dipecah menjadi baris. Teks ternormalisasi juga dipakai untuk
  // ekstraksi judul & cover agar backslash hard-break tidak bocor ke sana.
  const normalizedText = normalizePandocArtifacts(cleanedText);
  const lines = normalizedText.split(/\r?\n/);
  const sections: DocumentSection[] = [];
  let currentSection: DocumentSection = {
    id: 'sec-cover',
    title: 'MAKALAH',
    type: 'cover',
    blockCount: 0,
    startPageEstimate: 1,
    blocks: []
  };

  let pageCounter = 1;
  let wordCounter = 0;
  let blockCounter = 0;

  // Id blok list/pustaka terakhir yang di-push, untuk menggabungkan baris
  // lanjutan (hard-wrap Pandoc) ke blok yang sama agar satu item tidak pecah.
  let lastListBlockId: string | null = null;

  // Helper to commit a section
  const commitSection = (newTitle: string, newType: string) => {
    if (currentSection.blocks.length > 0) {
      currentSection.blockCount = currentSection.blocks.length;
      sections.push({ ...currentSection });
    }
    pageCounter += Math.max(1, Math.ceil(currentSection.blocks.length / 5));
    currentSection = {
      id: `sec-${Date.now()}-${sections.length}`,
      title: newTitle,
      type: newType,
      blockCount: 0,
      startPageEstimate: pageCounter,
      blocks: []
    };
    lastListBlockId = null;
  };

  let bufferParagraph = '';

  // Penutup surat di KATA PENGANTAR: "Jakarta, 19 November 2026" lalu nama
  // penulis di baris bawahnya. Dikenali agar tidak digabung jadi satu paragraf
  // rata kiri (format baku: dua baris, rata kanan).
  const parseSignature = (
    text: string
  ): { dateLine: string; place: string; date: string; signer: string } | null => {
    const match = text.match(
      /^([A-ZÀ-Ý][A-Za-zÀ-ÿ.'\-\s]{1,40}?)\s*,\s*((?:(?:\d{1,2})\s+)?[A-Za-zÀ-ÿ]+\s+(?:19|20)\d{2})(?:\s+(.+))?$/
    );
    if (!match) return null;
    const place = match[1].trim();
    const date = match[2].trim();
    return {
      place,
      date,
      dateLine: `${place}, ${date}`,
      signer: (match[3] ?? '').trim()
    };
  };

  const isLikelySigner = (text: string): boolean =>
    text.length > 0 &&
    text.length <= 60 &&
    !/^(BAB|DAFTAR|KATA\s+PENGANTAR|ABSTRAK|ABSTRACT)\b/i.test(text) &&
    !/^[-=_]{3,}$/.test(text) &&
    !/[.!?]$/.test(text);

  const flushParagraph = () => {
    if (!bufferParagraph.trim()) return;

    // Entri DAFTAR PUSTAKA: aliran teks yang menempel (tanpa baris kosong /
    // penanda list dari output AI) dipisah per sumber terlebih dahulu.
    if (currentSection.type === 'daftar_pustaka') {
      for (const entry of splitBibliographyEntries(bufferParagraph.trim())) {
        wordCounter += entry.split(/\s+/).length;
        blockCounter++;
        const pustakaBlock: DocumentBlock = {
          id: `blk-${blockCounter}`,
          type: 'daftar_pustaka_item',
          rawContent: entry,
          formattedContent: formatInlineMarkdown(entry),
          pageEstimate: pageCounter
        };
        currentSection.blocks.push(pustakaBlock);
        lastListBlockId = pustakaBlock.id;
      }
      bufferParagraph = '';
      return;
    }

    const words = bufferParagraph.trim().split(/\s+/).length;
    wordCounter += words;
    blockCounter++;

    const flushed: DocumentBlock = {
      id: `blk-${blockCounter}`,
      type: 'paragraph',
      rawContent: bufferParagraph.trim(),
      formattedContent: formatInlineMarkdown(bufferParagraph.trim()),
      pageEstimate: pageCounter
    };
    currentSection.blocks.push(flushed);
    bufferParagraph = '';
  };

  const addWords = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    wordCounter += trimmed.split(/\s+/).length;
  };

  const LIST_SECTION_TYPES = new Set(['daftar_isi', 'daftar_tabel', 'daftar_gambar']);

  const specialSections: Array<{
    pattern: RegExp;
    title: string;
    type: string;
    blockType: BlockType;
  }> = [
    { pattern: /^KATA\s+PENGANTAR$/, title: 'KATA PENGANTAR', type: 'kata_pengantar', blockType: 'kata_pengantar' },
    { pattern: /^DAFTAR\s+ISI$/, title: 'DAFTAR ISI', type: 'daftar_isi', blockType: 'daftar_isi' },
    { pattern: /^DAFTAR\s+PUSTAKA$/, title: 'DAFTAR PUSTAKA', type: 'daftar_pustaka', blockType: 'heading_1' },
    { pattern: /^DAFTAR\s+TABEL$/, title: 'DAFTAR TABEL', type: 'daftar_tabel', blockType: 'daftar_tabel' },
    { pattern: /^DAFTAR\s+GAMBAR$/, title: 'DAFTAR GAMBAR', type: 'daftar_gambar', blockType: 'daftar_gambar' },
    { pattern: /^DAFTAR\s+LAMPIRAN$/, title: 'DAFTAR LAMPIRAN', type: 'daftar_lampiran', blockType: 'daftar_lampiran' },
    { pattern: /^ABSTRAK$/, title: 'ABSTRAK', type: 'abstrak', blockType: 'abstrak' },
    { pattern: /^ABSTRACT$/, title: 'ABSTRACT', type: 'abstrak', blockType: 'abstrak' }
  ];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      lastListBlockId = null;
      continue;
    }

    // Check for Section Breakers (--- or ===)
    if (/^[-=_]{3,}$/.test(line)) {
      flushParagraph();
      lastListBlockId = null;
      continue;
    }

    // Buang penanda heading Markdown hanya untuk keperluan deteksi.
    // Lebar indentasi sumber dipakai untuk menentukan tingkat penomoran.
    const expandedRaw = rawLine.replace(/\t/g, '    ');
    const sourceIndent = expandedRaw.length - expandedRaw.replace(/^\s+/, '').length;
    const withoutHash = line.replace(/^#{1,6}\s*/, '').trim();
    const plainLine = withoutHash.replace(/\*\*/g, '').trim();
    const upper = plainLine.toUpperCase();

    // Section besar: KATA PENGANTAR, DAFTAR ISI, DAFTAR PUSTAKA, ABSTRAK, dll.
    const special = specialSections.find((item) => item.pattern.test(upper));
    if (special) {
      flushParagraph();
      commitSection(special.title, special.type);
      blockCounter++;
      addWords(special.title);
      currentSection.blocks.push({
        id: `blk-${blockCounter}`,
        type: special.blockType,
        title: special.title,
        rawContent: line,
        formattedContent: special.title
      });
      lastListBlockId = null;
      continue;
    }

    // Match BAB I, BAB II, BAB III, BAB IV, BAB V etc.
    const babMatch = upper.match(/^(BAB\s+[IVXLCDM]+(?:\s*[:\-–]?\s*[A-Z\s]+)?)/);
    if (babMatch) {
      flushParagraph();
      // "BAB I: PENDAHULUAN" -> "BAB I PENDAHULUAN" (format baku).
      const babTitle = babMatch[1]
        .trim()
        .replace(/^(BAB\s+[IVXLCDM]+)\s*[:\-–]\s*/, '$1 ');
      commitSection(babTitle, 'bab');
      blockCounter++;
      addWords(babTitle);
      currentSection.blocks.push({
        id: `blk-${blockCounter}`,
        type: 'heading_1',
        title: babTitle,
        rawContent: line,
        formattedContent: babTitle
      });
      lastListBlockId = null;
      continue;
    }

    // Penutup KATA PENGANTAR: "Jakarta, 19 November 2026" lalu nama penulis.
    // Dibuat blok sendiri agar tampil dua baris rata kanan, bukan satu paragraf.
    if (currentSection.type === 'kata_pengantar') {
      const signature = parseSignature(plainLine);
      if (signature) {
        flushParagraph();
        let signer = signature.signer;
        if (!signer) {
          const nextLine = (lines[i + 1] ?? '').trim();
          if (isLikelySigner(nextLine)) {
            signer = nextLine;
            i++;
          }
        }
        blockCounter++;
        addWords(signature.dateLine);
        if (signer) addWords(signer);
        currentSection.blocks.push({
          id: `blk-${blockCounter}`,
          type: 'signature',
          rawContent: [signature.dateLine, signer].filter(Boolean).join('\n'),
          formattedContent: [signature.dateLine, signer].filter(Boolean).join('\n'),
          meta: { place: signature.place, date: signature.date, signer }
        });
        lastListBlockId = null;
        continue;
      }
    }

    // Isi DAFTAR ISI / DAFTAR TABEL / DAFTAR GAMBAR dibangkitkan ulang dari
    // struktur dokumen, jadi baris daftarnya tidak disimpan sebagai blok.
    if (LIST_SECTION_TYPES.has(currentSection.type)) {
      continue;
    }

    // Match Sub-bab (e.g. 1.1 Latar Belakang, 1.2 Rumusan Masalah, A. Latar Belakang)
    const subMatch = plainLine.match(/^(\d+\.\d+(?:\.\d+)?|[A-Z]\.)\s+(.+)$/);
    if (subMatch) {
      flushParagraph();
      const levelNum = subMatch[1].split('.').length;
      const headingText = `${subMatch[1]} ${subMatch[2]}`;
      blockCounter++;
      addWords(headingText);
      currentSection.blocks.push({
        id: `blk-${blockCounter}`,
        type: levelNum > 2 ? 'heading_3' : 'heading_2',
        title: headingText,
        rawContent: line,
        formattedContent: headingText,
        level: levelNum
      });
      lastListBlockId = null;
      continue;
    }

    // Tabel pipa: baris berisi "|" (header + isi) menjadi satu blok tabel.
    if (line.includes('|')) {
      const rows: string[][] = [];
      let cursor = i;

      while (cursor < lines.length) {
        const candidate = lines[cursor].trim();
        if (!candidate || !candidate.includes('|')) break;
        rows.push(candidate.split('|').map((cell) => cell.trim()));
        cursor++;
      }

      // Buang baris pemisah markdown (|---|---|) bila ada.
      const dataRows = rows
        .map((row) => row.filter((cell, index, all) => !(index === 0 || index === all.length - 1) || cell !== ''))
        .filter((row) => !row.every((cell) => /^:?-{2,}:?$/.test(cell)));

      if (dataRows.length >= 2) {
        flushParagraph();
        blockCounter += 1;
        const [header, ...body] = dataRows;
        addWords(dataRows.flat().join(' '));
        currentSection.blocks.push({
          id: `blk-${blockCounter}`,
          type: 'table',
          rawContent: dataRows.map((row) => row.join(' | ')).join('\n'),
          formattedContent: header.join(' | '),
          meta: { header, rows: body }
        });
        lastListBlockId = null;
        i = cursor - 1;
        continue;
      }
    }

    // Check list item (1. item, a. item, - item). Penanda diperketat: angka
    // bebas dengan . atau ), huruf kecil tunggal saja, serta strip/bintang/
    // bullet — mencegah kalimat seperti "Analytica. Komisi..." terpecah.
    const listMatch = withoutHash.match(/^(\d+[.)]|[a-z][.)]|[-*•])\s+([\s\S]+)$/);
    if (listMatch) {
      flushParagraph();
      blockCounter++;
      const itemText = formatInlineMarkdown(listMatch[2]);
      addWords(itemText);

      // Di dalam Daftar Pustaka, bullet hanyalah penanda entri: simpan teksnya saja.
      if (currentSection.type === 'daftar_pustaka') {
        const pustakaBlock: DocumentBlock = {
          id: `blk-${blockCounter}`,
          type: 'daftar_pustaka_item',
          rawContent: line,
          formattedContent: itemText
        };
        currentSection.blocks.push(pustakaBlock);
        lastListBlockId = pustakaBlock.id;
        continue;
      }

      // Penanda sumber (-, *, •, "1.", "a.") dibuang; nomor dibuat ulang saat
      // render dari tingkat indentasi baris aslinya.
      const listBlock: DocumentBlock = {
        id: `blk-${blockCounter}`,
        type: 'list_item',
        rawContent: rawLine,
        formattedContent: itemText,
        meta: {
          indent: sourceIndent,
          text: itemText
        }
      };
      currentSection.blocks.push(listBlock);
      lastListBlockId = listBlock.id;
      continue;
    }

    // Heading Markdown bebas (mis. "## Judul Bagian") tanpa nomor sub-bab.
    const mdHeading = line.match(/^(#{1,6})\s+(.+)$/);
    if (mdHeading) {
      flushParagraph();
      const level = Math.min(3, mdHeading[1].length);
      const headingText = formatInlineMarkdown(mdHeading[2].replace(/\*\*/g, '').trim());
      if (!headingText) continue;
      // Heading level-1 di luar cover membuka section sendiri (mis. "# CATATAN
      // PENYUSUNAN" setelah DAFTAR PUSTAKA) agar isinya tidak menempel ke
      // section sebelumnya. Baris pertama cover tetap tinggal di cover.
      if (level === 1 && currentSection.type !== 'cover') {
        commitSection(headingText, 'bab');
      }
      blockCounter++;
      addWords(headingText);
      currentSection.blocks.push({
        id: `blk-${blockCounter}`,
        type: level === 1 ? 'heading_1' : level === 2 ? 'heading_2' : 'heading_3',
        title: headingText,
        rawContent: line,
        formattedContent: headingText,
        level
      });
      lastListBlockId = null;
      continue;
    }

    // Caption tabel/gambar: "Tabel 2.1: Judul" atau "Gambar 4.1: Judul".
    const captionMatch = plainLine.match(/^(Tabel|Gambar)\s+(\d+(?:\.\d+)?)\s*[:.]\s*(.+)$/i);
    if (captionMatch) {
      flushParagraph();
      blockCounter += 1;
      const label = `${captionMatch[1]} ${captionMatch[2]}`;
      const description = captionMatch[3].trim();
      const captionText = `${label}: ${description}`;

      addWords(captionText);
      currentSection.blocks.push({
        id: `blk-${blockCounter}`,
        type: captionMatch[1].toLowerCase() === 'tabel' ? 'table_caption' : 'figure_caption',
        rawContent: line,
        formattedContent: captionText,
        meta: { label, description }
      });
      lastListBlockId = null;
      continue;
    }

    // Lanjutan baris list/pustaka yang di-hard-wrap Pandoc (indent >= 2 spasi,
    // buffer paragraf kosong, dan blok sebelumnya adalah list/pustaka) digabung
    // ke blok yang sama agar satu item tidak pecah jadi paragraf tersendiri.
    if (
      sourceIndent >= 2 &&
      !bufferParagraph &&
      lastListBlockId &&
      currentSection.blocks.length > 0
    ) {
      const lastBlock = currentSection.blocks[currentSection.blocks.length - 1];
      if (
        lastBlock.id === lastListBlockId &&
        (lastBlock.type === 'list_item' || lastBlock.type === 'daftar_pustaka_item')
      ) {
        lastBlock.formattedContent = `${lastBlock.formattedContent} ${withoutHash}`.trim();
        lastBlock.rawContent = `${lastBlock.rawContent}\n${withoutHash}`;
        const blockMeta = lastBlock.meta;
        if (blockMeta) {
          blockMeta.text = `${blockMeta.text} ${withoutHash}`.trim();
        }
        addWords(withoutHash);
        continue;
      }
    }

    // Regular paragraph continuation
    if (bufferParagraph) {
      bufferParagraph += ' ' + withoutHash;
    } else {
      bufferParagraph = withoutHash;
    }
  }

  flushParagraph();
  if (currentSection.blocks.length > 0) {
    currentSection.blockCount = currentSection.blocks.length;
    sections.push({ ...currentSection });
  }

  // Daftar Tabel & Daftar Gambar otomatis dari caption yang ada.
  const tableEntries: Array<{ blockId: string; sectionId: string; text: string }> = [];
  const figureEntries: Array<{ blockId: string; sectionId: string; text: string }> = [];

  sections.forEach((section) => {
    section.blocks.forEach((block, index) => {
      if (block.type === 'table') {
        const caption = section.blocks[index - 1];
        if (caption?.type === 'table_caption') {
          tableEntries.push({
            blockId: caption.id,
            sectionId: section.id,
            text: caption.formattedContent
          });
        }
      }

      if (block.type === 'figure_caption') {
        figureEntries.push({
          blockId: block.id,
          sectionId: section.id,
          text: block.formattedContent
        });
      }
    });
  });

  const applyCaptionList = (type: string, title: string, itemType: BlockType, entries: typeof tableEntries) => {
    if (entries.length === 0) return;

    const blocks: DocumentBlock[] = entries.map((entry, index) => ({
      id: `blk-${type}-${index}`,
      type: itemType,
      rawContent: entry.text,
      formattedContent: entry.text,
      meta: { captionBlockId: entry.blockId, sectionId: entry.sectionId }
    }));

    const existing = sections.find((section) => section.type === type);
    if (existing) {
      existing.blocks = blocks;
      existing.blockCount = blocks.length;
      return;
    }

    const section: DocumentSection = {
      id: `sec-${type}`,
      title,
      type,
      blockCount: blocks.length,
      startPageEstimate: 1,
      blocks
    };

    // Urutan baku: DAFTAR ISI, DAFTAR TABEL, DAFTAR GAMBAR, lalu isi.
    const listTypes = new Set(['daftar_isi', 'daftar_tabel', 'daftar_gambar']);
    let insertAt = sections.findIndex((item) => item.type === 'cover') + 1;

    sections.forEach((item, index) => {
      if (listTypes.has(item.type)) insertAt = index + 1;
    });

    sections.splice(insertAt, 0, section);
  };

  applyCaptionList('daftar_tabel', 'DAFTAR TABEL', 'daftar_tabel_item', tableEntries);
  applyCaptionList('daftar_gambar', 'DAFTAR GAMBAR', 'daftar_gambar_item', figureEntries);

  // Daftar Isi otomatis: jika dokumen punya BAB/bagian besar tapi tidak
  // mencantumkan DAFTAR ISI, section dibuatkan agar pratinjau & Word tetap
  // menampilkan daftar isi (entri dibangkitkan dari struktur heading).
  const hasDaftarIsi = sections.some((section) => section.type === 'daftar_isi');
  const firstBabIndex = sections.findIndex((section) => section.type === 'bab');

  if (!hasDaftarIsi && firstBabIndex >= 0) {
    const daftarIsiSection: DocumentSection = {
      id: 'sec-daftar-isi',
      title: 'DAFTAR ISI',
      type: 'daftar_isi',
      blockCount: 0,
      startPageEstimate: 1,
      blocks: []
    };
    sections.splice(firstBabIndex, 0, daftarIsiSection);
    issues.push({
      id: 'auto-daftar-isi',
      type: 'info',
      category: 'struktur',
      title: 'Daftar Isi dibuat otomatis',
      description:
        'Dokumen belum punya DAFTAR ISI, jadi dibuatkan otomatis dari Bab & Sub-bab yang terdeteksi.',
      autoFixAvailable: false
    });
  } else if (!hasDaftarIsi) {
    issues.push({
      id: 'missing-daftar-isi',
      type: 'info',
      category: 'struktur',
      title: 'Daftar Isi Belum Ada',
      description:
        'Belum ada Bab yang terdeteksi, jadi Daftar Isi belum bisa dibuat otomatis.',
      autoFixAvailable: false
    });
  }

  // Urutan baku bagian awal dokumen (cover → abstrak → kata pengantar →
  // daftar isi → daftar tabel → daftar gambar) dinormalkan setelah semua
  // injeksi, karena injeksi berjalan di posisi berbeda-beda. Bagian lain
  // (BAB, daftar pustaka, lampiran, section tak dikenal) memakai rank di
  // bawahnya sehingga urutan tempelan user tetap dipertahankan.
  const FRONT_MATTER_RANK: Record<string, number> = {
    cover: 0,
    abstrak: 1,
    kata_pengantar: 2,
    daftar_isi: 3,
    daftar_tabel: 4,
    daftar_gambar: 5
  };
  const orderedSections = sections
    .map((section, index) => ({
      section,
      key: [FRONT_MATTER_RANK[section.type] ?? 6, index] as [number, number]
    }))
    .sort((a, b) => a.key[0] - b.key[0] || a.key[1] - b.key[1])
    .map((entry) => entry.section);
  sections.splice(0, sections.length, ...orderedSections);

  // Normalisasi penomoran caption gambar/tabel per BAB + regenerasi
  // DAFTAR GAMBAR / DAFTAR TABEL dari caption yang ada.
  renumberCaptions({ sections } as ParsedDocument);

  // Total estimated pages
  const totalWords = wordCounter;
  const estimatedPages = Math.max(sections.length, Math.ceil(totalWords / 250));

  const title = extractDocumentTitle(sections, normalizedText);
  const cover = extractCoverData(sections, title, normalizedText);

  return {
    title,
    fileName: 'MAKALAH.docx',
    rawText,
    sections,
    totalBlocks: blockCounter,
    totalWords,
    estimatedPages,
    issues,
    cover
  };
}

export function formatInlineMarkdown(text: string): string {
  // Pertahankan penanda **tebal** dan *miring* agar bisa dirender kaya
  // di pratinjau maupun diekspor sebagai run Word. Hanya backtick yang dibuang.
  return text.replace(/`([^`]+)`/g, '$1').trim();
}

function extractDocumentTitle(sections: DocumentSection[], text: string): string {
  // 1. Look for markdown header or subtitle right after MAKALAH
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    const l = lines[i];
    // Check if line is a title candidate (e.g., starts with ## or is in uppercase and not "MAKALAH" or "BAB")
    const cleanL = l.replace(/^#+\s*/, '').replace(/\*\*/g, '').trim();
    if (
      cleanL.length > 10 &&
      !/^MAKALAH$/i.test(cleanL) &&
      !/^BAB\s+/i.test(cleanL) &&
      !/^KATA\s+PENGANTAR/i.test(cleanL) &&
      !/^DAFTAR\s+ISI/i.test(cleanL) &&
      !/^DAFTAR\s+(TABEL|GAMBAR|LAMPIRAN)/i.test(cleanL) &&
      !/^ABSTRAK/i.test(cleanL) &&
      !/^ABSTRACT/i.test(cleanL) &&
      !/^DISUSUN\s+UNTUK/i.test(cleanL) &&
      !/^KELOMPOK/i.test(cleanL) &&
      !/^PROGRAM\s+STUDI/i.test(cleanL) &&
      !/^UNIVERSITAS/i.test(cleanL)
    ) {
      return cleanL;
    }
  }

  // 2. Look in cover section blocks
  const coverSec = sections.find(s => s.type === 'cover');
  if (coverSec) {
    for (const b of coverSec.blocks) {
      const c = b.formattedContent.replace(/^MAKALAH\s*:?/i, '').trim();
      if (c.length > 10 && !/^BAB\s+/i.test(c)) {
        return c;
      }
    }
  }

  return 'ANALISIS DAMPAK PENGGUNAAN KECERDASAN BUATAN TERHADAP KONSUMSI AIR';
}
