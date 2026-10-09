// A "Viewer-only" account has the Viewer role and nothing else: it can read the
// whole company but cannot change anything. The server enforces this too.
export const isViewerOnly = () => {
  try {
    const u = JSON.parse(localStorage.getItem('user') || 'null');
    const roles = Array.isArray(u?.roles) ? u.roles : (u?.role ? [u.role] : []);
    return roles.length > 0 && roles.every((r) => String(r).toLowerCase() === 'viewer');
  } catch {
    return false;
  }
};
