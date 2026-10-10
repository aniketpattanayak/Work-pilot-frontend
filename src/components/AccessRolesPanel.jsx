import React, { useState, useEffect, useCallback } from 'react';
import API from '../api/axiosConfig';
import { ShieldCheck, Plus, Save, Trash2, Pencil, X } from 'lucide-react';
import { dialog } from './Dialog';

/**
 * Roles & permissions for Attendance, Leave and Payroll (Settings, Admin only).
 * An Admin makes roles ("Payroll Officer", "Branch HR"...), ticks what each role may do and how far
 * it reaches, then gives the roles to people. Admins do not get payroll access unless they give it.
 */
const SCOPE_LABEL = { self: 'Only themselves', team: 'Their team', department: 'Their department', branch: 'Their branch', company: 'Whole company' };
const blank = { key: null, name: '', description: '', permissions: [] };

const AccessRolesPanel = () => {
  const [catalog, setCatalog] = useState([]);
  const [scopes, setScopes] = useState([]);
  const [roles, setRoles] = useState([]);
  const [modules, setModules] = useState({});
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null); // { ok, text }
  const [personId, setPersonId] = useState('');
  const [personKeys, setPersonKeys] = useState([]);

  const load = useCallback(async () => {
    try {
      setLoadError('');
      const [c, r] = await Promise.all([API.get('/tasks/access/catalog'), API.get('/tasks/access/roles')]);
      setCatalog(c.data?.catalog || []);
      setScopes(c.data?.scopes || []);
      setRoles(r.data?.roles || []);
      setModules(r.data?.modules || {});
      setPeople(r.data?.employees || []);
    } catch (e) {
      setLoadError(e.response?.data?.message || 'Could not load roles.');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const flash = (ok, text) => { setMsg({ ok, text }); setTimeout(() => setMsg(null), 4000); };

  const permOf = (key) => editing?.permissions.find((p) => p.key === key);
  const toggle = (key, scoped) => setEditing((e) => {
    const has = e.permissions.some((p) => p.key === key);
    return { ...e, permissions: has ? e.permissions.filter((p) => p.key !== key) : [...e.permissions, { key, scope: scoped ? 'self' : 'company' }] };
  });
  const setScope = (key, scope) => setEditing((e) => ({ ...e, permissions: e.permissions.map((p) => (p.key === key ? { ...p, scope } : p)) }));

  const saveRole = async () => {
    if (!editing.name.trim() || editing.name.trim().length < 2) return flash(false, 'Give the role a name (at least 2 letters).');
    if (editing.permissions.length === 0) return flash(false, 'Tick at least one permission.');
    setSaving(true);
    try {
      const body = { name: editing.name.trim(), description: editing.description.trim(), permissions: editing.permissions };
      if (editing.key) await API.put(`/tasks/access/roles/${editing.key}`, body); else await API.post('/tasks/access/roles', body);
      setEditing(null);
      await load();
      flash(true, 'Role saved.');
    } catch (e) { flash(false, e.response?.data?.message || 'Could not save the role.'); }
    finally { setSaving(false); }
  };

  const removeRole = async (r) => {
    if (!(await dialog.confirm(`Delete the role "${r.name}"? This cannot be undone.`, { title: 'Delete role', danger: true, confirmText: 'Delete' }))) return;
    try { await API.delete(`/tasks/access/roles/${r.key}`); await load(); flash(true, 'Role deleted.'); }
    catch (e) { flash(false, e.response?.data?.message || 'Could not delete the role.'); }
  };

  const pickPerson = (id) => {
    setPersonId(id);
    setPersonKeys(people.find((p) => p._id === id)?.accessRoleKeys || []);
  };
  const savePerson = async () => {
    if (!personId) return;
    try {
      await API.put('/tasks/access/assign', { employeeId: personId, roleKeys: personKeys });
      await load();
      flash(true, 'Access updated.');
    } catch (e) { flash(false, e.response?.data?.message || 'Could not update access.'); }
  };

  const anyOn = Object.values(modules).some(Boolean);
  const card = 'bg-card backdrop-blur-xl rounded-[2rem] md:rounded-[3rem] border border-border p-6 md:p-10 shadow-2xl';

  if (loading) return null;
  return (
    <section className={`${card} mt-8`}>
      <h3 className="text-foreground text-lg md:text-xl font-black flex items-center gap-3 mb-2 uppercase tracking-tight">
        <ShieldCheck size={22} className="text-primary" /> Roles &amp; access
      </h3>
      <p className="text-xs text-muted-foreground font-bold mb-6">Decide who can see and do what in Attendance, Leave and Payroll. Payroll is closed to everyone, Admins included, until you give it to a role.</p>

      {loadError && <p className="text-sm font-bold text-red-600 dark:text-red-400">{loadError}</p>}
      {!loadError && !anyOn && (
        <p className="mb-6 text-xs font-bold px-4 py-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">
          Attendance, Leave and Payroll are not switched on for your company yet. You can prepare your roles now; they start working when the modules are switched on.
        </p>
      )}
      {msg && <p className={`mb-4 text-xs font-black ${msg.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{msg.text}</p>}

      {!loadError && (
        <>
          <div className="flex items-center justify-between mb-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Roles</label>
            {!editing && (
              <button type="button" onClick={() => setEditing({ ...blank })} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest">
                <Plus size={14} /> New role
              </button>
            )}
          </div>

          {roles.length === 0 && !editing && <p className="text-xs text-muted-foreground font-bold">No roles yet. Example: &ldquo;Payroll Officer&rdquo;, &ldquo;Branch HR&rdquo;.</p>}
          <div className="space-y-2 mb-6">
            {roles.map((r) => (
              <div key={r.key} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl border border-border bg-muted/40">
                <div className="min-w-0">
                  <p className="text-sm font-black text-foreground truncate">{r.name}</p>
                  <p className="text-[11px] text-muted-foreground font-bold">{r.permissions.length} permissions &middot; {r.people} {r.people === 1 ? 'person' : 'people'}{r.description ? ` · ${r.description}` : ''}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" aria-label={`Edit ${r.name}`} onClick={() => setEditing({ key: r.key, name: r.name, description: r.description || '', permissions: r.permissions.map((p) => ({ ...p })) })} className="p-2 rounded-xl border border-border hover:bg-muted"><Pencil size={14} /></button>
                  <button type="button" aria-label={`Delete ${r.name}`} onClick={() => removeRole(r)} className="p-2 rounded-xl border border-border hover:bg-red-500/10 text-red-600 dark:text-red-400"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>

          {editing && (
            <div className="mb-8 p-4 md:p-6 rounded-3xl border border-border bg-muted/30">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-black text-foreground uppercase tracking-tight">{editing.key ? 'Edit role' : 'New role'}</p>
                <button type="button" aria-label="Close editor" onClick={() => setEditing(null)} className="p-2 rounded-xl hover:bg-muted"><X size={16} /></button>
              </div>
              <div className="grid md:grid-cols-2 gap-3 mb-5">
                <input value={editing.name} maxLength={40} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Role name" aria-label="Role name" className="px-4 py-3 rounded-2xl border border-border bg-background text-foreground text-sm font-bold" />
                <input value={editing.description} maxLength={200} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="What this role is for (optional)" aria-label="Role description" className="px-4 py-3 rounded-2xl border border-border bg-background text-foreground text-sm font-bold" />
              </div>
              <div className="space-y-5">
                {catalog.map((m) => (
                  <div key={m.module}>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">
                      {m.label}{m.sensitive && <span className="ml-2 px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 normal-case tracking-normal">Sensitive</span>}
                    </p>
                    <div className="space-y-1">
                      {m.actions.map((a) => {
                        const key = `${m.module}.${a.key}`;
                        const p = permOf(key);
                        return (
                          <div key={key} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl hover:bg-muted/40">
                            <label className="flex items-center gap-3 text-sm font-bold text-foreground cursor-pointer">
                              <input type="checkbox" checked={!!p} onChange={() => toggle(key, a.scoped)} aria-label={`${m.label}: ${a.label}`} />
                              {a.label}
                            </label>
                            {p && a.scoped && (
                              <select value={p.scope} onChange={(e) => setScope(key, e.target.value)} aria-label={`Reach of ${a.label}`} className="px-3 py-1.5 rounded-xl border border-border bg-background text-foreground text-xs font-bold">
                                {scopes.map((s) => <option key={s} value={s}>{SCOPE_LABEL[s] || s}</option>)}
                              </select>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={saveRole} disabled={saving} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest disabled:opacity-50"><Save size={14} /> {saving ? 'Saving...' : 'Save role'}</button>
                <button type="button" onClick={() => setEditing(null)} className="px-5 py-3 rounded-xl border border-border text-[10px] font-black uppercase tracking-widest text-foreground">Cancel</button>
              </div>
            </div>
          )}

          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] block mb-3">Give roles to a person</label>
          <div className="grid md:grid-cols-2 gap-3">
            <select value={personId} onChange={(e) => pickPerson(e.target.value)} aria-label="Choose a person" className="px-4 py-3 rounded-2xl border border-border bg-background text-foreground text-sm font-bold">
              <option value="">Choose a person...</option>
              {people.map((p) => <option key={p._id} value={p._id}>{p.name}{p.department ? ` (${p.department})` : ''}</option>)}
            </select>
            <div className="flex flex-wrap items-center gap-3">
              {personId && roles.length === 0 && <span className="text-xs text-muted-foreground font-bold">Make a role first.</span>}
              {personId && roles.map((r) => (
                <label key={r.key} className="flex items-center gap-2 text-sm font-bold text-foreground cursor-pointer">
                  <input type="checkbox" checked={personKeys.includes(r.key)} onChange={() => setPersonKeys((k) => (k.includes(r.key) ? k.filter((x) => x !== r.key) : [...k, r.key]))} aria-label={`Give ${r.name}`} />
                  {r.name}
                </label>
              ))}
            </div>
          </div>
          {personId && <button type="button" onClick={savePerson} className="mt-4 flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest"><Save size={14} /> Save access</button>}
        </>
      )}
    </section>
  );
};

export default AccessRolesPanel;
