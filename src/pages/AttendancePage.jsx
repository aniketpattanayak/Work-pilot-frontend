import React, { useState, useEffect, useCallback, useRef } from 'react';
import API from '../api/axiosConfig';
import { Clock, LogIn, LogOut, Camera, Check, X } from 'lucide-react';
import { dialog } from '../components/Dialog';
import usePermissions from '../components/usePermissions';
import FaceCaptureModal from '../components/FaceCaptureModal';
import AttendanceSetup from '../components/AttendanceSetup';

/**
 * ATTENDANCE: punch in/out (with location and face check when the company uses them), your month,
 * corrections, approvals for managers, the team sheet, and (for Admins) setup.
 * Which tabs appear depends on what the person is allowed to do.
 */
const IST = 330 * 60 * 1000;
const todayIST = () => new Date(Date.now() + IST).toISOString().slice(0, 10);
const card = 'bg-card rounded-[2rem] border border-border p-5 md:p-8 shadow-xl';
const label = 'text-[10px] font-black text-slate-500 uppercase tracking-[0.25em]';
const input = 'px-4 py-3 rounded-2xl border border-border bg-background text-foreground text-sm font-bold w-full';
const primary = 'px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest bg-primary text-primary-foreground disabled:opacity-50';
const ghost = 'px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-border bg-background text-foreground disabled:opacity-50';
const err = (e, d) => e?.response?.data?.message || d;
const hm = (n) => `${Math.floor((n || 0) / 60)}h ${String((n || 0) % 60).padStart(2, '0')}m`;
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const wd = (d) => WD[new Date(d + 'T00:00:00Z').getUTCDay()];

const tone = (s) => {
  if (/^Present/.test(s) || s === 'Working') return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300';
  if (/Absent|Missing/.test(s)) return 'bg-red-500/15 text-red-700 dark:text-red-300';
  if (/Half/.test(s)) return 'bg-amber-500/15 text-amber-700 dark:text-amber-300';
  if (/Leave/.test(s)) return 'bg-sky-500/15 text-sky-700 dark:text-sky-300';
  return 'bg-slate-500/15 text-slate-600 dark:text-slate-300';
};
const Chip = ({ s }) => (s ? <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap ${tone(s)}`}>{s}</span> : null);

const getPosition = () => new Promise((resolve, reject) => {
  if (!navigator.geolocation) return reject(new Error('Your browser cannot share your location.'));
  navigator.geolocation.getCurrentPosition(
    (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
    () => reject(new Error('Could not get your location. Please allow location access for this site and try again.')),
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
  );
});

// ---------------------------------------------------------------- Today
const Today = () => {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [ask, setAsk] = useState(null);          // { reasons, payload } when a punch needs a reason
  const [reason, setReason] = useState('');
  const [face, setFace] = useState(null);        // { count, title, resolve } while the camera is open
  const [consent, setConsent] = useState(false);
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    try { setData((await API.get('/tasks/attendance/today')).data); }
    catch (e) { await dialog.alert(err(e, 'Could not load today.'), { tone: 'error' }); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);

  const askFace = (count, title) => new Promise((resolve) => setFace({ count, title, resolve }));
  const closeFace = (v) => { const f = face; setFace(null); if (f) f.resolve(v); };

  const send = async (payload) => {
    try {
      const res = await API.post('/tasks/attendance/punch', payload);
      setAsk(null); setReason('');
      setNotice(res.data?.message || 'Done.');
      await load();
    } catch (e) {
      const d = e?.response?.data;
      if (e?.response?.status === 409 && d?.code === 'NEEDS_REASON') { setAsk({ reasons: d.reasons || [], payload }); return; }
      setAsk(null);
      await dialog.alert(err(e, 'Could not save your punch.'), { tone: 'error', title: 'Not punched' });
    }
  };

  const punch = async () => {
    setBusy(true); setNotice('');
    try {
      const payload = {};
      if (data.sites.length) {
        try { Object.assign(payload, await getPosition()); }
        catch (e) { if (data.settings.requireLocation) { await dialog.alert(e.message, { tone: 'error', title: 'Location needed' }); return; } }
      }
      if (data.settings.faceMode !== 'off' && data.face.status === 'Approved') {
        const ds = await askFace(1, 'Face check');
        if (!ds) return;
        payload.descriptor = ds[0];
      }
      await send(payload);
    } finally { setBusy(false); }
  };

  const enrol = async () => {
    if (!consent) return dialog.alert('Please tick the box to agree first.', { tone: 'error', title: 'Agreement needed' });
    const ds = await askFace(3, 'Set up face check');
    if (!ds) return;
    try {
      const res = await API.post('/tasks/attendance/face/enrol', { consent: true, descriptors: ds });
      await dialog.alert(res.data?.message || 'Face saved.', { tone: 'success', title: 'Saved' });
      setConsent(false); await load();
    } catch (e) { await dialog.alert(err(e, 'Could not save your face.'), { tone: 'error' }); }
  };
  const withdraw = async () => {
    if (!(await dialog.confirm('Delete your saved face data? You can set it up again later.', { title: 'Delete face data', danger: true, confirmText: 'Delete' }))) return;
    try { await API.delete(`/tasks/attendance/face/${data.myId || ''}`); await load(); }
    catch (e) { await dialog.alert(err(e, 'Could not delete.'), { tone: 'error' }); }
  };

  if (!data) return <p className="text-sm font-bold text-muted-foreground">Loading…</p>;
  const d = data.day || {};
  const clock = new Date(now + IST).toISOString().slice(11, 16);
  const faceOn = data.settings.faceMode !== 'off';

  return (
    <div className="space-y-6">
      <div className={card}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className={label}>Today · {wd(data.date)} {data.date}</p>
            <p className="text-4xl font-black text-foreground tracking-tighter mt-1">{clock} <span className="text-sm text-muted-foreground">IST</span></p>
            <div className="mt-2 flex flex-wrap items-center gap-2"><Chip s={d.status} />
              {d.late && <span className="text-[11px] font-black text-amber-600">Late by {d.lateMinutes} min</span>}
              {d.flagged && <span className="text-[11px] font-black text-amber-600">Waiting for a manager to check a punch</span>}</div>
            <p className="text-[11px] font-bold text-muted-foreground mt-2">{data.shift ? `${data.shift.name === 'Company hours' ? 'Working hours' : 'Shift ' + data.shift.name}: ${data.shift.start} to ${data.shift.end}` : 'No working hours set'}{d.workedMinutes ? ` · Worked ${hm(d.workedMinutes)}` : ''}</p>
          </div>
          <button type="button" aria-label="Punch" disabled={busy} onClick={punch} className={`${primary} !px-10 !py-5 !text-sm flex items-center gap-2`}>
            {data.nextAction === 'in' ? <LogIn size={18} /> : <LogOut size={18} />}{busy ? 'Please wait…' : data.nextAction === 'in' ? 'Punch in' : 'Punch out'}
          </button>
        </div>
        {notice && <p role="status" className="mt-4 text-sm font-black text-emerald-600 dark:text-emerald-400">{notice}</p>}
        {ask && (
          <div className="mt-5 p-4 rounded-2xl border border-amber-500/40 bg-amber-500/10">
            <p className="text-sm font-black text-foreground">A manager needs to check this punch</p>
            <ul className="mt-1 text-xs font-bold text-amber-700 dark:text-amber-300 list-disc pl-5">{ask.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
            <input aria-label="Reason" className={`${input} mt-3`} placeholder="Short reason (for example: client visit)" value={reason} onChange={(e) => setReason(e.target.value)} />
            <div className="mt-3 flex gap-2">
              <button type="button" disabled={busy} onClick={() => reason.trim().length < 3 ? dialog.alert('Please type a short reason.', { tone: 'error' }) : send({ ...ask.payload, note: reason.trim() })} className={primary}>Punch with reason</button>
              <button type="button" onClick={() => { setAsk(null); setReason(''); }} className={ghost}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      <div className={card}>
        <h3 className="text-foreground text-base font-black uppercase tracking-tight mb-3">Today's punches</h3>
        {data.punches.length === 0 && <p className="text-xs font-bold text-muted-foreground">No punches yet today.</p>}
        <div className="space-y-2">
          {data.punches.map((p) => (
            <div key={p._id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 rounded-2xl border border-border bg-muted/40">
              <p className="text-sm font-black text-foreground">{p.type === 'in' ? 'In' : 'Out'} at {p.time}{p.siteName ? ` · ${p.siteName}` : ''}</p>
              <p className="text-[11px] font-bold text-muted-foreground">{p.reviewStatus === 'Pending' ? `Waiting for review: ${p.flagReason}` : p.reviewStatus === 'Rejected' ? 'Not accepted' : p.face?.checked ? 'Face matched' : ''}</p>
            </div>
          ))}
        </div>
      </div>

      {faceOn && (
        <div className={card}>
          <h3 className="text-foreground text-base font-black uppercase tracking-tight mb-2 flex items-center gap-2"><Camera size={16} /> Face check</h3>
          {!data.face.enrolled && (
            <>
              <p className="text-xs font-bold text-muted-foreground mb-3">{data.settings.faceMode === 'required' ? 'Your company checks your face when you punch. Set it up once.' : 'Your company can check your face when you punch. Set it up once.'}</p>
              <label className="flex items-start gap-2 text-xs font-bold text-foreground cursor-pointer mb-4"><input type="checkbox" aria-label="I agree to the face data notice" className="mt-0.5" checked={consent} onChange={(e) => setConsent(e.target.checked)} /><span>{data.consentText}</span></label>
              <button type="button" onClick={enrol} className={primary}>Set up face check</button>
            </>
          )}
          {data.face.enrolled && (
            <>
              <p className="text-sm font-bold text-foreground">{data.face.status === 'Approved' ? 'Your face check is active.' : 'Your face is saved and waiting for a manager to approve it. Until then, punches will ask for a reason.'}</p>
              <button type="button" onClick={withdraw} className={`${ghost} mt-3`}>Delete my face data</button>
            </>
          )}
        </div>
      )}
      {face && <FaceCaptureModal title={face.title} count={face.count} onResult={(ds) => closeFace(ds)} onCancel={() => closeFace(null)} />}
    </div>
  );
};

// ---------------------------------------------------------------- Day table
const DayTable = ({ days, onFix }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-left text-sm">
      <thead><tr className={label}><th className="py-2 pr-3">Date</th><th className="pr-3">Status</th><th className="pr-3">In</th><th className="pr-3">Out</th><th className="pr-3">Worked</th><th className="pr-3">Notes</th><th /></tr></thead>
      <tbody>
        {days.map((d) => (
          <tr key={d.date} className="border-t border-border">
            <td className="py-2 pr-3 font-black text-foreground whitespace-nowrap">{d.date.slice(8)} {wd(d.date)}</td>
            <td className="pr-3"><Chip s={d.status} /></td>
            <td className="pr-3 font-bold">{d.firstIn || '-'}</td><td className="pr-3 font-bold">{d.lastOut || '-'}</td>
            <td className="pr-3 font-bold">{d.workedMinutes ? hm(d.workedMinutes) : '-'}</td>
            <td className="pr-3 text-[11px] font-bold text-muted-foreground">{[d.late ? `Late ${d.lateMinutes}m` : '', d.early ? `Left early ${d.earlyMinutes}m` : '', d.flagged ? 'Under review' : ''].filter(Boolean).join(' · ')}</td>
            <td>{onFix && d.date <= todayIST() && !/^(Weekly off|Holiday|Leave)$/.test(d.status) && <button type="button" aria-label={`Fix ${d.date}`} onClick={() => onFix(d)} className={ghost}>Fix</button>}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
const Totals = ({ t }) => (
  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
    {[['Present', t.present], ['Absent', t.absent], ['Leave', t.leave], ['Late', t.lateCount], ['Missing out', t.missingOut]].map(([k, v]) => (
      <div key={k} className="px-4 py-3 rounded-2xl border border-border bg-muted/40"><p className={label}>{k}</p><p className="text-2xl font-black text-foreground">{v}</p></div>
    ))}
  </div>
);

// ---------------------------------------------------------------- My attendance
const MyAttendance = ({ can }) => {
  const [month, setMonth] = useState(todayIST().slice(0, 7));
  const [data, setData] = useState(null);
  const [regs, setRegs] = useState([]);
  const [form, setForm] = useState({ date: '', inTime: '', outTime: '', reason: '' });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const canFix = can('attendance.punch');
  const formRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const [m, r] = await Promise.all([API.get('/tasks/attendance/my', { params: { month } }), canFix ? API.get('/tasks/attendance/regularizations') : Promise.resolve({ data: { requests: [] } })]);
      setData(m.data); setRegs(r.data?.requests || []);
    } catch (e) { await dialog.alert(err(e, 'Could not load your attendance.'), { tone: 'error' }); }
  }, [month, canFix]);
  useEffect(() => { load(); }, [load]);

  const fix = (d) => { setForm({ date: d.date, inTime: d.firstIn || '', outTime: d.lastOut || '', reason: '' }); setTimeout(() => formRef.current && formRef.current.scrollIntoView && formRef.current.scrollIntoView({ behavior: 'smooth' }), 0); };
  const submit = async (e) => {
    e.preventDefault();
    if (!form.date) return dialog.alert('Choose the day to correct.', { tone: 'error', title: 'Check the form' });
    if (!form.inTime && !form.outTime) return dialog.alert('Enter the in time, the out time, or both.', { tone: 'error', title: 'Check the form' });
    if (form.reason.trim().length < 3) return dialog.alert('Please give a reason.', { tone: 'error', title: 'Check the form' });
    try {
      await API.post('/tasks/attendance/regularizations', { ...form });
      await dialog.alert('Your correction was sent for approval.', { tone: 'success', title: 'Sent' });
      setForm({ date: '', inTime: '', outTime: '', reason: '' }); await load();
    } catch (er) { await dialog.alert(err(er, 'Could not send the correction.'), { tone: 'error', title: 'Not sent' }); }
  };
  const cancel = async (r) => {
    if (!(await dialog.confirm(`Cancel your correction for ${r.date}?`, { title: 'Cancel correction', danger: true, confirmText: 'Cancel it', cancelText: 'Keep it' }))) return;
    try { await API.put(`/tasks/attendance/regularizations/${r._id}/cancel`, {}); await load(); }
    catch (er) { await dialog.alert(err(er, 'Could not cancel.'), { tone: 'error' }); }
  };

  return (
    <div className="space-y-6">
      <div className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="text-foreground text-base font-black uppercase tracking-tight">My attendance</h3>
          <input aria-label="Month" type="month" className={`${input} !w-auto`} value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
        </div>
        {data && <><Totals t={data.totals} /><DayTable days={data.days} onFix={canFix ? fix : null} /></>}
      </div>
      {canFix && (
        <form ref={formRef} onSubmit={submit} className={card}>
          <h3 className="text-foreground text-base font-black uppercase tracking-tight mb-1">Fix a day</h3>
          <p className="text-xs font-bold text-muted-foreground mb-4">Forgot to punch, or the time is wrong? Enter the right times. A manager will approve it.</p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div><label className={label}>Day</label><input aria-label="Correction day" type="date" max={todayIST()} className={input} value={form.date} onChange={(e) => set('date', e.target.value)} /></div>
            <div><label className={label}>In time</label><input aria-label="Correction in time" type="time" className={input} value={form.inTime} onChange={(e) => set('inTime', e.target.value)} /></div>
            <div><label className={label}>Out time</label><input aria-label="Correction out time" type="time" className={input} value={form.outTime} onChange={(e) => set('outTime', e.target.value)} /></div>
            <div><label className={label}>Reason</label><input aria-label="Correction reason" className={input} placeholder="Why?" value={form.reason} onChange={(e) => set('reason', e.target.value)} /></div>
          </div>
          <button type="submit" className={`${primary} mt-5`}>Send for approval</button>
          {regs.length > 0 && (
            <div className="mt-6 space-y-2">
              <p className={label}>My corrections</p>
              {regs.map((r) => (
                <div key={r._id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl border border-border bg-muted/40">
                  <p className="text-sm font-black text-foreground">{r.date} · {r.inTime || '-'} to {r.outTime || '-'} <span className="text-[11px] font-bold text-muted-foreground">{r.reason}</span></p>
                  <div className="flex items-center gap-2"><Chip s={r.status} />{r.status === 'Pending' && <button type="button" aria-label={`Cancel correction ${r.date}`} onClick={() => cancel(r)} className={ghost}>Cancel</button>}</div>
                </div>
              ))}
            </div>
          )}
        </form>
      )}
    </div>
  );
};

// ---------------------------------------------------------------- Approvals
const Approvals = () => {
  const [regs, setRegs] = useState([]);
  const [punches, setPunches] = useState([]);
  const [faces, setFaces] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const [r, p, f] = await Promise.all([
        API.get('/tasks/attendance/regularizations', { params: { scope: 'approvals', status: 'Pending' } }),
        API.get('/tasks/attendance/review'), API.get('/tasks/attendance/face/pending')
      ]);
      setRegs(r.data?.requests || []); setPunches(p.data?.punches || []); setFaces(f.data?.people || []); setLoaded(true);
    } catch (e) { await dialog.alert(err(e, 'Could not load approvals.'), { tone: 'error' }); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const decide = async (url, decision, what) => {
    let note = '';
    if (decision === 'Rejected') {
      const t = await dialog.prompt(`Reason for not accepting this ${what} (optional)`, { required: false, title: 'Reject' });
      if (t === null) return;
      note = t;
    }
    try { await API.put(url, { decision, note }); await load(); }
    catch (e) { await dialog.alert(err(e, 'Could not save the decision.'), { tone: 'error' }); await load(); }
  };
  const Row = ({ title, sub, onYes, onNo, id }) => (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl border border-border bg-muted/40">
      <div><p className="text-sm font-black text-foreground">{title}</p><p className="text-[11px] font-bold text-muted-foreground">{sub}</p></div>
      <div className="flex gap-2">
        <button type="button" aria-label={`Approve ${id}`} onClick={onYes} className={`${ghost} flex items-center gap-1`}><Check size={14} /> Approve</button>
        <button type="button" aria-label={`Reject ${id}`} onClick={onNo} className={`${ghost} flex items-center gap-1`}><X size={14} /> Reject</button>
      </div>
    </div>
  );
  const empty = loaded && !regs.length && !punches.length && !faces.length;

  return (
    <div className="space-y-6">
      {empty && <div className={card}><p className="text-sm font-bold text-muted-foreground">Nothing is waiting for you.</p></div>}
      {regs.length > 0 && (
        <div className={card}><h3 className="text-foreground text-base font-black uppercase tracking-tight mb-3">Corrections</h3>
          <div className="space-y-2">{regs.map((r) => <Row key={r._id} id={`correction ${r.employeeName} ${r.date}`} title={`${r.employeeName} · ${r.date} · ${r.inTime || '-'} to ${r.outTime || '-'}`} sub={r.reason} onYes={() => decide(`/tasks/attendance/regularizations/${r._id}/decision`, 'Approved', 'correction')} onNo={() => decide(`/tasks/attendance/regularizations/${r._id}/decision`, 'Rejected', 'correction')} />)}</div></div>
      )}
      {punches.length > 0 && (
        <div className={card}><h3 className="text-foreground text-base font-black uppercase tracking-tight mb-3">Punches to check</h3>
          <div className="space-y-2">{punches.map((p) => <Row key={p._id} id={`punch ${p.employeeName} ${p.date} ${p.time}`} title={`${p.employeeName} · ${p.date} · ${p.type === 'in' ? 'In' : 'Out'} at ${p.time}`} sub={`${p.flagReason}${p.note ? ` · "${p.note}"` : ''}`} onYes={() => decide(`/tasks/attendance/punches/${p._id}/review`, 'Approved', 'punch')} onNo={() => decide(`/tasks/attendance/punches/${p._id}/review`, 'Rejected', 'punch')} />)}</div></div>
      )}
      {faces.length > 0 && (
        <div className={card}><h3 className="text-foreground text-base font-black uppercase tracking-tight mb-3">Face check set-ups</h3>
          <div className="space-y-2">{faces.map((f) => <Row key={f.employeeId} id={`face ${f.name}`} title={f.name} sub={f.department || 'Waiting for approval'} onYes={() => decide(`/tasks/attendance/face/${f.employeeId}/decision`, 'Approved', 'face set-up')} onNo={() => decide(`/tasks/attendance/face/${f.employeeId}/decision`, 'Rejected', 'face set-up')} />)}</div></div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------- Team
const csvCell = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const Team = ({ can }) => {
  const [month, setMonth] = useState(todayIST().slice(0, 7));
  const [rows, setRows] = useState([]);
  const [live, setLive] = useState([]);
  const [detail, setDetail] = useState(null);

  const load = useCallback(async () => {
    try {
      const [s, l] = await Promise.all([API.get('/tasks/attendance/sheet', { params: { month } }), API.get('/tasks/attendance/live')]);
      setRows(s.data?.rows || []); setLive(l.data?.rows || []);
    } catch (e) { await dialog.alert(err(e, 'Could not load the team.'), { tone: 'error' }); }
  }, [month]);
  useEffect(() => { setDetail(null); load(); }, [load]);

  const open = async (r) => {
    try { setDetail((await API.get('/tasks/attendance/sheet', { params: { month, employeeId: r._id } })).data); }
    catch (e) { await dialog.alert(err(e, 'Could not open this person.'), { tone: 'error' }); }
  };
  const csv = () => {
    const head = ['Name', 'Department', 'Present', 'Absent', 'Leave', 'Weekly off / holiday', 'Late days', 'Late minutes', 'Worked minutes', 'Missing punch-outs'];
    const lines = [head, ...rows.map((r) => [r.name, r.department, r.totals.present, r.totals.absent, r.totals.leave, r.totals.off, r.totals.lateCount, r.totals.lateMinutes, r.totals.workedMinutes, r.totals.missingOut])];
    const blob = new Blob([lines.map((l) => l.map(csvCell).join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `attendance-${month}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const count = (f) => live.filter(f).length;

  return (
    <div className="space-y-6">
      <div className={card}>
        <h3 className="text-foreground text-base font-black uppercase tracking-tight mb-3">Today</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[['Working', count((x) => x.status === 'Working')], ['Done', count((x) => /^Present|Half day|Worked on off/.test(x.status))], ['Not in yet', count((x) => x.status === 'Not in yet')], ['On leave', count((x) => /Leave/.test(x.status))]].map(([k, v]) => (
            <div key={k} className="px-4 py-3 rounded-2xl border border-border bg-muted/40"><p className={label}>{k}</p><p className="text-2xl font-black text-foreground">{v}</p></div>
          ))}
        </div>
      </div>
      <div className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="text-foreground text-base font-black uppercase tracking-tight">Month sheet</h3>
          <div className="flex items-center gap-2">
            <input aria-label="Sheet month" type="month" className={`${input} !w-auto`} value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
            {can('attendance.export') && <button type="button" onClick={csv} className={ghost}>Download CSV</button>}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead><tr className={label}><th className="py-2 pr-3">Name</th><th className="pr-3">Present</th><th className="pr-3">Absent</th><th className="pr-3">Leave</th><th className="pr-3">Late</th><th className="pr-3">Missing out</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id} className="border-t border-border">
                  <td className="py-2 pr-3"><button type="button" aria-label={`Open ${r.name}`} onClick={() => open(r)} className="font-black text-primary underline-offset-2 hover:underline text-left">{r.name}</button>{r.department && <span className="text-[11px] font-bold text-muted-foreground"> · {r.department}</span>}</td>
                  <td className="pr-3 font-bold">{r.totals.present}</td><td className="pr-3 font-bold">{r.totals.absent}</td><td className="pr-3 font-bold">{r.totals.leave}</td><td className="pr-3 font-bold">{r.totals.lateCount}</td><td className="pr-3 font-bold">{r.totals.missingOut}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {detail && (
        <div className={card}>
          <div className="flex items-center justify-between mb-3"><h3 className="text-foreground text-base font-black uppercase tracking-tight">{detail.employee.name} · {detail.month}</h3><button type="button" onClick={() => setDetail(null)} className={ghost}>Close</button></div>
          <Totals t={detail.totals} /><DayTable days={detail.days} />
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------- Page
const AttendancePage = () => {
  const { can, ready, permissions } = usePermissions();
  const [tab, setTab] = useState('today');
  const teamView = can('attendance.view') && permissions['attendance.view'] !== 'self';
  const tabs = [
    can('attendance.punch') ? ['today', 'Today'] : null,
    can('attendance.punch') || can('attendance.view') ? ['mine', 'My attendance'] : null,
    can('attendance.approve') ? ['approvals', 'Approvals'] : null,
    teamView ? ['team', 'Team'] : null,
    can('attendance.configure') || can('attendance.edit') ? ['setup', 'Setup'] : null
  ].filter(Boolean);
  const current = tabs.find((t) => t[0] === tab) ? tab : tabs[0]?.[0];

  return (
    <div className="max-w-5xl mx-auto pb-10">
      <h2 className="text-foreground text-2xl md:text-3xl font-black tracking-tighter uppercase flex items-center gap-3 mb-6"><Clock className="text-primary" /> Attendance</h2>
      {ready && tabs.length === 0 && <p className="text-sm font-bold text-muted-foreground">Attendance is not switched on for your company, or you do not have access to it yet.</p>}
      {tabs.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map(([k, l]) => (
            <button key={k} type="button" onClick={() => setTab(k)} className={`px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest border ${current === k ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border'}`}>{l}</button>
          ))}
        </div>
      )}
      {current === 'today' && <Today />}
      {current === 'mine' && <MyAttendance can={can} />}
      {current === 'approvals' && <Approvals />}
      {current === 'team' && <Team can={can} />}
      {current === 'setup' && <AttendanceSetup can={can} />}
    </div>
  );
};

export default AttendancePage;
