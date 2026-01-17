import React, { useState, useEffect } from 'react';
import API from '../api/axiosConfig'; 
import { useNavigate } from 'react-router-dom';
import { getSubdomain } from '../utils/subdomain';
import { 
  ShieldCheck, 
  Mail, 
  Lock, 
  LogIn, 
  RefreshCcw, 
  AlertTriangle, 
  Factory,
  ChevronRight,
  Fingerprint
} from 'lucide-react';

/**
 * LOGIN: MULTI-TENANT AUTHENTICATION PORTAL v1.3
 * Purpose: Verifies factory instance via subdomain and authorizes personnel nodes.
 * Architecture: Adaptive Industrial Glassmorphism.
 */
const Login = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const navigate = useNavigate();
  const subdomain = getSubdomain();

  // --- M-TENANT SECURE PROTOCOL: VERIFY FACTORY NODE ---
  useEffect(() => {
    const fetchTenant = async () => {
      try {
        setLoading(true);
        const res = await API.get(`/superadmin/verify/${subdomain}`);
        setTenant(res.data);
      } catch (err) {
        console.error("Factory node verification failed:", err);
        setTenant(null); 
      } finally {
        setLoading(false);
      }
    };
    if (subdomain) fetchTenant();
    else setLoading(false);
  }, [subdomain]);

  // --- COMMAND: AUTHORIZE ACCESS ---
  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!subdomain) return alert("Security Protocol Error: No subdomain detected in handshake.");
    if (!tenant) return alert("Verification Error: Authorized factory instance not found.");

    try {
      setIsSubmitting(true);
      const res = await API.post('/superadmin/login-employee', {
        email, 
        password, 
        subdomain
      });
      
      // PERSISTENCE LEDGER
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user)); 
      
      const actualTenantId = res.data.tenantId || tenant.id || tenant._id;
      localStorage.setItem('tenantId', actualTenantId); 
      
      onLoginSuccess(res.data.user, actualTenantId); 
      navigate('/dashboard');
    } catch (err) {
      console.error("Authentication Failure:", err);
      const errorMsg = err.response?.data?.message || "Credentials rejected by master node.";
      alert(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- STATE: SYSTEM INTEGRITY CHECK (Loading) ---
  if (loading) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-8 transition-colors duration-700">
      <div className="relative">
        <div className="w-28 h-28 border-4 border-primary/10 border-t-primary rounded-full animate-spin"></div>
        <ShieldCheck className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary" size={40} />
        <div className="absolute inset-0 bg-primary/20 blur-3xl animate-pulse rounded-full" />
      </div>
      <div className="text-center space-y-3">
        <p className="text-foreground font-black text-xs tracking-[0.6em] uppercase">System Integrity Check</p>
        <p className="text-slate-500 font-black text-[10px] uppercase tracking-widest opacity-60">Verifying Node: {subdomain || 'MASTER_ROOT'}</p>
      </div>
    </div>
  );

  // --- STATE: ACCESS RESTRICTED (Invalid Subdomain) ---
  if (!tenant && subdomain) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 transition-colors duration-700">
        <div className="max-w-md w-full bg-card border border-rose-500/20 rounded-[3.5rem] p-10 md:p-14 backdrop-blur-2xl text-center shadow-2xl animate-in zoom-in-95 duration-500">
          <div className="w-24 h-24 bg-rose-500/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 border border-rose-500/20 shadow-inner">
            <AlertTriangle className="text-rose-500" size={48} />
          </div>
          <h2 className="text-foreground text-3xl font-black tracking-tighter mb-4 uppercase">Access Denied</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-10 leading-relaxed font-bold">
            Secure connection failed. Factory node <span className="text-rose-500 font-black">"{subdomain}"</span> is not recognized by the central registry.
          </p>
          <div className="p-6 bg-background border border-border rounded-2xl text-[10px] text-slate-500 font-black uppercase tracking-[0.25em] mb-10 leading-relaxed shadow-inner">
            Protocol Error 403: Forbidden <br/> Manual intervention required.
          </div>
          <button onClick={() => window.location.reload()} className="w-full py-6 rounded-2xl bg-foreground text-background font-black text-xs uppercase tracking-[0.4em] transition-all active:scale-95 shadow-2xl">
            Restart Handshake
          </button>
        </div>
      </div>
    );
  }

  // --- MAIN: AUTHENTICATION INTERFACE ---
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden font-sans transition-all duration-1000 selection:bg-primary/30">
      
      {/* --- STRATEGIC ATMOSPHERICS --- */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute -top-1/4 -left-1/4 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[140px]" />
        <div className="absolute -bottom-1/4 -right-1/4 w-[800px] h-[800px] bg-indigo-500/5 rounded-full blur-[140px]" />
      </div>

      <div className="max-w-[480px] w-full bg-card border border-border rounded-[4rem] p-10 md:p-16 backdrop-blur-3xl shadow-[0_50px_100px_rgba(0,0,0,0.1)] dark:shadow-none relative z-10 animate-in fade-in zoom-in-95 duration-1000">
        
        {/* BRANDING HUB */}
        <div className="text-center mb-14">
          <div className="group relative w-24 h-24 mx-auto mb-10 transition-all duration-700 hover:scale-110">
            <div className="absolute inset-0 bg-primary/20 blur-3xl group-hover:bg-primary/40 transition-all rounded-full" />
            <div className="relative w-full h-full bg-background border-2 border-border rounded-[2.5rem] flex items-center justify-center shadow-2xl overflow-hidden transition-all group-hover:border-primary/50">
              {tenant?.logo ? (
                  <img src={tenant.logo} alt="Node Identity" className="w-14 h-14 object-contain brightness-100 dark:brightness-110" />
              ) : (
                  <Factory className="text-primary" size={40} />
              )}
            </div>
          </div>
          
          <h1 className="text-foreground text-4xl font-black tracking-tighter mb-4 uppercase leading-none">
            {tenant?.companyName || "Work Pilot"}
          </h1>
          
          <div className="inline-flex items-center gap-3 bg-background px-6 py-2.5 rounded-full border border-border shadow-inner">
            <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_#38bdf8]" />
            <span className="text-[10px] font-black text-slate-500 dark:text-primary uppercase tracking-[0.3em]">Node Identified</span>
          </div>
        </div>
        
        {/* AUTHENTICATION FORM */}
        <form onSubmit={handleLogin} className="space-y-8">
          {/* Email Identity */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em] ml-3">Authorized ID</label>
            <div className="relative group/field">
              <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/field:text-primary transition-colors" size={20} />
              <input 
                type="email" 
                placeholder="identity@factory.node" 
                required
                className="w-full bg-background border border-border text-foreground pl-16 pr-8 py-6 rounded-[2rem] outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-black text-sm shadow-inner placeholder:text-slate-400 dark:placeholder:text-slate-700"
                onChange={(e) => setEmail(e.target.value)} 
              />
            </div>
          </div>

          {/* Access Cipher */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em] ml-3">Access Cipher</label>
            <div className="relative group/field">
              <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/field:text-primary transition-colors" size={20} />
              <input 
                type="password" 
                placeholder="••••••••" 
                required
                className="w-full bg-background border border-border text-foreground pl-16 pr-8 py-6 rounded-[2rem] outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-black text-sm shadow-inner placeholder:text-slate-400 dark:placeholder:text-slate-700"
                onChange={(e) => setPassword(e.target.value)} 
              />
            </div>
          </div>

          {/* DISPATCH ACTION */}
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full mt-10 py-6 rounded-[2rem] bg-foreground text-background dark:bg-primary dark:text-slate-950 font-black text-xs uppercase tracking-[0.4em] shadow-2xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-5 cursor-pointer group/btn relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
            {isSubmitting ? (
                <RefreshCcw className="animate-spin" size={24} />
            ) : (
                <Fingerprint size={24} className="group-hover/btn:scale-110 group-hover/btn:rotate-12 transition-transform duration-500" />
            )}
            <span className="relative z-10">
                {isSubmitting ? "Verifying..." : "Authorize Access"}
            </span>
          </button>
        </form>

        {/* SYSTEM AUDIT FOOTER */}
        <div className="mt-14 pt-12 border-t border-border/60 text-center space-y-5">
            <div className="flex items-center justify-center gap-3">
                <ShieldCheck size={16} className="text-emerald-500" />
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em]">AES-256 Node Security Active</p>
            </div>
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-700 uppercase tracking-[0.3em] leading-loose opacity-50">
                Multi-Tenant Protocol v1.3.0 <br/>
                Unauthorized entry triggers automated audit logs.
            </p>
        </div>
      </div>
    </div>
  );
};

export default Login;