// Plain Node unit tests for src/utils/taskPhotos.js (no test runner/jsdom
// installed in this project - these import the real util directly and
// run with `node src/utils/taskPhotos.test.mjs`). Covers:
//   - resolvePhotoUrl: the localhost rewrite, the raw-filesystem-path
//     rewrite, and leaving an already-correct absolute URL alone.
//   - groupPhotosByHistory: the nearest-timestamp assignment for legacy
//     (no stage/uploadedBy) photos, the never-drop-a-photo guarantee
//     across all three input shapes, and the within-window vs
//     outside-window boundary.
import assert from 'node:assert/strict';

// Vite's import.meta.env doesn't exist under plain Node, so resolvePhotoUrl
// takes an explicit apiBaseOverride param for testing (see its jsdoc) -
// every call below passes it rather than relying on any global env.
const API_BASE = 'https://api.lrbcloud.ai/api';

const results = [];
function check(name, cond, detail) {
  const pass = !!cond;
  results.push({ name, pass, detail: pass ? undefined : detail });
  console.log(pass ? 'PASS' : 'FAIL', '-', name, pass ? '' : String(JSON.stringify(detail)).slice(0, 300));
}

// --- Load the module under test with import.meta.env shimmed ---
// Vite statically replaces import.meta.env at build time; under plain
// Node, import.meta.env is simply undefined. The module already guards
// with `import.meta.env || {}`-equivalent access via String(...), so we
// only need globalThis to carry VITE_API_URL for environments that do
// check it directly. To keep taskPhotos.js itself unchanged (and not
// dual-purposed for test-only branches), this test file defines a tiny
// local copy of the two pure functions' CONTRACT via the real import,
// relying on Node 20+'s support for import.meta.env as an empty object
// when unset (verified below - if this assumption is ever wrong, this
// test will fail loudly rather than silently pass).
const mod = await import('./taskPhotos.js');
const { resolvePhotoUrl, groupPhotosByHistory } = mod;

// ===== resolvePhotoUrl =====

check(
  'resolvePhotoUrl: leaves an already-correct absolute URL (e.g. S3) alone',
  resolvePhotoUrl('https://my-bucket.s3.amazonaws.com/uploads/abc.png', API_BASE) === 'https://my-bucket.s3.amazonaws.com/uploads/abc.png'
);

{
  const out = resolvePhotoUrl('http://localhost:5000/uploads/abc.png', API_BASE);
  check(
    'resolvePhotoUrl: rewrites a localhost URL (the SERVER_URL-unset fallback) to the API host',
    out === 'https://api.lrbcloud.ai/uploads/abc.png',
    out
  );
}

{
  const out = resolvePhotoUrl('/home/ubuntu/app/server/uploads/16999-xyz.png', API_BASE);
  check(
    'resolvePhotoUrl: rewrites a raw server filesystem path by anchoring on /uploads/',
    out === 'https://api.lrbcloud.ai/uploads/16999-xyz.png',
    out
  );
}

check('resolvePhotoUrl: empty/undefined input returns empty string, never throws', resolvePhotoUrl(undefined, API_BASE) === '' && resolvePhotoUrl('', API_BASE) === '');

// ===== groupPhotosByHistory =====

// Tier 1: brand-new shape - history entry carries its own files[].
{
  const task = {
    history: [
      { action: 'Task Created', performedBy: { _id: 'admin1' }, timestamp: '2026-01-01T10:00:00Z', files: [{ fileName: 'a.png', fileUrl: 'u/a.png' }] },
      { action: 'Completed', performedBy: { _id: 'doer1' }, timestamp: '2026-01-02T10:00:00Z', files: [{ fileName: 'b.png', fileUrl: 'u/b.png' }] },
    ],
    files: [{ fileName: 'a.png', fileUrl: 'u/a.png' }, { fileName: 'b.png', fileUrl: 'u/b.png' }],
  };
  const { entries, otherPhotos } = groupPhotosByHistory(task);
  check('groupPhotosByHistory (new shape): each entry gets exactly its own photo', entries[0].photos.length === 1 && entries[1].photos.length === 1, entries);
  check('groupPhotosByHistory (new shape): no double-counting into otherPhotos', otherPhotos.length === 0, otherPhotos);
}

// Tier 2: tagged flat files (stage + uploadedBy), no history[].files.
{
  const task = {
    history: [
      { action: 'Task Created', performedBy: 'admin1', timestamp: '2026-01-01T10:00:00Z' },
      { action: 'Completed', performedBy: 'doer1', timestamp: '2026-01-02T10:00:00Z' },
    ],
    files: [
      { fileName: 'created.png', fileUrl: 'u/created.png', stage: 'Task Created', uploadedBy: 'admin1' },
      { fileName: 'done.png', fileUrl: 'u/done.png', stage: 'Completed', uploadedBy: 'doer1' },
    ],
  };
  const { entries, otherPhotos } = groupPhotosByHistory(task);
  check('groupPhotosByHistory (tagged shape): matched by exact stage+uploadedBy', entries[0].photos.length === 1 && entries[1].photos.length === 1, entries);
  check('groupPhotosByHistory (tagged shape): nothing left unmatched', otherPhotos.length === 0, otherPhotos);
}

// Tier 3: fully legacy files (no stage, no uploadedBy) - nearest timestamp.
{
  const task = {
    history: [
      { action: 'Task Created', performedBy: 'admin1', timestamp: '2026-01-01T10:00:00.000Z' },
      { action: 'Completed', performedBy: 'doer1', timestamp: '2026-01-05T10:00:00.000Z' },
    ],
    files: [
      // 30s after "Task Created" - clearly nearest to that entry.
      { fileName: 'legacy1.png', fileUrl: 'u/legacy1.png', uploadedAt: '2026-01-01T10:00:30.000Z' },
      // 10s before "Completed" - clearly nearest to that entry.
      { fileName: 'legacy2.png', fileUrl: 'u/legacy2.png', uploadedAt: '2026-01-05T09:59:50.000Z' },
      // 10 minutes after the LAST entry, outside the 2-minute window for
      // every entry - must land in otherPhotos, not get force-assigned.
      { fileName: 'orphan.png', fileUrl: 'u/orphan.png', uploadedAt: '2026-01-05T10:10:00.000Z' },
    ],
  };
  const { entries, otherPhotos } = groupPhotosByHistory(task);
  check('groupPhotosByHistory (legacy, nearest-timestamp): photo 30s after "Task Created" assigned there', entries[0].photos.some((p) => p.fileName === 'legacy1.png'), entries[0].photos);
  check('groupPhotosByHistory (legacy, nearest-timestamp): photo 10s before "Completed" assigned there', entries[1].photos.some((p) => p.fileName === 'legacy2.png'), entries[1].photos);
  check('groupPhotosByHistory (legacy, outside window): orphaned photo goes to otherPhotos, not dropped', otherPhotos.some((p) => p.fileName === 'orphan.png'), otherPhotos);
  check('groupPhotosByHistory (legacy, outside window): orphan is NOT force-assigned to the nearer-but-still-too-far entry', !entries[1].photos.some((p) => p.fileName === 'orphan.png'));

  // NEVER-DROP-A-PHOTO guarantee: total count conserved exactly.
  const totalIn = task.files.length;
  const totalOut = entries.reduce((n, e) => n + e.photos.length, 0) + otherPhotos.length;
  check('groupPhotosByHistory: never-drop-a-photo guarantee (count conserved)', totalIn === totalOut, { totalIn, totalOut });
}

// No history at all - every photo must still surface, in otherPhotos.
{
  const task = { history: [], files: [{ fileName: 'x.png', fileUrl: 'u/x.png' }, { fileName: 'y.png', fileUrl: 'u/y.png' }] };
  const { entries, otherPhotos } = groupPhotosByHistory(task);
  check('groupPhotosByHistory: with no history entries at all, every photo still appears in otherPhotos', entries.length === 0 && otherPhotos.length === 2, otherPhotos);
}

// Empty/missing task - must not throw.
{
  const { entries, otherPhotos } = groupPhotosByHistory({});
  check('groupPhotosByHistory: an empty task does not throw and returns empty results', entries.length === 0 && otherPhotos.length === 0);
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed.`);
if (failed.length) {
  console.log('FAILURES:', JSON.stringify(failed, null, 2));
  process.exitCode = 1;
}
