import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Paperclip, X, Search, Plus, MessageSquare, ChevronLeft, Users, Megaphone } from 'lucide-react';
import { useChat } from '../components/useChat';

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

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function ChatPage({ currentUser }) {
  const {
    conversations, activeConvId, activeConversation,
    messages, typingUsers, loadingMsgs, employees,
    openConversation, closeConversation,
    sendMessage, startDM, uploadFile, sendTyping,
  } = useChat();

  const [search, setSearch]       = useState('');
  const [showNewDM, setShowNewDM] = useState(false);
  const [filter, setFilter]       = useState('all');
  const bottomRef                 = useRef();
  const myId = currentUser?._id || currentUser?.id || '';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' });
  }, [messages]);

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
  const canType = !isAnnouncement || currentUser?.role === 'Admin';

  return (
    <div style={{
      position:'fixed', top:80, left:260, right:0, bottom:0,
      display:'flex', background:'var(--color-background)', overflow:'hidden',
    }}>

      {/* ── LEFT PANEL ── */}
      <div style={{ width:300, borderRight:'1px solid var(--color-border)', display:'flex', flexDirection:'column', background:'var(--color-card)', flexShrink:0 }}>

        {/* Header */}
        <div style={{ padding:'16px 16px 10px', flexShrink:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <span style={{ fontSize:17, fontWeight:700 }}>Messages</span>
            <button onClick={()=>setShowNewDM(p=>!p)}
              style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', background:showNewDM?'#185FA5':'var(--color-muted)', color:showNewDM?'white':'var(--color-foreground)', border:'none', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', transition:'all .15s' }}>
              <Plus size={13}/> New
            </button>
          </div>

          {/* Search */}
          <div style={{ display:'flex', alignItems:'center', gap:8, background:'var(--color-muted)', borderRadius:10, padding:'8px 12px', marginBottom:10 }}>
            <Search size={13} style={{ color:'var(--color-muted-foreground)', flexShrink:0 }}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search conversations…"
              style={{ background:'none', border:'none', outline:'none', fontSize:13, color:'var(--color-foreground)', width:'100%' }}/>
          </div>

          {/* Filters */}
          <div style={{ display:'flex', gap:4 }}>
            {[['all','All'],['dm','DM'],['task','📋'],['announcement','📢']].map(([f,label])=>(
              <button key={f} onClick={()=>setFilter(f)}
                style={{ flex:1, padding:'5px 0', fontSize:11, fontWeight:600, borderRadius:7, border:'none', cursor:'pointer', background: filter===f?'#185FA5':'var(--color-muted)', color: filter===f?'white':'var(--color-muted-foreground)', transition:'all .12s' }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* New DM picker */}
        {showNewDM && (
          <div style={{ margin:'0 8px 8px', background:'var(--color-muted)', borderRadius:10, overflow:'hidden', flexShrink:0 }}>
            <div style={{ padding:'8px 12px', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', color:'var(--color-muted-foreground)' }}>
              Start a conversation
            </div>
            <div style={{ maxHeight:180, overflowY:'auto' }}>
              {employees.map(emp=>(
                <div key={emp._id}
                  onClick={async()=>{ await startDM(emp._id); setShowNewDM(false); }}
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', cursor:'pointer', borderTop:'1px solid var(--color-border)' }}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--color-background)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <Avatar name={emp.name} size={30}/>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600 }}>{emp.name}</div>
                    <div style={{ fontSize:11, color:'var(--color-muted-foreground)' }}>{emp.role || emp.roles?.[0] || ''}</div>
                  </div>
                </div>
              ))}
              {employees.length === 0 && <div style={{ padding:'12px', fontSize:12, color:'var(--color-muted-foreground)', textAlign:'center' }}>No employees found</div>}
            </div>
          </div>
        )}

        {/* List */}
        <div style={{ flex:1, overflowY:'auto', paddingBottom:8 }}>
          {filtered.length === 0 && (
            <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--color-muted-foreground)' }}>
              <MessageSquare size={32} style={{ opacity:.15, margin:'0 auto 10px' }}/>
              <div style={{ fontSize:13 }}>{search ? 'No results' : 'No conversations yet'}</div>
              {!search && <div style={{ fontSize:12, marginTop:4 }}>Click "+ New" to start chatting</div>}
            </div>
          )}
          {filtered.map(c=>(
            <ConvItem key={c._id} conv={c} active={c._id===activeConvId} onClick={()=>openConversation(c._id)}/>
          ))}
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      {!activeConvId ? (
        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'var(--color-muted-foreground)' }}>
          <MessageSquare size={56} style={{ opacity:.1, marginBottom:16 }}/>
          <div style={{ fontSize:18, fontWeight:600, marginBottom:6 }}>Select a conversation</div>
          <div style={{ fontSize:13 }}>or click "+ New" to start a direct message</div>
        </div>
      ) : (
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

          {/* Conversation header */}
          <div style={{ padding:'12px 20px', borderBottom:'1px solid var(--color-border)', background:'var(--color-card)', display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
            <button onClick={closeConversation}
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
          </div>

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
      )}
    </div>
  );
}