import React, { useMemo, useRef, useState } from 'react';
import { 
  Sliders, 
  CheckCircle, 
  Sparkles, 
  RefreshCw, 
  AlertCircle, 
  Info, 
  ExternalLink,
  ChevronDown,
  Check,
  ShieldCheck,
  BookA,
  SortAsc,
  CheckCheck,
  FileText,
  LayoutTemplate,
  Save,
  Trash2,
  Download,
  Upload,
  FileSearch
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

interface RightSidebarProps {
  doc: ParsedDocument;
  config: DocumentConfig;
  onChangeConfig: (newConfig: DocumentConfig) => void;
  issues: InspectionIssue[];
  onApplyFormatting: () => void;
  onRecheck: () => void;
  onFixAllKbbi: () => void;
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
  'w-full appearance-none bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 pr-8 cursor-pointer';

const labelClass = 'text-xs font-semibold text-slate-700';

const TogglePill: React.FC<{
  label: string;
  active: boolean;
  onClick: () => void;
  title: string;
}> = ({ label, active, onClick, title }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
      active
        ? 'bg-teal-600 text-white border-teal-600'
        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700'
    }`}
  >
    {label}
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
        <TogglePill label="B" title="Tebal" active={style.bold} onClick={() => onChange({ bold: !style.bold })} />
        <TogglePill label="I" title="Miring" active={style.italic} onClick={() => onChange({ italic: !style.italic })} />
        <TogglePill label="Kapital" title="Semua huruf kapital" active={style.allCaps} onClick={() => onChange({ allCaps: !style.allCaps })} />
      </div>
    </div>
    <div className="flex items-center space-x-2">
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
      <label className="flex items-center space-x-1 text-[10px] text-slate-500 shrink-0">
        <span>Sebelum</span>
        <input
          type="number"
          min={0}
          max={72}
          value={style.spaceBefore}
          onChange={(event) => onChange({ spaceBefore: Math.max(0, Number(event.target.value) || 0) })}
          className="w-11 rounded-md border border-slate-300 px-1 py-1 text-center text-[11px] focus:outline-none focus:ring-2 focus:ring-teal-500"
          aria-label={`Spasi sebelum ${name} (pt)`}
        />
      </label>
      <label className="flex items-center space-x-1 text-[10px] text-slate-500 shrink-0">
        <span>Sesudah</span>
        <input
          type="number"
          min={0}
          max={72}
          value={style.spaceAfter}
          onChange={(event) => onChange({ spaceAfter: Math.max(0, Number(event.target.value) || 0) })}
          className="w-11 rounded-md border border-slate-300 px-1 py-1 text-center text-[11px] focus:outline-none focus:ring-2 focus:ring-teal-500"
          aria-label={`Spasi sesudah ${name} (pt)`}
        />
      </label>
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
  onSortBibliography,
  onChangeCover,
  onSmartFix
}) => {
  const [activeTab, setActiveTab] = useState<
    'formatting' | 'cover' | 'diagnosa' | 'pemeriksaan'
  >('formatting');
  const [isApplying, setIsApplying] = useState(false);
  const [showAppliedToast, setShowAppliedToast] = useState(false);
  const [citationStyle, setCitationStyle] = useState<CitationStyle>('apa7');
  const [presets, setPresets] = useState<SavedPreset[]>(loadPresets);
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [newPresetName, setNewPresetName] = useState('');
  const importFileRef = useRef<HTMLInputElement>(null);
  const diagnosis = useMemo(() => diagnoseDocument(doc, config), [doc, config]);
  const diagnosisFindings = diagnosis.checks.filter(
    (check) => check.severity === 'warning' || check.severity === 'error'
  ).length;

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
    { key: 'margin', name: 'Margin halaman', desc: 'Atur margin tiap sisi (Kiri 4cm, Atas 3cm, Kanan 3cm, Bawah 3cm)' },
    { key: 'font', name: 'Jenis font', desc: 'Selaraskan semua run teks ke Times New Roman' },
    { key: 'font_size', name: 'Ukuran teks', desc: 'Termasuk teks dalam tabel dan sub-bab' },
    { key: 'line_spacing', name: 'Spasi baris', desc: 'Line spacing paragraf 1.5' },
    { key: 'indent', name: 'Indentasi', desc: 'Baris pertama paragraf (First line indent 1 cm)' },
    { key: 'alignment', name: 'Perataan', desc: 'Justify / rata kiri-kanan' },
    { key: 'clean_markdown', name: 'Bersihkan Markdown AI', desc: 'Hapus bintang **tebal**, pagar ###, dan backticks saat dokumen dimuat' },
    { key: 'clean_chatter', name: 'Hapus basa-basi AI', desc: 'Hapus kalimat pembuka & penutup percakapan robot AI saat dokumen dimuat' },
    { key: 'numbering', name: 'Standarisasi penomoran', desc: 'Format baku BAB I, 1.1, 1.2, a., 1)' },
    { key: 'hanging_indent', name: 'Format Daftar Pustaka', desc: 'Hanging indent 1.27 cm dan perataan abjad' },
    { key: 'page_numbers', name: 'Penomoran halaman', desc: 'Romawi kecil (i, ii) di awal, Arab (1, 2) di bab isi' },
    { key: 'header_footer', name: 'Header & footer standar', desc: 'Posisi nomor halaman kanan atas / bawah tengah' },
  ];

  const enabledCount = rulesList.filter(r => config.rules[r.key] !== false).length;

  // Real-time analysis for KBBI and Citations
  const kbbiIssues = detectKbbiIssues(doc.rawText);
  const totalKbbiCount = kbbiIssues.reduce((acc, curr) => acc + curr.count, 0);

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
          aria-selected={activeTab === 'diagnosa'}
          onClick={() => setActiveTab('diagnosa')}
          title="Diagnosa Format — deteksi tipe dokumen & anomali"
          className={`flex-1 py-3 px-1 flex items-center justify-center space-x-1 border-b-2 transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500 ${
            activeTab === 'diagnosa'
              ? 'border-teal-600 text-teal-600 font-semibold bg-white'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          <FileSearch className="w-3.5 h-3.5" />
          <span>Diagnosa</span>
          {diagnosisFindings > 0 && (
            <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold flex items-center justify-center">
              {diagnosisFindings > 9 ? '9+' : diagnosisFindings}
            </span>
          )}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'pemeriksaan'}
          onClick={() => setActiveTab('pemeriksaan')}
          className={`flex-1 py-3 px-1 flex items-center justify-center space-x-1 border-b-2 transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500 ${
            activeTab === 'pemeriksaan'
              ? 'border-teal-600 text-teal-600 font-semibold bg-white'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Periksa</span>
          {(issues.length > 0 || totalKbbiCount > 0) && (
            <span className="w-4 h-4 rounded-full bg-teal-100 text-teal-700 text-[10px] font-bold flex items-center justify-center">
              {issues.length + (totalKbbiCount > 0 ? 1 : 0)}
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
                className="w-full appearance-none bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 pr-8 cursor-pointer"
              >
                {TEMPLATE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
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
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
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
              <div className="grid grid-cols-3 gap-1.5">
                <label className="block">
                  <span className="text-[10px] text-slate-500 font-medium">Penomoran BAB</span>
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
                  >
                    <option value="bab-roman">BAB I</option>
                    <option value="bab-arabic">BAB 1</option>
                    <option value="roman">I.</option>
                    <option value="none">Tanpa label</option>
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
                  >
                    <option value="numeric">1.1</option>
                    <option value="roman">I.1</option>
                  </select>
                </label>
              </div>

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
            <label className={labelClass}>Halaman &amp; kertas</label>

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
                <span className="text-[10px] text-slate-500 font-medium">Running head</span>
                <input
                  type="text"
                  value={config.pageSetup.headerText}
                  onChange={(event) => updatePageSetup({ headerText: event.target.value })}
                  placeholder="Teks di atas halaman isi (mis. BAB I PENDAHULUAN)"
                  className="mt-0.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-[11px] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  aria-label="Teks running head"
                />
              </label>
            </div>

            <div className="mt-2 space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={config.pageSetup.headerEnabled}
                  onChange={(event) => updatePageSetup({ headerEnabled: event.target.checked })}
                  className="w-4 h-4 accent-teal-600"
                  aria-label="Tampilkan running head"
                />
                <span className="text-xs text-slate-700 group-hover:text-teal-600 transition-colors">
                  Tampilkan running head
                </span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={config.pageSetup.newPagePerBab}
                  onChange={(event) => updatePageSetup({ newPagePerBab: event.target.checked })}
                  className="w-4 h-4 accent-teal-600"
                  aria-label="Setiap BAB mulai di halaman baru"
                />
                <span className="text-xs text-slate-700 group-hover:text-teal-600 transition-colors">
                  Setiap BAB mulai di halaman baru
                </span>
              </label>
            </div>
          </div>

          {/* Aturan yang diterapkan (12/12) matching screenshot */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-800">
                Aturan yang diterapkan
              </span>
              <span className="text-[11px] font-mono font-medium text-slate-400">
                {enabledCount}/{rulesList.length}
              </span>
            </div>

            <div className="space-y-2.5 pt-1">
              {rulesList.map((rule) => {
                const isChecked = config.rules[rule.key] !== false;
                return (
                  <div
                    key={rule.key}
                    onClick={() => toggleRule(rule.key)}
                    className="flex items-start space-x-2.5 cursor-pointer group"
                  >
                    <div className="pt-0.5">
                      <div className={`w-4 h-4 rounded flex items-center justify-center transition-colors ${
                        isChecked 
                          ? 'bg-teal-600 text-white shadow-xs' 
                          : 'border border-slate-300 bg-white group-hover:border-slate-400'
                      }`}>
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-slate-800 group-hover:text-teal-600 transition-colors">
                        {rule.name}
                      </div>
                      <div className="text-[11px] text-slate-400 leading-snug">
                        {rule.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
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
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
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

      {/* Tab 3: Diagnosa Format */}
      {activeTab === 'diagnosa' && (
        <FormatDiagnosisPanel
          diagnosis={diagnosis}
          config={config}
          onApplyTemplate={handleTemplateChange}
          onSmartFix={onSmartFix}
        />
      )}

      {/* Tab 4: Pemeriksaan / Linter Tab (Enhanced with KBBI & Citations) */}
      {activeTab === 'pemeriksaan' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
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

          {/* FEATURE 3: HASIL AUDIT DOKUMEN & FORMAT AI */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-800">
              Audit Pembersihan AI
            </span>
            <div className="space-y-2">
              {issues.map((iss) => (
                <div 
                  key={iss.id} 
                  className="p-3 rounded-lg border border-slate-200 bg-white hover:border-teal-200 transition-colors space-y-1 shadow-xs"
                >
                  <div className="flex items-start space-x-2">
                    <Sparkles className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                    <div className="text-xs font-medium text-slate-800">
                      {iss.title}
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500 pl-5.5 leading-relaxed">
                    {iss.description}
                  </div>
                </div>
              ))}
            </div>
          </div>
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
          <span>{isApplying ? 'Menerapkan...' : 'Terapkan formatting'}</span>
        </button>

        <button
          onClick={onRecheck}
          className="w-full py-1.5 text-center text-xs text-slate-500 hover:text-slate-800 flex items-center justify-center space-x-1.5 transition-colors"
        >
          <RefreshCw className="w-3 h-3 text-slate-400" />
          <span>Periksa ulang dengan konfigurasi ini</span>
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
