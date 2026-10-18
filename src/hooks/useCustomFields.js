import { useEffect, useState } from 'react';
import API from '../api/axiosConfig';

// Tenant-defined fields for one screen ("employee", "delegation" or "task").
// Never throws and never blocks the screen: while loading, or if the request fails,
// the list is simply empty and the screen shows its normal fields/columns.
const cache = new Map(); // entity -> { at, fields }
const TTL = 60 * 1000;

export function invalidateCustomFields(entity) {
  if (entity) cache.delete(entity); else cache.clear();
}

export default function useCustomFields(entity) {
  const fresh = entity ? cache.get(entity) : null;
  const [fields, setFields] = useState(fresh && Date.now() - fresh.at < TTL ? fresh.fields : []);
  const [loading, setLoading] = useState(!!entity && !(fresh && Date.now() - fresh.at < TTL));

  useEffect(() => {
    if (!entity) { setFields([]); setLoading(false); return undefined; }
    const hit = cache.get(entity);
    if (hit && Date.now() - hit.at < TTL) { setFields(hit.fields); setLoading(false); return undefined; }
    let live = true;
    setLoading(true);
    API.get(`/config/fields/${entity}`)
      .then((r) => {
        const list = Array.isArray(r.data && r.data.fields) ? r.data.fields : [];
        cache.set(entity, { at: Date.now(), fields: list });
        if (live) setFields(list);
      })
      .catch(() => { if (live) setFields([]); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [entity]);

  return { fields, loading };
}
