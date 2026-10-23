import React, { useCallback, useEffect, useState } from 'react';
import { Save, Send } from 'lucide-react';
import API from '../api/axiosConfig';

/**
 * Admin: the daily WhatsApp task reminder (overdue / today / tomorrow tasks for each person).
 * Shown only to companies the platform owner switched it on for.
 */
export default function DailyAlertManager() {
  const [st, setSt] = useState(null);           // { available, enabled, time }
  const [enabled, setEnabled] = useState(false);
  const [time, setTime] = useState('08:30');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ text: '', bad: false });

  const load = useCallback(async () => {
    try {
      const r = await API.get('/config/settings');
      const d = (r.data && r.data.dailyAlert) || { available: false };
      setSt(d); setEnabled(!!d.enabled); setTime(d.time || '08:30');
    } catch (e) { setSt({ available: false }); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (!st || !st.available) return null;

  const run = async (fn, ok) => {
    setBusy(true); setMsg({ text: '', bad: false });
    try { const r = await fn(); await load(); setMsg({ text: ok(r), bad: false }); }
    catch (e) { setMsg({ text: (e.response && e.response.data && e.response.data.message) || 'Something went wrong.', bad: true }); }
    finally { setBusy(false); }
  };
  const save = () => run(() => API.put('/config/settings/daily-alert', { enabled, time }), () => (enabled ? `Saved. The reminder goes out every day at ${time}.` : 'Saved. The reminder is switched off.'));
  const test = () => run(() => API.post('/config/settings/daily-alert/test'), (r) => {
    const c = (r.data && r.data.counts) || {};
    return `Sent to your WhatsApp number (overdue ${c.overdue || 0}, today ${c.today || 0}, tomorrow ${c.tomorrow || 0}).`;
  });
  const changed = enabled !== !!st.enabled || time !== (st.time || '08:30');

  return (
    <section className="bg-card rounded-2xl border border-border p-5 md:p-6 shadow-sm" data-testid="daily-alert">
      <h3 className="text-foreground text-base font-black mb-1 uppercase tracking-tight">Daily task reminder (WhatsApp)</h3>
      <p className="text-[11px] text-slate-500 mb-4">
        Every morning each person gets one WhatsApp message with their <b>overdue</b> tasks, tasks due <b>today</b> and tasks due <b>tomorrow</b> (delegation and checklist).
        People with nothing pending, no WhatsApp number, or on leave get no message.
      </p>
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest">
          <input type="checkbox" className="w-4 h-4 accent-[hsl(var(--primary))]" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} data-testid="daily-alert-on" />
          Send every day
        </label>
        <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest">
          Time (India)
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} data-testid="daily-alert-time" className="px-3 py-2 rounded-xl border border-border bg-background text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/20" />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={busy || !changed || !/^\d{2}:\d{2}$/.test(time)} onClick={save} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-50"><Save size={12} /> Save</button>
        <button type="button" disabled={busy} onClick={test} className="px-4 py-2 rounded-xl border border-border text-[10px] font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-50"><Send size={12} /> Send me a test now</button>
      </div>
      {msg.text && <p className={`mt-3 text-xs font-bold ${msg.bad ? 'text-red-500' : 'text-emerald-600'}`}>{msg.text}</p>}
      <p className="mt-3 text-[10px] text-slate-500">The message uses the WhatsApp template <b>daily_task_alert</b>. It is listed under "WhatsApp messages" below, where you can switch it off or point it to your own approved template.</p>
    </section>
  );
}
