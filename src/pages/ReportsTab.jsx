import React, { useState, useEffect } from 'react';
import API from '../api/axiosConfig';
import { Mail, Calendar, Download, Save, Clock, FileText, Send } from 'lucide-react';

const ReportsTab = ({ tenantId }) => {
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [settings, setSettings] = useState({
    reportEmail: '',
    weeklyReportDay: 'Saturday',
    monthlyReportDate: '1',
  });

  // 1. Load existing factory settings on mount
  useEffect(() => {
    if (tenantId) {
      API.get(`/reports/settings/${tenantId}`)
        .then(res => {
          if (res.data) {
            setSettings({
              reportEmail: res.data.reportEmail || '',
              weeklyReportDay: res.data.weeklyReportDay || 'Saturday',
              monthlyReportDate: res.data.monthlyReportDate || '1',
            });
          }
        })
        .catch(err => console.error("Error loading report settings:", err));
    }
  }, [tenantId]);

  // 2. Save factory-specific preferences
  const handleSave = async () => {
    if (!settings.reportEmail) return alert("Please enter an email address first.");
    setLoading(true);
    try {
      await API.post('/reports/settings', { ...settings, tenantId });
      alert("Success! Your reporting preferences have been saved.");
    } catch (err) {
      alert("Failed to save settings. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // 3. Trigger a manual download of the "Who-Did-What" log
  const downloadManual = async (range) => {
    // Uses Vite's env if it exists, otherwise falls back to your local port
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    
    // This opens the direct download link we created in the backend
    window.open(`${baseUrl}/reports/download/${tenantId}?range=${range}`, '_blank');
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* HEADER SECTION */}
      <div className="bg-slate-900 p-8 rounded-[2.5rem] border-b-8 border-primary shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-white text-3xl font-black uppercase tracking-tighter flex items-center gap-3">
            <FileText className="text-primary" size={32} /> Reports & Analytics Hub
          </h2>
          <p className="text-slate-400 text-xs font-bold uppercase mt-2 tracking-widest">
            Detailed "Who-Did-What" Logs for Factory Admins
          </p>
        </div>
        <div className="absolute top-0 right-0 p-8 opacity-10">
            <FileText size={120} className="text-white"/>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* AUTOMATION SETTINGS CARD */}
        <div className="bg-white p-8 rounded-[3rem] border-2 border-slate-100 shadow-xl space-y-8">
          <div className="flex justify-between items-center">
            <h3 className="font-black uppercase text-sm text-slate-900 flex items-center gap-2">
                <Mail size={18} className="text-primary"/> Delivery Preferences
            </h3>
            <span className="bg-primary/10 text-primary text-[10px] font-black px-3 py-1 rounded-full uppercase">Scheduled</span>
          </div>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Admin Notification Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type="email" 
                  placeholder="admin@factory.com"
                  className="w-full bg-slate-50 border-2 border-slate-100 p-4 pl-12 rounded-2xl font-bold outline-none focus:border-primary focus:bg-white transition-all"
                  value={settings.reportEmail}
                  onChange={(e) => setSettings({...settings, reportEmail: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Weekly Day</label>
                <select 
                  className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-bold outline-none cursor-pointer focus:border-primary transition-all"
                  value={settings.weeklyReportDay}
                  onChange={(e) => setSettings({...settings, weeklyReportDay: e.target.value})}
                >
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Monthly Date</label>
                <input 
                  type="number" min="1" max="31"
                  className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-bold outline-none focus:border-primary transition-all"
                  value={settings.monthlyReportDate}
                  onChange={(e) => setSettings({...settings, monthlyReportDate: e.target.value})}
                />
              </div>
            </div>
          </div>

          <button 
            onClick={handleSave}
            disabled={loading}
            className="w-full bg-slate-950 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-primary hover:shadow-lg hover:shadow-primary/30 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? <Clock className="animate-spin" size={16}/> : <Save size={18}/>}
            {loading ? 'Saving Settings...' : 'Update Preferences'}
          </button>
        </div>

        {/* QUICK DOWNLOAD & AUDIT CARD */}
        <div className="bg-slate-50 p-8 rounded-[3rem] border-2 border-dashed border-slate-200 space-y-8">
          <h3 className="font-black uppercase text-sm text-slate-900 flex items-center gap-2">
            <Download size={18} className="text-primary"/> Instant Work Audit
          </h3>
          <div className="bg-white p-6 rounded-2xl border border-slate-200">
             <p className="text-slate-500 text-xs font-bold leading-relaxed italic">
                Get a clean ".txt" log showing every completed task, the doer name, and the exact timestamp. No counts—just the real work facts.
             </p>
          </div>
          
          <div className="space-y-4 pt-2">
            <button 
                onClick={() => downloadManual('weekly')} 
                className="w-full bg-white border-2 border-slate-100 p-5 rounded-2xl font-black uppercase text-[11px] hover:border-primary hover:text-primary transition-all flex justify-between items-center group shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-primary/10"><Clock size={16}/></div>
                Download Last 7 Days
              </div>
              <Download size={16} className="text-slate-300 group-hover:text-primary"/>
            </button>

            <button 
                onClick={() => downloadManual('monthly')} 
                className="w-full bg-white border-2 border-slate-100 p-5 rounded-2xl font-black uppercase text-[11px] hover:border-primary hover:text-primary transition-all flex justify-between items-center group shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-primary/10"><Calendar size={16}/></div>
                Download Last 30 Days
              </div>
              <Download size={16} className="text-slate-300 group-hover:text-primary"/>
            </button>
          </div>

          <div className="pt-4 border-t border-slate-200 text-center">
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Multi-Tenant Factory Sync Active</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsTab;