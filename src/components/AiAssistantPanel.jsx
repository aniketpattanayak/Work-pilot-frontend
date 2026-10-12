import { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, X, Send, Mic, MicOff, Check, X as XIcon, MessageSquarePlus, History, ArrowLeft } from 'lucide-react';
import API from '../api/axiosConfig';

// Phase 4: floating AI assistant chat panel. Talks to POST /api/ai-assistant/chat
// only - the backend is the single source of truth for what the assistant may do;
// this component never calls any other route on the assistant's behalf.
//
// Voice input uses the browser's native Web Speech API (SpeechRecognition) when
// available, with a visible "not supported in this browser" fallback to typing -
// never a hard failure. Recognized text is always shown in the input box before
// sending, so the user can correct it rather than something mis-heard going
// straight out as a message.

const SpeechRecognitionAPI = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null;

function ConfirmCard({ summary, onConfirm, onCancel, busy }) {
  return (
    <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 p-3 text-sm">
      <div className="text-slate-700 dark:text-slate-200 mb-2">{summary}</div>
      <div className="flex gap-2">
        <button
          onClick={onConfirm}
          disabled={busy}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-50"
        >
          <Check size={14} /> Yes, do it
        </button>
        <button
          onClick={onCancel}
          disabled={busy}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold disabled:opacity-50"
        >
          <XIcon size={14} /> Cancel
        </button>
      </div>
    </div>
  );
}

// Part 6 (UI): choice chips for an ambiguous name match. The backend now
// answers an ambiguous find_colleague lookup with a structured `choices`
// array instead of plain text - tapping a chip sends that name as the next
// message, exactly as if the user had typed it, so the same resolve path
// runs either way.
function ChoiceChips({ choices, onPick, disabled }) {
  if (!choices?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {choices.map((c, i) => (
        <button
          key={i}
          onClick={() => onPick(c.value)}
          disabled={disabled}
          className="px-3 py-1.5 rounded-full border border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 text-xs font-medium hover:bg-violet-100 dark:hover:bg-violet-900/60 disabled:opacity-50"
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}

// Part 6 (UI): the chat-history list - past sessions for this user, newest
// first (GET /ai-assistant/sessions is already scoped server-side to the
// caller's own tenantId+userId, so this can never show anyone else's chats).
function SessionList({ sessions, activeSessionId, onOpen, onClose, loading }) {
  return (
    <div className="absolute inset-0 bg-background flex flex-col" style={{ zIndex: 2 }}>
      <div className="flex items-center gap-2 px-3 py-3 border-b border-border">
        <button onClick={onClose} aria-label="Back to chat" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft size={18} />
        </button>
        <span className="font-bold text-sm text-foreground">Your conversations</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading && <div className="text-xs text-muted-foreground text-center mt-8">Loading…</div>}
        {!loading && sessions.length === 0 && (
          <div className="text-xs text-muted-foreground text-center mt-8 px-4">No past conversations yet.</div>
        )}
        {sessions.map((s) => (
          <button
            key={s.sessionId}
            onClick={() => onOpen(s.sessionId)}
            className={`w-full text-left px-4 py-3 border-b border-border/60 hover:bg-slate-50 dark:hover:bg-slate-900 ${
              s.sessionId === activeSessionId ? 'bg-slate-100 dark:bg-slate-800' : ''
            }`}
          >
            <div className="text-sm font-medium text-foreground truncate">{s.title || 'New chat'}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {s.updatedAt ? new Date(s.updatedAt).toLocaleString() : ''}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function Bubble({ role, children }) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-sm'
        }`}
      >
        {children}
      </div>
    </div>
  );
}

export default function AiAssistantPanel({ currentUser }) {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState([]); // { role: 'user'|'assistant', text, pending?: {summary, confirmId}, choices? }
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [listening, setListening] = useState(false);
  const [lang, setLang] = useState('en-IN'); // en-IN | hi-IN
  const [disabledReason, setDisabledReason] = useState(null);
  const recognitionRef = useRef(null);
  const endRef = useRef(null);

  // Part 6 (UI): session list, new chat, resuming a past conversation.
  const [sessionId, setSessionId] = useState(null);
  const [showSessions, setShowSessions] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const res = await API.get('/ai-assistant/sessions');
      setSessions(res.data?.sessions || []);
    } catch { /* the list is a convenience - a failed fetch just shows empty, never blocks chat */ }
    setSessionsLoading(false);
  }, []);

  const startNewChat = useCallback(async () => {
    setHistory([]);
    setDisabledReason(null);
    try {
      const res = await API.post('/ai-assistant/sessions', {});
      setSessionId(res.data?.sessionId || null);
    } catch {
      setSessionId(null); // the backend creates one lazily on the first /chat call anyway
    }
    setShowSessions(false);
  }, []);

  const openSession = useCallback(async (id) => {
    try {
      const res = await API.get(`/ai-assistant/sessions/${id}`);
      const msgs = res.data?.messages || [];
      setHistory(msgs.map((m) => ({ role: m.role, text: m.text })));
      setSessionId(id);
    } catch {
      setHistory([{ role: 'assistant', text: "I couldn't open that conversation." }]);
    }
    setShowSessions(false);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, open]);

  useEffect(() => {
    if (!SpeechRecognitionAPI) return;
    const rec = new SpeechRecognitionAPI();
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      // Recognized text is shown in the input box, not sent automatically -
      // the user reviews/edits it before it goes anywhere.
      setText((prev) => (prev ? prev + ' ' : '') + transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    return () => rec.abort?.();
  }, [lang]);

  const toggleListening = () => {
    const rec = recognitionRef.current;
    if (!rec) return;
    if (listening) {
      rec.stop();
      setListening(false);
    } else {
      rec.lang = lang;
      try { rec.start(); setListening(true); } catch { /* already started */ }
    }
  };

  async function send(body) {
    setSending(true);
    try {
      const res = await API.post('/ai-assistant/chat', { ...body, sessionId: body.sessionId || sessionId || undefined });
      const data = res.data;
      // The backend creates/echoes a sessionId on every reply (Part 2) - keep
      // following it so the next message in this chat stays on the same
      // conversation, including the very first message before we had one.
      if (data.sessionId && data.sessionId !== sessionId) setSessionId(data.sessionId);
      if (data.needsConfirmation) {
        setHistory((h) => [...h, { role: 'assistant', text: data.reply, pending: { summary: data.summary, confirmId: data.confirmId } }]);
      } else if (Array.isArray(data.choices) && data.choices.length) {
        // Part 6: an ambiguous name match - render as choice chips.
        setHistory((h) => [...h, { role: 'assistant', text: data.reply, choices: data.choices }]);
      } else {
        setHistory((h) => [...h, { role: 'assistant', text: data.reply || 'Done.' }]);
      }
      setDisabledReason(null);
    } catch (err) {
      const code = err.response?.data?.code;
      const msg = err.response?.data?.message || 'Something went wrong talking to the assistant.';
      if (code === 'AI_ASSISTANT_DISABLED') setDisabledReason(msg);
      else if (code === 'RATE_LIMITED' || code === 'MONTHLY_LIMIT_REACHED' || code === 'AI_SERVICE_DOWN') {
        setHistory((h) => [...h, { role: 'assistant', text: msg }]);
      } else {
        setHistory((h) => [...h, { role: 'assistant', text: msg }]);
      }
    } finally {
      setSending(false);
    }
  }

  const handleSend = () => {
    const t = text.trim();
    if (!t || sending) return;
    setHistory((h) => [...h, { role: 'user', text: t }]);
    setText('');
    send({ message: t });
  };

  const handlePickChoice = (value, idx) => {
    // Tapping a chip sends the name as the next message, exactly as if the
    // user had typed it - the same name-resolution path runs either way,
    // nothing here talks to a tool directly.
    setHistory((h) => h.map((m, i) => (i === idx ? { ...m, choices: null } : m)));
    setHistory((h) => [...h, { role: 'user', text: value }]);
    send({ message: value });
  };

  const handleConfirm = (confirmId, idx) => {
    setHistory((h) => h.map((m, i) => (i === idx ? { ...m, pending: { ...m.pending, resolving: true } } : m)));
    send({ confirmId });
    setHistory((h) => h.map((m, i) => (i === idx ? { ...m, pending: null } : m)));
  };
  const handleCancel = (idx) => {
    setHistory((h) => h.map((m, i) => (i === idx ? { ...m, pending: null, text: m.text + ' (cancelled)' } : m)));
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Open AI assistant"
        className="fixed bottom-24 right-5 md:bottom-6 md:right-24 w-12 h-12 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
        style={{ zIndex: 1001 }}
      >
        <Sparkles size={20} />
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 md:inset-auto md:bottom-6 md:right-6 md:w-[380px] md:h-[560px] md:rounded-2xl bg-background border border-border shadow-2xl flex flex-col overflow-hidden"
      style={{ zIndex: 1001 }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-slate-50 dark:bg-slate-900">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles size={18} className="text-violet-600 dark:text-violet-400 shrink-0" />
          <span className="font-bold text-sm text-foreground truncate">WorkPilot Assistant</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="text-xs bg-transparent border border-border rounded-md px-1.5 py-1 text-muted-foreground"
            aria-label="Voice language"
          >
            <option value="en-IN">EN</option>
            <option value="hi-IN">HI</option>
          </select>
          <button
            onClick={startNewChat}
            aria-label="Start a new chat"
            title="New chat"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-slate-200 dark:hover:bg-slate-800"
          >
            <MessageSquarePlus size={16} />
          </button>
          <button
            onClick={() => { setShowSessions(true); loadSessions(); }}
            aria-label="View past conversations"
            title="History"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-slate-200 dark:hover:bg-slate-800"
          >
            <History size={16} />
          </button>
          <button onClick={() => setOpen(false)} aria-label="Close assistant" className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>
      </div>

      {showSessions && (
        <SessionList
          sessions={sessions}
          activeSessionId={sessionId}
          onOpen={openSession}
          onClose={() => setShowSessions(false)}
          loading={sessionsLoading}
        />
      )}

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {history.length === 0 && !disabledReason && (
          <div className="text-xs text-muted-foreground text-center mt-8 px-4">
            Ask me to check your tasks, apply leave, or create a task for someone.
            I'll always confirm before changing anything, and I can never approve
            payroll or release money — I'll point you to the right screen for that.
          </div>
        )}
        {disabledReason && (
          <div className="text-xs text-center text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 rounded-lg p-3">
            {disabledReason}
          </div>
        )}
        {history.map((m, i) => (
          <div key={i}>
            <Bubble role={m.role}>{m.text}</Bubble>
            {m.pending && (
              <div className="mt-2">
                <ConfirmCard
                  summary={m.pending.summary}
                  busy={!!m.pending.resolving}
                  onConfirm={() => handleConfirm(m.pending.confirmId, i)}
                  onCancel={() => handleCancel(i)}
                />
              </div>
            )}
            {m.choices && (
              <ChoiceChips choices={m.choices} disabled={sending} onPick={(v) => handlePickChoice(v, i)} />
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="border-t border-border p-2.5 flex items-end gap-2">
        {SpeechRecognitionAPI ? (
          <button
            onClick={toggleListening}
            aria-label={listening ? 'Stop listening' : 'Start voice input'}
            className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
              listening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            {listening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
        ) : (
          <span className="shrink-0 w-9 h-9 flex items-center justify-center text-slate-300 dark:text-slate-600" title="Voice input not supported in this browser">
            <Mic size={16} />
          </span>
        )}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder={listening ? 'Listening…' : 'Type or use the mic…'}
          rows={1}
          className="flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <button
          onClick={handleSend}
          disabled={sending || !text.trim()}
          aria-label="Send"
          className="shrink-0 w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}
