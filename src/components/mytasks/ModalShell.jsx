import React from 'react';
import { X } from 'lucide-react';

export default function ModalShell({ title, subtitle, onClose, children, footer, wide = false }) {
  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 flex justify-center items-center p-3 sm:p-6" role="dialog" aria-label={title}>
      <div className={`bg-card w-full ${wide ? 'max-w-3xl' : 'max-w-md'} rounded-2xl border border-border shadow-2xl flex flex-col max-h-[92vh]`}>
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border shrink-0">
          <div className="min-w-0">
            <h3 className="font-black text-sm uppercase tracking-widest">{title}</h3>
            {subtitle && <p className="text-xs text-muted-foreground mt-1 break-words">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-full hover:bg-red-500/10 text-red-500 shrink-0"><X size={18} /></button>
        </div>
        <div className="p-5 overflow-y-auto flex-1 min-h-0">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-border shrink-0">{footer}</div>}
      </div>
    </div>
  );
}
