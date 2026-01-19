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

const Login = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const navigate = useNavigate();
  const subdomain = getSubdomain();

  /**
   * 1. VERIFY FACTORY ON LOAD
   * Now using the centralized API instance for AWS compatibility.
   */
  useEffect(() => {
    const fetchTenant = async () => {
      try {
        setLoading(true);
        // Using API instance instead of raw axios
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
   * 2. HANDLE LOGIN SUBMISSION
   * Refactored to use the unified API instance.
   */
  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!subdomain) return alert("No subdomain detected. Please check your URL.");
    if (!tenant) return alert("Factory not verified. Please wait or refresh.");

    try {
      setIsSubmitting(true);
      // Switched to centralized API instance
      const res = await API.post('/superadmin/login-employee', {
        email, 
        password, 
        subdomain
      });
      
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user)); // Ensure user object is persisted
      
      // Use res.data.tenantId safely (Preserved logic)
      const actualTenantId = res.data.tenantId || tenant.id || tenant._id;
      localStorage.setItem('tenantId', actualTenantId); // Persist tenantId for future API calls
      
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

  // --- LOADING STATE VIEW ---
  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-6">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin"></div>
        <ShieldCheck className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-sky-400" size={24} />
      </div>
      <p className="text-slate-500 font-black text-[10px] tracking-[0.4em] uppercase animate-pulse">Verifying Factory Infrastructure</p>
    </div>
  );

  // --- SUBDOMAIN ERROR VIEW ---
  if (!tenant && subdomain) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900/40 border border-red-500/20 rounded-[2.5rem] p-10 backdrop-blur-xl text-center shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-red-500/20">
            <AlertTriangle className="text-red-400" size={32} />
          </div>
          <h2 className="text-white text-2xl font-black tracking-tight mb-2">Access Restricted</h2>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            Could not verify factory instance: <span className="text-red-400 font-bold">"{subdomain}"</span>
          </p>
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-[11px] text-slate-500 font-bold uppercase tracking-widest mb-8">
            Please verify the URL or contact your system administrator.
          </div>
          <button onClick={() => window.location.reload()} className="w-full py-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-xs uppercase tracking-widest transition-all active:scale-95">
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // --- MAIN LOGIN FORM ---
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-sky-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-[420px] w-full bg-slate-900/40 border border-slate-800/60 rounded-[3rem] p-10 backdrop-blur-2xl shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-700">
        
        {/* Branding Section */}
        <div className="text-center mb-10">
          {/* REMOVED brightness-0 invert to show actual logo colors */}
          <div className="flex items-center justify-center mx-auto mb-8 min-h-[80px]">
  {tenant?.logo ? (
    <img 
      src={tenant?.logo} 
      alt="Logo" 
      className="max-w-[180px] max-h-[80px] object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]" 
    />
  ) : (
    <div className="w-20 h-20 bg-sky-500/10 rounded-2xl flex items-center justify-center border border-sky-500/20">
      <Factory className="text-sky-500" size={40} />
    </div>
  )}
</div>
          <h1 className="text-white text-3xl font-black tracking-tighter mb-2">
            {tenant?.companyName?.toUpperCase() || "WORK PILOT"}
          </h1>
          <div className="inline-flex items-center gap-2 bg-sky-500/10 px-4 py-1 rounded-full border border-sky-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest">Secure Terminal Entry</span>
          </div>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Personnel Email</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-sky-400 transition-colors" size={18} />
              <input 
                type="email" 
                placeholder="name@factory.com" 
                required
                className="w-full bg-slate-950 border border-slate-800 text-white pl-12 pr-5 py-4 rounded-2xl outline-none focus:border-sky-500/50 transition-all font-medium placeholder:text-slate-700"
                onChange={(e) => setEmail(e.target.value)} 
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Access Cipher</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-sky-400 transition-colors" size={18} />
              <input 
                type="password" 
                placeholder="••••••••" 
                required
                className="w-full bg-slate-950 border border-slate-800 text-white pl-12 pr-5 py-4 rounded-2xl outline-none focus:border-sky-500/50 transition-all font-medium placeholder:text-slate-700"
                onChange={(e) => setPassword(e.target.value)} 
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full mt-4 py-5 rounded-2xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-slate-950 font-black text-sm uppercase tracking-[0.2em] shadow-[0_0_30px_rgba(56,189,248,0.2)] transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 cursor-pointer"
          >
            {isSubmitting ? (
                <RefreshCcw className="animate-spin" size={20} />
            ) : (
                <LogIn size={20} />
            )}
            {isSubmitting ? "Authenticating..." : "Authorize Login"}
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-slate-800/60 text-center">
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest leading-loose">
                Multi-Tenant Protocol v1.2.0<br/>
                Encrypted Session Management Active
            </p>
        </div>
      </div>
    </div>
  );
};

export default Login;