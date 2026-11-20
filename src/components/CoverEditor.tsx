import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, Plus, Trash2, X } from 'lucide-react';
import { CoverData, CoverMember } from '../types/document';
import { COVER_PLACEHOLDERS } from '../utils/cover';
import { cn } from '../lib/utils';

interface CoverEditorProps {
  cover: CoverData;
  onChange: (patch: Partial<CoverData>) => void;
}

const DOCUMENT_TYPE_OPTIONS = [
  'MAKALAH',
  'SKRIPSI',
  'TUGAS AKHIR',
  'LAPORAN',
  'PROPOSAL SKRIPSI',
  'PROPOSAL PENELITIAN',
  'KARYA ILMIAH',
  'PRAKTIK KERJA LAPANGAN'
];

const MAX_LOGO_EDGE = 512;

const inputClass =
  'w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 shadow-2xs focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500';

const labelClass = 'block text-[11px] font-medium text-slate-600 mb-1';

/**
 * Menyimpan logo sebagai data URL PNG yang sudah diperkecil
 * agar muat di localStorage dan ukurannya wajar saat diekspor ke Word.
 */
async function imageFileToLogo(file: File): Promise<Partial<CoverData> | null> {
  if (!file.type.startsWith('image/')) return null;

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.src = objectUrl;
    await image.decode();

    const naturalWidth = image.naturalWidth || image.width;
    const naturalHeight = image.naturalHeight || image.height;
    if (!naturalWidth || !naturalHeight) return null;

    const scale = Math.min(1, MAX_LOGO_EDGE / Math.max(naturalWidth, naturalHeight));
    const width = Math.max(1, Math.round(naturalWidth * scale));
    const height = Math.max(1, Math.round(naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) return null;

    context.drawImage(image, 0, 0, width, height);

    return {
      logo: canvas.toDataURL('image/png'),
      logoWidth: width,
      logoHeight: height
    };
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export const CoverEditor: React.FC<CoverEditorProps> = ({ cover, onChange }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const applyLogoFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) return;

      setIsProcessing(true);
      try {
        const patch = await imageFileToLogo(file);
        if (patch) onChange(patch);
      } catch {
        // Berkas tidak dapat dibaca: biarkan logo lama.
      } finally {
        setIsProcessing(false);
      }
    },
    [onChange]
  );

  // Tempel logo langsung dari clipboard (Ctrl+V) selama panel cover terbuka.
  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files ?? []);
      const image = files.find((file) => file.type.startsWith('image/'));
      if (!image) return;

      event.preventDefault();
      void applyLogoFile(image);
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [applyLogoFile]);

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);

    const image = Array.from(event.dataTransfer.files).find((file) =>
      file.type.startsWith('image/')
    );
    if (image) void applyLogoFile(image);
  };

  const updateMember = (id: string, patch: Partial<CoverMember>) => {
    onChange({
      members: cover.members.map((member) =>
        member.id === id ? { ...member, ...patch } : member
      )
    });
  };

  const addMember = () => {
    onChange({
      members: [
        ...cover.members,
        { id: `member-${Date.now().toString(36)}-${cover.members.length}`, name: '', nim: '' }
      ]
    });
  };

  const removeMember = (id: string) => {
    onChange({ members: cover.members.filter((member) => member.id !== id) });
  };

  const removeLogo = () => {
    onChange({ logo: undefined, logoWidth: undefined, logoHeight: undefined });
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Unggah logo */}
      <div>
        <label className={labelClass}>Unggah logo atau foto</label>

        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') fileInputRef.current?.click();
          }}
          className={`relative w-full rounded-xl border-2 border-dashed px-3 py-4 text-center cursor-pointer transition-colors ${
            isDragging
              ? 'border-teal-500 bg-teal-50'
              : 'border-slate-300 bg-slate-50 hover:border-teal-400 hover:bg-teal-50/40'
          }`}
        >
          {cover.logo ? (
            <div className="flex flex-col items-center space-y-2">
              <img
                src={cover.logo}
                alt="Logo pada cover"
                className="max-h-20 max-w-full object-contain"
              />
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  removeLogo();
                }}
                className="inline-flex items-center space-x-1 text-[11px] font-medium text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-3 h-3" />
                <span>Hapus logo</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-1 text-slate-500">
              {isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin text-teal-500" />
              ) : (
                <ImagePlus className="w-5 h-5 text-slate-400" />
              )}
              <span className="text-[11px] leading-relaxed">
                Gambar: klik, tarik ke sini, atau tempel (Ctrl+V)
              </span>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void applyLogoFile(file);
            event.target.value = '';
          }}
        />

        <label className="mt-2 flex items-center space-x-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={cover.showLogo}
            onChange={(event) => onChange({ showLogo: event.target.checked })}
            className="w-3.5 h-3.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
          />
          <span className="text-[11px] text-slate-600">Tampilkan area logo di cover</span>
        </label>
      </div>

      {/* Jenis dokumen & judul */}
      <div>
        <label className={labelClass} htmlFor="cover-document-type">
          Jenis dokumen
        </label>
        <input
          id="cover-document-type"
          list="cover-document-types"
          value={cover.documentType}
          onChange={(event) => onChange({ documentType: event.target.value })}
          placeholder="Makalah"
          className={inputClass}
        />
        <datalist id="cover-document-types">
          {DOCUMENT_TYPE_OPTIONS.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      </div>

      <div>
        <label className={labelClass} htmlFor="cover-title">
          Judul
        </label>
        <textarea
          id="cover-title"
          value={cover.title}
          onChange={(event) => onChange({ title: event.target.value })}
          rows={2}
          placeholder="Judul makalah / skripsi"
          className={`${inputClass} resize-none leading-relaxed`}
        />
      </div>

      {/* Mata kuliah & dosen */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelClass} htmlFor="cover-course">
            Mata kuliah
          </label>
          <input
            id="cover-course"
            value={cover.course}
            onChange={(event) => onChange({ course: event.target.value })}
            placeholder="Contoh: Pemrograman"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="cover-lecturer">
            Dosen pengampu
          </label>
          <input
            id="cover-lecturer"
            value={cover.lecturer}
            onChange={(event) => onChange({ lecturer: event.target.value })}
            placeholder="Nama dosen"
            className={inputClass}
          />
        </div>
      </div>

      {/* Program studi & departemen */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelClass} htmlFor="cover-study-program">
            Program studi
          </label>
          <input
            id="cover-study-program"
            value={cover.studyProgram}
            onChange={(event) => onChange({ studyProgram: event.target.value })}
            placeholder="Teknik Informatika"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="cover-department">
            Departemen (opsional)
          </label>
          <input
            id="cover-department"
            value={cover.department}
            onChange={(event) => onChange({ department: event.target.value })}
            placeholder="Kosongkan jika tidak ada"
            className={inputClass}
          />
        </div>
      </div>

      {/* Fakultas & institusi */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelClass} htmlFor="cover-faculty">
            Fakultas
          </label>
          <input
            id="cover-faculty"
            value={cover.faculty}
            onChange={(event) => onChange({ faculty: event.target.value })}
            placeholder="Fakultas Teknik"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="cover-institution">
            Institusi
          </label>
          <input
            id="cover-institution"
            value={cover.institution}
            onChange={(event) => onChange({ institution: event.target.value })}
            placeholder="Nama universitas"
            className={inputClass}
          />
        </div>
      </div>

      {/* Kota & tahun */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelClass} htmlFor="cover-city">
            Kota (tanda tangan)
          </label>
          <input
            id="cover-city"
            value={cover.city}
            onChange={(event) => onChange({ city: event.target.value })}
            placeholder="Jakarta"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="cover-year">
            Tahun
          </label>
          <input
            id="cover-year"
            value={cover.year}
            onChange={(event) => onChange({ year: event.target.value })}
            placeholder="2026"
            inputMode="numeric"
            className={inputClass}
          />
        </div>
      </div>

      {/* Anggota (cover) */}
      <div>
        <label className={labelClass}>Anggota (cover)</label>

        <div className="space-y-2">
          {cover.members.map((member, index) => (
            <div key={member.id} className="flex items-center gap-1.5">
              <input
                value={member.name}
                onChange={(event) => updateMember(member.id, { name: event.target.value })}
                placeholder={`Nama anggota ${index + 1}`}
                aria-label={`Nama anggota ${index + 1}`}
                className={cn(inputClass, 'flex-1 min-w-0')}
              />
              <input
                value={member.nim}
                onChange={(event) => updateMember(member.id, { nim: event.target.value })}
                placeholder="NIM"
                aria-label={`NIM anggota ${index + 1}`}
                className={cn(inputClass, 'w-28 shrink-0')}
              />
              <button
                type="button"
                onClick={() => removeMember(member.id)}
                title="Hapus anggota"
                aria-label={`Hapus anggota ${index + 1}`}
                className="shrink-0 p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addMember}
          className="mt-2 inline-flex items-center space-x-1 text-[11px] font-semibold text-teal-600 hover:text-teal-700"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah anggota</span>
        </button>
      </div>

      <p className="text-[11px] leading-relaxed text-slate-500 bg-slate-50 border border-slate-100 rounded-lg p-2.5">
        Pratinjau A4 memakai teks contoh untuk kolom yang masih kosong, misalnya{' '}
        <span className="font-mono text-slate-600">{COVER_PLACEHOLDERS.course}</span>. Teks contoh
        tidak ikut ke ekspor Word.
      </p>
    </div>
  );
};