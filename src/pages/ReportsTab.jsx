import React, { useState, useEffect } from 'react';
import API from '../api/axiosConfig';
import { dialog } from '../components/Dialog';
import { isViewerOnly } from '../utils/viewerMode';
import { Mail, Calendar, Download, Save, Clock, FileText, Send } from 'lucide-react';
import ActivityLogPanel from '../components/ActivityLogPanel';

const ReportsTab = ({ tenantId }) => {
  const isViewer = isViewerOnly();
  const tid = tenantId || localStorage.getItem('tenantId');
  const [downloading, setDownloading] = useState(null); // 'weekly' | 'monthly' | null
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [settings, setSettings] = useState({
    reportEmail: '',
    weeklyReportDay: 'Saturday',
    monthlyReportDate: '1',
  });

  // 1. Load existing factory settings on mount
  useEffect(() => {
    if (tid) {
      API.get(`/reports/settings/${tid}`)
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
  }, [tid]);

  // 2. Save factory-specific preferences
  const handleSave = async () => {
    const email = (settings.reportEmail || '').trim();
    if (!email) { await dialog.alert('Please enter an email address first.', { tone: 'error', title: 'Email needed' }); return; }
    if (!/^\S+@\S+\.\S+$/.test(email)) { await dialog.alert('Please enter a valid email address.', { tone: 'error', title: 'Check the email' }); return; }
    const day = Number(settings.monthlyReportDate);
    if (!Number.isInteger(day) || day < 1 || day > 31) { await dialog.alert('Monthly date must be a number from 1 to 31.', { tone: 'error', title: 'Check the date' }); return; }
    setLoading(true);
    try {
      await API.post('/reports/settings', { ...settings, reportEmail: email, tenantId: tid });
      await dialog.alert('Your reporting preferences have been saved.', { tone: 'success', title: 'Saved' });
    } catch (err) {
      await dialog.alert(err.response?.data?.message || 'Failed to save settings. Please try again.', { tone: 'error', title: 'Not saved' });
    } finally {
      setLoading(false);
    }
  };

  // The server sends a JSON error as a blob when a download fails; read the reason out of it
  const downloadError = async (err) => {
    let reason = '';
    try {
      const d = err?.response?.data;
      if (d && typeof d.text === 'function') {
        const t = await d.text();
        try { const j = JSON.parse(t); reason = [j.message, j.error].filter(Boolean).join(' — '); } catch { reason = t.slice(0, 200); }
      } else if (d?.message) { reason = d.message; }
    } catch { /* keep the generic text */ }
    const status = err?.response?.status ? ' (HTTP ' + err.response.status + ')' : '';
    return (reason || err?.message || 'Unknown error') + status;
  };

  // 3. Download the "Who-Did-What" report for the last 7 / 30 days as an Excel file
  const downloadManual = async (range) => {
    if (!tid) { await dialog.alert('Your company could not be identified. Please refresh the page and try again.', { tone: 'error', title: 'Cannot download' }); return; }
    if (downloading) return;
    setDownloading(range);
    try {
      const res = await API.get(`/reports/download/${tid}`, { params: { range }, responseType: 'blob' });
      const type = res.data?.type || '';
      if (type.includes('json') || type.startsWith('text/')) {
        throw Object.assign(new Error('The server did not send a spreadsheet.'), { response: { data: res.data, status: res.status } });
      }
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `WorkPilot_Report_${range}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Report download failed:', err);
      await dialog.alert('Could not download the report.\n' + (await downloadError(err)), { tone: 'error', title: 'Download failed' });
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="px-6 pt-2 pb-6 max-w-5xl mx-auto space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* HEADER SECTION */}
      <div className="bg-slate-900 px-6 py-4 rounded-3xl border-b-4 border-primary shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-white text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
            <FileText className="text-primary" size={26} /> Reports & Analytics Hub
          </h2>
          <p className="text-slate-400 text-xs font-bold uppercase mt-1 tracking-widest">
            Detailed "Who-Did-What" Logs for Factory Admins
          </p>
        </div>
        <div className="absolute top-0 right-0 p-4 opacity-10">
            <FileText size={80} className="text-white"/>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AUTOMATION SETTINGS CARD */}
        {!isViewer && (
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
)}

        {/* QUICK DOWNLOAD & AUDIT CARD */}
        <div className="bg-slate-50 p-8 rounded-[3rem] border-2 border-dashed border-slate-200 space-y-8">
          <h3 className="font-black uppercase text-sm text-slate-900 flex items-center gap-2">
            <Download size={18} className="text-primary"/> Instant Work Audit
          </h3>
          <div className="bg-white p-6 rounded-2xl border border-slate-200">
             <p className="text-slate-500 text-xs font-bold leading-relaxed italic">
                Get an Excel spreadsheet showing every task, who did it, the status and when it was completed. No guesses—just the real work facts.
             </p>
          </div>
          
          <div className="space-y-4 pt-2">
            <button 
                onClick={() => downloadManual('weekly')} disabled={!!downloading} style={downloading ? { opacity: 0.6 } : undefined} 
                className="w-full bg-white border-2 border-slate-100 p-5 rounded-2xl font-black uppercase text-[11px] hover:border-primary hover:text-primary transition-all flex justify-between items-center group shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-primary/10"><Clock size={16}/></div>
                {downloading === 'weekly' ? 'Preparing…' : 'Download Last 7 Days'}
              </div>
              <Download size={16} className="text-slate-300 group-hover:text-primary"/>
            </button>

            <button 
                onClick={() => downloadManual('monthly')} disabled={!!downloading} style={downloading ? { opacity: 0.6 } : undefined} 
                className="w-full bg-white border-2 border-slate-100 p-5 rounded-2xl font-black uppercase text-[11px] hover:border-primary hover:text-primary transition-all flex justify-between items-center group shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-primary/10"><Calendar size={16}/></div>
                {downloading === 'monthly' ? 'Preparing…' : 'Download Last 30 Days'}
              </div>
              <Download size={16} className="text-slate-300 group-hover:text-primary"/>
            </button>
          </div>

          <div className="pt-4 border-t border-slate-200 text-center">
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Multi-Tenant Factory Sync Active</p>
          </div>
        </div>
      </div>

      {!isViewer && <ActivityLogPanel tenantId={tid} showTable={false} />}
    </div>
  );
};

export default ReportsTab;