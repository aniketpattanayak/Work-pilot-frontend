import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import API from '../api/axiosConfig';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');

// ── Global singleton state — shared across ALL hook instances ──────────────────
// This prevents multiple socket connections and duplicate re-renders
let _socket        = null;
let _conversations = [];
let _messages      = {};
let _totalUnread   = 0;
let _employees     = [];
let _activeConvId  = null;

// Subscribers — components that want re-renders when state changes
const subscribers = new Set();

function notify() {
  subscribers.forEach(fn => fn());
}

function getSocket() {
  if (_socket) return _socket;
  const token = localStorage.getItem('token');
  if (!token) return null;

  _socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionAttempts: 5,
    timeout: 10000,
  });

  _socket.on('connect', () => {
    console.log('[Socket] ✅ Connected');
    notify();
  });
  _socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
    // Only notify on intentional disconnects, not transport errors
    if (reason !== 'transport error') notify();
  });
  _socket.on('connect_error', (e) => {
    // Don't spam re-renders on connection errors
    console.warn('[Socket] Connection error:', e.message);
  });
  _socket.on('new_message', (msg) => {
    const convId = msg.conversationId;
    const existing = _messages[convId] || [];
    if (existing.some(m => m._id === msg._id)) return;
    _messages = { ..._messages, [convId]: [...existing, msg] };
    _conversations = _conversations.map(c => {
      if (c._id !== convId) return c;
      const isActive = _activeConvId === convId;
      return {
        ...c,
        lastMessage: {
          text: msg.text || (msg.fileUrl ? `📎 ${msg.fileName||'File'}` : ''),
          senderName: msg.senderName,
          sentAt: msg.createdAt,
        },
        unreadCount: isActive ? 0 : (c.unreadCount || 0) + 1,
      };
    });
    if (_activeConvId !== convId) {
      _totalUnread = _totalUnread + 1;
    }
    notify();
  });
  _socket.on('user_typing', ({ conversationId, name }) => {
    // Handled locally in hook instances — no global state needed
  });

  return _socket;
}

// ── The hook ──────────────────────────────────────────────────────────────────
export function useChat() {
  // Single render-trigger state — avoids multiple useState causing cascading renders
  const [tick, setTick] = useState(0);
  const typingUsers = useRef({});
  const typingTimers = useRef({});

  const rerender = useCallback(() => {
    setTick(t => t + 1);
  }, []);

  // Subscribe/unsubscribe from global state changes
  useEffect(() => {
    subscribers.add(rerender);

    // Initialize socket
    const socket = getSocket();
    if (!socket) return;

    // Typing indicators — local only
    const onTyping = ({ conversationId, name }) => {
      typingUsers.current = {
        ...typingUsers.current,
        [conversationId]: [...new Set([...(typingUsers.current[conversationId]||[]), name])],
      };
      rerender();
    };
    const onStopTyping = ({ conversationId }) => {
      const { [conversationId]: _, ...rest } = typingUsers.current;
      typingUsers.current = rest;
      rerender();
    };
    const onReadReceipt = ({ conversationId }) => {
      // Update read status silently
    };

    socket.on('user_typing',         onTyping);
    socket.on('user_stopped_typing', onStopTyping);
    socket.on('messages_read',       onReadReceipt);

    return () => {
      subscribers.delete(rerender);
      socket.off('user_typing',         onTyping);
      socket.off('user_stopped_typing', onStopTyping);
      socket.off('messages_read',       onReadReceipt);
    };
  }, [rerender]);

  // Load conversations once on mount
  useEffect(() => {
    if (_conversations.length === 0) {
      API.get('/chat/conversations').then(r => {
        _conversations = r.data || [];
        _totalUnread = _conversations.reduce((s,c) => s + (c.unreadCount||0), 0);
        notify();
      }).catch(() => {});
    }
    if (_employees.length === 0) {
      API.get('/chat/employees').then(r => {
        _employees = r.data || [];
        notify();
      }).catch(() => {});
    }
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────────

  const loadConversations = useCallback(async () => {
    try {
      const r = await API.get('/chat/conversations');
      _conversations = r.data || [];
      _totalUnread = _conversations.reduce((s,c) => s + (c.unreadCount||0), 0);
      notify();
    } catch {}
  }, []);

  const openConversation = useCallback(async (convId) => {
    _activeConvId = convId;
    notify();

    const socket = getSocket();
    if (socket?.connected) socket.emit('join_conversation', convId);

    if (!_messages[convId]) {
      try {
        const r = await API.get(`/chat/${convId}/messages`);
        _messages = { ..._messages, [convId]: r.data };
        notify();
      } catch {}
    }

    try {
      await API.post(`/chat/${convId}/read`);
      _conversations = _conversations.map(c =>
        c._id === convId ? { ...c, unreadCount: 0 } : c
      );
      _totalUnread = Math.max(0, _totalUnread - (_conversations.find(c=>c._id===convId)?.unreadCount||0));
      notify();
    } catch {}
  }, []);

  const closeConversation = useCallback(() => {
    const socket = getSocket();
    if (_activeConvId && socket?.connected) socket.emit('leave_conversation', _activeConvId);
    _activeConvId = null;
    notify();
  }, []);

  const sendMessage = useCallback(async (convId, { text, fileUrl, fileName, fileType, mentions }) => {
    const res = await API.post(`/chat/${convId}/messages`, { text, fileUrl, fileName, fileType, mentions });
    const msg = res.data;
    const existing = _messages[convId] || [];
    if (!existing.some(m => m._id === msg._id)) {
      _messages = { ..._messages, [convId]: [...existing, msg] };
    }
    _conversations = _conversations.map(c => c._id !== convId ? c : {
      ...c,
      lastMessage: {
        text: text || (fileUrl ? `📎 ${fileName||'File'}` : ''),
        senderName: msg.senderName,
        sentAt: msg.createdAt,
      },
    });
    notify();
    return msg;
  }, []);

  const startDM = useCallback(async (otherEmployeeId) => {
    const res = await API.post('/chat/dm', { otherEmployeeId });
    const conv = res.data;
    if (!_conversations.some(c => c._id === conv._id)) {
      _conversations = [conv, ..._conversations];
    }
    await openConversation(conv._id);
    return conv;
  }, [openConversation]);

  const createGroup = useCallback(async ({ title, participants, groupAvatar }) => {
    const res = await API.post('/chat/group', { title, participants, groupAvatar });
    const conv = { ...res.data, displayName: title };
    _conversations = [conv, ..._conversations];
    await openConversation(conv._id);
    notify();
    return conv;
  }, [openConversation]);

  const openTaskThread = useCallback(async ({ taskId, taskType, taskTitle, participants }) => {
    try {
      const res = await API.post('/chat/task-thread', { taskId, taskType, taskTitle, participants });
      const conv = { ...res.data, displayName: taskTitle || 'Task Thread' };
      if (!_conversations.some(c => c._id === conv._id)) {
        _conversations = [conv, ..._conversations];
      }
      await openConversation(conv._id);
      // Navigate to chat page
      const base = window.location.pathname.split('/').slice(0,-1).join('/');
      window.location.href = base + '/chat';
      return conv;
    } catch(err) {
      console.error('[Chat] openTaskThread:', err.message);
    }
  }, [openConversation]);

  const sendTyping = useCallback((convId) => {
    const socket = getSocket();
    if (!socket?.connected) return;
    socket.emit('typing_start', { conversationId: convId });
    clearTimeout(typingTimers.current[convId]);
    typingTimers.current[convId] = setTimeout(() => {
      socket.emit('typing_stop', { conversationId: convId });
    }, 2000);
  }, []);

  const uploadFile = useCallback(async (file) => {
    const form = new FormData();
    form.append('file', file);
    const res = await API.post('/chat/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    return res.data;
  }, []);

  return {
    connected:          _socket?.connected || false,
    conversations:      _conversations,
    activeConvId:       _activeConvId,
    activeConversation: _conversations.find(c => c._id === _activeConvId) || null,
    messages:           _messages[_activeConvId] || [],
    allMessages:        _messages,
    typingUsers:        typingUsers.current,
    totalUnread:        _totalUnread,
    loadingMsgs:        false,
    employees:          _employees,
    loadConversations,
    openConversation,
    closeConversation,
    sendMessage,
    startDM,
    createGroup,
    openTaskThread,
    sendTyping,
    uploadFile,
  };
}