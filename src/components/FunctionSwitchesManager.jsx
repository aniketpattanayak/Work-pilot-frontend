import React, { useCallback, useEffect, useState } from 'react';
import API from '../api/axiosConfig';
import { invalidateCompanySettings } from '../hooks/useCompanySettings';
import { Save } from 'lucide-react';

/**
 * Admin screen: turn individual functions on or off for the whole company.
 * The platform owner decides which switches an admin gets to see.
 */
export default function FunctionSwitchesManager() {
  const [rows, setRows] = useState([]);
  const [orig, setOrig] = useState({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ text: '', bad: false });

  const load = useCallback(async () => {
    try {
      const r = await API.get('/config/settings');
      const list = Array.isArray(r.data && r.data.switches) ? r.data.switches : [];
      setRows(list);
      setOrig(Object.fromEntries(list.map((s) => [s.key, s.value])));
    } catch (e) {
      setMsg({ text: (e.response && e.response.data && e.response.data.message) || 'Could not load the settings.', bad: true });
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const changed = rows.filter((s) => s.value !== orig[s.key]);
  const save = async () => {
    setBusy(true); setMsg({ text: '', bad: false });
    try {
      await API.put('/config/settings/switches', Object.fromEntries(changed.map((s) => [s.key, s.value])));
      invalidateCompanySettings();
      await load();
      setMsg({ text: 'Saved.', bad: false });
    } catch (e) {
      setMsg({ text: (e.response && e.response.data && e.response.data.message) || 'Could not save.', bad: true });
    } finally { setBusy(false); }
  };

  const groups = [...new Set(rows.map((s) => s.group))];
  return (
    <section className="bg-card rounded-2xl border border-border p-5 md:p-6 shadow-sm" data-testid="function-switches">
      <h3 className="text-foreground text-base font-black mb-1 uppercase tracking-tight">Functions on / off</h3>
      <p className="text-[11px] text-slate-500 mb-4">Switch a function off if your company does not use it. Everything is on by default, as before.</p>
      {rows.length === 0 && <p className="text-xs text-slate-400">No switches are available for your company.</p>}
      {groups.map((g) => (
        <div key={g} className="mb-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{g}</p>
          <ul className="space-y-2">
            {rows.filter((s) => s.group === g).map((s) => (
              <li key={s.key} className="flex items-start justify-between gap-4 p-3 rounded-xl border border-border bg-background">
                <div className="min-w-0">
                  <p className="text-xs font-black text-foreground">{s.label}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{s.help}</p>
                </div>
                <button type="button" role="switch" aria-checked={s.value} aria-label={s.label}
                  onClick={() => setRows((rs) => rs.map((x) => (x.key === s.key ? { ...x, value: !x.value } : x)))}
                  className={`shrink-0 w-11 h-6 rounded-full border transition-colors relative ${s.value ? 'bg-emerald-500 border-emerald-500' : 'bg-slate-300 dark:bg-slate-700 border-border'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${s.value ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div className="flex items-center gap-3">
        <button type="button" disabled={busy || changed.length === 0} onClick={save}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-40">
          <Save size={14} /> Save switches
        </button>
        {msg.text && <span role="status" className={`text-xs font-bold ${msg.bad ? 'text-red-500' : 'text-emerald-600'}`}>{msg.text}</span>}
      </div>
    </section>
  );
}
