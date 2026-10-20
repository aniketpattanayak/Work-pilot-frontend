import React, { useEffect, useRef, useState } from 'react';
import API from '../api/axiosConfig';
import useLookup from '../hooks/useLookup';
import FormField, { HALF } from './FormField';
import { compute } from '../utils/formula';
import { Upload, Camera, X, FileText, Loader2 } from 'lucide-react';

/**
 * Draws the company's own fields inside a create/edit form.
 *   <DynamicFieldRenderer entity="employee" fields={fields} values={form.customFields} onChange={(name, v) => ...} />
 * Pass layout={useFormLayout(...)} to place each field inside the form's own field grid (ordering, hiding).
 * Renders nothing when there are no fields, so forms look exactly as before.
 * `values` may be missing/null (old records) - every input then just starts empty.
 */
const inputCls = 'w-full px-4 py-2.5 bg-background border border-border text-foreground rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-inner disabled:opacity-60';
const labelCls = 'text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1';
const plainInput = 'w-full mt-1 px-4 py-2.5 rounded-lg border border-border bg-background/70 text-sm outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60';
const plainLabel = 'text-sm font-medium text-slate-600';

const ACCEPT = { image: 'image/*', video: 'video/*', pdf: '.pdf,application/pdf', audio: 'audio/*', document: '.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt' };
const WIDE = new Set(['textarea', 'multiselect', 'file']);

function acceptAttr(cfg) {
  const a = (cfg && cfg.accept) || ['any'];
  if (a.includes('any')) return undefined;
  return a.map((k) => ACCEPT[k]).filter(Boolean).join(',') || undefined;
}
function acceptText(cfg) {
  const a = (cfg && cfg.accept) || ['any'];
  if (a.includes('any')) return 'any file';
  return a.map((k) => ({ image: 'photos', video: 'videos', pdf: 'PDF', audio: 'audio', document: 'documents' }[k] || k)).join(', ');
}

/* ───────── file field: uploads the moment a file is chosen ───────── */
function FileInput({ f, entity, value, onChange, disabled, plain }) {
  const cfg = f.config || {};
  const list = Array.isArray(value) ? value : [];
  const max = cfg.multiple ? (cfg.maxFiles || 5) : 1;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const pick = useRef(null); const cam = useRef(null);

  const upload = async (files) => {
    setErr('');
    const room = max - list.length;
    if (room <= 0) { setErr(`You can add at most ${max} file(s). Remove one first.`); return; }
    const chosen = Array.from(files).slice(0, room);
    const maxBytes = (cfg.maxMb || 10) * 1024 * 1024;
    const big = chosen.find((x) => x.size > maxBytes);
    if (big) { setErr(`"${big.name}" is larger than ${cfg.maxMb || 10} MB.`); return; }
    setBusy(true);
    let next = list.slice();
    try {
      for (const file of chosen) {
        const fd = new FormData();
        fd.append('entity', entity || ''); fd.append('fieldName', f.fieldName); fd.append('file', file);
        const r = await API.post('/config/field-upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        next = [...next, r.data.file];
        onChange(next);
      }
    } catch (e) {
      setErr((e.response && e.response.data && e.response.data.message) || 'Could not upload the file.');
    } finally { setBusy(false); if (pick.current) pick.current.value = ''; if (cam.current) cam.current.value = ''; }
  };
  const btn = 'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-background text-[11px] font-black uppercase tracking-widest hover:border-primary/50 disabled:opacity-50';
  const photoOk = !(cfg.accept || ['any']).length || (cfg.accept || ['any']).some((k) => k === 'any' || k === 'image');
  return (
    <div className="mt-1">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={disabled || busy || list.length >= max} onClick={() => pick.current && pick.current.click()} className={btn}><Upload size={13} /> Choose {max > 1 ? 'files' : 'file'}</button>
        {cfg.camera && photoOk && (
          <button type="button" disabled={disabled || busy || list.length >= max} onClick={() => cam.current && cam.current.click()} className={btn}><Camera size={13} /> Take photo</button>
        )}
        {busy && <span className="inline-flex items-center gap-1 text-[11px] text-slate-500"><Loader2 size={13} className="animate-spin" /> Uploading…</span>}
        <input ref={pick} type="file" className="hidden" accept={acceptAttr(cfg)} multiple={!!cfg.multiple} onChange={(e) => e.target.files && e.target.files.length && upload(e.target.files)} aria-label={f.fieldLabel} />
        <input ref={cam} type="file" className="hidden" accept="image/*" capture="environment" onChange={(e) => e.target.files && e.target.files.length && upload(e.target.files)} aria-label={`${f.fieldLabel} camera`} />
      </div>
      <p className="text-[10px] text-slate-400 mt-1 ml-1">Accepts {acceptText(cfg)} · up to {cfg.maxMb || 10} MB each{max > 1 ? ` · up to ${max} files` : ''}</p>
      {list.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {list.map((x, i) => (
            <li key={`${x.url}-${i}`} className="flex items-center gap-2 px-3 py-1.5 text-xs bg-background border border-border rounded-lg max-w-full">
              <FileText size={12} className="shrink-0 text-primary" />
              <a href={x.url} target="_blank" rel="noreferrer" className="truncate max-w-[220px] hover:underline">{x.name}</a>
              {!disabled && <button type="button" aria-label={`Remove ${x.name}`} onClick={() => onChange(list.filter((_, k) => k !== i))}><X size={12} /></button>}
            </li>
          ))}
        </ul>
      )}
      {err && <p role="alert" className="text-[11px] text-red-500 mt-1 ml-1">{err}</p>}
    </div>
  );
}

/* ───────── dropdown linked to company data ───────── */
function LookupInput({ f, id, value, onChange, disabled, req, cls }) {
  const cfg = f.config || {};
  const options = useLookup(cfg.source);
  if (cfg.multiple) {
    const sel = Array.isArray(value) ? value : (value ? [value] : []);
    return (
      <div id={id} className="mt-1 max-h-40 overflow-y-auto border border-border rounded-xl p-2 bg-background grid grid-cols-1 sm:grid-cols-2 gap-1">
        {options.length === 0 && <span className="text-[11px] text-slate-400 px-1">Nothing to choose from yet.</span>}
        {options.map((o) => (
          <label key={o.value} className="flex items-center gap-2 text-xs font-semibold px-2 py-1 rounded-md hover:bg-primary/5 cursor-pointer">
            <input type="checkbox" className="accent-[hsl(var(--primary))]" disabled={disabled} checked={sel.includes(o.value)}
              onChange={(e) => onChange(e.target.checked ? [...sel, o.value] : sel.filter((x) => x !== o.value))} />
            {o.label}
          </label>
        ))}
      </div>
    );
  }
  const v = value === undefined || value === null ? '' : String(value);
  return (
    <select id={id} className={cls} disabled={disabled} required={req} value={v} onChange={(e) => onChange(e.target.value)}>
      <option value="">— Select —</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      {v && !options.some((o) => o.value === v) && <option value={v}>{v}</option>}
    </select>
  );
}

// variant "plain" matches the lighter task forms; the default matches the employee form.
export default function DynamicFieldRenderer({ fields, values, onChange, disabled = false, requireOnCreate = false, className = '', variant = 'form', layout = null, entity = '' }) {
  const plain = variant === 'plain';
  const list = Array.isArray(fields) ? fields.filter((f) => f && f.fieldName && f.isActive !== false) : [];
  const vals = values && typeof values === 'object' ? values : {};
  const get = (name) => (typeof vals.get === 'function' ? vals.get(name) : vals[name]);

  // Formula fields are worked out here from the other fields and saved with the form.
  const key = list.filter((f) => f.fieldType === 'formula').map((f) => `${f.fieldName}=${JSON.stringify(get(f.fieldName))}`).join('|')
    + '#' + list.map((f) => `${f.fieldName}:${JSON.stringify(get(f.fieldName))}`).join('|');
  useEffect(() => {
    if (!onChange) return;
    list.filter((f) => f.fieldType === 'formula').forEach((f) => {
      const cfg = f.config || {};
      const next = compute(cfg.expression, (n) => get(n), { decimals: cfg.decimals });
      const cur = get(f.fieldName);
      if ((next === null ? '' : next) !== (cur === undefined || cur === null ? '' : cur)) onChange(f.fieldName, next === null ? '' : next);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (list.length === 0) return null;

  const items = list.map((f) => {
    const id = `cf-${f.fieldName}`;
    const v = get(f.fieldName);
    const req = !!f.isRequired && f.fieldType !== 'formula';
    const set = (val) => onChange && onChange(f.fieldName, val);
    const cls = plain ? plainInput : inputCls;
    const label = (
      <label htmlFor={id} className={plain ? plainLabel : labelCls}>
        {f.fieldLabel}{req && <span className="text-red-500"> *</span>}
      </label>
    );
    const help = f.helpText ? <p className="text-[10px] text-slate-400 mt-1 ml-1">{f.helpText}</p> : null;
    let body;
    switch (f.fieldType) {
      case 'boolean':
        body = (
          <label className={`flex items-center gap-3 px-4 py-2.5 bg-background border border-border ${plain ? 'rounded-lg mt-1 text-sm' : 'rounded-2xl text-xs'} font-bold cursor-pointer select-none`}>
            <input id={id} type="checkbox" checked={v === true || v === 'true'} disabled={disabled}
              onChange={(e) => set(e.target.checked)} className="w-4 h-4 accent-[hsl(var(--primary))]" />
            <span className="text-foreground">{v === true || v === 'true' ? 'Yes' : 'No'}</span>
          </label>
        );
        break;
      case 'select':
        body = (
          <select id={id} className={cls} disabled={disabled} required={req && requireOnCreate}
            value={v === undefined || v === null ? '' : String(v)} onChange={(e) => set(e.target.value)}>
            <option value="">— Select —</option>
            {(f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
            {/* keep an old value visible even if the option was later removed */}
            {v && !(f.options || []).includes(String(v)) && <option value={String(v)}>{String(v)}</option>}
          </select>
        );
        break;
      case 'multiselect': {
        const sel = Array.isArray(v) ? v : (v ? [v] : []);
        body = (
          <div id={id} className="mt-1 flex flex-wrap gap-2">
            {(f.options || []).map((o) => {
              const on = sel.includes(o);
              return (
                <button key={o} type="button" disabled={disabled} aria-pressed={on}
                  onClick={() => set(on ? sel.filter((x) => x !== o) : [...sel, o])}
                  className={`px-3 py-1.5 rounded-xl border text-[11px] font-black transition-all ${on ? 'bg-primary/10 border-primary/50 text-primary' : 'bg-background border-border text-slate-500'}`}>
                  {on ? '✓ ' : ''}{o}
                </button>
              );
            })}
          </div>
        );
        break;
      }
      case 'lookup':
        body = <LookupInput f={f} id={id} value={v} onChange={set} disabled={disabled} req={req && requireOnCreate} cls={cls} />;
        break;
      case 'file':
        body = <FileInput f={f} entity={entity} value={v} onChange={set} disabled={disabled} plain={plain} />;
        break;
      case 'formula':
        body = (
          <div id={id} className={`${cls} flex items-center !bg-primary/5`} aria-readonly="true" title="Worked out automatically">
            {v === undefined || v === null || v === '' ? <span className="text-slate-400">—</span> : String(v)}
          </div>
        );
        break;
      case 'textarea':
        body = <textarea id={id} rows={3} className={cls} disabled={disabled} required={req && requireOnCreate} maxLength={2000}
          value={v === undefined || v === null ? '' : String(v)} onChange={(e) => set(e.target.value)} />;
        break;
      default:
        body = (
          <input id={id} className={cls} disabled={disabled} required={req && requireOnCreate}
            type={f.fieldType === 'number' ? 'number' : f.fieldType === 'date' ? 'date' : 'text'}
            step={f.fieldType === 'number' ? 'any' : undefined}
            maxLength={f.fieldType === 'text' ? 500 : undefined}
            value={v === undefined || v === null ? '' : String(v).slice(0, f.fieldType === 'date' ? 10 : 500)}
            onChange={(e) => set(e.target.value)} />
        );
    }
    return { f, id, node: (<>{label}{body}{help}</>) };
  });

  // Inside a designable form: each field is a slot of the form's own grid (so it can be moved / half or full width)
  if (layout) {
    return (
      <>
        {items.map(({ f, node }) => (
          <FormField key={f.fieldName} L={layout} id={`cf:${f.fieldName}`} full={WIDE.has(f.fieldType)} className="flex flex-col" >{node}</FormField>
        ))}
      </>
    );
  }
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 ${className}`} data-testid="custom-fields">
      {items.map(({ f, node }) => (
        <div key={f.fieldName} className={`flex flex-col ${WIDE.has(f.fieldType) ? 'md:col-span-2' : ''}`}>{node}</div>
      ))}
    </div>
  );
}
export { HALF };
