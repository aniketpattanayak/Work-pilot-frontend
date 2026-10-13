import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Send, Paperclip, X, Search, Plus, MessageSquare, ChevronLeft, Users, Megaphone, Trash2, Calendar, User as UserIcon, ExternalLink, AlertTriangle } from 'lucide-react';
import { useChat } from '../components/useChat';
import { dialog } from '../components/Dialog';
import API from '../api/axiosConfig';

// ─── TINY HELPERS ─────────────────────────────────────────────────────────────
function timeStr(date) {
  if (!date) return '';
  const d = new Date(date), now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
  return d.toLocaleDateString([], { day:'numeric', month:'short' });
}

function Avatar({ name='?', size=36 }) {
  const COLORS = ['#185FA5','#0F6E56','#3C3489','#993C1D','#A32D2D','#3B6D11'];
  const bg = COLORS[(name.charCodeAt(0)||0) % COLORS.length];
  const initials = name.split(' ').map(w=>w[0]||'').join('').slice(0,2).toUpperCase();
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:bg, color:'white',
      display:'flex', alignItems:'center', justifyContent:'center',
      fontSize:size*0.38, fontWeight:700, flexShrink:0, letterSpacing:1 }}>
      {initials}
    </div>
  );
}

// ─── CONV ITEM ────────────────────────────────────────────────────────────────
function ConvItem({ conv, active, onClick }) {
  const icon = conv.type === 'announcement' ? '📢' : conv.type === 'task' ? '📋' : null;
  const name = conv.displayName || 'Chat';
  const preview = conv.lastMessage?.text || 'No messages yet';
  const unread = conv.unreadCount || 0;

  return (
    <div onClick={onClick} style={{
      display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
      cursor:'pointer', borderRadius:10, margin:'2px 6px',
      background: active ? '#185FA5' : 'transparent',
      transition:'background .12s',
    }}
    onMouseEnter={e=>{ if(!active) e.currentTarget.style.background='var(--color-muted)' }}
    onMouseLeave={e=>{ if(!active) e.currentTarget.style.background='transparent' }}>
      {icon
        ? <div style={{ width:36, height:36, borderRadius:'50%', background: active?'rgba(255,255,255,0.2)':'var(--color-muted)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{icon}</div>
        : <Avatar name={name} size={36} />
      }
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:13, fontWeight:600, color: active?'white':'var(--color-foreground)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:140 }}>
            {name}
          </span>
          <span style={{ fontSize:10, color: active?'rgba(255,255,255,0.65)':'var(--color-muted-foreground)', flexShrink:0, marginLeft:4 }}>
            {timeStr(conv.lastMessage?.sentAt || conv.updatedAt)}
          </span>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:2 }}>
          <span style={{ fontSize:12, color: active?'rgba(255,255,255,0.75)':'var(--color-muted-foreground)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:170 }}>
            {conv.lastMessage?.senderName ? `${conv.lastMessage.senderName}: ` : ''}{preview}
          </span>
          {unread > 0 && !active && (
            <span style={{ background:'#185FA5', color:'white', borderRadius:10, fontSize:10, fontWeight:700, padding:'1px 6px', flexShrink:0, marginLeft:4 }}>
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MESSAGE BUBBLE ───────────────────────────────────────────────────────────
function Bubble({ msg, isMine, showName }) {
  return (
    <div style={{ display:'flex', flexDirection: isMine?'row-reverse':'row', gap:8, marginBottom:6, alignItems:'flex-end' }}>
      {!isMine && (showName
        ? <Avatar name={msg.senderName||'?'} size={28} />
        : <div style={{ width:28, flexShrink:0 }} />
      )}
      <div style={{ maxWidth:'68%' }}>
        {!isMine && showName && (
          <div style={{ fontSize:11, fontWeight:600, color:'var(--color-muted-foreground)', marginBottom:3, marginLeft:4 }}>
            {msg.senderName}
          </div>
        )}
        <div style={{
          background: isMine ? '#185FA5' : 'var(--color-muted)',
          color: isMine ? 'white' : 'var(--color-foreground)',
          borderRadius: isMine ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
          padding: msg.fileUrl ? '6px' : '10px 14px',
          fontSize:13, lineHeight:1.55, wordBreak:'break-word',
          boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
        }}>
          {msg.fileUrl
            ? msg.fileType?.startsWith('image/')
              ? <img src={msg.fileUrl} alt="" style={{ maxWidth:220, maxHeight:180, borderRadius:12, display:'block', cursor:'pointer' }} onClick={()=>window.open(msg.fileUrl,'_blank')} />
              : <a href={msg.fileUrl} target="_blank" rel="noreferrer" style={{ display:'flex', alignItems:'center', gap:6, color: isMine?'white':'var(--color-primary)', fontSize:12, textDecoration:'none' }}><Paperclip size={13}/>{msg.fileName||'File'}</a>
            : msg.text
          }
        </div>
        <div style={{ fontSize:10, color:'var(--color-muted-foreground)', textAlign: isMine?'right':'left', marginTop:3, paddingLeft:4, paddingRight:4 }}>
          {timeStr(msg.createdAt)}
          {isMine && (msg.readBy?.length||0) > 1 && <span style={{ marginLeft:5, color:'#185FA5', fontWeight:600 }}>✓✓</span>}
        </div>
      </div>
    </div>
  );
}

// ─── INPUT BAR ────────────────────────────────────────────────────────────────
function InputBar({ onSend, onTyping, uploadFile }) {
  const [text, setText]   = useState('');
  const [file, setFile]   = useState(null);
  const [busy, setBusy]   = useState(false);
  const fileRef           = useRef();
  const textRef           = useRef();

  const send = async () => {
    if (!text.trim() && !file) return;
    let extra = {};
    if (file) {
      setBusy(true);
      try { extra = await uploadFile(file); } finally { setBusy(false); }
    }
    onSend({ text: text.trim(), ...extra });
    setText(''); setFile(null);
    textRef.current?.focus();
  };

  return (
    <div style={{ padding:'12px 16px', borderTop:'1px solid var(--color-border)', background:'var(--color-card)', flexShrink:0 }}>
      {file && (
        <div style={{ display:'flex', alignItems:'center', gap:8, background:'var(--color-muted)', borderRadius:8, padding:'5px 10px', marginBottom:8, fontSize:12 }}>
          <Paperclip size={12} style={{ flexShrink:0 }} />
          <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{file.name}</span>
          <button onClick={()=>setFile(null)} style={{ background:'none', border:'none', cursor:'pointer', padding:2, display:'flex' }}><X size={12}/></button>
        </div>
      )}
      <input ref={fileRef} type="file" style={{ display:'none' }} onChange={e=>setFile(e.target.files[0])} />
      <div style={{ display:'flex', gap:0, alignItems:'flex-end', background:'var(--color-muted)', borderRadius:14, border:'1.5px solid transparent', transition:'border-color .15s', overflow:'hidden' }}
        onFocusCapture={e=>e.currentTarget.style.borderColor='#185FA5'}
        onBlurCapture={e=>e.currentTarget.style.borderColor='transparent'}>
        <button onClick={()=>fileRef.current?.click()} title="Attach file"
          style={{ background:'none', border:'none', cursor:'pointer', color:'var(--color-muted-foreground)', padding:'10px 12px', display:'flex', flexShrink:0 }}
          onMouseEnter={e=>e.currentTarget.style.color='#185FA5'}
          onMouseLeave={e=>e.currentTarget.style.color='var(--color-muted-foreground)'}>
          <Paperclip size={17}/>
        </button>
        <textarea ref={textRef} value={text}
          onChange={e=>{ setText(e.target.value); onTyping(); }}
          onKeyDown={e=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); send(); } }}
          placeholder="Type a message…"
          rows={1}
          style={{ flex:1, resize:'none', background:'transparent', border:'none', padding:'10px 4px', fontSize:13, color:'var(--color-foreground)', outline:'none', lineHeight:1.5, maxHeight:120, overflowY:'auto', fontFamily:'inherit' }}
        />
        <button onClick={send} disabled={(!text.trim() && !file) || busy}
          style={{ background:'#185FA5', border:'none', margin:5, borderRadius:10, width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0, opacity:(!text.trim() && !file)||busy?0.4:1, transition:'opacity .15s' }}>
          <Send size={15} color="white"/>
        </button>
      </div>
    </div>
  );
}

// ─── TASK DETAILS CARD ────────────────────────────────────────────────────────
// Shown at the top of an open task thread: title, deadline (+ "revised" if
// it was), status, assigned by -> assigned to, and a "View task" link.
// Loaded via GET /tasks/:taskId. On ANY failure (404, 403, network, the
// route not existing on an older backend) this falls back to showing just
// the thread's title - never an error screen - per the "never an error
// screen" requirement.
function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}

function TaskDetailsCard({ taskId, fallbackTitle }) {
  const [task, setTask] = useState(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setTask(null); setFailed(false); setLoading(true);
    if (!taskId) { setLoading(false); setFailed(true); return; }
    API.get(`/tasks/${taskId}`)
      .then(r => { if (!cancelled) { setTask(r.data); setLoading(false); } })
      .catch(() => { if (!cancelled) { setFailed(true); setLoading(false); } });
    return () => { cancelled = true; };
  }, [taskId]);

  const statusColors = {
    Pending: '#94a3b8', Accepted: '#185FA5', 'Revision Requested': '#d97706',
    Completed: '#16a34a', Verified: '#0f6e56', Rejected: '#dc2626',
  };

  // Fallback: title only, no error text, no icon of doom - just a quieter card.
  if (failed || (!loading && !task)) {
    return (
      <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-card)', flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{fallbackTitle || 'Task'}</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-card)', flexShrink: 0, fontSize: 12, color: 'var(--color-muted-foreground)' }}>
        Loading task details…
      </div>
    );
  }

  return (
    <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-card)', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{task.title || fallbackTitle}</div>
        {task.status && (
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', padding: '2px 8px', borderRadius: 8, color: 'white', background: statusColors[task.status] || '#64748b', flexShrink: 0 }}>
            {task.status}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', marginTop: 6, fontSize: 11, color: 'var(--color-muted-foreground)' }}>
        {task.deadline && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Calendar size={11} />
            {fmtDate(task.deadline)}
            {task.wasRevised && <span style={{ color: '#d97706', fontWeight: 700, marginLeft: 2 }}>(revised)</span>}
          </span>
        )}
        {(task.assignerId?.name || task.doerId?.name) && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <UserIcon size={11} />
            {task.assignerId?.name || '—'} <ChevronLeft size={10} style={{ transform: 'rotate(180deg)' }} /> {task.doerId?.name || '—'}
          </span>
        )}
        <a href={`/dashboard/manage-tasks?task=${task._id}`} target="_blank" rel="noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#185FA5', fontWeight: 600, textDecoration: 'none' }}>
          <ExternalLink size={11} /> View task
        </a>
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function ChatPage({ currentUser }) {
  const {
    conversations, activeConvId, activeConversation,
    messages, typingUsers, loadingMsgs, employees,
    loadConversations, openConversation, closeConversation,
    sendMessage, startDM, deleteConversation, uploadFile, sendTyping,
  } = useChat();

  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch]       = useState('');
  const [showNewDM, setShowNewDM] = useState(false);
  const [filter, setFilter]       = useState('all');
  const [isMobile, setIsMobile]   = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const bottomRef                 = useRef();
  const myId = currentUser?._id || currentUser?.id || '';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' });
  }, [messages]);

  // Narrow-screen detection for the mobile back-to-list behaviour below.
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Deep-link support: /dashboard/chat?conv=<id> opens that conversation
  // directly, INCLUDING on a hard refresh (when useChat's in-memory
  // conversation list is empty and has to be loaded first) - this is what
  // replaces the old window.location.href reload-based approach in
  // useChat.js's openTaskThread, which always landed on "Select a
  // conversation" because a full reload wiped the singleton's _activeConvId.
  const convParam = searchParams.get('conv');
  useEffect(() => {
    if (!convParam) return;
    if (convParam === activeConvId) return;
    (async () => {
      if (conversations.length === 0) {
        await loadConversations();
      }
      openConversation(convParam);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convParam]);

  // Keep the URL in sync so a manual conversation-list click is just as
  // refreshable/shareable as a task-thread deep link, and so the mobile
  // back button (clearing ?conv=) actually returns to the list.
  const selectConversation = useCallback((id) => {
    openConversation(id);
    setSearchParams(id ? { conv: id } : {}, { replace: true });
  }, [openConversation, setSearchParams]);

  const goBackToList = useCallback(() => {
    closeConversation();
    setSearchParams({}, { replace: true });
  }, [closeConversation, setSearchParams]);

  const handleSend = useCallback(async (data) => {
    if (!activeConvId) return;
    await sendMessage(activeConvId, data);
  }, [activeConvId, sendMessage]);

  const filtered = conversations.filter(c => {
    if (filter !== 'all' && c.type !== filter) return false;
    if (search) return (c.displayName||'').toLowerCase().includes(search.toLowerCase());
    return true;
  });

  const conv = activeConversation;
  const convName = conv?.displayName || 'Chat';
  const convTyping = typingUsers[activeConvId] || [];
  const isAnnouncement = conv?.type === 'announcement';
  const isAdmin = currentUser?.role === 'Admin' || (Array.isArray(currentUser?.roles) && currentUser.roles.includes('Admin'));
  const canType = !isAnnouncement || isAdmin;
  const canDelete = !!conv && (!isAnnouncement || isAdmin);

  const handleDelete = async () => {
    const text = isAnnouncement
      ? 'Delete this announcement for everyone?'
      : `Delete this chat with ${convName}? It will disappear from your list. The other person keeps their copy.`;
    if (!(await dialog.confirm(text, { title: 'Delete chat', danger: true, confirmText: 'Delete' }))) return;
    try {
      await deleteConversation(activeConvId);
    } catch (err) {
      await dialog.alert(err.response?.data?.message || 'Could not delete this chat. Please try again.', { tone: 'error', title: 'Not deleted' });
    }
  };

  // People for the "+ New" list (shown instead of the conversation list)
  const people = (Array.isArray(employees) ? employees : []).filter(e => !search || (e.name || '').toLowerCase().includes(search.toLowerCase()));

  // Narrow screens show either the conversation list OR the open thread,
  // never both side by side - this is the "back action" to the list.
  const showList = !isMobile || !activeConvId;
  const showThread = !isMobile || !!activeConvId;

  return (
    <div style={{
      flex:1, minHeight:0, width:'100%',
      display:'flex', background:'var(--color-background)', overflow:'hidden',
    }}>

      {/* ── LEFT PANEL ── */}
      {showList && (
      <div style={{ width: isMobile ? '100%' : 300, borderRight:'1px solid var(--color-border)', display:'flex', flexDirection:'column', background:'var(--color-card)', flexShrink:0 }}>

        {/* Header */}
        <div style={{ padding:'16px 16px 10px', flexShrink:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <span style={{ fontSize:17, fontWeight:700 }}>Messages</span>
            <button onClick={()=>{ setShowNewDM(p=>!p); setSearch(''); }}
              style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', background:showNewDM?'#185FA5':'var(--color-muted)', color:showNewDM?'white':'var(--color-foreground)', border:'none', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', transition:'all .15s' }}>
              <Plus size={13}/> New
            </button>
          </div>

          {/* Search */}
          <div style={{ display:'flex', alignItems:'center', gap:8, background:'var(--color-muted)', borderRadius:10, padding:'8px 12px', marginBottom:10 }}>
            <Search size={13} style={{ color:'var(--color-muted-foreground)', flexShrink:0 }}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={showNewDM ? 'Search people…' : 'Search conversations…'}
              style={{ background:'none', border:'none', outline:'none', fontSize:13, color:'var(--color-foreground)', width:'100%' }}/>
          </div>

          {/* Filters */}
          <div style={{ display:'flex', gap:4 }}>
            {[['all','All'],['dm','DM'],['task','📋'],['announcement','📢']].map(([f,label])=>(
              <button key={f} onClick={()=>{ setFilter(f); setShowNewDM(false); }}
                style={{ flex:1, padding:'5px 0', fontSize:11, fontWeight:600, borderRadius:7, border:'none', cursor:'pointer', background: filter===f?'#185FA5':'var(--color-muted)', color: filter===f?'white':'var(--color-muted-foreground)', transition:'all .12s' }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {showNewDM ? (
          /* + New: only the people list is shown */
          <div style={{ flex:1, overflowY:'auto', paddingBottom:8 }}>
            <div style={{ padding:'4px 16px 8px', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', color:'var(--color-muted-foreground)' }}>
              Start a conversation
            </div>
            {people.map(emp=>(
              <div key={emp._id}
                onClick={async()=>{ const c = await startDM(emp._id); if (c?._id) setSearchParams({ conv: c._id }, { replace: true }); setShowNewDM(false); setSearch(''); setFilter('all'); }}
                style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', cursor:'pointer', borderRadius:10, margin:'2px 6px' }}
                onMouseEnter={e=>e.currentTarget.style.background='var(--color-muted)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <Avatar name={emp.name} size={32}/>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{emp.name}</div>
                  <div style={{ fontSize:11, color:'var(--color-muted-foreground)' }}>{emp.role || emp.roles?.[0] || ''}</div>
                </div>
              </div>
            ))}
            {people.length === 0 && <div style={{ padding:'24px 12px', fontSize:12, color:'var(--color-muted-foreground)', textAlign:'center' }}>{search ? 'No matching people' : 'No employees found'}</div>}
          </div>
        ) : (
          /* List */
          <div style={{ flex:1, overflowY:'auto', paddingBottom:8 }}>
            {filtered.length === 0 && (
              <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--color-muted-foreground)' }}>
                <MessageSquare size={32} style={{ opacity:.15, margin:'0 auto 10px' }}/>
                <div style={{ fontSize:13 }}>{search ? 'No results' : 'No conversations yet'}</div>
                {!search && <div style={{ fontSize:12, marginTop:4 }}>Click "+ New" to start chatting</div>}
              </div>
            )}
            {filtered.map(c=>(
              <ConvItem key={c._id} conv={c} active={c._id===activeConvId} onClick={()=>selectConversation(c._id)}/>
            ))}
          </div>
        )}
      </div>
      )}

      {/* ── RIGHT PANEL ── */}
      {showThread && (!activeConvId ? (
        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'var(--color-muted-foreground)' }}>
          <MessageSquare size={56} style={{ opacity:.1, marginBottom:16 }}/>
          <div style={{ fontSize:18, fontWeight:600, marginBottom:6 }}>Select a conversation</div>
          <div style={{ fontSize:13 }}>or click "+ New" to start a direct message</div>
        </div>
      ) : (
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>

          {/* Conversation header */}
          <div style={{ padding:'12px 20px', borderBottom:'1px solid var(--color-border)', background:'var(--color-card)', display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
            <button onClick={goBackToList} title={isMobile ? 'Back to conversations' : 'Close'}
              style={{ background:'none', border:'none', cursor:'pointer', padding:4, display:'flex', color:'var(--color-muted-foreground)', borderRadius:6 }}>
              <ChevronLeft size={20}/>
            </button>
            {conv?.type === 'announcement'
              ? <div style={{ width:38, height:38, borderRadius:'50%', background:'#FAEEDA', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>📢</div>
              : conv?.type === 'task'
              ? <div style={{ width:38, height:38, borderRadius:'50%', background:'#EEF3FB', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>📋</div>
              : <Avatar name={convName} size={38}/>
            }
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:15, fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{convName}</div>
              <div style={{ fontSize:12, color:'var(--color-muted-foreground)' }}>
                {conv?.type === 'dm' ? 'Direct message' : conv?.type === 'task' ? 'Task thread' : 'Announcement'}
              </div>
            </div>
            {canDelete && (
              <button onClick={handleDelete} title="Delete chat" aria-label="Delete chat"
                style={{ background:'none', border:'none', cursor:'pointer', padding:8, display:'flex', color:'var(--color-muted-foreground)', borderRadius:8 }}
                onMouseEnter={e=>{ e.currentTarget.style.color='#dc2626'; e.currentTarget.style.background='var(--color-muted)'; }}
                onMouseLeave={e=>{ e.currentTarget.style.color='var(--color-muted-foreground)'; e.currentTarget.style.background='none'; }}>
                <Trash2 size={17}/>
              </button>
            )}
          </div>

          {conv?.type === 'task' && conv?.taskId && (
            <TaskDetailsCard taskId={conv.taskId} fallbackTitle={convName} />
          )}

          {/* Messages */}
          <div style={{ flex:1, overflowY:'auto', padding:'20px', display:'flex', flexDirection:'column', gap:2, minHeight:0 }}>
            {loadingMsgs && (
              <div style={{ textAlign:'center', color:'var(--color-muted-foreground)', fontSize:12, padding:20 }}>Loading messages…</div>
            )}
            {!loadingMsgs && messages.length === 0 && (
              <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'var(--color-muted-foreground)' }}>
                <MessageSquare size={40} style={{ opacity:.1, marginBottom:12 }}/>
                <div style={{ fontSize:14, fontWeight:600 }}>No messages yet</div>
                <div style={{ fontSize:12, marginTop:4 }}>Send the first message!</div>
              </div>
            )}
            {messages.map((msg,i)=>{
              const isMine = msg.senderId?.toString() === myId.toString();
              const prev = messages[i-1];
              const showName = !isMine && prev?.senderId?.toString() !== msg.senderId?.toString();
              return <Bubble key={msg._id||i} msg={msg} isMine={isMine} showName={showName}/>;
            })}
            {/* Typing indicator */}
            {convTyping.length > 0 && (
              <div style={{ display:'flex', alignItems:'flex-end', gap:8, marginTop:4 }}>
                <div style={{ width:28, flexShrink:0 }} />
                <div style={{ background:'var(--color-muted)', borderRadius:'4px 18px 18px 18px', padding:'10px 14px', display:'flex', gap:4, alignItems:'center' }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{ width:7, height:7, borderRadius:'50%', background:'var(--color-muted-foreground)', animation:`typing-dot 1.2s ${i*0.2}s ease-in-out infinite` }} />
                  ))}
                </div>
                <span style={{ fontSize:11, color:'var(--color-muted-foreground)', marginBottom:4 }}>{convTyping[0]} is typing…</span>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>
          <style>{`
            @keyframes typing-dot {
              0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
              30% { transform: translateY(-5px); opacity: 1; }
            }
          `}</style>

          {/* Input or read-only notice */}
          {canType
            ? <InputBar onSend={handleSend} onTyping={()=>sendTyping(activeConvId)} uploadFile={uploadFile}/>
            : <div style={{ padding:'14px 20px', borderTop:'1px solid var(--color-border)', textAlign:'center', fontSize:12, color:'var(--color-muted-foreground)', background:'var(--color-card)', flexShrink:0 }}>
                📢 This is an admin announcement — read only
              </div>
          }
        </div>
      ))}
    </div>
  );
}