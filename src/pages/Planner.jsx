import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ListOrdered, Plus, Trash2, GripVertical, X, Link2, ArrowRight, CheckCircle2, Pencil } from 'lucide-react';
import API from '../api/axiosConfig';
import { dialog } from '../components/Dialog';
import { fmtIST, fmtISTDate } from '../utils/istTime';

/**
 * PLANNER: private plans. A plan = a goal (optionally linked to an existing task) broken into
 * ordered steps. Drag the steps to arrange them; turn a step into a real Delegation or Checklist
 * task when you are ready (the tasks then show on the "Planner" tab of My Tasks).
 */
const PRIORITY_CLS = { High: 'bg-red-500/10 text-red-600 border-red-500/30', Medium: 'bg-amber-500/10 text-amber-600 border-amber-500/30', Low: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' };
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const errMsg = (e, d = 'Something went wrong.') => (e && e.response && e.response.data && e.response.data.message) || d;
const inputCls = 'w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/20';
const btn = 'px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all disabled:opacity-50';
const todayYmd = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

export default function Planner() {
  const [plans, setPlans] = useState([]);
  const [sel, setSel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [off, setOff] = useState(false);
  const [err, setErr] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [step, setStep] = useState({ title: '', priority: 'Medium', kind: 'Delegation' });
  const [makeFor, setMakeFor] = useState(null);     // step being turned into a task
  const [myTasks, setMyTasks] = useState([]);       // for "link to an existing task"
  const [dragId, setDragId] = useState(null);
  const listRef = useRef(null);
  const startOrder = useRef('');
  const plan = useMemo(() => plans.find((p) => p._id === sel) || null, [plans, sel]);
  const planRef = useRef(plan); planRef.current = plan;

  const put = (p) => setPlans((all) => all.map((x) => (x._id === p._id ? p : x)));
  const load = useCallback(async () => {
    try {
      const r = await API.get('/tasks/planner');
      setPlans(r.data || []); setSel((s) => s || (r.data && r.data[0] && r.data[0]._id) || null); setErr('');
    } catch (e) {
      if (e.response && e.response.data && e.response.data.disabled) setOff(true); else setErr(errMsg(e, 'Could not load your plans.'));
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const me = (() => { try { const u = JSON.parse(localStorage.getItem('user') || '{}'); return u._id || u.id; } catch (e) { return null; } })();
    if (!me) return;
    Promise.all([API.get(`/tasks/doer/${me}`).catch(() => ({ data: [] })), API.get(`/tasks/checklist/${me}`).catch(() => ({ data: [] }))]).then(([d, c]) => {
      const dl = (Array.isArray(d.data) ? d.data : []).filter((t) => !t.planId).map((t) => ({ taskType: 'Delegation', taskId: t._id, title: t.title }));
      const cl = (Array.isArray(c.data) ? c.data : []).filter((t) => !t.planId).map((t) => ({ taskType: 'Checklist', taskId: t._id, title: t.taskName }));
      setMyTasks([...dl, ...cl]);
    });
  }, []);

  const createPlan = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try { const r = await API.post('/tasks/planner', { title: newTitle.trim() }); setPlans((a) => [r.data, ...a]); setSel(r.data._id); setNewTitle(''); }
    catch (x) { dialog.alert(errMsg(x), { tone: 'error' }); }
  };
  const savePlan = async (patch) => {
    try { const r = await API.put(`/tasks/planner/${plan._id}`, patch); put(r.data); } catch (x) { dialog.alert(errMsg(x), { tone: 'error' }); load(); }
  };
  const deletePlan = async () => {
    const yes = await dialog.confirm(`Delete the plan "${plan.title}"? Tasks already made from it are kept.`, { title: 'Delete plan', danger: true, confirmText: 'Delete' });
    if (!yes) return;
    try { await API.delete(`/tasks/planner/${plan._id}`); setPlans((a) => a.filter((x) => x._id !== plan._id)); setSel(null); } catch (x) { dialog.alert(errMsg(x), { tone: 'error' }); }
  };
  const addStep = async (e) => {
    e.preventDefault();
    if (!step.title.trim()) return;
    try { const r = await API.post(`/tasks/planner/${plan._id}/steps`, step); put(r.data); setStep((s) => ({ ...s, title: '' })); }
    catch (x) { dialog.alert(errMsg(x), { tone: 'error' }); }
  };
  const patchStep = async (s, patch) => {
    try { const r = await API.put(`/tasks/planner/${plan._id}/steps/${s._id}`, patch); put(r.data); } catch (x) { dialog.alert(errMsg(x), { tone: 'error' }); }
  };
  const editStep = async (s) => {
    const t = await dialog.prompt?.('Change the step', { title: 'Edit step', defaultValue: s.title });
    if (t && t.trim() && t.trim() !== s.title) patchStep(s, { title: t.trim() });
  };
  const removeStep = async (s) => {
    const yes = await dialog.confirm(s.taskId ? 'Remove this step? The task made from it stays, but moves back to your normal task lists.' : 'Remove this step?', { title: 'Remove step', danger: true, confirmText: 'Remove' });
    if (!yes) return;
    try { const r = await API.delete(`/tasks/planner/${plan._id}/steps/${s._id}`); put(r.data); } catch (x) { dialog.alert(errMsg(x), { tone: 'error' }); }
  };

  /* drag to arrange (pointer events: mouse and touch) */
  const ptr = useRef({ x: 0, y: 0 }); const raf = useRef(0);
  const scroller = () => { let el = listRef.current; while (el && el !== document.body) { const o = getComputedStyle(el).overflowY; if ((o === 'auto' || o === 'scroll') && el.scrollHeight > el.clientHeight) return el; el = el.parentElement; } return document.scrollingElement; };
  const reorderAt = (id, x, y) => {
    const el = document.elementFromPoint(x, y)?.closest?.('[data-sid]'); const over = el && el.getAttribute('data-sid');
    if (!over || over === id) return;
    setPlans((all) => all.map((p) => {
      if (p._id !== planRef.current._id) return p;
      const from = p.steps.findIndex((s) => s._id === id), to = p.steps.findIndex((s) => s._id === over);
      if (from < 0 || to < 0) return p;
      const steps = [...p.steps]; const [m] = steps.splice(from, 1); steps.splice(to, 0, m); return { ...p, steps };
    }));
  };
  const stopLoop = () => { cancelAnimationFrame(raf.current); raf.current = 0; };
  const down = (e, id) => {
    e.preventDefault(); e.currentTarget.setPointerCapture?.(e.pointerId);
    startOrder.current = planRef.current.steps.map((s) => s._id).join(','); ptr.current = { x: e.clientX, y: e.clientY }; setDragId(id);
    const loop = () => { const { x, y } = ptr.current; const edge = 90; const sc = scroller(); let dy = 0; if (y < edge) dy = -Math.ceil((edge - y) / 6); else if (y > window.innerHeight - edge) dy = Math.ceil((y - (window.innerHeight - edge)) / 6); if (dy && sc) { sc.scrollTop += dy; reorderAt(id, x, y); } raf.current = requestAnimationFrame(loop); };
    raf.current = requestAnimationFrame(loop);
  };
  const move = (e) => { if (!dragId) return; ptr.current = { x: e.clientX, y: e.clientY }; reorderAt(dragId, e.clientX, e.clientY); };
  const up = async () => {
    if (!dragId) return; stopLoop(); setDragId(null);
    const p = planRef.current; const now = p.steps.map((s) => s._id).join(',');
    if (now !== startOrder.current) { try { await API.put(`/tasks/planner/${p._id}/steps/reorder`, { orderedIds: p.steps.map((s) => s._id) }); } catch (x) { dialog.alert(errMsg(x, 'Could not save the order.'), { tone: 'error' }); load(); } }
  };
  useEffect(() => stopLoop, []);

  if (off) return <div className="p-8 text-center text-sm font-bold text-slate-500" data-testid="planner-off">The Planner is not switched on for your company. Please ask your administrator.</div>;

  return (
    <div className="max-w-6xl mx-auto w-full" data-testid="planner">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2.5 rounded-xl bg-primary/10 text-primary"><ListOrdered size={20} /></div>
        <div>
          <h2 className="text-foreground text-xl font-black uppercase tracking-tight">Planner</h2>
          <p className="text-[11px] text-slate-500">Plan a task step by step. Arrange the steps by dragging, then turn each one into a real task when you are ready. Plans are private to you.</p>
        </div>
      </div>
      {err && <p className="text-xs font-bold text-red-500 mb-3">{err}</p>}
      {loading ? <p className="text-xs text-slate-500">Loading...</p> : (
        <div className="grid lg:grid-cols-[280px_1fr] gap-5 items-start">
          {/* PLANS */}
          <div>
            <form onSubmit={createPlan} className="flex gap-2 mb-3">
              <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="New plan, e.g. Give salary" maxLength={200} className={inputCls} data-testid="new-plan-title" />
              <button type="submit" className={`${btn} bg-primary text-primary-foreground flex items-center gap-1`} data-testid="new-plan-add"><Plus size={13} /> Add</button>
            </form>
            <div className="space-y-2">
              {plans.length === 0 && <p className="text-xs text-slate-500 py-6 text-center">No plans yet. Type a name above and press Add.</p>}
              {plans.map((p) => {
                const total = p.steps.length; const done = p.steps.filter((s) => s.done).length;
                return (
                  <button key={p._id} type="button" onClick={() => setSel(p._id)} data-testid="plan-item"
                    className={`w-full text-left p-3 rounded-2xl border transition-all ${sel === p._id ? 'border-primary bg-primary/5 shadow' : 'border-border bg-card hover:bg-muted/40'}`}>
                    <span className="block font-black text-sm text-foreground break-words">{p.title}</span>
                    <span className="block text-[10px] font-bold text-slate-500 mt-0.5">{total} step{total === 1 ? '' : 's'}{total ? ` · ${done} done` : ''}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ONE PLAN */}
          {plan ? (
            <div className="bg-card border border-border rounded-2xl p-4 md:p-5 shadow-sm min-w-0" ref={listRef}>
              <div className="flex items-start gap-2 mb-3">
                <input key={plan._id + 't'} defaultValue={plan.title} maxLength={200} onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== plan.title) savePlan({ title: v }); else e.target.value = plan.title; }} className="flex-1 min-w-0 bg-transparent text-lg font-black text-foreground outline-none border-b border-transparent focus:border-primary" aria-label="Plan name" />
                <button type="button" onClick={deletePlan} className="p-2 rounded-xl text-red-500 hover:bg-red-500/10" title="Delete plan"><Trash2 size={15} /></button>
              </div>
              <textarea key={plan._id + 'n'} defaultValue={plan.notes} maxLength={2000} rows={2} placeholder="Notes (optional)" onBlur={(e) => { if (e.target.value !== plan.notes) savePlan({ notes: e.target.value }); }} className={`${inputCls} mb-3 resize-none`} />
              <div className="flex flex-wrap items-center gap-2 mb-4 text-[11px]">
                <Link2 size={13} className="text-slate-400" />
                <span className="font-black uppercase tracking-widest text-slate-500 text-[9px]">For task</span>
                <select value={plan.linkedTask && plan.linkedTask.taskId ? `${plan.linkedTask.taskType}:${plan.linkedTask.taskId}` : ''} data-testid="link-task"
                  onChange={(e) => { const v = e.target.value; if (!v) return savePlan({ linkedTask: null }); const t = myTasks.find((x) => `${x.taskType}:${x.taskId}` === v); if (t) savePlan({ linkedTask: t }); }}
                  className="px-2 py-1.5 rounded-lg border border-border bg-background text-xs font-semibold max-w-full min-w-0">
                  <option value="">Not linked to a task</option>
                  {plan.linkedTask && plan.linkedTask.taskId && !myTasks.some((x) => String(x.taskId) === String(plan.linkedTask.taskId)) && <option value={`${plan.linkedTask.taskType}:${plan.linkedTask.taskId}`}>{plan.linkedTask.title || 'Linked task'}</option>}
                  {myTasks.map((t) => <option key={`${t.taskType}:${t.taskId}`} value={`${t.taskType}:${t.taskId}`}>[{t.taskType === 'Checklist' ? 'Chk' : 'Del'}] {t.title}</option>)}
                </select>
              </div>

              {/* STEPS */}
              <div className="space-y-2" data-testid="steps">
                {plan.steps.length === 0 && <p className="text-xs text-slate-500 py-4 text-center">No steps yet. Add the first step below.</p>}
                {plan.steps.map((s, i) => (
                  <div key={s._id} data-sid={s._id} data-testid="step" className={`flex flex-wrap sm:flex-nowrap items-start gap-2 p-3 rounded-2xl border bg-background transition-shadow ${dragId === s._id ? 'border-primary shadow-xl ring-2 ring-primary/30' : 'border-border'}`}>
                    <button onPointerDown={(e) => down(e, s._id)} onPointerMove={move} onPointerUp={up} onPointerCancel={up} style={{ touchAction: 'none' }} aria-label="Drag to arrange" title="Hold and drag" className="shrink-0 w-7 h-9 flex items-center justify-center text-slate-400 cursor-grab active:cursor-grabbing"><GripVertical size={17} /></button>
                    <span className="shrink-0 w-5 h-9 flex items-center text-[11px] font-black text-slate-400">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-sm break-words ${s.done ? 'line-through opacity-60' : ''}`}>{s.title}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <select value={s.priority} onChange={(e) => patchStep(s, { priority: e.target.value })} aria-label="Priority" className={`px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-widest bg-transparent ${PRIORITY_CLS[s.priority]}`}>
                          {['High', 'Medium', 'Low'].map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                        {s.taskId ? (
                          <span className="px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-600 border border-violet-500/30 text-[9px] font-black uppercase tracking-widest">{s.taskType === 'Checklist' ? 'Checklist' : 'Delegation'} task</span>
                        ) : (
                          <select value={s.kind} onChange={(e) => patchStep(s, { kind: e.target.value })} aria-label="Type" className="px-2 py-0.5 rounded-md border border-border text-[9px] font-black uppercase tracking-widest bg-transparent text-slate-500">
                            <option value="Delegation">Delegation</option><option value="Checklist">Checklist</option>
                          </select>
                        )}
                        <span className={`text-[10px] font-bold ${s.done ? 'text-emerald-600' : 'text-slate-500'}`}>
                          {s.done && <CheckCircle2 size={11} className="inline -mt-0.5 mr-0.5" />}{s.state}{s.doerName ? ` · ${s.doerName}` : ''}{s.due ? ` · ${s.taskType === 'Checklist' ? 'next ' : 'due '}${s.taskType === 'Checklist' ? fmtISTDate(s.due) : fmtIST(s.due)}` : ''}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!s.taskId && <button type="button" onClick={() => setMakeFor(s)} data-testid="make-task" className={`${btn} bg-primary text-primary-foreground flex items-center gap-1`}>Make task <ArrowRight size={12} /></button>}
                      <button type="button" onClick={() => editStep(s)} className="p-2 rounded-lg text-slate-400 hover:text-primary hover:bg-muted" title="Rename"><Pencil size={13} /></button>
                      <button type="button" onClick={() => removeStep(s)} className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10" title="Remove"><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
              {plan.steps.length > 1 && <p className="text-center text-[10px] text-slate-500 mt-3">Hold the dots on the left and drag a step up or down to arrange them.</p>}

              <form onSubmit={addStep} className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
                <input value={step.title} onChange={(e) => setStep((s) => ({ ...s, title: e.target.value }))} placeholder="Add a step, e.g. Create report" maxLength={200} className={`${inputCls} flex-1 min-w-[180px]`} data-testid="step-title" />
                <select value={step.priority} onChange={(e) => setStep((s) => ({ ...s, priority: e.target.value }))} className="px-2 py-2 rounded-xl border border-border bg-background text-xs font-semibold" aria-label="Priority"><option>High</option><option>Medium</option><option>Low</option></select>
                <select value={step.kind} onChange={(e) => setStep((s) => ({ ...s, kind: e.target.value }))} className="px-2 py-2 rounded-xl border border-border bg-background text-xs font-semibold" aria-label="Type"><option value="Delegation">Delegation</option><option value="Checklist">Checklist</option></select>
                <button type="submit" className={`${btn} bg-primary text-primary-foreground flex items-center gap-1`} data-testid="step-add"><Plus size={13} /> Add step</button>
              </form>
            </div>
          ) : <div className="text-xs text-slate-500 py-10 text-center border border-dashed border-border rounded-2xl">Pick a plan on the left, or make a new one.</div>}
        </div>
      )}
      {makeFor && plan && <MakeTaskModal plan={plan} step={makeFor} onClose={() => setMakeFor(null)} onDone={(p) => { put(p); setMakeFor(null); }} />}
    </div>
  );
}

function MakeTaskModal({ plan, step, onClose, onDone }) {
  const user = useMemo(() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch (e) { return {}; } }, []);
  const me = user._id || user.id;
  const tenantId = localStorage.getItem('tenantId') || user.tenantId;
  const [people, setPeople] = useState([]);
  const [f, setF] = useState({ doerId: me, description: step.notes || '', deadline: '', frequency: 'Daily', days: [], dayOfMonth: 1, interval: 2, start: todayYmd() });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const isChk = step.kind === 'Checklist';
  useEffect(() => { API.get('/tasks/employees').then((r) => setPeople(Array.isArray(r.data) ? r.data : (r.data && r.data.employees) || [])).catch(() => {}); }, []);

  const submit = async (e) => {
    e.preventDefault(); setMsg('');
    setBusy(true);
    try {
      let taskId;
      if (isChk) {
        const cfg = f.frequency === 'Weekly' ? { daysOfWeek: f.days } : f.frequency === 'Monthly' ? { daysOfMonth: [Number(f.dayOfMonth) || 1] } : f.frequency === 'Interval' ? { intervalDays: Number(f.interval) || 1 } : {};
        if (f.frequency === 'Weekly' && !f.days.length) { setMsg('Choose at least one day of the week.'); setBusy(false); return; }
        const r = await API.post('/tasks/create-checklist', { tenantId, taskName: step.title, description: f.description, doerId: f.doerId, frequency: f.frequency, frequencyConfig: cfg, startDate: f.start, planId: plan._id });
        taskId = r.data.taskId;
      } else {
        if (!f.deadline) { setMsg('Please choose the deadline.'); setBusy(false); return; }
        const r = await API.post('/tasks/create-task', { tenantId, title: step.title, description: f.description, assignerId: me, doerId: f.doerId, deadline: new Date(f.deadline).toISOString(), priority: step.priority, planId: plan._id });
        taskId = r.data.task && r.data.task._id;
      }
      const l = await API.post(`/tasks/planner/${plan._id}/steps/${step._id}/link`, { taskId, taskType: isChk ? 'Checklist' : 'Delegation' });
      onDone(l.data);
    } catch (x) { setMsg(errMsg(x, 'The task could not be created.')); setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-label="Make task">
      <form onSubmit={submit} className="bg-card border border-border rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 pb-3">
          <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-widest text-primary">{isChk ? 'New checklist task' : 'New delegation task'}</p><h3 className="font-black text-base break-words">{step.title}</h3></div>
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-muted"><X size={16} /></button>
        </div>
        <div className="px-5 pb-2 overflow-y-auto space-y-3">
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Who does it
            <select value={f.doerId} onChange={(e) => setF({ ...f, doerId: e.target.value })} className={`${inputCls} mt-1`}>
              {!people.some((p) => String(p._id) === String(me)) && <option value={me}>Me</option>}
              {people.map((p) => <option key={p._id} value={p._id}>{String(p._id) === String(me) ? `${p.name} (me)` : p.name}</option>)}
            </select>
          </label>
          {isChk ? (<>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Repeats
              <select value={f.frequency} onChange={(e) => setF({ ...f, frequency: e.target.value })} className={`${inputCls} mt-1`}>
                <option value="Daily">Every day</option><option value="Weekly">Certain days of the week</option><option value="Monthly">Once a month</option><option value="Interval">Every few days</option>
              </select>
            </label>
            {f.frequency === 'Weekly' && <div className="flex flex-wrap gap-1.5">{DAYS.map((d, i) => <button type="button" key={d} onClick={() => setF({ ...f, days: f.days.includes(i) ? f.days.filter((x) => x !== i) : [...f.days, i] })} className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-black ${f.days.includes(i) ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-slate-500'}`}>{d}</button>)}</div>}
            {f.frequency === 'Monthly' && <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Day of the month<input type="number" min="1" max="31" value={f.dayOfMonth} onChange={(e) => setF({ ...f, dayOfMonth: e.target.value })} className={`${inputCls} mt-1`} /></label>}
            {f.frequency === 'Interval' && <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Every how many days<input type="number" min="1" max="365" value={f.interval} onChange={(e) => setF({ ...f, interval: e.target.value })} className={`${inputCls} mt-1`} /></label>}
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Starts on<input type="date" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} className={`${inputCls} mt-1`} /></label>
          </>) : (
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Deadline<input type="datetime-local" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} className={`${inputCls} mt-1`} data-testid="deadline" /></label>
          )}
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Description (optional)<textarea rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className={`${inputCls} mt-1 resize-none`} /></label>
          {!isChk && <p className="text-[10px] text-slate-500">Priority: <b>{step.priority}</b> (from the step).</p>}
          {msg && <p className="text-xs font-bold text-red-500">{msg}</p>}
        </div>
        <div className="p-5 pt-3 flex gap-2 justify-end shrink-0">
          <button type="button" onClick={onClose} className={`${btn} border border-border`}>Cancel</button>
          <button type="submit" disabled={busy} className={`${btn} bg-primary text-primary-foreground`} data-testid="make-submit">{busy ? 'Creating...' : 'Create task'}</button>
        </div>
      </form>
    </div>
  );
}
