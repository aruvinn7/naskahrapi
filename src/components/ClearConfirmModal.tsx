import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { Button } from './ui/button';

interface ClearConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const ClearConfirmModal: React.FC<ClearConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-md overflow-hidden animate-in zoom-in-95">
        <div className="p-6 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm md:text-base">
                Kosongkan Editor Dokumen?
              </h3>
              <p className="text-xs text-slate-500">
                Mereset naskah aktif untuk memulai dokumen baru
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
            Seluruh isi makalah atau skripsi yang saat ini ada di editor akan dikosongkan. Pastikan Anda telah mengunduh file (.docx) jika masih membutuhkannya.
          </p>

          <div className="flex items-center justify-end space-x-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="space-x-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Ya, Kosongkan Editor</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
