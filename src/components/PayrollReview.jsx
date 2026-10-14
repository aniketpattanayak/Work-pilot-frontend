import React, { useState, useEffect, useCallback } from 'react';
import API from '../api/axiosConfig';
import { X, AlertTriangle, CheckCircle2, Info, Upload } from 'lucide-react';
import { dialog } from './Dialog';
import { inr, monthLabel } from '../utils/payrollFormat';

/** Review of one payroll: automatic checks, statutory totals, reviewer sign-off, and a comparison with the payroll in use today. */
const label = 'text-[10px] font-black text-slate-500 uppercase tracking-[0.25em]';
const input = 'px-4 py-3 rounded-2xl border border-border bg-background text-foreground text-sm font-bold w-full';
const primary = 'px-5 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest bg-primary text-primary-foreground disabled:opacity-50';
const ghost = 'px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-border bg-background text-foreground disabled:opacity-50';
const err = (e, d) => e?.response?.data?.message || d;
const FIELD_NAMES = { gross: 'Gross', net: 'Net pay', pf: 'PF', esi: 'ESI', pt: 'Professional tax', tds: 'Income tax' };
const when = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
const readText = (file) => new Promise((resolve, reject) => { const fr = new FileReader(); fr.onload = () => resolve(String(fr.result || '')); fr.onerror = () => reject(new Error('read')); fr.readAsText(file); });

const Checks = ({ run, can, onChanged }) => {
  const [d, setD] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try { setD((await API.get(`/tasks/payroll/runs/${run._id}/review`)).data); }
    catch (e) { await dialog.alert(err(e, 'Could not prepare the review.'), { tone: 'error' }); }
  }, [run._id]);
  useEffect(() => { load(); }, [load]);
  if (!d) return <p className="text-sm font-bold text-muted-foreground">Loading...</p>;

  const sign = async (status) => {
    setBusy(true);
    try {
      await API.post(`/tasks/payroll/runs/${run._id}/reviews`, { status, note });
      setNote(''); await load(); onChanged();
    } catch (e) { await dialog.alert(err(e, 'Could not save the review.'), { tone: 'error' }); }
    setBusy(false);
  };
  const st = d.statutory || {};
  const stat = [['PF (employee)', st.pfEmployee], ['PF (employer)', st.pfEmployer], ['ESI (employee)', st.esiEmployee], ['ESI (employer)', st.esiEmployer], ['Professional tax', st.professionalTax], ['Income tax (TDS)', st.tds]].filter(([, v]) => v > 0);
  const icon = (lv) => (lv === 'error' ? <AlertTriangle size={14} className="text-red-600 shrink-0 mt-0.5" /> : lv === 'warn' ? <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" /> : <Info size={14} className="text-muted-foreground shrink-0 mt-0.5" />);
  const reviewable = ['Draft', 'Approved'].includes(d.status);

  return (
    <div className="space-y-5">
      <div>
        <p className={label}>Checks{d.previousMonth ? ` (compared with ${monthLabel(d.previousMonth)})` : ''}</p>
        <div className="space-y-2 mt-2">
          {d.checks.map((c, i) => (
            <div key={i} className="flex gap-2 text-sm font-bold text-foreground border border-border rounded-2xl px-3 py-2">
              {icon(c.level)}
              <div><p>{c.text}</p>{c.people.length > 0 && <p className="text-[11px] font-bold text-muted-foreground">{c.people.join(', ')}{c.more ? ` and ${c.more} more` : ''}</p>}</div>
            </div>
          ))}
          {!d.checks.some((c) => c.level !== 'info') && <p className="flex items-center gap-2 text-sm font-bold text-emerald-600"><CheckCircle2 size={14} />No errors or warnings found.</p>}
        </div>
      </div>

      {stat.length > 0 && (
        <div>
          <p className={label}>Statutory totals</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
            {stat.map(([n, v]) => <div key={n} className="border border-border rounded-2xl px-3 py-2"><p className="text-[10px] font-black uppercase text-slate-500">{n}</p><p className="text-sm font-black text-foreground">Rs. {inr(v)}</p></div>)}
          </div>
        </div>
      )}

      <div>
        <p className={label}>Review</p>
        {d.requireReview && <p className="text-[11px] font-bold text-muted-foreground mt-1">This company needs a reviewer to mark the payroll as reviewed before it can be approved. Changing any figure clears earlier sign-offs.</p>}
        <div className="space-y-2 mt-2">
          {d.reviews.length === 0 && <p className="text-sm font-bold text-muted-foreground">No one has reviewed these figures yet.</p>}
          {d.reviews.map((r, i) => (
            <div key={i} className="border border-border rounded-2xl px-3 py-2 text-sm font-bold text-foreground">
              <span className={r.status === 'Reviewed' ? 'text-emerald-600' : 'text-amber-600'}>{r.status === 'Reviewed' ? 'Reviewed' : 'Query'}</span> by {r.byName} <span className="text-[11px] text-muted-foreground">{when(r.at)}</span>
              {r.note && <p className="text-[12px] font-bold text-muted-foreground">{r.note}</p>}
            </div>
          ))}
        </div>
        {reviewable && (
          <div className="mt-3 space-y-2">
            <textarea aria-label="Review note" className={input} rows={2} maxLength={500} placeholder="Note (needed for a query)" value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="flex flex-wrap gap-2">
              <button type="button" className={primary} disabled={busy} onClick={() => sign('Reviewed')}>Mark as reviewed</button>
              <button type="button" className={ghost} disabled={busy} onClick={() => sign('Query')}>Raise a query</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Compare = ({ run }) => {
  const [file, setFile] = useState(null);
  const [tol, setTol] = useState('1');
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const go = async () => {
    if (!file) { await dialog.alert('Choose the CSV file of your current payroll first.', { tone: 'warning' }); return; }
    setBusy(true);
    try {
      const csv = await readText(file);
      const r = await API.post(`/tasks/payroll/runs/${run._id}/compare`, { csv, tolerance: Number(tol) || 0 });
      setRes(r.data);
    } catch (e) { await dialog.alert(err(e, 'Could not compare the payrolls.'), { tone: 'error' }); }
    setBusy(false);
  };
  const c = res && res.counts;
  return (
    <div className="space-y-4">
      <p className="text-[11px] font-bold text-muted-foreground">Run Work-Pilot next to your current payroll for a month or two. Upload your current payroll as a CSV (one row per person, with columns like Employee Name, Gross and Net Pay; PF, ESI, Professional Tax and TDS columns are compared too if present). People are matched by name.</p>
      <div className="flex flex-wrap items-end gap-3">
        <div><label className={label}>Current payroll (CSV)</label><input aria-label="Payroll file" type="file" accept=".csv,text/csv" className={input} onChange={(e) => { setFile(e.target.files && e.target.files[0]); setRes(null); }} /></div>
        <div><label className={label}>Ignore gaps up to (Rs.)</label><input aria-label="Tolerance" type="number" min="0" className={`${input} !w-32`} value={tol} onChange={(e) => setTol(e.target.value)} /></div>
        <button type="button" className={primary} disabled={busy} onClick={go}><Upload size={13} className="inline mr-2" />Compare</button>
      </div>
      {res && (
        <div className="space-y-4">
          <p className="text-sm font-black text-foreground" aria-label="Comparison summary">{c.matched} people matched: {c.same} the same, {c.different} different. {c.onlyOther} only in your file, {c.onlyWorkPilot} only in Work-Pilot.</p>
          <div className="overflow-x-auto"><table className="mobile-card-table w-full text-left text-sm"><thead><tr className="text-[10px] font-black uppercase tracking-widest text-slate-500"><th className="py-1 pr-3">Total (matched people)</th><th className="pr-3 text-right">Work-Pilot</th><th className="pr-3 text-right">Your file</th><th className="text-right">Difference</th></tr></thead>
            <tbody>{Object.entries(res.totals).map(([f, t]) => <tr key={f} className="border-t border-border font-bold text-foreground"><td className="py-1 pr-3">{FIELD_NAMES[f] || f}</td><td className="pr-3 text-right">{inr(t.workPilot)}</td><td className="pr-3 text-right">{inr(t.other)}</td><td className={`text-right ${t.difference ? 'text-amber-600' : ''}`}>{inr(t.difference)}</td></tr>)}</tbody></table></div>
          {res.different.length > 0 && (
            <div><p className={label}>Differences</p>
              <div className="space-y-1 mt-2">{res.different.map((m) => (
                <div key={m.name} className="border border-border rounded-2xl px-3 py-2 text-sm font-bold text-foreground"><span>{m.name}</span>
                  {m.diffs.map((x) => <span key={x.field} className="ml-3 text-[12px] text-amber-600">{FIELD_NAMES[x.field] || x.field}: Work-Pilot {inr(x.workPilot)}, file {inr(x.other)} ({x.difference > 0 ? '+' : ''}{inr(x.difference)})</span>)}
                </div>))}</div></div>
          )}
          {res.onlyOther.length > 0 && <p className="text-[12px] font-bold text-foreground"><span className={label}>Only in your file: </span>{res.onlyOther.join(', ')}</p>}
          {res.onlyWorkPilot.length > 0 && <p className="text-[12px] font-bold text-foreground"><span className={label}>Only in Work-Pilot: </span>{res.onlyWorkPilot.join(', ')}</p>}
          {(res.skipped || []).length > 0 && <p className="text-[11px] font-bold text-amber-600">{res.skipped.join('; ')}</p>}
        </div>
      )}
    </div>
  );
};

const PayrollReview = ({ run, can, onClose, onChanged }) => {
  const [tab, setTab] = useState('checks');
  return (
    <div role="dialog" aria-modal="true" aria-label="Payroll review" className="fixed inset-0 z-[300] bg-black/60 flex items-center justify-center p-3">
      <div className="bg-card rounded-[2rem] border border-border shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-auto p-5 md:p-8">
        <div className="flex justify-between items-start gap-3 mb-4">
          <div><h3 className="text-foreground text-lg font-black uppercase tracking-tight">Review and checks</h3><p className="text-[11px] font-bold text-muted-foreground">{monthLabel(run.month)} · {run.status}</p></div>
          <button type="button" aria-label="Close review" onClick={onClose} className="p-2 rounded-xl border border-border text-foreground"><X size={16} /></button>
        </div>
        <div className="flex gap-2 mb-4">
          <button type="button" className={tab === 'checks' ? primary : ghost} onClick={() => setTab('checks')}>Checks and sign-off</button>
          <button type="button" className={tab === 'compare' ? primary : ghost} onClick={() => setTab('compare')}>Compare with current payroll</button>
        </div>
        {tab === 'checks' ? <Checks run={run} can={can} onChanged={onChanged} /> : <Compare run={run} />}
      </div>
    </div>
  );
};

export default PayrollReview;
