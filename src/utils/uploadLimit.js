// Shared upload rules for every file picker in the app.
//  - ANY file type is accepted, except a short list of executable / script types
//    (the server enforces the same list).
//  - The maximum size per file is set per company by the Super Admin
//    (SuperAdmin -> company -> Controls -> Upload size limit) and is fetched from
//    GET /tasks/upload-config. Until it loads (or if it fails) 10 MB is assumed;
//    the server is always the final judge.
import { useState, useEffect } from 'react';
import API from '../api/axiosConfig';

export const DEFAULT_MAX_MB = 10;
export const BLOCKED_EXT = ['exe', 'bat', 'cmd', 'com', 'scr', 'msi', 'dll', 'sh', 'ps1', 'vbs', 'jar', 'php', 'html', 'htm', 'xhtml', 'svg', 'js', 'mjs'];
const IMAGE_EXT = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic', 'heif', 'avif'];

let cache = { mb: DEFAULT_MAX_MB, at: 0 };
let inflight = null;

export function loadUploadLimit() {
  if (cache.at && Date.now() - cache.at < 60000) return Promise.resolve(cache.mb);
  if (!inflight) {
    inflight = API.get('/tasks/upload-config')
      .then((r) => { const mb = Number(r?.data?.maxFileMb); cache = { mb: mb > 0 ? mb : DEFAULT_MAX_MB, at: Date.now() }; return cache.mb; })
      .catch(() => cache.mb)
      .finally(() => { inflight = null; });
  }
  return inflight;
}

/** Current company's per-file limit in MB (re-renders once it has loaded). */
export function useUploadLimit() {
  const [mb, setMb] = useState(cache.mb);
  useEffect(() => {
    let alive = true;
    loadUploadLimit().then((v) => { if (alive) setMb(v); });
    return () => { alive = false; };
  }, []);
  return mb;
}

export const fileExt = (name) => {
  const clean = String(name || '').split('?')[0].split('#')[0];
  const i = clean.lastIndexOf('.');
  return i >= 0 ? clean.slice(i + 1).toLowerCase() : '';
};

/** Images (and files with no extension, which are legacy camera photos) show as pictures; everything else as a file tile. */
export const isImageName = (name) => {
  const e = fileExt(name);
  return !e || IMAGE_EXT.includes(e);
};
export const isImageFile = (f) => (f?.type ? f.type.startsWith('image/') : isImageName(f?.name));

/** Splits picked files into those that can be sent and human-readable problems. */
export function checkFiles(files, maxMb = DEFAULT_MAX_MB) {
  const ok = [];
  const problems = [];
  Array.from(files || []).forEach((f) => {
    const e = fileExt(f.name);
    if (BLOCKED_EXT.includes(e)) problems.push('"' + f.name + '" (.' + e + ') is not allowed for security reasons.');
    else if (f.size > maxMb * 1024 * 1024) problems.push('"' + f.name + '" is larger than the ' + maxMb + ' MB limit set for your company.');
    else if (f.size === 0) problems.push('"' + f.name + '" is empty.');
    else ok.push(f);
  });
  return { ok, problems };
}

export const uploadHint = (maxMb) => 'Any file (images, PDF, Word, Excel, CSV, ZIP...) - max ' + maxMb + ' MB each';
