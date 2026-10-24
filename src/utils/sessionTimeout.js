// Logs the user out after 18 hours of no activity (click, key, touch, scroll, mouse move).
// The "last active" time is kept in localStorage so every open tab shares it.
const LIMIT_MS = 18 * 60 * 60 * 1000;
const KEY = 'lastActiveAt';
const WRITE_EVERY_MS = 30 * 1000;

const loggedIn = () => !!localStorage.getItem('token');

function logout() {
  const wasSuper = localStorage.getItem('isSuperAdmin') === 'true';
  ['token', 'isSuperAdmin', 'user', 'tenantId', KEY].forEach((k) => localStorage.removeItem(k));
  window.location.href = wasSuper ? '/' : '/login';
}

function check() {
  if (!loggedIn()) return;
  const last = parseInt(localStorage.getItem(KEY) || '0', 10);
  if (!last) { localStorage.setItem(KEY, String(Date.now())); return; }
  if (Date.now() - last >= LIMIT_MS) logout();
}

export function startSessionTimeout() {
  if (typeof window === 'undefined' || window.__sessionTimeoutOn) return;
  window.__sessionTimeoutOn = true;
  try {
    check(); // covers "closed the laptop and came back next day"
    let lastWrite = Date.now();
    const touch = () => {
      const now = Date.now();
      if (now - lastWrite < WRITE_EVERY_MS || !loggedIn()) return;
      lastWrite = now;
      localStorage.setItem(KEY, String(now));
    };
    ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'].forEach((e) => window.addEventListener(e, touch, { passive: true }));
    document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
    window.addEventListener('focus', check);
    setInterval(check, 60 * 1000);
  } catch (e) { /* storage blocked: skip */ }
}
