import React, { useState, useEffect } from 'react';
import API from '../api/axiosConfig'; // Switched to centralized API instance
import { useNavigate } from 'react-router-dom';
import { getSubdomain } from '../utils/subdomain';
import { 
  ShieldCheck, 
  Mail, 
  Lock, 
  LogIn, 
  RefreshCcw, 
  AlertTriangle, 
  Factory 
} from 'lucide-react';

/**
 * LOGIN: SECURE TERMINAL ENTRY v1.5
 * Purpose: Authenticates personnel for specific tenant nodes.
 * UI: Fully responsive and theme-adaptive (Light/Dark).
 */
const Login = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const navigate = useNavigate();
  const subdomain = getSubdomain();

  /**
   * 1. VERIFY FACTORY INFRASTRUCTURE
   */
  useEffect(() => {
    const fetchTenant = async () => {
      try {
        setLoading(true);
        const res = await API.get(`/superadmin/verify/${subdomain}`);
        setTenant(res.data);
      } catch (err) {
        console.error("Factory verification failed:", err);
        setTenant(null); 
      } finally {
        setLoading(false);
      }
    };
    if (subdomain) fetchTenant();
    else setLoading(false);
  }, [subdomain]);

  /**
   * 2. EXECUTE LOGIN HANDSHAKE
   */
  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!subdomain) return alert("Security Error: No subdomain detected.");
    if (!tenant) return alert("System Error: Factory node not verified.");

    try {
      setIsSubmitting(true);
      const res = await API.post('/superadmin/login-employee', {
        email, 
        password, 
        subdomain
      });
      
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      
      const actualTenantId = res.data.tenantId || tenant.id || tenant._id;
      localStorage.setItem('tenantId', actualTenantId);
      
      onLoginSuccess(res.data.user, actualTenantId); 
      navigate('/dashboard');
    } catch (err) {
      console.error("Login Error Object:", err);
      const errorMsg = err.response?.data?.message || err.message || "Connection to server failed";
      alert(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- SKELETON LOADING VIEW (Adaptive) ---
  if (loading) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 transition-colors duration-500">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <ShieldCheck className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary" size={24} />
      </div>
      <p className="text-slate-500 font-black text-[10px] tracking-[0.4em] uppercase animate-pulse">Verifying Factory Infrastructure</p>
    </div>
  );

  // --- RESTRICTED ACCESS VIEW (Responsive) ---
  if (!tenant && subdomain) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 transition-colors duration-500">
        <div className="max-w-md w-full bg-card border border-red-500/20 rounded-[2.5rem] p-10 backdrop-blur-xl text-center shadow-2xl animate-in zoom-in-95 duration-500">
          <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-8 border border-red-500/20">
            <AlertTriangle className="text-red-500" size={32} />
          </div>
          <h2 className="text-foreground text-2xl font-black tracking-tight mb-3">Access Restricted</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 leading-relaxed uppercase tracking-tight">
            Could not verify factory node: <span className="text-red-500 font-black">"{subdomain}"</span>
          </p>
          <div className="p-5 bg-background rounded-2xl border border-border text-[11px] text-slate-500 font-bold uppercase tracking-widest mb-10 leading-relaxed shadow-inner">
            Ensure the URL is correct or contact system architecture support.
          </div>
          <button onClick={() => window.location.reload()} className="w-full py-5 rounded-2xl bg-card border border-border hover:border-primary text-foreground font-black text-xs uppercase tracking-[0.2em] transition-all active:scale-95 shadow-sm">
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // --- MAIN LOGIN TERMINAL ---
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden font-sans transition-colors duration-500 selection:bg-primary/30">
      
      {/* Dynamic Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-[440px] w-full bg-card border border-border rounded-[3rem] p-8 md:p-12 backdrop-blur-2xl shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-1000">
        
        {/* Branding Section (Responsive) */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mx-auto mb-8 min-h-[90px] group">
            {tenant?.logo ? (
              <img 
                src={tenant?.logo} 
                alt="Factory Emblem" 
                className="max-w-[200px] max-h-[90px] object-contain transition-transform duration-700 group-hover:scale-105" 
              />
            ) : (
              <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 shadow-inner group-hover:border-primary/40 transition-all">
                <Factory className="text-primary" size={40} />
              </div>
            )}
          </div>
          <h1 className="text-foreground text-2xl md:text-3xl font-black tracking-tighter mb-3 uppercase leading-tight">
            {tenant?.companyName || "WORK PILOT"}
          </h1>
          <div className="inline-flex items-center gap-2.5 bg-primary/5 px-5 py-1.5 rounded-full border border-primary/20 shadow-inner">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Secure Terminal Entry</span>
          </div>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Personnel Email</label>
            <div className="relative group">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
              <input 
                type="email" 
                placeholder="name@factory.com" 
                required
                className="w-full bg-background border border-border text-foreground pl-14 pr-6 py-5 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold text-sm shadow-inner placeholder:text-slate-400 dark:placeholder:text-slate-700"
                onChange={(e) => setEmail(e.target.value)} 
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Access Cipher</label>
            <div className="relative group">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
              <input 
                type="password" 
                placeholder="••••••••" 
                required
                className="w-full bg-background border border-border text-foreground pl-14 pr-6 py-5 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-black text-sm shadow-inner placeholder:text-slate-400 dark:placeholder:text-slate-700 tracking-widest"
                onChange={(e) => setPassword(e.target.value)} 
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full mt-6 py-5 rounded-2xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-white dark:text-slate-950 font-black text-xs sm:text-sm uppercase tracking-[0.3em] shadow-2xl shadow-primary/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-4 cursor-pointer"
          >
            {isSubmitting ? (
                <RefreshCcw className="animate-spin" size={20} />
            ) : (
                <LogIn size={20} />
            )}
            {isSubmitting ? "Authenticating..." : "Authorize Terminal"}
          </button>
        </form>

        <div className="mt-12 pt-8 border-t border-border/50 text-center">
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] leading-relaxed">
                Multi-Tenant Protocol v1.5.0<br/>
                <span className="opacity-60 font-bold">Encrypted Node Handshake Active</span>
            </p>
        </div>
      </div>
    </div>
  );
};

export default Login;