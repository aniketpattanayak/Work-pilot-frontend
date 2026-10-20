import React, { useState, useEffect, useCallback, useMemo } from 'react';
import API from '../api/axiosConfig';
import { dialog } from '../components/Dialog';
import { useUploadLimit, checkFiles, uploadHint } from '../utils/uploadLimit';
import { iconForExt } from '../components/LocalFileThumb';
import { fileExt } from '../utils/uploadLimit';
import { 
  Ticket, 
  Send, 
  Video, 
  Image as ImageIcon, 
  X, 
  RefreshCcw, 
  AlertCircle,
  FileText,
  Play,
  History as HistoryIcon,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  ShieldCheck,
  PlusCircle,
  Activity,
  Filter,
  Layers,
  Pencil,
  Trash2,
  Search
} from 'lucide-react';
import ResponsiveTable from '../components/ResponsiveTable';
import DynamicFieldRenderer from '../components/DynamicFieldRenderer';
import FormField, { FIELD_GRID } from '../components/FormField';
import useFormLayout from '../hooks/useFormLayout';

const EMPTY_FORM = { title: '', description: '', category: 'Technical', priority: 'Medium' };
const PRIORITY_STYLE = {
  Urgent: 'bg-red-500/10 text-red-500 border-red-500/20',
  High: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
};
const Req = () => <span className="text-red-500 ml-0.5">*</span>;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const thCls = 'sticky top-0 z-10 bg-muted px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest shadow-[inset_0_-1px_0_var(--color-border)]';

/**
 * SUPPORT: raise a ticket, and edit / delete your own tickets.
 */
const RaiseTicket = ({ userId, tenantId }) => {
  // --- UI STATES ---
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null); // null = raising a new ticket
  const L = useFormLayout('ticket'); // company's own order / names / hidden fields (Settings > Form designer)
  const [customValues, setCustomValues] = useState({});
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [uploading, setUploading] = useState(false);

  // --- LEDGER STATES ---
  const [tickets, setTickets] = useState([]);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const visibleTickets = useMemo(() => {
    const q = search.trim().toLowerCase();
    const from = dateFrom ? new Date(dateFrom + 'T00:00:00') : null;
    const to = dateTo ? new Date(dateTo + 'T23:59:59.999') : null;
    return tickets.filter((t) => {
      if (q && !([t.title, t.category, t.status, t.priority, t.description, (t._id || '').slice(-8)].join(' ').toLowerCase().includes(q))) return false;
      const d = new Date(t.createdAt);
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
  }, [tickets, search, dateFrom, dateTo]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  const fetchUserTickets = useCallback(async () => {
    if (!userId) { setLoadingTickets(false); return; }
    try {
      setLoadingTickets(true);
      const res = await API.get(`/tickets/user/${userId}`);
      setTickets(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Ledger Sync Error:", err);
    } finally {
      setLoadingTickets(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUserTickets();
  }, [fetchUserTickets]);

  const resetForm = () => {
    previews.forEach((p) => { if (p.url) URL.revokeObjectURL(p.url); });
    setFormData(EMPTY_FORM); setCustomValues({}); setFiles([]); setPreviews([]); setEditId(null);
  };
  const closeForm = () => { setShowForm(false); resetForm(); };
  const openNew = () => { resetForm(); setShowForm(true); };
  const openEdit = (t) => {
    resetForm();
    setEditId(t._id);
    setFormData({ title: t.title || '', description: t.description || '', category: t.category || 'Technical', priority: t.priority || 'Medium' });
    setShowForm(true);
  };

  const maxFileMb = useUploadLimit();
  const handleFileChange = (e) => {
    const { ok: selectedFiles, problems } = checkFiles(e.target.files, maxFileMb);
    if (problems.length) dialog.alert(problems.join('\n'), { tone: 'error', title: 'File not added' });
    e.target.value = '';
    setFiles(prev => [...prev, ...selectedFiles]);
    const newPreviews = selectedFiles.map(file => ({
      name: file.name,
      type: file.type,
      url: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    }));
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    if (previews[index]?.url) URL.revokeObjectURL(previews[index].url);
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const reason = (err, fallback) => err?.response?.data?.message || fallback;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim()) {
      await dialog.alert('Please fill the Subject and the Description. Fields marked with a red star are required.', { tone: 'error' });
      return;
    }
    const missing = L.firstMissing({ priority: formData.priority, category: formData.category, ...(editId ? {} : { attachments: files }) });
    if (missing) { await dialog.alert(missing, { tone: 'error' }); return; }
    setUploading(true);
    try {
      if (editId) {
        await API.put(`/tickets/${editId}`, {
          title: formData.title.trim(), description: formData.description.trim(),
          category: formData.category, priority: formData.priority,
        });
        closeForm();
        fetchUserTickets();
        await dialog.alert('Ticket updated.', { tone: 'success' });
      } else {
        const data = new FormData();
        Object.keys(formData).forEach(key => data.append(key, key === 'title' || key === 'description' ? formData[key].trim() : formData[key]));
        data.append('customFields', JSON.stringify(customValues));
        data.append('reporterId', userId);
        data.append('tenantId', tenantId);
        files.forEach(file => data.append('initialMedia', file));
        await API.post('/tickets/create', data, { headers: { 'Content-Type': 'multipart/form-data' } });
        closeForm();
        fetchUserTickets();
        await dialog.alert('Your ticket has been sent to support.', { tone: 'success' });
      }
    } catch (err) {
      await dialog.alert(reason(err, editId ? 'Could not update the ticket. Please try again.' : 'Could not send the ticket. Please try again.'), { tone: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (t) => {
    const ok = await dialog.confirm(`Delete the ticket "${t.title}"?\nThis cannot be undone.`, { title: 'Delete ticket', danger: true, confirmText: 'Delete' });
    if (!ok) return;
    try {
      await API.delete(`/tickets/${t._id}`);
      if (expandedId === t._id) setExpandedId(null);
      fetchUserTickets();
    } catch (err) {
      await dialog.alert(reason(err, 'Could not delete the ticket. Please try again.'), { tone: 'error' });
    }
  };

  const inputCls = 'w-full bg-background border border-border px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-inner placeholder:text-slate-400/60';
  const lblCls = 'block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1.5';

  return (
    <div className="w-full pb-16 selection:bg-primary/30">

      {/* SLIM CONTROL BAR (the page title is already in the top header) */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.25em]">Support · Active</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openNew} className="flex items-center justify-center gap-2 bg-primary hover:opacity-90 text-white dark:text-slate-950 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest shadow-md transition-all active:scale-95">
            <PlusCircle size={16} /> Raise New Ticket
          </button>
          <button onClick={fetchUserTickets} title="Refresh" className="p-2.5 bg-card border border-border rounded-xl hover:border-primary/40 transition-all active:scale-90">
            <RefreshCcw size={16} className={`text-slate-500 ${loadingTickets ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* TICKET TABLE */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border/50 flex flex-wrap gap-3 justify-between items-center bg-background/50">
          <h3 className="text-xs font-black uppercase tracking-[0.25em] text-slate-400 flex items-center gap-2">
            <Layers size={14} /> My Tickets
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tickets..."
                className="pl-8 pr-3 py-2 bg-background border border-border rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/30 w-48" />
            </div>
            <input type="date" aria-label="From date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-3 py-2 bg-background border border-border rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/30" />
            <span className="text-[10px] font-black text-slate-400 uppercase">to</span>
            <input type="date" aria-label="To date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} className="px-3 py-2 bg-background border border-border rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/30" />
            {(search || dateFrom || dateTo) && (
              <button type="button" onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); }} className="px-3 py-2 rounded-xl border border-border text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-muted">Clear</button>
            )}
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              Total: <span className="text-primary">{visibleTickets.length}</span>{visibleTickets.length !== tickets.length && <span> / {tickets.length}</span>}
            </div>
          </div>
        </div>

        <div className="overflow-auto max-h-[calc(100vh-14rem)] custom-scrollbar">
          <ResponsiveTable>
          <table className="mobile-card-table w-full border-separate border-spacing-0 text-left min-w-[900px]">
            <thead>
              <tr>
                <th className={`${thCls} w-16`}>S. no.</th>
                <th className={thCls}>Ticket</th>
                <th className={thCls}>Subject</th>
                <th className={thCls}>Priority</th>
                <th className={thCls}>Status</th>
                <th className={thCls}>Raised on</th>
                <th className={`${thCls} text-right`}>Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleTickets.length > 0 ? visibleTickets.map((ticket, idx) => {
                const isExpanded = expandedId === ticket._id;
                const isResolved = ticket.status === 'Resolved';
                const canEdit = ticket.status === 'Open';
                const canDelete = ticket.status !== 'In-Progress';
                return (
                  <React.Fragment key={ticket._id}>
                    <tr className={`hover:bg-primary/[0.03] transition-all cursor-pointer ${isExpanded ? 'bg-primary/[0.04]' : ''}`} onClick={() => setExpandedId(isExpanded ? null : ticket._id)}>
                      <td className="px-4 py-3 text-xs font-bold text-slate-500 border-b border-border/40">{idx + 1}</td>
                      <td className="px-4 py-3 border-b border-border/40"><span className="text-[11px] text-slate-400 font-black font-mono tracking-widest">#{ticket._id?.slice(-8).toUpperCase()}</span></td>
                      <td className="px-4 py-3 border-b border-border/40">
                        <div className="text-sm font-black text-foreground uppercase tracking-tight">{ticket.title}</div>
                        <div className="inline-flex items-center gap-1.5 mt-1 text-[9px] text-slate-400 font-black uppercase tracking-widest"><Filter size={9} /> {ticket.category}</div>
                      </td>
                      <td className="px-4 py-3 border-b border-border/40">
                        <span className={`inline-block text-[9px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-widest ${PRIORITY_STYLE[ticket.priority] || 'bg-slate-500/10 text-slate-500 border-border'}`}>{ticket.priority}</span>
                      </td>
                      <td className="px-4 py-3 border-b border-border/40">
                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-xl border font-black text-[10px] uppercase tracking-widest ${isResolved ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isResolved ? 'bg-emerald-500' : 'bg-amber-500'}`} />{ticket.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-slate-500 border-b border-border/40 whitespace-nowrap">{fmtDate(ticket.createdAt)}</td>
                      <td className="px-4 py-3 border-b border-border/40" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button type="button" title={isExpanded ? 'Hide details' : 'View details'} onClick={() => setExpandedId(isExpanded ? null : ticket._id)} className={`p-2 rounded-lg border transition-all ${isExpanded ? 'bg-primary text-white border-primary' : 'bg-background border-border text-slate-400 hover:text-primary hover:border-primary/50'}`}>
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                          <button type="button" title={canEdit ? 'Edit' : 'Only an Open ticket can be edited'} disabled={!canEdit} onClick={() => openEdit(ticket)} className="p-2 rounded-lg border bg-background border-border text-slate-400 hover:text-primary hover:border-primary/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-slate-400 disabled:hover:border-border">
                            <Pencil size={14} />
                          </button>
                          <button type="button" title={canDelete ? 'Delete' : 'Support is working on this ticket'} disabled={!canDelete} onClick={() => handleDelete(ticket)} className="p-2 rounded-lg border bg-background border-border text-slate-400 hover:text-red-500 hover:border-red-500/40 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-slate-400 disabled:hover:border-border">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="bg-background/20">
                        <td colSpan="7" className="px-6 py-5 border-b border-border/40">
                          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                            <div className="space-y-4">
                              <h5 className="text-[11px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-2"><FileText size={14} /> Your message</h5>
                              <div className="bg-card/50 p-4 rounded-2xl border border-border shadow-inner">
                                <p className="text-sm text-slate-500 leading-relaxed font-medium italic whitespace-pre-line">"{ticket.description}"</p>
                              </div>
                              {ticket.initialMedia?.length > 0 && (
                                <div className="flex flex-wrap gap-3">
                                  {ticket.initialMedia.map((m, i) => (
                                    <a key={i} href={m.fileUrl} target="_blank" rel="noreferrer" className="w-12 h-12 bg-background border border-border rounded-xl flex items-center justify-center text-slate-400 hover:text-primary hover:border-primary transition-all">
                                      {m.fileType === 'video' ? <Video size={20} /> : <ImageIcon size={20} />}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className={`p-5 rounded-2xl border ${isResolved ? 'bg-emerald-500/[0.03] border-emerald-500/20' : 'bg-slate-500/[0.03] border-border'}`}>
                              <h5 className="text-[11px] font-black uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                                <ShieldCheck className={isResolved ? 'text-emerald-500' : 'text-slate-400'} size={16} /> Support reply
                              </h5>
                              {isResolved ? (
                                <div className="space-y-4">
                                  <div className="bg-background/80 p-4 rounded-xl border border-emerald-500/10">
                                    <p className="text-sm text-foreground font-bold leading-relaxed whitespace-pre-line">{ticket.adminRemarks}</p>
                                  </div>
                                  {ticket.resolutionMedia?.length > 0 && (
                                    <div className="flex flex-wrap gap-3">
                                      {ticket.resolutionMedia.map((m, i) => (
                                        <a key={i} href={m.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-emerald-500 text-white dark:text-slate-950 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-400 transition-all">
                                          <ImageIcon size={14} /> View proof
                                        </a>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <p className="text-xs text-slate-400 font-bold">Waiting for support to look at this ticket.</p>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              }) : (
                <tr>
                  <td colSpan="7" className="py-16 text-center text-xs font-black uppercase tracking-widest text-slate-400">
                    {loadingTickets ? 'Loading tickets…' : tickets.length > 0 ? 'No tickets match your search or dates.' : 'No tickets yet. Click "Raise New Ticket" to send one to support.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </ResponsiveTable>
        </div>
      </div>

      {/* RAISE / EDIT TICKET POPUP */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-950/80 z-[9999] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300" role="dialog" aria-modal="true">
          <div className="bg-card border border-border w-full max-w-xl rounded-3xl p-6 md:p-8 shadow-2xl relative animate-in zoom-in-95 overflow-y-auto max-h-[92vh] custom-scrollbar">
            <button type="button" aria-label="Close" onClick={closeForm} className="absolute top-5 right-5 text-slate-500 hover:text-foreground transition-all active:scale-90"><X size={24} /></button>

            <div className="flex items-center gap-3 mb-5">
              <div className="bg-primary/10 p-3 rounded-2xl border border-primary/20"><Ticket className="text-primary" size={22} /></div>
              <div>
                <h2 className="text-xl font-black uppercase tracking-tighter leading-none">{editId ? 'Edit ticket' : 'Raise a ticket'}</h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1.5"><span className="text-red-500">*</span> Required field</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className={FIELD_GRID}>
              <FormField L={L} id="subject" full>
                <div>
                  <label className={lblCls}>{L.label("subject", "Subject")}<Req /></label>
                  <input type="text" placeholder="Short title of the problem" className={inputCls}
                    value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                </div>
              </FormField>
              <FormField L={L} id="description" full>
                <div>
                  <label className={lblCls}>{L.label("description", "Description")}<Req /></label>
                  <textarea placeholder="Tell us what went wrong, and where…" className={`${inputCls} h-32 resize-none`}
                    value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                </div>
              </FormField>
              <FormField L={L} id="priority">
                <div>
                  <label className={lblCls}>{L.label("priority", "Priority")}{L.required("priority") && <Req />}</label>
                  <select className={`${inputCls} font-bold cursor-pointer`} value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })}>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </FormField>
              <FormField L={L} id="category">
                <div>
                  <label className={lblCls}>{L.label("category", "Category")}{L.required("category") && <Req />}</label>
                  <select className={`${inputCls} font-bold cursor-pointer`} value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                    <option value="Technical">Technical problem</option>
                    <option value="Access">Access / people mapping</option>
                    <option value="Performance">Slow or delayed data</option>
                    <option value="Feature">New feature request</option>
                  </select>
                </div>
              </FormField>
              {!editId && (
                <DynamicFieldRenderer variant="plain" fields={L.customFields} layout={L} entity="ticket" values={customValues} requireOnCreate onChange={(name, value) => setCustomValues((v) => ({ ...v, [name]: value }))} />
              )}
              {!editId && (
                <FormField L={L} id="attachments" full>
                <div>
                  <label className={lblCls}>{L.label("attachments", "Photos / videos / files")} <span className="normal-case tracking-normal font-bold text-slate-400">(optional)</span></label>
                  <div className="border-2 border-dashed border-border p-5 rounded-2xl text-center relative hover:border-primary/40 transition-all bg-background/50">
                    <input type="file" multiple onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    <div className="flex items-center justify-center gap-3 text-slate-400">
                      <ImageIcon size={22} /><Video size={22} />
                      <p className="text-[10px] font-black uppercase tracking-widest">Click to attach</p>
                    </div>
                    <div className="mt-2 text-[9px] font-bold text-slate-400 text-center">{uploadHint(maxFileMb)}
                    </div>
                  </div>
                  {previews.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-3">
                      {previews.map((preview, i) => (
                        <div key={i} className="group relative aspect-square bg-background border border-border rounded-xl overflow-hidden">
                          {preview.url ? <img src={preview.url} alt="" className="w-full h-full object-cover" /> : (() => { const Ico = (preview.type || '').startsWith('video/') ? Play : iconForExt(fileExt(preview.name)); return <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-1 text-center bg-slate-100 dark:bg-slate-900"><Ico size={20} className="text-primary" /><span className="text-[8px] font-black text-slate-500 break-all line-clamp-2">{preview.name}</span></div>; })()}
                          <button type="button" aria-label="Remove file" onClick={() => removeFile(i)} className="absolute top-1.5 right-1.5 p-1 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity"><X size={12} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
            
                </FormField>
              )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={closeForm} className="px-5 py-2.5 rounded-xl border border-border text-xs font-black uppercase tracking-widest text-slate-500 hover:text-foreground transition-all">Cancel</button>
                <button type="submit" disabled={uploading} className="px-6 py-2.5 rounded-xl bg-primary text-white dark:text-slate-950 text-xs font-black uppercase tracking-widest shadow-md active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50">
                  {uploading ? <RefreshCcw className="animate-spin" size={16} /> : <Send size={16} />}
                  {uploading ? 'Sending…' : (editId ? 'Save changes' : 'Send ticket')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--color-primary); }
      `}</style>
    </div>
  );
};

export default RaiseTicket;