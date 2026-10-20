import { useEffect, useState } from 'react';
import API from '../api/axiosConfig';

// How a form should look for this company: which built-in fields are renamed / hidden / required,
// the order of every field, and the company's own extra fields.
// Never blocks or breaks a form: while loading (or if the request fails) every field shows exactly
// as before, with its normal label, in its normal place.
const cache = new Map(); // form -> { at, data }
const TTL = 60 * 1000;

export function invalidateFormLayout(form) {
  if (form) cache.delete(form); else cache.clear();
}

const EMPTY = { builtin: [], custom: [], order: [] };

export default function useFormLayout(form) {
  const hit = cache.get(form);
  const [data, setData] = useState(hit && Date.now() - hit.at < TTL ? hit.data : null);

  useEffect(() => {
    if (!form) return undefined;
    const h = cache.get(form);
    if (h && Date.now() - h.at < TTL) { setData(h.data); return undefined; }
    let live = true;
    API.get(`/config/forms/${form}`)
      .then((r) => { const d = r.data || EMPTY; cache.set(form, { at: Date.now(), data: d }); if (live) setData(d); })
      .catch(() => { if (live) setData(EMPTY); });
    return () => { live = false; };
  }, [form]);

  const d = data || EMPTY;
  const by = Object.fromEntries((d.builtin || []).map((b) => [b.key, b]));
  const pos = Object.fromEntries((d.order || []).map((k, i) => [k, i + 1]));

  return {
    ready: !!data,
    customFields: (d.custom || []).filter((f) => f.isActive !== false),
    // text shown for a field (the company's own wording, else the standard one)
    label: (key, standard) => (by[key] && by[key].label) || standard,
    hidden: (key) => !!(by[key] && by[key].hidden),
    required: (key, standard = false) => (by[key] ? !!by[key].required : standard),
    // CSS "order" of a field inside its form container (the container must hold only fields)
    style: (key) => (pos[key] ? { order: pos[key] } : undefined),
    // values = { fieldKey: currentValue } for the built-in fields the form can check; returns a message or ''
    firstMissing: (values) => {
      for (const b of d.builtin || []) {
        if (b.hidden || !b.required || b.fixedRequired) continue;
        if (!Object.prototype.hasOwnProperty.call(values, b.key)) continue;
        const v = values[b.key];
        if (v === undefined || v === null || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && !v.length)) return `Please fill in "${b.label}".`;
      }
      return '';
    },
  };
}
