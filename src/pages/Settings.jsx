import React, { useState, useEffect, useCallback } from 'react';
import API from '../api/axiosConfig'; 
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
  ChevronDown,
  X
} from 'lucide-react';

/**
 * SETTINGS: FACILITY FOUNDATION ENGINE v1.3
 * Purpose: Configures global operational parameters, performance logic, and factory identity.
 * Logic: Synchronizes multipart branding data and complex nested JSON for rewards/badges.
 */
const Settings = ({ tenantId }) => {
  // --- STATE PERSISTENCE ---
  const [hours, setHours] = useState({ opening: '09:00', closing: '18:00' });
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

  // --- DATA ACQUISITION: FOUNDATION LOGIC ---
  const fetchSettings = useCallback(async () => {
    if (!currentTenantId) return;
    try {
      setLoading(true);
      const res = await API.get(`/superadmin/settings/${currentTenantId}`);
      const data = res.data?.settings || res.data;
      
      if (data) {
        setHours(data.officeHours || { opening: '09:00', closing: '18:00' });
        setHolidayList(Array.isArray(data.holidays) ? data.holidays : []);
        setBranding({ companyName: data.companyName || '', logoUrl: data.logo || '' });
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
      console.error("Foundation Sync Failure:", err);
    } finally {
      setLoading(false);
    }
  }, [currentTenantId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // --- BADGE WORKSHOP LOGIC ---
  const addBadge = () => {
    setBadgeLibrary(prev => [...prev, { name: '', description: '', pointThreshold: 100, iconName: 'Star', color: '#fbbf24' }]);
  };

  const updateBadge = (index, field, value) => {
    const updated = [...badgeLibrary];
    updated[index][field] = value;
    setBadgeLibrary(updated);
  };

  const removeBadge = (index) => {
    setBadgeLibrary(prev => prev.filter((_, i) => i !== index));
  };

  // --- ENGINE CALCULATION LOGIC ---
  const addBracket = () => {
    setPointSettings(prev => ({
      ...prev,
      brackets: [...prev.brackets, { label: '', maxDurationDays: 1, pointsUnit: 'hour', earlyBonus: 0, latePenalty: 0 }]
    }));
  };

  const updateBracket = (index, field, value) => {
    const updatedBrackets = [...pointSettings.brackets];
    updatedBrackets[index][field] = value;
    setPointSettings(prev => ({ ...prev, brackets: updatedBrackets }));
  };

  const removeBracket = (index) => {
    setPointSettings(prev => ({ ...prev, brackets: prev.brackets.filter((_, i) => i !== index) }));
  };

  // --- BRANDING IDENTIFICATION LOGIC ---
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

      await API.put('/superadmin/update-branding', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      alert("Handshake Complete: Entity identity updated.");
      fetchSettings();
    } catch (err) {
      alert("Update Failed: " + (err.response?.data?.message || err.message));
    } finally {
      setUpdatingBranding(false);
    }
  };

  // --- LOGISTICS & MANIFEST LOGIC ---
  const addHolidayToList = (e) => {
    if (e) e.preventDefault(); 
    if (newHoliday.name && newHoliday.date) {
      setHolidayList((prevList) => {
        if (prevList.some(h => h.date === newHoliday.date)) {
          alert("Conflict Detected: Shutdown already exists on this date.");
          return prevList;
        }
        return [...prevList, { ...newHoliday }];
      });
      setNewHoliday({ name: '', date: '' });
    }
  };

  const removeHoliday = (index) => {
    setHolidayList(prev => prev.filter((_, i) => i !== index));
  };

  // --- GLOBAL DEPLOYMENT COMMAND ---
  const saveSettings = async () => {
    if (saving) return;
    try {
      setSaving(true);
      const response = await API.put('/superadmin/update-settings', {
        tenantId: currentTenantId,
        officeHours: hours,
        holidays: holidayList,
        pointSettings: pointSettings,
        badgeLibrary: badgeLibrary 
      });
      if (response.status === 200) {
        alert("System Synchronized: Facility logic deployed successfully.");
        await fetchSettings();
      }
    } catch (err) {
      alert("Deployment Failure: " + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  // UI SUB-COMPONENT: SECTION HEADER
  const SectionLabel = ({ icon: Icon, text, subtext, color = "text-primary" }) => (
    <div className="flex items-center gap-6 mb-12">
        <div className={`p-4 rounded-2xl bg-background border border-border shadow-inner ${color}`}>
            <Icon size={28} />
        </div>
        <div>
            <h3 className="text-foreground text-2xl font-black uppercase tracking-tighter m-0">{text}</h3>
            <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.3em] mt-2 opacity-70">{subtext}</p>
        </div>
        <div className="h-px flex-1 bg-border/40 ml-6" />
    </div>
  );

  // --- SKELETON LOADING VIEW (Adaptive) ---
  if (loading && holidayList.length === 0) return (
    <div className="flex flex-col items-center justify-center h-[600px] gap-8">
      <div className="relative">
        <RefreshCcw className="animate-spin text-primary" size={64} />
        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
      </div>
      <p className="text-slate-400 dark:text-slate-500 font-black text-[11px] tracking-[0.5em] uppercase text-center">Accessing Foundation Logic...</p>
    </div>
  );

  return (
    <div className="w-full max-w-5xl mx-auto animate-in fade-in duration-1000 pb-40 selection:bg-primary/30">
      
      {/* --- EXECUTIVE HEADER --- */}
      <div className="mb-20 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 px-2">
        <div className="flex items-center gap-6">
          <div className="bg-primary/10 p-5 rounded-[1.8rem] border border-primary/20 shadow-inner">
            <LucideSettings className="text-primary" size={36} />
          </div>
          <div>
            <h2 className="text-foreground text-5xl font-black tracking-tighter m-0 uppercase leading-none">Foundation</h2>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] mt-4 opacity-80">
              Global Operational Parameters & Factory Identity Management
            </p>
          </div>
        </div>
        <div className="bg-card px-8 py-4 rounded-2xl border border-border shadow-xl flex items-center gap-4">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" />
            <span className="text-[10px] font-black text-foreground uppercase tracking-widest leading-none">Root Authorization Active</span>
        </div>
      </div>

      <div className="space-y-16">
        
        {/* SECTION 0: VISUAL IDENTITY */}
        <section className="bg-card backdrop-blur-xl rounded-[4rem] border border-border p-8 md:p-16 shadow-2xl relative overflow-hidden group transition-all duration-500">
           <Building2 size={240} className="absolute -right-20 -top-20 text-primary opacity-5 group-hover:opacity-10 transition-opacity duration-1000 pointer-events-none" />
           <SectionLabel icon={ImageIcon} text="0. Visual Identity" subtext="Corporate Emblem & Authorized Entity Title" />
           
           <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr_auto] gap-10 items-end relative z-10">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em] ml-3 block">Official Entity Name</label>
                <input type="text" value={branding.companyName} onChange={(e) => setBranding({...branding, companyName: e.target.value})} className="w-full bg-background border border-border text-foreground px-8 py-6 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-black uppercase tracking-tight shadow-inner" />
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em] ml-3 block">Identity Emblem</label>
                <div className="flex items-center gap-5">
                  <label className="flex-1 flex items-center justify-center gap-4 cursor-pointer bg-background border border-border hover:border-primary px-6 py-6 rounded-2xl text-primary font-black uppercase tracking-widest text-[11px] transition-all shadow-inner group/upload">
                    <UploadCloud size={20} className="group-hover/upload:scale-110 transition-transform" /> Sync <input type="file" hidden onChange={handleLogoSelect} accept="image/*" />
                  </label>
                  {logoPreview && (
                    <div className="w-[78px] h-[78px] bg-card p-2 rounded-2xl flex items-center justify-center border border-border shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <img src={logoPreview} alt="Handshake Preview" className="max-h-full object-contain brightness-100 dark:brightness-110" />
                    </div>
                  )}
                </div>
              </div>
              <button onClick={saveBranding} disabled={updatingBranding} className="bg-primary hover:bg-sky-400 text-white dark:text-slate-950 px-12 py-6 rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all active:scale-95 disabled:opacity-50 h-[78px] flex items-center justify-center gap-4 shadow-2xl shadow-primary/20">
                {updatingBranding ? <RefreshCcw className="animate-spin" size={20} /> : <CheckCircle2 size={20} />} Commit Identity
              </button>
           </div>
        </section>

        {/* SECTION 1: OPERATIONAL WINDOWS */}
        <section className="bg-card backdrop-blur-xl rounded-[4rem] border border-border p-8 md:p-16 shadow-2xl transition-all duration-500">
          <SectionLabel icon={Clock} text="1. Operational Windows" subtext="Facility Access Protocols & Logic Cycles" color="text-emerald-500" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-4 p-10 bg-background/50 border border-border rounded-[3rem] shadow-inner">
              <label className="text-[10px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-[0.4em] ml-2 block">Daily Opening Sequence</label>
              <input type="time" value={hours.opening} onChange={(e) => setHours(prev => ({...prev, opening: e.target.value}))} className="w-full bg-card border border-border text-foreground px-8 py-5 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 font-black text-2xl shadow-sm" />
            </div>
            <div className="space-y-4 p-10 bg-background/50 border border-border rounded-[3rem] shadow-inner">
              <label className="text-[10px] font-black text-rose-600 dark:text-rose-500 uppercase tracking-[0.4em] ml-2 block">Daily Closing Sequence</label>
              <input type="time" value={hours.closing} onChange={(e) => setHours(prev => ({...prev, closing: e.target.value}))} className="w-full bg-card border border-border text-foreground px-8 py-5 rounded-2xl outline-none focus:ring-4 focus:ring-rose-500/10 font-black text-2xl shadow-sm" />
            </div>
          </div>
        </section>

        {/* SECTION 2: PERFORMANCE ENGINE */}
        <section className="bg-card backdrop-blur-xl rounded-[4rem] border border-border p-8 md:p-16 shadow-2xl relative group/points transition-all duration-500">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-8 mb-16">
            <SectionLabel icon={Trophy} text="2. Performance Engine" subtext="Merit Calculation Matrix & Cycle Penalties" color="text-amber-500" />
            <button onClick={() => setPointSettings(prev => ({ ...prev, isActive: !prev.isActive }))} className={`px-10 py-4 rounded-full text-[11px] font-black uppercase tracking-[0.3em] transition-all shadow-xl ${pointSettings.isActive ? 'bg-emerald-600 text-white shadow-emerald-600/20' : 'bg-background border border-border text-slate-500 opacity-60'}`}>
              Protocol Engine {pointSettings.isActive ? 'Active' : 'Offline'}
            </button>
          </div>
          <div className="space-y-6">
            {Array.isArray(pointSettings.brackets) && pointSettings.brackets.map((bracket, index) => (
              <div key={index} className="bg-background/40 border border-border rounded-[2.5rem] p-8 lg:p-10 relative group/bracket animate-in slide-in-from-top-6 shadow-inner">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.5fr_0.8fr_0.8fr_0.8fr_0.8fr] gap-8 items-end">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest ml-1">Bracket Identity</label>
                    <input type="text" placeholder="e.g. Critical Delta" value={bracket.label} onChange={(e) => updateBracket(index, 'label', e.target.value)} className="w-full bg-card border border-border text-foreground px-6 py-4 rounded-xl outline-none font-black text-xs uppercase shadow-sm" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest ml-1">Span Max</label>
                    <input type="number" value={bracket.maxDurationDays} onChange={(e) => updateBracket(index, 'maxDurationDays', parseInt(e.target.value))} className="w-full bg-card border border-border text-foreground px-6 py-4 rounded-xl outline-none font-black text-sm shadow-sm" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest ml-1">Temporal Unit</label>
                    <select value={bracket.pointsUnit} onChange={(e) => updateBracket(index, 'pointsUnit', e.target.value)} className="w-full bg-card border border-border text-foreground px-6 py-4 rounded-xl outline-none font-black uppercase text-[10px] shadow-sm cursor-pointer">
                      <option value="hour">Hourly Node</option>
                      <option value="day">Daily Node</option>
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest ml-1">Merit (+)</label>
                    <input type="number" value={bracket.earlyBonus} onChange={(e) => updateBracket(index, 'earlyBonus', parseInt(e.target.value))} className="w-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 px-6 py-4 rounded-xl outline-none font-black text-sm shadow-inner" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest ml-1">Penalty (-)</label>
                    <input type="number" value={bracket.latePenalty} onChange={(e) => updateBracket(index, 'latePenalty', parseInt(e.target.value))} className="w-full bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 px-6 py-4 rounded-xl outline-none font-black text-sm shadow-inner" />
                  </div>
                </div>
                <button onClick={() => removeBracket(index)} className="absolute -top-4 -right-4 bg-background text-rose-500 p-3.5 rounded-full border border-border opacity-100 lg:opacity-0 group-hover/bracket:opacity-100 transition-all shadow-2xl hover:bg-rose-600 hover:text-white active:scale-90"><Trash2 size={18} /></button>
              </div>
            ))}
            <button onClick={addBracket} className="group w-full py-8 border-4 border-dashed border-border rounded-[3rem] text-slate-400 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all flex items-center justify-center gap-5 text-[11px] font-black uppercase tracking-[0.4em]"><Plus size={24} className="group-hover:rotate-90 transition-transform duration-500" /> Engineer Logic Bracket</button>
          </div>
        </section>

        {/* SECTION 3: ACHIEVEMENT WORKSHOP */}
        <section className="bg-card backdrop-blur-xl rounded-[4rem] border border-border p-8 md:p-16 shadow-2xl relative overflow-hidden group/badges transition-all duration-500">
          <Award size={240} className="absolute -right-20 -top-20 text-primary opacity-5 group-hover:scale-110 transition-transform duration-1000 pointer-events-none" />
          <SectionLabel icon={Medal} text="3. Achievement Workshop" subtext="Gamification Nodes & Operational Milestones" color="text-primary" />
          
          <div className="grid grid-cols-1 gap-8 relative z-10">
            {Array.isArray(badgeLibrary) && badgeLibrary.map((badge, index) => (
              <div key={index} className="bg-background/60 backdrop-blur-xl border border-border rounded-[3rem] p-8 lg:p-12 group/badge relative hover:border-primary/40 transition-all shadow-xl">
                <div className="grid grid-cols-1 xl:grid-cols-[auto_1.2fr_1fr_1fr_auto] gap-12 items-center">
                  
                  {/* Live Badge Preview */}
                  <div className="flex flex-col items-center gap-5">
                    <div 
                      className="w-24 h-24 rounded-[2.5rem] flex items-center justify-center shadow-2xl transition-all border border-white/20"
                      style={{ backgroundColor: `${badge.color}15`, boxShadow: `0 30px 60px ${badge.color}10` }}
                    >
                      {React.cloneElement(availableIcons.find(i => i.name === badge.iconName)?.icon || <Star />, { 
                        size: 44, color: badge.color, style: { filter: `drop-shadow(0 0 15px ${badge.color}80)` }
                      })}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 opacity-50">Handled Preview</span>
                  </div>
                  
                  <div className="space-y-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest ml-2">Identity Designation</label>
                      <input type="text" placeholder="e.g. Master Weaver" value={badge.name} onChange={(e) => updateBadge(index, 'name', e.target.value)} className="w-full bg-card border border-border text-foreground px-6 py-5 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 transition-all font-black uppercase tracking-tight shadow-sm" />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest ml-2">Threshold Protocol (Pts)</label>
                      <input type="number" value={badge.pointThreshold} onChange={(e) => updateBadge(index, 'pointThreshold', parseInt(e.target.value))} className="w-full bg-card border border-border text-foreground px-6 py-5 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 transition-all font-black text-base shadow-sm" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest ml-2">Emblem Matrix</label>
                    <div className="grid grid-cols-3 gap-3 bg-card p-4 rounded-[1.5rem] border border-border shadow-inner">
                      {availableIcons.map(icon => (
                        <button key={icon.name} onClick={() => updateBadge(index, 'iconName', icon.name)} className={`p-4 rounded-xl transition-all flex items-center justify-center ${badge.iconName === icon.name ? 'bg-primary text-white shadow-2xl' : 'bg-background border border-border text-slate-400 hover:text-primary'}`}>{icon.icon}</button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest ml-2">Chroma Signature</label>
                    <div className="grid grid-cols-5 gap-4 bg-card p-4 rounded-[1.5rem] border border-border h-[82px] items-center px-6 shadow-inner">
                      {eliteColors.map(color => (
                        <button key={color.hex} onClick={() => updateBadge(index, 'color', color.hex)} className={`w-7 h-7 rounded-full transition-all hover:scale-125 hover:rotate-12 ${badge.color === color.hex ? 'ring-4 ring-primary/40 scale-125 shadow-xl' : 'opacity-30'}`} style={{ backgroundColor: color.hex }} />
                      ))}
                    </div>
                  </div>
                  
                  <button onClick={() => removeBadge(index)} className="p-5 text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-all active:scale-90"><Trash2 size={28} /></button>
                </div>
              </div>
            ))}
            <button onClick={addBadge} className="group w-full py-10 border-4 border-dashed border-border rounded-[4rem] text-slate-400 hover:text-emerald-500 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all flex items-center justify-center gap-5 text-[12px] font-black uppercase tracking-[0.4em]"><PlusCircle size={28} className="group-hover:rotate-180 transition-transform duration-700" /> Synthesize New Achievement</button>
          </div>
        </section>

        {/* SECTION 4: OPERATIONAL MANIFEST */}
        <section className="bg-card backdrop-blur-xl rounded-[4rem] border border-border p-8 md:p-16 shadow-2xl transition-all duration-500">
          <SectionLabel icon={Calendar} text="4. Operational Manifest" subtext="Facility Shutdowns & Holiday Logic Protocols" color="text-primary" />
          
          <div className="flex flex-col md:flex-row gap-8 mb-16 bg-background/50 p-8 rounded-[3rem] border border-border shadow-inner">
            <div className="flex-[2] space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Event Title</label>
                <input type="text" placeholder="Designation Name" value={newHoliday.name} onChange={(e) => setNewHoliday(prev => ({...prev, name: e.target.value}))} className="w-full bg-card border border-border text-foreground px-8 py-5 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 transition-all font-black uppercase tracking-tight shadow-sm" />
            </div>
            <div className="flex-[1.5] space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Shutdown Date</label>
                <input type="date" value={newHoliday.date} onChange={(e) => setNewHoliday(prev => ({...prev, date: e.target.value}))} className="w-full bg-card border border-border text-foreground px-8 py-5 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 transition-all font-black text-sm shadow-sm" />
            </div>
            <button onClick={addHolidayToList} className="bg-foreground text-background dark:bg-primary dark:text-slate-950 px-12 rounded-2xl transition-all shadow-2xl active:scale-95 flex items-center justify-center h-[74px] self-end"><PlusCircle size={32} /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {holidayList.map((h, index) => (
              <div key={index} className="flex justify-between items-center px-10 py-6 bg-card border border-border rounded-[2rem] group hover:border-primary/30 transition-all shadow-xl hover:bg-background/40">
                <div className="flex items-center gap-6">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_12px_#38bdf8]" />
                    <div>
                        <span className="font-black text-foreground text-base uppercase tracking-tight">{h.name}</span>
                        <div className="flex items-center gap-3 mt-2">
                            <Clock size={14} className="text-slate-400" />
                            <span className="text-[11px] text-slate-500 font-black font-mono tracking-[0.2em] uppercase">{h.date ? new Date(h.date).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }) : '---'}</span>
                        </div>
                    </div>
                </div>
                <button onClick={() => removeHoliday(index)} className="p-3.5 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all active:scale-90 bg-background rounded-xl border border-border"><Trash2 size={20} /></button>
              </div>
            ))}
            {holidayList.length === 0 && (
                <div className="col-span-full py-24 text-center border-4 border-dashed border-border rounded-[4rem] opacity-20">
                    <Calendar size={64} className="mx-auto mb-6" />
                    <p className="text-[12px] font-black uppercase tracking-[0.6em]">No Facility Shutdowns Recorded</p>
                </div>
            )}
          </div>
        </section>
      </div>

      {/* --- GLOBAL DEPLOYMENT DOCK --- */}
      <div className="mt-20 sticky bottom-10 z-50 px-4">
        <div className="absolute inset-0 bg-background/20 backdrop-blur-xl -m-6 rounded-[4rem] pointer-events-none border border-border/30" />
        <button onClick={saveSettings} disabled={saving} className={`relative w-full py-8 rounded-[2.5rem] font-black text-sm uppercase tracking-[0.5em] transition-all duration-700 flex items-center justify-center gap-6 shadow-[0_30px_60px_rgba(0,0,0,0.1)] dark:shadow-none ${saving ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-border" : "bg-foreground text-background dark:bg-emerald-500 dark:text-slate-950 hover:shadow-[0_20px_50px_rgba(16,185,129,0.3)] active:scale-[0.98] cursor-pointer"}`}>
            {saving ? <RefreshCcw className="animate-spin" size={28} /> : <Zap size={28} fill="currentColor" />} {saving ? 'TRANSMITTING GLOBAL CONFIG...' : 'DEPLOY FACTORY PROTOCOLS'}
        </button>
      </div>

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

export default Settings;