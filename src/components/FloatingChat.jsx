import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Paperclip, ChevronLeft } from 'lucide-react';
import { useChat } from './useChat';
import API from '../api/axiosConfig';

function Avatar({ name, size = 28 }) {
  const colors = ['#185FA5','#0F6E56','#3C3489','#854F0B','#A32D2D','#3B6D11'];
  const color = colors[(name?.charCodeAt(0) || 0) % colors.length];
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.38, fontWeight:600, color:'white', flexShrink:0 }}>
      {(name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
    </div>
  );
}

function timeAgo(date) {
  if (!date) return '';
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff/60)}m`;
  return new Date(date).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
}

export default function FloatingChat({ currentUser }) {
  // Don't render on chat page - avoids duplicate socket listeners
  if (typeof window !== 'undefined' && window.location.pathname.includes('/chat')) {
    return null;
  }
  const [open, setOpen]             = useState(false);
  const [view, setView]             = useState('list'); // 'list' | 'chat'
  const [text, setText]             = useState('');
  const [uploading, setUploading]   = useState(false);
  const [file, setFile]             = useState(null);
  const fileRef                     = useRef();
  const messagesEndRef              = useRef();
  const myId = currentUser?._id || currentUser?.id;

  const {
    conversations, activeConvId, activeConversation,
    messages, typingUsers, totalUnread, loadingMsgs, employees,
    openConversation, closeConversation,
    sendMessage, startDM, uploadFile, sendTyping,
  } = useChat();

  useEffect(() => {
    if (view === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, view]);

  const handleSend = async () => {
    if (!text.trim() && !file) return;
    let fileData = {};
    if (file) {
      setUploading(true);
      try { fileData = await uploadFile(file); } finally { setUploading(false); }
    }
    await sendMessage(activeConvId, { text: text.trim(), ...fileData });
    setText('');
    setFile(null);
    // Scroll to bottom
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior:'smooth' }), 50);
  };

  const handleOpenConv = async (convId) => {
    await openConversation(convId);
    setView('chat');
  };

  const handleBack = () => {
    closeConversation();
    setView('list');
  };

  const convTitle = activeConversation?.displayName || (
    activeConversation?.type === 'announcement' ? `📢 ${activeConversation.title}` :
    activeConversation?.type === 'task' ? `📋 ${activeConversation.taskTitle}` :
    'Direct Message'
  );

  return (
    <div style={{ position:'fixed', bottom:24, right:24, zIndex:1000, fontFamily:'var(--font-sans)' }}>

      {/* ── Chat panel ── */}
      {open && (
        <div style={{
          position:'absolute', bottom:68, right:0,
          width:340, height:480,
          background:'var(--color-card)',
          borderRadius:16, boxShadow:'0 8px 40px rgba(0,0,0,0.18)',
          border:'1px solid var(--color-border)',
          display:'flex', flexDirection:'column', overflow:'hidden',
        }}>
          {/* Header */}
          <div style={{ padding:'12px 16px', background:'#185FA5', color:'white', display:'flex', alignItems:'center', gap:8 }}>
            {view === 'chat' && (
              <button onClick={handleBack} style={{ background:'none', border:'none', cursor:'pointer', color:'white', padding:2, display:'flex', marginRight:4 }}>
                <ChevronLeft size={18} />
              </button>
            )}
            <span style={{ fontWeight:700, fontSize:14, flex:1 }}>
              {view === 'list' ? 'Messages' : convTitle}
            </span>
            <button onClick={() => setOpen(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'white', padding:2, display:'flex' }}>
              <X size={16} />
            </button>
          </div>

          {/* ── CONVERSATION LIST ── */}
          {view === 'list' && (
            <div style={{ flex:1, overflowY:'auto' }}>
              {conversations.length === 0 && (
                <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--color-muted-foreground)', fontSize:13 }}>
                  No conversations yet
                </div>
              )}
              {conversations.map(conv => {
                const title = conv.displayName || (
                  conv.type === 'announcement' ? `📢 ${conv.title}` :
                  conv.type === 'task' ? `📋 ${conv.taskTitle}` :
                  conv.lastMessage?.senderName || 'Direct Message'
                );
                const unread = conv.unreadCount || 0;
                return (
                  <div key={conv._id} onClick={() => handleOpenConv(conv._id)}
                    style={{ display:'flex', gap:10, alignItems:'center', padding:'10px 14px', cursor:'pointer', borderBottom:'1px solid var(--color-border)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--color-muted)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <Avatar name={title} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', justifyContent:'space-between' }}>
                        <span style={{ fontSize:12, fontWeight:600, color:'var(--color-foreground)' }}>{title}</span>
                        <span style={{ fontSize:10, color:'var(--color-muted-foreground)' }}>{timeAgo(conv.lastMessage?.sentAt)}</span>
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:2 }}>
                        <span style={{ fontSize:11, color:'var(--color-muted-foreground)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:200 }}>
                          {conv.lastMessage?.text || 'No messages yet'}
                        </span>
                        {unread > 0 && (
                          <span style={{ background:'#185FA5', color:'white', borderRadius:8, fontSize:9, fontWeight:700, padding:'1px 5px', flexShrink:0 }}>
                            {unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── MESSAGES ── */}
          {view === 'chat' && (
            <>
              <div style={{ flex:1, overflowY:'auto', padding:'12px 14px', display:'flex', flexDirection:'column', gap:2 }}>
                {loadingMsgs && <div style={{ textAlign:'center', fontSize:11, color:'var(--color-muted-foreground)' }}>Loading…</div>}
                {messages.map((msg, i) => {
                  const isMine = msg.senderId?.toString() === myId?.toString();
                  return (
                    <div key={msg._id || i} style={{ display:'flex', flexDirection: isMine ? 'row-reverse' : 'row', gap:6, marginBottom:3, alignItems:'flex-end' }}>
                      {!isMine && <Avatar name={msg.senderName} size={24} />}
                      <div style={{ maxWidth:'75%' }}>
                        <div style={{
                          background: isMine ? '#185FA5' : 'var(--color-muted)',
                          color: isMine ? 'white' : 'var(--color-foreground)',
                          borderRadius: isMine ? '14px 14px 3px 14px' : '14px 14px 14px 3px',
                          padding: msg.fileUrl ? '6px' : '8px 12px',
                          fontSize:12, lineHeight:1.5,
                        }}>
                          {msg.fileUrl ? (
                            msg.fileType?.startsWith('image/') ? (
                              <img src={msg.fileUrl} alt="" style={{ maxWidth:180, maxHeight:160, borderRadius:8, display:'block', cursor:'pointer' }} onClick={() => window.open(msg.fileUrl,'_blank')} />
                            ) : (
                              <a href={msg.fileUrl} target="_blank" rel="noreferrer" style={{ color: isMine ? 'white' : 'var(--color-primary)', fontSize:11, display:'flex', alignItems:'center', gap:5 }}>
                                <Paperclip size={12} />{msg.fileName || 'File'}
                              </a>
                            )
                          ) : msg.text}
                        </div>
                        <div style={{ fontSize:9, color:'var(--color-muted-foreground)', textAlign: isMine ? 'right' : 'left', marginTop:1 }}>
                          {timeAgo(msg.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              {activeConversation?.type !== 'announcement' || currentUser?.role === 'Admin' ? (
                <div style={{ padding:'8px 12px', borderTop:'1px solid var(--color-border)', background:'var(--color-card)' }}>
                  {file && (
                    <div style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 8px', background:'var(--color-muted)', borderRadius:6, marginBottom:6, fontSize:11 }}>
                      <Paperclip size={11} /><span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{file.name}</span>
                      <button onClick={() => setFile(null)} style={{ background:'none', border:'none', cursor:'pointer' }}><X size={11} /></button>
                    </div>
                  )}
                  <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                    <button onClick={() => fileRef.current?.click()} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--color-muted-foreground)', padding:4, display:'flex' }}>
                      <Paperclip size={15} />
                    </button>
                    <input ref={fileRef} type="file" style={{ display:'none' }} onChange={e => setFile(e.target.files[0])} />
                    <input value={text} onChange={e => { setText(e.target.value); sendTyping(activeConvId); }}
                      onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                      placeholder="Message…"
                      style={{ flex:1, background:'var(--color-muted)', border:'1px solid var(--color-border)', borderRadius:20, padding:'6px 12px', fontSize:12, color:'var(--color-foreground)', outline:'none', fontFamily:'inherit' }} />
                    <button onClick={handleSend} disabled={!text.trim() && !file}
                      style={{ background:'#185FA5', border:'none', borderRadius:'50%', width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0, opacity: (!text.trim() && !file) ? 0.5 : 1 }}>
                      <Send size={13} color="white" />
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ padding:'8px', textAlign:'center', fontSize:11, color:'var(--color-muted-foreground)', borderTop:'1px solid var(--color-border)' }}>
                  Read-only announcement
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Bubble button ── */}
      <button onClick={() => setOpen(p => !p)}
        style={{ width:52, height:52, borderRadius:'50%', background:'#185FA5', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 20px rgba(24,95,165,0.4)', position:'relative', transition:'transform .15s' }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
        {open ? <X size={22} color="white" /> : <MessageSquare size={22} color="white" />}
        {!open && totalUnread > 0 && (
          <div style={{ position:'absolute', top:-2, right:-2, background:'#E24B4A', color:'white', borderRadius:10, fontSize:10, fontWeight:700, padding:'1px 5px', minWidth:18, textAlign:'center', border:'2px solid var(--color-background)' }}>
            {totalUnread > 99 ? '99+' : totalUnread}
          </div>
        )}
      </button>
    </div>
  );
}