import React, { useState, useEffect, useCallback } from 'react';
import API from '../api/axiosConfig'; 
import { 
  Trash2, 
  ExternalLink, 
  ShieldCheck, 
  Factory, 
  Users, 
  LogOut, 
  PlusCircle, 
  Globe,
  Image as ImageIcon,
  RefreshCcw,
  Clock,
  X,
  Mail,
  Lock,
  LayoutGrid,
  Link as LinkIcon,
  Edit3,
  CheckCircle,
  LogIn,
  Ticket,        // New for Ticketing
  Video,         // New for Video logs
  AlertTriangle, // New for Priority
  CheckCircle2,  // New for Resolution
  MessageSquare  // New for Remarks
} from 'lucide-react';

/**
 * SUPER ADMIN: ROOT INFRASTRUCTURE COMMAND v1.6
 * Purpose: SaaS Provisioning + Global Support Ticket Oversight.
 * UI: Responsive Master Console with Industrial Support Intelligence.
 */
const SuperAdmin = ({ isAuthenticated, onLogin, onLogout }) => {
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [companies, setCompanies] = useState([]); 
  const [tickets, setTickets] = useState([]); // New: Ticket Ledger State
  
  const [factoryData, setFactoryData] = useState({
    companyName: '', subdomain: '', ownerEmail: '', adminPassword: ''
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  // --- TICKET RESOLUTION STATES ---
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [resolveRemarks, setResolveRemarks] = useState("");
  const [resolveFiles, setResolveFiles] = useState([]);

  const fetchCompanies = useCallback(async () => {
    try {
      const res = await API.get('/superadmin/all-companies');
      const data = Array.isArray(res.data) ? res.data : (res.data?.companies || []);
      setCompanies(data);
    } catch (err) {
      console.error("Fetch companies error:", err);
    }
  }, []);

  // New: Fetch Global Tickets
  const fetchTickets = useCallback(async () => {
    try {
      const res = await API.get('/tickets/all');
      setTickets(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Fetch tickets error:", err);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCompanies();
      fetchTickets();
    }
  }, [isAuthenticated, fetchCompanies, fetchTickets]);

  const handleMasterLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await API.post('/superadmin/master-login', {
        username: loginData.username.trim(),
        password: loginData.password.trim()
      });
      onLogin(res.data.token, res.data.user);
    } catch (err) {
      alert(err.response?.data?.message || "Invalid Master Credentials");
    } finally {
      setLoading(false);
    }
  };

  const handleResolveTicket = async (e) => {
    e.preventDefault();
    setProcessing(true);
    const data = new FormData();
    data.append('ticketId', selectedTicket._id);
    data.append('adminRemarks', resolveRemarks);
    resolveFiles.forEach(f => data.append('resolutionMedia', f));

    try {
      await API.put('/tickets/resolve', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert("Mission Accomplished: Ticket resolved and user notified.");
      setShowResolveModal(false);
      setResolveRemarks("");
      setResolveFiles([]);
      fetchTickets();
    } catch (err) {
      alert("Resolution failed: Connection reset.");
    } finally {
      setProcessing(false);
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const startEdit = (company) => {
    setIsEditing(true);
    setEditId(company._id);
    setFactoryData({ companyName: company.companyName, subdomain: company.subdomain, ownerEmail: company.adminEmail || '', adminPassword: '' });
    setLogoPreview(company.logo);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditId(null);
    setFactoryData({ companyName: '', subdomain: '', ownerEmail: '', adminPassword: '' });
    setLogoFile(null);
    setLogoPreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    try {
      const formData = new FormData();
      formData.append('companyName', factoryData.companyName);
      formData.append('ownerEmail', factoryData.ownerEmail);
      if (factoryData.adminPassword) formData.append('adminPassword', factoryData.adminPassword);
      if (logoFile) formData.append('logo', logoFile);

      if (isEditing) {
        await API.put(`/superadmin/update-branding`, formData, { params: { tenantId: editId }, headers: { 'Content-Type': 'multipart/form-data' } });
        alert("Success: SaaS Node information updated.");
      } else {
        formData.append('subdomain', factoryData.subdomain);
        await API.post('/superadmin/create-company', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        alert("Success: New Factory provisioned successfully.");
      }
      cancelEdit();
      fetchCompanies(); 
    } catch (err) {
      alert("Action Failed: Protocol Error");
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`PERMANENT DESTRUCTION: Purge ${name}?`)) {
      try {
        await API.delete(`/superadmin/company/${id}`);
        fetchCompanies(); 
      } catch (err) {
        alert("Purge protocol failed.");
      }
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 transition-colors duration-500">
        <div className="bg-card backdrop-blur-2xl border border-border p-8 md:p-12 rounded-[2.5rem] w-full max-w-[440px] shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-700">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-gradient-to-br from-sky-400 to-sky-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-sky-500/20"><ShieldCheck size={40} className="text-white dark:text-slate-950" /></div>
            <h2 className="text-foreground text-2xl font-black tracking-tighter uppercase m-0">Master Control</h2>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-3">Root Access Authorization</p>
          </div>
          <form onSubmit={handleMasterLogin} className="space-y-5">
            <input type="text" placeholder="Root Username" className="w-full bg-background border border-border text-foreground px-6 py-4 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 font-bold shadow-inner" onChange={(e) => setLoginData({...loginData, username: e.target.value})} required />
            <input type="password" placeholder="Master Password" className="w-full bg-background border border-border text-foreground px-6 py-4 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 font-bold shadow-inner" onChange={(e) => setLoginData({...loginData, password: e.target.value})} required />
            <button type="submit" disabled={loading} className="w-full py-5 rounded-2xl bg-gradient-to-r from-sky-500 to-sky-600 text-white dark:text-slate-950 font-black text-sm uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 disabled:opacity-50">
              {loading ? <RefreshCcw className="animate-spin" size={20} /> : "Authorize Link"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans p-4 md:p-10 transition-colors duration-500 selection:bg-primary/30">
      
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-6 bg-card p-6 md:p-8 rounded-[2rem] border border-border shadow-xl">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 p-3 rounded-2xl border border-primary/20"><LayoutGrid size={24} className="text-primary" /></div>
          <div>
            <h1 className="text-xl md:text-3xl font-black tracking-tighter uppercase leading-none">Master Console</h1>
            <p className="text-slate-500 text-[9px] md:text-xs font-black uppercase tracking-[0.2em] mt-2">Work Pilot Infrastructure — SaaS Client Provisioning</p>
          </div>
        </div>
        <button onClick={onLogout} className="w-full lg:w-auto flex items-center justify-center gap-3 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 text-red-600 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95">
          <LogOut size={16} /> Revoke Master Token
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.8fr] gap-8 mb-12">
        {/* PROVISIONING FORM */}
        <section className="bg-card p-6 md:p-10 rounded-[2rem] border border-border shadow-2xl relative overflow-hidden h-fit transition-all duration-500">
          <h3 className={`${isEditing ? 'text-emerald-600' : 'text-primary'} text-lg font-black tracking-tight flex items-center gap-3 mb-10 uppercase`}>
            {isEditing ? <Edit3 size={20} /> : <PlusCircle size={20} />} {isEditing ? 'Modify Active Node' : 'Provision New Node'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-6">
            <input type="text" placeholder="Entity Name" value={factoryData.companyName} className="w-full bg-background border border-border px-6 py-4 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 font-bold uppercase text-sm shadow-inner" onChange={(e) => setFactoryData({...factoryData, companyName: e.target.value})} required />
            <input type="text" disabled={isEditing} placeholder="Subdomain Node" value={factoryData.subdomain} className={`w-full ${isEditing ? 'opacity-50 cursor-not-allowed' : ''} bg-background border border-border text-primary px-6 py-4 rounded-2xl font-mono font-black text-sm uppercase shadow-inner`} onChange={(e) => setFactoryData({...factoryData, subdomain: e.target.value.toLowerCase()})} required />
            
            <div className="bg-background/80 p-6 rounded-[2rem] border border-border border-dashed">
              <label className="text-[9px] font-black text-primary/60 flex items-center gap-2 uppercase tracking-[0.2em] mb-4"><ImageIcon size={14} /> Identity Emblem (Logo)</label>
              <div className="flex items-center gap-6">
                {logoPreview ? (
                  <div className="relative"><img src={logoPreview} alt="Logo" className="w-20 h-20 object-contain bg-white rounded-2xl p-2 border border-primary shadow-xl" /><button type="button" onClick={() => {setLogoFile(null); setLogoPreview(null);}} className="absolute -top-3 -right-3 bg-red-500 text-white p-1.5 rounded-full shadow-lg"><X size={12} /></button></div>
                ) : (
                  <label className="w-20 h-20 bg-background border border-border rounded-2xl flex items-center justify-center cursor-pointer hover:bg-primary/5 transition-all shadow-inner"><PlusCircle size={24} className="text-slate-400" /><input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} /></label>
                )}
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">{logoFile ? `BUFFERED: ${logoFile.name}` : "System brand asset."}</p>
              </div>
            </div>

            <input type="email" placeholder="Root Admin Email" value={factoryData.ownerEmail} className="w-full bg-background border border-border px-6 py-4 rounded-2xl font-bold text-sm shadow-inner" onChange={(e) => setFactoryData({...factoryData, ownerEmail: e.target.value})} required />
            <input type="password" placeholder="Access Cipher" value={factoryData.adminPassword} className="w-full bg-background border border-border px-6 py-4 rounded-2xl font-black text-sm tracking-widest shadow-inner" onChange={(e) => setFactoryData({...factoryData, adminPassword: e.target.value})} required={!isEditing} />
            
            <div className="flex gap-4">
                {isEditing && <button type="button" onClick={cancelEdit} className="flex-1 py-5 rounded-2xl border border-border text-slate-500 font-black text-xs uppercase tracking-widest">Cancel</button>}
                <button type="submit" disabled={processing} className={`flex-[2] py-5 rounded-2xl bg-gradient-to-r ${isEditing ? 'from-emerald-500 to-emerald-600' : 'from-sky-500 to-sky-600'} text-white dark:text-slate-950 font-black text-xs uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all`}>
                  {processing ? <RefreshCcw className="animate-spin" size={20} /> : isEditing ? "Save Modifications" : "Initialize Node"}
                </button>
            </div>
          </form>
        </section>

        {/* CLIENT LEDGER */}
        <section className="bg-card p-6 md:p-10 rounded-[2rem] border border-border shadow-2xl overflow-hidden flex flex-col transition-all">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-primary text-lg font-black tracking-tight flex items-center gap-3 uppercase"><Globe size={22} /> Client Ledger</h3>
            <div className="bg-background px-5 py-2 rounded-full border border-border shadow-inner"><span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Active Nodes: </span><span className="text-primary font-black text-sm">{companies.length}</span></div>
          </div>
          <div className="flex-1 overflow-x-auto custom-scrollbar">
            <table className="w-full text-left min-w-[600px]">
              <thead>
                <tr className="bg-background/50 border-b border-border text-[9px] font-black text-slate-400 uppercase tracking-[0.25em]">
                  <th className="px-6 py-5">Instance</th>
                  <th className="px-6 py-5">Terminal Link</th>
                  <th className="px-6 py-5 text-right pr-10">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {companies.map(c => (
                  <tr key={c._id} className="group hover:bg-primary/[0.02] transition-all">
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center p-2 border border-border shadow-lg shrink-0">{c.logo ? <img src={c.logo} alt="L" className="max-h-full object-contain" /> : <div className="text-[9px] font-black text-primary">NODE</div>}</div>
                        <div className="min-w-0"><div className="text-foreground font-black text-sm uppercase truncate">{c.companyName}</div><div className="text-[9px] text-primary/60 font-bold truncate tracking-tight">{c.adminEmail}</div></div>
                      </div>
                    </td>
                    <td className="px-6 py-6 font-mono text-slate-400 text-[10px] group-hover:text-primary transition-colors uppercase tracking-tighter">
                      {c.subdomain}.{window.location.hostname}
                    </td>
                    <td className="px-6 py-6 pr-10">
                      <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => startEdit(c)} className="p-2.5 bg-primary/10 text-primary rounded-xl border border-primary/20 hover:bg-primary hover:text-white transition-all shadow-sm"><Edit3 size={14}/></button>
                        <button onClick={() => handleDelete(c._id, c.companyName)} className="p-2.5 bg-red-500/5 text-red-500 rounded-xl border border-red-500/20 hover:bg-red-500 hover:text-white transition-all shadow-sm"><Trash2 size={14}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* NEW: SUPPORT TICKET OVERSIGHT HUB */}
      <section className="bg-card p-6 md:p-10 rounded-[2rem] border border-border shadow-2xl transition-all duration-500 animate-in fade-in slide-in-from-bottom-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-6">
            <div className="flex items-center gap-4">
              <div className="bg-amber-500/10 p-3 rounded-2xl border border-amber-500/20"><Ticket size={24} className="text-amber-500" /></div>
              <div>
                 <h3 className="text-foreground text-xl md:text-2xl font-black tracking-tighter uppercase leading-none">Support Intelligence Hub</h3>
                 <p className="text-slate-500 text-[9px] md:text-xs font-black uppercase tracking-[0.2em] mt-2 opacity-80">Global Oversight for System Support Tickets</p>
              </div>
            </div>
            <button onClick={fetchTickets} className="group bg-background px-6 py-3 rounded-xl border border-border text-foreground font-black text-[10px] uppercase tracking-widest flex items-center gap-3 active:scale-95 shadow-xl transition-all">
              <RefreshCcw size={14} className="group-hover:rotate-180 transition-transform duration-700 text-primary" /> Sync Tickets
            </button>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
             <table className="w-full border-collapse text-left min-w-[900px]">
                <thead>
                  <tr className="bg-background/50 border-b border-border text-[9px] font-black text-slate-400 uppercase tracking-[0.25em]">
                    <th className="px-8 py-5">Personnel Context</th>
                    <th className="px-8 py-5">Request Details</th>
                    <th className="px-8 py-5">System Evidence</th>
                    <th className="px-8 py-5">Operational Status</th>
                    <th className="px-8 py-5 text-right pr-12">Intervention</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                   {tickets.map(ticket => (
                     <tr key={ticket._id} className="hover:bg-primary/[0.02] transition-all duration-300 group/ticket">
                        <td className="px-8 py-6">
                           <div className="font-black text-foreground text-sm uppercase tracking-tight mb-1">{ticket.reporterName}</div>
                           <div className="text-[9px] text-primary/60 font-black uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><ShieldCheck size={10} /> Role: {ticket.reporterRole}</div>
                           <div className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter flex items-center gap-1.5"><Mail size={10} /> {ticket.reporterEmail}</div>
                        </td>
                        <td className="px-8 py-6">
                           <div className="font-black text-slate-500 text-[10px] uppercase tracking-widest mb-1 flex items-center gap-2"><AlertTriangle size={10} /> {ticket.priority} Priority</div>
                           <div className="text-sm font-black text-foreground uppercase tracking-tight mb-2 truncate max-w-[200px]">{ticket.title}</div>
                           <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight line-clamp-2 italic">"{ticket.description}"</p>
                        </td>
                        <td className="px-8 py-6">
                           <div className="flex flex-wrap gap-2">
                              {ticket.initialMedia?.length > 0 ? ticket.initialMedia.map((m, idx) => (
                                <a key={idx} href={m.fileUrl} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-lg bg-background border border-border flex items-center justify-center text-primary/40 hover:text-primary transition-colors shadow-inner" title={`View ${m.fileType}`}>
                                   {m.fileType === 'video' ? <Video size={16} /> : <ImageIcon size={16} />}
                                </a>
                              )) : <span className="text-[9px] text-slate-300 font-black uppercase tracking-widest">No Media Logged</span>}
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg font-black text-[9px] uppercase tracking-widest border shadow-sm ${
                             ticket.status === 'Open' ? 'bg-red-500/10 text-red-600 border-red-500/20' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                           }`}>
                             {ticket.status === 'Open' ? <Clock size={10} /> : <CheckCircle2 size={10} />}
                             {ticket.status}
                           </span>
                        </td>
                        <td className="px-8 py-6 pr-12">
                           <div className="flex justify-end">
                              {ticket.status === 'Open' ? (
                                <button onClick={() => { setSelectedTicket(ticket); setShowResolveModal(true); }} className="px-5 py-2.5 bg-primary text-white dark:text-slate-950 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-sky-400 transition-all active:scale-95 shadow-lg shadow-primary/20">Mark Resolved</button>
                              ) : (
                                <div className="text-[9px] text-emerald-600 font-black uppercase tracking-[0.2em] flex flex-col items-end gap-1">
                                   <div className="flex items-center gap-1.5"><CheckCircle size={10} /> Closed by Root</div>
                                   <div className="text-[8px] opacity-60 font-bold">{new Date(ticket.resolvedAt).toLocaleDateString()}</div>
                                </div>
                              )}
                           </div>
                        </td>
                     </tr>
                   ))}
                </tbody>
             </table>
          </div>
          {tickets.length === 0 && (
             <div className="py-20 text-center flex flex-col items-center gap-4 opacity-30 grayscale grayscale">
                <Ticket size={48} className="text-amber-500" />
                <p className="font-black text-[10px] uppercase tracking-[0.4em]">No Active Support Tickets in Buffer</p>
             </div>
          )}
      </section>

      {/* RESOLUTION TERMINAL MODAL */}
      {showResolveModal && (
        <div className="fixed inset-0 bg-slate-950/80 z-[9999] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-card border border-border w-full max-w-lg rounded-[2.5rem] p-8 lg:p-12 shadow-[0_0_50px_rgba(0,0,0,0.3)] relative animate-in zoom-in-95">
              <button onClick={() => setShowResolveModal(false)} className="absolute top-8 right-8 text-slate-400 hover:text-foreground active:scale-90"><X size={24} /></button>
              
              <div className="mb-10">
                 <h3 className="text-primary text-2xl font-black uppercase tracking-tighter flex items-center gap-3"><CheckCircle2 size={28} /> Support Resolution</h3>
                 <p className="text-slate-500 text-xs font-bold uppercase tracking-wide mt-2">Closing Mission: {selectedTicket?.title}</p>
              </div>

              <form onSubmit={handleResolveTicket} className="space-y-8">
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Administrative Answer</label>
                    <textarea required placeholder="Define the fix applied..." value={resolveRemarks} onChange={(e) => setResolveRemarks(e.target.value)} className="w-full h-32 bg-background border border-border text-foreground p-5 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 transition-all text-sm font-bold resize-none shadow-inner uppercase tracking-tight" />
                 </div>

                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Proof of Resolution (Images)</label>
                    <input type="file" multiple accept="image/*" onChange={(e) => setResolveFiles(Array.from(e.target.files))} className="w-full bg-background border border-border text-slate-400 px-6 py-4 rounded-xl text-[10px] font-black uppercase shadow-inner" />
                 </div>

                 <button type="submit" disabled={processing} className="w-full py-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white dark:text-slate-950 font-black text-xs uppercase tracking-[0.3em] shadow-2xl transition-all active:scale-95 disabled:opacity-50">
                    {processing ? <RefreshCcw className="animate-spin" /> : "Finalize Support Handshake"}
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

export default SuperAdmin;