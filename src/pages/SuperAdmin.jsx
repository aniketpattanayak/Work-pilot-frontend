import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Shield, Building2, Users, DollarSign, Zap, RefreshCw, Plus,
  Ticket, LogOut, Search, ChevronRight, MoreVertical, Activity,
  TrendingUp, AlertCircle, CheckCircle2, PauseCircle, PlayCircle,
  Settings, Lock, FileText, MessageSquare, BarChart3, ShoppingCart,
  Star, ClipboardList, Wifi, X, Eye, EyeOff, Save, Trash2,
  Globe, Mail, Calendar, Clock, User, ArrowUpRight, Filter,
  Bell, Package, ToggleLeft, ToggleRight, CreditCard, StickyNote,
  ChevronDown, ChevronUp, LayoutGrid, List
} from 'lucide-react';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api');
const SA  = axios.create({ baseURL: API });
SA.interceptors.request.use(c => {
  // Read token fresh on every request to avoid stale closures
  const t = localStorage.getItem('token');
  if (t) {
    c.headers = c.headers || {};
    c.headers.Authorization = `Bearer ${t}`;
  }
  return c;
}, err => Promise.reject(err));

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:       '#F7F8FA',
  card:     '#FFFFFF',
  border:   '#EAECF0',
  border2:  '#D0D5DD',
  text:     '#101828',
  text2:    '#344054',
  muted:    '#667085',
  muted2:   '#98A2B3',
  blue:     '#1570EF',
  blueL:    '#EFF4FF',
  blueT:    '#175CD3',
  green:    '#079455',
  greenL:   '#ECFDF3',
  greenT:   '#067647',
  amber:    '#DC6803',
  amberL:   '#FFFAEB',
  amberT:   '#B54708',
  red:      '#D92D20',
  redL:     '#FEF3F2',
  redT:     '#B42318',
  purple:   '#6941C6',
  purpleL:  '#F4F3FF',
  purpleT:  '#5925DC',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt  = n => (n || 0).toLocaleString('en-IN');
const fmtR = n => `₹${fmt(n)}`;
function timeAgo(date) {
  if (!date) return 'Never';
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60)    return 'just now';
  if (s < 3600)  return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return new Date(date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
}
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
}
function initials(name='') {
  return name.split(' ').map(w=>w[0]||'').join('').slice(0,2).toUpperCase() || '??';
}
function avatar(name, size=36) {
  const COLS = ['#1570EF','#079455','#6941C6','#DC6803','#D92D20','#0E7090'];
  const bg   = COLS[(name?.charCodeAt(0)||0) % COLS.length];
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:bg, color:'#fff',
      display:'flex', alignItems:'center', justifyContent:'center',
      fontSize:size*0.36, fontWeight:600, flexShrink:0, letterSpacing:.5 }}>
      {initials(name)}
    </div>
  );
}

// ── Status / Plan badges ──────────────────────────────────────────────────────
function Badge({ type }) {
  const MAP = {
    active:     { bg:C.greenL, color:C.greenT, dot:C.green,  label:'Active'     },
    paused:     { bg:C.amberL, color:C.amberT, dot:C.amber,  label:'Paused'     },
    suspended:  { bg:C.redL,   color:C.redT,   dot:C.red,    label:'Suspended'  },
    free:       { bg:'#F9FAFB',color:C.muted,  dot:'#D0D5DD',label:'Free'       },
    starter:    { bg:C.blueL,  color:C.blueT,  dot:C.blue,   label:'Starter'    },
    pro:        { bg:C.purpleL,color:C.purpleT,dot:C.purple, label:'Pro'        },
    enterprise: { bg:C.greenL, color:C.greenT, dot:C.green,  label:'Enterprise' },
    custom:     { bg:C.amberL, color:C.amberT, dot:C.amber,  label:'Custom'     },
    paid:       { bg:C.greenL, color:C.greenT, dot:C.green,  label:'Paid'       },
    due:        { bg:C.amberL, color:C.amberT, dot:C.amber,  label:'Due'        },
    overdue:    { bg:C.redL,   color:C.redT,   dot:C.red,    label:'Overdue'    },
    open:       { bg:C.amberL, color:C.amberT, dot:C.amber,  label:'Open'       },
    resolved:   { bg:C.greenL, color:C.greenT, dot:C.green,  label:'Resolved'   },
    high:       { bg:C.redL,   color:C.redT,   dot:C.red,    label:'High'       },
    medium:     { bg:C.amberL, color:C.amberT, dot:C.amber,  label:'Medium'     },
    low:        { bg:'#F9FAFB',color:C.muted,  dot:'#D0D5DD',label:'Low'        },
  };
  const s = MAP[type] || MAP.free;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'2px 8px', borderRadius:16,
      background:s.bg, color:s.color, fontSize:12, fontWeight:500, whiteSpace:'nowrap' }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:s.dot, flexShrink:0 }} />
      {s.label}
    </span>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12,
      padding:'20px 24px', display:'flex', alignItems:'flex-start', gap:16 }}>
      <div style={{ width:44, height:44, borderRadius:10, background:color+'18',
        display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <Icon size={22} color={color} />
      </div>
      <div>
        <div style={{ fontSize:13, color:C.muted, fontWeight:500, marginBottom:4 }}>{label}</div>
        <div style={{ fontSize:26, fontWeight:700, color:C.text, lineHeight:1 }}>{value}</div>
        {sub && <div style={{ fontSize:12, color:C.muted, marginTop:4 }}>{sub}</div>}
      </div>
    </div>
  );
}

// ── Tenant card ───────────────────────────────────────────────────────────────
function TenantCard({ t, onClick }) {
  const sa = t.superAdmin || {};
  const s  = t.stats || {};
  const paused = sa.status === 'paused';
  return (
    <div onClick={onClick} style={{ background:C.card, border:`1px solid ${paused?C.amberL:C.border}`,
      borderRadius:12, padding:'20px', cursor:'pointer', transition:'border-color .15s, box-shadow .15s',
      borderLeft: paused ? `3px solid ${C.amber}` : `1px solid ${C.border}` }}
      onMouseEnter={e=>{ e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor=C.blue; }}
      onMouseLeave={e=>{ e.currentTarget.style.boxShadow='none'; e.currentTarget.style.borderColor=paused?C.amberL:C.border; }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {avatar(t.companyName, 36)}
          <div>
            <div style={{ fontSize:14, fontWeight:600, color:C.text }}>{t.companyName}</div>
            <div style={{ fontSize:11, color:C.muted, marginTop:1, display:'flex', alignItems:'center', gap:4 }}>
              <Globe size={11} /> {t.subdomain}.lrbcloud.ai
            </div>
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:4, alignItems:'flex-end' }}>
          <Badge type={sa.status||'active'} />
          <Badge type={sa.plan||'free'} />
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:14 }}>
        {[
          [Users,       s.employeeCount||0,   'Employees'],
          [CheckCircle2,s.tasksThisMonth||0,  'Tasks/mo' ],
          [Package,     s.ordersThisMonth||0, 'Orders/mo'],
        ].map(([Icon, val, lbl]) => (
          <div key={lbl} style={{ background:C.bg, borderRadius:8, padding:'8px 10px', textAlign:'center' }}>
            <Icon size={14} color={C.muted} style={{ marginBottom:3 }} />
            <div style={{ fontSize:18, fontWeight:700, color:C.text }}>{val}</div>
            <div style={{ fontSize:10, color:C.muted }}>{lbl}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
        borderTop:`1px solid ${C.border}`, paddingTop:10 }}>
        <div style={{ fontSize:11, color:C.muted, display:'flex', alignItems:'center', gap:4 }}>
          <Clock size={11} /> {s.lastActivity?.employeeName || '—'} · {timeAgo(s.lastActivity?.createdAt)}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:C.blue, fontWeight:500 }}>
          View details <ChevronRight size={13} />
        </div>
      </div>
    </div>
  );
}

// ── Tenant Detail Modal ───────────────────────────────────────────────────────
function TenantDetail({ tenantId, onClose, onRefresh }) {
  const [data, setData]   = useState(null);
  const [tab, setTab]     = useState('overview');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]     = useState('');
  const [empLimit, setEmpLimit]   = useState('');
  const [waLimit, setWaLimit]     = useState('');
  const [plan, setPlan]           = useState('free');
  const [amount, setAmount]       = useState('');
  const [renewalDate, setRenewal] = useState('');
  const [note, setNote]           = useState('');
  const [newPwd, setNewPwd]       = useState('');
  const [showPwd, setShowPwd]     = useState(false);
  const [features, setFeatures]   = useState({});
  const [pauseReason, setPauseReason] = useState('');
  const [pauseFrom,   setPauseFrom]     = useState('');
  const [pauseTo,     setPauseTo]       = useState('');
  const [logFilter, setLogFilter] = useState('');

  useEffect(() => {
    SA.get(`/superadmin/tenants/${tenantId}`).then(r => {
      setData(r.data);
      const sa = r.data.tenant?.superAdmin || {};
      setEmpLimit(sa.employeeLimit ?? 50);
      setWaLimit(sa.whatsappLimit ?? 1000);
      setPlan(sa.plan || 'free');
      setAmount(sa.amount || 0);
      setRenewal(sa.renewalDate ? sa.renewalDate.slice(0,10) : '');
      setNote(sa.internalNote || '');
      setFeatures(sa.features || {});
    }).catch(()=>{});
  }, [tenantId]);

  const api = async (fn) => {
    setSaving(true); setMsg('');
    try { await fn(); setMsg('success'); onRefresh(); setTimeout(()=>setMsg(''),2500); }
    catch(e) { setMsg('error:' + (e.response?.data?.message || 'Failed')); }
    finally { setSaving(false); }
  };

  if (!data) return (
    <Overlay onClick={onClose}>
      <ModalBox style={{ maxWidth:700, display:'flex', alignItems:'center', justifyContent:'center', padding:60 }}>
        <div style={{ color:C.muted, fontSize:14 }}>Loading…</div>
      </ModalBox>
    </Overlay>
  );

  const { tenant, employees=[], recentLogs=[], actionCounts=[], billing=[] } = data;
  const sa = tenant.superAdmin || {};
  const paused = sa.status === 'paused';
  const name = tenant.companyName;

  const countMap = {};
  actionCounts.forEach(a => { countMap[a._id] = a.count; });

  const TABS = [
    { id:'overview',   label:'Overview',   icon:LayoutGrid  },
    { id:'employees',  label:'Employees',  icon:Users       },
    { id:'logs',       label:'Activity',   icon:Activity    },
    { id:'billing',    label:'Billing',    icon:CreditCard  },
    { id:'controls',   label:'Controls',   icon:Settings    },
  ];

  const filteredLogs = logFilter
    ? recentLogs.filter(l => l.action?.includes(logFilter) || l.employeeName?.toLowerCase().includes(logFilter.toLowerCase()) || l.description?.toLowerCase().includes(logFilter.toLowerCase()))
    : recentLogs;

  const FEAT_ICONS = { tasks:CheckCircle2, fms:Zap, chat:MessageSquare, reports:BarChart3, orderForms:ShoppingCart, whatsapp:Bell, rewards:Star, checklist:ClipboardList };

  return (
    <Overlay onClick={e=>e.target===e.currentTarget&&onClose()}>
      <ModalBox style={{ maxWidth:780, maxHeight:'90vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {/* Header */}
        <div style={{ padding:'20px 24px', borderBottom:`1px solid ${C.border}`, flexShrink:0,
          display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            {avatar(name, 40)}
            <div>
              <div style={{ fontSize:17, fontWeight:700, color:C.text }}>{name}</div>
              <div style={{ fontSize:12, color:C.muted, display:'flex', gap:8, alignItems:'center', marginTop:2 }}>
                <Mail size={11}/> {tenant.adminEmail}
                <span>·</span><Globe size={11}/> {tenant.subdomain}.lrbcloud.ai
              </div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Badge type={sa.status||'active'} />
            <Badge type={sa.plan||'free'} />
            <button onClick={onClose} style={iconBtn}><X size={18}/></button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', borderBottom:`1px solid ${C.border}`, padding:'0 24px', flexShrink:0 }}>
          {TABS.map(({ id, label, icon:Icon }) => (
            <button key={id} onClick={()=>setTab(id)} style={{
              display:'flex', alignItems:'center', gap:6, padding:'12px 14px',
              border:'none', background:'none', cursor:'pointer', fontSize:13,
              color: tab===id ? C.blue : C.muted,
              fontWeight: tab===id ? 600 : 400,
              borderBottom: tab===id ? `2px solid ${C.blue}` : '2px solid transparent',
              marginBottom:-1, transition:'color .12s',
            }}>
              <Icon size={14}/>{label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>

          {/* OVERVIEW */}
          {tab==='overview' && (
            <div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:20 }}>
                {[
                  [Users,       'Employees',      employees.length],
                  [CheckCircle2,'Tasks created',  countMap.task_created||0],
                  [CheckCircle2,'Tasks completed',countMap.task_completed||0],
                  [Package,     'Orders/month',   countMap.order_submitted||0],
                  [Zap,         'Active flows',   countMap.flow_active||0],
                  [Lock,        'Logins/month',   countMap.login||0],
                ].map(([Icon,label,val])=>(
                  <div key={label} style={{ background:C.bg, borderRadius:10, padding:'14px 16px',
                    display:'flex', alignItems:'center', gap:10, border:`1px solid ${C.border}` }}>
                    <Icon size={18} color={C.blue} style={{ flexShrink:0 }}/>
                    <div>
                      <div style={{ fontSize:20, fontWeight:700, color:C.text }}>{val}</div>
                      <div style={{ fontSize:11, color:C.muted }}>{label}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Features */}
              <div style={{ border:`1px solid ${C.border}`, borderRadius:10, overflow:'hidden', marginBottom:14 }}>
                <div style={{ padding:'12px 16px', background:C.bg, borderBottom:`1px solid ${C.border}`,
                  fontSize:12, fontWeight:600, color:C.text2, display:'flex', alignItems:'center', gap:6 }}>
                  <ToggleRight size={14}/> Feature status
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:0 }}>
                  {Object.entries(sa.features || {}).map(([f, on]) => {
                    const Icon = FEAT_ICONS[f] || Settings;
                    return (
                      <div key={f} style={{ padding:'10px 14px', borderRight:`1px solid ${C.border}`,
                        borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:8 }}>
                        <Icon size={14} color={on ? C.green : C.muted2} />
                        <div>
                          <div style={{ fontSize:12, fontWeight:500, color: on?C.text:C.muted2,
                            textTransform:'capitalize' }}>{f==='orderForms'?'Order Forms':f}</div>
                          <div style={{ fontSize:10, color: on?C.green:C.muted2 }}>{on?'Enabled':'Disabled'}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Limits + Note */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div style={{ border:`1px solid ${C.border}`, borderRadius:10, padding:'14px 16px' }}>
                  <div style={{ fontSize:12, fontWeight:600, color:C.text2, marginBottom:10, display:'flex', gap:6, alignItems:'center' }}>
                    <Users size={13}/> Seat limits
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
                      <span style={{ color:C.muted }}>Employees</span>
                      <span style={{ fontWeight:600, color:C.text }}>{employees.length} / {sa.employeeLimit||50}</span>
                    </div>
                    <div style={{ height:4, background:C.border, borderRadius:4, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${Math.min(100,(employees.length/(sa.employeeLimit||50))*100)}%`,
                        background: employees.length >= (sa.employeeLimit||50) ? C.red : C.blue, borderRadius:4 }}/>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
                      <span style={{ color:C.muted }}>WhatsApp/mo</span>
                      <span style={{ fontWeight:600, color:C.text }}>{fmt(sa.whatsappLimit||1000)}</span>
                    </div>
                  </div>
                </div>
                <div style={{ border:`1px solid ${C.border}`, borderRadius:10, padding:'14px 16px' }}>
                  <div style={{ fontSize:12, fontWeight:600, color:C.text2, marginBottom:10, display:'flex', gap:6, alignItems:'center' }}>
                    <StickyNote size={13}/> Internal note
                  </div>
                  {sa.internalNote
                    ? <div style={{ fontSize:13, color:C.text2, lineHeight:1.6 }}>{sa.internalNote}</div>
                    : <div style={{ fontSize:12, color:C.muted }}>No notes added yet</div>
                  }
                </div>
              </div>
            </div>
          )}

          {/* EMPLOYEES */}
          {tab==='employees' && (
            <div>
              <div style={{ fontSize:13, color:C.muted, marginBottom:14, display:'flex', alignItems:'center', gap:6 }}>
                <Users size={14}/> {employees.length} employees · {employees.filter(e=>e.isActive!==false).length} active
              </div>
              <div style={{ border:`1px solid ${C.border}`, borderRadius:10, overflow:'hidden' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ background:C.bg }}>
                      {['Employee','Role','Last login','Status'].map(h=>(
                        <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11,
                          fontWeight:600, color:C.muted, textTransform:'uppercase', letterSpacing:.5 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((e,i)=>(
                      <tr key={e._id} style={{ borderTop:`1px solid ${C.border}`,
                        background: i%2===0?C.card:'#FAFAFA' }}>
                        <td style={{ padding:'10px 14px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            {avatar(e.name, 28)}
                            <div style={{ fontSize:13, fontWeight:500, color:C.text }}>{e.name}</div>
                          </div>
                        </td>
                        <td style={{ padding:'10px 14px', fontSize:12, color:C.muted2 }}>{e.role||'—'}</td>
                        <td style={{ padding:'10px 14px', fontSize:12, color:C.muted }}>
                          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                            <Clock size={11}/>{timeAgo(e.lastLogin)}
                          </div>
                        </td>
                        <td style={{ padding:'10px 14px' }}>
                          <Badge type={e.isActive===false?'paused':'active'} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {employees.length===0 && <div style={{ textAlign:'center', padding:32, color:C.muted, fontSize:13 }}>No employees yet</div>}
              </div>
            </div>
          )}

          {/* LOGS */}
          {tab==='logs' && (
            <div>
              <div style={{ display:'flex', gap:10, marginBottom:14 }}>
                <div style={{ flex:1, display:'flex', alignItems:'center', gap:8, border:`1px solid ${C.border}`,
                  borderRadius:8, padding:'8px 12px' }}>
                  <Search size={14} color={C.muted}/>
                  <input value={logFilter} onChange={e=>setLogFilter(e.target.value)}
                    placeholder="Filter by name, action, description…"
                    style={{ border:'none', outline:'none', fontSize:13, color:C.text, background:'transparent', width:'100%' }}/>
                </div>
                <select value={logFilter} onChange={e=>setLogFilter(e.target.value)}
                  style={{ padding:'8px 12px', border:`1px solid ${C.border}`, borderRadius:8, fontSize:12,
                    color:C.text2, background:C.card, outline:'none' }}>
                  <option value="">All actions</option>
                  {['login','task_created','task_completed','order_submitted','step_completed','whatsapp_sent','flow_created'].map(a=>(
                    <option key={a} value={a}>{a.replace(/_/g,' ')}</option>
                  ))}
                </select>
              </div>
              <div style={{ fontSize:12, color:C.muted, marginBottom:10 }}>
                Last 7 days · {filteredLogs.length} entries
              </div>
              <div style={{ border:`1px solid ${C.border}`, borderRadius:10, overflow:'hidden' }}>
                {filteredLogs.slice(0,50).map((log,i)=>(
                  <div key={i} style={{ display:'flex', gap:12, padding:'10px 14px', alignItems:'flex-start',
                    borderBottom:`1px solid ${C.border}`, background: i%2===0?C.card:'#FAFAFA' }}>
                    <div style={{ width:28, height:28, borderRadius:'50%', background:C.bg,
                      display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Activity size={13} color={C.blue}/>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, color:C.text }}>
                        <span style={{ fontWeight:600 }}>{log.employeeName}</span>
                        <span style={{ color:C.muted }}> — {log.description || log.action?.replace(/_/g,' ')}</span>
                      </div>
                      {(log.metadata?.taskTitle||log.metadata?.orderId) && (
                        <div style={{ fontSize:11, color:C.muted2, marginTop:2 }}>
                          {log.metadata.taskTitle && `Task: ${log.metadata.taskTitle}`}
                          {log.metadata.orderId && `Order: ${log.metadata.orderId}`}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize:11, color:C.muted2, flexShrink:0, display:'flex', alignItems:'center', gap:3 }}>
                      <Clock size={10}/>{timeAgo(log.createdAt)}
                    </div>
                  </div>
                ))}
                {filteredLogs.length===0 && <div style={{ textAlign:'center', padding:32, color:C.muted, fontSize:13 }}>No activity found</div>}
              </div>
            </div>
          )}

          {/* BILLING */}
          {tab==='billing' && (
            <div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:20 }}>
                {[
                  ['Plan', <select value={plan} onChange={e=>setPlan(e.target.value)} style={inputStyle}>
                    {['free','starter','pro','enterprise','custom'].map(p=><option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
                  </select>],
                  ['Monthly amount (₹)', <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} style={inputStyle} placeholder="0"/>],
                  ['Renewal date', <input type="date" value={renewalDate} onChange={e=>setRenewal(e.target.value)} style={inputStyle}/>],
                ].map(([label, field])=>(
                  <div key={label}>
                    <label style={labelStyle}>{label}</label>
                    {field}
                  </div>
                ))}
              </div>
              {msg && <MsgBanner msg={msg}/>}
              <button onClick={()=>api(()=>SA.put(`/superadmin/tenants/${tenantId}/billing`,{plan,amount:Number(amount),renewalDate,status:'paid'}))}
                disabled={saving} style={primaryBtn}>
                <Save size={14}/>{saving?'Saving…':'Save billing'}
              </button>

              {billing.length>0 && (
                <div style={{ marginTop:24 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:C.text, marginBottom:12 }}>Payment history</div>
                  <div style={{ border:`1px solid ${C.border}`, borderRadius:10, overflow:'hidden' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse' }}>
                      <thead><tr style={{ background:C.bg }}>
                        {['Date','Plan','Amount','Status'].map(h=>(
                          <th key={h} style={{ padding:'9px 14px', textAlign:'left', fontSize:11, fontWeight:600, color:C.muted, textTransform:'uppercase', letterSpacing:.5 }}>{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {billing.map((b,i)=>(
                          <tr key={i} style={{ borderTop:`1px solid ${C.border}` }}>
                            <td style={{ padding:'9px 14px', fontSize:12, color:C.text2 }}>{fmtDate(b.createdAt)}</td>
                            <td style={{ padding:'9px 14px' }}><Badge type={b.plan}/></td>
                            <td style={{ padding:'9px 14px', fontSize:13, fontWeight:600, color:C.text }}>{fmtR(b.amount)}</td>
                            <td style={{ padding:'9px 14px' }}><Badge type={b.status}/></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CONTROLS */}
          {tab==='controls' && (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

              {/* Pause / Resume */}
              <Section icon={paused?PlayCircle:PauseCircle} title={paused?'Resume account':'Pause account'}
                color={paused?C.green:C.amber} accent={paused?C.greenL:C.amberL}>
                {paused && (
                  <div style={{ padding:'8px 12px', background:C.amberL, borderRadius:8, fontSize:12,
                    color:C.amberT, marginBottom:12, display:'flex', gap:6, alignItems:'center' }}>
                    <AlertCircle size={13}/> Paused {timeAgo(sa.pausedAt)} — {sa.pauseReason||'No reason given'}
                  </div>
                )}
                {!paused && (
                  <div style={{ marginBottom:12 }}>
                    <label style={labelStyle}>Reason (optional)</label>
                    <input value={pauseReason} onChange={e=>setPauseReason(e.target.value)}
                      placeholder="Why are you pausing this account?" style={{ ...inputStyle, marginBottom:10 }}/>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                      <div>
                        <label style={labelStyle}>Pause from date (leave blank = now)</label>
                        <input type="date" value={pauseFrom} onChange={e=>setPauseFrom(e.target.value)} style={inputStyle}/>
                      </div>
                      <div>
                        <label style={labelStyle}>Auto-resume on date (optional)</label>
                        <input type="date" value={pauseTo} onChange={e=>setPauseTo(e.target.value)} style={inputStyle}/>
                      </div>
                    </div>
                    {pauseFrom && new Date(pauseFrom) > new Date() && (
                      <div style={{ marginTop:8, padding:'7px 12px', background:C.blueL, borderRadius:8,
                        fontSize:12, color:C.blueT, display:'flex', gap:6 }}>
                        <Calendar size={13}/> This will be a scheduled pause — account stays active until {new Date(pauseFrom).toDateString()}
                      </div>
                    )}
                    {pauseTo && (
                      <div style={{ marginTop:6, padding:'7px 12px', background:C.greenL, borderRadius:8,
                        fontSize:12, color:C.greenT, display:'flex', gap:6 }}>
                        <Calendar size={13}/> Account will auto-resume on {new Date(pauseTo).toDateString()}
                      </div>
                    )}
                  </div>
                )}
                {paused && sa.scheduledPauseTo && (
                  <div style={{ padding:'8px 12px', background:C.greenL, borderRadius:8, fontSize:12,
                    color:C.greenT, marginBottom:10, display:'flex', gap:6 }}>
                    <Calendar size={13}/> Scheduled to auto-resume on {new Date(sa.scheduledPauseTo).toDateString()}
                  </div>
                )}
                {msg && <MsgBanner msg={msg}/>}
                <div style={{ display:'flex', gap:10 }}>
                  <button onClick={()=>api(()=> paused
                    ? SA.post(`/superadmin/tenants/${tenantId}/resume`)
                    : SA.post(`/superadmin/tenants/${tenantId}/pause`,{reason:pauseReason, pauseFrom, pauseTo})
                  )} disabled={saving}
                    style={{ ...primaryBtn, background: paused?C.green:C.amber }}>
                    {paused ? <><PlayCircle size={14}/>{saving?'Resuming…':'Resume now'}</>
                            : pauseFrom && new Date(pauseFrom) > new Date()
                            ? <><Calendar size={14}/>{saving?'Scheduling…':'Schedule pause'}</>
                            : <><PauseCircle size={14}/>{saving?'Pausing…':'Pause now'}</>}
                  </button>
                </div>
              </Section>

              {/* Limits */}
              <Section icon={Users} title="Usage limits" color={C.blue} accent={C.blueL}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
                  <div>
                    <label style={labelStyle}>Max employees</label>
                    <input type="number" value={empLimit} onChange={e=>setEmpLimit(e.target.value)} style={inputStyle}/>
                  </div>
                  <div>
                    <label style={labelStyle}>WhatsApp messages/month</label>
                    <input type="number" value={waLimit} onChange={e=>setWaLimit(e.target.value)} style={inputStyle}/>
                  </div>
                </div>
                {msg && <MsgBanner msg={msg}/>}
                <button onClick={()=>api(()=>SA.put(`/superadmin/tenants/${tenantId}/limits`,{employeeLimit:Number(empLimit),whatsappLimit:Number(waLimit)}))}
                  disabled={saving} style={primaryBtn}>
                  <Save size={14}/>{saving?'Saving…':'Save limits'}
                </button>
              </Section>

              {/* Feature flags */}
              <Section icon={ToggleRight} title="Feature flags" color={C.purple} accent={C.purpleL}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
                  {Object.entries(features).map(([f, on])=>{
                    const Icon = FEAT_ICONS[f]||Settings;
                    return (
                      <label key={f} onClick={()=>setFeatures(p=>({...p,[f]:!p[f]}))}
                        style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                          padding:'10px 14px', border:`1px solid ${on?C.blue:C.border}`,
                          borderRadius:8, cursor:'pointer', background: on?C.blueL:C.card, transition:'all .12s' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <Icon size={15} color={on?C.blue:C.muted2}/>
                          <span style={{ fontSize:13, fontWeight:500, color:on?C.text:C.muted2 }}>
                            {f==='orderForms'?'Order Forms':f.charAt(0).toUpperCase()+f.slice(1)}
                          </span>
                        </div>
                        {on ? <ToggleRight size={20} color={C.blue}/> : <ToggleLeft size={20} color={C.muted2}/>}
                      </label>
                    );
                  })}
                </div>
                {msg && <MsgBanner msg={msg}/>}
                <button onClick={()=>api(()=>SA.put(`/superadmin/tenants/${tenantId}/features`,{features}))}
                  disabled={saving} style={primaryBtn}>
                  <Save size={14}/>{saving?'Saving…':'Save features'}
                </button>
              </Section>

              {/* Reset password */}
              <Section icon={Lock} title="Reset admin password" color={C.amber} accent={C.amberL}>
                <div style={{ display:'flex', gap:10 }}>
                  <div style={{ flex:1, position:'relative' }}>
                    <input type={showPwd?'text':'password'} value={newPwd} onChange={e=>setNewPwd(e.target.value)}
                      placeholder="New password (min 6 characters)" style={{ ...inputStyle, paddingRight:36 }}/>
                    <button onClick={()=>setShowPwd(p=>!p)}
                      style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
                        background:'none', border:'none', cursor:'pointer', color:C.muted, display:'flex' }}>
                      {showPwd ? <EyeOff size={15}/> : <Eye size={15}/>}
                    </button>
                  </div>
                  <button onClick={()=>api(()=>SA.post(`/superadmin/tenants/${tenantId}/reset-password`,{newPassword:newPwd}))}
                    disabled={saving||newPwd.length<6} style={{ ...primaryBtn, background:C.amber, opacity:newPwd.length<6?0.45:1 }}>
                    <Lock size={14}/>{saving?'Saving…':'Reset'}
                  </button>
                </div>
                {msg && <MsgBanner msg={msg}/>}
              </Section>

              {/* Internal note */}
              <Section icon={StickyNote} title="Internal note" color={C.muted} accent={C.bg}>
                <textarea value={note} onChange={e=>setNote(e.target.value)} rows={3}
                  placeholder="Notes only visible to SuperAdmin team…"
                  style={{ ...inputStyle, resize:'vertical', fontFamily:'inherit', minHeight:72 }}/>
                {msg && <MsgBanner msg={msg}/>}
                <button onClick={()=>api(()=>SA.put(`/superadmin/tenants/${tenantId}/note`,{note}))}
                  disabled={saving} style={{ ...primaryBtn, marginTop:8 }}>
                  <Save size={14}/>{saving?'Saving…':'Save note'}
                </button>
              </Section>
            </div>
          )}
        </div>
      </ModalBox>
    </Overlay>
  );
}

// ── Provision Modal ───────────────────────────────────────────────────────────
function ProvisionModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    companyName:'', subdomain:'', ownerEmail:'', adminPassword:'',
    whatsappNumber:'', openingTime:'09:00', closingTime:'18:00',
    plan:'free',
  });
  const [logoFile, setLogoFile]     = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');
  const [step, setStep]             = useState(1); // 1=basic, 2=settings

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = ev => setLogoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k,v]) => fd.append(k,v));
      if (logoFile) fd.append('logo', logoFile);
      await SA.post('/tenants/create-company', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      onSuccess();
    } catch(err) {
      setError(err.response?.data?.message || 'Failed to create client');
    } finally { setSaving(false); }
  };

  const inp = (label, field, type='text', placeholder='', required=true) => (
    <div key={field} style={{ marginBottom:14 }}>
      <label style={labelStyle}>{label}{required && <span style={{ color:C.red }}> *</span>}</label>
      <input type={type} value={form[field]} placeholder={placeholder} required={required}
        onChange={e=>setForm(p=>({...p,[field]:e.target.value}))} style={inputStyle}/>
    </div>
  );

  return (
    <Overlay onClick={e=>e.target===e.currentTarget&&onClose()}>
      <ModalBox style={{ maxWidth:560 }}>
        {/* Header */}
        <div style={{ padding:'20px 24px', borderBottom:`1px solid ${C.border}`,
          display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:8, background:C.blueL,
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Building2 size={18} color={C.blue}/>
            </div>
            <div>
              <div style={{ fontSize:16, fontWeight:700, color:C.text }}>Add new client</div>
              <div style={{ fontSize:12, color:C.muted }}>Provision a new tenant workspace</div>
            </div>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <span style={{ fontSize:11, color:C.muted }}>Step {step} of 2</span>
            <button onClick={onClose} style={iconBtn}><X size={18}/></button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding:'20px 24px', maxHeight:'70vh', overflowY:'auto' }}>

            {step === 1 && (
              <>
                {/* Logo upload */}
                <div style={{ marginBottom:18 }}>
                  <label style={labelStyle}>Company logo</label>
                  <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                    <div style={{ width:72, height:72, borderRadius:12, border:`2px dashed ${C.border2}`,
                      display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden',
                      background:C.bg, flexShrink:0 }}>
                      {logoPreview
                        ? <img src={logoPreview} alt="logo" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                        : <Building2 size={28} color={C.muted2}/>
                      }
                    </div>
                    <div>
                      <label style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'8px 14px',
                        border:`1px solid ${C.border2}`, borderRadius:8, cursor:'pointer', fontSize:13,
                        fontWeight:500, color:C.text2, background:C.card }}>
                        <FileText size={14}/> Upload logo
                        <input type="file" accept="image/*" onChange={handleLogoChange} style={{ display:'none' }}/>
                      </label>
                      <div style={{ fontSize:11, color:C.muted, marginTop:5 }}>PNG, JPG up to 5MB. Shown in sidebar.</div>
                      {logoFile && <div style={{ fontSize:11, color:C.green, marginTop:3, display:'flex', gap:4 }}><CheckCircle2 size={11}/>{logoFile.name}</div>}
                    </div>
                  </div>
                </div>

                {inp('Company name','companyName','text','e.g. Navtech Industries')}
                {inp('Subdomain','subdomain','text','navtech  (lowercase, no spaces)')}
                {inp('Admin email','ownerEmail','email','admin@company.com')}
                {inp('Admin password','adminPassword','password','Minimum 6 characters')}
              </>
            )}

            {step === 2 && (
              <>
                <div style={{ marginBottom:14 }}>
                  <label style={labelStyle}>WhatsApp number (for notifications)</label>
                  <input type="text" value={form.whatsappNumber} placeholder="+919876543210"
                    onChange={e=>setForm(p=>({...p,whatsappNumber:e.target.value}))} style={inputStyle}/>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
                  <div>
                    <label style={labelStyle}>Office opening time</label>
                    <input type="time" value={form.openingTime}
                      onChange={e=>setForm(p=>({...p,openingTime:e.target.value}))} style={inputStyle}/>
                  </div>
                  <div>
                    <label style={labelStyle}>Office closing time</label>
                    <input type="time" value={form.closingTime}
                      onChange={e=>setForm(p=>({...p,closingTime:e.target.value}))} style={inputStyle}/>
                  </div>
                </div>

                <div style={{ marginBottom:14 }}>
                  <label style={labelStyle}>Starting plan</label>
                  <select value={form.plan} onChange={e=>setForm(p=>({...p,plan:e.target.value}))} style={inputStyle}>
                    {['free','starter','pro','enterprise','custom'].map(p=>(
                      <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>
                    ))}
                  </select>
                </div>

                <div style={{ background:C.blueL, borderRadius:10, padding:'12px 14px', border:`1px solid ${C.blue}20` }}>
                  <div style={{ fontSize:12, fontWeight:600, color:C.blueT, marginBottom:6, display:'flex', gap:5, alignItems:'center' }}>
                    <CheckCircle2 size={13}/> Summary
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:4, fontSize:12, color:C.text2 }}>
                    <div><span style={{ color:C.muted }}>Company:</span> {form.companyName}</div>
                    <div><span style={{ color:C.muted }}>URL:</span> {form.subdomain}.lrbcloud.ai</div>
                    <div><span style={{ color:C.muted }}>Admin:</span> {form.ownerEmail}</div>
                    <div><span style={{ color:C.muted }}>Plan:</span> {form.plan}</div>
                  </div>
                </div>
              </>
            )}

            {error && <div style={{ ...errorBanner, marginTop:12 }}><AlertCircle size={13}/>{error}</div>}
          </div>

          {/* Footer */}
          <div style={{ padding:'14px 24px', borderTop:`1px solid ${C.border}`,
            display:'flex', gap:10, justifyContent:'flex-end' }}>
            <button type="button" onClick={onClose} style={secondaryBtn}>Cancel</button>
            {step === 1
              ? <button type="button"
                  onClick={()=>{
                    if (!form.companyName||!form.subdomain||!form.ownerEmail||!form.adminPassword) {
                      setError('Please fill all required fields'); return;
                    }
                    setError(''); setStep(2);
                  }}
                  style={primaryBtn}>
                  Next: Settings <ChevronRight size={14}/>
                </button>
              : <>
                  <button type="button" onClick={()=>setStep(1)} style={secondaryBtn}>
                    <ChevronRight size={14} style={{ transform:'rotate(180deg)'}}/> Back
                  </button>
                  <button type="submit" disabled={saving} style={primaryBtn}>
                    <Building2 size={14}/>{saving?'Creating…':'Create workspace'}
                  </button>
                </>
            }
          </div>
        </form>
      </ModalBox>
    </Overlay>
  );
}

// ── Tickets Modal ─────────────────────────────────────────────────────────────
function TicketsModal({ onClose }) {
  const [tickets, setTickets]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);
  const [remarks, setRemarks]   = useState('');
  const [saving, setSaving]     = useState(false);
  const [filter, setFilter]     = useState('open');
  const [search, setSearch]     = useState('');

  const loadTickets = () => {
    setLoading(true);
    SA.get('/tickets/all')
      .then(r => setTickets(Array.isArray(r.data) ? r.data : []))
      .catch(() => setTickets([]))
      .finally(() => setLoading(false));
  };
  useEffect(loadTickets, []);

  const handleResolve = async (id) => {
    setSaving(true);
    try {
      // Try both resolve endpoints
      // Use the correct endpoint: PUT /tickets/resolve with ticketId in body
      await SA.put('/tickets/resolve', { ticketId: id, remarks });
      setTickets(p => p.map(t => t._id===id ? {...t, status:'resolved', resolutionRemarks:remarks} : t));
      setSelected(null); setRemarks('');
    } catch(e) { alert('Failed to resolve: ' + (e.response?.data?.message||e.message)); }
    finally { setSaving(false); }
  };

  const isImage = url => url && /\.(jpg|jpeg|png|gif|webp)$/i.test(url);

  const filtered = tickets.filter(t => {
    const matchFilter = filter==='all' || t.status===filter || (!t.status && filter==='open');
    const matchSearch = !search || 
      (t.subject||t.title||'').toLowerCase().includes(search.toLowerCase()) ||
      (t.raisedBy||t.employeeName||'').toLowerCase().includes(search.toLowerCase()) ||
      (t.companyName||'').toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const openCount     = tickets.filter(t => !t.status || t.status==='open').length;
  const resolvedCount = tickets.filter(t => t.status==='resolved').length;

  return (
    <Overlay onClick={e=>e.target===e.currentTarget&&onClose()}>
      <ModalBox style={{ maxWidth:860, maxHeight:'90vh', display:'flex', flexDirection:'column' }}>
        {/* Header */}
        <div style={{ padding:'18px 24px', borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:36, height:36, borderRadius:8, background:'#FDF2FA',
                display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Ticket size={18} color='#C11574'/>
              </div>
              <div>
                <div style={{ fontSize:16, fontWeight:700, color:C.text }}>Support tickets</div>
                <div style={{ fontSize:12, color:C.muted }}>{tickets.length} total</div>
              </div>
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <button onClick={loadTickets} style={iconBtn}><RefreshCw size={14}/></button>
              <button onClick={onClose} style={iconBtn}><X size={18}/></button>
            </div>
          </div>
          {/* Stats row */}
          <div style={{ display:'flex', gap:10, marginBottom:12 }}>
            {[
              ['all',      'All',      tickets.length,  C.muted,  '#F9FAFB'],
              ['open',     'Open',     openCount,        C.amber,  C.amberL],
              ['resolved', 'Resolved', resolvedCount,    C.green,  C.greenL],
            ].map(([f, label, count, color, bg]) => (
              <button key={f} onClick={() => setFilter(f)}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px',
                  border:`1px solid ${filter===f ? color : C.border}`, borderRadius:8,
                  background: filter===f ? bg : C.card, cursor:'pointer',
                  fontSize:13, fontWeight: filter===f ? 600 : 400,
                  color: filter===f ? color : C.muted }}>
                {label}
                <span style={{ padding:'1px 7px', borderRadius:10, fontSize:11, fontWeight:700,
                  background: filter===f ? color+'20' : C.bg, color: filter===f ? color : C.muted }}>
                  {count}
                </span>
              </button>
            ))}
            <div style={{ flex:1, display:'flex', alignItems:'center', gap:8,
              border:`1px solid ${C.border}`, borderRadius:8, padding:'6px 12px', background:C.card }}>
              <Search size={13} color={C.muted}/>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="Search by subject, employee, company…"
                style={{ border:'none', outline:'none', fontSize:13, color:C.text, background:'transparent', width:'100%' }}/>
            </div>
          </div>
        </div>

        {/* Ticket list */}
        <div style={{ flex:1, overflowY:'auto', padding:'16px 24px' }}>
          {loading && <div style={{ textAlign:'center', padding:40, color:C.muted }}>Loading tickets…</div>}
          {!loading && filtered.length===0 && (
            <div style={{ textAlign:'center', padding:40 }}>
              <Ticket size={40} color={C.muted2} style={{ margin:'0 auto 12px', display:'block', opacity:.4 }}/>
              <div style={{ fontSize:14, color:C.muted }}>No {filter !== 'all' ? filter : ''} tickets found</div>
            </div>
          )}
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {filtered.map(t => {
              const isResolved = t.status === 'resolved';
              const files = t.initialMedia || t.files || t.attachments || [];
              return (
                <div key={t._id} style={{
                  border:`1px solid ${isResolved ? C.border : C.amberL}`,
                  borderLeft: `3px solid ${isResolved ? C.green : C.amber}`,
                  borderRadius:10, overflow:'hidden',
                  background: isResolved ? '#FAFAFA' : C.card,
                }}>
                  <div style={{ padding:'14px 16px' }}>
                    {/* Top row: subject + badges */}
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                      <div style={{ flex:1, minWidth:0, marginRight:12 }}>
                        <div style={{ fontSize:14, fontWeight:600, color:C.text, marginBottom:5 }}>
                          {t.subject || t.title || 'No subject'}
                        </div>
                        {/* Company + Employee info */}
                        <div style={{ display:'flex', flexWrap:'wrap', gap:12, marginBottom:4 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:12,
                            padding:'3px 10px', background:C.blueL, borderRadius:6, color:C.blueT }}>
                            <Building2 size={12}/>
                            <strong>{t.companyName || t.tenantId?.companyName || '—'}</strong>
                          </div>
                          <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:12,
                            padding:'3px 10px', background:C.bg, borderRadius:6, color:C.text2, border:`1px solid ${C.border}` }}>
                            <User size={12}/>
                            {t.raisedBy || t.reporterName || t.employeeName || '—'}
                          </div>
                          <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:C.muted }}>
                            <Clock size={11}/>{timeAgo(t.createdAt)}
                          </div>
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                        {t.priority && <Badge type={t.priority}/>}
                        <Badge type={isResolved ? 'resolved' : 'open'}/>
                      </div>
                    </div>

                    {/* Description */}
                    {(t.description || t.message || t.issue) && (
                      <div style={{ fontSize:13, color:C.text2, lineHeight:1.6, marginBottom:10,
                        padding:'8px 12px', background:C.bg, borderRadius:8, borderLeft:`2px solid ${C.border2}` }}>
                        {t.description || t.message || t.issue}
                      </div>
                    )}

                    {/* Attached files */}
                    {files.length > 0 && (
                      <div style={{ marginBottom:10 }}>
                        <div style={{ fontSize:11, fontWeight:600, color:C.muted, marginBottom:6, display:'flex', gap:5, alignItems:'center' }}>
                          <FileText size={11}/> Attachments ({files.length})
                        </div>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                          {files.map((file, fi) => {
                            const url = file.url || file.location || file;
                            const name = file.name || file.originalname || `File ${fi+1}`;
                            return isImage(url)
                              ? <a key={fi} href={url} target="_blank" rel="noreferrer"
                                  style={{ display:'block', border:`1px solid ${C.border}`, borderRadius:8, overflow:'hidden' }}>
                                  <img src={url} alt={name} style={{ width:80, height:60, objectFit:'cover', display:'block' }}/>
                                </a>
                              : <a key={fi} href={url} target="_blank" rel="noreferrer"
                                  style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 10px',
                                    border:`1px solid ${C.border}`, borderRadius:7, fontSize:12, color:C.blue,
                                    textDecoration:'none', background:C.blueL }}>
                                  <FileText size={13}/>{name}
                                </a>;
                          })}
                        </div>
                      </div>
                    )}

                    {/* Resolution / Resolve action */}
                    {isResolved ? (
                      <div style={{ padding:'8px 12px', background:C.greenL, borderRadius:8,
                        fontSize:12, color:C.greenT, display:'flex', gap:6, alignItems:'flex-start' }}>
                        <CheckCircle2 size={14} style={{ flexShrink:0, marginTop:1 }}/>
                        <div>
                          <div style={{ fontWeight:600, marginBottom:2 }}>Resolved</div>
                          {(t.resolutionRemarks || t.remarks || t.resolution) &&
                            <div style={{ opacity:.85 }}>{t.resolutionRemarks || t.remarks || t.resolution}</div>
                          }
                        </div>
                      </div>
                    ) : selected===t._id ? (
                      <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:12, marginTop:4 }}>
                        <label style={labelStyle}>Resolution remarks</label>
                        <textarea value={remarks} onChange={e=>setRemarks(e.target.value)}
                          placeholder="Describe how this was resolved…" rows={2}
                          style={{ ...inputStyle, resize:'none', marginBottom:10 }}/>
                        <div style={{ display:'flex', gap:8 }}>
                          <button onClick={()=>{setSelected(null);setRemarks('');}} style={secondaryBtn}>Cancel</button>
                          <button onClick={()=>handleResolve(t._id)} disabled={saving}
                            style={{ ...primaryBtn, background:C.green }}>
                            <CheckCircle2 size={14}/>{saving?'Saving…':'Mark as resolved'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={()=>setSelected(t._id)}
                        style={{ ...secondaryBtn, fontSize:12, marginTop:4 }}>
                        <CheckCircle2 size={13}/> Resolve this ticket
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </ModalBox>
    </Overlay>
  );
}

// ── Login Page ────────────────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleLogin = async(e)=>{
    e.preventDefault(); setLoading(true); setError('');
    try{
      const res = await SA.post('/tenants/master-login',{username,password});
      const {token,user} = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('isSuperAdmin', 'true');
      localStorage.setItem('user', JSON.stringify({...user, isSuperAdmin: true}));
      onLogin(user);
    }catch(err){setError(err.response?.data?.message||'Invalid credentials');}
    finally{setLoading(false);}
  };

  return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      <div style={{ width:380 }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ width:56, height:56, borderRadius:14, background:C.blue, display:'flex', alignItems:'center',
            justifyContent:'center', margin:'0 auto 16px' }}>
            <Shield size={28} color='white'/>
          </div>
          <div style={{ fontSize:24, fontWeight:700, color:C.text }}>WorkPilot</div>
          <div style={{ fontSize:14, color:C.muted, marginTop:4 }}>SuperAdmin Console</div>
        </div>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:'28px 32px' }}>
          <div style={{ fontSize:17, fontWeight:700, color:C.text, marginBottom:4 }}>Sign in</div>
          <div style={{ fontSize:13, color:C.muted, marginBottom:20 }}>Enter your superadmin credentials</div>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom:14 }}>
              <label style={labelStyle}>Username</label>
              <div style={{ position:'relative' }}>
                <User size={15} color={C.muted} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)' }}/>
                <input type="text" value={username} onChange={e=>setUsername(e.target.value)} required
                  placeholder="Enter username" style={{ ...inputStyle, paddingLeft:36 }}/>
              </div>
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={labelStyle}>Password</label>
              <div style={{ position:'relative' }}>
                <Lock size={15} color={C.muted} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)' }}/>
                <input type={showPwd?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} required
                  placeholder="Enter password" style={{ ...inputStyle, paddingLeft:36, paddingRight:36 }}/>
                <button type="button" onClick={()=>setShowPwd(p=>!p)}
                  style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:C.muted, display:'flex' }}>
                  {showPwd?<EyeOff size={15}/>:<Eye size={15}/>}
                </button>
              </div>
            </div>
            {error && <div style={{ ...errorBanner, marginBottom:16 }}><AlertCircle size={13}/>{error}</div>}
            <button type="submit" disabled={loading} style={{ ...primaryBtn, width:'100%', justifyContent:'center', padding:'11px' }}>
              {loading ? 'Signing in…' : <><Shield size={15}/>Sign in to console</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Shared UI helpers ─────────────────────────────────────────────────────────
function Overlay({ onClick, children }) {
  return <div onClick={onClick} style={{ position:'fixed', inset:0, background:'rgba(16,24,40,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>{children}</div>;
}
function ModalBox({ children, style={} }) {
  return <div style={{ background:C.card, borderRadius:16, width:'100%', border:`1px solid ${C.border}`, ...style }}>{children}</div>;
}
function Section({ icon:Icon, title, color, accent, children }) {
  return (
    <div style={{ border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden' }}>
      <div style={{ padding:'12px 16px', background:accent, borderBottom:`1px solid ${C.border}`,
        display:'flex', alignItems:'center', gap:8 }}>
        <Icon size={15} color={color}/> <span style={{ fontSize:13, fontWeight:600, color:C.text2 }}>{title}</span>
      </div>
      <div style={{ padding:'16px' }}>{children}</div>
    </div>
  );
}
function MsgBanner({ msg }) {
  const ok = msg==='success';
  return (
    <div style={{ padding:'8px 12px', borderRadius:8, fontSize:12, marginBottom:12,
      background:ok?C.greenL:C.redL, color:ok?C.greenT:C.redT,
      display:'flex', alignItems:'center', gap:6 }}>
      {ok ? <CheckCircle2 size={13}/> : <AlertCircle size={13}/>}
      {ok ? 'Saved successfully' : msg.replace('error:','')}
    </div>
  );
}

const inputStyle = { width:'100%', padding:'9px 12px', border:`1px solid ${C.border2}`, borderRadius:8,
  fontSize:13, color:'#101828', outline:'none', background:'white', boxSizing:'border-box',
  fontFamily:'inherit', transition:'border-color .15s' };
const labelStyle = { fontSize:12, fontWeight:500, color:'#344054', display:'block', marginBottom:5 };
const primaryBtn = { display:'inline-flex', alignItems:'center', gap:6, padding:'9px 16px',
  background:'#1570EF', color:'white', border:'none', borderRadius:8, fontSize:13,
  fontWeight:600, cursor:'pointer', transition:'opacity .12s' };
const secondaryBtn = { display:'inline-flex', alignItems:'center', gap:6, padding:'9px 14px',
  background:'white', color:'#344054', border:'1px solid #D0D5DD', borderRadius:8,
  fontSize:13, fontWeight:500, cursor:'pointer' };
const iconBtn = { background:'none', border:`1px solid ${C.border}`, borderRadius:8, padding:'6px',
  cursor:'pointer', display:'flex', alignItems:'center', color:'#667085' };
const errorBanner = { padding:'8px 12px', borderRadius:8, background:'#FEF3F2', color:'#B42318',
  fontSize:12, display:'flex', alignItems:'center', gap:6 };

// ── Main Panel ────────────────────────────────────────────────────────────────
function SuperAdminPanel({ user: initialUser, onLogout: handleLogout }) {
  const [user]                    = useState(initialUser||null);
  const [stats, setStats]         = useState(null);
  const [tenants, setTenants]     = useState([]);
  const [feed, setFeed]           = useState([]);
  const [selectedTenant, setSelected] = useState(null);
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(false);
  const [filterStatus, setFilter] = useState('all');
  const [showProvision, setShowProvision] = useState(false);
  const [showTickets,   setShowTickets]   = useState(false);
  const [viewMode, setViewMode]   = useState('list');

  const load = useCallback(async()=>{
    // Guard: make sure token exists before making requests
    const token = localStorage.getItem('token');
    if (!token) { console.warn('[SuperAdmin] No token found, skipping load'); return; }
    setLoading(true);
    try{
      const [sR,tR,fR] = await Promise.all([
        SA.get('/superadmin/dashboard'),
        SA.get('/superadmin/tenants'),
        SA.get('/superadmin/feed?limit=30'),
      ]);
      setStats(sR.data); setTenants(tR.data); setFeed(fR.data);
    }catch(e){
      console.error('[SuperAdmin] Load error:', e.response?.status, e.message);
      if (e.response?.status === 401) {
        // Token expired or invalid — force re-login
        localStorage.removeItem('token');
        localStorage.removeItem('isSuperAdmin');
        handleLogout();
      }
    }finally{setLoading(false);}
  },[]);

  useEffect(()=>{load();},[load]);

  const filtered = tenants.filter(t=>{
    const ms = !search || t.companyName?.toLowerCase().includes(search.toLowerCase()) || t.subdomain?.includes(search.toLowerCase());
    const mf = filterStatus==='all' || t.superAdmin?.status===filterStatus || t.superAdmin?.plan===filterStatus;
    return ms && mf;
  });

  const FEED_ICONS = { login:Lock, task_created:CheckCircle2, order_submitted:Package,
    step_completed:Zap, whatsapp_sent:Bell, flow_created:Activity, default:Activity };

  return (
    <div style={{ minHeight:'100vh', background:C.bg, fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>

      {/* Top nav */}
      <div style={{ background:C.card, borderBottom:`1px solid ${C.border}`, padding:'0 28px',
        display:'flex', alignItems:'center', height:60, position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, flex:1 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:C.blue,
            display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Shield size={17} color='white'/>
          </div>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:C.text }}>WorkPilot SuperAdmin</div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={()=>setShowProvision(true)}
            style={{ ...primaryBtn, fontSize:12 }}>
            <Plus size={14}/>Add client
          </button>
          <button onClick={()=>setShowTickets(true)}
            style={{ ...secondaryBtn, fontSize:12 }}>
            <Ticket size={14}/>Tickets
          </button>
          <button onClick={load}
            style={{ ...iconBtn }}>
            <RefreshCw size={15} style={{ animation:loading?'spin 1s linear infinite':undefined }}/>
          </button>
          <div style={{ width:1, height:28, background:C.border, margin:'0 4px' }}/>
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 10px',
            background:C.bg, borderRadius:8, border:`1px solid ${C.border}` }}>
            {avatar(user?.name||'SA', 24)}
            <span style={{ fontSize:13, fontWeight:500, color:C.text2 }}>{user?.name||'SuperAdmin'}</span>
          </div>
          <button onClick={handleLogout}
            style={{ ...iconBtn, color:C.red, borderColor:C.red+'40' }}>
            <LogOut size={15}/>
          </button>
        </div>
      </div>

      <div style={{ maxWidth:1280, margin:'0 auto', padding:'24px 28px' }}>

        {/* Stats */}
        {stats && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
            <StatCard icon={Building2} label="Total tenants"     value={stats.totalTenants}       sub={`${stats.pausedTenants} paused`}  color={C.blue}/>
            <StatCard icon={Users}     label="Total employees"   value={fmt(stats.totalEmployees)} sub="across all tenants"               color={C.green}/>
            <StatCard icon={DollarSign}label="Revenue this month"value={fmtR(stats.revenueThisMonth)} sub="paid invoices"                color={C.amber}/>
            <StatCard icon={Zap}       label="Active today"      value={stats.activeUsersToday}   sub="logged in last 24h"               color={C.purple}/>
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:20 }}>

          {/* Left: tenants */}
          <div>
            {/* Toolbar */}
            <div style={{ display:'flex', gap:10, marginBottom:14 }}>
              <div style={{ flex:1, display:'flex', alignItems:'center', gap:8,
                border:`1px solid ${C.border}`, borderRadius:9, padding:'8px 12px', background:C.card }}>
                <Search size={15} color={C.muted}/>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search tenants…"
                  style={{ border:'none', outline:'none', fontSize:13, color:C.text, background:'transparent', width:'100%' }}/>
              </div>
              <select value={filterStatus} onChange={e=>setFilter(e.target.value)}
                style={{ padding:'8px 12px', border:`1px solid ${C.border}`, borderRadius:9,
                  fontSize:13, color:C.text2, background:C.card, outline:'none' }}>
                <option value="all">All status</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
              <div style={{ display:'flex', border:`1px solid ${C.border}`, borderRadius:9, overflow:'hidden' }}>
                {[['grid',LayoutGrid],['list',List]].map(([m,Icon])=>(
                  <button key={m} onClick={()=>setViewMode(m)}
                    style={{ padding:'8px 10px', border:'none', cursor:'pointer',
                      background: viewMode===m?C.blue:C.card, color:viewMode===m?'white':C.muted }}>
                    <Icon size={15}/>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ fontSize:12, color:C.muted, marginBottom:10 }}>
              {loading ? 'Loading…' : `${filtered.length} ${filtered.length===1?'tenant':'tenants'}`}
            </div>

            {viewMode==='grid'
              ? <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  {filtered.map(t=><TenantCard key={t._id} t={t} onClick={()=>setSelected(t._id)}/>)}
                </div>
              : <div style={{ border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden', background:C.card }}>
                  <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead>
                      <tr style={{ background:C.bg, borderBottom:`1px solid ${C.border}` }}>
                        {['Company','Status','Plan','Employees','Tasks/mo','Orders/mo','Active Flows','Last Login',''].map(h=>(
                          <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11,
                            fontWeight:600, color:C.muted, textTransform:'uppercase', letterSpacing:.5,
                            whiteSpace:'nowrap', borderRight:`1px solid ${C.border}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((t,i)=>(
                        <tr key={t._id} onClick={()=>setSelected(t._id)}
                          style={{ borderBottom:`1px solid ${C.border}`, cursor:'pointer',
                            background: i%2===0?C.card:'#FAFAFA', transition:'background .1s' }}
                          onMouseEnter={e=>e.currentTarget.style.background='#EFF4FF'}
                          onMouseLeave={e=>e.currentTarget.style.background=i%2===0?C.card:'#FAFAFA'}>
                          <td style={{ padding:'10px 14px', borderRight:`1px solid ${C.border}` }}>
                            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                              {avatar(t.companyName, 28)}
                              <div>
                                <div style={{ fontSize:13, fontWeight:600, color:C.text }}>{t.companyName}</div>
                                <div style={{ fontSize:11, color:C.muted }}>{t.subdomain}.lrbcloud.ai</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding:'10px 14px', borderRight:`1px solid ${C.border}` }}>
                            <Badge type={t.superAdmin?.status||'active'}/>
                          </td>
                          <td style={{ padding:'10px 14px', borderRight:`1px solid ${C.border}` }}>
                            <Badge type={t.superAdmin?.plan||'free'}/>
                          </td>
                          <td style={{ padding:'10px 14px', fontSize:13, fontWeight:600, color:C.text, borderRight:`1px solid ${C.border}`, textAlign:'center' }}>
                            {t.stats?.employeeCount||0}
                          </td>
                          <td style={{ padding:'10px 14px', fontSize:13, fontWeight:600, color:C.text, borderRight:`1px solid ${C.border}`, textAlign:'center' }}>
                            {t.stats?.tasksThisMonth||0}
                          </td>
                          <td style={{ padding:'10px 14px', fontSize:13, fontWeight:600, color:C.text, borderRight:`1px solid ${C.border}`, textAlign:'center' }}>
                            {t.stats?.ordersThisMonth||0}
                          </td>
                          <td style={{ padding:'10px 14px', fontSize:13, fontWeight:600, color: (t.stats?.activeFlows||0)>0?C.blue:C.muted, borderRight:`1px solid ${C.border}`, textAlign:'center' }}>
                            {t.stats?.activeFlows||0}
                          </td>
                          <td style={{ padding:'10px 14px', fontSize:11, color:C.muted, borderRight:`1px solid ${C.border}`, whiteSpace:'nowrap' }}>
                            {t.stats?.lastActivity ? timeAgo(t.stats.lastActivity.createdAt) : 'Never'}
                          </td>
                          <td style={{ padding:'10px 14px', textAlign:'center' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, color:C.blue, fontWeight:500 }}>
                              <Eye size={13}/> View
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filtered.length===0 && <div style={{ textAlign:'center', padding:32, color:C.muted, fontSize:13 }}>No tenants found</div>}
                </div>
            }
          </div>

          {/* Right: live feed */}
          <div style={{ position:'sticky', top:76 }}>
            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden' }}>
              <div style={{ padding:'14px 16px', borderBottom:`1px solid ${C.border}`,
                display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ fontSize:14, fontWeight:600, color:C.text, display:'flex', gap:6, alignItems:'center' }}>
                  <Activity size={15} color={C.blue}/> Live activity
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <div style={{ width:6, height:6, borderRadius:'50%', background:C.green }}/>
                  <span style={{ fontSize:11, color:C.green, fontWeight:500 }}>All tenants</span>
                </div>
              </div>
              <div style={{ maxHeight:520, overflowY:'auto' }}>
                {feed.length===0 && <div style={{ textAlign:'center', padding:32, color:C.muted, fontSize:13 }}>No recent activity</div>}
                {feed.map((log,i)=>{
                  const Icon = FEED_ICONS[log.action]||FEED_ICONS.default;
                  return (
                    <div key={i} style={{ padding:'10px 14px', borderBottom:`1px solid ${C.border}`,
                      display:'flex', gap:10, alignItems:'flex-start',
                      background: i%2===0?C.card:'#FAFAFA' }}>
                      <div style={{ width:28, height:28, borderRadius:'50%', background:C.blueL,
                        display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <Icon size={12} color={C.blue}/>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:500, color:C.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {log.employeeName}
                        </div>
                        <div style={{ fontSize:11, color:C.muted, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {log.description||log.action?.replace(/_/g,' ')}
                        </div>
                        <div style={{ fontSize:10, color:C.muted2, marginTop:2 }}>
                          {log.tenantId?.companyName||'—'}
                        </div>
                      </div>
                      <div style={{ fontSize:10, color:C.muted2, flexShrink:0 }}>{timeAgo(log.createdAt)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showProvision && <ProvisionModal onClose={()=>setShowProvision(false)} onSuccess={()=>{setShowProvision(false);load();}}/>}
      {showTickets   && <TicketsModal  onClose={()=>setShowTickets(false)}/>}
      {selectedTenant && <TenantDetail tenantId={selectedTenant} onClose={()=>setSelected(null)} onRefresh={load}/>}

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── App.jsx wrapper ───────────────────────────────────────────────────────────
export default function SuperAdmin({ isAuthenticated, onLogin, onLogout }) {
  if (!isAuthenticated) {
    return <LoginPage onLogin={(u)=>{ onLogin(localStorage.getItem('token'),{...u,isSuperAdmin:true}); }}/>;
  }
  const user = (()=>{ try{return JSON.parse(localStorage.getItem('user'))||{};}catch{return {};} })();
  return <SuperAdminPanel user={user} onLogout={onLogout}/>;
}