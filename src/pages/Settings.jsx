import React, { useState, useEffect, useCallback } from 'react';
import API from '../api/axiosConfig'; // Centralized API instance
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
  Award
} from 'lucide-react';

const Settings = ({ tenantId }) => {
  // --- EXISTING STATES ---
  const [hours, setHours] = useState({ opening: '09:00', closing: '18:00' });
  const [newHoliday, setNewHoliday] = useState({ name: '', date: '' });
  const [holidayList, setHolidayList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // --- BRANDING STATES ---
  const [branding, setBranding] = useState({ companyName: '', logoUrl: '' });
  const [selectedLogo, setSelectedLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [updatingBranding, setUpdatingBranding] = useState(false);

  // --- POINT SYSTEM STATES ---
  const [pointSettings, setPointSettings] = useState({
    isActive: false,
    brackets: []
  });

  // --- BADGE LIBRARY STATES ---
  const [badgeLibrary, setBadgeLibrary] = useState([]);

  const currentTenantId = tenantId || localStorage.getItem('tenantId');

  // Pre-set Elite Icons for Badge Selection
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
   * 1. FETCH LOGIC
   * Switched to API instance and added defensive unwrap for AWS readiness.
   */
  const fetchSettings = useCallback(async () => {
    if (!currentTenantId) return;
    try {
      setLoading(true);
      // Using API instance instead of raw axios
      const res = await API.get(`/superadmin/settings/${currentTenantId}`);
      
      // Safety: Handle if data is nested or flat
      const data = res.data?.settings || res.data;
      
      if (data) {
        setHours(data.officeHours || { opening: '09:00', closing: '18:00' });
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
      console.error("Error fetching settings:", err);
    } finally {
      setLoading(false);
    }
  }, [currentTenantId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // --- BADGE HANDLERS ---
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

  // --- POINT SYSTEM HANDLERS ---
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

  // --- BRANDING HANDLERS ---
  const handleLogoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedLogo(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  /**
   * UPDATED: saveBranding
   * Removed hardcoded Localhost URL for AWS compatibility.
   */
  const saveBranding = async () => {
    try {
      setUpdatingBranding(true);
      const formData = new FormData();
      formData.append('tenantId', currentTenantId);
      formData.append('companyName', branding.companyName);
      if (selectedLogo) formData.append('logo', selectedLogo);

      // Pointing to relative path via API instance
      await API.put('/superadmin/update-branding', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      alert("Factory Identity Updated!");
      fetchSettings();
    } catch (err) {
      alert("Error updating identity: " + (err.response?.data?.message || err.message));
    } finally {
      setUpdatingBranding(false);
    }
  };

  // --- HOLIDAY/HOUR HANDLERS ---
  const addHolidayToList = (e) => {
    if (e) e.preventDefault(); 
    if (newHoliday.name && newHoliday.date) {
      setHolidayList((prevList) => {
        const exists = prevList.some(h => h.date === newHoliday.date);
        if (exists) {
          alert("A holiday already exists on this date.");
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
   * UPDATED: Global Save Handler
   * Removed hardcoded Localhost URL.
   */
  const saveSettings = async () => {
    if (saving) return;
    try {
      setSaving(true);
      // Using centralized API instance
      const response = await API.put('/superadmin/update-settings', {
        tenantId: currentTenantId,
        officeHours: hours,
        holidays: holidayList,
        pointSettings: pointSettings,
        badgeLibrary: badgeLibrary 
      });
  
      if (response.status === 200) {
        alert("Factory Configuration Updated!");
        await fetchSettings();
      }
    } catch (err) {
      console.error("Save Error:", err);
      alert("Error saving settings: " + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  if (loading && holidayList.length === 0) return (
    <div className="flex flex-col items-center justify-center h-[400px] gap-4">
      <RefreshCcw className="animate-spin text-sky-400" size={40} />
      <span className="text-slate-500 font-black text-[10px] tracking-[0.3em] uppercase leading-none">Accessing Foundation Setup...</span>
    </div>
  );

  return (
    <div className="w-full max-w-4xl mx-auto animate-in fade-in duration-700 pb-20">
      <div className="mb-10 flex items-center gap-4">
        <div className="bg-sky-500/10 p-3 rounded-2xl border border-sky-500/20 shadow-[0_0_20px_rgba(56,189,248,0.1)]">
          <LucideSettings className="text-sky-400" size={32} />
        </div>
        <div>
          <h2 className="text-white text-3xl font-black tracking-tighter">Foundation Setup</h2>
          <p className="text-slate-500 text-sm font-medium mt-1">Configure global operational parameters and factory branding.</p>
        </div>
      </div>

      <div className="space-y-8">
        
        {/* SECTION 0: FACTORY IDENTITY */}
        <section className="bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] border border-slate-800/60 p-8 md:p-10 shadow-2xl relative overflow-hidden group">
           <Building2 size={120} className="absolute -right-10 -top-10 text-sky-500/5 group-hover:scale-110 transition-transform duration-1000" />
           <h3 className="text-white text-xl font-bold flex items-center gap-3 mb-8 relative z-10">
             <ImageIcon size={20} className="text-sky-400" /> 0. Visual Identity
           </h3>
           <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr_auto] gap-8 items-end relative z-10">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Company Name</label>
                <input type="text" value={branding.companyName} onChange={(e) => setBranding({...branding, companyName: e.target.value})} className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-6 py-4 rounded-2xl outline-none focus:border-sky-500/50 transition-all font-bold" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Logo</label>
                <div className="flex items-center gap-4">
                  <label className="flex-1 flex items-center justify-center gap-3 cursor-pointer bg-slate-950 border border-slate-800 hover:border-sky-500/40 px-4 py-4 rounded-2xl text-sky-400 font-black uppercase tracking-widest text-xs">
                    <UploadCloud size={20} /> Upload <input type="file" hidden onChange={handleLogoSelect} accept="image/*" />
                  </label>
                  {logoPreview && <div className="w-[58px] h-[58px] bg-white p-1 rounded-xl flex items-center justify-center border border-slate-800 shadow-xl"><img src={logoPreview} alt="Preview" className="max-h-full object-contain" /></div>}
                </div>
              </div>
              <button onClick={saveBranding} disabled={updatingBranding} className="bg-sky-500 hover:bg-sky-400 text-slate-950 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 h-[58px] flex items-center gap-2">
                {updatingBranding ? <RefreshCcw className="animate-spin" size={16} /> : <CheckCircle2 size={16} />} Apply
              </button>
           </div>
        </section>

        {/* SECTION 1: WORKING HOURS */}
        <section className="bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] border border-slate-800/60 p-8 md:p-10 shadow-2xl">
          <h3 className="text-white text-xl font-bold flex items-center gap-3 mb-8">
            <Clock size={20} className="text-sky-400" /> 1. Operational Hours
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] ml-1">Opening</label>
              <input type="time" value={hours.opening} onChange={(e) => setHours(prev => ({...prev, opening: e.target.value}))} className="w-full bg-slate-950 border border-slate-800 text-white px-6 py-4 rounded-2xl outline-none focus:border-emerald-500/50 font-bold" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-red-400 uppercase tracking-[0.2em] ml-1">Closing</label>
              <input type="time" value={hours.closing} onChange={(e) => setHours(prev => ({...prev, closing: e.target.value}))} className="w-full bg-slate-950 border border-slate-800 text-white px-6 py-4 rounded-2xl outline-none focus:border-red-500/50 font-bold" />
            </div>
          </div>
        </section>

        {/* SECTION 2: PERFORMANCE ENGINE */}
        <section className="bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] border border-slate-800/60 p-8 md:p-10 shadow-2xl relative group/points">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <h3 className="text-white text-xl font-bold flex items-center gap-3">
              <Trophy size={22} className="text-amber-400" /> 2. Performance Engine
            </h3>
            <button onClick={() => setPointSettings(prev => ({ ...prev, isActive: !prev.isActive }))} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${pointSettings.isActive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
              Engine {pointSettings.isActive ? 'Active' : 'Offline'}
            </button>
          </div>
          <div className="space-y-4">
            {Array.isArray(pointSettings.brackets) && pointSettings.brackets.map((bracket, index) => (
              <div key={index} className="bg-slate-950 border border-slate-800 rounded-3xl p-6 relative group/bracket animate-in slide-in-from-top-2">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1.2fr_1fr_1fr] gap-4 items-end">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Bracket Name</label>
                    <input type="text" value={bracket.label} onChange={(e) => updateBracket(index, 'label', e.target.value)} className="w-full bg-slate-900 border border-slate-800 text-white px-4 py-3 rounded-xl outline-none focus:border-sky-500/50 text-xs font-bold" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Max Days</label>
                    <input type="number" value={bracket.maxDurationDays} onChange={(e) => updateBracket(index, 'maxDurationDays', parseInt(e.target.value))} className="w-full bg-slate-900 border border-slate-800 text-white px-4 py-3 rounded-xl outline-none focus:border-sky-500/50 text-xs font-bold" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Unit</label>
                    <select value={bracket.pointsUnit} onChange={(e) => updateBracket(index, 'pointsUnit', e.target.value)} className="w-full bg-slate-900 border border-slate-800 text-white px-4 py-3 rounded-xl outline-none focus:border-sky-500/50 text-xs font-black uppercase">
                      <option value="hour">Hourly</option>
                      <option value="day">Daily</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Bonus (+)</label>
                    <input type="number" value={bracket.earlyBonus} onChange={(e) => updateBracket(index, 'earlyBonus', parseInt(e.target.value))} className="w-full bg-slate-900 border border-slate-800 text-emerald-400 px-4 py-3 rounded-xl outline-none focus:border-emerald-500/50 text-xs font-bold" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-red-500 uppercase tracking-widest">Penalty (-)</label>
                    <input type="number" value={bracket.latePenalty} onChange={(e) => updateBracket(index, 'latePenalty', parseInt(e.target.value))} className="w-full bg-slate-900 border border-slate-800 text-red-400 px-4 py-3 rounded-xl outline-none focus:border-red-500/50 text-xs font-bold" />
                  </div>
                </div>
                <button onClick={() => removeBracket(index)} className="absolute -top-2 -right-2 bg-red-500/10 text-red-400 p-2 rounded-full border border-red-500/20 opacity-0 group-hover/bracket:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"><Trash2 size={14} /></button>
              </div>
            ))}
            <button onClick={addBracket} className="w-full py-4 border-2 border-dashed border-slate-800 rounded-3xl text-slate-500 hover:text-sky-400 hover:bg-sky-500/5 transition-all flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest"><Plus size={16} /> Add Point Bracket</button>
          </div>
        </section>

        {/* --- SECTION 3: BADGE WORKSHOP --- */}
        <section className="bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] border border-slate-800/60 p-8 md:p-10 shadow-2xl relative overflow-hidden group/badges">
          <Award size={120} className="absolute -right-10 -top-10 text-amber-500/5 group-hover/badges:scale-110 transition-transform duration-1000" />
          <h3 className="text-white text-xl font-bold flex items-center gap-3 mb-8 relative z-10">
            <Medal size={20} className="text-amber-400" /> 3. Achievement Workshop
          </h3>
          <div className="space-y-6 relative z-10">
            {Array.isArray(badgeLibrary) && badgeLibrary.map((badge, index) => (
              <div key={index} className="bg-slate-950/80 border border-slate-800 rounded-[2rem] p-6 group/badge relative hover:border-amber-500/20 transition-all">
                <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr_1fr_1fr_auto] gap-6 items-center">
                  <div className="flex flex-col items-center gap-2">
                    <div 
                      className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl transition-all border border-white/10"
                      style={{ backgroundColor: `${badge.color}15`, border: `1px solid ${badge.color}30`, boxShadow: `0 0 20px ${badge.color}15` }}
                    >
                      {React.cloneElement(availableIcons.find(i => i.name === badge.iconName)?.icon || <Star />, { 
                        size: 32, 
                        color: badge.color,
                        style: { filter: `drop-shadow(0 0 8px ${badge.color}60)` }
                      })}
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-600">Preview</span>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Badge Identity</label>
                      <input type="text" placeholder="e.g. Master Weaver" value={badge.name} onChange={(e) => updateBadge(index, 'name', e.target.value)} className="w-full bg-slate-900 border border-slate-800 text-white px-4 py-3 rounded-xl outline-none focus:border-amber-500/50 text-xs font-bold" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Unlock Points</label>
                      <input type="number" value={badge.pointThreshold} onChange={(e) => updateBadge(index, 'pointThreshold', parseInt(e.target.value))} className="w-full bg-slate-900 border border-slate-800 text-white px-4 py-3 rounded-xl outline-none focus:border-amber-500/50 text-xs font-bold" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Choose Icon</label>
                    <div className="grid grid-cols-5 gap-2 bg-slate-900 p-2 rounded-xl border border-slate-800">
                      {availableIcons.map(icon => (
                        <button key={icon.name} onClick={() => updateBadge(index, 'iconName', icon.name)} className={`p-2 rounded-lg transition-all flex items-center justify-center ${badge.iconName === icon.name ? 'bg-amber-500 text-slate-950' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}>{icon.icon}</button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Signatory Color</label>
                    <div className="flex gap-2 bg-slate-900 p-2 rounded-xl border border-slate-800 h-[52px] items-center px-4">
                      {eliteColors.map(color => (
                        <button key={color.hex} onClick={() => updateBadge(index, 'color', color.hex)} className={`w-6 h-6 rounded-full transition-transform hover:scale-125 ${badge.color === color.hex ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900' : ''}`} style={{ backgroundColor: color.hex }} />
                      ))}
                    </div>
                  </div>
                  <button onClick={() => removeBadge(index)} className="p-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"><Trash2 size={18} /></button>
                </div>
              </div>
            ))}
            <button onClick={addBadge} className="w-full py-6 border-2 border-dashed border-slate-800 rounded-[2rem] text-slate-500 hover:text-amber-400 hover:bg-amber-500/5 transition-all flex items-center justify-center gap-3 text-xs font-black uppercase tracking-[0.2em] group">
              <Plus size={20} className="group-hover:rotate-90 transition-transform" /> Create New Achievement
            </button>
          </div>
        </section>

        {/* SECTION 4: HOLIDAY CALENDAR */}
        <section className="bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] border border-slate-800/60 p-8 md:p-10 shadow-2xl">
          <h3 className="text-white text-xl font-bold flex items-center gap-3 mb-8"><Calendar size={20} className="text-sky-400" /> 4. Holiday Manifest</h3>
          <div className="flex flex-col md:flex-row gap-4 mb-10">
            <input type="text" placeholder="Holiday Name" value={newHoliday.name} onChange={(e) => setNewHoliday(prev => ({...prev, name: e.target.value}))} className="flex-[2] bg-slate-950 border border-slate-800 text-white px-6 py-4 rounded-2xl outline-none focus:border-sky-500/50 font-bold" />
            <input type="date" value={newHoliday.date} onChange={(e) => setNewHoliday(prev => ({...prev, date: e.target.value}))} className="flex-[1.5] bg-slate-950 border border-slate-800 text-white px-6 py-4 rounded-2xl outline-none focus:border-sky-500/50 font-bold" />
            <button onClick={addHolidayToList} className="bg-sky-500 hover:bg-sky-400 text-slate-950 px-6 rounded-2xl transition-all shadow-lg flex items-center justify-center"><PlusCircle size={24} /></button>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {Array.isArray(holidayList) && holidayList.map((h, index) => (
              <div key={index} className="flex justify-between items-center px-6 py-4 bg-slate-950 border border-slate-800/50 rounded-2xl group hover:border-sky-500/20 transition-all">
                <div className="flex items-center gap-4"><div className="w-1.5 h-1.5 rounded-full bg-sky-500" /><div><span className="font-bold text-slate-100">{h.name}</span><span className="text-[10px] text-slate-600 uppercase ml-4">{h.date ? new Date(h.date).toLocaleDateString() : 'N/A'}</span></div></div>
                <button onClick={() => removeHoliday(index)} className="p-2 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={18} /></button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-12 sticky bottom-10 z-50">
        <button onClick={saveSettings} disabled={saving} className={`w-full py-6 rounded-[2rem] font-black text-sm uppercase tracking-[0.3em] transition-all duration-300 flex items-center justify-center gap-4 shadow-2xl ${saving ? "bg-slate-800 text-slate-500 cursor-not-allowed" : "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 active:scale-95 cursor-pointer"}`}>
            {saving ? <RefreshCcw className="animate-spin" size={22} /> : <Zap size={22} fill="currentColor" />} {saving ? 'Transmitting Factory Update...' : 'Deploy Factory Configuration'}
        </button>
      </div>
    </div>
  );
};

export default Settings;