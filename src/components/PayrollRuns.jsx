import React, { useState, useEffect, useCallback } from 'react';
import API from '../api/axiosConfig';
import { ArrowLeft, Plus, Trash2, X, Download, AlertTriangle } from 'lucide-react';
import { dialog } from './Dialog';
import PayslipModal from './PayslipModal';
import { inr, monthLabel, downloadCsv } from '../utils/payrollFormat';
import PayrollReview from './PayrollReview';

/** Payroll runs: prepare a month, check every person's pay, add bonuses or recoveries, approve, release and download. */
const card = 'bg-card rounded-[2rem] border border-border p-5 md:p-8 shadow-xl';
const label = 'text-[10px] font-black text-slate-500 uppercase tracking-[0.25em]';
const input = 'px-4 py-3 rounded-2xl border border-border bg-background text-foreground text-sm font-bold w-full';
const primary = 'px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest bg-primary text-primary-foreground disabled:opacity-50';
const ghost = 'px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-border bg-background text-foreground disabled:opacity-50';
const danger = 'px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-500/40 text-red-500 bg-background disabled:opacity-50';
const err = (e, d) => e?.response?.data?.message || d;
const prevMonth = () => { const d = new Date(Date.now() + 330 * 60 * 1000); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - 1); return d.toISOString().slice(0, 7); };

const STATUS = {
  Draft: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  Approved: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  Released: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
};
const Chip = ({ s }) => <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${STATUS[s] || ''}`}>{s}</span>;
const Stat = ({ title, value }) => (<div className="border border-border rounded-2xl p-4"><p className={label}>{title}</p><p className="text-foreground text-xl font-black mt-1">{value}</p></div>);

// ---------------------------------------------------------------- one person's line
const LineEditor = ({ run, line, editable, onClose, onSaved }) => {
  const [adj, setAdj] = useState((line.adjustments || []).map((a) => ({ ...a, amount: String(a.amount) })));
  const [hold, setHold] = useState(!!line.hold);
  const [holdNote, setHoldNote] = useState(line.holdNote || '');
  const [busy, setBusy] = useState(false);
  const setRow = (i, k, v) => setAdj((a) => a.map((x, idx) => (idx === i ? { ...x, [k]: v } : x)));
  const base = (list) => (list || []).filter((x) => !x.adjustment);

  const save = async () => {
    setBusy(true);
    try {
      await API.put(`/tasks/payroll/runs/${run._id}/lines/${line.employeeId}`, {
        adjustments: adj.map((a) => ({ label: a.label, type: a.type, amount: Number(a.amount), note: a.note || '' })),
        hold, holdNote
      });
      onSaved();
    } catch (e) { await dialog.alert(err(e, 'Could not save.'), { tone: 'error' }); }
    setBusy(false);
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={`Pay of ${line.name}`} className="fixed inset-0 z-[300] bg-black/60 flex items-center justify-center p-3">
      <div className="bg-card rounded-[2rem] border border-border shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-auto p-5 md:p-8">
        <div className="flex justify-between items-start gap-3 mb-3">
          <div><h3 className="text-foreground text-lg font-black uppercase">{line.name}</h3><p className="text-[11px] font-bold text-muted-foreground">{monthLabel(run.month)} · {line.days.payableDays} of {line.days.basisDays} days paid{line.days.unpaidDays ? `, ${line.days.unpaidDays} unpaid` : ''}</p></div>
          <button type="button" aria-label="Close pay details" onClick={onClose} className="p-2 rounded-xl border border-border text-foreground"><X size={16} /></button>
        </div>
        {(line.warnings || []).map((w, i) => <p key={i} className="text-[11px] font-bold text-amber-600 mb-1 flex gap-1"><AlertTriangle size={13} className="shrink-0 mt-0.5" />{w}</p>)}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4 text-sm font-bold text-foreground">
          <div><p className={label}>Earnings</p>{base(line.earnings).map((e) => <div key={e.key} className="flex justify-between border-b border-border py-1"><span>{e.name}</span><span>{inr(e.amount)}</span></div>)}</div>
          <div><p className={label}>Deductions</p>{base(line.deductions).length ? base(line.deductions).map((e) => <div key={e.key} className="flex justify-between border-b border-border py-1"><span>{e.name}</span><span>{inr(e.amount)}</span></div>) : <p className="text-muted-foreground py-1">None</p>}</div>
        </div>
        {line.statutoryInfo && line.statutoryInfo.tds && (
          <div className="mb-4 text-sm font-bold text-foreground">
            <p className={label}>Income tax working ({line.statutoryInfo.tds.regime === 'old' ? 'old' : 'new'} regime, year {line.statutoryInfo.tds.fy})</p>
            <div className="flex justify-between border-b border-border py-1"><span>Income for the year (projected)</span><span>{inr(line.statutoryInfo.tds.projectedIncome)}</span></div>
            {(line.statutoryInfo.tds.deductions || []).map((d) => <div key={d.name} className="flex justify-between border-b border-border py-1"><span>Less: {d.name}</span><span>{inr(d.amount)}</span></div>)}
            <div className="flex justify-between border-b border-border py-1"><span>Taxable income</span><span>{inr(line.statutoryInfo.tds.taxable)}</span></div>
            <div className="flex justify-between border-b border-border py-1"><span>Tax for the year (with cess)</span><span>{inr(line.statutoryInfo.tds.annualTax)}</span></div>
            <div className="flex justify-between border-b border-border py-1"><span>Already deducted this year</span><span>{inr(line.statutoryInfo.tds.alreadyDeducted)}</span></div>
            <div className="flex justify-between py-1"><span>Divided over {line.statutoryInfo.tds.monthsLeft} month(s) left</span><span>{inr((line.deductions.find((x) => x.key === 'tds') || { amount: 0 }).amount)}</span></div>
          </div>
        )}
        {(line.employer || []).length > 0 && (
          <div className="mb-4 text-sm font-bold text-foreground">
            <p className={label}>Employer contributions (paid by the company, not taken from the pay)</p>
            {line.employer.map((e) => <div key={e.key} className="flex justify-between border-b border-border py-1"><span>{e.name}</span><span>{inr(e.amount)}</span></div>)}
            <div className="flex justify-between py-1"><span>Total employer cost</span><span>{inr(line.employerTotal)}</span></div>
          </div>
        )}
        <div>
          <p className={label}>Additions and recoveries (bonus, advance recovery ...)</p>
          <div className="space-y-2 mt-2">
            {adj.map((a, i) => (
              <div key={i} className="grid grid-cols-[2fr_1.2fr_1fr_auto] gap-2 items-center">
                <input aria-label={`Adjustment name ${i + 1}`} className={input} disabled={!editable} maxLength={60} placeholder="Name, for example Diwali bonus" value={a.label} onChange={(e) => setRow(i, 'label', e.target.value)} />
                <select aria-label={`Adjustment type ${i + 1}`} className={input} disabled={!editable} value={a.type} onChange={(e) => setRow(i, 'type', e.target.value)}><option value="earning">Add to pay</option><option value="deduction">Take from pay</option></select>
                <input aria-label={`Adjustment amount ${i + 1}`} type="number" min="0" step="any" className={input} disabled={!editable} value={a.amount} onChange={(e) => setRow(i, 'amount', e.target.value)} />
                {editable && <button type="button" aria-label={`Remove adjustment ${i + 1}`} onClick={() => setAdj((x) => x.filter((_, idx) => idx !== i))} className="p-2 text-red-500"><Trash2 size={16} /></button>}
              </div>
            ))}
          </div>
          {adj.length === 0 && !editable && <p className="text-sm font-bold text-muted-foreground mt-2">None</p>}
          {editable && adj.length < 10 && <button type="button" className={`${ghost} mt-3`} onClick={() => setAdj((x) => [...x, { label: '', type: 'earning', amount: '', note: '' }])}><Plus size={12} className="inline mr-1" />Add</button>}
        </div>
        <div className="mt-5 border-t border-border pt-4">
          <label className="flex items-center gap-2 text-sm font-bold text-foreground cursor-pointer"><input type="checkbox" aria-label="Hold this payment" disabled={!editable} checked={hold} onChange={(e) => setHold(e.target.checked)} />Hold this person's payment (left out of this payroll)</label>
          {hold && <input aria-label="Reason for hold" className={`${input} mt-2`} disabled={!editable} maxLength={200} placeholder="Why is the payment on hold?" value={holdNote} onChange={(e) => setHoldNote(e.target.value)} />}
        </div>
        <p className="text-foreground text-sm font-black mt-4">Net pay now: Rs. {inr(line.net)} {editable && <span className="text-[10px] text-muted-foreground font-bold">(updates after you save)</span>}</p>
        {editable && <button type="button" className={`${primary} mt-4`} disabled={busy} onClick={save}>Save</button>}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- one run
const RunDetail = ({ runId, can, onBack }) => {
  const [data, setData] = useState(null);
  const [edit, setEdit] = useState(null);
  const [slip, setSlip] = useState(null);
  const [reviewing, setReviewing] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setData((await API.get(`/tasks/payroll/runs/${runId}`)).data); }
    catch (e) { await dialog.alert(err(e, 'Could not load this payroll.'), { tone: 'error' }); onBack(); }
  }, [runId, onBack]);
  useEffect(() => { load(); }, [load]);

  if (!data) return <div className={card}><p className="text-sm font-bold text-muted-foreground">Loading...</p></div>;
  const run = data.run;
  const paid = run.lines.filter((l) => !l.noStructure);
  const noSalary = run.lines.filter((l) => l.noStructure);
  const attention = paid.filter((l) => !l.hold && (l.warnings || []).length);
  const t = run.totals || {};

  const act = async (fn, okMsg) => {
    setBusy(true);
    try { await fn(); if (okMsg) await dialog.alert(okMsg, { tone: 'success' }); await load(); }
    catch (e) { await dialog.alert(err(e, 'That did not work.'), { tone: 'error' }); }
    setBusy(false);
  };
  const recalc = () => act(() => API.post(`/tasks/payroll/runs/${run._id}/recalculate`, {}), 'Recalculated from the latest attendance, leave and salaries.');
  const discard = async () => { if (await dialog.confirm('Discard this draft payroll? You can prepare the month again afterwards.', { danger: true, confirmText: 'Discard' })) { setBusy(true); try { await API.delete(`/tasks/payroll/runs/${run._id}`); onBack(); } catch (e) { await dialog.alert(err(e, 'Could not discard.'), { tone: 'error' }); setBusy(false); } } };
  const approve = async () => {
    if (attention.length && !(await dialog.confirm(`${attention.length} ${attention.length === 1 ? 'person has' : 'people have'} a warning. Approve anyway?`, { confirmText: 'Approve' }))) return;
    if (!(await dialog.confirm(`Approve the payroll for ${monthLabel(run.month)}? Net pay Rs. ${inr(t.net)} for ${t.count} people. It cannot be changed after this, unless it is sent back.`, { confirmText: 'Approve' }))) return;
    act(() => API.put(`/tasks/payroll/runs/${run._id}/approve`, {}), 'Payroll approved.');
  };
  const sendBack = async () => {
    const note = await dialog.prompt('Why is this payroll being sent back to draft?', { required: true });
    if (note === null || !String(note).trim()) return;
    act(() => API.put(`/tasks/payroll/runs/${run._id}/reopen`, { note: String(note).trim() }), 'Sent back to draft.');
  };
  const release = async () => {
    if (!(await dialog.confirm(`Release the payroll for ${monthLabel(run.month)}? Payslips become visible to ${t.count} people and this payroll is locked.`, { confirmText: 'Release' }))) return;
    act(() => API.put(`/tasks/payroll/runs/${run._id}/release`, {}), 'Payroll released. Payslips are now visible to employees.');
  };
  const file = (kind) => act(async () => { const r = await API.get(`/tasks/payroll/runs/${run._id}/export`, { params: { kind } }); downloadCsv(r.data.filename, r.data.csv, r.data.plain); if ((r.data.notes || []).length) await dialog.alert(r.data.notes.join(' '), { tone: 'warning' }); });

  const draft = run.status === 'Draft';
  return (
    <div className="space-y-6">
      <button type="button" onClick={onBack} className={ghost}><ArrowLeft size={12} className="inline mr-1" />All payrolls</button>
      <div className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="text-foreground text-xl font-black uppercase tracking-tight flex items-center gap-3">{monthLabel(run.month)} <Chip s={run.status} /></h3>
          <div className="flex flex-wrap gap-2">
            {draft && can('payroll.prepare', 'company') && <button type="button" className={ghost} disabled={busy} onClick={recalc}>Recalculate</button>}
            {draft && can('payroll.prepare', 'company') && <button type="button" className={danger} disabled={busy} onClick={discard}>Discard draft</button>}
            {draft && can('payroll.approve') && <button type="button" className={primary} disabled={busy} onClick={approve}>Approve</button>}
            {run.status === 'Approved' && can('payroll.approve') && <button type="button" className={ghost} disabled={busy} onClick={sendBack}>Send back</button>}
            {run.status === 'Approved' && can('payroll.release') && <button type="button" className={primary} disabled={busy} onClick={release}>Release payslips</button>}
            {can('payroll.viewSalary', 'company') && <button type="button" className={ghost} disabled={busy} onClick={() => setReviewing(true)}>Review and checks</button>}
            {can('payroll.export') && <button type="button" className={ghost} disabled={busy} onClick={() => file('register')}><Download size={12} className="inline mr-1" />Payroll register</button>}
            {can('payroll.export') && run.status !== 'Draft' && <button type="button" className={ghost} disabled={busy} onClick={() => file('bank')}><Download size={12} className="inline mr-1" />Bank file</button>}
            {can('payroll.export') && run.status !== 'Draft' && [['pf', 'pf', 'PF return file'], ['esi', 'esi', 'ESI file'], ['pt', 'pt', 'Professional tax'], ['tds', 'tds', 'TDS summary']].filter(([, key]) => run.statutory && run.statutory[key] && run.statutory[key].enabled).map(([kind, , name]) => (
              <button key={kind} type="button" className={ghost} disabled={busy} onClick={() => file(kind)}><Download size={12} className="inline mr-1" />{name}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Stat title="People paid" value={t.count || 0} /><Stat title="Gross" value={`Rs. ${inr(t.gross)}`} /><Stat title="Deductions" value={`Rs. ${inr(t.deductions)}`} /><Stat title="Net pay" value={`Rs. ${inr(t.net)}`} /><Stat title="On hold" value={t.held || 0} />{t.employer > 0 && <Stat title="Employer PF/ESI" value={`Rs. ${inr(t.employer)}`} />}
        </div>
        {draft && attention.length > 0 && <p className="text-[11px] font-black uppercase tracking-widest text-amber-600 mt-4"><AlertTriangle size={13} className="inline mr-1" />{attention.length} {attention.length === 1 ? 'person needs' : 'people need'} a look before approval</p>}
        {draft && <p className="text-[11px] font-bold text-muted-foreground mt-3">This is a draft. Days come from Attendance and approved Leave. If you correct attendance, press Recalculate.</p>}
      </div>

      <div className={card}>
        <div className="overflow-x-auto">
          <table className="mobile-card-table w-full text-left text-sm">
            <thead><tr className="text-[10px] font-black uppercase tracking-widest text-slate-500"><th className="py-2 pr-3">Name</th><th className="pr-3">Paid days</th><th className="pr-3 text-right">Gross</th><th className="pr-3 text-right">Deductions</th><th className="pr-3 text-right">Net pay</th><th className="pr-3">Notes</th><th /></tr></thead>
            <tbody>
              {paid.map((l) => (
                <tr key={String(l.employeeId)} className={`border-t border-border font-bold text-foreground ${l.hold ? 'opacity-60' : ''}`}>
                  <td className="py-2 pr-3">{l.name}<div className="text-[10px] text-muted-foreground">{l.department}</div></td>
                  <td className="pr-3">{l.days.payableDays} / {l.days.basisDays}</td>
                  <td className="pr-3 text-right">{inr(l.gross)}</td><td className="pr-3 text-right">{inr(l.totalDeductions)}</td><td className="pr-3 text-right">{inr(l.net)}</td>
                  <td className="pr-3 text-[11px]">{l.hold ? <span className="text-amber-600">On hold: {l.holdNote}</span> : (l.warnings || []).length ? <span className="text-amber-600">{l.warnings.length} warning{l.warnings.length > 1 ? 's' : ''}</span> : (l.adjustments || []).length ? `${l.adjustments.length} adjustment${l.adjustments.length > 1 ? 's' : ''}` : ''}</td>
                  <td className="text-right whitespace-nowrap">
                    {run.status === 'Released' && !l.hold && <button type="button" aria-label={`Payslip of ${l.name}`} className={ghost} onClick={() => setSlip(l)}>Payslip</button>}
                    {draft ? (can('payroll.prepare', 'company') ? <button type="button" aria-label={`Edit pay of ${l.name}`} className={ghost} onClick={() => setEdit(l)}>Edit</button> : <button type="button" aria-label={`View pay of ${l.name}`} className={ghost} onClick={() => setEdit(l)}>View</button>) : <button type="button" aria-label={`View pay of ${l.name}`} className={`${ghost} ml-1`} onClick={() => setEdit(l)}>View</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {noSalary.length > 0 && <p className="text-[11px] font-bold text-muted-foreground mt-4">Not included (no salary set): {noSalary.map((l) => l.name).join(', ')}.</p>}
      </div>

      {(run.history || []).length > 0 && (
        <div className={card}>
          <h4 className={label}>History</h4>
          <ul className="mt-2 space-y-1 text-[12px] font-bold text-foreground">
            {run.history.map((h, i) => <li key={i}>{new Date(h.at).toLocaleString('en-IN')} · {h.byName || 'Someone'} · {h.action.replace(/_/g, ' ')}{h.note ? `: ${h.note}` : ''}</li>)}
          </ul>
        </div>
      )}
      {reviewing && <PayrollReview run={run} can={can} onClose={() => setReviewing(false)} onChanged={load} />}
      {edit && <LineEditor run={run} line={edit} editable={draft && can('payroll.prepare', 'company')} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
      {slip && <PayslipModal runId={run._id} employeeId={String(slip.employeeId)} onClose={() => setSlip(null)} />}
    </div>
  );
};

// ---------------------------------------------------------------- list
const PayrollRuns = ({ can }) => {
  const [runs, setRuns] = useState(null);
  const [open, setOpen] = useState(null);
  const [month, setMonth] = useState(prevMonth());
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try { setRuns((await API.get('/tasks/payroll/runs')).data.runs || []); }
    catch (e) { await dialog.alert(err(e, 'Could not load payrolls.'), { tone: 'error' }); setRuns([]); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const back = useCallback(() => { setOpen(null); load(); }, [load]);

  const prepare = async () => {
    if (!month) return;
    setBusy(true);
    try { const r = await API.post('/tasks/payroll/runs', { month }); await load(); setOpen(r.data.runId); }
    catch (e) {
      const id = e?.response?.data?.runId;
      await dialog.alert(err(e, 'Could not prepare the payroll.'), { tone: 'error' });
      if (id) setOpen(id);
    }
    setBusy(false);
  };

  if (open) return <RunDetail runId={open} can={can} onBack={back} />;
  if (!runs) return <div className={card}><p className="text-sm font-bold text-muted-foreground">Loading...</p></div>;
  return (
    <div className="space-y-6">
      {can('payroll.prepare', 'company') && (
        <div className={card}>
          <h3 className="text-foreground text-sm font-black uppercase tracking-widest mb-3">Prepare a payroll</h3>
          <div className="flex flex-wrap items-end gap-3">
            <div><label className={label}>Month</label><input aria-label="Payroll month" type="month" className={`${input} !w-auto`} value={month} onChange={(e) => setMonth(e.target.value)} /></div>
            <button type="button" className={primary} disabled={busy || !month} onClick={prepare}>Prepare payroll</button>
          </div>
          <p className="text-[11px] font-bold text-muted-foreground mt-3">A month can be prepared after it has ended. Make sure attendance corrections and leave for the month are approved first. Set everyone's salary in the Salaries tab.</p>
        </div>
      )}
      <div className={card}>
        <h3 className="text-foreground text-sm font-black uppercase tracking-widest mb-3">Payrolls</h3>
        {runs.length === 0 && <p className="text-sm font-bold text-muted-foreground">No payroll has been prepared yet.</p>}
        <div className="space-y-2">
          {runs.map((r) => (
            <div key={r._id} className="flex flex-wrap items-center justify-between gap-3 border border-border rounded-2xl px-4 py-3 text-sm font-bold text-foreground">
              <span className="min-w-[8rem]">{monthLabel(r.month)}</span><Chip s={r.status} />
              <span>{(r.totals && r.totals.count) || 0} people</span><span>Net Rs. {inr(r.totals && r.totals.net)}</span>
              <button type="button" aria-label={`Open payroll ${monthLabel(r.month)}`} className={ghost} onClick={() => setOpen(r._id)}>Open</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PayrollRuns;
