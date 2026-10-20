import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

/**
 * One "Actions" button per row. Items: [{ key, label, onClick, tone? ('danger'), hint? }].
 * disabled = the task is finished (the button stays visible but greyed out).
 */
export default function ActionsMenu({ items, disabled = false, disabledTitle = '', className = '' }) {
  const btn = useRef(null);
  const panel = useRef(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const list = (items || []).filter(Boolean);

  useLayoutEffect(() => {
    if (!open || !btn.current) return;
    const r = btn.current.getBoundingClientRect();
    const w = 220;
    const h = Math.min(60 + list.length * 38, 360);
    const top = r.bottom + 6 + h > window.innerHeight ? Math.max(8, r.top - h - 6) : r.bottom + 6;
    setPos({ top, left: Math.max(8, Math.min(r.right - w, window.innerWidth - w - 8)), w });
  }, [open, list.length]);

  useEffect(() => {
    if (!open) return undefined;
    const down = (e) => { if (panel.current && !panel.current.contains(e.target) && btn.current && !btn.current.contains(e.target)) setOpen(false); };
    const key = (e) => { if (e.key === 'Escape') setOpen(false); };
    const openedAt = Date.now();
    const scroll = (e) => { if (Date.now() - openedAt < 400) return; if (panel.current && e.target && panel.current.contains(e.target)) return; setOpen(false); };
    document.addEventListener('mousedown', down); document.addEventListener('keydown', key); window.addEventListener('scroll', scroll, true);
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key); window.removeEventListener('scroll', scroll, true); };
  }, [open]);

  const off = disabled || list.length === 0;
  return (
    <>
      <button ref={btn} type="button" disabled={off} aria-haspopup="menu" aria-expanded={open}
        title={off ? (disabledTitle || 'No actions available') : 'Actions'}
        onClick={() => setOpen((o) => !o)}
        className={`px-3 py-1 rounded font-black text-[8px] uppercase tracking-widest border flex items-center justify-center gap-1 ${off ? 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700 cursor-not-allowed' : 'bg-slate-900 text-white border-slate-900 shadow-md hover:bg-slate-700 active:scale-95'} ${className}`}>
        Actions <ChevronDown size={10} />
      </button>
      {open && createPortal(
        <div ref={panel} role="menu" style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.w, zIndex: 1000000 }}
          className="bg-card border border-border rounded-xl shadow-2xl py-1.5 text-foreground">
          {list.map((it) => (
            <button key={it.key} type="button" role="menuitem" disabled={it.disabled}
              onClick={() => { setOpen(false); it.onClick && it.onClick(); }}
              className={`w-full text-left px-4 py-2 text-[11px] font-black uppercase tracking-widest hover:bg-muted disabled:opacity-40 ${it.tone === 'danger' ? 'text-red-600' : ''}`}>
              {it.label}
              {it.hint && <span className="block normal-case tracking-normal font-medium text-[10px] text-muted-foreground">{it.hint}</span>}
            </button>
          ))}
        </div>, document.body)}
    </>
  );
}
