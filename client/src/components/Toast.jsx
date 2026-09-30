import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ toasts = [], onRemove }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-6 z-[90] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, toast.duration || 4000);
    return () => clearTimeout(timer);
  }, [toast, onRemove]);

  const config = {
    success: {
      icon: CheckCircle2,
      border: 'border-emerald-500/40',
      glow: 'shadow-emerald-500/10',
      iconBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
    },
    error: {
      icon: AlertCircle,
      border: 'border-rose-500/40',
      glow: 'shadow-rose-500/10',
      iconBg: 'bg-rose-500/15 border-rose-500/30 text-rose-400'
    },
    info: {
      icon: Info,
      border: 'border-blue-500/40',
      glow: 'shadow-blue-500/10',
      iconBg: 'bg-blue-500/15 border-blue-500/30 text-blue-400'
    }
  }[toast.type || 'success'] || {
    icon: CheckCircle2,
    border: 'border-emerald-500/40',
    glow: 'shadow-emerald-500/10',
    iconBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
  };

  const Icon = config.icon;

  return (
    <div className={`pointer-events-auto p-4 bg-slate-900/95 border ${config.border} shadow-2xl ${config.glow} rounded-2xl backdrop-blur-md flex items-start gap-3.5 animate-in slide-in-from-right duration-300 transition-all`}>
      <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${config.iconBg}`}>
        <Icon className="w-5 h-5" />
      </div>

      <div className="flex-1 min-w-0 pr-1">
        <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight">
          {toast.title || 'Pemberitahuan'}
        </h4>
        <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 leading-relaxed line-clamp-2">
          {toast.message}
        </p>
      </div>

      <button
        onClick={() => onRemove(toast.id)}
        className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
        title="Tutup"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
