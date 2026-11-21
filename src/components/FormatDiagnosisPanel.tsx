import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Quote,
  Wand2,
  XCircle
} from 'lucide-react';
import { DocumentConfig, DocumentTemplate } from '../types/document';
import {
  DetectedDocumentType,
  DiagnosisCheck,
  FormatDiagnosis,
  documentTypeLabel
} from '../utils/formatDiagnosis';

interface FormatDiagnosisPanelProps {
  diagnosis: FormatDiagnosis;
  config: DocumentConfig;
  onApplyTemplate: (template: DocumentTemplate) => void;
  onSmartFix: (template: DetectedDocumentType) => void;
}

const numberFormat = new Intl.NumberFormat('id-ID');

const severityStyle: Record<
  DiagnosisCheck['severity'],
  { icon: React.ReactNode; badge: string; label: string }
> = {
  ok: {
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />,
    badge: 'bg-emerald-100 text-emerald-800',
    label: 'OK'
  },
  info: {
    icon: <Info className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />,
    badge: 'bg-sky-100 text-sky-800',
    label: 'Info'
  },
  warning: {
    icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />,
    badge: 'bg-amber-100 text-amber-800',
    label: 'Saran'
  },
  error: {
    icon: <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />,
    badge: 'bg-red-100 text-red-800',
    label: 'Penting'
  }
};

function scoreTone(score: number): string {
  if (score >= 85) return 'text-emerald-200';
  if (score >= 65) return 'text-amber-200';
  return 'text-red-200';
}

export const FormatDiagnosisPanel: React.FC<FormatDiagnosisPanelProps> = ({
  diagnosis,
  config,
  onApplyTemplate,
  onSmartFix
}) => {
  const actionable = diagnosis.checks.filter(
    (check) => check.severity === 'warning' || check.severity === 'error'
  );
  const okChecks = diagnosis.checks.filter((check) => check.severity === 'ok');
  const typeLabel = documentTypeLabel(diagnosis.detectedType);
  const templateMatches = config.template === diagnosis.detectedType;

  return (
    <div className="space-y-4">
      {/* Ringkasan tipe dokumen & skor */}
      <div className="rounded-xl bg-gradient-to-br from-teal-600 to-teal-700 text-white p-4 shadow-sm space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-teal-100">
              Tipe dokumen terdeteksi
            </div>
            <div className="text-lg font-extrabold leading-tight">{typeLabel}</div>
            <div className="text-[11px] text-teal-100 mt-0.5">
              Keyakinan {Math.round(diagnosis.confidence * 100)}% · {diagnosis.chapterCount} bab ·{' '}
              {numberFormat.format(diagnosis.wordCount)} kata
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className={`text-2xl font-extrabold leading-none ${scoreTone(diagnosis.score)}`}>
              {diagnosis.score}
            </div>
            <div className="text-[10px] text-teal-100 mt-0.5">skor format</div>
          </div>
        </div>

        <div className="h-1.5 rounded-full bg-teal-900/30 overflow-hidden">
          <div
            className="h-full rounded-full bg-white/90 transition-all"
            style={{ width: `${diagnosis.score}%` }}
          />
        </div>

        {diagnosis.evidence.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {diagnosis.evidence.map((item) => (
              <span
                key={item}
                className="text-[10px] bg-white/10 border border-white/15 rounded-full px-2 py-0.5 text-teal-50"
              >
                {item}
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-1.5 pt-0.5">
          <button
            type="button"
            onClick={() => onSmartFix(diagnosis.detectedType)}
            className="flex-1 inline-flex items-center justify-center space-x-1.5 rounded-lg bg-white text-teal-700 text-[11px] font-bold py-2 hover:bg-teal-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            title="Terapkan preset, urutkan pustaka, dan perbaiki kata tidak baku"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Rapikan otomatis</span>
          </button>
          {diagnosis.fixes.template && (
            <button
              type="button"
              onClick={() => onApplyTemplate(diagnosis.detectedType)}
              className="px-2.5 rounded-lg border border-white/40 text-[11px] font-semibold text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              title={`Terapkan pengaturan ${typeLabel} tanpa mengubah teks`}
            >
              Preset saja
            </button>
          )}
        </div>

        <p className="text-[10px] leading-relaxed text-teal-100/90">
          Rapikan otomatis = terapkan pengaturan {typeLabel.toLowerCase()}
          {diagnosis.fixes.sortBibliography ? ', urutkan daftar pustaka' : ''}
          {diagnosis.fixes.kbbiCount > 0
            ? `, perbaiki ${diagnosis.fixes.kbbiCount} kata tidak baku`
            : ''}
          . Teks & isi tidak dihapus.
        </p>
      </div>

      {/* Statistik singkat */}
      <div className="grid grid-cols-3 gap-1.5">
        <div className="rounded-lg border border-slate-200 bg-white p-2 text-center">
          <div className="text-sm font-bold text-slate-800">{diagnosis.bibliographyCount}</div>
          <div className="text-[9px] text-slate-500 uppercase tracking-wide">Pustaka</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-2 text-center">
          <div className="text-sm font-bold text-slate-800 uppercase">
            {diagnosis.citationStyle === 'apa7' ? 'APA' : diagnosis.citationStyle.toUpperCase()}
          </div>
          <div className="text-[9px] text-slate-500 uppercase tracking-wide">Sitasi</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-2 text-center">
          <div className={`text-sm font-bold ${templateMatches ? 'text-emerald-600' : 'text-amber-600'}`}>
            {templateMatches ? 'Cocok' : 'Beda'}
          </div>
          <div className="text-[9px] text-slate-500 uppercase tracking-wide">Preset</div>
        </div>
      </div>

      {/* Kelengkapan struktur */}
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800">Kelengkapan struktur</span>
          <span className="text-[10px] text-slate-400 font-medium">
            {diagnosis.requirements.filter((item) => item.present).length}/
            {diagnosis.requirements.length}
          </span>
        </div>
        <div className="space-y-1.5">
          {diagnosis.requirements.map((item) => (
            <div key={item.id} className="flex items-start space-x-2 text-[11px]">
              {item.present ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle
                  className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                    item.required ? 'text-amber-600' : 'text-slate-400'
                  }`}
                />
              )}
              <span className={item.present ? 'text-slate-700' : 'text-slate-500'}>
                {item.label}
                {!item.required && !item.present && (
                  <span className="text-slate-400"> (opsional)</span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Temuan & saran */}
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800">Temuan & saran</span>
          {actionable.length > 0 ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-800">
              {actionable.length} perlu perhatian
            </span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800">
              Bersih
            </span>
          )}
        </div>

        {actionable.length === 0 ? (
          <div className="flex items-start space-x-2 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            <span>Tidak ada anomali format yang perlu diperbaiki. Dokumen siap diunduh.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {actionable.map((check) => {
              const style = severityStyle[check.severity];
              return (
                <div
                  key={check.id}
                  className="rounded-lg border border-slate-100 bg-slate-50/70 p-2.5 space-y-1"
                >
                  <div className="flex items-start space-x-2">
                    {style.icon}
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold text-slate-800 leading-snug">
                        {check.title}
                      </div>
                      <p className="text-[10.5px] text-slate-500 leading-relaxed mt-0.5">
                        {check.detail}
                      </p>
                      {check.hint && (
                        <p className="text-[10px] text-teal-700 leading-relaxed mt-1">
                          → {check.hint}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Yang sudah beres */}
      {okChecks.length > 0 && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 space-y-1.5">
          <div className="flex items-center space-x-1.5 text-[11px] font-bold text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Sudah sesuai</span>
          </div>
          {okChecks.map((check) => (
            <p key={check.id} className="text-[10.5px] text-emerald-700 leading-relaxed pl-5">
              {check.title}
            </p>
          ))}
        </div>
      )}

      <div className="flex items-start space-x-1.5 text-[10px] text-slate-400 leading-relaxed px-1">
        <Quote className="w-3 h-3 shrink-0 mt-0.5" />
        <span>
          Deteksi memakai judul, struktur bagian, jumlah bab, dan panjang teks. Margin & jenis
          font tidak bisa ditebak dari teks mentah — bagian itu tetap dari preset yang Anda pilih.
        </span>
      </div>
    </div>
  );
};
