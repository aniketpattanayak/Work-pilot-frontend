import React, { useState, useEffect, useCallback } from 'react';
import API from '../api/axiosConfig';
import { X } from 'lucide-react';
import { dialog } from './Dialog';
import { inr, monthLabel } from '../utils/payrollFormat';

/** Salaries: who has a salary set, and a form to set or change one (a change keeps the old salary as history). */
const card = 'bg-card rounded-[2rem] border border-border p-5 md:p-8 shadow-xl';
const label = 'text-[10px] font-black text-slate-500 uppercase tracking-[0.25em]';
const input = 'px-4 py-3 rounded-2xl border border-border bg-background text-foreground text-sm font-bold w-full';
const primary = 'px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest bg-primary text-primary-foreground disabled:opacity-50';
const ghost = 'px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-border bg-background text-foreground disabled:opacity-50';
const err = (e, d) => e?.response?.data?.message || d;
const todayIST = () => new Date(Date.now() + 330 * 60 * 1000).toISOString().slice(0, 10);
const defaultAmount = (c, basic) => (c.calc === 'percentBasic' ? Math.round((Number(basic) || 0) * Number(c.value) ) / 100 : Number(c.value));

const Editor = ({ person, canEdit, onClose, onSaved }) => {
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);

  const startFrom = useCallback((comps, version) => {
    const basic = version ? String(version.basic) : '';
    const items = {};
    comps.forEach((c) => {
      const it = version && (version.items || []).find((x) => x.key === c.key);
      items[c.key] = it ? { on: true, amount: String(it.amount), auto: false } : { on: false, amount: String(defaultAmount(c, basic)), auto: true };
    });
    const b = (version && version.bank) || {};
    return { effectiveFrom: todayIST().slice(0, 8) + '01', basic, items, bank: { accountName: b.accountName || '', bankName: b.bankName || '', accountNumber: '', ifsc: b.ifsc || '' }, bankHint: b.accountNumber || '', note: '',
      uan: (version && version.uan) || '', esiNumber: (version && version.esiNumber) || '', pan: (version && version.pan) || '',
      pfExempt: !!(version && version.pfExempt), esiExempt: !!(version && version.esiExempt), ptExempt: !!(version && version.ptExempt) };
  }, []);

  useEffect(() => {
    let live = true;
    API.get(`/tasks/payroll/salaries/${person._id}`).then((r) => {
      if (!live) return;
      const comps = (r.data.components || []).filter((c) => c.active !== false);
      setData({ ...r.data, components: comps });
      setForm(startFrom(comps, (r.data.versions || [])[0]));
    }).catch(async (e) => { await dialog.alert(err(e, 'Could not load this salary.'), { tone: 'error' }); onClose(); });
    return () => { live = false; };
  }, [person._id, startFrom, onClose]);

  if (!data || !form) return null;
  const comps = data.components;
  const setBasic = (v) => setForm((f) => {
    const items = { ...f.items };
    comps.forEach((c) => { if (items[c.key].auto) items[c.key] = { ...items[c.key], amount: String(defaultAmount(c, v)) }; });
    return { ...f, basic: v, items };
  });
  const setItem = (key, patch) => setForm((f) => ({ ...f, items: { ...f.items, [key]: { ...f.items[key], ...patch } } }));
  const sum = (type) => comps.filter((c) => c.type === type && form.items[c.key].on).reduce((s, c) => s + (Number(form.items[c.key].amount) || 0), 0);
  const gross = (Number(form.basic) || 0) + sum('earning');
  const ded = sum('deduction');

  const save = async () => {
    try {
      await API.put(`/tasks/payroll/salaries/${person._id}`, {
        effectiveFrom: form.effectiveFrom, basic: Number(form.basic),
        items: comps.filter((c) => form.items[c.key].on).map((c) => ({ key: c.key, amount: Number(form.items[c.key].amount) })),
        bank: form.bank, note: form.note,
        uan: form.uan, esiNumber: form.esiNumber, pan: form.pan, pfExempt: form.pfExempt, esiExempt: form.esiExempt, ptExempt: form.ptExempt
      });
      await dialog.alert('Salary saved.', { tone: 'success' });
      onSaved();
    } catch (e) { await dialog.alert(err(e, 'Could not save the salary.'), { tone: 'error' }); }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={`Salary of ${person.name}`} className="fixed inset-0 z-[300] bg-black/60 flex items-center justify-center p-3">
      <div className="bg-card rounded-[2rem] border border-border shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-auto p-5 md:p-8">
        <div className="flex justify-between items-start gap-3 mb-4">
          <div><h3 className="text-foreground text-lg font-black uppercase tracking-tight">{person.name}</h3><p className="text-[11px] font-bold text-muted-foreground">{person.department || 'No department'}</p></div>
          <button type="button" aria-label="Close salary" onClick={onClose} className="p-2 rounded-xl border border-border text-foreground"><X size={16} /></button>
        </div>

        {canEdit ? (
          <div className="space-y-4">
            <p className="text-[11px] font-bold text-muted-foreground">Saving adds a new salary from the date below. Earlier salaries stay as history, and payroll for earlier months is not changed.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className={label}>Applies from</label><input aria-label="Applies from" type="date" className={input} value={form.effectiveFrom} onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })} /></div>
              <div><label className={label}>Monthly basic salary (Rs.)</label><input aria-label="Basic salary" type="number" min="0" step="any" className={input} value={form.basic} onChange={(e) => setBasic(e.target.value)} /></div>
            </div>
            {comps.length > 0 && (
              <div>
                <label className={label}>Allowances and deductions for this person</label>
                <div className="space-y-2 mt-2">
                  {comps.map((c) => (
                    <div key={c.key} className="flex items-center gap-3 border border-border rounded-2xl px-3 py-2">
                      <label className="flex items-center gap-2 text-sm font-bold text-foreground flex-1 cursor-pointer"><input type="checkbox" aria-label={c.name} checked={form.items[c.key].on} onChange={(e) => setItem(c.key, { on: e.target.checked })} />{c.name}<span className="text-[10px] uppercase text-muted-foreground">{c.type}</span></label>
                      <input aria-label={`${c.name} amount`} type="number" min="0" step="any" disabled={!form.items[c.key].on} className={`${input} !w-36`} value={form.items[c.key].amount} onChange={(e) => setItem(c.key, { amount: e.target.value, auto: false })} />
                    </div>
                  ))}
                </div>
              </div>
            )}
            <p className="text-sm font-black text-foreground" aria-label="Salary summary">Monthly gross Rs. {inr(gross)} &nbsp;|&nbsp; Deductions Rs. {inr(ded)} &nbsp;|&nbsp; Net at full attendance Rs. {inr(gross - ded)}</p>
            <div>
              <label className={label}>Bank details (for the bank file)</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                <input aria-label="Account holder" className={input} placeholder="Account holder name" maxLength={80} value={form.bank.accountName} onChange={(e) => setForm({ ...form, bank: { ...form.bank, accountName: e.target.value } })} />
                <input aria-label="Bank name" className={input} placeholder="Bank name" maxLength={80} value={form.bank.bankName} onChange={(e) => setForm({ ...form, bank: { ...form.bank, bankName: e.target.value } })} />
                <input aria-label="Account number" className={input} placeholder={form.bankHint ? `Saved: ${form.bankHint} (leave empty to keep)` : 'Account number'} maxLength={30} value={form.bank.accountNumber} onChange={(e) => setForm({ ...form, bank: { ...form.bank, accountNumber: e.target.value } })} />
                <input aria-label="IFSC" className={input} placeholder="IFSC (for example HDFC0001234)" maxLength={15} value={form.bank.ifsc} onChange={(e) => setForm({ ...form, bank: { ...form.bank, ifsc: e.target.value } })} />
              </div>
            </div>
            <div>
              <label className={label}>PF, ESI and tax details</label>
              <p className="text-[10px] font-bold text-muted-foreground mt-1">Used when the company has PF, ESI or professional tax switched on. Tick "left out" for someone who should not have it deducted.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                <input aria-label="UAN" className={input} placeholder="UAN (12 digits)" maxLength={14} value={form.uan} onChange={(e) => setForm({ ...form, uan: e.target.value })} />
                <input aria-label="ESI number" className={input} placeholder="ESI number" maxLength={20} value={form.esiNumber} onChange={(e) => setForm({ ...form, esiNumber: e.target.value })} />
                <input aria-label="PAN" className={input} placeholder="PAN (ABCDE1234F)" maxLength={12} value={form.pan} onChange={(e) => setForm({ ...form, pan: e.target.value })} />
              </div>
              <div className="flex flex-wrap gap-4 mt-2">
                <label className="flex items-center gap-2 text-sm font-bold text-foreground cursor-pointer"><input type="checkbox" aria-label="Leave out of PF" checked={form.pfExempt} onChange={(e) => setForm({ ...form, pfExempt: e.target.checked })} />Left out of PF</label>
                <label className="flex items-center gap-2 text-sm font-bold text-foreground cursor-pointer"><input type="checkbox" aria-label="Leave out of ESI" checked={form.esiExempt} onChange={(e) => setForm({ ...form, esiExempt: e.target.checked })} />Left out of ESI</label>
                <label className="flex items-center gap-2 text-sm font-bold text-foreground cursor-pointer"><input type="checkbox" aria-label="Leave out of professional tax" checked={form.ptExempt} onChange={(e) => setForm({ ...form, ptExempt: e.target.checked })} />No professional tax</label>
              </div>
            </div>
            <Declaration person={person} />
            <div><label className={label}>Note (optional)</label><input aria-label="Note" className={input} maxLength={200} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="For example: annual increment" /></div>
            <button type="button" className={primary} onClick={save}>Save salary</button>
          </div>
        ) : <p className="text-[11px] font-bold text-muted-foreground mb-3">You can view salaries but not change them.</p>}

        <div className="mt-6">
          <h4 className={label}>Salary history</h4>
          {(data.versions || []).length === 0 && <p className="text-sm font-bold text-muted-foreground mt-2">No salary set yet.</p>}
          <div className="space-y-2 mt-2">
            {(data.versions || []).map((v) => (
              <div key={v.effectiveFrom} className="flex flex-wrap items-center justify-between gap-2 border border-border rounded-2xl px-4 py-2 text-sm font-bold text-foreground">
                <span>From {v.effectiveFrom}</span><span>Basic {inr(v.basic)}</span><span>Gross {inr(v.gross)}</span><span>Net {inr(v.net)}</span>
                {canEdit && <button type="button" className={ghost} onClick={() => setForm({ ...startFrom(comps, v), effectiveFrom: form.effectiveFrom })}>Use as starting point</button>}
              </div>
            ))}
          </div>
          <PayslipHistory person={person} />
        </div>
      </div>
    </div>
  );
};

// Income tax declaration for the current financial year (used for TDS when the company has it switched on)
const DECL_FIELDS = [['section80C', 'Investments under 80C (PF is added automatically)'], ['section80D', 'Health insurance (80D)'], ['nps80CCD1B', 'NPS extra (80CCD(1B))'], ['homeLoanInterest', 'Home loan interest'], ['hraExemption', 'House rent exemption'], ['otherDeductions', 'Other deductions']];
const Declaration = ({ person }) => {
  const [d, setD] = useState(null);
  const [meta, setMeta] = useState({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    API.get(`/tasks/payroll/declarations/${person._id}`).then((r) => { if (live) { setD({ ...r.data.declaration }); setMeta({ fy: r.data.fy, defaultRegime: r.data.defaultRegime, tdsOn: r.data.tdsOn }); } }).catch(() => {});
    return () => { live = false; };
  }, [person._id]);
  if (!d) return null;
  const set = (k, v) => setD((x) => ({ ...x, [k]: v }));
  const regime = d.regime || meta.defaultRegime || 'new';
  const save = async () => {
    setBusy(true);
    try {
      await API.put(`/tasks/payroll/declarations/${person._id}`, { fy: meta.fy, ...d });
      await dialog.alert('Tax declaration saved. Press Recalculate on a draft payroll to use it.', { tone: 'success' });
    } catch (e) { await dialog.alert(err(e, 'Could not save the tax declaration.'), { tone: 'error' }); }
    setBusy(false);
  };
  return (
    <div>
      <label className={label}>Income tax declaration for {meta.fy}</label>
      <p className="text-[10px] font-bold text-muted-foreground mt-1">{meta.tdsOn ? 'Used to work out tax deducted from the salary.' : 'Income tax is not switched on for the company yet (Setup), so this is not used.'}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
        <div><label className={label}>Tax regime</label>
          <select aria-label="Tax regime" className={input} value={d.regime} onChange={(e) => set('regime', e.target.value)}>
            <option value="">Company default ({meta.defaultRegime === 'old' ? 'old' : 'new'})</option><option value="new">New regime</option><option value="old">Old regime</option>
          </select></div>
        <div />
        {regime === 'old' && DECL_FIELDS.map(([k, t]) => <div key={k}><label className={label}>{t}</label><input aria-label={t} type="number" min="0" step="any" className={input} value={d[k]} onChange={(e) => set(k, e.target.value)} /></div>)}
        <div><label className={label}>Salary already paid this year before this payroll</label><input aria-label="Earlier income" type="number" min="0" step="any" className={input} value={d.prevIncome} onChange={(e) => set('prevIncome', e.target.value)} /></div>
        <div><label className={label}>Tax already deducted on that</label><input aria-label="Earlier tax" type="number" min="0" step="any" className={input} value={d.prevTds} onChange={(e) => set('prevTds', e.target.value)} /></div>
      </div>
      <p className="text-[10px] font-bold text-muted-foreground mt-1">Earlier income means salary from April to the first month run here, or from a previous employer. Leave it at 0 if Work-Pilot paid this person since April.</p>
      <button type="button" className={`${ghost} mt-2`} disabled={busy} onClick={save}>Save tax declaration</button>
    </div>
  );
};

// Released payslips of this person (shown only to people who can see salaries)
const PayslipHistory = ({ person }) => {
  const [list, setList] = useState([]);
  useEffect(() => { API.get(`/tasks/payroll/person/${person._id}/payslips`).then((r) => setList(r.data?.payslips || [])).catch(() => {}); }, [person._id]);
  if (!list.length) return null;
  return (
    <div className="mt-4">
      <h4 className={label}>Released payslips</h4>
      <div className="flex flex-wrap gap-2 mt-2">{list.map((p) => <span key={p.runId} className="px-3 py-1 rounded-full border border-border text-[11px] font-bold text-foreground">{monthLabel(p.month)}: Rs. {inr(p.net)}</span>)}</div>
    </div>
  );
};

const PayrollSalaries = ({ can }) => {
  const [people, setPeople] = useState(null);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null);
  const load = useCallback(async () => {
    try { setPeople((await API.get('/tasks/payroll/salaries')).data.people || []); }
    catch (e) { await dialog.alert(err(e, 'Could not load salaries.'), { tone: 'error' }); setPeople([]); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const close = useCallback(() => setOpen(null), []);
  if (!people) return <div className={card}><p className="text-sm font-bold text-muted-foreground">Loading...</p></div>;
  const shown = people.filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()));
  const missing = people.filter((p) => !p.hasSalary).length;
  const canEdit = can('payroll.configure');

  return (
    <div className={card}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <input aria-label="Search people" className={`${input} !w-64`} placeholder="Search by name" value={q} onChange={(e) => setQ(e.target.value)} />
        {missing > 0 && <span className="text-[11px] font-black uppercase tracking-widest text-amber-600">{missing} without a salary</span>}
      </div>
      <div className="overflow-x-auto">
        <table className="mobile-card-table w-full text-left text-sm">
          <thead><tr className="text-[10px] font-black uppercase tracking-widest text-slate-500"><th className="py-2 pr-3">Name</th><th className="pr-3">Department</th><th className="pr-3 text-right">Basic</th><th className="pr-3 text-right">Monthly gross</th><th className="pr-3">From</th><th /></tr></thead>
          <tbody>
            {shown.map((p) => (
              <tr key={p._id} className="border-t border-border font-bold text-foreground">
                <td className="py-2 pr-3">{p.name}</td><td className="pr-3">{p.department || '-'}</td>
                <td className="pr-3 text-right">{p.hasSalary ? inr(p.basic) : <span className="text-amber-600">Not set</span>}</td>
                <td className="pr-3 text-right">{p.hasSalary ? inr(p.gross) : '-'}</td><td className="pr-3">{p.effectiveFrom || '-'}</td>
                <td className="text-right"><button type="button" aria-label={`${canEdit ? (p.hasSalary ? 'Change salary of' : 'Set salary of') : 'View salary of'} ${p.name}`} className={ghost} onClick={() => setOpen(p)}>{canEdit ? (p.hasSalary ? 'Change' : 'Set salary') : 'View'}</button></td>
              </tr>
            ))}
            {shown.length === 0 && <tr><td colSpan="6" className="py-4 text-sm font-bold text-muted-foreground">No one matches.</td></tr>}
          </tbody>
        </table>
      </div>
      {open && <Editor person={open} canEdit={canEdit} onClose={close} onSaved={() => { setOpen(null); load(); }} />}
    </div>
  );
};

export default PayrollSalaries;
