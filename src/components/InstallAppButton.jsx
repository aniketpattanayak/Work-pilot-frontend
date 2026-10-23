import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { dialog } from './Dialog';

const isStandalone = () => {
  try { return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true; } catch (e) { return false; }
};

/** "Install app" button (shows the browser's own install box). Hidden once the app is installed. */
export default function InstallAppButton({ collapsed = false }) {
  const [evt, setEvt] = useState(() => (typeof window !== 'undefined' ? window.__wpInstallPrompt || null : null));
  const [installed, setInstalled] = useState(isStandalone());

  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); window.__wpInstallPrompt = e; setEvt(e); };
    const onInstalled = () => { window.__wpInstallPrompt = null; setEvt(null); setInstalled(true); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled); };
  }, []);

  if (installed) return null;

  const click = async () => {
    if (evt) {
      try { evt.prompt(); await evt.userChoice; } catch (e) { /* closed */ }
      window.__wpInstallPrompt = null; setEvt(null);
      return;
    }
    const ua = navigator.userAgent || '';
    const ios = /iPhone|iPad|iPod/i.test(ua);
    await dialog.alert(ios
      ? 'On iPhone/iPad: open this page in Safari, tap the Share button, then choose "Add to Home Screen".'
      : 'Use your browser menu: Chrome/Edge - open the menu (three dots) and choose "Install app" (or "Add to Home screen" on a phone). If you do not see it, the app may already be installed.',
    { title: 'Install Work Pilot' });
  };

  return (
    <button type="button" onClick={click} title="Install Work Pilot as an app" data-testid="install-app"
      className={`w-full flex items-center rounded-xl text-primary hover:bg-primary/10 border border-transparent transition-all duration-200 active:scale-95 mb-1 ${collapsed ? 'justify-center py-2.5' : 'gap-3 px-3 py-2.5'}`}>
      <Download size={17} className="flex-shrink-0" />
      {!collapsed && <span className="text-[12.5px] font-semibold tracking-tight">Install app</span>}
    </button>
  );
}
