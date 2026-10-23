import { fmtIST } from './istTime';
// Shared helpers for showing a delegation task's uploaded photos, used by
// BOTH the assigner side (ManageTasks.jsx) and the doer side
// (DoerChecklist.jsx) so there is exactly one implementation of "which
// photo belongs to which stage" and "how do we turn a stored fileUrl into
// something the browser can actually load" - not two copies that can
// drift apart.

const idOf = (x) => String(x?._id || x || '');

/**
 * Turns a stored fileUrl into something that reliably loads in the
 * browser, no matter which of three shapes it was saved in:
 *   1. A proper absolute URL (S3, or a correctly configured SERVER_URL) -
 *      left alone, unless its host is "localhost"/"127.0.0.1" (see #2).
 *   2. An absolute URL whose host is localhost - this is what the
 *      backend's local-disk fallback produces when the SERVER_URL env var
 *      was never set (utils/s3Uploader.js defaults to
 *      'http://localhost:5000'). That host only means anything on the
 *      machine running the backend itself, so for every real viewer it's
 *      a dead link. Rewritten to this app's own API host instead.
 *   3. A bare/relative path, or even a raw server filesystem path (e.g.
 *      multer's file.path before .location is set) - anything that isn't
 *      a parseable absolute URL. The "/uploads/..." portion is pulled out
 *      and prefixed with this app's API host.
 *
 * This NEVER changes what is stored in the database - it only changes how
 * the already-stored value is interpreted for display, same as the task
 * asked for ("fix it in the helper only").
 *
 * `apiBaseOverride` lets tests exercise this without Vite's import.meta.env
 * (which doesn't exist under plain Node); real callers always omit it and
 * get VITE_API_URL as configured for the running app.
 */
export function resolvePhotoUrl(url, apiBaseOverride) {
  if (!url) return '';
  const raw = apiBaseOverride !== undefined ? apiBaseOverride : (import.meta.env?.VITE_API_URL || '');
  const apiBase = String(raw || '').replace(/\/api\/?$/, '');

  try {
    const u = new URL(url);
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
      return apiBase ? apiBase + u.pathname + u.search : url;
    }
    return url; // a real, already-correct absolute URL (S3, a configured SERVER_URL, etc.)
  } catch {
    // Not parseable as an absolute URL - a relative path like
    // "/uploads/xyz.png", or a raw filesystem path like
    // "/srv/app/server/uploads/xyz.png". Either way, anchor on the
    // "/uploads/" segment (every evidence file lands there, per
    // utils/s3Uploader.js's local fallback and routes/taskRoutes.js's
    // app.use('/uploads', express.static(...))) and prefix the API host.
    const idx = url.indexOf('/uploads/');
    const relative = idx >= 0 ? url.slice(idx) : (url.startsWith('/') ? url : `/${url}`);
    return apiBase ? apiBase + relative : relative;
  }
}

/**
 * Groups a delegation task's photos under the history entry that
 * produced them, with a NEVER-DROP-A-PHOTO guarantee: every photo in
 * task.files ends up either attached to exactly one history entry, or in
 * the returned otherPhotos array. Nothing is ever silently discarded.
 *
 * Three tiers, most to least certain:
 *   1. The history entry already carries its own files[] (the newest
 *      shape - see controllers/taskController.js's respondToTask/
 *      createTask). Used as-is, no guessing.
 *   2. A flat task.files record tagged with { stage, uploadedBy } (the
 *      shape added just before entry-level files[] existed) - matched by
 *      an EXACT action + performer match against a history entry.
 *   3. Fully legacy files with neither stage nor uploadedBy - assigned to
 *      whichever history entry's timestamp is NEAREST to the photo's
 *      uploadedAt, as long as that gap is within `windowMs` (default 2
 *      minutes, matching how close together a single request's history
 *      push and file pushes actually land in practice). Anything with no
 *      close-enough entry (or no history at all) goes to otherPhotos
 *      instead of disappearing.
 */
export function groupPhotosByHistory(task, { windowMs = 2 * 60 * 1000 } = {}) {
  const history = Array.isArray(task?.history) ? task.history : [];
  const allFiles = Array.isArray(task?.files) ? task.files : [];
  const buckets = history.map(() => []);
  const assigned = new Set();

  // Tier 1: explicit per-entry files.
  history.forEach((h, hi) => {
    if (Array.isArray(h.files) && h.files.length > 0) {
      buckets[hi].push(...h.files.map((f) => ({ ...f, _matchTier: 'explicit' })));
      // Also mark the matching flat task.files record(s) used, by fileUrl,
      // so a task that has BOTH the new history[].files AND the older
      // flat tagging doesn't show the same photo twice (once under the
      // entry, once again in "Other photos").
      allFiles.forEach((f, fi) => {
        if (!assigned.has(fi) && h.files.some((hf) => hf.fileUrl === f.fileUrl)) assigned.add(fi);
      });
    }
  });

  // Tier 2: flat files with an exact stage+uploadedBy match.
  allFiles.forEach((f, fi) => {
    if (assigned.has(fi)) return;
    if (!f.stage || !f.uploadedBy) return;
    const hi = history.findIndex((h) => h.action === f.stage && idOf(h.performedBy) === idOf(f.uploadedBy));
    if (hi >= 0) {
      buckets[hi].push({ ...f, _matchTier: 'tagged' });
      assigned.add(fi);
    }
  });

  // Tier 3: fully legacy files - nearest history timestamp, within window.
  allFiles.forEach((f, fi) => {
    if (assigned.has(fi)) return;
    if (f.stage || f.uploadedBy) return; // was tagged but didn't match any entry above - leave for otherPhotos, don't guess further
    if (!f.uploadedAt || history.length === 0) return;
    const t = new Date(f.uploadedAt).getTime();
    if (Number.isNaN(t)) return;
    let bestHi = -1, bestDiff = Infinity;
    history.forEach((h, hi) => {
      if (!h.timestamp) return;
      const ht = new Date(h.timestamp).getTime();
      if (Number.isNaN(ht)) return;
      const diff = Math.abs(ht - t);
      if (diff < bestDiff) { bestDiff = diff; bestHi = hi; }
    });
    if (bestHi >= 0 && bestDiff <= windowMs) {
      buckets[bestHi].push({ ...f, _matchTier: 'nearest' });
      assigned.add(fi);
    }
  });

  const entries = history.map((h, hi) => ({ ...h, photos: buckets[hi] }));
  const otherPhotos = allFiles.filter((f, fi) => !assigned.has(fi));

  // Sanity invariant (never-drop guarantee): every input file is
  // accounted for exactly once across entries + otherPhotos.
  return { entries, otherPhotos };
}

/** All of a task's photos, in one flat list, for the "open full gallery" action. */
export function allTaskPhotos(task) {
  return Array.isArray(task?.files) ? task.files : [];
}

/** Caption shown in the lightbox/gallery: who sent it, at which stage, when. */
export function photoCaption(photo, task) {
  const who = photo?.uploadedBy?.name || task?.assignerId?.name || 'Someone';
  const stage = photo?.stage || photo?._historyAction || 'Task Created';
  const when = photo?.uploadedAt ? fmtIST(photo.uploadedAt) : '';
  return `${stage} — ${who}${when ? ` · ${when}` : ''}`;
}
