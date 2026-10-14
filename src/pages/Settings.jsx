import React, { useState, useEffect, useCallback } from 'react';
import API from '../api/axiosConfig'; // Centralized API instance
import AccessRolesPanel from '../components/AccessRolesPanel';
import { dialog } from '../components/Dialog';
import { 
  FiUser, FiShield, FiPlus, FiX, FiSave, FiTrash2, FiSettings, FiCheckCircle, FiRefreshCw 
} from "react-icons/fi";
import ResponsiveTable from '../components/ResponsiveTable';
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

  // Company masters (dropdown lists for Add Employee)
  const [sectorList, setSectorList] = useState([]);
  const [locationList, setLocationList] = useState([]);
  const [newSector, setNewSector] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [mastersLoaded, setMastersLoaded] = useState(false); // only save the lists once they were read

  // Review Meeting settings (period, weightage, colour limits). Everything here is optional.
  const [reviewCfg, setReviewCfg] = useState({
    period: 'Monthly',
    weights: { delegation: '1', checklist: '1', fms: '1' },
    overrides: [],
    thresholds: { red: '20', orange: '10' },
    driftBands: { greenMax: '10', yellowMax: '50', orangeMax: '100' }
  });
  const [reviewLoaded, setReviewLoaded] = useState(false);
  const [newRule, setNewRule] = useState({ location: '', department: '', delegation: '1', checklist: '1', fms: '1' });

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
      const res = await API.get(`/tasks/settings/${currentTenantId}`);
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
        setSectorList(Array.isArray(data.sectors) ? data.sectors : []);
        setLocationList(Array.isArray(data.locations) ? data.locations : []);
        setMastersLoaded(true);
        {
          const rc = data.reviewConfig || {};
          const w = rc.weights || {};
          const str = (v, d) => (v === undefined || v === null ? d : String(v));
          setReviewCfg({
            period: rc.period || 'Monthly',
            weights: { delegation: str(w.delegation, '1'), checklist: str(w.checklist, '1'), fms: str(w.fms, '1') },
            overrides: (Array.isArray(rc.overrides) ? rc.overrides : []).map((o) => ({
              location: o.location || '', department: o.department || '',
              delegation: str(o.delegation, '1'), checklist: str(o.checklist, '1'), fms: str(o.fms, '1')
            })),
            thresholds: { red: str(rc.thresholds && rc.thresholds.red, '20'), orange: str(rc.thresholds && rc.thresholds.orange, '10') },
            driftBands: { greenMax: str(rc.driftBands && rc.driftBands.greenMax, '10'), yellowMax: str(rc.driftBands && rc.driftBands.yellowMax, '50'), orangeMax: str(rc.driftBands && rc.driftBands.orangeMax, '100') }
          });
          setReviewLoaded(true);
        }
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

      await API.put('/tasks/update-branding', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      fetchSettings();
      await dialog.alert('Company name and logo updated.', { tone: 'success' });
      window.location.reload();
    } catch (err) {
      await dialog.alert(err.response?.data?.message || err.message, { tone: 'error', title: 'Could not update' });
    } finally {
      setUpdatingBranding(false);
    }
  };

  const addHolidayToList = (e) => {
    if (e) e.preventDefault(); 
    if (!newHoliday.name || !newHoliday.date) {
      dialog.alert('Please enter the holiday name and pick its date.', { tone: 'error' });
      return;
    }
    if (holidayList.some(h => h.date === newHoliday.date)) {
      dialog.alert('A holiday is already scheduled on this date.', { tone: 'error' });
      return;
    }
    setHolidayList((prevList) => [...prevList, { ...newHoliday }]);
    setNewHoliday({ name: '', date: '' });
  };

  const removeHoliday = (index) => {
    setHolidayList((prevList) => prevList.filter((_, i) => i !== index));
  };

  /**
   * 3. PERSISTENCE LOGIC
   */
  const addMaster = (kind) => {
    const isSector = kind === 'sector';
    const raw = (isSector ? newSector : newLocation).replace(/\s+/g, ' ').trim();
    const clear = () => (isSector ? setNewSector('') : setNewLocation(''));
    if (!raw) return;
    if (raw.length > 60) { dialog.alert('Please keep the name under 60 characters.', { tone: 'error' }); return; }
    const list = isSector ? sectorList : locationList;
    if (!list.some((x) => x.toLowerCase() === raw.toLowerCase())) {
      (isSector ? setSectorList : setLocationList)([...list, raw]);
    }
    clear();
  };
  const removeMaster = (kind, name) => {
    (kind === 'sector' ? setSectorList : setLocationList)((prev) => prev.filter((x) => x !== name));
  };

  const REVIEW_PERIOD_OPTIONS = [
    ['Daily', 'Daily'], ['Weekly', 'Weekly (Mon - Sun)'], ['TwiceMonthly', 'Twice a month (1st-15th and 16th-end)'],
    ['Monthly', 'Monthly'], ['Quarterly', 'Quarterly']
  ];
  const updateRule = (i, key, val) => setReviewCfg((p) => ({ ...p, overrides: p.overrides.map((o, idx) => (idx === i ? { ...o, [key]: val } : o)) }));
  const removeRule = (i) => setReviewCfg((p) => ({ ...p, overrides: p.overrides.filter((_, idx) => idx !== i) }));
  const addRule = () => {
    if (!newRule.location && !newRule.department) { dialog.alert('Pick a location, a department, or both for the rule.', { tone: 'error' }); return; }
    const same = reviewCfg.overrides.some((o) => o.location.toLowerCase() === newRule.location.toLowerCase() && o.department.toLowerCase() === newRule.department.toLowerCase());
    if (same) { dialog.alert('There is already a rule for this location and department.', { tone: 'error' }); return; }
    setReviewCfg((p) => ({ ...p, overrides: [...p.overrides, { ...newRule }] }));
    setNewRule({ location: '', department: '', delegation: '1', checklist: '1', fms: '1' });
  };
  // Returns { payload } or { error }
  const buildReviewPayload = () => {
    const num = (v) => (String(v).trim() === '' ? NaN : Number(v));
    const okW = (o) => {
      const w = { delegation: num(o.delegation), checklist: num(o.checklist), fms: num(o.fms) };
      if (![w.delegation, w.checklist, w.fms].every((x) => Number.isFinite(x) && x >= 0 && x <= 1000)) return null;
      if (w.delegation + w.checklist + w.fms <= 0) return null;
      return w;
    };
    const base = okW(reviewCfg.weights);
    if (!base) return { error: 'Review Meeting: weightage must be numbers from 0 to 1000 and at least one above 0.' };
    const overrides = [];
    for (const o of reviewCfg.overrides) {
      const w = okW(o);
      if (!w) return { error: 'Review Meeting: every weightage rule needs numbers from 0 to 1000 with at least one above 0.' };
      overrides.push({ location: o.location, department: o.department, ...w });
    }
    const red = num(reviewCfg.thresholds.red); const orange = num(reviewCfg.thresholds.orange);
    if (![red, orange].every((x) => Number.isFinite(x) && x >= 0 && x <= 100)) return { error: 'Review Meeting: colour limits must be numbers from 0 to 100.' };
    if (orange > red) return { error: 'Review Meeting: the orange limit cannot be higher than the red limit.' };
    const dg = num(reviewCfg.driftBands.greenMax); const dy = num(reviewCfg.driftBands.yellowMax); const dor = num(reviewCfg.driftBands.orangeMax);
    if (![dg, dy, dor].every((x) => Number.isInteger(x) && x >= 0 && x <= 100000)) return { error: 'Review Meeting: Drift day limits must be whole numbers of days.' };
    if (!(dg < dy && dy < dor)) return { error: 'Review Meeting: Drift limits must go up (green end < yellow end < orange end).' };
    return { payload: { period: reviewCfg.period, weights: base, overrides, thresholds: { red, orange }, driftBands: { greenMax: dg, yellowMax: dy, orangeMax: dor } } };
  };

  const saveSettings = async () => {
    if (saving) return;
    let reviewPayload = null;
    if (reviewLoaded) {
      const rv = buildReviewPayload();
      if (rv.error) { await dialog.alert(rv.error, { tone: 'error' }); return; }
      reviewPayload = rv.payload;
    }
    try {
      setSaving(true);
      // SENDING WEEKENDS ARRAY TO SERVER
      const response = await API.put('/tasks/update-settings', {
        tenantId: currentTenantId,
        officeHours: hours,
        weekends: weekends, 
        holidays: holidayList,
        pointSettings: pointSettings,
        badgeLibrary: badgeLibrary,
        ...(mastersLoaded ? { sectors: sectorList, locations: locationList } : {}),
        ...(reviewPayload ? { reviewConfig: reviewPayload } : {})
      });
  
      if (response.status === 200) {
        await fetchSettings();
        await dialog.alert('Settings saved.', { tone: 'success' });
      }
    } catch (err) {
      await dialog.alert(err.response?.data?.message || err.message, { tone: 'error', title: 'Could not save' });
    } finally {
      setSaving(false);
    }
  };

  // ---- Navigation: pick a category, or search. Every section stays mounted (only hidden), so
  // "Commit global updates" still saves everything on the page.
  const SETTINGS_CATS = [['company', 'Company'], ['time', 'Working time'], ['performance', 'Performance and rewards'], ['access', 'Roles and access']];
  const SETTINGS_SECTIONS = [
    { id: 'identity', cat: 'company', title: 'Company name and logo', keywords: 'brand logo name organisation identity' },
    { id: 'masters', cat: 'company', title: 'Departments and locations', keywords: 'sector department location branch' },
    { id: 'weekend', cat: 'time', title: 'Weekly off', keywords: 'weekend weekly saturday sunday off days' },
    { id: 'hours', cat: 'time', title: 'Operational hours', keywords: 'opening closing office timing working hours attendance late' },
    { id: 'holiday', cat: 'time', title: 'Holidays', keywords: 'holiday calendar festival leave' },
    { id: 'review', cat: 'performance', title: 'Review meeting', keywords: 'period weightage colour score limits' },
    { id: 'perf', cat: 'performance', title: 'Performance engine', keywords: 'points score rewards' },
    { id: 'badges', cat: 'performance', title: 'Achievements', keywords: 'badge medal award workshop' },
    { id: 'access', cat: 'access', title: 'Roles and access', keywords: 'role permission admin attendance leave payroll custom' }
  ];
  const [settingsCat, setSettingsCat] = useState('company');
  const [settingsQuery, setSettingsQuery] = useState('');
  const queryWords = settingsQuery.toLowerCase().split(/\s+/).filter(Boolean);
  const searching = queryWords.length > 0;
  const showSection = (id) => {
    const s = SETTINGS_SECTIONS.find((x) => x.id === id);
    if (!searching) return s.cat === settingsCat;
    const hay = (s.title + ' ' + s.keywords).toLowerCase();
    return queryWords.every((w) => hay.includes(w));
  };
  const anySectionShown = SETTINGS_SECTIONS.some((s) => showSection(s.id));

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
      <div className="mb-4 flex items-center gap-3">
        <div className="bg-primary/10 w-10 h-10 flex items-center justify-center rounded-xl border border-primary/20 shrink-0">
          <LucideSettings className="text-primary" size={22} />
        </div>
        <div className="min-w-0">
          <h2 className="text-foreground text-xl font-black tracking-tight uppercase leading-none">Organisation Setup</h2>
          <p className="text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wide mt-1.5 opacity-80">Configure global task management parameters &amp; company branding.</p>
        </div>
      </div>

      <div className="mb-4 space-y-4">
        <input aria-label="Search settings" type="search" placeholder="Search settings (for example holiday, logo, roles)" value={settingsQuery} onChange={(e) => setSettingsQuery(e.target.value)} className="w-full bg-card border border-border text-foreground px-6 py-4 rounded-2xl text-sm font-bold outline-none focus:border-primary" />
        {!searching && (
          <div role="tablist" aria-label="Settings categories" className="flex flex-wrap gap-2">
            {SETTINGS_CATS.map(([id, text]) => (
              <button key={id} type="button" role="tab" aria-selected={settingsCat === id} onClick={() => setSettingsCat(id)} className={'px-5 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest border ' + (settingsCat === id ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border')}>
                {text} <span className="opacity-60">({SETTINGS_SECTIONS.filter((s) => s.cat === id).length})</span>
              </button>
            ))}
          </div>
        )}
        {searching && <p role="status" className="text-xs font-bold text-muted-foreground">{anySectionShown ? 'Showing settings that match "' + settingsQuery.trim() + '". Clear the search to go back to the categories.' : 'No settings match "' + settingsQuery.trim() + '". Try another word.'}</p>}
      </div>

      <div className="space-y-4">
        
        {/* SECTION 0: FACTORY IDENTITY */}
        <div data-settings-section="identity" hidden={!showSection('identity')}>
        <section className="bg-card backdrop-blur-xl rounded-2xl border border-border p-5 md:p-6 shadow-sm relative overflow-hidden group">
           <Building2 size={160} className="absolute -right-12 -top-12 text-primary opacity-[0.03] group-hover:scale-110 transition-transform duration-1000 pointer-events-none" />
           <h3 className="text-foreground text-base font-black flex items-center gap-2.5 mb-4 relative z-10 uppercase tracking-tight">
             <ImageIcon size={22} className="text-primary" /> Update company name & logo
           </h3>
           <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr_auto] gap-8 items-end relative z-10">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Company Name</label>
                <input type="text" value={branding.companyName} onChange={(e) => setBranding({...branding, companyName: e.target.value})} className="w-full bg-background border border-border text-foreground px-4 py-2.5 rounded-xl outline-none focus:ring-4 focus:ring-primary/10 transition-all font-black text-sm uppercase shadow-inner" />
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
              <button onClick={saveBranding} disabled={updatingBranding} className="w-full lg:w-auto bg-primary hover:opacity-90 text-white dark:text-slate-950 px-6 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-[0.2em] shadow-md shadow-primary/20 transition-all active:scale-95 disabled:opacity-50 h-[44px] flex items-center justify-center gap-3">
                {updatingBranding ? <RefreshCcw className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}  Apply
              </button>
           </div>
        </section>
        </div>

        {/* --- SECTION: WEEKEND CONFIGURATION --- */}
        <div data-settings-section="weekend" hidden={!showSection('weekend')}>
        <section className="bg-card backdrop-blur-xl rounded-2xl border border-border p-5 md:p-6 shadow-sm">
          <h3 className="text-foreground text-base font-black flex items-center gap-2.5 mb-4 uppercase tracking-tight">
            <Coffee size={22} className="text-primary" /> Weekend Configuration
          </h3>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mb-4 ml-1">Assign recurring non-working days. Systems will skip these when generating work directives.</p>
          
          <div className="flex flex-wrap gap-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleWeekend(i)}
                className={`w-16 h-16 rounded-xl font-black text-xs uppercase transition-all flex flex-col items-center justify-center border-2 gap-1.5 ${
                  weekends.includes(i)
                    ? 'bg-red-500 border-red-500 text-white shadow-md'
                    : 'bg-background border-border text-slate-400 hover:border-red-500/50'
                }`}
              >
                {day}
                {weekends.includes(i) ? <FiX size={14}/> : <FiPlus size={14}/>}
              </button>
            ))}
          </div>
        </section>
        </div>

        {/* SECTION: SECTORS / DEPARTMENTS & LOCATIONS (masters used by Add Employee) */}
        <div data-settings-section="masters" hidden={!showSection('masters')}>
        <section className="bg-card backdrop-blur-xl rounded-2xl border border-border p-5 md:p-6 shadow-sm">
          <h3 className="text-foreground text-base font-black flex items-center gap-2.5 mb-4 uppercase tracking-tight">
            <Building2 size={22} className="text-primary" /> Sectors / Departments &amp; Locations
          </h3>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mb-4 ml-1">These lists become the dropdowns in Add Employee and the filters when mapping people. Click "Commit Global Updates" below to save.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {[
              { kind: 'sector', title: 'Sector / Department', list: sectorList, value: newSector, setValue: setNewSector, ph: 'e.g. Operations' },
              { kind: 'location', title: 'Location', list: locationList, value: newLocation, setValue: setNewLocation, ph: 'e.g. Pune Plant' },
            ].map((m) => (
              <div key={m.kind} className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">{m.title}</label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={m.value}
                    placeholder={m.ph}
                    maxLength={60}
                    onChange={(e) => m.setValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addMaster(m.kind); } }}
                    className="flex-1 min-w-0 bg-background border border-border text-foreground px-5 py-3 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold text-sm shadow-inner"
                  />
                  <button type="button" onClick={() => addMaster(m.kind)} className="px-5 py-3 rounded-2xl bg-primary text-white font-black text-[10px] uppercase tracking-widest shadow-md active:scale-95 flex items-center gap-2"><FiPlus size={14} /> Add</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {m.list.length === 0 && <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest ml-2">None added yet</span>}
                  {m.list.map((name) => (
                    <span key={name} className="inline-flex items-center gap-2 pl-4 pr-2 py-2 rounded-full bg-background border border-border text-xs font-black text-foreground">
                      {name}
                      <button type="button" onClick={() => removeMaster(m.kind, name)} className="p-1 rounded-full text-red-500 hover:bg-red-500/10" title={`Remove ${name}`}><FiX size={12} /></button>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-8 ml-1">Removing a name here does not change employees who already have it.</p>
        </section>
        </div>

        {/* SECTION: REVIEW MEETING (period, weightage, colour limits) */}
        <div data-settings-section="review" hidden={!showSection('review')}>
        <section className="bg-card backdrop-blur-xl rounded-2xl border border-border p-5 md:p-6 shadow-sm">
          <h3 className="text-foreground text-base font-black flex items-center gap-2.5 mb-4 uppercase tracking-tight">
            <Target size={22} className="text-primary" /> Review Meeting
          </h3>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mb-4 ml-1">All of this is optional. If you change nothing: monthly review, all task types count equally, red from 20% and orange from 10%. Click "Commit Global Updates" below to save.</p>

          <div className="space-y-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Review period (for the whole company)</label>
              <select value={reviewCfg.period} onChange={(e) => setReviewCfg((p) => ({ ...p, period: e.target.value }))} className="w-full md:w-96 bg-background border border-border text-foreground px-3 py-2 rounded-xl outline-none focus:ring-4 focus:ring-primary/10 font-bold text-sm shadow-inner">
                {REVIEW_PERIOD_OPTIONS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Weightage of each task type (default for everyone)</label>
              <div className="grid grid-cols-3 gap-3 max-w-xl">
                {[['delegation', 'Delegation'], ['checklist', 'Checklist'], ['fms', 'FMS']].map(([k, label]) => (
                  <div key={k}>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
                    <input type="number" min="0" max="1000" step="any" value={reviewCfg.weights[k]} onChange={(e) => setReviewCfg((p) => ({ ...p, weights: { ...p.weights, [k]: e.target.value } }))} className="w-full bg-background border border-border text-foreground px-3 py-2 rounded-xl outline-none focus:ring-4 focus:ring-primary/10 font-bold text-sm shadow-inner" />
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest ml-2">The three percentages are blended into one score using these weights. A type with no tasks for a person in the period is left out.</p>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Different weightage for a location / department (optional)</label>
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Location</span>
                  <select value={newRule.location} onChange={(e) => setNewRule((p) => ({ ...p, location: e.target.value }))} className="bg-background border border-border text-foreground px-3 py-2 rounded-xl outline-none focus:ring-4 focus:ring-primary/10 font-bold text-sm shadow-inner">
                    <option value="">All locations</option>
                    {locationList.map((x) => <option key={x} value={x}>{x}</option>)}
                  </select>
                </div>
                <div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Department</span>
                  <select value={newRule.department} onChange={(e) => setNewRule((p) => ({ ...p, department: e.target.value }))} className="bg-background border border-border text-foreground px-3 py-2 rounded-xl outline-none focus:ring-4 focus:ring-primary/10 font-bold text-sm shadow-inner">
                    <option value="">All departments</option>
                    {sectorList.map((x) => <option key={x} value={x}>{x}</option>)}
                  </select>
                </div>
                {[['delegation', 'Del'], ['checklist', 'Chk'], ['fms', 'FMS']].map(([k, label]) => (
                  <div key={k}>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">{label}</span>
                    <input type="number" min="0" max="1000" step="any" value={newRule[k]} onChange={(e) => setNewRule((p) => ({ ...p, [k]: e.target.value }))} className="w-20 bg-background border border-border text-foreground px-3 py-2 rounded-xl outline-none focus:ring-4 focus:ring-primary/10 font-bold text-sm shadow-inner" />
                  </div>
                ))}
                <button type="button" onClick={addRule} className="px-5 py-2.5 rounded-xl bg-primary text-white font-black text-[10px] uppercase tracking-widest shadow-md active:scale-95 flex items-center gap-2"><FiPlus size={14} /> Add rule</button>
              </div>
              {reviewCfg.overrides.length > 0 && (
                <div className="overflow-x-auto rounded-2xl border border-border">
                  <ResponsiveTable>
                  <table className="mobile-card-table w-full text-left text-sm">
                    <thead className="bg-background"><tr className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                      <th className="px-4 py-2">Location</th><th className="px-4 py-2">Department</th><th className="px-4 py-2">Delegation</th><th className="px-4 py-2">Checklist</th><th className="px-4 py-2">FMS</th><th className="px-4 py-2" />
                    </tr></thead>
                    <tbody>
                      {reviewCfg.overrides.map((o, i) => (
                        <tr key={i} className="border-t border-border">
                          <td className="px-4 py-2 font-bold">{o.location || 'All locations'}</td>
                          <td className="px-4 py-2 font-bold">{o.department || 'All departments'}</td>
                          {['delegation', 'checklist', 'fms'].map((k) => (
                            <td key={k} className="px-4 py-2"><input type="number" min="0" max="1000" step="any" value={o[k]} onChange={(e) => updateRule(i, k, e.target.value)} className="w-20 bg-background border border-border text-foreground px-3 py-2 rounded-xl outline-none focus:ring-4 focus:ring-primary/10 font-bold text-sm shadow-inner" /></td>
                          ))}
                          <td className="px-4 py-2 text-right"><button type="button" onClick={() => removeRule(i)} className="p-1.5 rounded-full text-red-500 hover:bg-red-500/10" title="Remove rule"><FiX size={14} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </ResponsiveTable>
                </div>
              )}
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest ml-2">A person gets the most specific matching rule: location + department, then location only, then department only, then the default above. People with no location only match "All locations" rules.</p>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Colours for Late % and Not Done %</label>
              <div className="grid grid-cols-2 gap-3 max-w-md">
                <div>
                  <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">Red from (%)</span>
                  <input type="number" min="0" max="100" step="any" value={reviewCfg.thresholds.red} onChange={(e) => setReviewCfg((p) => ({ ...p, thresholds: { ...p.thresholds, red: e.target.value } }))} className="w-full bg-background border border-border text-foreground px-3 py-2 rounded-xl outline-none focus:ring-4 focus:ring-primary/10 font-bold text-sm shadow-inner" />
                </div>
                <div>
                  <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest">Orange from (%)</span>
                  <input type="number" min="0" max="100" step="any" value={reviewCfg.thresholds.orange} onChange={(e) => setReviewCfg((p) => ({ ...p, thresholds: { ...p.thresholds, orange: e.target.value } }))} className="w-full bg-background border border-border text-foreground px-3 py-2 rounded-xl outline-none focus:ring-4 focus:ring-primary/10 font-bold text-sm shadow-inner" />
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest ml-2">At or above the red limit = red, at or above the orange limit = orange, below that = green.</p>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Drift colours (days late / overdue)</label>
              <div className="grid grid-cols-3 gap-3 max-w-xl">
                {[['greenMax', 'Green up to (days)', 'text-emerald-600'], ['yellowMax', 'Yellow up to (days)', 'text-yellow-600'], ['orangeMax', 'Orange up to (days)', 'text-orange-500']].map(([k, lab, col]) => (
                  <div key={k}>
                    <span className={`text-[9px] font-black uppercase tracking-widest ${col}`}>{lab}</span>
                    <input type="number" min="0" step="1" value={reviewCfg.driftBands[k]} onChange={(e) => setReviewCfg((p) => ({ ...p, driftBands: { ...p.driftBands, [k]: e.target.value } }))} className="w-full bg-background border border-border text-foreground px-3 py-2 rounded-xl outline-none focus:ring-4 focus:ring-primary/10 font-bold text-sm shadow-inner" />
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest ml-2">Example 10 / 50 / 100: 0-10 days green, 11-50 yellow, 51-100 orange, more than 100 red. Shown in the Drift column of the audit sheet.</p>
            </div>
          </div>
        </section>
        </div>

        {/* SECTION 1: WORKING HOURS */}
        <div data-settings-section="hours" hidden={!showSection('hours')}>
        <section className="bg-card backdrop-blur-xl rounded-2xl border border-border p-5 md:p-6 shadow-sm">
          <h3 className="text-foreground text-base font-black flex items-center gap-2.5 mb-4 uppercase tracking-tight">
            <Clock size={22} className="text-primary" /> Operational Hours
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-[0.3em] ml-2">Opening</label>
              <input type="time" value={hours.opening} onChange={(e) => setHours(prev => ({...prev, opening: e.target.value}))} className="w-full bg-background border border-border text-foreground px-4 py-2.5 rounded-xl outline-none focus:ring-4 focus:ring-primary/10 font-black text-sm shadow-inner" />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-red-600 dark:text-red-500 uppercase tracking-[0.3em] ml-2">Closing</label>
              <input type="time" value={hours.closing} onChange={(e) => setHours(prev => ({...prev, closing: e.target.value}))} className="w-full bg-background border border-border text-foreground px-4 py-2.5 rounded-xl outline-none focus:ring-4 focus:ring-primary/10 font-black text-sm shadow-inner" />
            </div>
          </div>
        </section>
        </div>

        {/* SECTION 4: HOLIDAY CALENDAR */}
        <div data-settings-section="holiday" hidden={!showSection('holiday')}>
        <section className="bg-card backdrop-blur-xl rounded-2xl border border-border p-5 md:p-6 shadow-sm">
          <h3 className="text-foreground text-base font-black flex items-center gap-2.5 mb-4 uppercase tracking-tight">
            <Calendar size={22} className="text-primary" /> Holiday
          </h3>
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <input type="text" placeholder="Holiday Name" value={newHoliday.name} onChange={(e) => setNewHoliday(prev => ({...prev, name: e.target.value}))} className="flex-[2] bg-background border border-border text-foreground px-4 py-2.5 rounded-xl outline-none focus:ring-4 focus:ring-primary/10 font-black text-sm uppercase shadow-inner" />
            <input type="date" value={newHoliday.date} onChange={(e) => setNewHoliday(prev => ({...prev, date: e.target.value}))} className="flex-[1.5] bg-background border border-border text-foreground px-4 py-2.5 rounded-xl outline-none focus:ring-4 focus:ring-primary/10 font-black text-sm shadow-inner" />
            <button onClick={addHolidayToList} className="bg-primary hover:opacity-90 text-white dark:text-slate-950 px-6 py-2.5 md:py-0 rounded-xl transition-all shadow-md shadow-primary/20 flex items-center justify-center active:scale-95"><PlusCircle size={24} /></button>
          </div>
          <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {Array.isArray(holidayList) && holidayList.map((h, index) => (
              <div key={index} className="flex justify-between items-center px-4 py-2.5 bg-background border border-border rounded-xl group hover:border-primary/30 transition-all shadow-sm">
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
        </div>

        {/* SECTION 2: PERFORMANCE ENGINE */}
        <div data-settings-section="perf" hidden={!showSection('perf')}>
        <section className="bg-card backdrop-blur-xl rounded-2xl border border-border p-5 md:p-6 shadow-sm relative group/points">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <h3 className="text-foreground text-lg md:text-xl font-black flex items-center gap-3 uppercase tracking-tight">
              <Trophy size={22} className="text-amber-500" /> Performance Engine
            </h3>
            <button onClick={() => setPointSettings(prev => ({ ...prev, isActive: !prev.isActive }))} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-sm ${pointSettings.isActive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border border-emerald-500/30' : 'bg-background text-slate-500 border border-border'}`}>
            Engine {pointSettings.isActive ? 'Online' : 'Offline'}
            </button>
          </div>
          <div className="space-y-4">
            {Array.isArray(pointSettings.brackets) && pointSettings.brackets.map((bracket, index) => (
              <div key={index} className="bg-background border border-border rounded-2xl p-4 md:p-5 relative group/bracket animate-in slide-in-from-top-4 shadow-inner">
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
            <button onClick={addBracket} className="w-full py-3 border-2 border-dashed border-border rounded-2xl text-slate-400 hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-3 text-xs font-black uppercase tracking-[0.3em] active:scale-[0.99]"><Plus size={18} /> Append Point Bracket</button>
          </div>
        </section>
        </div>

        {/* --- SECTION 3: BADGE WORKSHOP --- */}
        <div data-settings-section="badges" hidden={!showSection('badges')}>
        <section className="bg-card backdrop-blur-xl rounded-2xl border border-border p-5 md:p-6 shadow-sm relative overflow-hidden group/badges">
          <Award size={160} className="absolute -right-16 -top-16 text-amber-500 opacity-[0.03] group-hover/badges:scale-110 transition-transform duration-1000 pointer-events-none" />
          <h3 className="text-foreground text-base font-black flex items-center gap-2.5 mb-4 uppercase tracking-tight relative z-10">
            <Medal size={22} className="text-amber-500" /> Achievement Workshop
          </h3>
          <div className="space-y-4 relative z-10">
            {Array.isArray(badgeLibrary) && badgeLibrary.map((badge, index) => (
              <div key={index} className="bg-background border border-border rounded-2xl p-4 md:p-5 group/badge relative hover:border-amber-500/30 transition-all shadow-inner">
                <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr_1fr_1.5fr_auto] gap-5 items-center">
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
            <button onClick={addBadge} className="w-full py-4 border-2 border-dashed border-border rounded-2xl text-slate-400 hover:text-amber-500 hover:bg-amber-500/5 transition-all flex items-center justify-center gap-4 text-xs font-black uppercase tracking-[0.3em] group active:scale-[0.99]">
              <Plus size={24} className="group-hover:rotate-90 transition-transform duration-500" /> Engineer New Achievement Node
            </button>
          </div>
        </section>
        </div>
      </div>

      <div data-settings-section="access" hidden={!showSection('access')} className="mt-8"><AccessRolesPanel /></div>

      {/* STICKY EXECUTION FOOTER */}
      <div className="mt-6 sticky bottom-4 z-[100] px-2">
        <button onClick={saveSettings} disabled={saving} className={`w-full py-3.5 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-[0.4em] transition-all duration-500 flex items-center justify-center gap-5 shadow-[0_20px_50px_rgba(0,0,0,0.3)] ${saving ? "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed" : "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white dark:text-slate-950 active:scale-95 cursor-pointer shadow-emerald-500/20"}`}>
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