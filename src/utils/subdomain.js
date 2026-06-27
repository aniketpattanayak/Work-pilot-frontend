export const getSubdomain = () => {
  const host = window.location.hostname;
  const parts = host.split('.');

  // 1. LOCALHOST LOGIC
  if (host.includes('localhost')) {
    if (parts.length >= 2 && parts[parts.length - 1] === 'localhost') {
      const sub = parts[0].toLowerCase();
      return sub === 'www' ? null : sub;
    }
    return null;
  }

  // 2. PRODUCTION LOGIC
  if (parts.length >= 3) {
    const potentialSubdomain = parts[0].toLowerCase();
    // www and admin are not tenant subdomains
    if (potentialSubdomain === 'www') return null;
    if (potentialSubdomain === 'admin') return null;
    return potentialSubdomain;
  }

  // 3. FALLBACK
  return null;
};
