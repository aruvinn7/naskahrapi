import { DocumentConfig, SavedPreset } from '../types/document';
import {
  DEFAULT_COVER_LAYOUT,
  DEFAULT_HEADING_RULES,
  DEFAULT_PAGE_SETUP,
  DEFAULT_TABLE_STYLE
} from './formatEngine';
import { TEMPLATE_DESCRIPTIONS, TEMPLATE_PRESETS } from './templatePresets';

const STORAGE_KEY = 'skripsira pi-presets-v1';

let nextId = Date.now();

function makeId(): string {
  nextId += 1;
  return `preset-${nextId.toString(36)}`;
}

/** Preset bawaan dari template standar — disemai sekali saat pertama kali dibuka. */
function seedPresets(): SavedPreset[] {
  const templates: Array<keyof typeof TEMPLATE_PRESETS> = ['makalah', 'skripsi', 'jurnal'];
  return templates.map((template) => {
    const preset = TEMPLATE_PRESETS[template];
    const config: DocumentConfig = {
      template,
      margin: { ...preset.margin },
      fontFamily: 'Times New Roman',
      fontSize: { ...preset.fontSize },
      lineSpacing: preset.lineSpacing,
      firstLineIndent: preset.firstLineIndent,
      hangingIndent: 1.27,
      alignment: 'justify',
      headingRules: {
        ...DEFAULT_HEADING_RULES,
        h1: { ...DEFAULT_HEADING_RULES.h1 },
        h2: { ...DEFAULT_HEADING_RULES.h2 },
        h3: { ...DEFAULT_HEADING_RULES.h3 }
      },
      pageSetup: { ...DEFAULT_PAGE_SETUP },
      coverLayout: { ...DEFAULT_COVER_LAYOUT },
      tableStyle: { ...DEFAULT_TABLE_STYLE },
      rules: {
        margin: true,
        font: true,
        font_size: true,
        line_spacing: true,
        indent: true,
        alignment: true,
        heading_spacing: true,
        clean_markdown: true,
        clean_chatter: true,
        numbering: true,
        hanging_indent: true,
        table_format: true,
        page_numbers: true,
        header_footer: true
      }
    };

    const label =
      template === 'makalah'
        ? 'Makalah (bawaan)'
        : template === 'skripsi'
          ? 'Skripsi / Tugas Akhir (bawaan)'
          : 'Jurnal Ilmiah (bawaan)';

    return {
      id: makeId(),
      name: label,
      description: TEMPLATE_DESCRIPTIONS[template],
      config,
      createdAt: Date.now()
    };
  });
}

export function loadPresets(): SavedPreset[] {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return seedPresets();
    const parsed = JSON.parse(stored) as SavedPreset[];
    if (!Array.isArray(parsed)) return seedPresets();
    return parsed;
  } catch {
    return seedPresets();
  }
}

function persist(presets: SavedPreset[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch {
    // Kuota penuh: preset tidak tersimpan, aplikasi tetap berjalan.
  }
}

export function savePreset(presets: SavedPreset[], name: string, config: DocumentConfig): SavedPreset[] {
  const trimmed = name.trim();
  const existing = presets.find((p) => p.name.toLowerCase() === trimmed.toLowerCase());
  const preset: SavedPreset = {
    id: existing?.id ?? makeId(),
    name: trimmed || 'Preset tanpa nama',
    description: existing?.description ?? '',
    config: JSON.parse(JSON.stringify(config)) as DocumentConfig,
    createdAt: existing?.createdAt ?? Date.now()
  };

  const next = existing
    ? presets.map((p) => (p.id === preset.id ? preset : p))
    : [...presets, preset];
  persist(next);
  return next;
}

export function deletePreset(presets: SavedPreset[], id: string): SavedPreset[] {
  const next = presets.filter((p) => p.id !== id);
  persist(next);
  return next;
}

export function exportPresetsJson(presets: SavedPreset[]): string {
  return JSON.stringify(presets, null, 2);
}

/** Menggabungkan preset hasil impor ke daftar; mengembalikan daftar baru. */
export function importPresetsJson(presets: SavedPreset[], json: string): SavedPreset[] {
  const parsed = JSON.parse(json) as SavedPreset[];
  if (!Array.isArray(parsed)) throw new Error('Format file preset tidak dikenali.');
  const valid = parsed
    .filter((p) => p && typeof p.name === 'string' && p.config && typeof p.config === 'object')
    .map((p) => ({
      ...p,
      id: makeId(),
      config: {
        ...p.config,
        headingRules: { ...DEFAULT_HEADING_RULES, ...(p.config.headingRules || {}) },
        pageSetup: { ...DEFAULT_PAGE_SETUP, ...(p.config.pageSetup || {}) },
        coverLayout: { ...DEFAULT_COVER_LAYOUT, ...(p.config.coverLayout || {}) },
        tableStyle: { ...DEFAULT_TABLE_STYLE, ...(p.config.tableStyle || {}) }
      }
    }));
  if (valid.length === 0) throw new Error('File preset tidak berisi preset yang valid.');
  const next = [...presets, ...valid];
  persist(next);
  return next;
}
