import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import API from '../api/axiosConfig';
import { invalidateCustomFields } from '../hooks/useCustomFields';
import { invalidateFormLayout } from '../hooks/useFormLayout';
import { parse as parseFormula, FUNCS_LIST } from '../utils/formula';
import { ArrowUp, ArrowDown, Plus, Save, RotateCcw, GripVertical, ChevronDown, ChevronUp, Trash2, Lock } from 'lucide-react';

const inp = 'px-3 py-2 rounded-xl border border-border bg-background text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/20 w-full';
const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').replace(/^(\d)/, 'f_$1').slice(0, 40);

const TYPES = [
  ['text', 'Text'], ['textarea', 'Long text'], ['number', 'Number'], ['date', 'Date'],
  ['select', 'Dropdown (your own list)'], ['multiselect', 'Multi-choice (tick several)'], ['boolean', 'Yes / No'],
  ['lookup', 'Dropdown linked to company data'], ['file', 'File / photo / video upload'], ['formula', 'Formula (worked out automatically)'],
];
const TYPE_NAME = Object.fromEntries(TYPES);
const FILE_KINDS = [['image', 'Photos'], ['video', 'Videos'], ['pdf', 'PDF'], ['document', 'Documents (Word, Excel…)'], ['audio', 'Audio'], ['any', 'Any file']];
const BASE_SOURCES = [['employees', 'Employees (your people)'], ['sectors', 'Sectors / departments'], ['locations', 'Locations'], ['roles', 'Roles']];

const blankDraft = () => ({ fieldLabel: '', fieldType: 'text', options: '', isRequired: false, helpText: '', config: {} });

function Toggle({ on, onChange, disabled, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)}
      className={`shrink-0 w-9 h-5 rounded-full border transition-colors relative disabled:opacity-40 ${on ? 'bg-emerald-500 border-emerald-500' : 'bg-slate-300 dark:bg-slate-700 border-border'}`}>
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
    </button>
  );
}

/* Settings that depend on the type of field */
function ConfigEditor({ row, onChange, keys, lists }) {
  const c = row.config || {};
  const set = (p) => onChange({ config: { ...c, ...p } });
  if (row.fieldType === 'select' || row.fieldType === 'multiselect') {
    return (
      <div>
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Choices (separate with commas or new lines)</label>
        <textarea rows={2} className={inp + ' mt-1'} value={row.options} onChange={(e) => onChange({ options: e.target.value })} placeholder="Option 1, Option 2" aria-label="Choices" />
      </div>
    );
  }
  if (row.fieldType === 'lookup') {
    return (
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Linked to</label>
          <select className={inp + ' mt-1'} value={c.source || ''} onChange={(e) => set({ source: e.target.value })} aria-label="Linked to">
            <option value="">— Choose —</option>
            {BASE_SOURCES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            {lists.map((m) => <option key={m.key} value={`master:${m.key}`}>Your list: {m.label}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 text-[11px] font-bold sm:mt-6"><input type="checkbox" checked={!!c.multiple} onChange={(e) => set({ multiple: e.target.checked })} /> Allow choosing more than one</label>
      </div>
    );
  }
  if (row.fieldType === 'file') {
    const acc = c.accept && c.accept.length ? c.accept : ['any'];
    const toggle = (k) => {
      let next = acc.includes(k) ? acc.filter((x) => x !== k) : [...acc.filter((x) => x !== 'any'), k];
      if (k === 'any') next = ['any'];
      if (!next.length) next = ['any'];
      set({ accept: next });
    };
    return (
      <div className="space-y-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Allowed files</p>
          <div className="flex flex-wrap gap-2">
            {FILE_KINDS.map(([k, l]) => (
              <label key={k} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold cursor-pointer ${acc.includes(k) ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-background border-border text-slate-500'}`}>
                <input type="checkbox" className="hidden" checked={acc.includes(k)} onChange={() => toggle(k)} aria-label={l} /> {acc.includes(k) ? '✓ ' : ''}{l}
              </label>
            ))}
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Largest file (MB)</label>
            <input type="number" min={1} max={100} className={inp + ' mt-1'} value={c.maxMb || 10} onChange={(e) => set({ maxMb: Number(e.target.value) })} aria-label="Largest file in MB" />
          </div>
          <label className="flex items-center gap-2 text-[11px] font-bold sm:mt-6"><input type="checkbox" checked={!!c.multiple} onChange={(e) => set({ multiple: e.target.checked })} /> Several files</label>
          {c.multiple && (
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">At most (files)</label>
              <input type="number" min={1} max={10} className={inp + ' mt-1'} value={c.maxFiles || 5} onChange={(e) => set({ maxFiles: Number(e.target.value) })} aria-label="Most files" />
            </div>
          )}
        </div>
        <label className="flex items-center gap-2 text-[11px] font-bold"><input type="checkbox" checked={!!c.camera} onChange={(e) => set({ camera: e.target.checked })} /> Show a “Take photo” button (opens the camera on a phone)</label>
      </div>
    );
  }
  if (row.fieldType === 'formula') {
    let err = '';
    try {
      const p = parseFormula(c.expression || '');
      const bad = p.refs.filter((r) => !keys.includes(r) || r === row.fieldName);
      if (bad.length) err = `{${bad[0]}} is not another field of this form.`;
    } catch (e) { err = c.expression ? e.message : ''; }
    return (
      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Formula</label>
        <input className={inp + ' font-mono'} value={c.expression || ''} onChange={(e) => set({ expression: e.target.value })} placeholder="{quantity} * {rate}" aria-label="Formula" />
        {err && <p role="alert" className="text-[11px] text-red-500">{err}</p>}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] text-slate-400">Click to add a field:</span>
          {keys.filter((k) => k !== row.fieldName).map((k) => (
            <button key={k} type="button" onClick={() => set({ expression: `${c.expression || ''}{${k}}` })} className="px-2 py-0.5 rounded-md border border-border text-[10px] font-mono bg-background hover:border-primary/50">{`{${k}}`}</button>
          ))}
          {keys.filter((k) => k !== row.fieldName).length === 0 && <span className="text-[10px] text-slate-400">Add the number / date fields first.</span>}
        </div>
        <div className="grid sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Decimals</label>
            <input type="number" min={0} max={6} className={inp + ' mt-1'} value={c.decimals === undefined ? 2 : c.decimals} onChange={(e) => set({ decimals: Number(e.target.value) })} aria-label="Decimals" />
          </div>
        </div>
        <p className="text-[10px] text-slate-400">You can use + − * / %, comparisons, text in quotes, and: {FUNCS_LIST.join(', ')}. Example: IF({'{qty}'} &gt; 10, {'{qty}'} * 0.9, {'{qty}'})</p>
      </div>
    );
  }
  return null;
}

export default function FormDesigner() {
  const [forms, setForms] = useState([]);
  const [form, setForm] = useState('employee');
  const [rows, setRows] = useState([]);
  const [entity, setEntity] = useState('employee');
  const [lists, setLists] = useState([]);
  const [draft, setDraft] = useState(blankDraft());
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState({ text: '', bad: false });
  const dragFrom = useRef(null);

  const load = useCallback(async () => {
    setMsg({ text: '', bad: false });
    try {
      const r = await API.get(`/config/forms/${form}`, { params: { all: 1 } });
      const d = r.data || {};
      setEntity(d.entity);
      const bMap = Object.fromEntries((d.builtin || []).map((b) => [b.key, b]));
      const cMap = Object.fromEntries((d.custom || []).map((c) => [`cf:${c.fieldName}`, c]));
      setRows((d.order || []).map((k) => {
        if (cMap[k]) { const c = cMap[k]; return { kind: 'custom', key: k, isNew: false, fieldName: c.fieldName, fieldLabel: c.fieldLabel, fieldType: c.fieldType, options: (c.options || []).join(', '), isRequired: !!c.isRequired, isActive: c.isActive !== false, helpText: c.helpText || '', config: c.config || {}, open: false }; }
        const b = bMap[k]; return { kind: 'builtin', key: k, ...b };
      }).filter((x) => x.key));
      setDirty(false);
    } catch (e) { setRows([]); setMsg({ text: (e.response && e.response.data && e.response.data.message) || 'Could not load this form.', bad: true }); }
  }, [form]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    API.get('/config/forms').then((r) => setForms((r.data && r.data.forms) || [])).catch(() => {});
    API.get('/config/master-lists').then((r) => setLists((r.data && r.data.lists) || [])).catch(() => {});
  }, []);

  const patch = (i, p) => { setRows((r) => r.map((x, k) => (k === i ? { ...x, ...p } : x))); setDirty(true); };
  const move = (i, d) => { setRows((r) => { const j = i + d; if (j < 0 || j >= r.length) return r; const n = r.slice(); [n[i], n[j]] = [n[j], n[i]]; return n; }); setDirty(true); };
  const drop = (to) => {
    const from = dragFrom.current; dragFrom.current = null;
    if (from === null || from === to) return;
    setRows((r) => { const n = r.slice(); const [x] = n.splice(from, 1); n.splice(to, 0, x); return n; });
    setDirty(true);
  };
  const opts = (s) => String(s || '').split(/[,\n]/).map((x) => x.trim()).filter(Boolean);
  const customKeys = useMemo(() => rows.filter((r) => r.kind === 'custom').map((r) => r.fieldName), [rows]);
  const keyOf = (r) => (r.kind === 'builtin' ? r.key : `cf:${r.fieldName}`);

  const addField = () => {
    const label = draft.fieldLabel.trim();
    if (!label) return setMsg({ text: 'Give the new field a name.', bad: true });
    const name = slug(label);
    if (!name) return setMsg({ text: 'Please use letters or numbers in the name.', bad: true });
    if (customKeys.includes(name)) return setMsg({ text: `You already have a field called "${label}".`, bad: true });
    setRows((r) => [...r, { kind: 'custom', key: `cf:${name}`, isNew: true, fieldName: name, fieldLabel: label, fieldType: draft.fieldType, options: draft.options, isRequired: draft.isRequired, isActive: true, helpText: draft.helpText, config: draft.config, open: true }]);
    setDraft(blankDraft()); setDirty(true); setMsg({ text: `"${label}" added at the bottom. Move it where you want, then press Save.`, bad: false });
  };

  const save = async () => {
    setBusy(true); setMsg({ text: '', bad: false });
    try {
      const custom = rows.filter((r) => r.kind === 'custom');
      if (custom.length) {
        await API.post(`/config/fields/${entity}`, {
          fields: custom.map((r, i) => ({ fieldName: r.fieldName, fieldLabel: r.fieldLabel, fieldType: r.fieldType, options: opts(r.options), isRequired: !!r.isRequired, isActive: r.isActive !== false, order: i, helpText: r.helpText || '', config: r.config || {} })),
        });
      }
      const fields = {};
      rows.filter((r) => r.kind === 'builtin').forEach((r) => {
        fields[r.key] = { label: r.label, hidden: !!r.hidden, required: !!r.required };
      });
      await API.put(`/config/forms/${form}`, { fields, order: rows.map(keyOf) });
      invalidateCustomFields(entity); invalidateFormLayout();
      await load();
      setMsg({ text: 'Saved. Open the form again to see the change.', bad: false });
    } catch (e) {
      setMsg({ text: (e.response && e.response.data && e.response.data.message) || 'Could not save.', bad: true });
    } finally { setBusy(false); }
  };
  const reset = async () => {
    setBusy(true); setMsg({ text: '', bad: false });
    try { await API.delete(`/config/forms/${form}`); invalidateFormLayout(); await load(); setMsg({ text: 'Back to the standard layout. Your own fields are kept.', bad: false }); }
    catch (e) { setMsg({ text: (e.response && e.response.data && e.response.data.message) || 'Could not reset.', bad: true }); }
    finally { setBusy(false); }
  };

  /* ───── linked lists ───── */
  const [listBusy, setListBusy] = useState(false);
  const [listMsg, setListMsg] = useState({ text: '', bad: false });
  const saveLists = async () => {
    setListBusy(true); setListMsg({ text: '', bad: false });
    try {
      const r = await API.put('/config/master-lists', { lists: lists.map((l) => ({ key: l.key, label: l.label, items: Array.isArray(l.items) ? l.items : String(l.items || '').split('\n') })) });
      setLists(r.data.lists || []); setListMsg({ text: 'Saved.', bad: false });
    } catch (e) { setListMsg({ text: (e.response && e.response.data && e.response.data.message) || 'Could not save.', bad: true }); }
    finally { setListBusy(false); }
  };

  const formName = (forms.find((f) => f.key === form) || {}).label || form;

  return (
    <section className="bg-card rounded-2xl border border-border p-5 md:p-6 shadow-sm" data-testid="form-designer">
      <h3 className="text-foreground text-base font-black mb-1 uppercase tracking-tight">Form designer</h3>
      <p className="text-[11px] text-slate-500 mb-4">Choose a form, then rename, hide, reorder or add fields. Fields the system needs cannot be hidden (shown with a lock). Hiding one of your own fields keeps the data already saved.</p>

      <div className="flex flex-wrap gap-2 mb-4" role="tablist" aria-label="Forms">
        {forms.map((f) => (
          <button key={f.key} type="button" role="tab" aria-selected={form === f.key} onClick={() => { if (dirty && !window.confirm('You have changes that are not saved. Leave without saving?')) return; setForm(f.key); }}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${form === f.key ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-slate-500'}`}>{f.label}</button>
        ))}
      </div>

      <p className="text-xs font-black text-foreground mb-2">{formName}</p>
      <ul className="space-y-2 mb-4">
        {rows.map((r, i) => {
          const builtin = r.kind === 'builtin';
          const off = builtin ? r.hidden : r.isActive === false;
          return (
            <li key={r.key} draggable onDragStart={() => { dragFrom.current = i; }} onDragOver={(e) => e.preventDefault()} onDrop={() => drop(i)}
              className={`bg-background border border-border rounded-xl p-2.5 ${off ? 'opacity-60' : ''}`} data-testid={`row-${r.key}`}>
              <div className="flex flex-wrap items-center gap-2">
                <GripVertical size={14} className="text-slate-400 cursor-grab shrink-0" aria-hidden="true" />
                <input className={inp + ' !w-auto flex-1 min-w-[160px]'} value={builtin ? r.label : r.fieldLabel}
                  onChange={(e) => patch(i, builtin ? { label: e.target.value } : { fieldLabel: e.target.value })} aria-label={`Name of ${builtin ? r.defaultLabel : r.fieldLabel}`} />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-2 py-1 rounded-md border border-border">{builtin ? 'Built-in' : TYPE_NAME[r.fieldType] || r.fieldType}</span>
                {builtin && !r.canHide && <span title="Needed by the system" className="text-slate-400"><Lock size={12} /></span>}
                <label className="flex items-center gap-1.5 text-[10px] font-bold">Required
                  <Toggle on={builtin ? !!r.required : !!r.isRequired} disabled={builtin ? !r.canRequire : r.fieldType === 'formula'} label={`Required: ${builtin ? r.label : r.fieldLabel}`}
                    onChange={(v) => patch(i, builtin ? { required: v } : { isRequired: v })} />
                </label>
                <label className="flex items-center gap-1.5 text-[10px] font-bold">Shown
                  <Toggle on={builtin ? !r.hidden : r.isActive !== false} disabled={builtin && !r.canHide} label={`Shown: ${builtin ? r.label : r.fieldLabel}`}
                    onChange={(v) => patch(i, builtin ? { hidden: !v } : { isActive: v })} />
                </label>
                <span className="flex gap-0.5">
                  <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="p-1 rounded-md hover:bg-muted disabled:opacity-30"><ArrowUp size={13} /></button>
                  <button type="button" aria-label="Move down" disabled={i === rows.length - 1} onClick={() => move(i, 1)} className="p-1 rounded-md hover:bg-muted disabled:opacity-30"><ArrowDown size={13} /></button>
                  {!builtin && <button type="button" aria-label="Field details" onClick={() => patch(i, { open: !r.open })} className="p-1 rounded-md hover:bg-muted">{r.open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}</button>}
                  {!builtin && r.isNew && <button type="button" aria-label="Remove new field" onClick={() => { setRows((x) => x.filter((_, k) => k !== i)); setDirty(true); }} className="p-1 rounded-md hover:bg-muted text-red-500"><Trash2 size={13} /></button>}
                </span>
              </div>
              {builtin && (r.hint || r.label !== r.defaultLabel) && <p className="text-[10px] text-slate-400 mt-1 ml-6">{r.hint}{r.label !== r.defaultLabel ? ` (standard name: ${r.defaultLabel})` : ''}</p>}
              {!builtin && r.open && (
                <div className="mt-3 ml-6 space-y-3 border-t border-border pt-3">
                  <p className="text-[10px] text-slate-400">Key for formulas: <span className="font-mono text-foreground">{`{${r.fieldName}}`}</span> · the type cannot be changed once saved</p>
                  <ConfigEditor row={r} onChange={(p) => patch(i, p)} keys={customKeys} lists={lists.filter((l) => l.key)} />
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Help text under the field (optional)</label>
                    <input className={inp + ' mt-1'} value={r.helpText} maxLength={200} onChange={(e) => patch(i, { helpText: e.target.value })} aria-label="Help text" />
                  </div>
                </div>
              )}
            </li>
          );
        })}
        {rows.length === 0 && <li className="text-xs text-slate-400">Loading…</li>}
      </ul>

      <div className="border-t border-border pt-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Add a field</p>
        <div className="grid md:grid-cols-[1.4fr_1.2fr_auto_auto] gap-2 items-center">
          <input className={inp} placeholder="New field name, e.g. Blood group" value={draft.fieldLabel} onChange={(e) => setDraft({ ...draft, fieldLabel: e.target.value })} aria-label="New field name" />
          <select className={inp} value={draft.fieldType} onChange={(e) => setDraft({ ...blankDraft(), fieldLabel: draft.fieldLabel, fieldType: e.target.value, isRequired: draft.isRequired })} aria-label="New field type">
            {TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-[10px] font-bold"><input type="checkbox" checked={draft.isRequired} onChange={(e) => setDraft({ ...draft, isRequired: e.target.checked })} /> Required</label>
          <button type="button" onClick={addField} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest"><Plus size={13} /> Add</button>
        </div>
        {['select', 'multiselect', 'lookup', 'file', 'formula'].includes(draft.fieldType) && (
          <div className="mt-3 p-3 rounded-xl border border-border bg-background">
            <ConfigEditor row={{ ...draft, fieldName: slug(draft.fieldLabel) }} onChange={(p) => setDraft({ ...draft, ...p })} keys={customKeys} lists={lists.filter((l) => l.key)} />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-5">
        <button type="button" disabled={busy || !dirty} onClick={save} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest disabled:opacity-50"><Save size={13} /> Save this form</button>
        <button type="button" disabled={busy} onClick={reset} className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-[10px] font-black uppercase tracking-widest"><RotateCcw size={13} /> Back to standard layout</button>
        {dirty && <span className="text-[11px] text-amber-600 font-bold">Not saved yet</span>}
        {msg.text && <span role="status" className={`text-[11px] font-semibold ${msg.bad ? 'text-red-500' : 'text-emerald-600'}`}>{msg.text}</span>}
      </div>

      {/* ───── lists a dropdown can be linked to ───── */}
      <div className="mt-8 pt-6 border-t border-border" data-testid="master-lists">
        <h4 className="text-foreground text-sm font-black mb-1 uppercase tracking-tight">Your lists</h4>
        <p className="text-[11px] text-slate-500 mb-3">Make a list once (customers, vehicles, machines…) and link any dropdown to it above, on any form. Employees, departments and locations are already available.</p>
        <ul className="space-y-2 mb-3">
          {lists.map((l, i) => (
            <li key={l.key || i} className="grid md:grid-cols-[1fr_2fr_auto] gap-2 items-start bg-background border border-border rounded-xl p-2.5">
              <input className={inp} value={l.label} onChange={(e) => setLists((x) => x.map((y, k) => (k === i ? { ...y, label: e.target.value } : y)))} aria-label="List name" placeholder="List name, e.g. Customers" />
              <textarea rows={3} className={inp} value={Array.isArray(l.items) ? l.items.join('\n') : l.items} onChange={(e) => setLists((x) => x.map((y, k) => (k === i ? { ...y, items: e.target.value } : y)))} aria-label={`Items of ${l.label}`} placeholder="One item per line" />
              <button type="button" aria-label={`Remove ${l.label}`} onClick={() => setLists((x) => x.filter((_, k) => k !== i))} className="p-2 rounded-md hover:bg-muted text-red-500"><Trash2 size={14} /></button>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setLists((x) => [...x, { key: '', label: '', items: [] }])} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-[10px] font-black uppercase tracking-widest"><Plus size={13} /> New list</button>
          <button type="button" disabled={listBusy} onClick={saveLists} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest disabled:opacity-50"><Save size={13} /> Save lists</button>
          {listMsg.text && <span role="status" className={`text-[11px] font-semibold ${listMsg.bad ? 'text-red-500' : 'text-emerald-600'}`}>{listMsg.text}</span>}
        </div>
      </div>
    </section>
  );
}
