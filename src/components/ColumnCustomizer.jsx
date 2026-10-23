import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { SlidersHorizontal, ArrowUp, ArrowDown, RotateCcw } from 'lucide-react';

/**
 * "Customize columns" button + popover. `ctl` is the object from useConfigurableColumns.
 * The panel is drawn in a portal so scrolling/overflow parents can never clip it.
 */
export default function ColumnCustomizer({ ctl, className = '' }) {
  const btn = useRef(null);
  const panel = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const open = ctl.editing;

  useLayoutEffect(() => {
    if (!open || !btn.current) return;
    const r = btn.current.getBoundingClientRect();
    const w = Math.min(320, window.innerWidth - 16);
    setPos({ top: Math.max(8, Math.min(r.bottom + 6, window.innerHeight - 300)), left: Math.max(8, Math.min(r.right - w, window.innerWidth - w - 8)), w });
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (panel.current && !panel.current.contains(e.target) && btn.current && !btn.current.contains(e.target)) ctl.cancelEdit(); };
    const onKey = (e) => { if (e.key === 'Escape') ctl.cancelEdit(); };
    document.addEventListener('mousedown', onDown); document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open, ctl]);

  const movable = ctl.allColumns.filter((c) => !c.pinEnd);
  const btnCls = 'px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50';

  return (
    <>
      <button ref={btn} type="button" onClick={() => (open ? ctl.cancelEdit() : ctl.startEdit())}
        className={`flex items-center gap-2 bg-card border border-border text-foreground px-3 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-muted active:scale-95 transition-all ${className}`}
        aria-haspopup="dialog" aria-expanded={open} data-testid="customize-columns">
        <SlidersHorizontal size={13} /> Columns
      </button>
      {open && createPortal(
        <div ref={panel} role="dialog" aria-label="Customize columns" data-testid="customize-panel"
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.w || 320, maxHeight: `calc(100vh - ${pos.top + 12}px)`, zIndex: 1000000 }}
          className="bg-card border border-border rounded-2xl shadow-2xl p-4 text-foreground flex flex-col">
          <p className="text-[11px] font-black uppercase tracking-widest mb-1">Customize columns</p>
          <p className="text-[10px] text-slate-500 mb-3">Tick what to show; use the arrows to change the order.</p>
          <ul className="flex-1 min-h-[120px] overflow-y-auto space-y-1 pr-1">
            {movable.map((c, i) => (
              <li key={c.key} className="flex items-center gap-2 bg-background border border-border rounded-xl px-2.5 py-1.5">
                <input type="checkbox" id={`cc-${c.key}`} checked={c.isVisible !== false} disabled={!!c.locked}
                  onChange={() => ctl.toggle(c.key)} className="w-4 h-4 accent-[hsl(var(--primary))]" />
                <label htmlFor={`cc-${c.key}`} className="flex-1 min-w-0 truncate text-xs font-bold cursor-pointer">{c.label}{c.custom && <span className="text-[9px] text-primary ml-1">custom</span>}</label>
                <button type="button" aria-label={`Move ${c.label} up`} disabled={i === 0} onClick={() => ctl.move(c.key, -1)} className="p-1 rounded-md hover:bg-muted disabled:opacity-30"><ArrowUp size={13} /></button>
                <button type="button" aria-label={`Move ${c.label} down`} disabled={i === movable.length - 1} onClick={() => ctl.move(c.key, 1)} className="p-1 rounded-md hover:bg-muted disabled:opacity-30"><ArrowDown size={13} /></button>
              </li>
            ))}
          </ul>
          {ctl.error && <p className="text-[10px] text-red-500 mt-2">{ctl.error}</p>}
          <div className="flex flex-wrap items-center gap-2 mt-3 shrink-0">
            <button type="button" disabled={ctl.busy} onClick={() => ctl.save('user')} className={`${btnCls} bg-primary text-primary-foreground`}>Save</button>
            {ctl.isAdmin && <button type="button" disabled={ctl.busy} onClick={() => ctl.save('company')} className={`${btnCls} bg-card border border-border`} title="Everyone without their own layout will see this">Save for everyone</button>}
            <button type="button" disabled={ctl.busy} onClick={() => ctl.reset('user')} className={`${btnCls} text-slate-500 flex items-center gap-1`} title="Back to the default columns"><RotateCcw size={11} /> Reset</button>
          </div>
        </div>, document.body)}
    </>
  );
}
