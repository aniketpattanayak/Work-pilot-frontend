import React, { useState, useEffect, useCallback } from 'react';
import API from '../api/axiosConfig';
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
  Layers
} from 'lucide-react';

/**
 * SUPPORT TERMINAL: COMMAND CENTER v2.0
 * Purpose: Unified oversight and tactical issue reporting.
 * UI: High-density industrial theme with glassmorphism and refined status telemetry.
 */
const RaiseTicket = ({ userId, tenantId }) => {
  // --- UI STATES ---
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', category: 'Technical', priority: 'Medium' });
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [uploading, setUploading] = useState(false);

  // --- LEDGER STATES ---
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  /**
   * DATA ACQUISITION: Fetching personal ticket history
   */
  const fetchUserTickets = useCallback(async () => {
    if (!userId) return;
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

  /**
   * HANDLER: Process multi-format files and generate previews
   */
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
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
    if (previews[index].url) URL.revokeObjectURL(previews[index].url);
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    
    const data = new FormData();
    Object.keys(formData).forEach(key => data.append(key, formData[key]));
    data.append('reporterId', userId);
    data.append('tenantId', tenantId);
    files.forEach(file => data.append('initialMedia', file));

    try {
      await API.post('/tickets/create', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert("Success: Tactical ticket transmitted to Super Admin.");
      setFormData({ title: '', description: '', category: 'Technical', priority: 'Medium' });
      setFiles([]);
      setPreviews([]);
      setShowForm(false);
      fetchUserTickets();
    } catch (err) {
      alert("Transmission Error: Node connection failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto pb-24 selection:bg-primary/30">
      
      {/* EXECUTIVE CONTROL HEADER */}
      <div className="bg-card/40 backdrop-blur-xl border border-border p-6 md:p-10 rounded-[2.5rem] mb-12 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none group-hover:bg-primary/10 transition-colors duration-1000" />
        
        <div className="flex items-center gap-6 relative z-10">
          <div className="bg-primary/10 p-5 rounded-[2rem] border border-primary/20 shadow-inner group-hover:scale-110 transition-transform duration-500">
            <Activity className="text-primary" size={32} />
          </div>
          <div>
            <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter leading-tight text-foreground">
              Support 
            </h2>
            <div className="flex items-center gap-3 mt-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em]">Operational Node: Active</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full lg:w-auto relative z-10">
            <button 
                onClick={() => setShowForm(true)}
                className="flex-1 lg:flex-none flex items-center justify-center gap-4 bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-white dark:text-slate-950 px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-sky-500/20 transition-all active:scale-95 group/btn"
            >
                <PlusCircle size={20} className="group-hover:rotate-90 transition-transform" /> Raise New Ticket
            </button>
            <button onClick={fetchUserTickets} className="p-5 bg-card border border-border rounded-2xl hover:border-primary/40 transition-all active:scale-90 shadow-sm group/sync">
                <RefreshCcw size={22} className={`text-slate-500 group-hover:text-primary ${loadingTickets ? 'animate-spin' : ''}`} />
            </button>
        </div>
      </div>

      {/* TACTICAL LEDGER CONTAINER */}
      <div className="bg-card rounded-[3rem] border border-border shadow-[0_30px_100px_rgba(0,0,0,0.1)] overflow-hidden transition-all duration-700 animate-in fade-in slide-in-from-bottom-8">
        <div className="px-10 py-8 border-b border-border/50 flex justify-between items-center bg-background/50">
            <h3 className="text-xs font-black uppercase tracking-[0.4em] text-slate-400 flex items-center gap-3">
                <Layers size={16} /> Personnel Ticket Registry
            </h3>
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-card px-4 py-2 rounded-full border border-border">
                Telemetry Count: <span className="text-primary">{tickets.length}</span>
            </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full border-collapse text-left min-w-[950px]">
            <thead>
              <tr className="bg-background/80 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                <th className="px-10 py-8">Identity & Urgency</th>
                <th className="px-10 py-8">Mission Subject</th>
                <th className="px-10 py-8">Operational Status</th>
                <th className="px-10 py-8 text-right pr-14">Intervention</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {tickets.length > 0 ? tickets.map((ticket) => {
                const isExpanded = expandedId === ticket._id;
                const isResolved = ticket.status === 'Resolved';

                return (
                  <React.Fragment key={ticket._id}>
                    <tr className={`hover:bg-primary/[0.03] transition-all cursor-pointer group/row ${isExpanded ? 'bg-primary/[0.04]' : ''}`} onClick={() => setExpandedId(isExpanded ? null : ticket._id)}>
                      <td className="px-10 py-8">
                        <div className="flex flex-col gap-3">
                            <span className="text-[11px] text-slate-400 font-black font-mono tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">#{ticket._id?.slice(-8).toUpperCase()}</span>
                            <span className={`w-fit text-[9px] font-black px-3 py-1 rounded-lg border uppercase tracking-widest shadow-sm ${
                                ticket.priority === 'Urgent' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                                ticket.priority === 'High' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 
                                'bg-slate-500/10 text-slate-500 border-border'
                            }`}>
                                {ticket.priority}
                            </span>
                        </div>
                      </td>
                      <td className="px-10 py-8">
                        <div className="text-base font-black text-foreground uppercase tracking-tight mb-2 group-hover:text-primary transition-colors">{ticket.title}</div>
                        <div className="inline-flex items-center gap-2 bg-background border border-border px-3 py-1 rounded-full text-[9px] text-slate-400 font-black uppercase tracking-widest">
                            <Filter size={10} /> {ticket.category}
                        </div>
                      </td>
                      <td className="px-10 py-8">
                         <span className={`inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl border font-black text-[10px] uppercase tracking-widest shadow-xl transition-all ${
                            isResolved ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                         }`}>
                           <div className={`w-1.5 h-1.5 rounded-full ${isResolved ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-500 animate-pulse'}`} />
                           {ticket.status}
                         </span>
                      </td>
                      <td className="px-10 py-8 pr-14 text-right">
                         <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl border transition-all ${isExpanded ? 'bg-primary text-white border-primary rotate-180 shadow-lg' : 'bg-background border-border text-slate-300 group-hover:border-primary/50 group-hover:text-primary shadow-inner'}`}>
                            <ChevronDown size={20} />
                         </div>
                      </td>
                    </tr>

                    {/* EXPANDED SYSTEM DATA */}
                    {isExpanded && (
                      <tr className="bg-background/20">
                        <td colSpan="4" className="px-14 py-12 animate-in slide-in-from-top-6 duration-700">
                          <div className="grid grid-cols-1 xl:grid-cols-2 gap-16 border-t border-border/50 pt-12 relative">
                            <div className="space-y-8 relative z-10">
                              <h5 className="text-[11px] font-black text-primary uppercase tracking-[0.4em] flex items-center gap-3">
                                  <FileText size={16} /> Reporter Directive
                              </h5>
                              <div className="bg-card/50 p-8 rounded-[2.5rem] border border-border shadow-inner">
                                <p className="text-base text-slate-500 leading-relaxed font-medium italic">"{ticket.description}"</p>
                              </div>
                              
                              {ticket.initialMedia?.length > 0 && (
                                <div className="space-y-4">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Evidence Logs</label>
                                  <div className="flex flex-wrap gap-4">
                                    {ticket.initialMedia.map((m, i) => (
                                      <a key={i} href={m.fileUrl} target="_blank" rel="noreferrer" className="w-16 h-16 bg-background border border-border rounded-2xl flex items-center justify-center text-slate-400 hover:text-primary hover:border-primary transition-all shadow-xl group/media">
                                        {m.fileType === 'video' ? <Video size={24} /> : <ImageIcon size={24} />}
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className={`relative p-10 rounded-[3rem] border shadow-2xl transition-all duration-700 ${isResolved ? 'bg-emerald-500/[0.03] border-emerald-500/20' : 'bg-slate-500/[0.03] border-border shadow-inner'}`}>
                              <h5 className="text-[11px] font-black uppercase tracking-[0.4em] mb-8 flex items-center gap-3">
                                <ShieldCheck className={isResolved ? 'text-emerald-500' : 'text-slate-400'} size={18} />
                                Infrastructure Audit Response
                              </h5>
                              {isResolved ? (
                                <div className="space-y-8">
                                  <div className="bg-background/80 p-8 rounded-[2rem] border border-emerald-500/10 shadow-inner">
                                    <p className="text-base text-foreground font-black leading-relaxed">{ticket.adminRemarks}</p>
                                  </div>
                                  {ticket.resolutionMedia?.length > 0 && (
                                    <div className="flex flex-wrap gap-4">
                                      {ticket.resolutionMedia.map((m, i) => (
                                        <a key={i} href={m.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-4 bg-emerald-500 text-white dark:text-slate-950 px-6 py-3 rounded-2xl text-[10px] font-black uppercase hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-500/20 active:scale-95">
                                          <ImageIcon size={16} /> View Resolution Proof
                                        </a>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-center gap-6 opacity-40">
                                   <div className="relative">
                                      <RefreshCcw className="animate-spin text-slate-400" size={32} />
                                      <ShieldCheck className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-500" size={12} />
                                   </div>
                                   <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">System Audit Pipeline: Pending...<br/><span className="opacity-60">Root Admin Intervention Required</span></p>
                                </div>
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
                  <td colSpan="4" className="py-40 text-center flex flex-col items-center gap-6 opacity-30 grayscale transition-colors">
                    
                    
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RAISING TICKET MODAL TERMINAL */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-950/90 z-[9999] flex items-center justify-center p-6 backdrop-blur-2xl animate-in fade-in duration-500">
          <div className="bg-card border border-border w-full max-w-2xl rounded-[3.5rem] p-10 md:p-14 shadow-[0_0_120px_rgba(0,0,0,0.5)] relative animate-in zoom-in-95 overflow-y-auto max-h-[95vh] custom-scrollbar selection:bg-primary/40">
            <button onClick={() => setShowForm(false)} className="absolute top-10 right-10 text-slate-500 hover:text-foreground hover:rotate-90 transition-all active:scale-90"><X size={32} /></button>
            
            <div className="flex items-center gap-6 mb-12">
              <div className="bg-primary/10 p-5 rounded-[2rem] border border-primary/20 shadow-inner">
                <Ticket className="text-primary" size={32} />
              </div>
              <div>
                <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter leading-none">New Directive</h2>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mt-3">Initiate Technical Support Handshake</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-3">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-3">Request Subject</label>
                <input 
                  type="text" required placeholder="Subject title for root audit" 
                  className="w-full bg-background border border-border p-6 rounded-[1.8rem] font-black uppercase text-sm outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-inner placeholder:text-slate-400/50"
                  value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})}
                />
              </div>
              
              <div className="space-y-3">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-3">Operational Narrative</label>
                <textarea 
                  required placeholder="Detailed error logs or mission conflict description..." 
                  className="w-full bg-background border border-border p-8 rounded-[2rem] h-48 font-medium outline-none focus:ring-4 focus:ring-primary/10 resize-none shadow-inner transition-all placeholder:text-slate-400/50"
                  value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-3">Urgency Clearance</label>
                    <select className="w-full bg-background border border-border p-6 rounded-2xl font-black uppercase text-xs shadow-inner appearance-none cursor-pointer outline-none focus:ring-4 focus:ring-primary/10" value={formData.priority} onChange={(e) => setFormData({...formData, priority: e.target.value})}>
                      <option value="Low">Low Priority</option>
                      <option value="Medium">Medium Priority</option>
                      <option value="High">High Priority</option>
                      <option value="Urgent">Urgent Intervention</option>
                    </select>
                </div>
                <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-3">System Category</label>
                    <select className="w-full bg-background border border-border p-6 rounded-2xl font-black uppercase text-xs shadow-inner appearance-none cursor-pointer outline-none focus:ring-4 focus:ring-primary/10" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}>
                      <option value="Technical">Technical Conflict</option>
                      <option value="Access">Personnel Mapping</option>
                      <option value="Performance">Telemetry Delay</option>
                      <option value="Feature">Infrastructure Request</option>
                    </select>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-3">Media Evidence logs</label>
                <div className="border-2 border-dashed border-border p-12 rounded-[3rem] text-center relative group hover:border-primary/40 transition-all bg-background/50 overflow-hidden shadow-inner">
                  <input type="file" multiple accept="image/*,video/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                  <div className="flex flex-col items-center gap-5">
                    <div className="flex items-center gap-4 bg-card p-4 rounded-2xl border border-border shadow-lg">
                      <ImageIcon size={32} className="text-slate-400 group-hover:text-primary transition-colors duration-500" />
                      <Video size={32} className="text-slate-400 group-hover:text-primary transition-colors duration-500" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 group-hover:text-primary transition-colors">Attach Tactical Media Assets</p>
                  </div>
                </div>
              </div>

              {previews.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-700 pb-6">
                  {previews.map((preview, i) => (
                    <div key={i} className="group relative aspect-square bg-background border border-border rounded-[2rem] overflow-hidden shadow-2xl transition-all hover:scale-105">
                      {preview.url ? <img src={preview.url} alt="P" className="w-full h-full object-cover" /> : <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900"><Play size={24} className="text-primary" /></div>}
                      <button type="button" onClick={() => removeFile(i)} className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-xl opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:scale-110 active:scale-90"><X size={16} /></button>
                    </div>
                  ))}
                </div>
              )}

              <button disabled={uploading} className="w-full py-7 rounded-[2.5rem] bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-white dark:text-slate-950 font-black uppercase tracking-[0.4em] shadow-[0_20px_50px_rgba(14,165,233,0.3)] active:scale-[0.98] transition-all flex justify-center items-center gap-5 disabled:opacity-50">
                {uploading ? <RefreshCcw className="animate-spin" size={24} /> : <Send size={24} />}
                {uploading ? "Transmitting Cipher Data..." : "Authorize Transmission"}
              </button>
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