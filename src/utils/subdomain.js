
export const getSubdomain = () => {
  const host = window.location.hostname; // e.g., "lrbc.localhost" or "lrbc.workpilot.com"
  const parts = host.split('.');
  
  // 1. LOCALHOST LOGIC: e.g., "tenant.localhost"
  if (host.includes('localhost')) {
      if (parts.length >= 2) {
          return parts[0]; // Returns "tenant"
      }
      return null;
  }

  // 2. AWS / PRODUCTION LOGIC: e.g., "tenant.workpilot.com"
  // In production, the hostname usually has 3 parts: [subdomain, domain, tld]
  if (parts.length >= 3) {
      return parts[0]; // Returns "tenant"
  }

  // 3. FALLBACK: No subdomain found (Main Landing Page)
  return null; 
};