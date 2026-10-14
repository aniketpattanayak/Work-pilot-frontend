import React, { useState, useEffect, useCallback } from 'react';
import API from '../api/axiosConfig';
import { dialog } from './Dialog';
import { Download, RefreshCcw, ScrollText } from 'lucide-react';

/**
 * Employee activity log (Admin only): who did what and when, from one date to another (India dates).
 * Default range = today only. `showTable={false}` gives the download-only card used in the Report Hub.
 */
const PAGE = 100;
const todayIST = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
const fmtAt = (iso) => new Date(iso).toLocaleString('en-GB', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
const MODULE_TONE = {
  Login: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  Delegation: 'bg-purple-500/15 text-purple-700 dark:text-purple-300',
  Checklist: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  FMS: 'bg-orange-500/15 text-orange-700 dark:text-orange-300'
};

const ActivityLogPanel = ({ tenantId, showTable = true }) => {
  const tid = tenantId || localStorage.getItem('tenantId');
  const [from, setFrom] = useState(todayIST());
  const [to, setTo] = useState(todayIST());
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [more, setMore] = useState(false);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const valid = !!from && !!to && from <= to;

  const load = useCallback(async (skip = 0) => {
    if (!tid || !valid || !showTable) return;
    try {
      skip ? setMore(true) : setLoading(true);
      setError('');
      const res = await API.get(`/reports/activity/${tid}`, { params: { from, to, limit: PAGE, skip } });
      const list = Array.isArray(res.data?.rows) ? res.data.rows : [];
      setRows((prev) => (skip ? [...prev, ...list] : list));
      setTotal(res.data?.total || 0);
    } catch (e) {
      if (!skip) setRows([]);
      setError(e.response?.data?.message || 'Could not load the activity log.');
    } finally {
      setLoading(false); setMore(false);
    }
  }, [tid, from, to, valid, showTable]);

  useEffect(() => { load(0); }, [load]);

  const download = async () => {
    if (!valid || downloading) return;
    setDownloading(true);
    try {
      const res = await API.get(`/reports/activity/${tid}/download`, { params: { from, to }, responseType: 'blob' });
      const type = res.data?.type || '';
      if (type.includes('json') || type.startsWith('text/')) throw Object.assign(new Error('The server did not send a spreadsheet.'), { response: { data: res.data, status: res.status } });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = `WorkPilot_Activity_${from}_to_${to}.xlsx`;
      document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
    } catch (err) {
      let reason = '';
      try {
        const d = err?.response?.data;
        if (d && typeof d.text === 'function') { const t = await d.text(); try { reason = JSON.parse(t).message || t.slice(0, 200); } catch { reason = t.slice(0, 200); } }
        else if (d?.message) reason = d.message;
      } catch { /* generic text below */ }
      await dialog.alert('Could not download the activity log.\n' + (reason || err?.message || 'Unknown error'), { tone: 'error', title: 'Download failed' });
    } finally {
      setDownloading(false);
    }
  };

  const inputCls = 'bg-background border border-border rounded-lg px-2 py-1 text-xs font-bold';
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3 text-left">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="font-black uppercase text-sm flex items-center gap-2 text-foreground"><ScrollText size={16} className="text-primary" /> {showTable ? 'Activity log' : 'Employee Activity Log'}</h3>
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">From</label>
          <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">To</label>
          <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className={inputCls} />
          {showTable && <button onClick={() => load(0)} disabled={!valid || loading} title="Refresh" className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-50"><RefreshCcw size={14} className={loading ? 'animate-spin' : ''} /></button>}
          <button onClick={download} disabled={!valid || downloading} className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-black flex items-center gap-1.5 disabled:opacity-50"><Download size={14} /> {downloading ? 'Preparing…' : 'Download Excel'}</button>
        </div>
      </div>
      {!valid && <p className="text-xs font-bold text-red-500">The "to" date cannot be before the "from" date.</p>}
      {!showTable && <p className="text-[11px] font-bold text-slate-500">Pick a date range to download who did what and when: logins, task assigned / completed, checklist completions and FMS steps, with date and time (India time).</p>}
      {showTable && (
        <>
          {error ? <p className="text-xs font-bold text-red-500 py-4 text-center">{error}</p> : (
            <div className="overflow-auto max-h-[420px] border border-border rounded-lg">
              <table className="mobile-card-table w-full text-[11px] border-collapse min-w-[760px]">
                <thead className="sticky top-0 bg-muted z-10">
                  <tr className="text-[10px] font-black uppercase tracking-wider text-left">
                    <th className="px-2 py-1.5">Time (IST)</th><th className="px-2 py-1.5">Employee</th><th className="px-2 py-1.5">Module</th>
                    <th className="px-2 py-1.5">Action</th><th className="px-2 py-1.5">Details</th><th className="px-2 py-1.5">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-t border-border odd:bg-background/40">
                      <td className="px-2 py-1 whitespace-nowrap tabular-nums">{fmtAt(r.at)}</td>
                      <td className="px-2 py-1 font-bold whitespace-nowrap">{r.employee}</td>
                      <td className="px-2 py-1"><span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${MODULE_TONE[r.module] || 'bg-slate-500/15 text-slate-600 dark:text-slate-300'}`}>{r.module}</span></td>
                      <td className="px-2 py-1 font-semibold">{r.action}</td>
                      <td className="px-2 py-1 text-slate-600 dark:text-slate-300">{r.details || '—'}</td>
                      <td className="px-2 py-1 text-slate-600 dark:text-slate-300">{r.reference || '—'}</td>
                    </tr>
                  ))}
                  {!loading && rows.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-slate-400 font-bold">No activity in this range</td></tr>}
                  {loading && <tr><td colSpan={6} className="py-8 text-center text-slate-400 font-bold">Loading…</td></tr>}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
            <span>{total ? `Showing ${rows.length} of ${total}` : ''}</span>
            {rows.length < total && <button onClick={() => load(rows.length)} disabled={more} className="px-3 py-1 rounded-lg border border-border hover:bg-muted">{more ? 'Loading…' : 'Show more'}</button>}
          </div>
        </>
      )}
    </div>
  );
};

export default ActivityLogPanel;
