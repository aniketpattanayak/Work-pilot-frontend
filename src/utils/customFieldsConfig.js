// Pure helpers for company-defined custom fields and saved table columns.
// No React in here so they can be unit-tested with plain node (customFieldsConfig.test.mjs).

// Value stored on a record -> text for a table cell / summary. Never throws.
export function formatCustomValue(def, value) {
  if (value === undefined || value === null || value === '') return '—';
  switch (def && def.fieldType) {
    case 'boolean': return value === true || value === 'true' ? 'Yes' : 'No';
    case 'date': {
      const s = String(value).slice(0, 10);
      const d = new Date(s + 'T00:00:00');
      return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
    }
    case 'number': return Number.isFinite(Number(value)) ? String(Number(value)) : String(value);
    default: return String(value);
  }
}

// Value of one custom field on a record, whatever shape the record has (missing, null, plain object, Map).
export function getCustomValue(record, fieldName) {
  const cf = record && record.customFields;
  if (!cf || typeof cf !== 'object') return undefined;
  if (typeof cf.get === 'function') return cf.get(fieldName);
  return cf[fieldName];
}

// Non-empty custom values of a record as [{def, text}] (used for phone cards).
export function customSummary(defs, record) {
  return (Array.isArray(defs) ? defs : [])
    .map((def) => ({ def, value: getCustomValue(record, def.fieldName) }))
    .filter((x) => x.value !== undefined && x.value !== null && x.value !== '')
    .map((x) => ({ def: x.def, text: formatCustomValue(x.def, x.value) }));
}

export const CUSTOM_KEY_PREFIX = 'cf_';

// A custom field as a table column.
export function customFieldToColumn(def) {
  return {
    key: CUSTOM_KEY_PREFIX + def.fieldName,
    label: def.fieldLabel,
    width: 'minmax(120px, 1fr)',
    cellClassName: 'min-w-0 truncate text-[11px] font-semibold text-slate-600 dark:text-slate-400',
    custom: true,
    render: (row) => formatCustomValue(def, getCustomValue(row, def.fieldName)),
  };
}

/**
 * Builds the columns to show.
 *  defaults  - the screen's built-in columns, in their normal order. A column with pinEnd:true
 *              (e.g. Actions) stays last and always visible.
 *  customDefs- active custom field definitions (may be empty / not an array).
 *  prefCols  - saved preference columns [{key,isVisible,order}] (may be empty / junk).
 * With no saved preference the result is the built-in columns, then the custom ones (before pinEnd).
 * Saved columns that no longer exist are ignored; new columns not in the saved list are added
 * at the end (visible) so nothing a company just configured stays hidden by an older layout.
 * Returns { all, visible } where each item has isVisible.
 */
export function resolveColumns(defaults, customDefs, prefCols) {
  const base = [...(Array.isArray(defaults) ? defaults : [])];
  const custom = (Array.isArray(customDefs) ? customDefs : []).map(customFieldToColumn);
  const pinned = base.filter((c) => c.pinEnd);
  const movable = [...base.filter((c) => !c.pinEnd), ...custom];

  const prefs = new Map();
  (Array.isArray(prefCols) ? prefCols : []).forEach((p, i) => {
    if (p && typeof p.key === 'string') prefs.set(p.key, { isVisible: p.isVisible !== false, order: Number.isFinite(Number(p.order)) ? Number(p.order) : i, width: p.width });
  });

  let ordered;
  if (prefs.size === 0) {
    ordered = movable.map((c) => ({ ...c, isVisible: true }));
  } else {
    const known = []; const fresh = [];
    movable.forEach((c, idx) => {
      const p = prefs.get(c.key);
      if (p) known.push({ ...c, isVisible: c.locked ? true : p.isVisible, _o: p.order, _i: idx, ...(p.width ? { width: `${p.width}px` } : {}) });
      else fresh.push({ ...c, isVisible: true });
    });
    known.sort((a, b) => (a._o - b._o) || (a._i - b._i));
    ordered = [...known, ...fresh].map(({ _o, _i, ...c }) => c);
  }
  const all = [...ordered, ...pinned.map((c) => ({ ...c, isVisible: true }))];
  return { all, visible: all.filter((c) => c.isVisible) };
}

// Columns in the shape the preferences API stores.
export function toPreferencePayload(allColumns) {
  return (allColumns || []).filter((c) => !c.pinEnd).map((c, i) => ({ key: c.key, label: c.label, isVisible: c.locked ? true : c.isVisible !== false, order: i }));
}

// Pixel floor for a grid so columns never crush: fr -> 110, px/minmax -> their pixel size.
export function minWidthOf(width) {
  const w = String(width || '1fr');
  const m = w.match(/(\d+(?:\.\d+)?)px/);
  return m ? Number(m[1]) : 110;
}
