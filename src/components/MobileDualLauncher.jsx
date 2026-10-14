import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Sparkles } from 'lucide-react';
import { useChat } from './useChat';

// Phones/tablets only (<1024px, see .mobile-dual-launcher in index.css).
// FloatingChat and AiAssistantPanel each used to render their own trigger
// bubble bottom-right/bottom-left; on narrow screens both landed on the
// exact same coordinates (see the old mobile override this replaces),
// stacking one on top of the other and hiding the chat unread badge
// under the AI button. This component is the single bubble phones see;
// it never touches either panel's internals - it just asks them to open
// via the `openTrigger` prop/effect Dashboard wires through.
export default function MobileDualLauncher({ onOpenChat, onOpenAi, hideAi }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef();
  const { totalUnread } = useChat();

  useEffect(() => {
    if (!menuOpen) return;
    const handleOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [menuOpen]);

  const choose = (fn) => {
    setMenuOpen(false);
    fn();
  };

  return (
    <div ref={rootRef} className="mobile-dual-launcher">
      {menuOpen && (
        <div style={{
          position: 'absolute', bottom: 64, left: 0,
          background: 'var(--color-card)', borderRadius: 14,
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          border: '1px solid var(--color-border)',
          overflow: 'hidden', minWidth: 170,
        }}>
          <button onClick={() => choose(onOpenChat)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--color-foreground)', textAlign: 'left' }}>
            <MessageSquare size={18} color="#185FA5" />
            Chat
          </button>
          {!hideAi && (
            <>
              <div style={{ height: 1, background: 'var(--color-border)' }} />
              <button onClick={() => choose(onOpenAi)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--color-foreground)', textAlign: 'left' }}>
                <Sparkles size={18} color="#7C3AED" />
                AI Assistant
              </button>
            </>
          )}
        </div>
      )}

      <button onClick={() => setMenuOpen((p) => !p)}
        aria-label="Open chat or AI assistant"
        style={{
          width: 52, height: 52, borderRadius: '50%', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
          background: 'linear-gradient(135deg, #185FA5, #7C3AED)',
          boxShadow: '0 4px 20px rgba(24,95,165,0.4)',
        }}>
        <MessageSquare size={22} color="white" />
        {totalUnread > 0 && (
          <div style={{ position: 'absolute', top: -2, right: -2, background: '#E24B4A', color: 'white', borderRadius: 10, fontSize: 10, fontWeight: 700, padding: '1px 5px', minWidth: 18, textAlign: 'center', border: '2px solid var(--color-background)' }}>
            {totalUnread > 99 ? '99+' : totalUnread}
          </div>
        )}
      </button>
    </div>
  );
}
