import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Sliders,
  CheckCircle,
  Sparkles,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Bold,
  Italic,
  Check,
  SortAsc,
  LayoutTemplate,
  Save,
  Trash2,
  Download,
  Upload,
  FileSearch,
  BookA,
  Languages,
  ListChecks
} from 'lucide-react';
import {
  CoverData,
  CoverLayoutVariant,
  DocumentConfig,
  DocumentTemplate,
  FormattingRule,
  HeadingStyle,
  InspectionIssue,
  PageSetup,
  ParsedDocument,
  SavedPreset
} from '../types/document';
import { createBlankCover } from '../utils/cover';
import { CoverEditor } from './CoverEditor';
import { detectKbbiIssues } from '../utils/kbbiCorrector';
import { detectForeignCandidates, detectForeignTermIssues, collectDetectionText } from '../utils/foreignTermCorrector';
import { analyzeCitations, CitationStyle } from '../utils/citationHelper';
import { applyTemplatePreset, TEMPLATE_DESCRIPTIONS } from '../utils/templatePresets';
import {
  deletePreset,
  exportPresetsJson,
  importPresetsJson,
  loadPresets,
  savePreset
} from '../utils/presetStore';
import { DetectedDocumentType, diagnoseDocument } from '../utils/formatDiagnosis';
import { FormatDiagnosisPanel } from './FormatDiagnosisPanel';
import kbbiWordsUrl from '../assets/kbbi-words.txt?url';

interface RightSidebarProps {
  doc: ParsedDocument;
  config: DocumentConfig;
  onChangeConfig: (newConfig: DocumentConfig) => void;
  issues: InspectionIssue[];
  onApplyFormatting: () => void;
  onRecheck: () => void;
  onFixAllKbbi: () => void;
  onItalicizeTerm: (term: string) => void;
  onItalicizeCuratedAll: () => void;
  onSortBibliography: () => void;
  onChangeCover: (patch: Partial<CoverData>) => void;
  onSmartFix: (template: DetectedDocumentType) => void;
}

const TEMPLATE_OPTIONS: Array<{ value: DocumentTemplate; label: string }> = [
  { value: 'makalah', label: 'Makalah' },
  { value: 'skripsi', label: 'Skripsi / Tugas Akhir' },
  { value: 'jurnal', label: 'Jurnal Ilmiah' },
  { value: 'kustom', label: 'Kustom Sendiri' }
];

const selectClass =
  'form-select w-full appearance-none bg-white border border-slate-300 rounded-lg pl-2.5 pr-7 py-2 text-xs font-medium text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 cursor-pointer truncate';

const labelClass = 'text-xs font-semibold text-slate-700';

const FONT_OPTIONS: Array<{ value: DocumentConfig['fontFamily']; label: string }> = [
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Calibri', label: 'Calibri' }
];

/** Input angka ringkas untuk menyesuaikan nilai sebuah aturan. */
const RuleField: React.FC<{
  label: string;
  value: number;
  suffix: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}> = ({ label, value, suffix, min, max, step, onChange }) => (
  <label className="flex items-center justify-between space-x-2 text-[10px] text-slate-500">
    <span className="truncate">{label}</span>
    <span className="flex items-center space-x-1 shrink-0">
      <input
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => {
          const next = Number(event.target.value);
          onChange(Number.isFinite(next) ? Math.min(max, Math.max(min, next)) : min);
        }}
        className="w-14 rounded-md border border-slate-300 px-1 py-1 text-center text-[11px] focus:outline-none focus:ring-2 focus:ring-teal-500"
        aria-label={label}
      />
      <span className="w-4 text-slate-400">{suffix}</span>
    </span>
  </label>
);

/** Select ringkas untuk menyesuaikan pilihan sebuah aturan. */
const RuleSelect: React.FC<{
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}> = ({ label, value, options, onChange }) => (
  <label className="block">
    <span className="mb-1 block text-[10px] text-slate-500">{label}</span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="form-select w-full appearance-none rounded-lg border border-slate-300 bg-white pl-2.5 pr-7 py-1.5 text-[11px] font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
      aria-label={label}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
);

const TogglePill: React.FC<{
  label: string;
  icon?: React.ReactNode;
  active: boolean;
  onClick: () => void;
  title: string;
}> = ({ label, icon, active, onClick, title }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    aria-label={label}
    aria-pressed={active}
    className={`min-w-[22px] px-1.5 py-0.5 rounded-md text-[10px] font-bold border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
      active
        ? 'bg-teal-600 text-white border-teal-600'
        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700'
    }`}
  >
    {icon ?? label}
  </button>
);

const HeadingLevelCard: React.FC<{
  name: string;
  style: HeadingStyle;
  onChange: (patch: Partial<HeadingStyle>) => void;
}> = ({ name, style, onChange }) => (
  <div className="rounded-lg border border-slate-200 p-2.5 space-y-2">
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-semibold text-slate-700">{name}</span>
      <div className="flex space-x-1">
        <TogglePill
          label="Tebal"
          icon={<Bold className="w-3 h-3" aria-hidden />}
          title="Tebalkan judul"
          active={style.bold}
          onClick={() => onChange({ bold: !style.bold })}
        />
        <TogglePill
          label="Miring"
          icon={<Italic className="w-3 h-3" aria-hidden />}
          title="Miringkan judul"
          active={style.italic}
          onClick={() => onChange({ italic: !style.italic })}
        />
        <TogglePill
          label="Huruf besar semua"
          icon={<span className="text-[9px] tracking-tight">AA</span>}
          title="Semua huruf jadi HURUF BESAR"
          active={style.allCaps}
          onClick={() => onChange({ allCaps: !style.allCaps })}
        />
      </div>
    </div>
    <div className="space-y-2">
      <select
        value={style.alignment}
        onChange={(event) => onChange({ alignment: event.target.value as HeadingStyle['alignment'] })}
        className={selectClass}
        aria-label={`Perataan ${name}`}
      >
        <option value="center">Rata tengah</option>
        <option value="left">Rata kiri</option>
        <option value="justify">Rata kanan-kiri</option>
      </select>
      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center space-x-1 text-[10px] text-slate-500 shrink-0" title="Jarak kosong di atas judul, dalam poin (pt)">
          <span>Jarak atas</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={72}
            value={style.spaceBefore}
            onChange={(event) => onChange({ spaceBefore: Math.max(0, Number(event.target.value) || 0) })}
            className="w-11 rounded-md border border-slate-300 px-1 py-1 text-center text-[11px] focus:outline-none focus:ring-2 focus:ring-teal-500"
            aria-label={`Jarak kosong di atas ${name} dalam poin`}
          />
          <span className="text-slate-400">pt</span>
        </label>
        <label className="flex items-center space-x-1 text-[10px] text-slate-500 shrink-0" title="Jarak kosong di bawah judul, dalam poin (pt)">
          <span>Jarak bawah</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={72}
            value={style.spaceAfter}
            onChange={(event) => onChange({ spaceAfter: Math.max(0, Number(event.target.value) || 0) })}
            className="w-11 rounded-md border border-slate-300 px-1 py-1 text-center text-[11px] focus:outline-none focus:ring-2 focus:ring-teal-500"
            aria-label={`Jarak kosong di bawah ${name} dalam poin`}
          />
          <span className="text-slate-400">pt</span>
        </label>
      </div>
    </div>
  </div>
);

const HEADING_LEVELS: Array<{ level: 'h1' | 'h2' | 'h3'; name: string }> = [
  { level: 'h1', name: 'Judul BAB' },
  { level: 'h2', name: 'Sub-bab (1.1)' },
  { level: 'h3', name: 'Sub-bab (1.1.1)' }
];

export const RightSidebar: React.FC<RightSidebarProps> = ({
  doc,
  config,
  onChangeConfig,
  issues,
  onApplyFormatting,
  onRecheck,
  onFixAllKbbi,
  onItalicizeTerm,
  onItalicizeCuratedAll,
  onSortBibliography,
  onChangeCover,
  onSmartFix
}) => {
  const [activeTab, setActiveTab] = useState<
    'formatting' | 'cover' | 'aturan' | 'analisis'
  >('formatting');
  const [isApplying, setIsApplying] = useState(false);
  const [showAppliedToast, setShowAppliedToast] = useState(false);
  const [citationStyle, setCitationStyle] = useState<CitationStyle>('apa7');
  const [presets, setPresets] = useState<SavedPreset[]>(loadPresets);
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [newPresetName, setNewPresetName] = useState('');
  const [kbbiWords, setKbbiWords] = useState<Set<string> | null>(null);
  const [kbbiWordsFailed, setKbbiWordsFailed] = useState(false);
  const [manualTerm, setManualTerm] = useState('');
  const importFileRef = useRef<HTMLInputElement>(null);
  const diagnosis = useMemo(() => diagnoseDocument(doc, config), [doc, config]);
  const diagnosisFindings = diagnosis.checks.filter(
    (check) => check.severity === 'warning' || check.severity === 'error'
  ).length;
  // Catatan struktur sudah ditampilkan oleh panel diagnosis, jadi tidak diulang.
  const processingIssues = issues.filter(
    (issue) =>
      issue.id !== 'missing-daftar-isi' &&
      issue.id !== 'auto-daftar-isi' &&
      issue.id !== 'missing-section'
  );

  const updateConfig = (patch: Partial<DocumentConfig>) => {
    onChangeConfig({ ...config, ...patch });
  };

  const updateHeading = (level: 'h1' | 'h2' | 'h3', patch: Partial<HeadingStyle>) => {
    updateConfig({
      headingRules: {
        ...config.headingRules,
        [level]: { ...config.headingRules[level], ...patch }
      }
    });
  };

  const updatePageSetup = (patch: Partial<PageSetup>) => {
    updateConfig({ pageSetup: { ...config.pageSetup, ...patch } });
  };

  const handleApplyPreset = () => {
    const preset = presets.find((p) => p.id === selectedPresetId);
    if (!preset) return;
    onChangeConfig(preset.config);
  };

  const handleSavePreset = () => {
    if (!newPresetName.trim()) return;
    setPresets((previous) => {
      const next = savePreset(previous, newPresetName, config);
      setNewPresetName('');
      return next;
    });
  };

  const handleDeletePreset = () => {
    if (!selectedPresetId) return;
    setPresets((previous) => deletePreset(previous, selectedPresetId));
    setSelectedPresetId('');
  };

  const handleExportPresets = () => {
    const blob = new Blob([exportPresetsJson(presets)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'skripsira-preset.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      setPresets((previous) => importPresetsJson(previous, text));
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Gagal mengimpor preset.');
    } finally {
      event.target.value = '';
    }
  };

  const rulesList = [
    { key: 'margin', name: 'Margin halaman', desc: 'Atur margin tiap sisi (kiri 4 cm, atas 3 cm, kanan 3 cm, bawah 3 cm)' },
    { key: 'font', name: 'Jenis huruf', desc: 'Semua teks disamakan ke Times New Roman' },
    { key: 'font_size', name: 'Ukuran huruf', desc: 'Ukuran teks disamakan, termasuk judul bab dan sub-bab' },
    { key: 'table_format', name: 'Format tabel', desc: 'Ukuran huruf, ketebalan garis, dan perataan isi tabel disesuaikan' },
    { key: 'line_spacing', name: 'Spasi antarbaris', desc: 'Jarak antarbaris dibuat 1,5 agar nyaman dibaca' },
    { key: 'indent', name: 'Baris pertama paragraf', desc: 'Seberapa dalam baris pertama tiap paragraf menjorok ke dalam' },
    { key: 'alignment', name: 'Perataan teks', desc: 'Teks rata kiri dan kanan seperti skripsi pada umumnya' },
    { key: 'heading_spacing', name: 'Jarak judul & sub-judul', desc: 'Atur jarak kosong di atas dan di bawah judul BAB serta sub-judul' },
    { key: 'clean_markdown', name: 'Bersihkan tanda format AI', desc: 'Menghapus sisa tanda seperti **tebal**, ###, dan `kode` dari teks AI' },
    { key: 'clean_chatter', name: 'Hapus basa-basi AI', desc: 'Menghapus kalimat pembuka & penutup seperti "Tentu, ini draf..."' },
    { key: 'numbering', name: 'Seragamkan penomoran', desc: 'Penomoran diseragamkan: BAB I, 1.1, 1.2, a., 1)' },
    { key: 'hanging_indent', name: 'Format daftar pustaka', desc: 'Entri daftar pustaka menjorok 1,27 cm dan diurutkan A–Z' },
  ];

  const enabledCount = rulesList.filter(r => config.rules[r.key] !== false).length;

  // Real-time analysis for KBBI and Citations
  const kbbiIssues = detectKbbiIssues(doc.rawText);
  const totalKbbiCount = kbbiIssues.reduce((acc, curr) => acc + curr.count, 0);

  // Kamus KBBI dimuat lambat untuk kandidat istilah asing (tab Analisis).
  useEffect(() => {
    let cancelled = false;
    fetch(kbbiWordsUrl)
      .then((response) =>
        response.ok ? response.text() : Promise.reject(new Error('gagal memuat kamus'))
      )
      .then((content) => {
        if (!cancelled) setKbbiWords(new Set(content.split('\n').filter(Boolean)));
      })
      .catch(() => {
        if (!cancelled) setKbbiWordsFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Deteksi bahasa asing tidak membaca isi Daftar Pustaka (pengecualian PUEBI).
  const foreignDetectionText = useMemo(() => collectDetectionText(doc), [doc]);
  const foreignIssues = detectForeignTermIssues(foreignDetectionText);
  const totalForeignCount = foreignIssues.reduce((sum, issue) => sum + issue.count, 0);
  const foreignCandidates = kbbiWords
    ? detectForeignCandidates(foreignDetectionText, kbbiWords)
    : [];
  const foreignTotal = totalForeignCount + foreignCandidates.length;
  // Satu tab "Analisis" menampung diagnosis, aturan, KBBI, sitasi, dan audit.
  const analisisBadge = diagnosisFindings + (totalKbbiCount > 0 ? 1 : 0) + (foreignTotal > 0 ? 1 : 0);

  const citationAnalysis = analyzeCitations(doc.sections);

  const handleTemplateChange = (tpl: DocumentTemplate) => {
    onChangeConfig(applyTemplatePreset(config, tpl));
  };

  const toggleRule = (key: string) => {
    onChangeConfig({
      ...config,
      rules: {
        ...config.rules,
        [key]: config.rules[key] === false ? true : false
      }
    });
  };

  const setAllRules = (enabled: boolean) => {
    const nextRules = { ...config.rules } as Record<string, boolean>;
    rulesList.forEach((rule) => {
      nextRules[rule.key] = enabled;
    });
    onChangeConfig({ ...config, rules: nextRules as DocumentConfig['rules'] });
  };

  const updateMargin = (side: 'top' | 'bottom' | 'left' | 'right', value: number) =>
    updateConfig({ margin: { ...config.margin, [side]: value } });

  const updateFontSize = (key: 'title' | 'body' | 'table' | 'caption', value: number) =>
    updateConfig({ fontSize: { ...config.fontSize, [key]: value } });

  const updateTableStyle = (patch: Partial<DocumentConfig['tableStyle']>) =>
    updateConfig({ tableStyle: { ...config.tableStyle, ...patch } });

  const renderRuleControl = (key: string) => {
    switch (key) {
      case 'margin':
        return (
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            <RuleField label="Kiri" value={config.margin.left} suffix="cm" min={0} max={10} step={0.5} onChange={(v) => updateMargin('left', v)} />
            <RuleField label="Atas" value={config.margin.top} suffix="cm" min={0} max={10} step={0.5} onChange={(v) => updateMargin('top', v)} />
            <RuleField label="Kanan" value={config.margin.right} suffix="cm" min={0} max={10} step={0.5} onChange={(v) => updateMargin('right', v)} />
            <RuleField label="Bawah" value={config.margin.bottom} suffix="cm" min={0} max={10} step={0.5} onChange={(v) => updateMargin('bottom', v)} />
          </div>
        );
      case 'font':
        return (
          <RuleSelect
            label="Jenis huruf"
            value={config.fontFamily}
            options={FONT_OPTIONS}
            onChange={(v) => updateConfig({ fontFamily: v as DocumentConfig['fontFamily'] })}
          />
        );
      case 'font_size':
        return (
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            <RuleField label="Judul" value={config.fontSize.title} suffix="pt" min={6} max={36} step={1} onChange={(v) => updateFontSize('title', v)} />
            <RuleField label="Isi" value={config.fontSize.body} suffix="pt" min={6} max={36} step={1} onChange={(v) => updateFontSize('body', v)} />
            <RuleField label="Keterangan" value={config.fontSize.caption} suffix="pt" min={6} max={36} step={1} onChange={(v) => updateFontSize('caption', v)} />
          </div>
        );
      case 'table_format':
        return (
          <div className="space-y-2">
            <RuleField
              label="Ukuran huruf tabel"
              value={config.fontSize.table}
              suffix="pt"
              min={6}
              max={24}
              step={1}
              onChange={(v) => updateFontSize('table', v)}
            />
            <RuleSelect
              label="Ketebalan garis"
              value={String(config.tableStyle.borderWidth)}
              options={[
                { value: '0.5', label: 'Tipis (0,5 pt)' },
                { value: '1', label: 'Sedang (1 pt)' },
                { value: '1.5', label: 'Tebal (1,5 pt)' }
              ]}
              onChange={(v) => updateTableStyle({ borderWidth: Number(v) || 1 })}
            />
            <RuleSelect
              label="Baris judul kolom"
              value={config.tableStyle.headerBold ? 'bold' : 'normal'}
              options={[
                { value: 'bold', label: 'Tebal (disarankan)' },
                { value: 'normal', label: 'Biasa' }
              ]}
              onChange={(v) => updateTableStyle({ headerBold: v === 'bold' })}
            />
            <RuleSelect
              label="Perataan isi sel"
              value={config.tableStyle.cellAlignment}
              options={[
                { value: 'left', label: 'Rata kiri' },
                { value: 'center', label: 'Rata tengah' }
              ]}
              onChange={(v) =>
                updateTableStyle({ cellAlignment: v === 'center' ? 'center' : 'left' })
              }
            />
          </div>
        );
      case 'line_spacing':
        return (
          <RuleSelect
            label="Jarak antarbaris"
            value={String(config.lineSpacing)}
            options={[
              { value: '1', label: '1,0 — rapat' },
              { value: '1.15', label: '1,15' },
              { value: '1.5', label: '1,5 — standar' },
              { value: '2', label: '2,0 — renggang' }
            ]}
            onChange={(v) => updateConfig({ lineSpacing: Number(v) || 1.5 })}
          />
        );
      case 'indent':
        return (
          <div className="space-y-1.5">
            <RuleField
              label="Menjorok"
              value={config.firstLineIndent}
              suffix="cm"
              min={0}
              max={4}
              step={0.25}
              onChange={(v) => updateConfig({ firstLineIndent: v })}
            />
            <p className="text-[10px] leading-relaxed text-slate-400">
              Isi 0 bila paragraf tidak ingin menjorok. Nilai lazim: 1 cm atau 1,27 cm.
            </p>
          </div>
        );
      case 'alignment':
        return (
          <RuleSelect
            label="Perataan teks isi"
            value={config.alignment}
            options={[
              { value: 'justify', label: 'Rata kanan-kiri (standar)' },
              { value: 'left', label: 'Rata kiri saja' }
            ]}
            onChange={(v) => updateConfig({ alignment: v as DocumentConfig['alignment'] })}
          />
        );
      case 'heading_spacing':
        return (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              <RuleField
                label="Atas judul BAB"
                value={config.headingRules.h1.spaceBefore}
                suffix="pt"
                min={0}
                max={72}
                step={6}
                onChange={(v) => updateHeading('h1', { spaceBefore: v })}
              />
              <RuleField
                label="Bawah judul BAB"
                value={config.headingRules.h1.spaceAfter}
                suffix="pt"
                min={0}
                max={72}
                step={6}
                onChange={(v) => updateHeading('h1', { spaceAfter: v })}
              />
              <RuleField
                label="Atas sub-judul"
                value={config.headingRules.h2.spaceBefore}
                suffix="pt"
                min={0}
                max={72}
                step={6}
                onChange={(v) => updateHeading('h2', { spaceBefore: v })}
              />
              <RuleField
                label="Bawah sub-judul"
                value={config.headingRules.h2.spaceAfter}
                suffix="pt"
                min={0}
                max={72}
                step={6}
                onChange={(v) => updateHeading('h2', { spaceAfter: v })}
              />
            </div>
            <RuleField
              label="Atas sub-sub judul"
              value={config.headingRules.h3.spaceBefore}
              suffix="pt"
              min={0}
              max={72}
              step={6}
              onChange={(v) => updateHeading('h3', { spaceBefore: v })}
            />
            <p className="text-[10px] leading-relaxed text-slate-400">
              Jarak dihitung dari judul/paragraf sebelumnya. Nilai 12–24 pt terlihat rapi untuk skripsi.
            </p>
          </div>
        );
      case 'hanging_indent':
        return (
          <RuleField
            label="Indentasi menggantung"
            value={config.hangingIndent}
            suffix="cm"
            min={0}
            max={4}
            step={0.05}
            onChange={(v) => updateConfig({ hangingIndent: v })}
          />
        );
      case 'numbering':
        return (
          <p className="text-[10px] leading-relaxed text-slate-400">
            Gaya nomor BAB &amp; sub-bab diatur di tab <span className="font-semibold text-slate-600">Format</span>, bagian Gaya judul.
          </p>
        );
      default:
        return null;
    }
  };

  const handleApply = () => {
    setIsApplying(true);
    setTimeout(() => {
      onApplyFormatting();
      setIsApplying(false);
      setShowAppliedToast(true);
      setTimeout(() => setShowAppliedToast(false), 3000);
    }, 400);
  };

  return (
    <aside className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0 h-full overflow-hidden select-none no-print">
      {/* Top Tabs matching screenshot: Formatting | Pemeriksaan */}
      <div
        role="tablist"
        aria-label="Panel dokumen"
        className="flex border-b border-slate-200 text-[11px] font-medium text-slate-600 bg-slate-50/50"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'formatting'}
          onClick={() => setActiveTab('formatting')}
          className={`flex-1 py-3 px-1 flex items-center justify-center space-x-1 border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500 ${
            activeTab === 'formatting'
              ? 'border-teal-600 text-teal-600 font-semibold bg-white'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Format</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'cover'}
          onClick={() => setActiveTab('cover')}
          className={`flex-1 py-3 px-1 flex items-center justify-center space-x-1 border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500 ${
            activeTab === 'cover'
              ? 'border-teal-600 text-teal-600 font-semibold bg-white'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          <LayoutTemplate className="w-3.5 h-3.5" />
          <span>Cover</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'aturan'}
          onClick={() => setActiveTab('aturan')}
          title="Aturan & penyesuaian — pilih dan ubah nilai format"
          className={`flex-1 py-3 px-1 flex items-center justify-center space-x-1 border-b-2 transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500 ${
            activeTab === 'aturan'
              ? 'border-teal-600 text-teal-600 font-semibold bg-white'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          <ListChecks className="w-3.5 h-3.5" />
          <span>Aturan</span>
          {enabledCount < rulesList.length && (
            <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center">
              {enabledCount}/{rulesList.length}
            </span>
          )}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'analisis'}
          onClick={() => setActiveTab('analisis')}
          title="Analisis & periksa — diagnosis format, aturan, KBBI, sitasi"
          className={`flex-1 py-3 px-1 flex items-center justify-center space-x-1 border-b-2 transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500 ${
            activeTab === 'analisis'
              ? 'border-teal-600 text-teal-600 font-semibold bg-white'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          <FileSearch className="w-3.5 h-3.5" />
          <span>Analisis</span>
          {analisisBadge > 0 && (
            <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold flex items-center justify-center">
              {analisisBadge > 9 ? '9+' : analisisBadge}
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: Formatting Content */}
      {activeTab === 'formatting' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Template Pedoman Dropdown matching screenshot */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Template pedoman
              </label>
              <a 
                href="#pedoman" 
                onClick={(e) => { e.preventDefault(); alert('Pedoman ini mengikuti standar baku penulisan karya ilmiah universitas di Indonesia.'); }}
                className="text-[11px] text-teal-600 hover:text-teal-700 font-medium inline-flex items-center space-x-0.5"
              >
                <span>Kelola</span>
                <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
              </a>
            </div>

            <div className="relative">
              <select
                value={config.template}
                onChange={(e) => handleTemplateChange(e.target.value as DocumentTemplate)}
                className={selectClass}
              >
                {TEMPLATE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <p className="mt-2 text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              {TEMPLATE_DESCRIPTIONS[config.template]}
            </p>
          </div>

          {/* Preset tersimpan */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={labelClass}>Preset tersimpan</label>
              <span className="text-[10px] text-slate-400 font-medium">
                Format kampus / dosen Anda
              </span>
            </div>

            <div className="flex space-x-1.5">
              <div className="relative flex-1 min-w-0">
                <select
                  value={selectedPresetId}
                  onChange={(event) => setSelectedPresetId(event.target.value)}
                  className={selectClass}
                  aria-label="Pilih preset tersimpan"
                >
                  <option value="">Pilih preset…</option>
                  {presets.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={handleApplyPreset}
                disabled={!selectedPresetId}
                className="px-2.5 py-2 rounded-lg bg-teal-600 text-white text-[11px] font-semibold disabled:opacity-40 hover:bg-teal-700 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              >
                Terapkan
              </button>
            </div>

            <div className="flex space-x-1.5 mt-2">
              <input
                type="text"
                value={newPresetName}
                onChange={(event) => setNewPresetName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleSavePreset();
                }}
                placeholder="Nama preset baru (mis. Format Kampus X)"
                className="flex-1 min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-[11px] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                aria-label="Nama preset baru"
              />
              <button
                type="button"
                onClick={handleSavePreset}
                disabled={!newPresetName.trim()}
                className="px-2.5 py-2 rounded-lg border border-teal-600 text-teal-700 text-[11px] font-semibold disabled:opacity-40 hover:bg-teal-50 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              >
                <Save className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex space-x-1.5 mt-2">
              <button
                type="button"
                onClick={handleDeletePreset}
                disabled={!selectedPresetId}
                className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 text-slate-500 text-[10px] font-medium disabled:opacity-40 hover:border-red-300 hover:text-red-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              >
                <Trash2 className="w-3 h-3 inline mr-1" />Hapus
              </button>
              <button
                type="button"
                onClick={handleExportPresets}
                className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 text-slate-500 text-[10px] font-medium hover:border-teal-300 hover:text-teal-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              >
                <Download className="w-3 h-3 inline mr-1" />Ekspor
              </button>
              <button
                type="button"
                onClick={() => importFileRef.current?.click()}
                className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 text-slate-500 text-[10px] font-medium hover:border-teal-300 hover:text-teal-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              >
                <Upload className="w-3 h-3 inline mr-1" />Impor
              </button>
              <input
                ref={importFileRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleImportFile}
                aria-label="Impor file preset JSON"
              />
            </div>
          </div>

          {/* Gaya judul (BAB & sub-bab) */}
          <div>
            <label className={labelClass}>Gaya judul (BAB &amp; sub-bab)</label>

            <div className="mt-2 space-y-2">
              <div className="grid grid-cols-2 gap-1.5">
                <label className="block">
                  <span className="text-[10px] text-slate-500 font-medium">Nomor bab</span>
                  <select
                    value={config.headingRules.numberingFormat}
                    onChange={(event) =>
                      updateConfig({
                        headingRules: {
                          ...config.headingRules,
                          numberingFormat: event.target.value as DocumentConfig['headingRules']['numberingFormat']
                        }
                      })
                    }
                    className={`${selectClass} mt-0.5`}
                    aria-label="Format penomoran BAB"
                    title="Pilih gaya penulisan nomor bab"
                  >
                    <option value="bab-roman">BAB I</option>
                    <option value="bab-arabic">BAB 1</option>
                    <option value="roman">I.</option>
                    <option value="none">Tanpa nomor</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-[10px] text-slate-500 font-medium">Baris judul</span>
                  <select
                    value={config.headingRules.babTitleStyle}
                    onChange={(event) =>
                      updateConfig({
                        headingRules: {
                          ...config.headingRules,
                          babTitleStyle: event.target.value as DocumentConfig['headingRules']['babTitleStyle']
                        }
                      })
                    }
                    className={`${selectClass} mt-0.5`}
                    aria-label="Gaya baris judul BAB"
                    title="Pilih apakah nomor bab dan judul ditulis terpisah atau digabung satu baris"
                  >
                    <option value="separate">Dua baris</option>
                    <option value="joined">Satu baris</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-[10px] text-slate-500 font-medium">Nomor sub-bab</span>
                  <select
                    value={config.headingRules.h2Numbering}
                    onChange={(event) =>
                      updateConfig({
                        headingRules: {
                          ...config.headingRules,
                          h2Numbering: event.target.value as DocumentConfig['headingRules']['h2Numbering']
                        }
                      })
                    }
                    className={`${selectClass} mt-0.5`}
                    aria-label="Format nomor sub-bab"
                    title="Pilih gaya penomoran sub-bab: 1.1 (angka) atau I.1 (romawi)"
                  >
                    <option value="numeric">1.1</option>
                    <option value="roman">I.1</option>
                  </select>
                </label>
              </div>

              <div className="mt-1.5">
                <RuleField
                  label="Posisi judul"
                  value={config.headingRules.numberTitleGapCm}
                  suffix="cm"
                  min={0}
                  max={5}
                  step={0.1}
                  onChange={(v) =>
                    updateConfig({
                      headingRules: {
                        ...config.headingRules,
                        // 0 = mati; nilai 0<v<0,5 dinaikkan ke 0,5 cm agar nomor
                        // dan judul tidak pernah menempel.
                        numberTitleGapCm: v > 0 && v < 0.5 ? 0.5 : v
                      }
                    })
                  }
                />
              </div>

              <p className="text-[10px] text-slate-400 leading-relaxed">
                Dua baris = &ldquo;BAB I&rdquo; di baris atas, judul di bawahnya. Satu baris =
                &ldquo;BAB I PENDAHULUAN&rdquo; menyatu. Jarak atas/bawah memakai satuan poin (pt):
                12 pt &asymp; satu baris kosong. Posisi judul mengatur jarak nomor ke judul
                sub-bab dari margin kiri (minimal 0,5 cm — jangan lebih kecil dari lebar nomor);
                0 cm mengikuti spasi teks asli.
              </p>

              {HEADING_LEVELS.map(({ level, name }) => (
                <HeadingLevelCard
                  key={level}
                  name={name}
                  style={config.headingRules[level]}
                  onChange={(patch) => updateHeading(level, patch)}
                />
              ))}
            </div>
          </div>

          {/* Halaman & kertas */}
          <div>
            <label className={labelClass}>Halaman &amp; ukuran kertas</label>

            <div className="mt-2 grid grid-cols-2 gap-1.5">
              <label className="block">
                <span className="text-[10px] text-slate-500 font-medium">Ukuran kertas</span>
                <select
                  value={config.pageSetup.paperSize}
                  onChange={(event) => updatePageSetup({ paperSize: event.target.value as PageSetup['paperSize'] })}
                  className={`${selectClass} mt-0.5`}
                  aria-label="Ukuran kertas"
                >
                  <option value="a4">A4 (21 × 29,7 cm)</option>
                  <option value="f4">F4 (21 × 33 cm)</option>
                  <option value="letter">Letter (21,6 × 27,9 cm)</option>
                </select>
              </label>
              <label className="block">
                <span className="text-[10px] text-slate-500 font-medium">Orientasi</span>
                <select
                  value={config.pageSetup.orientation}
                  onChange={(event) => updatePageSetup({ orientation: event.target.value as PageSetup['orientation'] })}
                  className={`${selectClass} mt-0.5`}
                  aria-label="Orientasi halaman"
                >
                  <option value="portrait">Potret</option>
                  <option value="landscape">Lanskap</option>
                </select>
              </label>
              <label className="block col-span-2">
                <span className="text-[10px] text-slate-500 font-medium">Posisi nomor halaman</span>
                <select
                  value={config.pageSetup.pageNumberPosition}
                  onChange={(event) => updatePageSetup({ pageNumberPosition: event.target.value as PageSetup['pageNumberPosition'] })}
                  className={`${selectClass} mt-0.5`}
                  aria-label="Posisi nomor halaman"
                >
                  <option value="top-right">Kanan atas</option>
                  <option value="bottom-center">Bawah tengah</option>
                  <option value="bottom-right">Bawah kanan</option>
                  <option value="none">Sembunyikan</option>
                </select>
              </label>
              <label className="block col-span-2">
                <span className="text-[10px] text-slate-500 font-medium">Teks header halaman</span>
                <input
                  type="text"
                  value={config.pageSetup.headerText}
                  onChange={(event) => updatePageSetup({ headerText: event.target.value })}
                  disabled={!config.pageSetup.headerEnabled}
                  placeholder="Contoh: BAB I PENDAHULUAN"
                  className="mt-0.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-[11px] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                  aria-label="Teks header halaman"
                  aria-describedby="bantuan-header-halaman"
                />
                <span id="bantuan-header-halaman" className="mt-1 block text-[10px] leading-relaxed text-slate-400">
                  Teks kecil yang tercetak di bagian atas setiap halaman isi (bukan halaman cover).
                  Kosongkan jika tidak ingin ada tulisan di atas halaman.
                </span>
              </label>
            </div>

            <div className="mt-2 space-y-2">
              <label className="flex items-start space-x-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={config.rules.header_footer !== false}
                  onChange={(event) =>
                    updateConfig({ rules: { ...config.rules, header_footer: event.target.checked } })
                  }
                  className="mt-0.5 w-4 h-4 accent-teal-600"
                  aria-label="Header & nomor halaman"
                />
                <span className="text-xs text-slate-700 group-hover:text-teal-600 transition-colors">
                  Header &amp; nomor halaman
                </span>
              </label>
              <label className="flex items-start space-x-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={config.rules.page_numbers !== false}
                  onChange={(event) =>
                    updateConfig({ rules: { ...config.rules, page_numbers: event.target.checked } })
                  }
                  className="mt-0.5 w-4 h-4 accent-teal-600"
                  aria-label="Penomoran halaman"
                />
                <span className="flex flex-col leading-snug">
                  <span className="text-xs text-slate-700 group-hover:text-teal-600 transition-colors">
                    Penomoran halaman
                  </span>
                  <span className="text-[10px] leading-relaxed text-slate-400">
                    Angka romawi (i, ii) di bagian awal, angka biasa (1, 2) di bab isi
                  </span>
                </span>
              </label>
              <label className="flex items-start space-x-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={config.pageSetup.headerEnabled}
                  onChange={(event) => updatePageSetup({ headerEnabled: event.target.checked })}
                  className="mt-0.5 w-4 h-4 accent-teal-600"
                  aria-label="Tampilkan teks header di atas halaman"
                />
                <span className="text-xs text-slate-700 group-hover:text-teal-600 transition-colors">
                  Tampilkan teks header di atas halaman
                </span>
              </label>
              <label className="flex items-start space-x-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={config.pageSetup.newPagePerBab}
                  onChange={(event) => updatePageSetup({ newPagePerBab: event.target.checked })}
                  className="mt-0.5 w-4 h-4 accent-teal-600"
                  aria-label="Setiap BAB mulai di halaman baru"
                />
                <span className="text-xs text-slate-700 group-hover:text-teal-600 transition-colors">
                  Setiap BAB mulai di halaman baru
                </span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Cover builder */}
      {activeTab === 'cover' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div>
            <label className={labelClass}>Layout cover</label>
            <div className="relative mt-1.5">
              <select
                value={config.coverLayout.variant}
                onChange={(event) =>
                  updateConfig({ coverLayout: { variant: event.target.value as CoverLayoutVariant } })
                }
                className={selectClass}
                aria-label="Layout cover"
              >
                <option value="klasik">Klasik — logo di tengah dokumen</option>
                <option value="logo-atas">Logo di atas</option>
                <option value="minimal">Minimal — tanpa logo</option>
              </select>
            </div>
            <p className="mt-1.5 text-[10px] text-slate-400 leading-relaxed">
              Field opsional (motto, pembimbing, penguji, tanggal sidang) otomatis muncul di cover
              saat diisi.
            </p>
          </div>
          <CoverEditor
            cover={doc.cover ?? createBlankCover(doc.title)}
            onChange={onChangeCover}
          />
        </div>
      )}

      {/* Tab 3: Aturan — pilih aturan + sesuaikan nilainya */}
      {activeTab === 'aturan' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">Aturan yang diterapkan</span>
              <span className="text-[11px] font-mono font-medium text-slate-400">
                {enabledCount}/{rulesList.length}
              </span>
            </div>
            <p className="text-[10px] leading-relaxed text-slate-400">
              Centang aturan yang ingin dipakai, lalu sesuaikan nilainya. Aturan yang tidak
              dicentang tidak akan mengubah dokumen.
            </p>
            <div className="flex space-x-1.5">
              <button
                type="button"
                onClick={() => setAllRules(true)}
                disabled={enabledCount === rulesList.length}
                className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-[10px] font-semibold text-slate-600 hover:border-teal-300 hover:text-teal-700 disabled:opacity-40"
              >
                Aktifkan semua
              </button>
              <button
                type="button"
                onClick={() => setAllRules(false)}
                disabled={enabledCount === 0}
                className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-[10px] font-semibold text-slate-600 hover:border-teal-300 hover:text-teal-700 disabled:opacity-40"
              >
                Kosongkan
              </button>
            </div>
          </div>

          {rulesList.map((rule) => {
            const isChecked = config.rules[rule.key] !== false;
            const control = renderRuleControl(rule.key);

            return (
              <div
                key={rule.key}
                className={`rounded-xl border p-3 transition-colors ${
                  isChecked ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex items-start space-x-2.5">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={isChecked}
                    aria-label={`Terapkan aturan ${rule.name}`}
                    onClick={() => toggleRule(rule.key)}
                    className="pt-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
                  >
                    <span
                      className={`w-4 h-4 rounded flex items-center justify-center transition-colors ${
                        isChecked
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'border border-slate-300 bg-white'
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </span>
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-800">{rule.name}</div>
                    <div className="text-[11px] leading-snug text-slate-400">{rule.desc}</div>
                  </div>
                </div>

                {isChecked && control ? (
                  <div className="mt-2.5 border-t border-slate-100 pt-2.5">{control}</div>
                ) : null}
                {!isChecked ? (
                  <div className="mt-1.5 text-[10px] text-slate-400">
                    Aturan nonaktif — nilai di bawah tidak dipakai.
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 4: Analisis — diagnosis + KBBI + sitasi + audit */}
      {activeTab === 'analisis' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <FormatDiagnosisPanel
            diagnosis={diagnosis}
            config={config}
            onApplyTemplate={handleTemplateChange}
            onSmartFix={onSmartFix}
          />

          {/* FEATURE 1: KOREKTOR KATA BAKU (KBBI) */}
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <BookA className="w-4 h-4 text-teal-600" />
                <span className="text-xs font-bold text-slate-800">
                  Korektor Kata Baku (KBBI)
                </span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                totalKbbiCount > 0 
                  ? 'bg-amber-100 text-amber-800' 
                  : 'bg-emerald-100 text-emerald-800'
              }`}>
                {totalKbbiCount > 0 ? `${totalKbbiCount} Kata Tidak Baku` : 'Sesuai KBBI'}
              </span>
            </div>

            {totalKbbiCount > 0 ? (
              <div className="space-y-2">
                <p className="text-[11px] text-slate-500">
                  Ditemukan kata tidak baku yang sering salah dalam penulisan karya ilmiah:
                </p>

                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {kbbiIssues.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 text-[11px] border border-slate-100">
                      <div>
                        <span className="line-through text-red-500 font-medium mr-1.5">
                          {item.rule.wrong}
                        </span>
                        <span className="text-emerald-700 font-bold">
                          → {item.rule.correct}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {item.count}x
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={onFixAllKbbi}
                  className="w-full py-2 px-3 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center space-x-1.5 transition-colors shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Perbaiki Semua Kata Baku (KBBI)</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>Seluruh kata telah sesuai dengan ejaan baku KBBI!</span>
              </div>
            )}
          </div>

          {/* FEATURE 1b: KOREKTOR BAHASA ASING (PUEBI) */}
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <Languages className="w-4 h-4 text-teal-600" />
                <span className="text-xs font-bold text-slate-800">
                  Korektor Bahasa Asing (PUEBI)
                </span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                foreignTotal > 0
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}>
                {foreignTotal > 0 ? `${foreignTotal} Istilah Asing` : 'Sesuai PUEBI'}
              </span>
            </div>

            {foreignTotal > 0 ? (
              <div className="space-y-3">
                {foreignIssues.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] text-slate-500">
                      Istilah asing yang sebaiknya ditulis miring:
                    </p>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {foreignIssues.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 text-[11px] border border-slate-100">
                          <span className="font-medium text-slate-700 italic">{item.term}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{item.count}x</span>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={onItalicizeCuratedAll}
                      className="w-full py-2 px-3 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center space-x-1.5 transition-colors shadow-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Miringkan Semua Istilah Umum</span>
                    </button>
                  </div>
                )}

                {kbbiWords && foreignCandidates.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] text-slate-500">
                      Kandidat istilah asing (tidak ada di KBBI) — pilih yang perlu dimiringkan:
                    </p>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {foreignCandidates.map((candidate) => (
                        <div key={candidate.word} className="flex items-center justify-between p-2 rounded-lg bg-amber-50/60 text-[11px] border border-amber-100">
                          <span className="font-medium text-slate-700 italic">{candidate.word}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] text-slate-400 font-mono">{candidate.count}x</span>
                            <button
                              onClick={() => onItalicizeTerm(candidate.word)}
                              className="px-2 py-1 rounded-md bg-teal-600 hover:bg-teal-700 text-white text-[10px] font-semibold transition-colors"
                            >
                              Miringkan
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-1.5">
                  <input
                    type="text"
                    value={manualTerm}
                    onChange={(event) => setManualTerm(event.target.value)}
                    placeholder="Miringkan istilah asing lain…"
                    className="flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-[11px] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    aria-label="Miringkan istilah asing lain"
                  />
                  <button
                    onClick={() => {
                      const term = manualTerm.trim();
                      if (!term) return;
                      onItalicizeTerm(term);
                      setManualTerm('');
                    }}
                    disabled={!manualTerm.trim()}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 disabled:bg-slate-300 text-white text-[11px] font-semibold rounded-lg transition-colors"
                  >
                    Terapkan
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>Tidak ada istilah asing yang perlu dimiringkan!</span>
              </div>
            )}
          </div>

          {/* FEATURE 2: FORMAT SITASI & REFERENSI */}
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <SortAsc className="w-4 h-4 text-teal-600" />
                <span className="text-xs font-bold text-slate-800">
                  Format Sitasi & Referensi
                </span>
              </div>
              <span className="text-[10px] bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full font-semibold uppercase">
                {citationAnalysis.styleDetected.toUpperCase()}
              </span>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex items-center justify-between text-[11px] bg-slate-50 p-2 rounded-lg border border-slate-100">
                <span>Total Referensi Daftar Pustaka:</span>
                <span className="font-bold text-slate-800">{citationAnalysis.totalEntries} entri</span>
              </div>

              <div className="flex items-center justify-between text-[11px] bg-slate-50 p-2 rounded-lg border border-slate-100">
                <span>Urutan Abjad (A - Z):</span>
                <span className={`font-semibold ${citationAnalysis.isSortedAlphabetically ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {citationAnalysis.isSortedAlphabetically ? '✓ Sudah Urut A-Z' : 'Belum Terurut'}
                </span>
              </div>

              <button
                onClick={onSortBibliography}
                className="w-full py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg flex items-center justify-center space-x-1.5 transition-colors shadow-xs"
              >
                <SortAsc className="w-3.5 h-3.5 text-teal-600" />
                <span>Urutkan Daftar Pustaka (A - Z) 🔤</span>
              </button>

              {citationAnalysis.missingFromBibliography.length > 0 && (
                <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 space-y-1">
                  <div className="font-semibold flex items-center space-x-1">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Sitasi teks tanpa entri di pustaka:</span>
                  </div>
                  <ul className="list-disc pl-4 text-[10px] space-y-0.5">
                    {citationAnalysis.missingFromBibliography.map((cit, idx) => (
                      <li key={idx}>{cit}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* FEATURE 3: CATATAN PEMROSESAN TEKS AI (info, tanpa duplikat struktur) */}
          {processingIssues.length > 0 && (
            <details className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
              <summary className="cursor-pointer text-xs font-bold text-slate-800">
                Catatan pemrosesan teks AI ({processingIssues.length})
              </summary>
              <div className="mt-2 space-y-2">
                {processingIssues.map((iss) => (
                  <div
                    key={iss.id}
                    className="space-y-1 rounded-lg border border-slate-200 bg-slate-50/60 p-2.5"
                  >
                    <div className="flex items-start space-x-2">
                      <Sparkles className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                      <div className="text-xs font-medium text-slate-800">{iss.title}</div>
                    </div>
                    <div className="pl-5.5 text-[11px] leading-relaxed text-slate-500">
                      {iss.description}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {/* Bottom Actions matching screenshot */}
      <div className="p-4 border-t border-slate-200 bg-white space-y-2.5 shrink-0">
        <button
          onClick={handleApply}
          disabled={isApplying}
          className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white text-xs font-medium rounded-lg shadow-sm flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isApplying ? 'Merapikan...' : 'Rapikan dokumen sekarang'}</span>
        </button>

        <button
          onClick={onRecheck}
          className="w-full py-1.5 text-center text-xs text-slate-500 hover:text-slate-800 flex items-center justify-center space-x-1.5 transition-colors"
        >
          <RefreshCw className="w-3 h-3 text-slate-400" />
          <span>Periksa ulang hasilnya</span>
        </button>

        {showAppliedToast && (
          <div className="text-[11px] text-center text-emerald-700 bg-emerald-50 border border-emerald-200 py-1.5 rounded-lg animate-in fade-in">
            ✓ Format standar akademik berhasil diterapkan!
          </div>
        )}
      </div>
    </aside>
  );
};
