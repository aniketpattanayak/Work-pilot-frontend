import React, { useState, useEffect, useCallback } from 'react';
import API from '../api/axiosConfig';
import { Plus, Pencil, Trash2, Save, X } from 'lucide-react';
import { dialog } from './Dialog';

/** Leave setup for Admins: leave types, the leave year, balance adjustments and joining dates. */
const card = 'bg-card rounded-[2rem] border border-border p-5 md:p-8 shadow-xl';
const label = 'text-[10px] font-black text-slate-500 uppercase tracking-[0.25em]';
const input = 'px-4 py-3 rounded-2xl border border-border bg-background text-foreground text-sm font-bold w-full';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const blank = { _id: null, name: '', paid: true, unlimited: false, annualQuota: 12, accrual: 'monthly', carryForwardMax: 0, maxNegative: 0, halfDayAllowed: true, maxConsecutiveDays: 0, minNoticeDays: 0, backdateDays: 7, sandwich: false, requiresReason: true, active: true };
const err = (e, d) => e?.response?.data?.message || d;

const Num = ({ title, value, onChange, hint }) => (
  <div><label className={label}>{title}</label><input aria-label={title} type="number" min="0" className={input} value={value} onChange={(e) => onChange(e.target.value)} />{hint && <p className="text-[10px] font-bold text-muted-foreground mt-1">{hint}</p>}</div>
);
const Check = ({ title, value, onChange }) => (
  <label className="flex items-center gap-2 text-sm font-bold text-foreground cursor-pointer"><input type="checkbox" aria-label={title} checked={!!value} onChange={(e) => onChange(e.target.checked)} /> {title}</label>
);

const LeaveSetup = ({ can }) => {
  const canConfig = can('leave.configure'), canAdjust = can('leave.adjust');
  const [types, setTypes] = useState([]);
  const [cfg, setCfg] = useState({ yearStartMonth: 1, allowSelfApproval: false });
  const [people, setPeople] = useState([]);
  const [editing, setEditing] = useState(null);
  const [adj, setAdj] = useState({ employeeId: '', leaveTypeId: '', days: '', reason: '' });
  const [dates, setDates] = useState({});

  const load = useCallback(async () => {
    try {
      const [t, c, p] = await Promise.all([
        API.get('/tasks/leave/types', { params: { all: 1 } }), API.get('/tasks/leave/config'),
        API.get('/tasks/leave/people')
      ]);
      setTypes(t.data?.types || []);
      setCfg({ yearStartMonth: c.data?.yearStartMonth || 1, allowSelfApproval: !!c.data?.allowSelfApproval });
      const list = p.data?.people || [];
      setPeople(list);
      setDates(Object.fromEntries(list.map((x) => [x._id, x.joiningDate || ''])));
    } catch (e) { await dialog.alert(err(e, 'Could not load leave setup.'), { tone: 'error' }); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const saveCfg = async () => {
    try { await API.put('/tasks/leave/config', cfg); await dialog.alert('Leave settings saved.', { tone: 'success', title: 'Saved' }); }
    catch (e) { await dialog.alert(err(e, 'Could not save.'), { tone: 'error' }); }
  };
  const saveType = async () => {
    if (!editing.name.trim()) return dialog.alert('Give the leave type a name.', { tone: 'error', title: 'Check the form' });
    try {
      const body = { ...editing };
      if (editing._id) await API.put(`/tasks/leave/types/${editing._id}`, body); else await API.post('/tasks/leave/types', body);
      setEditing(null); await load();
    } catch (e) { await dialog.alert(err(e, 'Could not save.'), { tone: 'error', title: 'Not saved' }); }
  };
  const removeType = async (t) => {
    if (!(await dialog.confirm(`Delete "${t.name}"?`, { title: 'Delete leave type', danger: true, confirmText: 'Delete' }))) return;
    try { await API.delete(`/tasks/leave/types/${t._id}`); await load(); }
    catch (e) { await dialog.alert(err(e, 'Could not delete.'), { tone: 'error' }); }
  };
  const saveAdj = async () => {
    try {
      await API.post('/tasks/leave/adjust', { ...adj, days: Number(adj.days) });
      setAdj({ employeeId: '', leaveTypeId: '', days: '', reason: '' });
      await dialog.alert('Balance updated.', { tone: 'success', title: 'Saved' });
    } catch (e) { await dialog.alert(err(e, 'Could not save.'), { tone: 'error', title: 'Not saved' }); }
  };
  const saveDate = async (p) => {
    try { await API.put(`/tasks/leave/employees/${p._id}/joining-date`, { date: dates[p._id] || null }); await dialog.alert(`Joining date saved for ${p.name}.`, { tone: 'success', title: 'Saved' }); }
    catch (e) { await dialog.alert(err(e, 'Could not save.'), { tone: 'error' }); }
  };
  const setE = (k, v) => setEditing((x) => ({ ...x, [k]: v }));

  return (
    <div className="space-y-6">
      {canConfig && (
        <div className={card}>
          <h3 className="text-foreground text-base font-black uppercase tracking-tight mb-4">Leave settings</h3>
          <div className="grid md:grid-cols-2 gap-4 items-end">
            <div><label className={label}>Leave year starts in</label>
              <select aria-label="Leave year start month" className={input} value={cfg.yearStartMonth} onChange={(e) => setCfg({ ...cfg, yearStartMonth: Number(e.target.value) })}>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
              <p className="text-[10px] font-bold text-muted-foreground mt-1">India companies often use April. Changing this later changes how balances and carry-forward are worked out.</p></div>
            <Check title="Approvers may approve their own leave (for owner-run companies)" value={cfg.allowSelfApproval} onChange={(v) => setCfg({ ...cfg, allowSelfApproval: v })} />
          </div>
          <button type="button" onClick={saveCfg} className="mt-4 px-5 py-3 rounded-xl bg-primary text-primary-foreground text-[11px] font-black uppercase tracking-widest flex items-center gap-2"><Save size={14} /> Save settings</button>
        </div>
      )}

      {canConfig && (
        <div className={card}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-foreground text-base font-black uppercase tracking-tight">Leave types</h3>
            {!editing && <button type="button" onClick={() => setEditing({ ...blank })} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><Plus size={14} /> New leave type</button>}
          </div>
          {types.length === 0 && !editing && <p className="text-xs font-bold text-muted-foreground">No leave types yet. Examples: Casual (12 a year), Sick (6 a year), Unpaid.</p>}
          <div className="space-y-2">
            {types.map((t) => (
              <div key={t._id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl border border-border bg-muted/40">
                <div><p className="text-sm font-black text-foreground">{t.name}{!t.active && <span className="ml-2 text-[10px] text-muted-foreground">(inactive)</span>}</p>
                  <p className="text-[11px] font-bold text-muted-foreground">{t.unlimited ? 'No limit' : `${t.annualQuota} a year, ${t.accrual === 'upfront' ? 'given upfront' : 'earned monthly'}`} · {t.paid ? 'Paid' : 'Unpaid'}{t.carryForwardMax ? ` · carries up to ${t.carryForwardMax}` : ''}</p></div>
                <div className="flex gap-2">
                  <button type="button" aria-label={`Edit ${t.name}`} onClick={() => setEditing({ ...blank, ...t })} className="p-2 rounded-xl border border-border hover:bg-muted"><Pencil size={14} /></button>
                  <button type="button" aria-label={`Delete ${t.name}`} onClick={() => removeType(t)} className="p-2 rounded-xl border border-border hover:bg-red-500/10 text-red-600 dark:text-red-400"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
          {editing && (
            <div className="mt-5 p-4 md:p-6 rounded-3xl border border-border bg-muted/30">
              <div className="flex items-center justify-between mb-4"><p className="text-sm font-black uppercase tracking-tight text-foreground">{editing._id ? 'Edit leave type' : 'New leave type'}</p>
                <button type="button" aria-label="Close editor" onClick={() => setEditing(null)} className="p-2 rounded-xl hover:bg-muted"><X size={16} /></button></div>
              <div className="grid md:grid-cols-3 gap-3">
                <div><label className={label}>Name</label><input aria-label="Leave type name" className={input} maxLength={40} value={editing.name} onChange={(e) => setE('name', e.target.value)} /></div>
                <div><label className={label}>How it is given</label>
                  <select aria-label="Accrual" className={input} value={editing.accrual} onChange={(e) => setE('accrual', e.target.value)} disabled={editing.unlimited}>
                    <option value="monthly">Earned a little each month</option><option value="upfront">All at the start of the year</option></select></div>
                {!editing.unlimited && <Num title="Days per year" value={editing.annualQuota} onChange={(v) => setE('annualQuota', v)} />}
                {!editing.unlimited && <Num title="Carry forward up to (days)" value={editing.carryForwardMax} onChange={(v) => setE('carryForwardMax', v)} hint="0 = unused days lapse" />}
                {!editing.unlimited && <Num title="Allowed below zero (days)" value={editing.maxNegative} onChange={(v) => setE('maxNegative', v)} />}
                <Num title="Longest at a time (days)" value={editing.maxConsecutiveDays} onChange={(v) => setE('maxConsecutiveDays', v)} hint="0 = no limit" />
                <Num title="Notice needed (days)" value={editing.minNoticeDays} onChange={(v) => setE('minNoticeDays', v)} />
                <Num title="Can be applied after the fact (days)" value={editing.backdateDays} onChange={(v) => setE('backdateDays', v)} />
              </div>
              <div className="grid sm:grid-cols-2 gap-2 mt-4">
                <Check title="Paid leave" value={editing.paid} onChange={(v) => setE('paid', v)} />
                <Check title="No limit (no balance kept, e.g. unpaid leave)" value={editing.unlimited} onChange={(v) => setE('unlimited', v)} />
                <Check title="Half days allowed" value={editing.halfDayAllowed} onChange={(v) => setE('halfDayAllowed', v)} />
                <Check title="Weekly offs and holidays inside the leave count as leave" value={editing.sandwich} onChange={(v) => setE('sandwich', v)} />
                <Check title="A reason is required" value={editing.requiresReason} onChange={(v) => setE('requiresReason', v)} />
                <Check title="Active (people can apply)" value={editing.active} onChange={(v) => setE('active', v)} />
              </div>
              <div className="flex gap-3 mt-5">
                <button type="button" onClick={saveType} className="px-5 py-3 rounded-xl bg-primary text-primary-foreground text-[11px] font-black uppercase tracking-widest flex items-center gap-2"><Save size={14} /> Save leave type</button>
                <button type="button" onClick={() => setEditing(null)} className="px-5 py-3 rounded-xl border border-border text-[11px] font-black uppercase tracking-widest text-foreground">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {canAdjust && (
        <div className={card}>
          <h3 className="text-foreground text-base font-black uppercase tracking-tight mb-1">Change someone's balance</h3>
          <p className="text-[11px] font-bold text-muted-foreground mb-4">Use this for opening balances, corrections or bonus leave. Every change is recorded with your name and the reason.</p>
          <div className="grid md:grid-cols-4 gap-3">
            <select aria-label="Person" className={input} value={adj.employeeId} onChange={(e) => setAdj({ ...adj, employeeId: e.target.value })}>
              <option value="">Choose a person...</option>{people.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}</select>
            <select aria-label="Leave type to change" className={input} value={adj.leaveTypeId} onChange={(e) => setAdj({ ...adj, leaveTypeId: e.target.value })}>
              <option value="">Choose a leave type...</option>{types.filter((t) => !t.unlimited).map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}</select>
            <input aria-label="Days to add or remove" type="number" step="0.5" className={input} placeholder="Days (negative removes)" value={adj.days} onChange={(e) => setAdj({ ...adj, days: e.target.value })} />
            <input aria-label="Reason for change" className={input} maxLength={300} placeholder="Reason" value={adj.reason} onChange={(e) => setAdj({ ...adj, reason: e.target.value })} />
          </div>
          <button type="button" onClick={saveAdj} className="mt-4 px-5 py-3 rounded-xl bg-primary text-primary-foreground text-[11px] font-black uppercase tracking-widest flex items-center gap-2"><Save size={14} /> Save change</button>
        </div>
      )}

      {canConfig && (
        <div className={card}>
          <h3 className="text-foreground text-base font-black uppercase tracking-tight mb-1">Joining dates</h3>
          <p className="text-[11px] font-bold text-muted-foreground mb-4">Leave is earned from the joining date. If a date is empty, the day the person was added to Work-Pilot is used, which may be later than the real date.</p>
          <div className="space-y-2">
            {people.map((p) => (
              <div key={p._id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 rounded-2xl border border-border bg-muted/40">
                <p className="text-sm font-black text-foreground">{p.name}<span className="ml-2 text-[10px] font-bold text-muted-foreground">added {p.addedOn}</span></p>
                <div className="flex items-center gap-2">
                  <input aria-label={`Joining date of ${p.name}`} type="date" className={`${input} !w-auto !py-2`} value={dates[p._id] || ''} onChange={(e) => setDates({ ...dates, [p._id]: e.target.value })} />
                  <button type="button" aria-label={`Save joining date of ${p.name}`} onClick={() => saveDate(p)} className="p-2 rounded-xl border border-border hover:bg-muted"><Save size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveSetup;
