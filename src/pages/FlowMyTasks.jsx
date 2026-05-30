import { useState, useEffect, useCallback } from 'react';
import API from '../api/axiosConfig';
import { CheckCircle2, AlertCircle, Clock, RefreshCcw, ChevronDown } from 'lucide-react';

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function countdown(deadline) {
  if (!deadline) return null;
  const diff = new Date(deadline) - new Date();
  if (diff < 0) {
    const abs = Math.abs(diff);
    const h = Math.floor(abs / 3600000);
    const m = Math.floor((abs % 3600000) / 60000);
    return { label: `${h}h ${m}m overdue`, late: true };
  }
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 48) return { label: `${Math.floor(h / 24)}d remaining`, late: false };
  return { label: `${h}h ${m}m remaining`, late: false };
}

// ─── TASK CARD ────────────────────────────────────────────────────────────────
function TaskCard({ task, onComplete }) {
  const [values, setValues]   = useState({});
  const [submitting, setSub]  = useState(false);
  const [error, setError]     = useState('');
  const [expanded, setExp]    = useState(true);

  const { activeStep, nodeConfig, rawSheetData, orderIdentifier, templateName, isOverdue, instanceId } = task;
  const timer = countdown(activeStep?.plannedDeadline);
  const isYesNo = nodeConfig?.type === 'yesno';
  const isInput = nodeConfig?.type === 'input';

  const submit = async (decision) => {
    // Check required fields
    const missing = (nodeConfig?.inputFields || []).filter(f => f.required && !values[f.id]);
    if (missing.length) { setError(`Please fill: ${missing.map(f => f.label).join(', ')}`); return; }

    setSub(true); setError('');
    try {
      await API.post(`/fms2/complete-step/${instanceId}`, { decision, inputs: values });
      onComplete?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit');
    } finally { setSub(false); }
  };

  // Build the data to show
  const colsToShow = nodeConfig?.sheetColumnsToShow || [];
  const displayData = colsToShow.length
    ? colsToShow.map(col => ({ label: col, value: rawSheetData?.[col] })).filter(d => d.value !== undefined)
    : Object.entries(rawSheetData || {}).slice(0, 6).map(([k, v]) => ({ label: k, value: v }));

  return (
    <div className={`bg-card border rounded-2xl overflow-hidden shadow-sm transition-all ${isOverdue ? 'border-red-300 dark:border-red-800' : 'border-border'}`}>
      {/* Card header */}
      <div className={`flex items-center justify-between px-4 py-3 ${isOverdue ? 'bg-red-50/50 dark:bg-red-900/10' : 'bg-card'}`}
        onClick={() => setExp(e => !e)} style={{ cursor: 'pointer' }}>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{activeStep?.nodeName}</span>
            {nodeConfig?.type === 'yesno' && (
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 font-semibold">YES / NO</span>
            )}
            {nodeConfig?.type === 'input' && (
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 font-semibold">INPUT</span>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            <span className="font-mono font-semibold">{orderIdentifier}</span> · {templateName}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {timer && (
            <span className={`text-[10px] font-semibold px-2 py-1 rounded-lg ${timer.late ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' : 'bg-muted text-muted-foreground'}`}>
              {timer.label}
            </span>
          )}
          <ChevronDown size={14} className={`text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Card body */}
      {expanded && (
        <div className="px-4 pb-4 pt-2 space-y-3">
          {/* Order data grid */}
          {displayData.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {displayData.map(({ label, value }) => (
                <div key={label} className="bg-muted/60 rounded-lg px-3 py-2">
                  <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
                  <div className="text-[12px] font-semibold mt-0.5 truncate">{String(value ?? '—')}</div>
                </div>
              ))}
            </div>
          )}

          {/* Deadline row */}
          {activeStep?.plannedDeadline && (
            <div className="flex items-center justify-between px-3 py-2 bg-muted/60 rounded-lg text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5"><Clock size={12} /> Planned deadline</span>
              <span className={`font-semibold ${isOverdue ? 'text-red-500' : ''}`}>
                {new Date(activeStep.plannedDeadline).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}

          {/* Question for Yes/No */}
          {isYesNo && nodeConfig?.question && (
            <div className="text-sm font-medium py-1">{nodeConfig.question}</div>
          )}

          {/* HOW TO COMPLETE — instructions from admin */}
          {nodeConfig?.howToComplete && (
            <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-3 py-2.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">📋 How to complete this step</div>
              <div className="text-sm text-blue-800 dark:text-blue-300 whitespace-pre-line">{nodeConfig.howToComplete}</div>
            </div>
          )}

          {/* Collect fields — employee fills after completing */}
          {(nodeConfig?.inputFields || []).length > 0 && (
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1 mb-1">Fill before marking done</div>
          )}
          {(nodeConfig?.inputFields || []).map(field => (
            <div key={field.id}>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                {field.label}{field.required && ' *'}
              </label>
              {field.type === 'dropdown' ? (
                <select value={values[field.id] || ''}
                  onChange={e => setValues(v => ({ ...v, [field.id]: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40">
                  <option value="">Select…</option>
                  {(field.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : field.type === 'checkbox' ? (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={!!values[field.id]}
                    onChange={e => setValues(v => ({ ...v, [field.id]: e.target.checked }))}
                    className="w-4 h-4 rounded" />
                  <span className="text-sm">Confirmed</span>
                </label>
              ) : (
                <input
                  type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                  placeholder={`Enter ${field.label.toLowerCase()}…`}
                  value={values[field.id] || ''}
                  onChange={e => setValues(v => ({ ...v, [field.id]: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all" />
              )}
            </div>
          ))}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-[11px] text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
              <AlertCircle size={12} className="flex-shrink-0" /> {error}
            </div>
          )}

          {/* Action buttons */}
          {isYesNo ? (
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button onClick={() => submit('yes')} disabled={submitting}
                className="py-2.5 rounded-xl text-sm font-semibold border border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting ? <RefreshCcw size={13} className="animate-spin" /> : <CheckCircle2 size={14} />} Yes
              </button>
              <button onClick={() => submit('no')} disabled={submitting}
                className="py-2.5 rounded-xl text-sm font-semibold border border-red-300 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting ? <RefreshCcw size={13} className="animate-spin" /> : <AlertCircle size={14} />} No
              </button>
            </div>
          ) : (
            <button onClick={() => submit('done')} disabled={submitting}
              className="w-full py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-50 flex items-center justify-center gap-2 mt-1">
              {submitting ? <RefreshCcw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {submitting ? 'Submitting…' : 'Mark as done'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function FlowMyTasks({ employeeId }) {
  const [tasks, setTasks]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab]         = useState('pending');

  const fetchTasks = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    try {
      const res = await API.get(`/fms2/my-tasks-full/${employeeId}`);
      setTasks(res.data || []);
    } catch (err) {
      console.error('My tasks fetch error:', err);
    } finally { setLoading(false); }
  }, [employeeId]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // Auto-refresh every 2 min
  useEffect(() => {
    const id = setInterval(fetchTasks, 120000);
    return () => clearInterval(id);
  }, [fetchTasks]);

  const pending   = tasks.filter(t => !t.isOverdue);
  const overdue   = tasks.filter(t => t.isOverdue);
  const displayed = tab === 'overdue' ? overdue : tab === 'pending' ? pending : tasks;

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold">My Flow Tasks</h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {tasks.length} pending · {overdue.length} overdue
          </p>
        </div>
        <button onClick={fetchTasks} disabled={loading}
          className="p-2 rounded-lg border border-border hover:bg-muted transition disabled:opacity-50">
          <RefreshCcw size={15} className={loading ? 'animate-spin text-muted-foreground' : 'text-muted-foreground'} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-muted p-1 rounded-xl gap-0.5 mb-5">
        {[
          { key: 'all',     label: `All (${tasks.length})` },
          { key: 'overdue', label: `Overdue (${overdue.length})` },
          { key: 'pending', label: `On track (${pending.length})` },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${tab === t.key ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Task list */}
      {displayed.length === 0 ? (
        <div className="text-center py-16">
          <CheckCircle2 size={28} className="mx-auto text-muted-foreground opacity-30 mb-3" />
          <p className="text-sm text-muted-foreground">
            {tasks.length === 0 ? 'No flow tasks assigned to you right now.' : 'No tasks in this category.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Show overdue first */}
          {tab === 'all' && overdue.length > 0 && (
            <>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-red-500 mb-1 mt-2">Overdue</div>
              {overdue.map(task => (
                <TaskCard key={task.instanceId} task={task} onComplete={fetchTasks} />
              ))}
              {pending.length > 0 && <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 mt-4">On track</div>}
            </>
          )}
          {(tab === 'all' ? pending : displayed).map(task => (
            <TaskCard key={task.instanceId} task={task} onComplete={fetchTasks} />
          ))}
        </div>
      )}
    </div>
  );
}