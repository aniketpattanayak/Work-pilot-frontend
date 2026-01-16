// client/src/utils/subdomain.js

export const getSubdomain = () => {
  const host = window.location.hostname; // e.g., "lrbc.localhost" or "lrbc.lrbcloud.ai"
  const parts = host.split('.');
  
  // 1. LOCALHOST LOGIC: e.g., "tenant.localhost"
  if (host.includes('localhost')) {
      if (parts.length >= 2) {
          // Ignore 'www' if it happens to be used locally
          if (parts[0].toLowerCase() === 'www') return null;
          return parts[0]; // Returns "tenant"
      }
      return null;
  }

  // 2. AWS / PRODUCTION LOGIC: e.g., "tenant.lrbcloud.ai"
  // In production, the hostname for a tenant has 3 parts: [subdomain, domain, tld]
  if (parts.length >= 3) {
      const potentialSubdomain = parts[0].toLowerCase();

      // CRITICAL FIX: If the subdomain is 'www', return null so it loads the main landing page
      if (potentialSubdomain === 'www') {
          return null; 
      }

      return potentialSubdomain; // Returns the actual client name (e.g., "lrbc")
  }

  // 3. FALLBACK: No subdomain found (e.g., "lrbcloud.ai")
  // This automatically handles the main landing page
  return null; 
};