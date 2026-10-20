import { useEffect, useState } from 'react';
import API from '../api/axiosConfig';

// The choices of a dropdown that is linked to company data ("employees", "sectors", "master:<list>").
const cache = new Map(); // source -> { at, options }
const TTL = 60 * 1000;

export default function useLookup(source) {
  const hit = source ? cache.get(source) : null;
  const [options, setOptions] = useState(hit && Date.now() - hit.at < TTL ? hit.options : []);
  useEffect(() => {
    if (!source) { setOptions([]); return undefined; }
    const h = cache.get(source);
    if (h && Date.now() - h.at < TTL) { setOptions(h.options); return undefined; }
    let live = true;
    API.get(`/config/lookup/${encodeURIComponent(source)}`)
      .then((r) => { const o = Array.isArray(r.data && r.data.options) ? r.data.options : []; cache.set(source, { at: Date.now(), options: o }); if (live) setOptions(o); })
      .catch(() => { if (live) setOptions([]); });
    return () => { live = false; };
  }, [source]);
  return options;
}
