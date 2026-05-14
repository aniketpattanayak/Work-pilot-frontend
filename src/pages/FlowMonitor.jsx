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
export default function FlowMonitor({ tenantId, onCreateFlow }) {
  const [instances, setInstances]   = useState([]);
  const [templates, setTemplates]   = useState([]);
  const [stats, setStats]           = useState({ active: 0, onTrack: 0, overdue: 0, completed: 0 });
  const [loading, setLoading]       = useState(false);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [templateFilter, setTemplateFilter] = useState('');
  const [selected, setSelected]     = useState(null); // { instance, template }
  const [pagination, setPagination] = useState({ total: 0, pages: 1, page: 1 });

  const fetchAll = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const [instRes, statsRes, tmplRes] = await Promise.all([
        API.get(`/fms2/instances/${tenantId}`, { params: { status: statusFilter, templateId: templateFilter || undefined } }),
        API.get(`/fms2/monitor-stats/${tenantId}`),
        API.get(`/fms2/templates/${tenantId}`),
      ]);
      setInstances(instRes.data?.instances || []);
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
      </div>

      {/* History modal */}
      {selected && (
        <HistoryModal
          instance={selected.instance}
          template={selected.template}
          onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
