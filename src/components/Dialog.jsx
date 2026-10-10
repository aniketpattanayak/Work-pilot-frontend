import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

/**
 * In-app popups that replace the browser's alert / confirm / prompt boxes.
 *   const ok = await dialog.confirm('Delete this task?', { danger: true, confirmText: 'Delete' });
 *   const text = await dialog.prompt('What needs correcting?', { required: true });   // null when cancelled
 *   await dialog.alert('Saved.', { tone: 'success' });
 * <DialogHost /> must be mounted once (the Dashboard does it). If it is not mounted, the browser boxes are used,
 * so a page never hangs waiting for a popup nobody can see.
 */
let listener = null;
let hosts = 0;

const open = (cfg) => new Promise((resolve) => {
  if (!hosts || !listener) {
    if (cfg.kind === 'confirm') return resolve(window.confirm(cfg.message));
    if (cfg.kind === 'prompt') return resolve(window.prompt(cfg.message, cfg.defaultValue || ''));
    window.alert(cfg.message);
    return resolve(true);
  }
  listener({ ...cfg, resolve });
});

export const dialog = {
  confirm: (message, opts = {}) => open({ kind: 'confirm', message, ...opts }),
  prompt: (message, opts = {}) => open({ kind: 'prompt', message, ...opts }),
  alert: (message, opts = {}) => open({ kind: 'alert', message, ...opts }),
};

const TONES = {
  danger: { Icon: AlertTriangle, ring: 'bg-red-500/10 text-red-500 border-red-500/20', btn: 'bg-red-600 hover:bg-red-500 text-white' },
  success: { Icon: CheckCircle2, ring: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', btn: 'bg-primary text-primary-foreground hover:opacity-90' },
  error: { Icon: AlertTriangle, ring: 'bg-red-500/10 text-red-500 border-red-500/20', btn: 'bg-primary text-primary-foreground hover:opacity-90' },
  info: { Icon: Info, ring: 'bg-primary/10 text-primary border-primary/20', btn: 'bg-primary text-primary-foreground hover:opacity-90' },
};

export const DialogHost = () => {
  const [queue, setQueue] = useState([]);
  const [text, setText] = useState('');
  const [touched, setTouched] = useState(false);
  const inputRef = useRef(null);
  const current = queue[0];

  useEffect(() => {
    hosts += 1;
    listener = (item) => setQueue((q) => [...q, item]);
    return () => { hosts -= 1; if (!hosts) listener = null; };
  }, []);

  useEffect(() => {
    setText(current?.defaultValue || '');
    setTouched(false);
  }, [current]);

  useEffect(() => {
    if (current?.kind === 'prompt' && inputRef.current) inputRef.current.focus();
  }, [current]);

  const finish = (value) => {
    if (!current) return;
    current.resolve(value);
    setQueue((q) => q.slice(1));
  };
  const cancel = () => finish(current.kind === 'confirm' ? false : current.kind === 'prompt' ? null : true);
  const accept = () => {
    if (current.kind === 'prompt') {
      const v = text.trim();
      if (current.required && !v) { setTouched(true); return; }
      finish(v);
    } else finish(true);
  };

  useEffect(() => {
    if (!current) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') cancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!current) return null;
  const tone = TONES[current.tone || (current.danger ? 'danger' : current.kind === 'alert' ? 'info' : 'info')] || TONES.info;
  const Icon = tone.Icon;
  const confirmText = current.confirmText || (current.kind === 'alert' ? 'OK' : current.kind === 'prompt' ? 'Submit' : 'Yes');
  const cancelText = current.cancelText || (current.kind === 'confirm' ? 'No' : 'Cancel');

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget && current.kind !== 'alert') cancel(); }}>
      <div role="dialog" aria-modal="true" className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-start gap-3 px-5 pt-5">
          <div className={`w-10 h-10 shrink-0 rounded-xl border flex items-center justify-center ${tone.ring}`}><Icon size={18} /></div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black uppercase tracking-tight text-foreground">{current.title || (current.kind === 'confirm' ? 'Please confirm' : current.kind === 'prompt' ? 'Details needed' : current.tone === 'success' ? 'Done' : current.tone === 'error' ? 'Something went wrong' : 'Notice')}</p>
            <p className="text-sm text-slate-500 mt-1 whitespace-pre-line break-words">{current.message}</p>
          </div>
          {current.kind !== 'alert' && (
            <button type="button" aria-label="Close" onClick={cancel} className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-slate-400"><X size={14} /></button>
          )}
        </div>
        {current.kind === 'prompt' && (
          <div className="px-5 pt-3">
            <textarea
              ref={inputRef}
              rows={3}
              value={text}
              placeholder={current.placeholder || ''}
              onChange={(e) => setText(e.target.value)}
              className={`w-full bg-background border px-3 py-2 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/30 resize-none ${touched && current.required && !text.trim() ? 'border-red-500' : 'border-border'}`}
            />
            {touched && current.required && !text.trim() && <p className="text-[11px] font-bold text-red-500 mt-1">This is required.</p>}
          </div>
        )}
        <div className="flex justify-end gap-2 px-5 py-4">
          {current.kind !== 'alert' && (
            <button type="button" onClick={cancel} className="px-4 py-2 rounded-xl border border-border bg-card text-foreground font-black text-[11px] uppercase tracking-wider hover:bg-background">{cancelText}</button>
          )}
          <button type="button" autoFocus={current.kind !== 'prompt'} onClick={accept} className={`px-5 py-2 rounded-xl font-black text-[11px] uppercase tracking-wider shadow ${tone.btn}`}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
};

export default DialogHost;
