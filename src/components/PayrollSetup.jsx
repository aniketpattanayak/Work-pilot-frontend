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

// Settings as the server sends them, with any missing part filled in
const STAT_DEFAULTS = {
  pf: { enabled: false, capWages: true, wageCeiling: 15000, employeePct: 12, employerPct: 12, epsPct: 8.33, epsCeiling: 15000, adminPct: 0.5, edliPct: 0.5 },
  esi: { enabled: false, grossLimit: 21000, employeePct: 0.75, employerPct: 3.25 },
  pt: { enabled: false, state: '', slabs: [] },
  tds: { enabled: false, defaultRegime: 'new' }
};
const fromServer = (config) => {
  const st = config.statutory || {};
  return {
    ...config, components: (config.components || []).map((c) => ({ ...c })),
    statutory: { pf: { ...STAT_DEFAULTS.pf, ...(st.pf || {}) }, esi: { ...STAT_DEFAULTS.esi, ...(st.esi || {}) }, pt: { ...STAT_DEFAULTS.pt, ...(st.pt || {}), slabs: ((st.pt && st.pt.slabs) || []).map((x) => ({ ...x })) }, tds: { ...STAT_DEFAULTS.tds, ...(st.tds || {}) } }
  };
};

const PayrollSetup = ({ can }) => {
  const canConfig = can('payroll.configure');
  const [cfg, setCfg] = useState(null);
  const [suggested, setSuggested] = useState([]);
  const [presets, setPresets] = useState({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await API.get('/tasks/payroll/config');
      setCfg(fromServer(r.data.config));
      setSuggested(r.data.suggested || []);
      setPresets(r.data.ptPresets || {});
    } catch (e) { await dialog.alert(err(e, 'Could not load payroll settings.'), { tone: 'error' }); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (!cfg) return <div className={card}><p className="text-sm font-bold text-muted-foreground">Loading...</p></div>;

  const set = (k, v) => setCfg((c) => ({ ...c, [k]: v }));
  const setStat = (sec, k, v) => setCfg((c) => ({ ...c, statutory: { ...c.statutory, [sec]: { ...c.statutory[sec], [k]: v } } }));
  const setSlab = (i, k, v) => setStat('pt', 'slabs', cfg.statutory.pt.slabs.map((x, idx) => (idx === i ? { ...x, [k]: v } : x)));
  const addSlab = () => setStat('pt', 'slabs', [...cfg.statutory.pt.slabs, { from: '', amount: '' }]);
  const removeSlab = (i) => setStat('pt', 'slabs', cfg.statutory.pt.slabs.filter((_, idx) => idx !== i));
  const pickState = async (name) => {
    if (!name) { setStat('pt', 'state', ''); return; }
    const p = presets[name];
    if (!p) return;
    if (cfg.statutory.pt.slabs.length && !(await dialog.confirm(`Replace the current slabs with the starting slabs for ${name}?`, { confirmText: 'Replace' }))) return;
    setCfg((c) => ({ ...c, statutory: { ...c.statutory, pt: { ...c.statutory.pt, state: name, slabs: p.slabs.map((x) => ({ ...x })) } } }));
    if (p.note) await dialog.alert(p.note);
  };
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
        dayBasis: cfg.dayBasis, roundNet: !!cfg.roundNet, allowSelfApproval: !!cfg.allowSelfApproval, requireReview: !!cfg.requireReview,
        employerName: cfg.employerName || '', employerAddress: cfg.employerAddress || '',
        components: cfg.components.map((c) => ({ key: c.key, name: c.name, type: c.type, calc: c.calc, value: Number(c.value), prorate: !!c.prorate, active: c.active !== false, pf: c.type === 'earning' && !!c.pf })),
        statutory: {
          pf: { ...cfg.statutory.pf }, esi: { ...cfg.statutory.esi }, tds: { enabled: !!cfg.statutory.tds.enabled, defaultRegime: cfg.statutory.tds.defaultRegime === 'old' ? 'old' : 'new' },
          pt: { enabled: !!cfg.statutory.pt.enabled, state: cfg.statutory.pt.state || '', slabs: cfg.statutory.pt.slabs.map((x) => ({ from: Number(x.from), amount: Number(x.amount), ...(x.febAmount !== undefined && x.febAmount !== null && x.febAmount !== '' ? { febAmount: Number(x.febAmount) } : {}) })) }
        }
      };
      const r = await API.put('/tasks/payroll/config', body);
      setCfg(fromServer(r.data.config));
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
          <label className="flex items-center gap-2 text-sm font-bold text-foreground cursor-pointer"><input type="checkbox" aria-label="Require review" checked={!!cfg.requireReview} onChange={(e) => set('requireReview', e.target.checked)} />A reviewer (for example HR head or your CA) must mark each payroll as reviewed before it can be approved</label>
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
            <div key={i} className="grid grid-cols-2 md:grid-cols-[2fr_1fr_1.2fr_1fr_auto_auto_auto_auto] gap-2 items-end border border-border rounded-2xl p-3">
              <div><label className={label}>Name</label><input aria-label={`Component name ${i + 1}`} className={input} maxLength={40} disabled={!canConfig} value={c.name} onChange={(e) => setComp(i, 'name', e.target.value)} /></div>
              <div><label className={label}>Type</label><select aria-label={`Component type ${i + 1}`} className={input} disabled={!canConfig} value={c.type} onChange={(e) => setComp(i, 'type', e.target.value)}><option value="earning">Earning</option><option value="deduction">Deduction</option></select></div>
              <div><label className={label}>Amount is</label><select aria-label={`Component calc ${i + 1}`} className={input} disabled={!canConfig} value={c.calc} onChange={(e) => setComp(i, 'calc', e.target.value)}><option value="fixed">A fixed amount</option><option value="percentBasic">% of basic</option></select></div>
              <div><label className={label}>{c.calc === 'percentBasic' ? 'Percent' : 'Rupees'}</label><input aria-label={`Component value ${i + 1}`} type="number" min="0" step="any" className={input} disabled={!canConfig} value={c.value} onChange={(e) => setComp(i, 'value', e.target.value)} /></div>
              <label className="flex items-center gap-1 text-[11px] font-bold text-foreground"><input type="checkbox" aria-label={`Cut for unpaid days ${i + 1}`} disabled={!canConfig} checked={!!c.prorate} onChange={(e) => setComp(i, 'prorate', e.target.checked)} />Cut for unpaid days</label>
              {c.type === 'earning' ? <label className="flex items-center gap-1 text-[11px] font-bold text-foreground"><input type="checkbox" aria-label={`Counts for PF ${i + 1}`} disabled={!canConfig} checked={!!c.pf} onChange={(e) => setComp(i, 'pf', e.target.checked)} />Counts for PF</label> : <span />}
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

      <div className={card}>
        <h3 className="text-foreground text-sm font-black uppercase tracking-widest mb-1">PF, ESI and professional tax</h3>
        <p className="text-[11px] font-bold text-muted-foreground mb-4">Switch on only what applies to your company. The rates below are the current ones under the law, but they change, so check them with your CA before using them. Employee shares are taken from the pay; employer shares are shown as company cost on the payslip and register. Anyone can be left out on their own salary.</p>
        <fieldset disabled={!canConfig} className="space-y-6">
          <div>
            <label className="flex items-center gap-2 text-sm font-black text-foreground cursor-pointer"><input type="checkbox" aria-label="Provident Fund on" checked={!!cfg.statutory.pf.enabled} onChange={(e) => setStat('pf', 'enabled', e.target.checked)} />Provident Fund (PF)</label>
            {cfg.statutory.pf.enabled && (
              <div className="mt-3 space-y-3">
                <label className="flex items-center gap-2 text-sm font-bold text-foreground cursor-pointer"><input type="checkbox" aria-label="Cap PF wages" checked={!!cfg.statutory.pf.capWages} onChange={(e) => setStat('pf', 'capWages', e.target.checked)} />Work PF out on wages up to the ceiling only</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[['wageCeiling', 'Wage ceiling (Rs.)'], ['employeePct', 'Employee %'], ['employerPct', 'Employer %'], ['epsPct', 'of which pension (EPS) %'], ['epsCeiling', 'Pension wage ceiling (Rs.)'], ['adminPct', 'Admin charge %'], ['edliPct', 'EDLI %']].map(([k, t]) => (
                    <div key={k}><label className={label}>{t}</label><input aria-label={`PF ${t}`} type="number" min="0" step="any" className={input} value={cfg.statutory.pf[k]} onChange={(e) => setStat('pf', k, e.target.value)} /></div>
                  ))}
                </div>
                <p className="text-[10px] font-bold text-muted-foreground">PF wages are Basic plus any earning marked "Counts for PF" above, after cuts for unpaid days.</p>
              </div>
            )}
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-black text-foreground cursor-pointer"><input type="checkbox" aria-label="ESI on" checked={!!cfg.statutory.esi.enabled} onChange={(e) => setStat('esi', 'enabled', e.target.checked)} />Employees' State Insurance (ESI)</label>
            {cfg.statutory.esi.enabled && (
              <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3">
                {[['grossLimit', 'Covered up to a monthly salary of (Rs.)'], ['employeePct', 'Employee %'], ['employerPct', 'Employer %']].map(([k, t]) => (
                  <div key={k}><label className={label}>{t}</label><input aria-label={`ESI ${t}`} type="number" min="0" step="any" className={input} value={cfg.statutory.esi[k]} onChange={(e) => setStat('esi', k, e.target.value)} /></div>
                ))}
                <p className="col-span-full text-[10px] font-bold text-muted-foreground">Cover is decided by the salary on record at the start of each period (April to September, October to March). Someone covered at the start stays covered until the period ends. Amounts are rounded up to the next rupee.</p>
              </div>
            )}
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-black text-foreground cursor-pointer"><input type="checkbox" aria-label="Professional tax on" checked={!!cfg.statutory.pt.enabled} onChange={(e) => setStat('pt', 'enabled', e.target.checked)} />Professional tax</label>
            {cfg.statutory.pt.enabled && (
              <div className="mt-3 space-y-3">
                <div className="max-w-sm"><label className={label}>Start from a state</label>
                  <select aria-label="Professional tax state" className={input} value={Object.keys(presets).includes(cfg.statutory.pt.state) ? cfg.statutory.pt.state : ''} onChange={(e) => pickState(e.target.value)}>
                    <option value="">{cfg.statutory.pt.state && !presets[cfg.statutory.pt.state] ? cfg.statutory.pt.state : 'Choose a state'}</option>
                    {Object.keys(presets).map((n) => <option key={n} value={n}>{n}</option>)}
                  </select></div>
                <div className="space-y-2">
                  {cfg.statutory.pt.slabs.map((s, i) => (
                    <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
                      <div><label className={label}>Monthly gross from (Rs.)</label><input aria-label={`Slab from ${i + 1}`} type="number" min="0" className={input} value={s.from} onChange={(e) => setSlab(i, 'from', e.target.value)} /></div>
                      <div><label className={label}>Tax per month (Rs.)</label><input aria-label={`Slab amount ${i + 1}`} type="number" min="0" className={input} value={s.amount} onChange={(e) => setSlab(i, 'amount', e.target.value)} /></div>
                      <div><label className={label}>February (optional)</label><input aria-label={`Slab February ${i + 1}`} type="number" min="0" className={input} value={s.febAmount === undefined || s.febAmount === null ? '' : s.febAmount} onChange={(e) => setSlab(i, 'febAmount', e.target.value)} /></div>
                      {canConfig && <button type="button" aria-label={`Remove slab ${i + 1}`} onClick={() => removeSlab(i)} className="p-2 text-red-500"><Trash2 size={16} /></button>}
                    </div>
                  ))}
                </div>
                {canConfig && <button type="button" className={ghost} onClick={addSlab}><Plus size={12} className="inline mr-1" />Add slab</button>}
                <p className="text-[10px] font-bold text-muted-foreground">The slab with the highest "from" that is at or below the month's gross applies. Remove any "Professional Tax" line from salary components so it is not deducted twice. States that collect twice a year are not covered: enter the yearly amount spread over months if your state allows.</p>
              </div>
            )}
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-black text-foreground cursor-pointer"><input type="checkbox" aria-label="Income tax on" checked={!!cfg.statutory.tds.enabled} onChange={(e) => setStat('tds', 'enabled', e.target.checked)} />Income tax on salary (TDS)</label>
            {cfg.statutory.tds.enabled && (
              <div className="mt-3 space-y-3 max-w-md">
                <div><label className={label}>Regime used when a person has not chosen one</label>
                  <select aria-label="Default tax regime" className={input} value={cfg.statutory.tds.defaultRegime} onChange={(e) => setStat('tds', 'defaultRegime', e.target.value)}><option value="new">New regime</option><option value="old">Old regime</option></select></div>
                <p className="text-[10px] font-bold text-muted-foreground">Each month, tax is worked out for the whole year (salary so far, this month, and the months to come) and the balance is spread over the months left. A person's regime, investments and earlier income go in their salary form under "Income tax declaration". Bonuses raise that month's tax. Perquisites, two employers at once and surcharge relief are not handled, so ask your CA to review the first runs.</p>
              </div>
            )}
          </div>
        </fieldset>
      </div>

      {canConfig && <button type="button" className={primary} disabled={busy} onClick={save}><Save size={14} className="inline mr-2" />Save payroll settings</button>}
      {!canConfig && <p className="text-[11px] font-bold text-muted-foreground">You can view these settings but not change them.</p>}
    </div>
  );
};

export default PayrollSetup;
