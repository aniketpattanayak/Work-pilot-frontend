import React, { useCallback, useEffect, useState } from 'react';
import { Save, Trash2, Plus } from 'lucide-react';
import API from '../api/axiosConfig';
import { invalidateDateReasons } from '../hooks/useDateReasons';

/** Admin: the list of reasons people choose from when a deadline changes. */
export default function DateReasonsManager() {
  const [list, setList] = useState([]);
  const [isDefault, setIsDefault] = useState(true);
  const [add, setAdd] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ text: '', bad: false });

  const load = useCallback(async () => {
    try {
      const r = await API.get('/config/settings');
      setList(Array.isArray(r.data && r.data.dateReasons) ? r.data.dateReasons : []);
      setIsDefault(!!(r.data && r.data.dateReasonsAreDefault));
    } catch (e) { setMsg({ text: (e.response && e.response.data && e.response.data.message) || 'Could not load the reasons.', bad: true }); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async (reasons) => {
    setBusy(true); setMsg({ text: '', bad: false });
    try {
      await API.put('/config/settings/date-reasons', { reasons });
      invalidateDateReasons();
      await load();
      setMsg({ text: reasons.length ? 'Saved.' : 'Back to the standard list.', bad: false });
    } catch (e) { setMsg({ text: (e.response && e.response.data && e.response.data.message) || 'Could not save.', bad: true }); }
    finally { setBusy(false); }
  };
  const addOne = () => {
    const t = add.trim(); if (!t) return;
    if (list.some((x) => x.toLowerCase() === t.toLowerCase())) { setMsg({ text: 'That reason is already in the list.', bad: true }); return; }
    const next = list.filter((x) => x !== 'Other'); next.push(t); next.push('Other'); setList(next); setAdd('');
  };

  return (
    <section className="bg-card rounded-2xl border border-border p-5 md:p-6 shadow-sm" data-testid="date-reasons">
      <h3 className="text-foreground text-base font-black mb-1 uppercase tracking-tight">Reasons for changing a deadline</h3>
      <p className="text-[11px] text-slate-500 mb-4">When a deadline is changed, the person picks one of these. "Other" always stays and needs a note. {isDefault ? 'You are using the standard list.' : 'You are using your own list.'}</p>
      <ul className="space-y-2 mb-3">
        {list.map((r) => (
          <li key={r} className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl border border-border bg-background text-xs font-bold">
            <span className="min-w-0 break-words">{r}</span>
            {r !== 'Other' && <button type="button" aria-label={`Remove ${r}`} onClick={() => setList(list.filter((x) => x !== r))} className="text-red-500 p-1"><Trash2 size={14} /></button>}
          </li>
        ))}
      </ul>
      <div className="flex gap-2 mb-4">
        <input aria-label="New reason" value={add} maxLength={60} onChange={(e) => setAdd(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOne(); } }} placeholder="Add a reason" className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-border bg-background text-sm" />
        <button type="button" onClick={addOne} className="px-3 py-2 rounded-xl border border-border text-xs font-black uppercase tracking-widest flex items-center gap-1"><Plus size={13} /> Add</button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={busy} onClick={() => save(list)} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-50"><Save size={13} /> Save list</button>
        {!isDefault && <button type="button" disabled={busy} onClick={() => save([])} className="px-4 py-2 rounded-xl border border-border text-xs font-black uppercase tracking-widest disabled:opacity-50">Back to standard list</button>}
        {msg.text && <span role="status" className={`text-xs font-bold ${msg.bad ? 'text-red-500' : 'text-emerald-600'}`}>{msg.text}</span>}
      </div>
    </section>
  );
}
