import React, { useState, useEffect, useCallback } from 'react';
import API from '../api/axiosConfig'; // Centralized API instance
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
  X,
  Mail,
  Lock,
  LayoutGrid,
  Link as LinkIcon,
  Edit3,
  CheckCircle,
  LogIn
} from 'lucide-react';

/**
 * SUPER ADMIN: ROOT INFRASTRUCTURE COMMAND v1.5
 * Purpose: Global oversight and SaaS provisioning with adaptive Light/Dark support.
 * UI: Fully responsive with fluid typography for mobile-to-desktop parity.
 */
const SuperAdmin = ({ isAuthenticated, onLogin, onLogout }) => {
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [companies, setCompanies] = useState([]); 
  
  const [factoryData, setFactoryData] = useState({
    companyName: '', subdomain: '', ownerEmail: '', adminPassword: ''
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  const fetchCompanies = useCallback(async () => {
    try {
      const res = await API.get('/superadmin/all-companies');
      const data = Array.isArray(res.data) 
        ? res.data 
        : (res.data?.companies || res.data?.data || []);
      setCompanies(data);
    } catch (err) {
      console.error("Failed to fetch companies:", err);
      setCompanies([]);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCompanies();
    }
  }, [isAuthenticated, fetchCompanies]);

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
    setFactoryData({
      companyName: company.companyName,
      subdomain: company.subdomain,
      ownerEmail: company.adminEmail || '', 
      adminPassword: '' 
    });
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
        await API.put(`/superadmin/update-branding`, formData, {
            params: { tenantId: editId },
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        alert("Success: SaaS Node information updated.");
      } else {
        formData.append('subdomain', factoryData.subdomain);
        await API.post('/superadmin/create-company', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        alert("Success: New Factory provisioned successfully.");
      }
      cancelEdit();
      fetchCompanies(); 
    } catch (err) {
      alert("Action Failed: " + (err.response?.data?.message || "Protocol Error"));
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`PERMANENT DESTRUCTION: Purge ${name}? All telemetry and node data will be lost forever.`)) {
      try {
        await API.delete(`/superadmin/company/${id}`);
        fetchCompanies(); 
      } catch (err) {
        alert("Action failed: Deletion protocol error.");
      }
    }
  };

  // --- UNAUTHENTICATED: MASTER LOGIN HUB ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 transition-colors duration-500 selection:bg-primary/30">
        <div className="bg-card backdrop-blur-2xl border border-border p-8 md:p-12 rounded-[2.5rem] md:rounded-[3rem] w-full max-w-[440px] shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-700">
          <div className="text-center mb-10">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-sky-400 to-sky-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-sky-500/20">
               <ShieldCheck size={40} className="text-white dark:text-slate-950" />
            </div>
            <h2 className="text-foreground text-2xl md:text-3xl font-black tracking-tighter m-0 uppercase leading-none">Master Control</h2>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-3">Root Access Authorization</p>
          </div>
          
          <form onSubmit={handleMasterLogin} className="space-y-5">
            <div className="space-y-2">
              <input type="text" placeholder="Root Username" className="w-full bg-background border border-border text-foreground px-6 py-4 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold shadow-inner" onChange={(e) => setLoginData({...loginData, username: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <input type="password" placeholder="Master Password" className="w-full bg-background border border-border text-foreground px-6 py-4 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold shadow-inner" onChange={(e) => setLoginData({...loginData, password: e.target.value})} required />
            </div>
            <button type="submit" disabled={loading} className="w-full py-5 rounded-2xl bg-gradient-to-r from-sky-500 to-sky-600 hover:opacity-90 text-white dark:text-slate-950 font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-sky-500/20 transition-all active:scale-95 disabled:opacity-50">
              {loading ? <RefreshCcw className="animate-spin" size={20} /> : "Authorize Link"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const safeCompanies = Array.isArray(companies) ? companies : [];

  // --- AUTHENTICATED: GLOBAL CONSOLE ---
  return (
    <div className="min-h-screen bg-background text-foreground font-sans p-4 md:p-10 transition-colors duration-500 selection:bg-primary/30">
      
      {/* EXECUTIVE HEADER: Responsive Layout */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-6 bg-card p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-border backdrop-blur-md shadow-xl transition-all">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 p-3 rounded-2xl border border-primary/20 shrink-0">
            <LayoutGrid size={24} className="text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl md:text-3xl font-black tracking-tighter m-0 uppercase leading-none truncate">Master Console</h1>
            <p className="text-slate-500 dark:text-slate-400 text-[9px] md:text-xs font-black uppercase tracking-[0.2em] mt-2 leading-relaxed opacity-80">Work Pilot Infrastructure — SaaS Client Provisioning</p>
          </div>
        </div>
        <button onClick={onLogout} className="w-full lg:w-auto flex items-center justify-center gap-3 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95">
          <LogOut size={16} /> Revoke Master Token
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.8fr] gap-8">
        
        {/* FORM: PROVISION OR EDIT NODE (Responsive Container) */}
        <section className="bg-card backdrop-blur-xl p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-border shadow-2xl relative overflow-hidden h-fit group transition-all duration-500">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-1000 pointer-events-none" />
          
          <h3 className={`${isEditing ? 'text-emerald-600 dark:text-emerald-400' : 'text-primary'} text-lg md:text-xl font-black tracking-tight flex items-center gap-3 mb-10 relative z-10 uppercase`}>
            {isEditing ? <Edit3 size={20} /> : <PlusCircle size={20} />} 
            {isEditing ? 'Modify Active Node' : 'Provision New Node'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 block">Entity Name</label>
                <input type="text" placeholder="e.g. Apex Manufacturing" value={factoryData.companyName} className="w-full bg-background border border-border text-foreground px-6 py-4 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 font-bold uppercase text-sm shadow-inner transition-all" onChange={(e) => setFactoryData({...factoryData, companyName: e.target.value})} required />
            </div>
            
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 block">Subdomain Node {isEditing && "(Locked)"}</label>
                <div className="relative group">
                    <LinkIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-primary/40" size={16} />
                    <input type="text" disabled={isEditing} placeholder="e.g. apexnode" value={factoryData.subdomain} className={`w-full ${isEditing ? 'bg-slate-100 dark:bg-slate-900 cursor-not-allowed opacity-50' : 'bg-background'} border border-border text-primary pl-14 pr-6 py-4 rounded-2xl font-mono font-black text-sm uppercase shadow-inner transition-all`} onChange={(e) => setFactoryData({...factoryData, subdomain: e.target.value.toLowerCase()})} required />
                </div>
            </div>
            
            <div className="bg-background/80 p-6 rounded-[2rem] border border-border border-dashed group/logo transition-all hover:border-primary/30">
              <label className="text-[9px] font-black text-primary/60 flex items-center gap-2 uppercase tracking-[0.2em] mb-4"><ImageIcon size={14} /> Identity Emblem (Logo)</label>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                {logoPreview ? (
                  <div className="relative shrink-0">
                    <div className="w-20 h-20 bg-white dark:bg-white/90 p-2 rounded-2xl border-2 border-primary flex items-center justify-center overflow-hidden shadow-xl animate-in zoom-in-75"><img src={logoPreview} alt="Handshake Preview" className="max-h-full object-contain" /></div>
                    <button type="button" onClick={() => {setLogoFile(null); setLogoPreview(null);}} className="absolute -top-3 -right-3 bg-red-500 text-white p-2 rounded-full shadow-lg active:scale-90 transition-transform"><X size={14} /></button>
                  </div>
                ) : (
                  <label className="w-20 h-20 bg-background border border-border rounded-2xl flex items-center justify-center cursor-pointer hover:bg-primary/5 hover:border-primary/40 transition-all shadow-inner shrink-0 group-hover/logo:scale-105 duration-500"><PlusCircle size={24} className="text-slate-400 dark:text-slate-600" /><input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} /></label>
                )}
                <p className="text-[10px] text-slate-500 dark:text-slate-500 font-bold leading-relaxed uppercase tracking-tight text-center sm:text-left">{logoFile ? `BUFFERED: ${logoFile.name}` : "System-wide brand asset."}</p>
              </div>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 block">Root Admin Gmail</label>
                <div className="relative">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-primary/40" size={16} />
                    <input type="email" placeholder="admin@node.com" value={factoryData.ownerEmail} className="w-full bg-background border border-border text-foreground pl-14 pr-6 py-4 rounded-2xl font-bold text-sm shadow-inner transition-all outline-none focus:ring-4 focus:ring-primary/10" onChange={(e) => setFactoryData({...factoryData, ownerEmail: e.target.value})} required />
                </div>
            </div>
            
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 block">{isEditing ? "Update Cipher (Optional)" : "Primary Access Cipher"}</label>
                <div className="relative">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-primary/40" size={16} />
                    <input type="password" placeholder="••••••••" value={factoryData.adminPassword} className="w-full bg-background border border-border text-foreground pl-14 pr-6 py-4 rounded-2xl font-black text-sm tracking-widest shadow-inner transition-all outline-none focus:ring-4 focus:ring-primary/10" onChange={(e) => setFactoryData({...factoryData, adminPassword: e.target.value})} required={!isEditing} />
                </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                {isEditing && <button type="button" onClick={cancelEdit} className="flex-1 py-5 rounded-2xl border border-border text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-900 transition-all active:scale-95">Cancel</button>}
                <button type="submit" disabled={processing} className={`flex-[2] py-5 rounded-2xl bg-gradient-to-r ${isEditing ? 'from-emerald-500 to-emerald-600 shadow-emerald-500/20' : 'from-sky-500 to-sky-600 shadow-sky-500/20'} text-white dark:text-slate-950 font-black text-xs uppercase tracking-[0.2em] disabled:opacity-50 flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all`}>
                {processing ? <RefreshCcw className="animate-spin" size={20} /> : isEditing ? <CheckCircle size={20} /> : <Factory size={20} />}
                {processing ? "Syncing..." : isEditing ? "Save Modifications" : "Initialize Node"}
                </button>
            </div>
          </form>
        </section>

        {/* DIRECTORY: CLIENT INFRASTRUCTURE (Responsive Table) */}
        <section className="bg-card backdrop-blur-xl p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-border shadow-2xl overflow-hidden flex flex-col transition-all duration-500">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4">
            <h3 className="text-primary text-lg md:text-xl font-black tracking-tight flex items-center gap-3 m-0 uppercase leading-none"><Globe size={22} /> Client Ledger</h3>
            <div className="bg-background px-5 py-2 rounded-full border border-border shadow-inner">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Active Nodes: </span>
                <span className="text-primary font-black text-sm">{safeCompanies.length}</span>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto custom-scrollbar">
            <table className="w-full border-collapse text-left min-w-[600px]">
              <thead>
                <tr className="bg-background/50 border-b border-border text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.25em]">
                  <th className="px-6 py-5">Instance Identity</th>
                  <th className="px-6 py-5">Terminal Access Hub</th>
                  <th className="px-6 py-5 text-right pr-10">Intervention</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {safeCompanies.map(c => {
                   const baseDomain = window.location.hostname.includes('localhost') ? 'localhost:5173' : window.location.hostname;
                   const terminalUrl = `${window.location.protocol}//${c.subdomain}.${baseDomain}`;

                   return (
                  <tr key={c._id} className="group hover:bg-primary/[0.02] transition-all duration-300">
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 bg-white dark:bg-white/95 rounded-xl flex items-center justify-center p-2 shadow-lg border border-border group-hover:border-primary/30 transition-all shrink-0">
                          {c.logo ? <img src={c.logo} alt="L" className="max-h-full object-contain" /> : <div className="w-full h-full bg-slate-100 rounded-lg flex items-center justify-center text-primary font-black text-[9px] uppercase">Node</div>}
                        </div>
                        <div className="min-w-0">
                            <div className="text-foreground font-black text-sm tracking-tight leading-none mb-1.5 uppercase truncate">{c.companyName}</div>
                            <div className="text-[10px] text-primary/60 font-bold uppercase tracking-tight flex items-center gap-1.5 truncate"><Mail size={10} /> {c.adminEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6 font-mono text-slate-400 dark:text-slate-500 font-black text-[10px] sm:text-xs group-hover:text-primary transition-colors uppercase tracking-tighter">
                      {c.subdomain}.{baseDomain}
                    </td>
                    <td className="px-6 py-6 pr-10">
                      <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                        <button onClick={() => startEdit(c)} className="p-3 bg-primary/10 text-primary rounded-xl border border-primary/20 hover:bg-primary hover:text-white dark:hover:text-slate-950 transition-all active:scale-90 shadow-sm" title="Edit Parameters"><Edit3 size={16}/></button>
                        <a href={terminalUrl} target="_blank" rel="noreferrer" className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 rounded-xl border border-emerald-500/20 hover:bg-emerald-500 hover:text-white dark:hover:text-slate-950 transition-all active:scale-90 shadow-sm" title="Open Terminal"><ExternalLink size={16}/></a>
                        <button onClick={() => handleDelete(c._id, c.companyName)} className="p-3 bg-red-500/5 text-red-500 rounded-xl border border-red-500/20 hover:bg-red-500 hover:text-white transition-all active:scale-90 shadow-sm" title="Purge Node"><Trash2 size={16}/></button>
                      </div>
                    </td>
                  </tr>
                );
                })}
              </tbody>
            </table>
          </div>
          {safeCompanies.length === 0 && (
             <div className="flex flex-col items-center justify-center py-20 opacity-30 grayscale gap-4">
                <Globe size={48} className="text-primary" />
                <p className="font-black text-[10px] uppercase tracking-[0.4em]">Infrastructure Registry Offline</p>
             </div>
          )}
        </section>
      </div>

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