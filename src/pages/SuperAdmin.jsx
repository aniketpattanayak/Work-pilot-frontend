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
  X,
  Mail,
  Lock,
  LayoutGrid,
  Link as LinkIcon,
  Edit3,
  CheckCircle,
  LogIn,
  ShieldAlert,
  Server,
  Activity,
  Terminal,
  ChevronRight,
  Database
} from 'lucide-react';

/**
 * SUPER ADMIN: ROOT INFRASTRUCTURE COMMAND v1.3
 * Purpose: Global oversight and provisioning of SaaS factory nodes.
 * Logic: Manages multi-tenant instance lifecycles, branding sync, and root authentication.
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

  // --- DATA ACQUISITION: GLOBAL NODE REGISTRY ---
  const fetchCompanies = useCallback(async () => {
    try {
      const res = await API.get('/superadmin/all-companies');
      const data = Array.isArray(res.data) ? res.data : (res.data?.companies || res.data?.data || []);
      setCompanies(data);
    } catch (err) {
      console.error("Infrastructure Sync Failure:", err);
      setCompanies([]); 
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) fetchCompanies();
  }, [isAuthenticated, fetchCompanies]);

  // --- COMMAND: ROOT HANDSHAKE ---
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
      alert(err.response?.data?.message || "Root credentials rejected by security protocol.");
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

  // --- COMMAND: PROVISION / SYNC NODE ---
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
        alert("SaaS Node Synchronized successfully!");
      } else {
        formData.append('subdomain', factoryData.subdomain);
        await API.post('/superadmin/create-company', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        alert("New Node Instance Initialized!");
      }
      cancelEdit();
      fetchCompanies(); 
    } catch (err) {
      alert("Action Failed: " + (err.response?.data?.message || "Check Infrastructure Linkage"));
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`PERMANENT DECOMMISSION: Terminate node ${name}? This action is immutable and all node data will be purged from AWS/Database.`)) {
      try {
        await API.delete(`/superadmin/company/${id}`);
        fetchCompanies(); 
      } catch (err) {
        alert("Termination sequence failed. Node integrity preserved.");
      }
    }
  };

  // --- MASTER AUTHENTICATION GATEWAY (Root Logic) ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 selection:bg-primary/30 transition-all duration-1000 relative overflow-hidden">
        
        {/* Atmosphere Modules */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-1/4 -right-1/4 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[140px]" />
            <div className="absolute -bottom-1/4 -left-1/4 w-[800px] h-[800px] bg-indigo-500/5 rounded-full blur-[140px]" />
        </div>

        <div className="bg-card backdrop-blur-3xl border border-border p-10 md:p-16 rounded-[4rem] w-full max-w-[500px] shadow-[0_50px_100px_rgba(0,0,0,0.1)] dark:shadow-none relative z-10 animate-in fade-in zoom-in-95 duration-1000">
          <div className="text-center mb-14">
            <div className="relative group inline-block">
                <div className="absolute inset-0 bg-primary/20 blur-3xl group-hover:bg-primary/40 transition-all rounded-full" />
                <div className="relative w-24 h-24 bg-background border border-border rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-2xl transition-all duration-500 group-hover:scale-110 group-hover:border-primary/50">
                   <ShieldCheck size={48} className="text-primary" />
                </div>
            </div>
            <h2 className="text-foreground text-4xl font-black tracking-tighter m-0 uppercase leading-none">Root Access</h2>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.5em] mt-4 opacity-70">Infrastructure Control Mode</p>
          </div>
          
          <form onSubmit={handleMasterLogin} className="space-y-8">
            <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-3 block">Root Identifier</label>
                <div className="relative group">
                    <Users className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={20} />
                    <input type="text" placeholder="Authorized Username" className="w-full bg-background border border-border text-foreground pl-16 pr-8 py-6 rounded-[2rem] outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-black text-sm shadow-inner placeholder:text-slate-400 dark:placeholder:text-slate-700" onChange={(e) => setLoginData({...loginData, username: e.target.value})} required />
                </div>
            </div>
            <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-3 block">Master Cipher</label>
                <div className="relative group">
                    <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={20} />
                    <input type="password" placeholder="••••••••" className="w-full bg-background border border-border text-foreground pl-16 pr-8 py-6 rounded-[2rem] outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-black text-sm shadow-inner placeholder:text-slate-400 dark:placeholder:text-slate-700" onChange={(e) => setLoginData({...loginData, password: e.target.value})} required />
                </div>
            </div>
            <button type="submit" disabled={loading} className="group w-full py-6 rounded-[2rem] bg-foreground text-background dark:bg-primary dark:text-slate-950 font-black text-xs uppercase tracking-[0.4em] shadow-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-5 cursor-pointer overflow-hidden relative">
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              {loading ? <RefreshCcw className="animate-spin" size={24} /> : <LogIn size={24} className="group-hover:translate-x-2 transition-transform duration-500" />}
              <span className="relative z-10">Authorize Master Session</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  const safeCompanies = Array.isArray(companies) ? companies : [];

  return (
    <div className="min-h-screen bg-background text-foreground font-sans p-6 md:p-12 transition-all duration-1000 selection:bg-primary/30">
      
      {/* --- EXECUTIVE TOP BAR --- */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-16 gap-8 bg-card p-10 md:p-12 rounded-[4rem] border border-border backdrop-blur-xl shadow-2xl transition-all duration-500">
        <div className="flex items-center gap-8">
          <div className="p-5 bg-primary/10 rounded-[2rem] border border-primary/20 shadow-inner transition-transform hover:rotate-6">
            <LayoutGrid size={40} className="text-primary" />
          </div>
          <div>
            <h1 className="text-5xl font-black tracking-tighter m-0 uppercase leading-none">Master Console</h1>
            <div className="flex items-center gap-4 mt-3">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" />
                <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.4em]">Work Pilot Core • SaaS Global Oversight</p>
            </div>
          </div>
        </div>
        <button onClick={onLogout} className="w-full lg:w-auto flex items-center justify-center gap-4 bg-rose-500/10 hover:bg-rose-600 border border-rose-500/20 text-rose-600 dark:text-rose-400 hover:text-white px-12 py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] transition-all active:scale-95 shadow-xl hover:shadow-rose-500/20">
          <LogOut size={20} /> Revoke Master Token
        </button>
      </div>
      
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.8fr] gap-12">
        
        {/* --- SECTION 1: NODE PROVISIONING TERMINAL --- */}
        <section className="bg-card backdrop-blur-xl p-10 md:p-14 rounded-[4rem] border border-border shadow-2xl relative overflow-hidden h-fit group transition-all duration-500">
          <div className="absolute -top-32 -right-32 w-80 h-80 bg-primary/5 rounded-full blur-[120px] pointer-events-none group-hover:opacity-40 transition-opacity" />
          
          <div className="flex items-center gap-6 mb-14 relative z-10">
              <div className={`p-4 rounded-2xl border transition-all duration-500 shadow-inner ${isEditing ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-primary/10 border-primary/20 text-primary'}`}>
                {isEditing ? <Edit3 size={28} /> : <PlusCircle size={28} />}
              </div>
              <h3 className="text-3xl font-black tracking-tighter m-0 uppercase leading-none">
                {isEditing ? 'Modify Active Node' : 'Provision SaaS Node'}
              </h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-10 relative z-10">
            <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em] ml-3 block">Official Entity Designation</label>
                <input type="text" placeholder="e.g. Apex Industrial Group" value={factoryData.companyName} className="w-full bg-background border border-border text-foreground px-8 py-6 rounded-[2rem] outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-black uppercase tracking-tight shadow-inner placeholder:text-slate-400 dark:placeholder:text-slate-700" onChange={(e) => setFactoryData({...factoryData, companyName: e.target.value})} required />
            </div>
            
            <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em] ml-3 block">Dynamic Subdomain {isEditing && "(Immutable Protocol)"}</label>
                <div className="relative group">
                    <LinkIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={20} />
                    <input type="text" disabled={isEditing} placeholder="e.g. apexnode" value={factoryData.subdomain} className={`w-full ${isEditing ? 'bg-background/50 cursor-not-allowed opacity-50' : 'bg-background'} border border-border text-primary pl-16 pr-8 py-6 rounded-[2rem] font-mono font-black shadow-inner lowercase`} onChange={(e) => setFactoryData({...factoryData, subdomain: e.target.value.toLowerCase()})} required />
                </div>
            </div>
            
            {/* S3 Logo Logic Block */}
            <div className="bg-background/50 p-10 rounded-[3rem] border-4 border-dashed border-border transition-all hover:border-primary/40 shadow-inner group/drop">
              <label className="text-[10px] font-black text-slate-400 dark:text-primary/60 flex items-center gap-4 uppercase tracking-[0.4em] mb-8 px-2"><ImageIcon size={20} /> Identity Emblem (AWS S3)</label>
              <div className="flex flex-col md:flex-row items-center gap-10">
                {logoPreview ? (
                  <div className="relative group/logo">
                    <div className="w-32 h-32 bg-white p-4 rounded-[2.5rem] border-2 border-primary shadow-2xl flex items-center justify-center overflow-hidden transition-all group-hover/logo:scale-105">
                        <img src={logoPreview} alt="Node Logo" className="max-h-full object-contain brightness-100 dark:brightness-110" />
                    </div>
                    <button type="button" onClick={() => {setLogoFile(null); setLogoPreview(null);}} className="absolute -top-4 -right-4 bg-rose-500 text-white p-3 rounded-full shadow-2xl hover:scale-110 transition-all border-4 border-card"><X size={18} /></button>
                  </div>
                ) : (
                  <label className="w-32 h-32 bg-card border border-border rounded-[2.5rem] flex items-center justify-center cursor-pointer hover:bg-background transition-all shadow-xl group/upload">
                    <PlusCircle size={40} className="text-slate-300 group-hover/upload:text-primary group-hover/upload:rotate-90 transition-all duration-700" />
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                  </label>
                )}
                <div className="space-y-2 text-center md:text-left">
                    <p className="text-sm font-black text-foreground uppercase tracking-tight leading-none">{logoFile ? `ASSET: ${logoFile.name}` : "Emblem required for node identity."}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest leading-loose opacity-70">Sizing: 512x512 Master <br/> Format: Transparent PNG Preferred</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em] ml-3 block">Root Admin Protocol (G-Mail)</label>
                <div className="relative group">
                    <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={20} />
                    <input type="email" placeholder="admin@factory-node.com" value={factoryData.ownerEmail} className="w-full bg-background border border-border text-foreground pl-16 pr-8 py-6 rounded-[2rem] outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-black shadow-inner placeholder:text-slate-400 dark:placeholder:text-slate-700" onChange={(e) => setFactoryData({...factoryData, ownerEmail: e.target.value})} required />
                </div>
            </div>
            
            <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em] ml-3 block">{isEditing ? "Update Master Cipher (Optional)" : "Initialize Access Sequence"}</label>
                <div className="relative group">
                    <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={20} />
                    <input type="password" placeholder="••••••••" value={factoryData.adminPassword} className="w-full bg-background border border-border text-foreground pl-16 pr-8 py-6 rounded-[2rem] outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-black shadow-inner placeholder:text-slate-400 dark:placeholder:text-slate-700" onChange={(e) => setFactoryData({...factoryData, adminPassword: e.target.value})} required={!isEditing} />
                </div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-6 pt-6">
                {isEditing && (
                    <button type="button" onClick={cancelEdit} className="flex-1 py-6 rounded-2xl border border-border text-slate-500 font-black text-xs uppercase tracking-[0.3em] hover:bg-background transition-all active:scale-95 shadow-lg">
                        Abort Protocol
                    </button>
                )}
                <button type="submit" disabled={processing} className={`flex-[2] py-6 rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all active:scale-[0.98] flex items-center justify-center gap-5 shadow-2xl relative overflow-hidden ${isEditing ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 shadow-emerald-500/20' : 'bg-foreground text-background dark:bg-primary dark:text-slate-950 shadow-primary/20'}`}>
                    {processing ? <RefreshCcw className="animate-spin" size={24} /> : isEditing ? <CheckCircle size={24} /> : <Server size={24} />}
                    <span className="relative z-10">{processing ? "Syncing Logic..." : isEditing ? "Push Modifications" : "Initialize Node"}</span>
                </button>
            </div>
          </form>
        </section>

        {/* --- SECTION 2: GLOBAL INFRASTRUCTURE DIRECTORY --- */}
        <section className="bg-card backdrop-blur-xl p-10 md:p-14 rounded-[4rem] border border-border shadow-2xl overflow-hidden flex flex-col transition-all duration-500">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-14 gap-8 relative z-10">
            <div className="flex items-center gap-6">
                <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20 shadow-inner">
                    <Globe size={32} className="text-primary" />
                </div>
                <h3 className="text-3xl font-black tracking-tighter m-0 uppercase leading-none">Global Nodes</h3>
            </div>
            <div className="bg-background px-8 py-3 rounded-full border border-border shadow-inner flex items-center gap-4 transition-all hover:border-primary/30">
                <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_12px_#38bdf8]" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Active Instances: </span>
                <span className="text-primary font-black text-xl tracking-tighter">{safeCompanies.length}</span>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto custom-scrollbar">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-background/50 border-y border-border text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em] text-left">
                  <th className="px-10 py-8">Node Identity & Root Protocol</th>
                  <th className="px-10 py-8">Virtual Terminal Access</th>
                  <th className="px-10 py-8 text-right">Intervention</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {safeCompanies.map((c, idx) => {
                   const baseDomain = window.location.hostname.includes('localhost') ? 'localhost:5173' : window.location.hostname;
                   const terminalUrl = `http://${c.subdomain}.${baseDomain}`;

                   return (
                  <tr key={c._id} className="group hover:bg-background/50 transition-all duration-500 animate-in slide-in-from-right-6" style={{ animationDelay: `${idx * 50}ms` }}>
                    <td className="px-10 py-10">
                      <div className="flex items-center gap-8">
                        <div className="w-20 h-20 bg-white dark:bg-background rounded-[1.5rem] flex items-center justify-center p-3 shadow-2xl border border-border transition-all group-hover:scale-110 group-hover:border-primary/30">
                          {c.logo ? <img src={c.logo} alt="Node Identity" className="max-h-full object-contain brightness-100 dark:brightness-110" /> : <div className="w-full h-full bg-slate-950 rounded-xl flex items-center justify-center text-primary font-black text-[10px] uppercase tracking-tighter shadow-inner">Node</div>}
                        </div>
                        <div className="min-w-0">
                            <div className="text-foreground font-black text-2xl tracking-tighter leading-none mb-3 uppercase group-hover:text-primary transition-colors duration-300">{c.companyName}</div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.3em] flex items-center gap-3"><Mail size={14} className="text-primary/40" /> {c.adminEmail || 'Ledger Entry Missing'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-10">
                      <div className="bg-background p-4 rounded-2xl border border-border inline-block shadow-inner group-hover:border-primary/20 transition-all">
                        <span className="font-mono text-primary font-black text-sm lowercase tracking-tight">
                           {c.subdomain}.{baseDomain}
                        </span>
                      </div>
                    </td>
                    <td className="px-10 py-10">
                      <div className="flex justify-end gap-4 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-500 transform lg:translate-x-6 lg:group-hover:translate-x-0">
                        <button onClick={() => startEdit(c)} className="p-4 bg-background text-slate-500 hover:text-primary rounded-2xl border border-border hover:border-primary transition-all active:scale-90 shadow-lg" title="Modify Node Cluster"><Edit3 size={20}/></button>
                        <a href={terminalUrl} target="_blank" rel="noreferrer" className="p-4 bg-background text-emerald-500 rounded-2xl border border-border hover:border-emerald-500 transition-all active:scale-90 shadow-lg" title="Access Virtual Node Terminal"><ExternalLink size={20}/></a>
                        <button onClick={() => handleDelete(c._id, c.companyName)} className="p-4 bg-background text-rose-500 rounded-2xl border border-border hover:border-rose-500 transition-all active:scale-90 shadow-lg" title="Emergency Node Decommission"><Trash2 size={20}/></button>
                      </div>
                    </td>
                  </tr>
                );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Dashboard Dormant View */}
          {safeCompanies.length === 0 && (
             <div className="flex-1 flex flex-col items-center justify-center py-40 opacity-20 grayscale transition-all duration-1000">
                <div className="relative mb-10">
                    <Terminal size={120} className="text-slate-400" />
                    <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full animate-pulse" />
                </div>
                <p className="font-black text-xl uppercase tracking-[0.8em] text-slate-400">Infrastructure Dormant</p>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] mt-6">Awaiting node registry synchronization</p>
             </div>
          )}
        </section>
      </div>

      {/* Industrial Root Stylings */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; } 
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } 
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.2); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(56, 189, 248, 0.4); }
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 12s linear infinite; }
      `}</style>
    </div>
  );
};

export default SuperAdmin;