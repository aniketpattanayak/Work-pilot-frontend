import React, { useState, useEffect, useCallback } from 'react';
import API from '../api/axiosConfig';
import { Plus, Trash2, Save } from 'lucide-react';
import { dialog } from './Dialog';

/** Payroll setup: how days are counted, rounding, approval rule, payslip header and the salary components. */
const card = 'bg-card rounded-[2rem] border border-border p-5 md:p-8 shadow-xl';
const label = 'text-[10px] font-black text-slate-500 uppercase tracking-[0.25em]';
const input = 'px-4 py-3 rounded-2xl border border-border bg-background text-foreground text-sm font-bold w-full';
const primary = 'px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest bg-primary text-primary-foreground disabled:opacity-50';
const ghost = 'px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-border bg-background text-foreground disabled:opacity-50';
const err = (e, d) => e?.response?.data?.message || d;

const PayrollSetup = ({ can }) => {
  const canConfig = can('payroll.configure');
  const [cfg, setCfg] = useState(null);
  const [suggested, setSuggested] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await API.get('/tasks/payroll/config');
      setCfg({ ...r.data.config, components: (r.data.config.components || []).map((c) => ({ ...c })) });
      setSuggested(r.data.suggested || []);
    } catch (e) { await dialog.alert(err(e, 'Could not load payroll settings.'), { tone: 'error' }); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (!cfg) return <div className={card}><p className="text-sm font-bold text-muted-foreground">Loading...</p></div>;

  const set = (k, v) => setCfg((c) => ({ ...c, [k]: v }));
  const setComp = (i, k, v) => setCfg((c) => ({ ...c, components: c.components.map((x, idx) => (idx === i ? { ...x, [k]: v } : x)) }));
  const addComp = (c) => setCfg((x) => ({ ...x, components: [...x.components, c || { name: '', type: 'earning', calc: 'fixed', value: 0, prorate: true, active: true }] }));
  const removeComp = async (i) => {
    const name = cfg.components[i].name || 'this component';
    if (await dialog.confirm(`Remove "${name}"? It will no longer be paid or deducted for anyone, from the next calculation.`, { danger: true, confirmText: 'Remove' })) {
      setCfg((x) => ({ ...x, components: x.components.filter((_, idx) => idx !== i) }));
    }
  };
  const unusedSuggestions = suggested.filter((s) => !cfg.components.some((c) => c.name.toLowerCase() === s.name.toLowerCase()));

  const save = async () => {
    setBusy(true);
    try {
      const body = {
        dayBasis: cfg.dayBasis, roundNet: !!cfg.roundNet, allowSelfApproval: !!cfg.allowSelfApproval,
        employerName: cfg.employerName || '', employerAddress: cfg.employerAddress || '',
        components: cfg.components.map((c) => ({ key: c.key, name: c.name, type: c.type, calc: c.calc, value: Number(c.value), prorate: !!c.prorate, active: c.active !== false }))
      };
      const r = await API.put('/tasks/payroll/config', body);
      setCfg({ ...r.data.config, components: (r.data.config.components || []).map((c) => ({ ...c })) });
      await dialog.alert('Payroll settings saved.', { tone: 'success' });
    } catch (e) { await dialog.alert(err(e, 'Could not save.'), { tone: 'error' }); }
    setBusy(false);
  };

  return (
    <div className="space-y-6">
      <div className={card}>
        <h3 className="text-foreground text-sm font-black uppercase tracking-widest mb-4">How pay is worked out</h3>
        <fieldset disabled={!canConfig} className="space-y-4">
          <div>
            <label className={label}>Days used to divide the month</label>
            <select aria-label="Day basis" className={input} value={cfg.dayBasis} onChange={(e) => set('dayBasis', e.target.value)}>
              <option value="calendar">Actual days in the month (28 to 31)</option>
              <option value="30">Always 30 days</option>
            </select>
            <p className="text-[10px] font-bold text-muted-foreground mt-1">Each unpaid day takes away one day's share of the month's pay. Present days, weekly offs, holidays and paid leave are paid; absent days and unpaid leave are not.</p>
          </div>
          <label className="flex items-center gap-2 text-sm font-bold text-foreground cursor-pointer"><input type="checkbox" aria-label="Round net pay" checked={!!cfg.roundNet} onChange={(e) => set('roundNet', e.target.checked)} />Round net pay to the whole rupee</label>
          <label className="flex items-center gap-2 text-sm font-bold text-foreground cursor-pointer"><input type="checkbox" aria-label="Allow self approval" checked={!!cfg.allowSelfApproval} onChange={(e) => set('allowSelfApproval', e.target.checked)} />The person who prepared a payroll may also approve it (not recommended)</label>
        </fieldset>
      </div>

      <div className={card}>
        <h3 className="text-foreground text-sm font-black uppercase tracking-widest mb-4">Payslip heading</h3>
        <fieldset disabled={!canConfig} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className={label}>Company name on payslips</label><input aria-label="Employer name" className={input} maxLength={100} value={cfg.employerName || ''} onChange={(e) => set('employerName', e.target.value)} /></div>
          <div><label className={label}>Address on payslips</label><input aria-label="Employer address" className={input} maxLength={250} value={cfg.employerAddress || ''} onChange={(e) => set('employerAddress', e.target.value)} /></div>
        </fieldset>
      </div>

      <div className={card}>
        <h3 className="text-foreground text-sm font-black uppercase tracking-widest mb-1">Salary components</h3>
        <p className="text-[11px] font-bold text-muted-foreground mb-4">Basic salary is always there. Add the other earnings (like house rent) and deductions your company uses. Each person's salary then picks the ones that apply to them. "Cut for unpaid days" means the amount shrinks when a person has unpaid days.</p>
        {cfg.components.length === 0 && <p className="text-sm font-bold text-muted-foreground mb-3">No components yet. Salaries will have basic pay only.</p>}
        <div className="space-y-3">
          {cfg.components.map((c, i) => (
            <div key={i} className="grid grid-cols-2 md:grid-cols-[2fr_1fr_1.2fr_1fr_auto_auto_auto] gap-2 items-end border border-border rounded-2xl p-3">
              <div><label className={label}>Name</label><input aria-label={`Component name ${i + 1}`} className={input} maxLength={40} disabled={!canConfig} value={c.name} onChange={(e) => setComp(i, 'name', e.target.value)} /></div>
              <div><label className={label}>Type</label><select aria-label={`Component type ${i + 1}`} className={input} disabled={!canConfig} value={c.type} onChange={(e) => setComp(i, 'type', e.target.value)}><option value="earning">Earning</option><option value="deduction">Deduction</option></select></div>
              <div><label className={label}>Amount is</label><select aria-label={`Component calc ${i + 1}`} className={input} disabled={!canConfig} value={c.calc} onChange={(e) => setComp(i, 'calc', e.target.value)}><option value="fixed">A fixed amount</option><option value="percentBasic">% of basic</option></select></div>
              <div><label className={label}>{c.calc === 'percentBasic' ? 'Percent' : 'Rupees'}</label><input aria-label={`Component value ${i + 1}`} type="number" min="0" step="any" className={input} disabled={!canConfig} value={c.value} onChange={(e) => setComp(i, 'value', e.target.value)} /></div>
              <label className="flex items-center gap-1 text-[11px] font-bold text-foreground"><input type="checkbox" aria-label={`Cut for unpaid days ${i + 1}`} disabled={!canConfig} checked={!!c.prorate} onChange={(e) => setComp(i, 'prorate', e.target.checked)} />Cut for unpaid days</label>
              <label className="flex items-center gap-1 text-[11px] font-bold text-foreground"><input type="checkbox" aria-label={`In use ${i + 1}`} disabled={!canConfig} checked={c.active !== false} onChange={(e) => setComp(i, 'active', e.target.checked)} />In use</label>
              {canConfig && <button type="button" aria-label={`Remove component ${i + 1}`} onClick={() => removeComp(i)} className="p-2 text-red-500"><Trash2 size={16} /></button>}
            </div>
          ))}
        </div>
        {canConfig && (
          <div className="flex flex-wrap gap-2 mt-4">
            <button type="button" className={ghost} onClick={() => addComp()}><Plus size={12} className="inline mr-1" />Add component</button>
            {unusedSuggestions.map((s) => <button key={s.name} type="button" className={ghost} onClick={() => addComp({ ...s, active: true })}>+ {s.name}</button>)}
          </div>
        )}
      </div>

      {canConfig && <button type="button" className={primary} disabled={busy} onClick={save}><Save size={14} className="inline mr-2" />Save payroll settings</button>}
      {!canConfig && <p className="text-[11px] font-bold text-muted-foreground">You can view these settings but not change them.</p>}
    </div>
  );
};

export default PayrollSetup;
