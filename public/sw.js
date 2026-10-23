// Work Pilot service worker: lets the browser offer "Install app". It never stores pages or data,
// so the app always shows the latest version; if the phone is offline it shows a small message.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.mode !== 'navigate') return;
  e.respondWith(fetch(req).catch(() => new Response(
    '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:sans-serif;text-align:center;padding:48px 20px;background:#0b1220;color:#e5e7eb"><h2>You are offline</h2><p>Work Pilot needs an internet connection. Please reconnect and open the app again.</p></body>',
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  )));
});
