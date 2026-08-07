import { useEffect } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'error';
}

interface ToastNotificationProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

export default function ToastNotification({ toasts, onRemove }: ToastNotificationProps) {
  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-2 max-w-sm w-full">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: ToastMessage; onRemove: (id: string) => void; key?: any }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  return (
    <div
      className={`flex items-center gap-3 p-4 rounded-xl border shadow-xl transition-all duration-300 transform translate-y-0 opacity-100 ${
        toast.type === 'success'
          ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300 shadow-emerald-950/20'
          : 'bg-red-950/90 border-red-500/30 text-red-300 shadow-red-950/20'
      } text-right`}
      dir="rtl"
    >
      <div className="shrink-0">
        {toast.type === 'success' ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
        ) : (
          <AlertCircle className="h-5 w-5 text-red-400" />
        )}
      </div>

      <div className="flex-1 text-xs font-bold leading-tight">
        {toast.text}
      </div>

      <button
        onClick={() => onRemove(toast.id)}
        className="text-gray-400 hover:text-white p-0.5 rounded transition-colors cursor-pointer"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
