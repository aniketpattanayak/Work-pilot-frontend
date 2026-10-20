import React, { useCallback, useEffect, useState } from 'react';
import API from '../api/axiosConfig';
import { Save, RotateCcw } from 'lucide-react';

const inp = 'w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/20';
const PLAIN = { maytapi: true };

/**
 * Admin screen: see every WhatsApp message the system sends, switch one off,
 * change its wording (providers that send plain text), use another approved
 * template name, or send it from another of the company's numbers.
 */
export default function WhatsAppMessagesManager() {
  const [data, setData] = useState({ templates: [], provider: 'doubletick' });
  const [open, setOpen] = useState(null);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ text: '', bad: false });

  const load = useCallback(async () => {
    try { const r = await API.get('/config/settings'); setData({ templates: r.data.templates || [], provider: r.data.provider || 'doubletick' }); }
    catch (e) { setMsg({ text: (e.response && e.response.data && e.response.data.message) || 'Could not load the messages.', bad: true }); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const plain = !!PLAIN[data.provider];
  const openRow = (t) => {
    setMsg({ text: '', bad: false });
    if (open === t.key) { setOpen(null); return; }
    const s = t.saved || {};
    setOpen(t.key);
    setForm({ enabled: s.enabled !== false, body: s.body || t.body, providerTemplate: s.providerTemplate || '', senderPhoneId: s.senderPhoneId || '' });
  };
  const call = async (fn, ok) => {
    setBusy(true); setMsg({ text: '', bad: false });
    try { await fn(); await load(); setMsg({ text: ok, bad: false }); }
    catch (e) { setMsg({ text: (e.response && e.response.data && e.response.data.message) || 'Could not save.', bad: true }); }
    finally { setBusy(false); }
  };
  const save = (t) => call(() => API.put(`/config/settings/whatsapp-templates/${t.key}`, {
    enabled: form.enabled,
    body: form.body.trim() === t.body.trim() ? '' : form.body,   // same as standard = nothing to store
    providerTemplate: form.providerTemplate,
    senderPhoneId: form.senderPhoneId,
  }), 'Saved.');
  const reset = (t) => call(async () => { await API.delete(`/config/settings/whatsapp-templates/${t.key}`); setOpen(null); }, 'Back to the standard message.');
  const quickToggle = (t) => call(() => API.put(`/config/settings/whatsapp-templates/${t.key}`, { enabled: (t.saved && t.saved.enabled) === false }), 'Saved.');

  return (
    <section className="bg-card rounded-2xl border border-border p-5 md:p-6 shadow-sm" data-testid="whatsapp-messages">
      <h3 className="text-foreground text-base font-black mb-1 uppercase tracking-tight">WhatsApp messages</h3>
      <p className="text-[11px] text-slate-500 mb-1">Every WhatsApp message the system sends. Switch one off, or open it to change it.</p>
      <p className="text-[11px] text-slate-500 mb-4">
        {plain
          ? 'Your WhatsApp provider sends plain text, so you can change the wording below.'
          : 'Your WhatsApp provider sends templates approved inside WhatsApp. The words are fixed by that approval, so here you can switch a message off or point it to another approved template name. To change the words, get a new template approved with your provider and enter its name.'}
      </p>
      <ul className="space-y-2">
        {data.templates.map((t) => {
          const on = !(t.saved && t.saved.enabled === false);
          const edited = !!(t.saved && (t.saved.body || t.saved.providerTemplate || t.saved.senderPhoneId));
          return (
            <li key={t.key} className="rounded-xl border border-border bg-background">
              <div className="flex items-center justify-between gap-3 p-3">
                <button type="button" onClick={() => openRow(t)} className="text-left min-w-0 flex-1">
                  <p className="text-xs font-black text-foreground">{t.label} {edited && <span className="ml-1 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 text-[8px] font-black uppercase">Changed</span>}</p>
                  <p className="text-[11px] text-slate-500">When: {t.trigger}</p>
                </button>
                <button type="button" role="switch" aria-checked={on} aria-label={`Send: ${t.label}`} disabled={busy} onClick={() => quickToggle(t)}
                  className={`shrink-0 w-11 h-6 rounded-full border transition-colors relative ${on ? 'bg-emerald-500 border-emerald-500' : 'bg-slate-300 dark:bg-slate-700 border-border'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </div>
              {open === t.key && (
                <div className="border-t border-border p-3 space-y-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Values this message can use</p>
                    <div className="flex flex-wrap gap-1.5">
                      {t.variables.map((v, i) => (
                        <button key={i} type="button" title="Click to add to the message"
                          onClick={() => plain && setForm((f) => ({ ...f, body: `${f.body}{{${i + 1}}}` }))}
                          className="px-2 py-1 rounded-lg border border-border text-[10px] font-bold bg-card">
                          <span className="text-primary">{`{{${i + 1}}}`}</span> {v}
                        </button>
                      ))}
                    </div>
                  </div>
                  {plain && (
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Message wording</label>
                      <textarea rows={8} className={inp + ' mt-1 font-mono'} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
                    </div>
                  )}
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Approved template name (optional)</label>
                      <input className={inp + ' mt-1'} placeholder={t.key} value={form.providerTemplate} onChange={(e) => setForm({ ...form, providerTemplate: e.target.value })} />
                    </div>
                    {plain && (
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Send from another number (phone ID, optional)</label>
                        <input className={inp + ' mt-1'} placeholder="Leave empty to use the main number" value={form.senderPhoneId} onChange={(e) => setForm({ ...form, senderPhoneId: e.target.value })} />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" disabled={busy} onClick={() => save(t)} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><Save size={14} /> Save this message</button>
                    {t.saved && <button type="button" disabled={busy} onClick={() => reset(t)} className="px-4 py-2 rounded-xl border border-border text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><RotateCcw size={14} /> Back to standard</button>}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {msg.text && <p role="status" className={`mt-3 text-xs font-bold ${msg.bad ? 'text-red-500' : 'text-emerald-600'}`}>{msg.text}</p>}
    </section>
  );
}
