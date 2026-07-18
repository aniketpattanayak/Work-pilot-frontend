import { useState, useEffect, useCallback } from 'react';
import API from '../api/axiosConfig';
import {
  Activity, RefreshCcw, Search, ChevronRight, X,
  CheckCircle2, AlertCircle, Clock, Circle, Zap,
  Filter, Eye, Plus
} from 'lucide-react';

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
  });
}

function delayLabel(mins) {
  if (!mins || mins <= 0) return null;
  if (mins < 60) return `+${mins}m`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return `+${h}h${m ? ` ${m}m` : ''}`;
}

function StatusBadge({ status, isOverdue }) {
  if (status === 'completed') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
      <CheckCircle2 size={9} /> Done
    </span>
  );
  if (isOverdue) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
      <AlertCircle size={9} /> Delayed
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
      <Clock size={9} /> Active
    </span>
  );
}

// ─── HISTORY MODAL ────────────────────────────────────────────────────────────
function HistoryModal({ instance, template, onClose }) {
  if (!instance) return null;
  const nodes = template?.nodes || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div>
            <div className="font-semibold text-sm">{instance.orderIdentifier}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{instance.templateName} · {instance.nodeHistory?.length || 0} steps completed</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition">
            <X size={16} />
          </button>
        </div>

        {/* Order data */}
        {instance.rawSheetData && Object.keys(instance.rawSheetData).length > 0 && (
          <div className="px-5 py-3 border-b border-border flex-shrink-0">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Order data</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(instance.rawSheetData).slice(0, 8).map(([k, v]) => (
                <div key={k} className="bg-muted rounded-md px-2 py-1">
                  <div className="text-[9px] text-muted-foreground">{k}</div>
                  <div className="text-[11px] font-medium">{String(v || '—')}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current step */}
        {instance.status === 'active' && instance.activeStep && (
          <div className="px-5 py-3 border-b border-border flex-shrink-0 bg-blue-50/50 dark:bg-blue-900/10">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1.5">Current step</div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">{instance.activeStep.nodeName}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">Assigned to {instance.activeStep.assignedToName}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-muted-foreground">Deadline</div>
                <div className={`text-[11px] font-semibold ${instance.isOverdue ? 'text-red-500' : 'text-foreground'}`}>
                  {fmt(instance.activeStep.plannedDeadline)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History */}
        <div className="overflow-y-auto flex-1 px-5 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Step history</div>
          {!instance.nodeHistory?.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">No steps completed yet</p>
          ) : (
            <div className="space-y-2">
              {instance.nodeHistory.map((h, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${h.onTime ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40' : 'bg-red-100 text-red-600 dark:bg-red-900/40'}`}>
                    {h.onTime ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-semibold truncate">{h.nodeName}</span>
                      {h.decision && h.decision !== 'done' && (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${h.decision === 'yes' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'}`}>
                          {h.decision.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      by {h.completedByName} · {fmt(h.completedAt)}
                      {!h.onTime && h.delayMinutes > 0 && (
                        <span className="text-red-500 ml-2">{delayLabel(h.delayMinutes)} late</span>
                      )}
                    </div>
                    {h.inputs && Object.keys(h.inputs).length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {Object.entries(h.inputs).map(([k, v]) => (
                          <span key={k} className="text-[9px] bg-muted px-1.5 py-0.5 rounded">{k}: <strong>{String(v)}</strong></span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-[10px] text-muted-foreground">Planned</div>
                    <div className="text-[10px]">{fmt(h.plannedDeadline)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>


    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function FlowMonitor({ tenantId, onCreateFlow, onEditFlow }) {
  const [instances, setInstances]   = useState([]);
  const [templates, setTemplates]   = useState([]);
  const [activeTab, setActiveTab]   = useState('monitor'); // 'monitor' | 'flows' | 'global'
  const [deletingId, setDeletingId] = useState(null);
  const [stats, setStats]           = useState({ active: 0, onTrack: 0, overdue: 0, completed: 0 });
  const [loading, setLoading]       = useState(false);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [templateFilter, setTemplateFilter] = useState('');
  const [selected, setSelected]     = useState(null); // { instance, template }
  const [globalInst, setGlobalInst] = useState(null); // for global detail view
  const [allInstances, setAllInstances] = useState([]); // all statuses for global view
  const [gSearch, setGSearch]           = useState('');
  const [gStatus, setGStatus]           = useState('all'); // all | active | delayed | ontime | completed
  const [gFlow,   setGFlow]             = useState('');    // template name filter
  const [gAssign, setGAssign]           = useState('');    // assigned to filter
  const [pagination, setPagination] = useState({ total: 0, pages: 1, page: 1 });

  const fetchAll = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const [instRes, statsRes, tmplRes, allInstRes] = await Promise.all([
        API.get(`/fms2/instances/${tenantId}`, { params: { status: statusFilter, templateId: templateFilter || undefined } }),
        API.get(`/fms2/monitor-stats/${tenantId}`),
        API.get(`/fms2/templates/${tenantId}`),
        API.get(`/fms2/instances/${tenantId}`, { params: { status: 'all', limit: 200 } }),
      ]);
      setInstances(instRes.data?.instances || []);
      setAllInstances(allInstRes.data?.instances || []);
      setPagination(instRes.data?.pagination || {});
      setStats(statsRes.data || {});
      setTemplates(tmplRes.data || []);
    } catch (err) {
      console.error('Monitor fetch error:', err);
    } finally { setLoading(false); }
  }, [tenantId, statusFilter, templateFilter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Auto-refresh every 60s
  useEffect(() => {
    const id = setInterval(fetchAll, 60000);
    return () => clearInterval(id);
  }, [fetchAll]);

  const openHistory = async (inst) => {
    try {
      const tmpl = templates.find(t => t._id === inst.templateId?.toString() || t._id?.toString() === inst.templateId?.toString());
      setSelected({ instance: inst, template: tmpl });
    } catch (err) { console.error(err); }
  };

  const filtered = instances.filter(inst => {
    if (!search) return true;
    const q = search.toLowerCase();
    return inst.orderIdentifier?.toLowerCase().includes(q) ||
           inst.activeStep?.assignedToName?.toLowerCase().includes(q) ||
           Object.values(inst.rawSheetData || {}).some(v => String(v).toLowerCase().includes(q));
  });

  return (
    <div className="w-full min-h-screen bg-background">

      {/* Header */}
      <div className="sticky top-0 z-20 bg-card/80 backdrop-blur-xl border-b border-border px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
              <Activity size={18} className="text-primary" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-none">Flow Monitor</h1>
              <p className="text-[11px] text-muted-foreground mt-0.5 uppercase tracking-wider">Live order tracking</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {loading && <RefreshCcw size={14} className="text-muted-foreground animate-spin" />}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </div>
            <button onClick={fetchAll} className="px-3 py-1.5 rounded-lg border border-border text-[11px] font-medium hover:bg-muted transition flex items-center gap-1.5">
              <RefreshCcw size={12} /> Refresh
            </button>
            <button onClick={onCreateFlow}
              className="px-3 py-1.5 rounded-lg bg-primary text-white text-[11px] font-semibold hover:bg-primary/90 transition flex items-center gap-1.5">
              <Plus size={13} /> New flow
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">

        {/* ── TABS ── */}
        <div style={{ display:'flex', gap:8, marginBottom:8 }}>
          {[['monitor','📊 Live Orders'], ['flows','🔀 Manage Flows'], ['global','🌐 Global View']].map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id)}
              style={{ padding:'7px 18px', fontSize:12, fontWeight:600, borderRadius:8, border:'1px solid var(--color-border)', cursor:'pointer', background: activeTab===id ? 'var(--color-primary)' : 'var(--color-card)', color: activeTab===id ? 'white' : 'var(--color-muted-foreground)', transition:'all .15s' }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── MANAGE FLOWS TAB ── */}
        {activeTab === 'flows' && (
          <div>
            {templates.length === 0 ? (
              <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--color-muted-foreground)', fontSize:14 }}>
                No flows yet. Click "+ New flow" to create one.
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {templates.map(t => {
                  const nodeCount = (t.nodes || []).filter(n => n.type !== 'start' && n.type !== 'end').length;
                  const srcIcon = t.dataSource === 'form' ? '📋' : t.dataSource === 'webhook' ? '🔗' : '📊';
                  const srcLabel = t.dataSource === 'form' ? 'WorkPilot Form' : t.dataSource === 'webhook' ? 'Webhook' : 'Google Sheet';
                  return (
                    <div key={t._id} style={{ border:'1px solid var(--color-border)', borderRadius:14, padding:'16px 20px', background:'var(--color-card)', display:'flex', alignItems:'center', gap:16 }}>
                      <div style={{ width:44, height:44, borderRadius:12, background:'var(--color-muted)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>{srcIcon}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:700, fontSize:14, marginBottom:3 }}>{t.name}</div>
                        <div style={{ fontSize:12, color:'var(--color-muted-foreground)' }}>
                          {srcLabel} · {nodeCount} step{nodeCount !== 1 ? 's' : ''} · Created {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : 'unknown'}
                        </div>
                        {t.linkedFormId && (
                          <div style={{ fontSize:11, color:'#27500A', marginTop:3 }}>✓ Order form linked</div>
                        )}
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(t._id);
                            const el = document.getElementById('tid-copied-' + t._id);
                            if (el) { el.style.opacity = 1; setTimeout(() => { el.style.opacity = 0; }, 1200); }
                          }}
                          style={{ display:'inline-flex', alignItems:'center', gap:6, marginTop:6, padding:'3px 10px',
                            fontSize:11, fontFamily:'monospace', border:'1px solid var(--color-border)', borderRadius:6,
                            background:'var(--color-muted)', cursor:'pointer', color:'var(--color-muted-foreground)' }}
                          title="Click to copy Template ID for Apps Script">
                          🔑 {t._id}
                          <span id={'tid-copied-' + t._id} style={{ color:'#27500A', fontWeight:600, opacity:0, transition:'opacity .2s' }}>✓ Copied</span>
                        </button>
                      </div>
                      <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                        <button onClick={() => onEditFlow?.(t)}
                          style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px', fontSize:12, fontWeight:600, border:'1px solid var(--color-border)', borderRadius:8, background:'var(--color-card)', cursor:'pointer', color:'var(--color-foreground)' }}>
                          ✏️ Edit
                        </button>
                        <button onClick={() => {
                          if (window.confirm(`Delete "${t.name}"? Active orders will continue but no new ones can start.`)) {
                            setDeletingId(t._id);
                            API.delete(`/fms2/templates/${t._id}`)
                              .then(() => setTemplates(p => p.filter(x => x._id !== t._id)))
                              .catch(e => alert(e.response?.data?.message || 'Delete failed'))
                              .finally(() => setDeletingId(null));
                          }
                        }} disabled={deletingId === t._id}
                          style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px', fontSize:12, fontWeight:600, border:'1px solid #F09595', borderRadius:8, background:'transparent', cursor:'pointer', color:'#A32D2D', opacity: deletingId===t._id ? 0.5 : 1 }}>
                          {deletingId === t._id ? '⏳' : '🗑 Delete'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── LIVE ORDERS TAB ── */}
        {activeTab === 'monitor' && <>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Active orders',  val: stats.active,    icon: <Activity size={16} />,       cls: 'text-primary', bg: 'bg-primary/10' },
            { label: 'On track',       val: stats.onTrack,   icon: <CheckCircle2 size={16} />,   cls: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
            { label: 'Delayed',        val: stats.overdue,   icon: <AlertCircle size={16} />,    cls: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
            { label: 'Completed',      val: stats.completed, icon: <CheckCircle2 size={16} />,   cls: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-800' },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
              <div className={`p-2 rounded-xl ${s.bg}`}>
                <span className={s.cls}>{s.icon}</span>
              </div>
              <div>
                <p className="text-2xl font-black leading-none">{s.val ?? 0}</p>
                <p className="text-[11px] text-muted-foreground mt-1 font-medium">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Search order, customer, assignee…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 w-56" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40">
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="all">All</option>
          </select>
          <select value={templateFilter} onChange={e => setTemplateFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40">
            <option value="">All flows</option>
            {templates.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
          </select>
          <span className="text-[11px] text-muted-foreground">{filtered.length} order{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="bg-card border border-dashed border-border rounded-2xl p-12 text-center">
            <Activity size={28} className="mx-auto text-muted-foreground opacity-30 mb-3" />
            <p className="text-sm text-muted-foreground">
              {instances.length === 0 ? 'No orders yet. Create a flow and add a sheet row to get started.' : 'No results match your filter.'}
            </p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {['Order', 'Flow', 'Current step', 'Assigned to', 'Deadline', 'Delay', 'Status', ''].map(h => (
                      <th key={h} className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map(inst => {
                    const delay = delayLabel(inst.delayMinutes);
                    return (
                      <tr key={inst._id} className="hover:bg-muted/30 transition-colors group">
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs font-semibold bg-muted px-2 py-1 rounded-lg">{inst.orderIdentifier}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{inst.templateName}</td>
                        <td className="px-4 py-3 text-xs font-medium">{inst.activeStep?.nodeName || (inst.status === 'completed' ? 'Complete' : '—')}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{inst.activeStep?.assignedToName || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[11px] font-medium ${inst.isOverdue ? 'text-red-500' : 'text-muted-foreground'}`}>
                            {fmt(inst.activeStep?.plannedDeadline)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {delay ? (
                            <span className="text-[11px] font-semibold text-red-500 font-mono">{delay}</span>
                          ) : inst.activeStep ? (
                            <span className="text-[11px] text-emerald-500 font-medium">On time</span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={inst.status} isOverdue={inst.isOverdue} />
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => openHistory(inst)}
                            className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            <Eye size={12} /> View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </> /* end monitor tab */}

      {/* ── GLOBAL VIEW TAB ─────────────────────────────────────── */}
      {activeTab === 'global' && (
        <div style={{ padding: '0 0 32px' }}>
          {/* Summary cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12, marginBottom:24 }}>
            {[
              { label:'Total Orders', value: allInstances.length, color:'#185FA5' },
              { label:'Active', value: allInstances.filter(i=>i.status==='active').length, color:'#0369A1' },
              { label:'Delayed', value: allInstances.filter(i=>i.status==='active'&&i.isOverdue).length, color:'#B91C1C' },
              { label:'On Time', value: allInstances.filter(i=>i.status==='active'&&!i.isOverdue).length, color:'#059669' },
              { label:'Completed', value: allInstances.filter(i=>i.status==='completed').length, color:'#7C3AED' },
            ].map(card => (
              <div key={card.label} style={{ background:'var(--color-card)', border:'1px solid var(--color-border)', borderRadius:12, padding:'16px 20px' }}>
                <div style={{ fontSize:11, color:'var(--color-muted-foreground)', fontWeight:600, marginBottom:6 }}>{card.label}</div>
                <div style={{ fontSize:28, fontWeight:800, color:card.color }}>{card.value}</div>
              </div>
            ))}
          </div>

          {/* Filter bar */}
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:20, alignItems:'center', background:'var(--color-card)', border:'1px solid var(--color-border)', borderRadius:12, padding:'12px 16px' }}>
            {/* Search */}
            <input placeholder="🔍 Search order, customer, assignee..." value={gSearch} onChange={e=>setGSearch(e.target.value)}
              style={{ flex:2, minWidth:200, padding:'8px 12px', border:'1px solid var(--color-border)', borderRadius:8, background:'var(--color-muted)', color:'var(--color-foreground)', fontSize:12, outline:'none' }} />
            {/* Status */}
            <select value={gStatus} onChange={e=>setGStatus(e.target.value)}
              style={{ padding:'8px 12px', border:'1px solid var(--color-border)', borderRadius:8, background:'var(--color-muted)', color:'var(--color-foreground)', fontSize:12, cursor:'pointer' }}>
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="ontime">On Time</option>
              <option value="delayed">Delayed</option>
              <option value="completed">Completed</option>
            </select>
            {/* Flow */}
            <select value={gFlow} onChange={e=>setGFlow(e.target.value)}
              style={{ padding:'8px 12px', border:'1px solid var(--color-border)', borderRadius:8, background:'var(--color-muted)', color:'var(--color-foreground)', fontSize:12, cursor:'pointer' }}>
              <option value="">All Flows</option>
              {templates.map(t => <option key={t._id} value={t.name}>{t.name}</option>)}
            </select>
            {/* Assignee search */}
            <input placeholder="👤 Assignee name..." value={gAssign} onChange={e=>setGAssign(e.target.value)}
              style={{ flex:1, minWidth:150, padding:'8px 12px', border:'1px solid var(--color-border)', borderRadius:8, background:'var(--color-muted)', color:'var(--color-foreground)', fontSize:12, outline:'none' }} />
            {/* Clear */}
            {(gSearch||gStatus!=='all'||gFlow||gAssign) && (
              <button onClick={()=>{setGSearch('');setGStatus('all');setGFlow('');setGAssign('');}}
                style={{ padding:'8px 14px', border:'1px solid var(--color-border)', borderRadius:8, background:'var(--color-card)', color:'var(--color-muted-foreground)', fontSize:12, cursor:'pointer' }}>
                ✕ Clear
              </button>
            )}
            <span style={{ fontSize:11, color:'var(--color-muted-foreground)', marginLeft:'auto' }}>{allInstances.filter(inst => { if(gSearch){const q=gSearch.toLowerCase();if(!inst.orderIdentifier?.toLowerCase().includes(q)&&!inst.activeStep?.assignedToName?.toLowerCase().includes(q))return false;} if(gStatus==='active'&&inst.status!=='active')return false; if(gStatus==='delayed'&&!(inst.status==='active'&&inst.isOverdue))return false; if(gStatus==='ontime'&&!(inst.status==='active'&&!inst.isOverdue))return false; if(gStatus==='completed'&&inst.status!=='completed')return false; if(gFlow&&inst.templateName!==gFlow)return false; return true; }).length} orders</span>
          </div>

          {/* Per-flow breakdown */}
          <div style={{ marginBottom:24 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--color-foreground)', marginBottom:12 }}>📋 Per Flow Breakdown</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:12 }}>
              {templates.map(t => {
                const flowInsts = allInstances.filter(i => i.templateId?.toString() === t._id?.toString() || i.templateName === t.name);
                const active = flowInsts.filter(i=>i.status==='active').length;
                const delayed = flowInsts.filter(i=>i.status==='active'&&i.isOverdue).length;
                const completed = flowInsts.filter(i=>i.status==='completed').length;
                return (
                  <div key={t._id} style={{ background:'var(--color-card)', border:'1px solid var(--color-border)', borderRadius:12, padding:16 }}>
                    <div style={{ fontWeight:700, fontSize:14, marginBottom:8 }}>{t.name}</div>
                    <div style={{ display:'flex', gap:16, fontSize:12 }}>
                      <span style={{ color:'#0369A1' }}>Active: <b>{active}</b></span>
                      <span style={{ color:'#B91C1C' }}>Delayed: <b>{delayed}</b></span>
                      <span style={{ color:'#059669' }}>Done: <b>{completed}</b></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* All instances table */}
          <div style={{ fontSize:13, fontWeight:700, color:'var(--color-foreground)', marginBottom:12 }}>📦 All Orders — Full History</div>
          <div style={{ background:'var(--color-card)', border:'1px solid var(--color-border)', borderRadius:12, overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ background:'var(--color-muted)' }}>
                  {['Order ID','Flow','Current Step','Assigned To','Steps Done','Status','Deadline','Actions'].map(h => (
                    <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontWeight:700, fontSize:10, color:'var(--color-muted-foreground)', textTransform:'uppercase', letterSpacing:'0.05em', borderBottom:'1px solid var(--color-border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allInstances.filter(inst => {
                  if (gSearch) { const q=gSearch.toLowerCase(); if (!inst.orderIdentifier?.toLowerCase().includes(q) && !inst.activeStep?.assignedToName?.toLowerCase().includes(q) && !Object.values(inst.rawSheetData||{}).some(v=>String(v).toLowerCase().includes(q))) return false; }
                  if (gStatus==='active' && inst.status!=='active') return false;
                  if (gStatus==='delayed' && !(inst.status==='active'&&inst.isOverdue)) return false;
                  if (gStatus==='ontime' && !(inst.status==='active'&&!inst.isOverdue)) return false;
                  if (gStatus==='completed' && inst.status!=='completed') return false;
                  if (gFlow && inst.templateName!==gFlow) return false;
                  if (gAssign && !inst.activeStep?.assignedToName?.toLowerCase().includes(gAssign.toLowerCase())) return false;
                  return true;
                }).map((inst, idx) => {
                  const tmpl = templates.find(t => t._id?.toString() === inst.templateId?.toString() || t.name === inst.templateName);
                  const totalSteps = tmpl?.nodes?.filter(n=>n.type!=='start'&&n.type!=='end').length || 0;
                  const doneSteps = inst.nodeHistory?.length || 0;
                  const isDone = inst.status === 'completed';
                  const isDelayed = inst.status === 'active' && inst.isOverdue;
                  return (
                    <tr key={inst._id} style={{ borderBottom:'1px solid var(--color-border)', background: idx%2===0?'var(--color-card)':'var(--color-muted)' }}>
                      <td style={{ padding:'10px 14px', fontWeight:700 }}>{inst.orderIdentifier}</td>
                      <td style={{ padding:'10px 14px', color:'var(--color-muted-foreground)' }}>{inst.templateName}</td>
                      <td style={{ padding:'10px 14px' }}>{isDone ? '✅ Completed' : (inst.activeStep?.nodeName || '—')}</td>
                      <td style={{ padding:'10px 14px' }}>{isDone ? '—' : (inst.activeStep?.assignedToName || '—')}</td>
                      <td style={{ padding:'10px 14px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <div style={{ flex:1, height:6, background:'var(--color-border)', borderRadius:3, overflow:'hidden' }}>
                            <div style={{ height:'100%', background: isDone?'#059669':isDelayed?'#B91C1C':'#185FA5', width:`${totalSteps>0?Math.round((doneSteps/totalSteps)*100):0}%`, borderRadius:3 }}/>
                          </div>
                          <span style={{ fontSize:10, color:'var(--color-muted-foreground)', whiteSpace:'nowrap' }}>{doneSteps}/{totalSteps}</span>
                        </div>
                      </td>
                      <td style={{ padding:'10px 14px' }}>
                        <span style={{ padding:'2px 8px', borderRadius:6, fontSize:10, fontWeight:700,
                          background: isDone?'#ECFDF3':isDelayed?'#FEF2F2':'#EFF6FF',
                          color: isDone?'#059669':isDelayed?'#B91C1C':'#185FA5' }}>
                          {isDone?'Done':isDelayed?'Delayed':'Active'}
                        </span>
                      </td>
                      <td style={{ padding:'10px 14px', color:'var(--color-muted-foreground)', fontSize:11 }}>
                        {isDone ? fmt(inst.completedAt) : fmt(inst.activeStep?.plannedDeadline)}
                      </td>
                      <td style={{ padding:'10px 14px' }}>
                        <button onClick={() => setGlobalInst(inst)}
                          style={{ padding:'4px 10px', border:'1px solid var(--color-border)', borderRadius:6, background:'var(--color-card)', cursor:'pointer', fontSize:11, color:'var(--color-foreground)' }}>
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Global detail modal */}
      {globalInst && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
          onClick={e => e.target===e.currentTarget && setGlobalInst(null)}>
          <div style={{ background:'var(--color-card)', border:'1px solid var(--color-border)', borderRadius:16, width:'100%', maxWidth:700, maxHeight:'90vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>
            {/* Header */}
            <div style={{ padding:'18px 22px', borderBottom:'1px solid var(--color-border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontWeight:800, fontSize:16 }}>{globalInst.orderIdentifier}</div>
                <div style={{ fontSize:12, color:'var(--color-muted-foreground)', marginTop:2 }}>{globalInst.templateName} · {globalInst.nodeHistory?.length||0} steps completed</div>
              </div>
              <button onClick={() => setGlobalInst(null)} style={{ border:'none', background:'none', cursor:'pointer', fontSize:20, color:'var(--color-muted-foreground)' }}>✕</button>
            </div>
            <div style={{ overflowY:'auto', padding:22, display:'flex', flexDirection:'column', gap:20 }}>

              {/* Sheet data */}
              {globalInst.rawSheetData && Object.keys(globalInst.rawSheetData).length > 0 && (
                <div>
                  <div style={{ fontSize:11, fontWeight:700, color:'var(--color-muted-foreground)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>📄 Order Data</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:8 }}>
                    {Object.entries(globalInst.rawSheetData).filter(([,v])=>v!=='').map(([k,v]) => (
                      <div key={k} style={{ background:'var(--color-muted)', borderRadius:8, padding:'8px 12px' }}>
                        <div style={{ fontSize:10, color:'var(--color-muted-foreground)', marginBottom:3 }}>{k}</div>
                        <div style={{ fontSize:12, fontWeight:600, color:'var(--color-foreground)' }}>{String(v)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step timeline */}
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--color-muted-foreground)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>🔄 Step Timeline</div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {/* Completed steps */}
                  {(globalInst.nodeHistory||[]).map((h, i) => (
                    <div key={i} style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                      <div style={{ width:28, height:28, borderRadius:'50%', background:'#ECFDF3', border:'2px solid #059669', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:11, fontWeight:700, color:'#059669' }}>{i+1}</div>
                      <div style={{ flex:1, background:'var(--color-muted)', borderRadius:10, padding:'10px 14px' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                          <div style={{ fontWeight:700, fontSize:13 }}>{h.nodeName}</div>
                          <span style={{ fontSize:10, padding:'2px 7px', borderRadius:4, background: h.onTime?'#ECFDF3':'#FEF2F2', color: h.onTime?'#059669':'#B91C1C', fontWeight:700 }}>{h.onTime?'On Time':'Late'}</span>
                        </div>
                        <div style={{ fontSize:11, color:'var(--color-muted-foreground)' }}>
                          By: <b>{h.assignedToName}</b> · Done: {fmt(h.completedAt)}
                          {h.inputs && Object.keys(h.inputs).length>0 && (
                            <span> · Collected: {Object.entries(h.inputs).map(([k,v])=>`${k}: ${v}`).join(', ')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {/* Current active step */}
                  {globalInst.status === 'active' && globalInst.activeStep && (
                    <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                      <div style={{ width:28, height:28, borderRadius:'50%', background:'#EFF6FF', border:'2px solid #185FA5', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:11, fontWeight:700, color:'#185FA5' }}>▶</div>
                      <div style={{ flex:1, background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:10, padding:'10px 14px' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                          <div style={{ fontWeight:700, fontSize:13, color:'#185FA5' }}>{globalInst.activeStep.nodeName} (Current)</div>
                          <span style={{ fontSize:10, padding:'2px 7px', borderRadius:4, background: globalInst.isOverdue?'#FEF2F2':'#EFF6FF', color: globalInst.isOverdue?'#B91C1C':'#185FA5', fontWeight:700 }}>{globalInst.isOverdue?'Delayed':'Active'}</span>
                        </div>
                        <div style={{ fontSize:11, color:'#185FA5' }}>
                          Assigned to: <b>{globalInst.activeStep.assignedToName}</b> · Deadline: {fmt(globalInst.activeStep.plannedDeadline)}
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Completed */}
                  {globalInst.status === 'completed' && (
                    <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                      <div style={{ width:28, height:28, borderRadius:'50%', background:'#059669', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:14 }}>✓</div>
                      <div style={{ fontWeight:700, fontSize:13, color:'#059669' }}>Flow completed · {fmt(globalInst.completedAt)}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History modal */}
      {selected && (
        <HistoryModal
          instance={selected.instance}
          template={selected.template}
          onClose={() => setSelected(null)} />
      )}

      </div>
    </div>
  );
}