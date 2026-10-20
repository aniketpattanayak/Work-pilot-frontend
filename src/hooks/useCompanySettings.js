import { useEffect, useState } from 'react';
import API from '../api/axiosConfig';

// On/off switches of the signed-in user's company. Everything defaults to ON
// (today's behaviour) until the answer arrives or if it cannot be loaded.
let cache = null;
let inflight = null;
const listeners = new Set();

const load = () => {
  if (!inflight) {
    inflight = API.get('/config/settings/effective')
      .then((r) => { cache = (r.data && r.data.switches) || {}; })
      .catch(() => { cache = cache || {}; })
      .finally(() => { inflight = null; listeners.forEach((fn) => fn(cache)); });
  }
  return inflight;
};

export const invalidateCompanySettings = () => { cache = null; load(); };

export default function useCompanySettings() {
  const [sw, setSw] = useState(cache || {});
  useEffect(() => {
    listeners.add(setSw);
    if (cache === null) load(); else setSw(cache);
    return () => { listeners.delete(setSw); };
  }, []);
  // isOn('delegation_doerRevise') -> true unless the company switched it off
  return { switches: sw, isOn: (key) => sw[key] !== false };
}
