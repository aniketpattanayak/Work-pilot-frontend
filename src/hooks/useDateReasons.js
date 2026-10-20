import { useEffect, useState } from 'react';
import API from '../api/axiosConfig';

// The list of reasons a person picks from when a deadline changes (the company can edit it in Settings).
const FALLBACK = ['Waiting for client', 'Waiting for another department', 'Sick or on leave', 'Priority changed', 'My own delay', 'Assigner changed the work', 'Other'];
let cache = null;
let inflight = null;

export const invalidateDateReasons = () => { cache = null; inflight = null; };

export default function useDateReasons() {
  const [data, setData] = useState(cache || { reasons: FALLBACK, required: true });
  useEffect(() => {
    let live = true;
    if (cache) { setData(cache); return undefined; }
    if (!inflight) {
      inflight = API.get('/tasks/date-reasons')
        .then((r) => { cache = { reasons: Array.isArray(r.data && r.data.reasons) && r.data.reasons.length ? r.data.reasons : FALLBACK, required: r.data ? r.data.required !== false : true }; return cache; })
        .catch(() => ({ reasons: FALLBACK, required: true }));
    }
    inflight.then((d) => { if (live) setData(d); });
    return () => { live = false; };
  }, []);
  return data;
}
