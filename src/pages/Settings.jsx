import React, { useState, useEffect, useCallback } from 'react';
import API from '../api/axiosConfig'; // Centralized API instance
import { 
  FiUser, FiShield, FiPlus, FiX, FiSave, FiTrash2, FiSettings, FiCheckCircle, FiRefreshCw 
} from "react-icons/fi";
import { 
  Clock, 
  Calendar, 
  Save, 
  Trash2, 
  PlusCircle, 
  RefreshCcw, 
  Settings as LucideSettings,
  Image as ImageIcon,
  UploadCloud,
  CheckCircle2,
  Building2,
  Zap,
  Info,
  Trophy,
  Plus,
  ShieldAlert,
  Star,
  Medal,
  Flame,
  Target,
  Rocket,
  ShieldCheck,
  Award,
  ChevronRight,
  Coffee // Icon for Weekends
} from 'lucide-react';

/**
 * SETTINGS: GLOBAL OPERATIONAL PARAMETERS v2.1
 * Purpose: Configures identity, hours, weekends, point mechanics, and achievements.
 * UI: Fully responsive, dual-theme adaptive (Light/Dark).
 */
const Settings = ({ tenantId }) => {
  // --- STATE MANAGEMENT ---
  const [hours, setHours] = useState({ opening: '09:00', closing: '18:00' });
  const [weekends, setWeekends] = useState([0]); // New: Stores day indices (0=Sun, 6=Sat)
  const [newHoliday, setNewHoliday] = useState({ name: '', date: '' });
  const [holidayList, setHolidayList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [branding, setBranding] = useState({ companyName: '', logoUrl: '' });
  const [selectedLogo, setSelectedLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [updatingBranding, setUpdatingBranding] = useState(false);

  const [pointSettings, setPointSettings] = useState({
    isActive: false,
    brackets: []
  });

  const [badgeLibrary, setBadgeLibrary] = useState([]);

  const currentTenantId = tenantId || localStorage.getItem('tenantId');

  const availableIcons = [
    { name: 'Star', icon: <Star size={16} /> },
    { name: 'Trophy', icon: <Trophy size={16} /> },
    { name: 'Medal', icon: <Medal size={16} /> },
    { name: 'Zap', icon: <Zap size={16} /> },
    { name: 'ShieldCheck', icon: <ShieldCheck size={16} /> },
    { name: 'Flame', icon: <Flame size={16} /> },
    { name: 'Target', icon: <Target size={16} /> },
    { name: 'Rocket', icon: <Rocket size={16} /> },
    { name: 'Award', icon: <Award size={16} /> }
  ];

  const eliteColors = [
    { name: 'Amber', hex: '#fbbf24' },
    { name: 'Sky', hex: '#38bdf8' },
    { name: 'Emerald', hex: '#10b981' },
    { name: 'Rose', hex: '#f43f5e' },
    { name: 'Indigo', hex: '#6366f1' }
  ];

  /**
   * 1. DATA ACQUISITION PROTOCOL
   */
  const fetchSettings = useCallback(async () => {
    if (!currentTenantId) return;
    try {
      setLoading(true);
      const res = await API.get(`/superadmin/settings/${currentTenantId}`);
      const data = res.data?.settings || res.data;
      
      if (data) {
        setHours(data.officeHours || { opening: '09:00', closing: '18:00' });
        // FETCH STORED WEEKENDS FROM DATABASE
        setWeekends(Array.isArray(data.weekends) ? data.weekends : [0]);
        setHolidayList(Array.isArray(data.holidays) ? data.holidays : []);
        setBranding({ 
          companyName: data.companyName || '', 
          logoUrl: data.logo || '' 
        });
        setLogoPreview(data.logo || null);
        
        if (data.pointSettings) {
          setPointSettings({
            isActive: data.pointSettings.isActive ?? false,
            brackets: Array.isArray(data.pointSettings.brackets) ? data.pointSettings.brackets : []
          });
        }
        setBadgeLibrary(Array.isArray(data.badgeLibrary) ? data.badgeLibrary : []);
      }
    } catch (err) {
      console.error("Fetch failure:", err);
    } finally {
      setLoading(false);
    }
  }, [currentTenantId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  /**
   * 2. WEEKEND TOGGLE LOGIC
   */
  const toggleWeekend = (dayIndex) => {
    setWeekends(prev => 
      prev.includes(dayIndex) 
        ? prev.filter(d => d !== dayIndex) 
        : [...prev, dayIndex].sort((a, b) => a - b)
    );
  };

  // --- LOGIC HANDLERS (Preserved) ---
  const addBadge = () => {
    setBadgeLibrary(prev => [...prev, {
      name: '',
      description: '',
      pointThreshold: 100,
      iconName: 'Star',
      color: '#fbbf24'
    }]);
  };

  const updateBadge = (index, field, value) => {
    const updated = [...badgeLibrary];
    updated[index][field] = value;
    setBadgeLibrary(updated);
  };

  const removeBadge = (index) => {
    setBadgeLibrary(prev => prev.filter((_, i) => i !== index));
  };

  const addBracket = () => {
    setPointSettings(prev => ({
      ...prev,
      brackets: [...prev.brackets, { 
        label: '', 
        maxDurationDays: 1, 
        pointsUnit: 'hour', 
        earlyBonus: 0, 
        latePenalty: 0 
      }]
    }));
  };

  const updateBracket = (index, field, value) => {
    const updatedBrackets = [...pointSettings.brackets];
    updatedBrackets[index][field] = value;
    setPointSettings(prev => ({ ...prev, brackets: updatedBrackets }));
  };

  const removeBracket = (index) => {
    setPointSettings(prev => ({
      ...prev,
      brackets: prev.brackets.filter((_, i) => i !== index)
    }));
  };

  const handleLogoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedLogo(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const saveBranding = async () => {
    try {
      setUpdatingBranding(true);
      const formData = new FormData();
      formData.append('tenantId', currentTenantId);
      formData.append('companyName', branding.companyName);
      if (selectedLogo) formData.append('logo', selectedLogo);

      await API.put('/superadmin/update-branding', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      alert("Success: Factory Identity updated.");
      fetchSettings();
    } catch (err) {
      alert("Error: " + (err.response?.data?.message || err.message));
    } finally {
      setUpdatingBranding(false);
    }
  };

  const addHolidayToList = (e) => {
    if (e) e.preventDefault(); 
    if (newHoliday.name && newHoliday.date) {
      setHolidayList((prevList) => {
        if (prevList.some(h => h.date === newHoliday.date)) {
          alert("Conflict: Holiday already scheduled on this date.");
          return prevList;
        }
        return [...prevList, { ...newHoliday }];
      });
      setNewHoliday({ name: '', date: '' });
    }
  };

  const removeHoliday = (index) => {
    setHolidayList((prevList) => prevList.filter((_, i) => i !== index));
  };

  /**
   * 3. PERSISTENCE LOGIC
   */
  const saveSettings = async () => {
    if (saving) return;
    try {
      setSaving(true);
      // SENDING WEEKENDS ARRAY TO SERVER
      const response = await API.put('/superadmin/update-settings', {
        tenantId: currentTenantId,
        officeHours: hours,
        weekends: weekends, 
        holidays: holidayList,
        pointSettings: pointSettings,
        badgeLibrary: badgeLibrary 
      });
  
      if (response.status === 200) {
        alert("Success: Global parameters synchronized.");
        await fetchSettings();
      }
    } catch (err) {
      alert("Error: " + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  if (loading && holidayList.length === 0) return (
    <div className="flex flex-col items-center justify-center h-[400px] gap-6 bg-transparent">
      <div className="relative">
        <RefreshCcw className="animate-spin text-primary" size={48} />
        <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
      </div>
      <span className="text-slate-500 dark:text-slate-400 font-black text-[10px] tracking-[0.4em] uppercase leading-none">Accessing Control Panel...</span>
    </div>
  );

  return (
    <div className="w-full max-w-5xl mx-auto animate-in fade-in duration-700 pb-20 selection:bg-primary/30 transition-colors duration-500">
      
      {/* HEADER SECTION */}
      <div className="mb-12 flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
        <div className="bg-primary/10 p-4 rounded-2xl border border-primary/20 shadow-inner shrink-0">
          <LucideSettings className="text-primary" size={36} />
        </div>
        <div className="min-w-0">
          <h2 className="text-foreground text-2xl md:text-4xl font-black tracking-tighter uppercase leading-none">Organisation Setup</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wide mt-3 opacity-80 italic">Configure global task management parameters & company branding. </p>
        </div>
      </div>

      <div className="space-y-8 md:space-y-12">
        
        {/* SECTION 0: FACTORY IDENTITY */}
        <section className="bg-card backdrop-blur-xl rounded-[2rem] md:rounded-[3rem] border border-border p-6 md:p-10 shadow-2xl relative overflow-hidden group">
           <Building2 size={160} className="absolute -right-12 -top-12 text-primary opacity-[0.03] group-hover:scale-110 transition-transform duration-1000 pointer-events-none" />
           <h3 className="text-foreground text-lg md:text-xl font-black flex items-center gap-3 mb-10 relative z-10 uppercase tracking-tight">
             <ImageIcon size={22} className="text-primary" /> Update company name & logo
           </h3>
           <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr_auto] gap-8 items-end relative z-10">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Company Name</label>
                <input type="text" value={branding.companyName} onChange={(e) => setBranding({...branding, companyName: e.target.value})} className="w-full bg-background border border-border text-foreground px-6 py-4 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 transition-all font-black text-sm uppercase shadow-inner" />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Logo</label>
                <div className="flex items-center gap-4">
                  <label className="flex-1 flex items-center justify-center gap-3 cursor-pointer bg-background border border-border hover:border-primary/40 px-5 py-4 rounded-2xl text-primary font-black uppercase tracking-widest text-[10px] shadow-sm transition-all active:scale-95">
                    <UploadCloud size={20} /> Upload <input type="file" hidden onChange={handleLogoSelect} accept="image/*" />
                  </label>
                  {logoPreview && (
                    <div className="w-14 h-14 bg-white p-1.5 rounded-xl flex items-center justify-center border border-border shadow-xl shrink-0">
                      <img src={logoPreview} alt="Handshake Preview" className="max-h-full object-contain" />
                    </div>
                  )}
                </div>
              </div>
              <button onClick={saveBranding} disabled={updatingBranding} className="w-full lg:w-auto bg-primary hover:opacity-90 text-white dark:text-slate-950 px-10 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-primary/20 transition-all active:scale-95 disabled:opacity-50 h-[56px] flex items-center justify-center gap-3">
                {updatingBranding ? <RefreshCcw className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}  Apply
              </button>
           </div>
        </section>

        {/* --- SECTION: WEEKEND CONFIGURATION --- */}
        <section className="bg-card backdrop-blur-xl rounded-[2rem] md:rounded-[3rem] border border-border p-6 md:p-10 shadow-2xl">
          <h3 className="text-foreground text-lg md:text-xl font-black flex items-center gap-3 mb-6 uppercase tracking-tight">
            <Coffee size={22} className="text-primary" /> Weekend Configuration
          </h3>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mb-10 ml-1">Assign recurring non-working days. Systems will skip these when generating work directives.</p>
          
          <div className="flex flex-wrap gap-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleWeekend(i)}
                className={`w-20 h-20 rounded-2xl font-black text-xs uppercase transition-all flex flex-col items-center justify-center border-2 gap-2 ${
                  weekends.includes(i)
                    ? 'bg-red-500 border-red-500 text-white shadow-xl scale-110'
                    : 'bg-background border-border text-slate-400 hover:border-red-500/50'
                }`}
              >
                {day}
                {weekends.includes(i) ? <FiX size={14}/> : <FiPlus size={14}/>}
              </button>
            ))}
          </div>
        </section>

        {/* SECTION 1: WORKING HOURS */}
        <section className="bg-card backdrop-blur-xl rounded-[2rem] md:rounded-[3rem] border border-border p-6 md:p-10 shadow-2xl">
          <h3 className="text-foreground text-lg md:text-xl font-black flex items-center gap-3 mb-10 uppercase tracking-tight">
            <Clock size={22} className="text-primary" /> Operational Hours
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-[0.3em] ml-2">Opening</label>
              <input type="time" value={hours.opening} onChange={(e) => setHours(prev => ({...prev, opening: e.target.value}))} className="w-full bg-background border border-border text-foreground px-6 py-4 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 font-black text-sm shadow-inner" />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-red-600 dark:text-red-500 uppercase tracking-[0.3em] ml-2">Closing</label>
              <input type="time" value={hours.closing} onChange={(e) => setHours(prev => ({...prev, closing: e.target.value}))} className="w-full bg-background border border-border text-foreground px-6 py-4 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 font-black text-sm shadow-inner" />
            </div>
          </div>
        </section>

        {/* SECTION 4: HOLIDAY CALENDAR */}
        <section className="bg-card backdrop-blur-xl rounded-[2rem] md:rounded-[3rem] border border-border p-6 md:p-10 shadow-2xl">
          <h3 className="text-foreground text-lg md:text-xl font-black flex items-center gap-3 mb-10 uppercase tracking-tight">
            <Calendar size={22} className="text-primary" /> Holiday
          </h3>
          <div className="flex flex-col md:flex-row gap-4 mb-10">
            <input type="text" placeholder="Holiday Name" value={newHoliday.name} onChange={(e) => setNewHoliday(prev => ({...prev, name: e.target.value}))} className="flex-[2] bg-background border border-border text-foreground px-6 py-4 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 font-black text-sm uppercase shadow-inner" />
            <input type="date" value={newHoliday.date} onChange={(e) => setNewHoliday(prev => ({...prev, date: e.target.value}))} className="flex-[1.5] bg-background border border-border text-foreground px-6 py-4 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 font-black text-sm shadow-inner" />
            <button onClick={addHolidayToList} className="bg-primary hover:opacity-90 text-white dark:text-slate-950 px-8 py-4 md:py-0 rounded-2xl transition-all shadow-xl shadow-primary/20 flex items-center justify-center active:scale-95"><PlusCircle size={24} /></button>
          </div>
          <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {Array.isArray(holidayList) && holidayList.map((h, index) => (
              <div key={index} className="flex justify-between items-center px-6 py-4 bg-background border border-border rounded-2xl group hover:border-primary/30 transition-all shadow-sm">
                <div className="flex items-center gap-5">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(56,189,248,0.5)]" />
                  <div>
                    <span className="font-black text-foreground text-sm uppercase tracking-tight">{h.name}</span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase ml-4 tracking-widest">{h.date ? new Date(h.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '---'}</span>
                  </div>
                </div>
                <button onClick={() => removeHoliday(index)} className="p-2 text-slate-400 hover:text-red-500 transition-all active:scale-90"><Trash2 size={18} /></button>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 2: PERFORMANCE ENGINE */}
        <section className="bg-card backdrop-blur-xl rounded-[2rem] md:rounded-[3rem] border border-border p-6 md:p-10 shadow-2xl relative group/points">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
            <h3 className="text-foreground text-lg md:text-xl font-black flex items-center gap-3 uppercase tracking-tight">
              <Trophy size={22} className="text-amber-500" /> performance Engine 
            </h3>
            <button onClick={() => setPointSettings(prev => ({ ...prev, isActive: !prev.isActive }))} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-sm ${pointSettings.isActive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border border-emerald-500/30' : 'bg-background text-slate-500 border border-border'}`}>
            Engine {pointSettings.isActive ? 'Online' : 'Offline'}
            </button>
          </div>
          <div className="space-y-6">
            {Array.isArray(pointSettings.brackets) && pointSettings.brackets.map((bracket, index) => (
              <div key={index} className="bg-background border border-border rounded-3xl p-6 md:p-8 relative group/bracket animate-in slide-in-from-top-4 shadow-inner">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1.2fr_1fr_1fr] gap-6 items-end">
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Bracket Identity</label>
                    <input type="text" value={bracket.label} onChange={(e) => updateBracket(index, 'label', e.target.value)} className="w-full bg-card border border-border text-foreground px-4 py-3 rounded-xl outline-none focus:ring-4 focus:ring-primary/10 text-xs font-black uppercase" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Max Duration</label>
                    <input type="number" value={bracket.maxDurationDays} onChange={(e) => updateBracket(index, 'maxDurationDays', parseInt(e.target.value))} className="w-full bg-card border border-border text-foreground px-4 py-3 rounded-xl outline-none focus:ring-4 focus:ring-primary/10 text-xs font-bold" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Interval Unit</label>
                    <div className="relative">
                      <select value={bracket.pointsUnit} onChange={(e) => updateBracket(index, 'pointsUnit', e.target.value)} className="w-full bg-card border border-border text-foreground px-4 py-3 rounded-xl outline-none focus:ring-4 focus:ring-primary/10 text-xs font-black uppercase appearance-none cursor-pointer">
                        <option value="hour">Hourly Cycle</option>
                        <option value="day">Daily Cycle</option>
                      </select>
                      <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-primary pointer-events-none" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest ml-1">Early Bonus (+)</label>
                    <input type="number" value={bracket.earlyBonus} onChange={(e) => updateBracket(index, 'earlyBonus', parseInt(e.target.value))} className="w-full bg-card border border-border text-emerald-600 dark:text-emerald-400 px-4 py-3 rounded-xl outline-none focus:ring-4 focus:ring-emerald-500/10 text-xs font-black shadow-sm" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest ml-1">Late Penalty (-)</label>
                    <input type="number" value={bracket.latePenalty} onChange={(e) => updateBracket(index, 'latePenalty', parseInt(e.target.value))} className="w-full bg-card border border-border text-red-600 dark:text-red-400 px-4 py-3 rounded-xl outline-none focus:ring-4 focus:ring-red-500/10 text-xs font-black shadow-sm" />
                  </div>
                </div>
                <button onClick={() => removeBracket(index)} className="absolute -top-3 -right-3 bg-card text-red-500 p-2.5 rounded-full border border-border shadow-xl hover:bg-red-500 hover:text-white transition-all active:scale-90"><Trash2 size={16} /></button>
              </div>
            ))}
            <button onClick={addBracket} className="w-full py-5 border-2 border-dashed border-border rounded-3xl text-slate-400 hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-3 text-xs font-black uppercase tracking-[0.3em] active:scale-[0.99]"><Plus size={18} /> Append Point Bracket</button>
          </div>
        </section>

        {/* --- SECTION 3: BADGE WORKSHOP --- */}
        <section className="bg-card backdrop-blur-xl rounded-[2rem] md:rounded-[3rem] border border-border p-6 md:p-10 shadow-2xl relative overflow-hidden group/badges">
          <Award size={160} className="absolute -right-16 -top-16 text-amber-500 opacity-[0.03] group-hover/badges:scale-110 transition-transform duration-1000 pointer-events-none" />
          <h3 className="text-foreground text-lg md:text-xl font-black flex items-center gap-3 mb-10 uppercase tracking-tight relative z-10">
            <Medal size={22} className="text-amber-500" /> Achievement work shop
          </h3>
          <div className="space-y-6 relative z-10">
            {Array.isArray(badgeLibrary) && badgeLibrary.map((badge, index) => (
              <div key={index} className="bg-background border border-border rounded-[2rem] p-6 md:p-8 group/badge relative hover:border-amber-500/30 transition-all shadow-inner">
                <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr_1fr_1.5fr_auto] gap-8 items-center">
                  <div className="flex flex-col items-center gap-3">
                    <div 
                      className="w-20 h-20 rounded-[1.5rem] flex items-center justify-center shadow-2xl transition-all border border-white/10 dark:border-white/5"
                      style={{ backgroundColor: `${badge.color}15`, boxShadow: `0 0 30px ${badge.color}15` }}
                    >
                      {React.cloneElement(availableIcons.find(i => i.name === badge.iconName)?.icon || <Star />, { 
                        size: 36, 
                        color: badge.color,
                        style: { filter: `drop-shadow(0 0 10px ${badge.color}80)` }
                      })}
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-[0.4em] text-slate-400">Node Preview</span>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Badge Codename</label>
                      <input type="text" placeholder="e.g. Master Weaver" value={badge.name} onChange={(e) => updateBadge(index, 'name', e.target.value)} className="w-full bg-card border border-border text-foreground px-4 py-3 rounded-xl outline-none focus:ring-4 focus:ring-amber-500/10 text-xs font-black uppercase tracking-tight" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Threshold (Tokens)</label>
                      <input type="number" value={badge.pointThreshold} onChange={(e) => updateBadge(index, 'pointThreshold', parseInt(e.target.value))} className="w-full bg-card border border-border text-foreground px-4 py-3 rounded-xl outline-none focus:ring-4 focus:ring-amber-500/10 text-xs font-black shadow-sm" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Icon Handshake</label>
                    <div className="grid grid-cols-5 sm:grid-cols-3 gap-2 bg-card p-3 rounded-2xl border border-border shadow-inner">
                      {availableIcons.map(icon => (
                        <button key={icon.name} onClick={() => updateBadge(index, 'iconName', icon.name)} className={`p-2.5 rounded-lg transition-all flex items-center justify-center ${badge.iconName === icon.name ? 'bg-amber-500 text-white dark:text-slate-950 shadow-lg' : 'text-slate-400 hover:text-foreground hover:bg-background'}`}>{icon.icon}</button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Thermal Signatory Color</label>
                    <div className="flex flex-wrap gap-3 bg-card p-3 rounded-2xl border border-border h-[68px] items-center px-5 shadow-inner">
                      {eliteColors.map(color => (
                        <button key={color.hex} onClick={() => updateBadge(index, 'color', color.hex)} className={`w-7 h-7 rounded-full transition-transform hover:scale-125 ${badge.color === color.hex ? 'ring-2 ring-primary ring-offset-4 ring-offset-background shadow-lg' : 'opacity-40 hover:opacity-100'}`} style={{ backgroundColor: color.hex }} />
                      ))}
                    </div>
                  </div>

                  <button onClick={() => removeBadge(index)} className="p-4 text-red-500 hover:bg-red-500/10 rounded-[1.5rem] transition-all active:scale-90 flex items-center justify-center border border-transparent hover:border-red-500/20"><Trash2 size={20} /></button>
                </div>
              </div>
            ))}
            <button onClick={addBadge} className="w-full py-8 border-2 border-dashed border-border rounded-[2.5rem] text-slate-400 hover:text-amber-500 hover:bg-amber-500/5 transition-all flex items-center justify-center gap-4 text-xs font-black uppercase tracking-[0.3em] group active:scale-[0.99]">
              <Plus size={24} className="group-hover:rotate-90 transition-transform duration-500" /> Engineer New Achievement Node
            </button>
          </div>
        </section>
      </div>

      {/* STICKY EXECUTION FOOTER */}
      <div className="mt-12 sticky bottom-6 md:bottom-10 z-[100] px-2">
        <button onClick={saveSettings} disabled={saving} className={`w-full py-6 rounded-[2.5rem] font-black text-xs sm:text-sm uppercase tracking-[0.4em] transition-all duration-500 flex items-center justify-center gap-5 shadow-[0_20px_50px_rgba(0,0,0,0.3)] ${saving ? "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed" : "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white dark:text-slate-950 active:scale-95 cursor-pointer shadow-emerald-500/20"}`}>
            {saving ? <RefreshCcw className="animate-spin" size={24} /> : <Zap size={24} fill="currentColor" />} {saving ? 'TRANSMITTING FACTORY TELEMETRY...' : 'COMMIT GLOBAL UPDATES'}
        </button>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { 
          background: rgba(148, 163, 184, 0.2); 
          border-radius: 20px; 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--color-primary); }
      `}</style>
    </div>
  );
};

export default Settings;