import React, { useCallback, useEffect, useState } from 'react';
import API from '../api/axiosConfig';
import { invalidateCustomFields } from '../hooks/useCustomFields';
import { ArrowUp, ArrowDown, Plus, Save } from 'lucide-react';

const ENTITIES = [['employee', 'Employees'], ['delegation', 'Delegation tasks']];
const TYPES = [['text', 'Text'], ['number', 'Number'], ['date', 'Date'], ['select', 'Dropdown'], ['boolean', 'Yes / No']];
const inp = 'px-3 py-2 rounded-xl border border-border bg-background text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/20';

/**
 * Admin screen to add extra fields to the Employee and Delegation-task forms.
 * Saves on its own button (not the page-wide save). Fields are never deleted: "Hidden" keeps old values.
 */
export default function CustomFieldsManager() {
  const [entity, setEntity] = useState('employee');
  const [rows, setRows] = useState([]);
  const [draft, setDraft] = useState({ fieldLabel: '', fieldType: 'text', options: '', isRequired: false });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ text: '', bad: false });

  const load = useCallback(async () => {
    setMsg({ text: '', bad: false });
    try {
      const r = await API.get(`/config/fields/${entity}`, { params: { includeInactive: 1 } });
      setRows((Array.isArray(r.data && r.data.fields) ? r.data.fields : []).map((f) => ({ ...f, options: (f.options || []).join(', ') })));
    } catch (e) { setRows([]); setMsg({ text: 'Could not load the fields.', bad: true }); }
  }, [entity]);
  useEffect(() => { load(); }, [load]);

  const patch = (i, p) => setRows((r) => r.map((x, k) => (k === i ? { ...x, ...p } : x)));
  const move = (i, d) => setRows((r) => { const j = i + d; if (j < 0 || j >= r.length) return r; const n = r.slice(); [n[i], n[j]] = [n[j], n[i]]; return n; });
  const opts = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean);

  const save = async (extra) => {
    setBusy(true); setMsg({ text: '', bad: false });
    const fields = [...rows.map((f, i) => ({ fieldName: f.fieldName, fieldLabel: f.fieldLabel, fieldType: f.fieldType, options: opts(f.options), isRequired: !!f.isRequired, isActive: f.isActive !== false, order: i })), ...(extra ? [{ ...extra, order: rows.length }] : [])];
    try {
      await API.post(`/config/fields/${entity}`, { fields });
      invalidateCustomFields(entity);
      if (extra) setDraft({ fieldLabel: '', fieldType: 'text', options: '', isRequired: false });
      await load();
      setMsg({ text: 'Saved. Open the form again to see the change.', bad: false });
    } catch (e) {
      setMsg({ text: (e.response && e.response.data && e.response.data.message) || 'Could not save.', bad: true });
    } finally { setBusy(false); }
  };
  const addNew = () => {
    if (!draft.fieldLabel.trim()) return setMsg({ text: 'Give the new field a name.', bad: true });
    save({ fieldLabel: draft.fieldLabel.trim(), fieldType: draft.fieldType, options: opts(draft.options), isRequired: draft.isRequired, isActive: true });
  };

  return (
    <section className="bg-card rounded-2xl border border-border p-5 md:p-6 shadow-sm" data-testid="custom-fields-manager">
      <h3 className="text-foreground text-base font-black mb-1 uppercase tracking-tight">Extra fields</h3>
      <p className="text-[11px] text-slate-500 mb-4">Add your own fields to forms and tables. Hiding a field keeps the values already saved.</p>
      <div className="flex gap-2 mb-4">
        {ENTITIES.map(([k, l]) => (
          <button key={k} type="button" onClick={() => setEntity(k)}
            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${entity === k ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-slate-500'}`}>{l}</button>
        ))}
      </div>

      {rows.length === 0 ? <p className="text-xs text-slate-400 mb-4">No extra fields yet.</p> : (
        <ul className="space-y-2 mb-4">
          {rows.map((f, i) => (
            <li key={f.fieldName} className={`grid grid-cols-1 md:grid-cols-[1.4fr_0.8fr_1.6fr_auto_auto_auto] gap-2 items-center bg-background border border-border rounded-xl p-2.5 ${f.isActive === false ? 'opacity-60' : ''}`}>
              <input className={inp} value={f.fieldLabel} onChange={(e) => patch(i, { fieldLabel: e.target.value })} aria-label="Field name" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{(TYPES.find((t) => t[0] === f.fieldType) || [])[1] || f.fieldType}</span>
              {f.fieldType === 'select'
                ? <input className={inp} value={f.options} onChange={(e) => patch(i, { options: e.target.value })} placeholder="Option 1, Option 2" aria-label="Options" />
                : <span />}
              <label className="flex items-center gap-1.5 text-[10px] font-bold"><input type="checkbox" checked={!!f.isRequired} onChange={(e) => patch(i, { isRequired: e.target.checked })} /> Required</label>
              <label className="flex items-center gap-1.5 text-[10px] font-bold"><input type="checkbox" checked={f.isActive !== false} onChange={(e) => patch(i, { isActive: e.target.checked })} /> Shown</label>
              <span className="flex gap-1">
                <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="p-1 rounded-md hover:bg-muted disabled:opacity-30"><ArrowUp size={13} /></button>
                <button type="button" aria-label="Move down" disabled={i === rows.length - 1} onClick={() => move(i, 1)} className="p-1 rounded-md hover:bg-muted disabled:opacity-30"><ArrowDown size={13} /></button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[1.4fr_0.8fr_1.6fr_auto_auto] gap-2 items-center border-t border-border pt-4">
        <input className={inp} placeholder="New field name, e.g. Blood group" value={draft.fieldLabel} onChange={(e) => setDraft({ ...draft, fieldLabel: e.target.value })} aria-label="New field name" />
        <select className={inp} value={draft.fieldType} onChange={(e) => setDraft({ ...draft, fieldType: e.target.value })} aria-label="New field type">
          {TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        {draft.fieldType === 'select'
          ? <input className={inp} placeholder="Option 1, Option 2" value={draft.options} onChange={(e) => setDraft({ ...draft, options: e.target.value })} aria-label="New field options" />
          : <span />}
        <label className="flex items-center gap-1.5 text-[10px] font-bold"><input type="checkbox" checked={draft.isRequired} onChange={(e) => setDraft({ ...draft, isRequired: e.target.checked })} /> Required</label>
        <button type="button" disabled={busy} onClick={addNew} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest disabled:opacity-50"><Plus size={13} /> Add</button>
      </div>

      <div className="flex items-center gap-3 mt-4">
        <button type="button" disabled={busy || rows.length === 0} onClick={() => save()} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-card border border-border text-[10px] font-black uppercase tracking-widest disabled:opacity-50"><Save size={13} /> Save changes</button>
        {msg.text && <span className={`text-[11px] font-semibold ${msg.bad ? 'text-red-500' : 'text-emerald-600'}`}>{msg.text}</span>}
      </div>
    </section>
  );
}
