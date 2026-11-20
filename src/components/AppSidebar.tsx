import React from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  FileEdit,
  GraduationCap,
  Home
} from 'lucide-react';

export type NavPage = 'beranda' | 'editor' | 'pedoman';

interface AppSidebarProps {
  activePage: NavPage;
  onNavigate: (page: NavPage) => void;
  hasDocument: boolean;
  docTitle?: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const NAV_ITEMS: Array<{
  page: NavPage;
  label: string;
  hint: string;
  Icon: typeof Home;
}> = [
  { page: 'beranda', label: 'Beranda', hint: 'Beranda & unggah dokumen', Icon: Home },
  { page: 'editor', label: 'Editor & Pratinjau', hint: 'Editor & pratinjau dokumen A4', Icon: FileEdit },
  { page: 'pedoman', label: 'Pedoman Kampus', hint: 'Pedoman format makalah & skripsi', Icon: BookOpen }
];

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activePage,
  onNavigate,
  hasDocument,
  docTitle,
  isCollapsed,
  onToggleCollapse
}) => {
  return (
    <aside
      className={`bg-slate-900 text-white flex flex-col shrink-0 z-30 select-none no-print overflow-hidden border-r border-slate-800 transition-[width] duration-200 ease-out ${
        isCollapsed ? 'w-[96px]' : 'w-[232px]'
      }`}
    >
      {/* Header: susunan sama di kedua keadaan (logo kiri, tombol kanan). */}
      <div className="relative h-16 shrink-0 border-b border-white/10 flex items-center gap-2 px-3">
        {!isCollapsed && (
        <button
          type="button"
          onClick={() => onNavigate('beranda')}
          title="Ke beranda"
          className="flex items-center gap-2.5 rounded-lg min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
        >
          <span
            className={`grid place-items-center rounded-xl bg-teal-600 text-white shrink-0 shadow-sm shadow-black/20 ${
              isCollapsed ? 'w-7 h-7' : 'w-9 h-9'
            }`}
          >
            <GraduationCap className={isCollapsed ? 'w-4 h-4' : 'w-5 h-5'} aria-hidden />
          </span>
          <span className="flex flex-col min-w-0 text-left">
            <span className="text-sm font-bold leading-tight tracking-tight">
              Skripsi<span className="text-teal-400">Rapi</span>
            </span>
            <span className="text-[11px] leading-tight text-slate-400 truncate">
              Standar Akademik RI
            </span>
          </span>
        </button>
        )}

        <button
          type="button"
          onClick={onToggleCollapse}
          aria-expanded={!isCollapsed}
          aria-controls="app-rail-nav"
          aria-label={isCollapsed ? 'Tampilkan menu' : 'Sembunyikan menu'}
          title={isCollapsed ? 'Tampilkan menu' : 'Sembunyikan menu'}
          className={`grid place-items-center shrink-0 rounded-lg bg-white/[0.07] text-slate-300 ring-1 ring-inset ring-white/10 hover:bg-white/15 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 ${
            isCollapsed ? 'mx-auto w-9 h-9' : 'ml-auto w-6 h-6'
          }`}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" aria-hidden />
          ) : (
            <ChevronLeft className="w-4 h-4" aria-hidden />
          )}
        </button>
      </div>

      <nav id="app-rail-nav" className="shrink-0 p-2 space-y-1">
        {NAV_ITEMS.map(({ page, label, hint, Icon }) => {
          const isActive = activePage === page;
          return (
            <button
              key={page}
              type="button"
              onClick={() => onNavigate(page)}
              aria-current={isActive ? 'page' : undefined}
              title={isCollapsed ? label : hint}
              className={`relative flex items-center h-10 w-full rounded-lg text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 ${
                isCollapsed ? 'justify-center' : 'gap-3 px-2.5'
              } ${
                isActive
                  ? 'bg-teal-600 text-white ring-1 ring-inset ring-teal-400/30'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="w-[18px] h-[18px] shrink-0" aria-hidden />
              {!isCollapsed && <span className="truncate">{label}</span>}
              {isCollapsed && page === 'editor' && hasDocument && (
                <span
                  aria-hidden
                  className="absolute right-2 top-2 w-1.5 h-1.5 rounded-full bg-emerald-400"
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Kartu dokumen menempel di bawah menu, bukan menggantung di dasar rail. */}
      {hasDocument && activePage !== 'editor' && (
        <div className={`mx-2 rounded-xl border border-white/10 bg-white/[0.04] ${isCollapsed ? 'p-1.5' : 'p-2.5'}`}>
          {isCollapsed ? (
            <button
              type="button"
              onClick={() => onNavigate('editor')}
              title={docTitle ? `Buka ${docTitle}` : 'Buka dokumen'}
              aria-label={docTitle ? `Buka ${docTitle}` : 'Buka dokumen'}
              className="grid place-items-center w-full h-8 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
            >
              <FileEdit className="w-4 h-4" aria-hidden />
            </button>
          ) : (
            <>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden />
                <span>Dokumen aktif</span>
              </div>
              <div className="mt-1 text-xs font-medium text-slate-200 truncate">
                {docTitle || 'MAKALAH.docx'}
              </div>
              <button
                type="button"
                onClick={() => onNavigate('editor')}
                className="mt-2 w-full rounded-lg bg-teal-500/15 py-1.5 text-[11px] font-semibold text-teal-300 hover:bg-teal-500/25 hover:text-teal-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
              >
                Buka editor
              </button>
            </>
          )}
        </div>
      )}

      <div className="flex-1" />

      {!isCollapsed && (
        <div className="shrink-0 border-t border-white/10 px-3 py-2 text-[11px] text-slate-500">
          v1.0
        </div>
      )}
    </aside>
  );
};