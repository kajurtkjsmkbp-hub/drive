import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, HelpCircle, X } from 'lucide-react';

export default function NotificationModal({ dialog, onClose }) {
  if (!dialog) return null;

  const {
    type = 'info', // 'success', 'error', 'warning', 'info', 'confirm'
    title,
    message,
    confirmText = 'Ya, Lanjutkan',
    cancelText = 'Batal',
    onConfirm,
    onCancel
  } = dialog;

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    onClose();
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    onClose();
  };

  const config = {
    success: {
      icon: CheckCircle2,
      defaultTitle: 'Berhasil',
      iconBg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
      btnColor: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    },
    error: {
      icon: AlertCircle,
      defaultTitle: 'Terjadi Kendala',
      iconBg: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
      btnColor: 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20',
      badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
    },
    warning: {
      icon: AlertTriangle,
      defaultTitle: 'Peringatan Sistem',
      iconBg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
      btnColor: 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20',
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    },
    confirm: {
      icon: HelpCircle,
      defaultTitle: 'Konfirmasi Tindakan',
      iconBg: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
      btnColor: 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20',
      badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    },
    info: {
      icon: Info,
      defaultTitle: 'Informasi Sistem',
      iconBg: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
      btnColor: 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20',
      badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
    }
  }[type] || {
    icon: Info,
    defaultTitle: 'Pemberitahuan',
    iconBg: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    btnColor: 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20',
    badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
  };

  const IconComponent = config.icon;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-black/60 relative overflow-hidden transform scale-100 transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Decorative Gradient Glow */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>

        {/* Close Icon on Top Right */}
        <button
          onClick={handleCancel}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          title="Tutup"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Big Modern Icon */}
        <div className="flex flex-col items-center text-center space-y-3 pt-1">
          <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center shadow-lg ${config.iconBg}`}>
            <IconComponent className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              {title || config.defaultTitle}
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-2 whitespace-pre-line px-2">
              {message}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center gap-3">
          {type === 'confirm' ? (
            <>
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs sm:text-sm font-semibold rounded-xl border border-slate-700 transition-all cursor-pointer"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className={`flex-1 py-2.5 px-4 text-xs sm:text-sm font-semibold rounded-xl shadow-lg transition-all cursor-pointer ${config.btnColor}`}
              >
                {confirmText}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleConfirm}
              className={`w-full py-2.5 px-4 text-xs sm:text-sm font-semibold rounded-xl shadow-lg transition-all cursor-pointer ${config.btnColor}`}
            >
              {confirmText || 'Mengerti'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
