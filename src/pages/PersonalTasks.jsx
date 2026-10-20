import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import API from '../api/axiosConfig';
import { dialog } from '../components/Dialog';
import DynamicFieldRenderer from '../components/DynamicFieldRenderer';
import FormField, { FIELD_GRID } from '../components/FormField';
import useFormLayout from '../hooks/useFormLayout';
import {
  Plus, X, GripVertical, ArrowUpToLine, Share2, Pencil, Trash2, Check, Repeat,
  CalendarDays, Lock, RefreshCcw, ListChecks, Users,
} from 'lucide-react';

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayStr = () => ymd(new Date());
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FREQS = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Half-Yearly', 'Yearly', 'Interval'];
const FREQ_LABEL = { Interval: 'Every few days', 'Half-Yearly': 'Every 6 months', Quarterly: 'Every 3 months' };
const niceDate = (s) => {
  if (!s) return '';
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};
const repeatText = (t) => {
  const c = t.frequencyConfig || {};
  if (t.frequency === 'Weekly') return `Weekly · ${(c.daysOfWeek || []).map((d) => DOW[d]).join(', ')}`;
  if (t.frequency === 'Monthly') return `Monthly · day ${(c.daysOfMonth || []).join(', ')}`;
  if (t.frequency === 'Interval') return `Every ${c.intervalDays || 1} days`;
  return FREQ_LABEL[t.frequency] || t.frequency;
};
const PRIORITY_STYLE = {
  High: 'bg-red-500/10 text-red-500 border-red-500/20',
  Medium: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  Low: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
};
const errMsg = (e, fallback) => e?.response?.data?.message || fallback;

const blankForm = () => ({
  id: null, type: 'Task', title: '', notes: '', priority: 'Medium', dueDate: '',
  frequency: 'Daily', daysOfWeek: [1], daysOfMonth: [1], intervalDays: 2, startDate: todayStr(),
});

/* ───────────────────────── Add / edit form ───────────────────────── */
const ItemForm = ({ initial, onClose, onSaved }) => {
  const [f, setF] = useState(initial);
  const L = useFormLayout('personal'); // company's own order / names / hidden fields (Settings > Form designer)
  const [customValues, setCustomValues] = useState(initial.customFields || {});
  const [saving, setSaving] = useState(false);
  const editing = !!f.id;
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const toggle = (k, v) => setF((p) => ({ ...p, [k]: p[k].includes(v) ? p[k].filter((x) => x !== v) : [...p[k], v] }));

  const save = async () => {
    if (!f.title.trim()) return dialog.alert('Please enter a title.', { title: 'Title needed', tone: 'error' });
    const missing = L.firstMissing({ notes: f.notes, priority: f.priority, ...(f.type === 'Task' ? { dueDate: f.dueDate } : {}) });
    if (missing) return dialog.alert(missing, { title: 'Check the form', tone: 'error' });
    const body = { title: f.title, notes: f.notes, priority: f.priority, today: todayStr(), customFields: customValues };
    if (f.type === 'Task') body.dueDate = f.dueDate || '';
    else {
      body.frequency = f.frequency; body.startDate = f.startDate;
      body.frequencyConfig = { daysOfWeek: f.daysOfWeek, daysOfMonth: f.daysOfMonth, intervalDays: Number(f.intervalDays) || 1 };
    }
    if (!editing) body.type = f.type;
    setSaving(true);
    try {
      if (editing) await API.put(`/tasks/personal/${f.id}`, body);
      else await API.post('/tasks/personal', body);
      onSaved();
    } catch (e) {
      dialog.alert(errMsg(e, 'Could not save. Please try again.'), { title: 'Not saved', tone: 'error' });
    } finally { setSaving(false); }
  };

  const input = 'w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary';
  const label = 'block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5';
  const chip = (on) => `px-3 py-2 min-h-[40px] rounded-lg border text-xs font-black transition-all ${on ? 'bg-primary text-white border-primary' : 'bg-background text-slate-500 border-border'}`;

  return (
    <div className="fixed inset-0 z-[9000] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div className="bg-card border border-border w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-foreground font-black uppercase tracking-tight text-base">{editing ? 'Edit item' : 'New personal item'}</h3>
          <button onClick={onClose} className="p-2 -mr-2 text-slate-500" aria-label="Close"><X size={20} /></button>
        </div>

        {!editing && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[['Task', 'One-time to-do', ListChecks], ['Checklist', 'Repeats', Repeat]].map(([t, sub, Icon]) => (
              <button key={t} onClick={() => set('type', t)} className={`p-3 rounded-xl border text-left transition-all ${f.type === t ? 'bg-primary/10 border-primary text-primary' : 'bg-background border-border text-slate-500'}`}>
                <Icon size={16} className="mb-1" />
                <div className="font-black text-xs uppercase tracking-wider">{t === 'Task' ? 'To-do' : 'Checklist'}</div>
                <div className="text-[10px] opacity-70">{sub}</div>
              </button>
            ))}
          </div>
        )}

        <div className={FIELD_GRID}>
          <FormField L={L} id="title" full><span className={label}>{L.label('title', 'Title')}</span><input className={input} value={f.title} maxLength={200} onChange={(e) => set('title', e.target.value)} placeholder="What do you want to remember?" autoFocus /></FormField>
          <FormField L={L} id="notes" full><span className={label}>{L.label('notes', 'Notes')}{L.required('notes') ? '' : ' (optional)'}</span><textarea className={input} rows={2} value={f.notes} maxLength={2000} onChange={(e) => set('notes', e.target.value)} /></FormField>
          <FormField L={L} id="priority" full>
            <span className={label}>{L.label('priority', 'Priority')}</span>
            <div className="flex gap-2">{['Low', 'Medium', 'High'].map((p) => <button key={p} onClick={() => set('priority', p)} className={`flex-1 ${chip(f.priority === p)}`}>{p}</button>)}</div>
          </FormField>
          {f.type === 'Task' ? (
            <FormField L={L} id="dueDate" full>
              <div><span className={label}>{L.label("dueDate", "Due date")}{L.required("dueDate") ? "" : " (optional)"}</span><input type="date" className={input} value={f.dueDate} onChange={(e) => set('dueDate', e.target.value)} /></div>
            </FormField>
          ) : (
            <FormField L={L} id="schedule" full>
              <div className="space-y-3">
              <div>
                  <span className={label}>How often</span>
                  <select className={input} value={f.frequency} onChange={(e) => set('frequency', e.target.value)}>
                    {FREQS.map((x) => <option key={x} value={x}>{x === 'Interval' ? 'Every few days' : x}</option>)}
                  </select>
                </div>
                {f.frequency === 'Weekly' && (
                  <div><span className={label}>On these days</span>
                    <div className="flex flex-wrap gap-1.5">{DOW.map((d, i) => <button key={d} onClick={() => toggle('daysOfWeek', i)} className={chip(f.daysOfWeek.includes(i))}>{d}</button>)}</div>
                  </div>
                )}
                {f.frequency === 'Monthly' && (
                  <div><span className={label}>On these dates</span>
                    <div className="grid grid-cols-7 gap-1">{Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <button key={d} onClick={() => toggle('daysOfMonth', d)} className={`!px-0 ${chip(f.daysOfMonth.includes(d))}`}>{d}</button>)}</div>
                  </div>
                )}
                {f.frequency === 'Interval' && (
                  <div><span className={label}>Repeat every (days)</span><input type="number" min={1} max={365} className={input} value={f.intervalDays} onChange={(e) => set('intervalDays', e.target.value)} /></div>
                )}
                <div><span className={label}>Starts on</span><input type="date" className={input} value={f.startDate} onChange={(e) => set('startDate', e.target.value)} /></div>
              </div>
            </FormField>
          )}
          <DynamicFieldRenderer variant="plain" fields={L.customFields} layout={L} entity="personal" values={customValues} requireOnCreate={!editing} onChange={(name, value) => setCustomValues((v) => ({ ...v, [name]: value }))} />
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 min-h-[46px] rounded-xl border border-border text-slate-500 font-black text-xs uppercase tracking-widest">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 min-h-[46px] rounded-xl bg-primary text-white font-black text-xs uppercase tracking-widest disabled:opacity-60">{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
};

/* ───────────────────────── Share dialog ───────────────────────── */
const ShareDialog = ({ item, onClose, onSaved }) => {
  const [opts, setOpts] = useState(null);
  const [sel, setSel] = useState(item.sharedWith || []);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    API.get('/tasks/personal/share-options').then((r) => setOpts(r.data || [])).catch(() => setOpts([]));
  }, []);
  const toggle = (id) => setSel((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const save = async () => {
    setSaving(true);
    try { await API.put(`/tasks/personal/${item._id}/share`, { sharedWith: sel }); onSaved(); }
    catch (e) { dialog.alert(errMsg(e, 'Could not update sharing.'), { title: 'Not saved', tone: 'error' }); }
    finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 z-[9000] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div className="bg-card border border-border w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-foreground font-black uppercase tracking-tight text-base">Show to my assigner</h3>
          <button onClick={onClose} className="p-2 -mr-2 text-slate-500" aria-label="Close"><X size={20} /></button>
        </div>
        <p className="text-xs text-slate-500 mb-4">They can only view “{item.title}”. They cannot change it, and it never counts as your work.</p>
        {opts === null ? <div className="py-6 text-center text-slate-500 text-sm">Loading…</div>
          : opts.length === 0 ? <div className="py-6 text-center text-slate-500 text-sm">No assigner is mapped to you yet. Ask your Admin to map one in PC Mapping.</div>
            : (
              <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                {opts.map((o) => (
                  <label key={o._id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer min-h-[48px] ${sel.includes(o._id) ? 'border-primary bg-primary/5' : 'border-border bg-background'}`}>
                    <input type="checkbox" className="w-5 h-5 accent-primary" checked={sel.includes(o._id)} onChange={() => toggle(o._id)} />
                    <span className="text-sm font-bold text-foreground">{o.name}</span>
                    {o.department && <span className="text-[10px] text-slate-500 ml-auto">{o.department}</span>}
                  </label>
                ))}
              </div>
            )}
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 min-h-[46px] rounded-xl border border-border text-slate-500 font-black text-xs uppercase tracking-widest">Cancel</button>
          {opts && opts.length > 0 && <button onClick={save} disabled={saving} className="flex-1 min-h-[46px] rounded-xl bg-primary text-white font-black text-xs uppercase tracking-widest disabled:opacity-60">{saving ? 'Saving…' : 'Save'}</button>}
        </div>
      </div>
    </div>
  );
};

/* ───────────────────────── Page ───────────────────────── */
const PersonalTasks = () => {
  const [items, setItems] = useState([]);
  const [shared, setShared] = useState([]);
  const [loading, setLoading] = useState(true);
  const [off, setOff] = useState(false);
  const [tab, setTab] = useState('mine');
  const [filter, setFilter] = useState('All');
  const [form, setForm] = useState(null);
  const [shareFor, setShareFor] = useState(null);
  const [dragId, setDragId] = useState(null);
  const listRef = useRef(null);
  const startOrder = useRef('');
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const load = useCallback(async () => {
    const q = `?today=${todayStr()}`;
    try {
      const [m, s] = await Promise.all([
        API.get(`/tasks/personal${q}`),
        API.get(`/tasks/personal/shared-with-me${q}`).catch(() => ({ data: [] })),
      ]);
      setItems(m.data || []); setShared(s.data || []);
    } catch (e) {
      if (e?.response?.status === 403 && e.response.data?.disabled) setOff(true);
      else dialog.alert(errMsg(e, 'Could not load your list.'), { title: 'Load failed', tone: 'error' });
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => items.filter((t) => {
    if (filter === 'To do') return t.type === 'Task' && !t.done;
    if (filter === 'Repeating') return t.type === 'Checklist';
    if (filter === 'Done') return t.type === 'Task' && t.done;
    return true;
  }), [items, filter]);

  const persistOrder = async (list) => {
    try { await API.put('/tasks/personal/reorder', { orderedIds: list.map((t) => t._id) }); }
    catch (e) { dialog.alert(errMsg(e, 'Could not save the new order.'), { title: 'Not saved', tone: 'error' }); load(); }
  };

  // Put the visible items (in their new relative order) back into the slots they occupied in the full list.
  const mergeVisible = (full, vis) => {
    const ids = new Set(vis.map((v) => v._id)); let i = 0;
    return full.map((t) => (ids.has(t._id) ? vis[i++] : t));
  };

  const moveToTop = (id) => {
    const t = items.find((x) => x._id === id); if (!t) return;
    const next = [t, ...items.filter((x) => x._id !== id)];
    setItems(next); persistOrder(next);
  };

  /* drag with pointer events: works for mouse and touch, no extra library */
  const ptr = useRef({ x: 0, y: 0 });
  const raf = useRef(0);
  const scroller = () => {
    let el = listRef.current;
    while (el && el !== document.body) {
      const o = getComputedStyle(el).overflowY;
      if ((o === 'auto' || o === 'scroll') && el.scrollHeight > el.clientHeight) return el;
      el = el.parentElement;
    }
    return document.scrollingElement;
  };
  const reorderAt = (id, x, y) => {
    const el = document.elementFromPoint(x, y)?.closest?.('[data-pid]');
    const overId = el?.getAttribute('data-pid');
    if (!overId || overId === id) return;
    setItems((prev) => {
      const vis = prev.filter((t) => visible.some((v) => v._id === t._id));
      const from = vis.findIndex((t) => t._id === id), to = vis.findIndex((t) => t._id === overId);
      if (from < 0 || to < 0) return prev;
      const moved = [...vis]; const [m] = moved.splice(from, 1); moved.splice(to, 0, m);
      return mergeVisible(prev, moved);
    });
  };
  const stopLoop = () => { cancelAnimationFrame(raf.current); raf.current = 0; };
  const onHandleDown = (e, id) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    startOrder.current = itemsRef.current.map((t) => t._id).join(',');
    ptr.current = { x: e.clientX, y: e.clientY };
    setDragId(id);
    // keep scrolling while the finger is near the top or bottom edge, so long lists can be reordered
    const loop = () => {
      const { x, y } = ptr.current; const edge = 90; const sc = scroller();
      let dy = 0;
      if (y < edge) dy = -Math.ceil((edge - y) / 6); else if (y > window.innerHeight - edge) dy = Math.ceil((y - (window.innerHeight - edge)) / 6);
      if (dy && sc) { sc.scrollTop += dy; reorderAt(id, x, y); }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
  };
  const onHandleMove = (e) => {
    if (!dragId) return;
    ptr.current = { x: e.clientX, y: e.clientY };
    reorderAt(dragId, e.clientX, e.clientY);
  };
  const onHandleUp = () => {
    if (!dragId) return;
    stopLoop(); setDragId(null);
    const now = itemsRef.current;
    if (now.map((t) => t._id).join(',') !== startOrder.current) persistOrder(now);
  };
  useEffect(() => stopLoop, []);

  const tick = async (t) => {
    try {
      const r = await API.post(`/tasks/personal/${t._id}/complete`, { today: todayStr(), ...(t.type === 'Task' ? { done: !t.done } : {}) });
      setItems((p) => p.map((x) => (x._id === t._id ? { ...x, ...r.data } : x)));
    } catch (e) { dialog.alert(errMsg(e, 'Could not update.'), { title: 'Not updated', tone: 'error' }); }
  };
  const remove = async (t) => {
    const yes = await dialog.confirm(`Delete “${t.title}”? This cannot be undone.`, { title: 'Delete item', danger: true, confirmText: 'Delete' });
    if (!yes) return;
    try { await API.delete(`/tasks/personal/${t._id}`); setItems((p) => p.filter((x) => x._id !== t._id)); }
    catch (e) { dialog.alert(errMsg(e, 'Could not delete.'), { title: 'Not deleted', tone: 'error' }); }
  };
  const edit = (t) => setForm({
    id: t._id, type: t.type, title: t.title, notes: t.notes || '', priority: t.priority || 'Medium', dueDate: t.dueDate || '',
    frequency: t.frequency || 'Daily', daysOfWeek: t.frequencyConfig?.daysOfWeek?.length ? t.frequencyConfig.daysOfWeek : [1],
    daysOfMonth: t.frequencyConfig?.daysOfMonth?.length ? t.frequencyConfig.daysOfMonth : [1],
    intervalDays: t.frequencyConfig?.intervalDays || 2, startDate: t.startDate || todayStr(), customFields: t.customFields || {},
  });

  const statusLine = (t) => {
    if (t.type === 'Checklist') {
      if (t.doneToday) return { text: `Done today ✓ · next ${niceDate(t.nextDueDate)}`, cls: 'text-emerald-600' };
      if (t.dueNow) return { text: t.nextDueDate < todayStr() ? `Due since ${niceDate(t.nextDueDate)}` : 'Due today', cls: t.nextDueDate < todayStr() ? 'text-red-500' : 'text-amber-600' };
      return { text: `Next ${niceDate(t.nextDueDate)}`, cls: 'text-slate-500' };
    }
    if (t.done) return { text: 'Done', cls: 'text-emerald-600' };
    if (t.dueDate) return { text: `${t.overdue ? 'Overdue · ' : 'Due '}${niceDate(t.dueDate)}`, cls: t.overdue ? 'text-red-500' : 'text-slate-500' };
    return null;
  };

  const renderRow = (t, readOnly) => {
    const st = statusLine(t);
    const isChecklist = t.type === 'Checklist';
    const checked = isChecklist ? t.doneToday : t.done;
    const canTick = !readOnly && (isChecklist ? t.dueNow && !t.doneToday : true);
    return (
      <div key={t._id} data-pid={t._id} className={`bg-card border rounded-2xl p-3 sm:p-4 flex flex-wrap sm:flex-nowrap gap-2.5 items-start transition-shadow ${dragId === t._id ? 'border-primary shadow-xl ring-2 ring-primary/30 scale-[1.01]' : 'border-border shadow-sm'}`}>
        {!readOnly && (
          <button
            onPointerDown={(e) => onHandleDown(e, t._id)} onPointerMove={onHandleMove} onPointerUp={onHandleUp} onPointerCancel={onHandleUp}
            style={{ touchAction: 'none' }} aria-label="Drag to reorder" title="Hold and drag"
            className="shrink-0 w-8 h-10 -ml-1 flex items-center justify-center text-slate-400 cursor-grab active:cursor-grabbing"
          ><GripVertical size={18} /></button>
        )}
        <button
          onClick={() => canTick && tick(t)} disabled={!canTick} aria-label={checked ? 'Mark not done' : 'Mark done'}
          className={`shrink-0 w-8 h-8 mt-0.5 rounded-lg border-2 flex items-center justify-center transition-all ${checked ? 'bg-emerald-500 border-emerald-500 text-white' : canTick ? 'border-slate-400 text-transparent hover:border-primary' : 'border-border text-transparent opacity-40'}`}
        ><Check size={16} strokeWidth={3} /></button>
        <div className="min-w-0 flex-1">
          <div data-title className={`font-bold text-sm sm:text-base break-words ${t.done ? 'line-through text-slate-400' : 'text-foreground'}`}>{t.title}</div>
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${PRIORITY_STYLE[t.priority] || PRIORITY_STYLE.Medium}`}>{t.priority}</span>
            {isChecklist && <span className="text-[10px] font-bold text-primary flex items-center gap-1"><Repeat size={11} />{repeatText(t)}</span>}
            {st && <span className={`text-[10px] font-bold flex items-center gap-1 ${st.cls}`}><CalendarDays size={11} />{st.text}</span>}
            {!readOnly && (t.sharedWith || []).length > 0 && <span className="text-[10px] font-bold text-sky-500 flex items-center gap-1"><Share2 size={11} />Shared</span>}
            {readOnly && <span className="text-[10px] font-black text-primary flex items-center gap-1"><Users size={11} />{t.ownerName}</span>}
          </div>
          {t.notes ? <p className="text-xs text-slate-500 mt-1.5 whitespace-pre-wrap break-words">{t.notes}</p> : null}
        </div>
        {!readOnly && (
          <div className="shrink-0 w-full sm:w-auto order-last sm:order-none flex flex-row justify-end gap-0.5 sm:-mr-1 border-t border-border/60 sm:border-0 pt-1.5 sm:pt-0 mt-1 sm:mt-0">
            <button onClick={() => moveToTop(t._id)} className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:text-primary hover:bg-primary/10" title="Move to top" aria-label="Move to top"><ArrowUpToLine size={16} /></button>
            <button onClick={() => setShareFor(t)} className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:text-sky-500 hover:bg-sky-500/10" title="Show to my assigner" aria-label="Share"><Share2 size={16} /></button>
            <button onClick={() => edit(t)} className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:text-foreground hover:bg-muted" title="Edit" aria-label="Edit"><Pencil size={16} /></button>
            <button onClick={() => remove(t)} className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-500 hover:bg-red-500/10" title="Delete" aria-label="Delete"><Trash2 size={16} /></button>
          </div>
        )}
      </div>
    );
  };

  const tabBtn = (id, text, count) => (
    <button onClick={() => setTab(id)} className={`flex-1 min-h-[44px] rounded-xl border font-black text-[11px] uppercase tracking-widest transition-all ${tab === id ? 'bg-primary text-white border-primary' : 'bg-card text-slate-500 border-border'}`}>
      {text}{count > 0 ? ` (${count})` : ''}
    </button>
  );

  if (off) {
    return (
      <div className="w-full max-w-3xl mx-auto py-20 text-center">
        <Lock size={28} className="mx-auto text-slate-400 mb-3" />
        <p className="text-sm font-bold text-foreground">Personal Tasks is switched off for your company.</p>
        <p className="text-xs text-slate-500 mt-1">Please ask your Work-Pilot administrator if you need it.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto pb-24">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h2 className="text-foreground text-lg sm:text-xl font-black tracking-tighter uppercase leading-none">Personal Tasks</h2>
          <p className="text-slate-500 text-[11px] mt-1.5 flex items-center gap-1.5"><Lock size={11} /> Only you can see this. It is not counted in points, reports or your task score.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={load} className="bg-card border border-border min-h-[44px] min-w-[44px] rounded-lg flex items-center justify-center text-primary" aria-label="Refresh"><RefreshCcw size={14} /></button>
          <button onClick={() => setForm(blankForm())} className="bg-primary text-white min-h-[44px] px-4 rounded-lg font-black text-[11px] uppercase tracking-widest flex items-center gap-1.5"><Plus size={14} /> Add</button>
        </div>
      </div>

      {(shared.length > 0) && <div className="flex gap-2 mb-3">{tabBtn('mine', 'My list', 0)}{tabBtn('shared', 'Shared with me', shared.length)}</div>}

      {tab === 'mine' ? (
        <>
          <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2">
            {['All', 'To do', 'Repeating', 'Done'].map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`shrink-0 px-3.5 min-h-[36px] rounded-full border text-[11px] font-black uppercase tracking-wider ${filter === f ? 'bg-foreground text-background border-foreground' : 'bg-card text-slate-500 border-border'}`}>{f}</button>
            ))}
          </div>
          {loading ? <div className="py-16 text-center text-slate-500 text-sm">Loading…</div>
            : visible.length === 0 ? (
              <div className="py-14 text-center border border-dashed border-border rounded-2xl">
                <ListChecks size={28} className="mx-auto text-slate-400 mb-2" />
                <p className="text-sm font-bold text-foreground">{items.length ? 'Nothing here for this filter' : 'Your list is empty'}</p>
                <p className="text-xs text-slate-500 mt-1">{items.length ? 'Try another filter.' : 'Tap Add to create a to-do or a repeating checklist.'}</p>
              </div>
            ) : (
              <div ref={listRef} className="space-y-2.5">
                {visible.map((t) => renderRow(t, false))}
              </div>
            )}
          {visible.length > 1 && <p className="text-center text-[10px] text-slate-500 mt-4">Hold the dots on the left and drag to reorder, or use the arrow to send an item to the top.</p>}
        </>
      ) : (
        <div className="space-y-2.5">
          <p className="text-[11px] text-slate-500 mb-1">Items your team members chose to show you. View only.</p>
          {shared.map((t) => renderRow(t, true))}
        </div>
      )}

      {form && <ItemForm initial={form} onClose={() => setForm(null)} onSaved={() => { setForm(null); load(); }} />}
      {shareFor && <ShareDialog item={shareFor} onClose={() => setShareFor(null)} onSaved={() => { setShareFor(null); load(); }} />}
    </div>
  );
};

export default PersonalTasks;
