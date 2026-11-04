import { getSubdomain } from './subdomain';

// AUTOMATIC LOGOUT ENGINE: 18-Hour Maximum Session & Inactivity Limit
// Enforces:
// 1. JWT token expiration (18 hours max validity).
// 2. Absolute session expiration (18 hours from login).
// 3. Inactivity expiration (18 hours with no user interaction).
// Shared across all open tabs via localStorage.

export const LIMIT_MS = 18 * 60 * 60 * 1000; // 18 hours
export const KEY_LAST_ACTIVE = 'lastActiveAt';
export const KEY_LOGIN_TIME = 'loginAt';
const WRITE_THROTTLE_MS = 30 * 1000; // 30 seconds throttle for localStorage writes

export const loggedIn = () => !!localStorage.getItem('token');

/**
 * Safely decodes JWT payload to extract expiration or issue timestamp without external libraries.
 */
export function getJwtPayload(token) {
  try {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

/**
 * Evaluates whether the current session has exceeded the 18-hour threshold.
 */
export function isSessionExpired() {
  const token = localStorage.getItem('token');
  if (!token) return false;

  const now = Date.now();

  // 1. Check JWT token expiration claim (exp in seconds)
  const payload = getJwtPayload(token);
  if (payload?.exp && now >= payload.exp * 1000) {
    return true;
  }

  // 2. Check absolute session lifespan from login timestamp
  const loginAt = parseInt(localStorage.getItem(KEY_LOGIN_TIME) || '0', 10);
  if (loginAt && now - loginAt >= LIMIT_MS) {
    return true;
  }
  // Fallback: If loginAt is missing in localStorage, use JWT issued-at (iat in seconds)
  if (!loginAt && payload?.iat && now - payload.iat * 1000 >= LIMIT_MS) {
    return true;
  }

  // 3. Check inactivity duration
  const lastActive = parseInt(localStorage.getItem(KEY_LAST_ACTIVE) || '0', 10);
  if (lastActive && now - lastActive >= LIMIT_MS) {
    return true;
  }

  return false;
}

/**
 * Completely purges all auth tokens, user state, and session timestamps,
 * then redirects the user to the correct login gateway.
 */
export function performSessionLogout() {
  const wasSuper = localStorage.getItem('isSuperAdmin') === 'true';
  const subdomain = getSubdomain();

  const keysToRemove = [
    'token',
    'isSuperAdmin',
    'user',
    'tenantId',
    KEY_LAST_ACTIVE,
    KEY_LOGIN_TIME,
    'wpLanded'
  ];
  keysToRemove.forEach((k) => localStorage.removeItem(k));
  try { sessionStorage.clear(); } catch (e) { /* ignore */ }

  const path = window.location.pathname;
  // If already at login or root, avoid continuous redirect loop
  if (path === '/login' || (path === '/' && !subdomain)) {
    return;
  }

  window.location.href = wasSuper ? '/' : (subdomain ? '/login' : '/');
}

/**
 * Initializes or refreshes session timestamps upon successful login.
 */
export function recordLoginSession() {
  const now = String(Date.now());
  localStorage.setItem(KEY_LOGIN_TIME, now);
  localStorage.setItem(KEY_LAST_ACTIVE, now);
}

/**
 * Periodic and event-driven check for session validity.
 */
export function checkSession() {
  if (!loggedIn()) return;

  if (isSessionExpired()) {
    performSessionLogout();
    return;
  }

  // If session is valid but timestamps are uninitialized, set them
  const now = Date.now();
  if (!localStorage.getItem(KEY_LAST_ACTIVE)) {
    localStorage.setItem(KEY_LAST_ACTIVE, String(now));
  }
  if (!localStorage.getItem(KEY_LOGIN_TIME)) {
    const payload = getJwtPayload(localStorage.getItem('token'));
    if (payload?.iat) {
      localStorage.setItem(KEY_LOGIN_TIME, String(payload.iat * 1000));
    } else {
      localStorage.setItem(KEY_LOGIN_TIME, String(now));
    }
  }
}

/**
 * Starts the global activity listeners and interval timer.
 */
export function startSessionTimeout() {
  if (typeof window === 'undefined' || window.__sessionTimeoutOn) return;
  window.__sessionTimeoutOn = true;

  try {
    // Initial evaluation on script startup
    checkSession();

    let lastWrite = Date.now();

    // Event listener for user activity
    const touch = () => {
      if (!loggedIn()) return;
      const now = Date.now();

      // CRITICAL: Verify if session is already expired BEFORE updating lastActiveAt.
      // This prevents returning users from accidentally resurrecting an expired session.
      if (isSessionExpired()) {
        performSessionLogout();
        return;
      }

      if (now - lastWrite < WRITE_THROTTLE_MS) return;
      lastWrite = now;
      localStorage.setItem(KEY_LAST_ACTIVE, String(now));
    };

    const events = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart', 'pointerdown'];
    events.forEach((e) => window.addEventListener(e, touch, { passive: true }));

    // Check immediately when tab becomes visible or focused (e.g. after sleep / lock screen)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) checkSession();
    });
    window.addEventListener('focus', checkSession);

    // Multi-tab synchronization: if another tab logs out, log out this tab too
    window.addEventListener('storage', (e) => {
      if (e.key === 'token' && !e.newValue) {
        performSessionLogout();
      }
    });

    // Regular polling interval (checks every 30 seconds)
    setInterval(checkSession, 30 * 1000);
  } catch (e) {
    /* localStorage access disabled: skip */
  }
}
