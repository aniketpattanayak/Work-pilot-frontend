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

const SuperAdmin = ({ isAuthenticated, onLogin, onLogout }) => {
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [companies, setCompanies] = useState([]); 
  
  // State for Form Handling
  const [factoryData, setFactoryData] = useState({
    companyName: '', subdomain: '', ownerEmail: '', adminPassword: ''
  });
  
  // Edit Mode States
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  /**
   * 1. FETCH ALL COMPANIES
   * Updated with defensive unwrapping and centralized API instance.
   */
  const fetchCompanies = useCallback(async () => {
    try {
      // Switched to centralized API instance
      const res = await API.get('/superadmin/all-companies');
      
      // Safety: Handle nested data structure
      const data = Array.isArray(res.data) 
        ? res.data 
        : (res.data?.companies || res.data?.data || []);
        
      setCompanies(data);
    } catch (err) {
      console.error("Failed to fetch companies:", err);
      setCompanies([]); // Fallback
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
      // Switched to centralized API instance
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

  // Logic to switch to Edit Mode
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
        // Switched to centralized API instance
        await API.put(`/superadmin/update-branding`, formData, {
            params: { tenantId: editId },
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        alert("SaaS Node Updated Successfully!");
      } else {
        formData.append('subdomain', factoryData.subdomain);
        // Switched to centralized API instance
        await API.post('/superadmin/create-company', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        alert("New Factory Registered Successfully!");
      }

      cancelEdit();
      fetchCompanies(); 
    } catch (err) {
      alert("Action Failed: " + (err.response?.data?.message || "Check Server Connection"));
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`PERMANENT DESTRUCTION: Delete ${name}? All data will be lost forever.`)) {
      try {
        // Switched to centralized API instance
        await API.delete(`/superadmin/company/${id}`);
        fetchCompanies(); 
      } catch (err) {
        alert("Delete failed.");
      }
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 selection:bg-sky-500/30">
        <div className="bg-slate-900/40 backdrop-blur-2xl border border-slate-800/60 p-10 md:p-12 rounded-[3rem] w-full max-w-[440px] shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-700">
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-gradient-to-br from-sky-400 to-sky-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(56,189,248,0.2)]">
               <ShieldCheck size={44} className="text-slate-950" />
            </div>
            <h2 className="text-white text-3xl font-black tracking-tighter m-0">Master Control</h2>
          </div>
          
          <form onSubmit={handleMasterLogin} className="space-y-6">
            <input type="text" placeholder="Root Username" className="w-full bg-slate-950 border border-slate-800 text-white pl-6 pr-5 py-4 rounded-2xl outline-none focus:border-sky-500/50 transition-all font-bold" onChange={(e) => setLoginData({...loginData, username: e.target.value})} required />
            <input type="password" placeholder="Master Password" className="w-full bg-slate-950 border border-slate-800 text-white pl-6 pr-5 py-4 rounded-2xl outline-none focus:border-sky-500/50 transition-all font-bold" onChange={(e) => setLoginData({...loginData, password: e.target.value})} required />
            <button type="submit" disabled={loading} className="w-full py-5 rounded-2xl bg-gradient-to-r from-sky-500 to-sky-600 text-slate-950 font-black text-sm uppercase tracking-[0.2em] shadow-[0_0_30px_rgba(56,189,248,0.2)]">
              {loading ? <RefreshCcw className="animate-spin" size={20} /> : "Execute Login"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Defensive check for rendering the companies list
  const safeCompanies = Array.isArray(companies) ? companies : [];

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans p-6 md:p-10 selection:bg-sky-500/30">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6 bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800/60 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <div className="bg-sky-500/10 p-2 rounded-xl border border-sky-500/20"><LayoutGrid size={24} className="text-sky-400" /></div>
            <h1 className="text-3xl font-black tracking-tighter m-0">Master Console</h1>
          </div>
          <p className="text-slate-500 text-sm font-medium tracking-wide">Work Pilot Infrastructure — SaaS Client Provisioning & Global Oversight</p>
        </div>
        <button onClick={onLogout} className="flex items-center gap-3 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 text-red-400 px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all">
          <LogOut size={18} /> Revoke Master Token
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.8fr] gap-8">
        
        {/* FORM: PROVISION OR EDIT NODE */}
        <section className="bg-slate-900/40 backdrop-blur-md p-8 md:p-10 rounded-[3rem] border border-slate-800/60 shadow-2xl relative overflow-hidden h-fit group">
          <h3 className={`${isEditing ? 'text-emerald-400' : 'text-sky-400'} text-xl font-black tracking-tight flex items-center gap-3 mb-10 relative z-10`}>
            {isEditing ? <Edit3 size={22} /> : <PlusCircle size={22} />} 
            {isEditing ? 'Modify Active Node' : 'Provision New Node'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Official Entity Name</label>
                <input type="text" placeholder="e.g. Apex Manufacturing" value={factoryData.companyName} className="w-full bg-slate-950 border border-slate-800 text-white px-6 py-4 rounded-2xl outline-none focus:border-sky-500/50 font-bold" onChange={(e) => setFactoryData({...factoryData, companyName: e.target.value})} required />
            </div>
            
            <div className="space-y-2 opacity-80">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Virtual Subdomain {isEditing && "(Locked)"}</label>
                <div className="relative group">
                    <LinkIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-700" size={16} />
                    <input type="text" disabled={isEditing} placeholder="e.g. apexnode" value={factoryData.subdomain} className={`w-full ${isEditing ? 'bg-slate-900 cursor-not-allowed' : 'bg-slate-950'} border border-slate-800 text-sky-400 pl-14 pr-6 py-4 rounded-2xl font-mono font-bold`} onChange={(e) => setFactoryData({...factoryData, subdomain: e.target.value.toLowerCase()})} required />
                </div>
            </div>
            
            <div className="bg-slate-950/60 p-6 rounded-3xl border border-slate-800 border-dashed">
              <label className="text-[10px] font-black text-sky-400/60 flex items-center gap-2 uppercase tracking-widest mb-4"><ImageIcon size={14} /> Factory Identity Emblem</label>
              <div className="flex items-center gap-6">
                {logoPreview ? (
                  <div className="relative">
                    <div className="w-20 h-20 bg-white p-2 rounded-2xl border-2 border-sky-500 flex items-center justify-center overflow-hidden"><img src={logoPreview} alt="Preview" className="max-h-full object-contain" /></div>
                    <button type="button" onClick={() => {setLogoFile(null); setLogoPreview(null);}} className="absolute -top-3 -right-3 bg-red-500 text-white p-1.5 rounded-full"><X size={14} /></button>
                  </div>
                ) : (
                  <label className="w-20 h-20 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center cursor-pointer hover:bg-slate-800"><PlusCircle size={24} className="text-slate-600" /><input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} /></label>
                )}
                <p className="text-[11px] text-slate-500 font-bold leading-relaxed">{logoFile ? `FILE: ${logoFile.name}` : "Emblem used across dashboards."}</p>
              </div>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Admin Access Node (Gmail)</label>
                <div className="relative group">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-700" size={16} />
                    <input type="email" placeholder="admin@node.com" value={factoryData.ownerEmail} className="w-full bg-slate-950 border border-slate-800 text-white pl-14 pr-6 py-4 rounded-2xl font-bold" onChange={(e) => setFactoryData({...factoryData, ownerEmail: e.target.value})} required />
                </div>
            </div>
            
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{isEditing ? "Update Password (Leave blank to keep current)" : "Initialize Access Key"}</label>
                <div className="relative group">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-700" size={16} />
                    <input type="password" placeholder="••••••••" value={factoryData.adminPassword} className="w-full bg-slate-950 border border-slate-800 text-white pl-14 pr-6 py-4 rounded-2xl font-bold" onChange={(e) => setFactoryData({...factoryData, adminPassword: e.target.value})} required={!isEditing} />
                </div>
            </div>
            
            <div className="flex gap-4">
                {isEditing && <button type="button" onClick={cancelEdit} className="flex-1 py-5 rounded-2xl border border-slate-700 text-slate-400 font-black text-sm uppercase tracking-widest hover:bg-slate-800">Cancel</button>}
                <button type="submit" disabled={processing} className={`flex-[2] py-5 rounded-2xl bg-gradient-to-r ${isEditing ? 'from-emerald-500 to-emerald-600 shadow-[0_0_30px_rgba(16,185,129,0.2)]' : 'from-sky-500 to-sky-600 shadow-[0_0_30px_rgba(56,189,248,0.2)]'} text-slate-950 font-black text-sm uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-3`}>
                {processing ? <RefreshCcw className="animate-spin" size={20} /> : isEditing ? <CheckCircle size={20} /> : <Factory size={20} />}
                {processing ? "Syncing..." : isEditing ? "Save Modifications" : "Initialize SaaS Node"}
                </button>
            </div>
          </form>
        </section>

        {/* DIRECTORY: CLIENT INFRASTRUCTURE */}
        <section className="bg-slate-900/40 backdrop-blur-md p-8 md:p-10 rounded-[3rem] border border-slate-800/60 shadow-2xl overflow-hidden flex flex-col">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-sky-400 text-xl font-black tracking-tight flex items-center gap-3 m-0"><Globe size={22} /> Client Infrastructure</h3>
            <div className="bg-slate-950 px-5 py-2 rounded-full border border-slate-800 shadow-inner">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Active Nodes: </span>
                <span className="text-sky-400 font-black text-sm">{safeCompanies.length}</span>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto custom-scrollbar">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-900/80 border-b border-slate-800 text-[10px] font-black text-slate-500 uppercase tracking-widest text-left">
                  <th className="px-8 py-5">Instance & Admin Gmail</th>
                  <th className="px-8 py-5">Terminal Link</th>
                  <th className="px-8 py-5 text-right">Intervention</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {safeCompanies.map(c => {
                   // UPDATED: Dynamic Link detection for AWS vs Localhost
                   const baseDomain = window.location.hostname.includes('localhost') ? 'localhost:5173' : window.location.hostname;
                   const terminalUrl = `http://${c.subdomain}.${baseDomain}`;

                   return (
                  <tr key={c._id} className="group hover:bg-slate-900/30 transition-all duration-300">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-1.5 shadow-xl border border-slate-800">
                          {c.logo ? <img src={c.logo} alt="L" className="max-h-full object-contain" /> : <div className="w-full h-full bg-slate-950 rounded-lg flex items-center justify-center text-sky-400 font-black text-[9px] uppercase">Node</div>}
                        </div>
                        <div>
                            <div className="text-white font-black text-base tracking-tight leading-none mb-1.5">{c.companyName}</div>
                            <div className="text-[10px] text-sky-400 font-black uppercase tracking-tight flex items-center gap-1"><Mail size={10} /> {c.adminEmail || 'No Email Found'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 font-mono text-slate-500 font-bold text-xs group-hover:text-sky-300 transition-colors">
                      {c.subdomain}.{baseDomain}
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                        <button onClick={() => startEdit(c)} className="p-3 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20 hover:bg-sky-500 hover:text-slate-950 transition-all active:scale-90" title="Edit Node Details"><Edit3 size={18}/></button>
                        <a href={terminalUrl} target="_blank" rel="noreferrer" className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 hover:bg-emerald-500 hover:text-slate-950 transition-all active:scale-90" title="Open Node Terminal"><ExternalLink size={18}/></a>
                        <button onClick={() => handleDelete(c._id, c.companyName)} className="p-3 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20 hover:bg-red-500 hover:text-white transition-all active:scale-90" title="Permanent Decommission"><Trash2 size={18}/></button>
                      </div>
                    </td>
                  </tr>
                );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; } .custom-scrollbar::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.4); border-radius: 10px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(56, 189, 248, 0.1); border-radius: 10px; }`}</style>
    </div>
  );
};

export default SuperAdmin;