import React, { useState, useEffect, useCallback } from 'react';
import API from '../api/axiosConfig';
import { Plus, Pencil, Trash2, Save, MapPin } from 'lucide-react';
import { dialog } from './Dialog';

/** Attendance setup: settings, shifts, office locations, who follows which shift, and adding a missed punch. */
const card = 'bg-card rounded-[2rem] border border-border p-5 md:p-8 shadow-xl';
const label = 'text-[10px] font-black text-slate-500 uppercase tracking-[0.25em]';
const input = 'px-4 py-3 rounded-2xl border border-border bg-background text-foreground text-sm font-bold w-full';
const primary = 'px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest bg-primary text-primary-foreground disabled:opacity-50';
const ghost = 'px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-border bg-background text-foreground disabled:opacity-50';
const err = (e, d) => e?.response?.data?.message || d;
const todayIST = () => new Date(Date.now() + 330 * 60 * 1000).toISOString().slice(0, 10);
const blankShift = { _id: null, name: '', start: '09:30', end: '18:30', graceMinutes: 10, halfDayMinutes: 240, fullDayMinutes: 480 };
const blankSite = { _id: null, name: '', lat: '', lng: '', radiusM: 150 };

const Field = ({ title, children, hint }) => (<div><label className={label}>{title}</label>{children}{hint && <p className="text-[10px] font-bold text-muted-foreground mt-1">{hint}</p>}</div>);
const Check = ({ title, value, onChange }) => (
  <label className="flex items-center gap-2 text-sm font-bold text-foreground cursor-pointer"><input type="checkbox" aria-label={title} checked={!!value} onChange={(e) => onChange(e.target.checked)} />{title}</label>
);

const AttendanceSetup = ({ can }) => {
  const canConfig = can('attendance.configure'), canEdit = can('attendance.edit');
  const [cfg, setCfg] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [sites, setSites] = useState([]);
  const [people, setPeople] = useState([]);
  const [shift, setShift] = useState(null);
  const [site, setSite] = useState(null);
  const [man, setMan] = useState({ employeeId: '', date: todayIST(), time: '09:30', type: 'in', note: '' });

  const load = useCallback(async () => {
    try {
      const c = await API.get('/tasks/attendance/config');
      setCfg(c.data.config); setShifts(c.data.shifts || []); setSites(c.data.sites || []);
      if (canConfig || canEdit) {
        const p = await API.get('/tasks/attendance/people').catch(() => ({ data: { people: [] } }));
        setPeople((p.data?.people || []).map((x) => ({ ...x, siteIds: x.siteIds || [], shiftId: x.shiftId || '' })));
      }
    } catch (e) { await dialog.alert(err(e, 'Could not load attendance setup.'), { tone: 'error' }); }
  }, [canConfig, canEdit]);
  useEffect(() => { load(); }, [load]);

  const saveCfg = async () => {
    try {
      const b = { requireLocation: cfg.requireLocation, allowOutsideSite: cfg.allowOutsideSite, faceMode: cfg.faceMode, faceThreshold: Number(cfg.faceThreshold), fullDayMinutes: Number(cfg.fullDayMinutes), halfDayMinutes: Number(cfg.halfDayMinutes), regularizeDays: Number(cfg.regularizeDays), defaultShiftId: cfg.defaultShiftId || null };
      await API.put('/tasks/attendance/config', b);
      await dialog.alert('Attendance settings saved.', { tone: 'success', title: 'Saved' }); await load();
    } catch (e) { await dialog.alert(err(e, 'Could not save.'), { tone: 'error', title: 'Not saved' }); }
  };
  const saveShift = async () => {
    try {
      const b = { name: shift.name, start: shift.start, end: shift.end, graceMinutes: Number(shift.graceMinutes), halfDayMinutes: Number(shift.halfDayMinutes), fullDayMinutes: Number(shift.fullDayMinutes) };
      if (shift._id) await API.put(`/tasks/attendance/shifts/${shift._id}`, b); else await API.post('/tasks/attendance/shifts', b);
      setShift(null); await load();
    } catch (e) { await dialog.alert(err(e, 'Could not save the shift.'), { tone: 'error', title: 'Not saved' }); }
  };
  const delShift = async (s) => {
    if (!(await dialog.confirm(`Delete the shift "${s.name}"?`, { title: 'Delete shift', danger: true, confirmText: 'Delete' }))) return;
    try { await API.delete(`/tasks/attendance/shifts/${s._id}`); await load(); } catch (e) { await dialog.alert(err(e, 'Could not delete.'), { tone: 'error' }); }
  };
  const saveSite = async () => {
    try {
      const b = { name: site.name, lat: Number(site.lat), lng: Number(site.lng), radiusM: Number(site.radiusM) };
      if (site._id) await API.put(`/tasks/attendance/sites/${site._id}`, b); else await API.post('/tasks/attendance/sites', b);
      setSite(null); await load();
    } catch (e) { await dialog.alert(err(e, 'Could not save the location.'), { tone: 'error', title: 'Not saved' }); }
  };
  const delSite = async (s) => {
    if (!(await dialog.confirm(`Delete the location "${s.name}"?`, { title: 'Delete location', danger: true, confirmText: 'Delete' }))) return;
    try { await API.delete(`/tasks/attendance/sites/${s._id}`); await load(); } catch (e) { await dialog.alert(err(e, 'Could not delete.'), { tone: 'error' }); }
  };
  const here = () => {
    if (!navigator.geolocation) return dialog.alert('Your browser cannot share your location.', { tone: 'error' });
    navigator.geolocation.getCurrentPosition((p) => setSite((s) => ({ ...s, lat: p.coords.latitude.toFixed(6), lng: p.coords.longitude.toFixed(6) })), () => dialog.alert('Could not get your location. Allow location access and try again.', { tone: 'error' }), { enableHighAccuracy: true, timeout: 12000 });
  };
  const setPerson = (id, patch) => setPeople((l) => l.map((p) => (p._id === id ? { ...p, ...patch } : p)));
  const savePerson = async (p) => {
    try { await API.put(`/tasks/attendance/assignments/${p._id}`, { shiftId: p.shiftId || null, siteIds: p.siteIds }); await dialog.alert(`Saved for ${p.name}.`, { tone: 'success', title: 'Saved' }); }
    catch (e) { await dialog.alert(err(e, 'Could not save.'), { tone: 'error' }); }
  };
  const removeFace = async (p) => {
    if (!(await dialog.confirm(`Delete the saved face data of ${p.name}?`, { title: 'Delete face data', danger: true, confirmText: 'Delete' }))) return;
    try { await API.delete(`/tasks/attendance/face/${p._id}`); await load(); } catch (e) { await dialog.alert(err(e, 'Could not delete.'), { tone: 'error' }); }
  };
  const addPunch = async () => {
    if (!man.employeeId) return dialog.alert('Choose the person.', { tone: 'error', title: 'Check the form' });
    try {
      await API.post('/tasks/attendance/manual', man);
      await dialog.alert('The punch was added.', { tone: 'success', title: 'Added' }); setMan({ ...man, note: '' });
    } catch (e) { await dialog.alert(err(e, 'Could not add the punch.'), { tone: 'error', title: 'Not added' }); }
  };

  if (!cfg) return <p className="text-sm font-bold text-muted-foreground">Loading…</p>;
  const sh = (k, v) => setShift((s) => ({ ...s, [k]: v }));
  const st = (k, v) => setSite((s) => ({ ...s, [k]: v }));

  return (
    <div className="space-y-6">
      {canConfig && (
        <div className={card}>
          <h3 className="text-foreground text-base font-black uppercase tracking-tight mb-4">Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field title="Default shift" hint="Used for people with no shift of their own. Without a shift nobody is marked late.">
              <select aria-label="Default shift" className={input} value={cfg.defaultShiftId || ''} onChange={(e) => setCfg({ ...cfg, defaultShiftId: e.target.value })}>
                <option value="">No default shift</option>{shifts.map((s) => <option key={s._id} value={s._id}>{s.name} ({s.start} to {s.end})</option>)}
              </select>
            </Field>
            <Field title="Face check" hint="Optional: only people who set it up are checked. Required: everyone is checked, and a punch without a matching face needs a manager's approval.">
              <select aria-label="Face check" className={input} value={cfg.faceMode} onChange={(e) => setCfg({ ...cfg, faceMode: e.target.value })}>
                <option value="off">Off</option><option value="optional">Optional</option><option value="required">Required</option>
              </select>
            </Field>
            <Field title="Face strictness" hint="Lower is stricter. 0.5 is a good start; go up a little if real people are failing, down if the wrong people pass.">
              <input aria-label="Face strictness" type="number" step="0.05" min="0.3" max="0.7" className={input} value={cfg.faceThreshold} onChange={(e) => setCfg({ ...cfg, faceThreshold: e.target.value })} />
            </Field>
            <Field title="Correction window (days)" hint="How far back people can ask to fix a day.">
              <input aria-label="Correction window" type="number" min="1" max="365" className={input} value={cfg.regularizeDays} onChange={(e) => setCfg({ ...cfg, regularizeDays: e.target.value })} />
            </Field>
            <Field title="Full day (minutes)" hint="Worked at least this long = Present. 480 = 8 hours.">
              <input aria-label="Full day minutes" type="number" min="60" className={input} value={cfg.fullDayMinutes} onChange={(e) => setCfg({ ...cfg, fullDayMinutes: e.target.value })} />
            </Field>
            <Field title="Half day (minutes)" hint="Worked at least this long = Half day. 240 = 4 hours.">
              <input aria-label="Half day minutes" type="number" min="30" className={input} value={cfg.halfDayMinutes} onChange={(e) => setCfg({ ...cfg, halfDayMinutes: e.target.value })} />
            </Field>
          </div>
          <div className="mt-5 space-y-3">
            <Check title="People must be at an office location to punch" value={cfg.requireLocation} onChange={(v) => setCfg({ ...cfg, requireLocation: v })} />
            <Check title="Allow punching from outside the location (a manager then checks it)" value={cfg.allowOutsideSite} onChange={(v) => setCfg({ ...cfg, allowOutsideSite: v })} />
          </div>
          <button type="button" onClick={saveCfg} className={`${primary} mt-5 flex items-center gap-2`}><Save size={14} /> Save settings</button>
        </div>
      )}

      {canConfig && (
        <div className={card}>
          <div className="flex items-center justify-between mb-4"><h3 className="text-foreground text-base font-black uppercase tracking-tight">Shifts</h3>
            <button type="button" onClick={() => setShift({ ...blankShift })} className={`${ghost} flex items-center gap-1`}><Plus size={14} /> Add shift</button></div>
          {shifts.length === 0 && <p className="text-xs font-bold text-muted-foreground">No shifts yet. Attendance still works: a full day is {cfg.fullDayMinutes} minutes of work.</p>}
          <div className="space-y-2">
            {shifts.map((s) => (
              <div key={s._id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl border border-border bg-muted/40">
                <div><p className="text-sm font-black text-foreground">{s.name}</p><p className="text-[11px] font-bold text-muted-foreground">{s.start} to {s.end} · grace {s.graceMinutes} min · half day {s.halfDayMinutes} min · full day {s.fullDayMinutes} min</p></div>
                <div className="flex gap-2"><button type="button" aria-label={`Edit shift ${s.name}`} onClick={() => setShift({ ...s })} className={ghost}><Pencil size={13} /></button><button type="button" aria-label={`Delete shift ${s.name}`} onClick={() => delShift(s)} className={ghost}><Trash2 size={13} /></button></div>
              </div>
            ))}
          </div>
          {shift && (
            <div className="mt-5 p-4 rounded-2xl border border-border grid grid-cols-2 md:grid-cols-3 gap-4">
              <Field title="Name"><input aria-label="Shift name" className={input} value={shift.name} onChange={(e) => sh('name', e.target.value)} /></Field>
              <Field title="Starts"><input aria-label="Shift start" type="time" className={input} value={shift.start} onChange={(e) => sh('start', e.target.value)} /></Field>
              <Field title="Ends" hint="Same day only. Night shifts are not supported yet."><input aria-label="Shift end" type="time" className={input} value={shift.end} onChange={(e) => sh('end', e.target.value)} /></Field>
              <Field title="Grace (minutes)"><input aria-label="Shift grace" type="number" min="0" className={input} value={shift.graceMinutes} onChange={(e) => sh('graceMinutes', e.target.value)} /></Field>
              <Field title="Half day (minutes)"><input aria-label="Shift half day" type="number" className={input} value={shift.halfDayMinutes} onChange={(e) => sh('halfDayMinutes', e.target.value)} /></Field>
              <Field title="Full day (minutes)"><input aria-label="Shift full day" type="number" className={input} value={shift.fullDayMinutes} onChange={(e) => sh('fullDayMinutes', e.target.value)} /></Field>
              <div className="col-span-2 md:col-span-3 flex gap-2"><button type="button" onClick={saveShift} className={primary}>Save shift</button><button type="button" onClick={() => setShift(null)} className={ghost}>Cancel</button></div>
            </div>
          )}
        </div>
      )}

      {canConfig && (
        <div className={card}>
          <div className="flex items-center justify-between mb-4"><h3 className="text-foreground text-base font-black uppercase tracking-tight">Office locations</h3>
            <button type="button" onClick={() => setSite({ ...blankSite })} className={`${ghost} flex items-center gap-1`}><Plus size={14} /> Add location</button></div>
          {sites.length === 0 && <p className="text-xs font-bold text-muted-foreground">No locations yet. Add one to check where people punch from.</p>}
          <div className="space-y-2">
            {sites.map((s) => (
              <div key={s._id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl border border-border bg-muted/40">
                <div><p className="text-sm font-black text-foreground">{s.name}</p><p className="text-[11px] font-bold text-muted-foreground">{s.lat}, {s.lng} · within {s.radiusM} m</p></div>
                <div className="flex gap-2"><button type="button" aria-label={`Edit location ${s.name}`} onClick={() => setSite({ ...s })} className={ghost}><Pencil size={13} /></button><button type="button" aria-label={`Delete location ${s.name}`} onClick={() => delSite(s)} className={ghost}><Trash2 size={13} /></button></div>
              </div>
            ))}
          </div>
          {site && (
            <div className="mt-5 p-4 rounded-2xl border border-border grid grid-cols-2 md:grid-cols-4 gap-4">
              <Field title="Name"><input aria-label="Location name" className={input} value={site.name} onChange={(e) => st('name', e.target.value)} /></Field>
              <Field title="Latitude"><input aria-label="Location latitude" className={input} value={site.lat} onChange={(e) => st('lat', e.target.value)} /></Field>
              <Field title="Longitude"><input aria-label="Location longitude" className={input} value={site.lng} onChange={(e) => st('lng', e.target.value)} /></Field>
              <Field title="Radius (metres)"><input aria-label="Location radius" type="number" className={input} value={site.radiusM} onChange={(e) => st('radiusM', e.target.value)} /></Field>
              <div className="col-span-2 md:col-span-4 flex flex-wrap gap-2"><button type="button" onClick={here} className={`${ghost} flex items-center gap-1`}><MapPin size={13} /> Use my current location</button><button type="button" onClick={saveSite} className={primary}>Save location</button><button type="button" onClick={() => setSite(null)} className={ghost}>Cancel</button></div>
            </div>
          )}
        </div>
      )}

      {canConfig && (
        <div className={card}>
          <h3 className="text-foreground text-base font-black uppercase tracking-tight mb-1">People</h3>
          <p className="text-xs font-bold text-muted-foreground mb-4">Choose each person's shift and the locations they may punch from. No locations ticked means any of them.</p>
          <div className="space-y-3">
            {people.map((p) => (
              <div key={p._id} className="px-4 py-3 rounded-2xl border border-border bg-muted/40">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-black text-foreground">{p.name}{p.department ? <span className="text-[11px] font-bold text-muted-foreground"> · {p.department}</span> : null}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <select aria-label={`Shift for ${p.name}`} className={`${input} !w-auto`} value={p.shiftId} onChange={(e) => setPerson(p._id, { shiftId: e.target.value })}>
                      <option value="">Default shift</option>{shifts.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                    <button type="button" aria-label={`Save ${p.name}`} onClick={() => savePerson(p)} className={ghost}>Save</button>
                  </div>
                </div>
                {sites.length > 0 && <div className="mt-2 flex flex-wrap gap-4">{sites.map((s) => (
                  <label key={s._id} className="flex items-center gap-1.5 text-xs font-bold text-foreground cursor-pointer"><input type="checkbox" aria-label={`${p.name} at ${s.name}`} checked={p.siteIds.includes(s._id)} onChange={(e) => setPerson(p._id, { siteIds: e.target.checked ? [...p.siteIds, s._id] : p.siteIds.filter((x) => x !== s._id) })} />{s.name}</label>
                ))}</div>}
                {p.face && <p className="mt-2 text-[11px] font-bold text-muted-foreground">Face check: {p.face === 'Approved' ? 'active' : 'waiting for approval'} <button type="button" aria-label={`Delete face of ${p.name}`} onClick={() => removeFace(p)} className="underline ml-2">Delete face data</button></p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {canEdit && (
        <div className={card}>
          <h3 className="text-foreground text-base font-black uppercase tracking-tight mb-1">Add a missed punch</h3>
          <p className="text-xs font-bold text-muted-foreground mb-4">For a person who could not punch (for example a broken phone). It is recorded with your name and the reason.</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Field title="Person"><select aria-label="Person" className={input} value={man.employeeId} onChange={(e) => setMan({ ...man, employeeId: e.target.value })}><option value="">Choose…</option>{people.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}</select></Field>
            <Field title="Day"><input aria-label="Punch day" type="date" max={todayIST()} className={input} value={man.date} onChange={(e) => setMan({ ...man, date: e.target.value })} /></Field>
            <Field title="Time"><input aria-label="Punch time" type="time" className={input} value={man.time} onChange={(e) => setMan({ ...man, time: e.target.value })} /></Field>
            <Field title="In or out"><select aria-label="Punch type" className={input} value={man.type} onChange={(e) => setMan({ ...man, type: e.target.value })}><option value="in">In</option><option value="out">Out</option></select></Field>
            <Field title="Reason"><input aria-label="Punch reason" className={input} value={man.note} onChange={(e) => setMan({ ...man, note: e.target.value })} /></Field>
          </div>
          <button type="button" onClick={addPunch} className={`${primary} mt-5`}>Add punch</button>
        </div>
      )}
    </div>
  );
};

export default AttendanceSetup;
