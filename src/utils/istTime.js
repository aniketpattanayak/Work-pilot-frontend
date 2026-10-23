// Indian time (IST), 12-hour with AM/PM, whatever the computer's own time zone is.
const TZ = 'Asia/Kolkata';
const ok = (v) => { if (!v) return null; const d = new Date(v); return Number.isNaN(d.getTime()) ? null : d; };

export const fmtISTDate = (v) => { const d = ok(v); return d ? d.toLocaleDateString('en-IN', { timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric' }) : ''; };
export const fmtISTTime = (v) => { const d = ok(v); return d ? d.toLocaleTimeString('en-IN', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true }).replace(/\b(am|pm)\b/, (m) => m.toUpperCase()) : ''; };
/** "23 Oct 2026, 1:43 PM" */
export const fmtIST = (v) => { const d = ok(v); return d ? `${fmtISTDate(d)}, ${fmtISTTime(d)}` : ''; };
/** "23 Oct, 1:43 PM" (no year) */
export const fmtISTShort = (v) => { const d = ok(v); return d ? `${d.toLocaleDateString('en-IN', { timeZone: TZ, day: '2-digit', month: 'short' })}, ${fmtISTTime(d)}` : ''; };
