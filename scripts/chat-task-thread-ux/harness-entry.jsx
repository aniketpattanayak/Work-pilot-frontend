import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import ChatPage from '../../src/pages/ChatPage';
import { useChat } from '../../src/components/useChat';

// Proves "no full page reload": set once at module load, read later from a
// Playwright assertion. A hard navigation (window.location.href, a real
// browser reload) creates a brand-new JS context and this resets to a fresh
// random value; an in-SPA react-router navigation keeps the same value.
window.__loadMarker = Math.random().toString(36).slice(2);
window.__navCount = 0;
const _pushState = window.history.pushState.bind(window.history);
window.history.pushState = (...args) => { window.__navCount++; return _pushState(...args); };

function FakeManageTasksRow({ currentUser }) {
  const { openTaskThread } = useChat();
  const navigate = useNavigate();
  const openTaskChat = async (opts) => {
    const conv = await openTaskThread(opts);
    if (conv?._id) navigate(`/dashboard/chat?conv=${conv._id}`);
  };
  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Manage Tasks (fake row) — logged in as {currentUser.name}</div>
      <div style={{ border: '1px solid #ddd', borderRadius: 10, padding: 12, display: 'flex', alignItems: 'center', gap: 10, maxWidth: 420 }}>
        <span style={{ flex: 1 }}>Prepare Q3 report</span>
        <button id="message-btn" onClick={() => openTaskChat({
          taskId: 'task-abc123',
          taskType: 'delegation',
          taskTitle: 'Prepare Q3 report',
          participants: ['doer1', 'assigner1'],
        })} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #185FA5', color: '#185FA5', background: 'white', cursor: 'pointer' }}>
          💬 Message
        </button>
      </div>
    </div>
  );
}

// Minimal stand-in for Dashboard.jsx's chrome: a sticky header, the flex
// content column (with the SAME isChatRoute-driven classes), and the real
// sticky footer - so the composer-visibility assertions are testing against
// the real production layout shape, not an idealized one.
function FakeDashboardShell({ currentUser }) {
  const isChatRoute = window.location.pathname.replace(/\/+$/, '').endsWith('/chat');
  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', fontFamily: 'sans-serif' }}>
      <div style={{ width: 220, flexShrink: 0, background: '#0f172a', color: 'white', padding: 12 }}>Sidebar</div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: isChatRoute ? 'hidden' : 'auto' }}>
        <div style={{ position: 'sticky', top: 0, height: 80, flexShrink: 0, background: '#fff', borderBottom: '1px solid #ddd', display: 'flex', alignItems: 'center', padding: '0 16px', zIndex: 100 }}>Header (80px)</div>
        <main className={isChatRoute ? 'flex-1-chat' : ''} style={isChatRoute
          ? { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }
          : { padding: 16 }}>
          <Routes>
            <Route path="/dashboard/manage-tasks" element={<FakeManageTasksRow currentUser={currentUser} />} />
            <Route path="/dashboard/chat" element={<ChatPage currentUser={currentUser} />} />
          </Routes>
        </main>
        <div style={{ position: 'sticky', bottom: 0, height: 36, flexShrink: 0, background: '#fff', borderTop: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#666', zIndex: 90 }}>
          Powered by LRBC (fake sticky footer)
        </div>
      </div>
    </div>
  );
}

function App() {
  const params = new URLSearchParams(window.location.search);
  const who = params.get('as') === 'doer' ? { id: 'doer1', name: 'Deepak (Doer)', role: 'Employee' } : { id: 'assigner1', name: 'Asha (Assigner)', role: 'Admin' };
  localStorage.setItem('token', who.id === 'doer1' ? 'doer-token' : 'assigner-token');
  return (
    <BrowserRouter>
      <FakeDashboardShell currentUser={who} />
    </BrowserRouter>
  );
}

createRoot(document.getElementById('root')).render(<App />);
