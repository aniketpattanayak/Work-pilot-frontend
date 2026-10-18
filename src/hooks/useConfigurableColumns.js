import { useCallback, useEffect, useMemo, useState } from 'react';
import API from '../api/axiosConfig';
import useCustomFields from './useCustomFields';
import { resolveColumns, toPreferencePayload, minWidthOf } from '../utils/customFieldsConfig';

const isAdminUser = () => {
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    return !!(u.isSuperAdmin || (Array.isArray(u.roles) && u.roles.includes('Admin')));
  } catch (e) { return false; }
};

// Phones use the screen's normal columns (their card layout depends on a fixed cell order).
const usePhone = (on) => {
  const q = '(max-width: 768px)';
  const [phone, setPhone] = useState(() => (on && typeof window !== 'undefined' && window.matchMedia) ? window.matchMedia(q).matches : false);
  useEffect(() => {
    if (!on || !window.matchMedia) return undefined;
    const m = window.matchMedia(q);
    const h = () => setPhone(m.matches);
    h(); m.addEventListener ? m.addEventListener('change', h) : m.addListener(h);
    return () => { m.removeEventListener ? m.removeEventListener('change', h) : m.removeListener(h); };
  }, [on]);
  return phone;
};

/**
 * The columns a table should show: its built-in ones + the company's custom fields,
 * arranged by the saved layout. If anything fails to load you get the built-in columns.
 *   const ctl = useConfigurableColumns({ tableKey: 'employee_table', columns, customFieldEntity: 'employee' })
 */
export default function useConfigurableColumns({ tableKey, columns, customFieldEntity, phoneUsesDefaults = false }) {
  const { fields } = useCustomFields(customFieldEntity);
  const [saved, setSaved] = useState({ columns: [], scope: 'default' });
  const [draft, setDraft] = useState(null);       // all-columns array while the customize panel is open
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const phone = usePhone(phoneUsesDefaults);

  useEffect(() => {
    let live = true;
    if (!tableKey) return undefined;
    API.get(`/config/table-preferences/${tableKey}`)
      .then((r) => { if (live) setSaved({ columns: Array.isArray(r.data && r.data.columns) ? r.data.columns : [], scope: (r.data && r.data.scope) || 'default' }); })
      .catch(() => { /* keep the built-in layout */ });
    return () => { live = false; };
  }, [tableKey]);

  const resolved = useMemo(
    () => resolveColumns(columns, phone ? [] : fields, phone ? [] : saved.columns),
    [columns, fields, saved.columns, phone]
  );
  const shown = draft ? { all: draft, visible: draft.filter((c) => c.isVisible) } : resolved;

  const gridTemplate = shown.visible.map((c) => c.width || '1fr').join(' ');
  const minWidth = shown.visible.reduce((n, c) => n + minWidthOf(c.width), 0);

  const startEdit = useCallback(() => { setError(''); setDraft(resolved.all.map((c) => ({ ...c }))); }, [resolved]);
  const cancelEdit = useCallback(() => { setDraft(null); setError(''); }, []);
  const toggle = useCallback((key) => setDraft((d) => d && d.map((c) => (c.key === key && !c.locked && !c.pinEnd ? { ...c, isVisible: !c.isVisible } : c))), []);
  const move = useCallback((key, dir) => setDraft((d) => {
    if (!d) return d;
    const movable = d.filter((c) => !c.pinEnd);
    const pinned = d.filter((c) => c.pinEnd);
    const i = movable.findIndex((c) => c.key === key); const j = i + dir;
    if (i < 0 || j < 0 || j >= movable.length) return d;
    const next = movable.slice(); [next[i], next[j]] = [next[j], next[i]];
    return [...next, ...pinned];
  }), []);

  const save = useCallback(async (scope = 'user') => {
    if (!draft) return false;
    setBusy(true); setError('');
    const payload = toPreferencePayload(draft);
    try {
      const r = await API.post(`/config/table-preferences/${tableKey}`, { columns: payload, scope: scope === 'company' ? 'company' : undefined });
      setSaved({ columns: r.data.columns || payload, scope: r.data.scope || scope });
      setDraft(null);
      return true;
    } catch (e) {
      // Still apply it for this visit, and say so.
      setSaved({ columns: payload, scope });
      setDraft(null);
      setError('Could not save your layout. It will reset when you reload.');
      return false;
    } finally { setBusy(false); }
  }, [draft, tableKey]);

  const reset = useCallback(async (scope = 'user') => {
    setBusy(true); setError('');
    try { await API.delete(`/config/table-preferences/${tableKey}`, { params: scope === 'company' ? { scope: 'company' } : {} }); }
    catch (e) { setError('Could not reset on the server.'); }
    try {
      const r = await API.get(`/config/table-preferences/${tableKey}`);
      setSaved({ columns: Array.isArray(r.data && r.data.columns) ? r.data.columns : [], scope: (r.data && r.data.scope) || 'default' });
    } catch (e) { setSaved({ columns: [], scope: 'default' }); }
    setDraft(null); setBusy(false);
  }, [tableKey]);

  return {
    columns: shown.visible, allColumns: shown.all, customFields: fields, gridTemplate, minWidth,
    editing: !!draft, startEdit, cancelEdit, toggle, move, save, reset, busy, error, scope: saved.scope, isAdmin: isAdminUser(), phone,
  };
}
