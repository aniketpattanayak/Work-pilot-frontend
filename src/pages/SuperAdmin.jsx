/**
 * SuperAdminRedesigned.jsx
 * Premium dark/light redesign — comparison file.
 * All logic, API calls, state, and component structure preserved from SuperAdmin.jsx.
 * Only visual layer changed: CSS custom properties, premium theme, theme toggle.
 */

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { dialog } from '../components/Dialog';
import {
  Shield, Building2, Users, DollarSign, Zap, RefreshCw, Plus,
  Ticket, LogOut, Search, ChevronRight, MoreVertical, Activity,
  TrendingUp, AlertCircle, CheckCircle2, PauseCircle, PlayCircle,
  Settings, Lock, FileText, MessageSquare, BarChart3, ShoppingCart,
  Star, ClipboardList, Wifi, X, Eye, EyeOff, Save, Trash2,
  Globe, Mail, Calendar, Clock, User, ArrowUpRight, Filter,
  Bell, Package, ToggleLeft, ToggleRight, CreditCard, StickyNote,
  ChevronDown, ChevronUp, LayoutGrid, List, Sparkles, NotebookPen, ListOrdered, Moon, Sun
} from 'lucide-react';
import ResponsiveTable from '../components/ResponsiveTable';
import { recordLoginSession } from '../utils/sessionTimeout';

// ── API setup (unchanged) ─────────────────────────────────────────────────────
const API = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api');
const SA = axios.create({ baseURL: API });
SA.interceptors.request.use(c => {
  const t = localStorage.getItem('token');
  if (t) { c.headers = c.headers || {}; c.headers.Authorization = `Bearer ${t}`; }
  return c;
}, err => Promise.reject(err));

// ── CSS Design Tokens (injected once at module level) ─────────────────────────
const THEME_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

  :root {
    --bg:       #F4F5F7;
    --bg2:      #EBEDF0;
    --surface:  #FFFFFF;
    --surface2: #F9FAFB;
    --surface3: #F3F4F6;
    --surface4: #E5E7EB;
    --border:   rgba(0,0,0,.08);
    --border2:  rgba(0,0,0,.12);
    --fg:       #111827;
    --fg2:      #374151;
    --fg3:      #6B7280;
    --indigo:       #4F46E5;
    --indigo2:      #6366F1;
    --indigo3:      #818CF8;
    --indigo-glow:  rgba(79,70,229,.18);
    --green:    #059669;
    --green2:   #10B981;
    --red:      #DC2626;
    --red2:     #EF4444;
    --amber:    #D97706;
    --amber2:   #F59E0B;
    --purple:   #7C3AED;
    --purple2:  #8B5CF6;
    --radius:   14px;
    --radius-sm:9px;
    --radius-xs:6px;
    --nav-w:    220px;
    color-scheme: light;
  }

  [data-theme="dark"], .sa-dark {
    --bg:       #090B11;
    --bg2:      #0E1117;
    --surface:  #131720;
    --surface2: #191E2A;
    --surface3: #1F2535;
    --surface4: #252C3F;
    --border:   rgba(255,255,255,.06);
    --border2:  rgba(255,255,255,.10);
    --fg:       #E8EAF6;
    --fg2:      #7F85A8;
    --fg3:      #3D4466;
    --indigo:       #6366F1;
    --indigo2:      #818CF8;
    --indigo3:      #A5B4FC;
    --indigo-glow:  rgba(99,102,241,.25);
    --green:    #10B981;
    --green2:   #34D399;
    --red:      #F43F5E;
    --red2:     #FB7185;
    --amber:    #F59E0B;
    --amber2:   #FCD34D;
    --purple:   #8B5CF6;
    --purple2:  #A78BFA;
    color-scheme: dark;
  }

  .sa-wrap * { box-sizing: border-box; }
  .sa-wrap { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }

  /* Topnav */
  .sa-topnav {
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    height: 60px; padding: 0 24px;
    display: flex; align-items: center;
    position: sticky; top: 0; z-index: 100;
    backdrop-filter: blur(12px);
  }

  /* Stat cards */
  .sa-stat {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 20px 24px;
    position: relative; overflow: hidden;
    transition: transform .15s, box-shadow .15s;
  }
  .sa-stat:hover { transform: translateY(-2px); box-shadow: 0 8px 32px var(--indigo-glow); }
  .sa-stat::after {
    content: '';
    position: absolute; top: 0; right: 0;
    width: 80px; height: 80px;
    background: radial-gradient(circle at 100% 0%, var(--accent-color, var(--indigo)), transparent 70%);
    opacity: .07;
  }

  /* Buttons */
  .sa-btn-primary {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 9px 16px;
    background: var(--indigo); color: #fff;
    border: none; border-radius: var(--radius-sm);
    font-size: 13px; font-weight: 600; cursor: pointer;
    box-shadow: 0 0 0 0 var(--indigo-glow);
    transition: opacity .12s, box-shadow .2s, transform .1s;
  }
  .sa-btn-primary:hover { opacity: .92; box-shadow: 0 0 0 6px var(--indigo-glow); transform: translateY(-1px); }
  .sa-btn-primary:disabled { opacity: .45; cursor: not-allowed; transform: none; box-shadow: none; }

  .sa-btn-secondary {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 9px 14px;
    background: var(--surface3); color: var(--fg2);
    border: 1px solid var(--border2); border-radius: var(--radius-sm);
    font-size: 13px; font-weight: 500; cursor: pointer;
    transition: background .12s, border-color .12s;
  }
  .sa-btn-secondary:hover { background: var(--surface4); border-color: var(--indigo3); }

  .sa-btn-icon {
    background: var(--surface3); border: 1px solid var(--border);
    border-radius: var(--radius-xs); padding: 7px;
    cursor: pointer; display: flex; align-items: center; color: var(--fg2);
    transition: background .12s, color .12s;
  }
  .sa-btn-icon:hover { background: var(--surface4); color: var(--fg); }

  /* Inputs */
  .sa-input {
    width: 100%; padding: 9px 12px;
    border: 1px solid var(--border2); border-radius: var(--radius-xs);
    font-size: 13px; color: var(--fg); outline: none;
    background: var(--surface2); box-sizing: border-box;
    font-family: inherit; transition: border-color .15s, box-shadow .15s;
  }
  .sa-input:focus { border-color: var(--indigo); box-shadow: 0 0 0 3px var(--indigo-glow); }
  .sa-input::placeholder { color: var(--fg3); }
  .sa-label { font-size: 12px; font-weight: 500; color: var(--fg2); display: block; margin-bottom: 5px; }

  /* Table */
  .sa-table { width: 100%; border-collapse: collapse; }
  .sa-table th {
    padding: 10px 14px; text-align: left;
    font-size: 11px; font-weight: 600; color: var(--fg3);
    text-transform: uppercase; letter-spacing: .5px;
    background: var(--surface2); border-bottom: 1px solid var(--border);
  }
  .sa-table td { padding: 10px 14px; border-bottom: 1px solid var(--border); }
  .sa-table tr:hover td { background: var(--surface3); }
  .sa-table tr:last-child td { border-bottom: none; }

  /* Tabs */
  .sa-tab {
    display: flex; align-items: center; gap: 6px;
    padding: 12px 14px; border: none; background: none; cursor: pointer;
    font-size: 13px; color: var(--fg3); font-weight: 400;
    border-bottom: 2px solid transparent; margin-bottom: -1px;
    transition: color .12s;
  }
  .sa-tab.active { color: var(--indigo2); font-weight: 600; border-bottom-color: var(--indigo); }
  .sa-tab:hover:not(.active) { color: var(--fg); }

  /* Feed item */
  .sa-feed-item {
    display: flex; gap: 10px; align-items: flex-start;
    padding: 10px 14px; border-bottom: 1px solid var(--border);
    transition: background .1s;
  }
  .sa-feed-item:hover { background: var(--surface2); }

  /* Tenant row */
  .sa-tenant-row { cursor: pointer; transition: background .1s; }
  .sa-tenant-row:hover td { background: var(--surface2); }

  /* Section header */
  .sa-section-hd {
    padding: 11px 16px; border-bottom: 1px solid var(--border);
    display: flex; align-items: center; gap: 8px;
    background: var(--surface2);
    font-size: 12px; font-weight: 600; color: var(--fg2);
  }

  /* Toggle label */
  .sa-toggle-label {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 14px; border-radius: var(--radius-xs); cursor: pointer;
    transition: background .12s, border-color .12s;
  }
  .sa-toggle-label.on { background: rgba(99,102,241,.08); border-color: var(--indigo3); }
  .sa-toggle-label.off { background: var(--surface3); }

  /* Overlay */
  .sa-overlay {
    position: fixed; inset: 0; z-index: 1000;
    background: rgba(0,0,0,.55); backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center; padding: 20px;
  }
  .sa-modal {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius); width: 100%;
  }

  /* Badge */
  .sa-badge {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 2px 9px; border-radius: 20px;
    font-size: 11px; font-weight: 500; white-space: nowrap;
  }
  .sa-badge-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

  /* Avatar */
  .sa-avatar {
    border-radius: 50%; color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-weight: 600; flex-shrink: 0; letter-spacing: .5px;
  }

  /* Live dot */
  @keyframes sa-pulse {
    0%,100% { opacity: 1; } 50% { opacity: .4; }
  }
  .sa-live-dot { animation: sa-pulse 2s ease-in-out infinite; }

  @keyframes sa-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .sa-spin { animation: sa-spin 1s linear infinite; }

  /* MsgBanner */
  .sa-msg-ok  { padding: 8px 12px; border-radius: var(--radius-xs); font-size: 12px; display: flex; align-items: center; gap: 6px; background: rgba(16,185,129,.12); color: var(--green2); }
  .sa-msg-err { padding: 8px 12px; border-radius: var(--radius-xs); font-size: 12px; display: flex; align-items: center; gap: 6px; background: rgba(244,63,94,.12); color: var(--red2); }
  .sa-err-banner { padding: 8px 12px; border-radius: var(--radius-xs); font-size: 12px; display: flex; align-items: center; gap: 6px; background: rgba(244,63,94,.12); color: var(--red2); }

  /* Monospace inputs */
  .sa-mono { font-family: 'JetBrains Mono', monospace; font-size: 12px; }
`;

// ── Theme context (simple) ────────────────────────────────────────────────────
function useTheme() {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('sa_theme') === 'dark'; } catch { return false; }
  });
  const toggle = () => setDark(d => {
    const next = !d;
    try { localStorage.setItem('sa_theme', next ? 'dark' : 'light'); } catch {}
    return next;
  });
  return { dark, toggle };
}

// ── Helpers (unchanged) ───────────────────────────────────────────────────────
const fmt = n => (n || 0).toLocaleString('en-IN');
const fmtR = n => `₹${fmt(n)}`;
function timeAgo(date) {
  if (!date) return 'Never';
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function initials(name = '') {
  return name.split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase() || '??';
}
function avatar(name, size = 36) {
  const COLS = ['#6366F1', '#059669', '#8B5CF6', '#D97706', '#DC2626', '#0E7090'];
  const bg = COLS[(name?.charCodeAt(0) || 0) % COLS.length];
  return (
    <div className="sa-avatar" style={{ width: size, height: size, background: bg, fontSize: size * 0.36 }}>
      {initials(name)}
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
function Badge({ type }) {
  const MAP = {
    active:     { bg: 'rgba(16,185,129,.12)', color: 'var(--green2)',  dot: 'var(--green)',  label: 'Active' },
    paused:     { bg: 'rgba(245,158,11,.12)', color: 'var(--amber2)',  dot: 'var(--amber)',  label: 'Paused' },
    suspended:  { bg: 'rgba(244,63,94,.12)',  color: 'var(--red2)',    dot: 'var(--red)',    label: 'Suspended' },
    free:       { bg: 'var(--surface3)',      color: 'var(--fg3)',     dot: 'var(--border2)',label: 'Free' },
    starter:    { bg: 'rgba(99,102,241,.12)', color: 'var(--indigo3)', dot: 'var(--indigo)', label: 'Starter' },
    pro:        { bg: 'rgba(139,92,246,.12)', color: 'var(--purple2)', dot: 'var(--purple)', label: 'Pro' },
    enterprise: { bg: 'rgba(16,185,129,.12)', color: 'var(--green2)',  dot: 'var(--green)',  label: 'Enterprise' },
    custom:     { bg: 'rgba(245,158,11,.12)', color: 'var(--amber2)',  dot: 'var(--amber)',  label: 'Custom' },
    paid:       { bg: 'rgba(16,185,129,.12)', color: 'var(--green2)',  dot: 'var(--green)',  label: 'Paid' },
    due:        { bg: 'rgba(245,158,11,.12)', color: 'var(--amber2)',  dot: 'var(--amber)',  label: 'Due' },
    overdue:    { bg: 'rgba(244,63,94,.12)',  color: 'var(--red2)',    dot: 'var(--red)',    label: 'Overdue' },
    open:       { bg: 'rgba(245,158,11,.12)', color: 'var(--amber2)',  dot: 'var(--amber)',  label: 'Open' },
    resolved:   { bg: 'rgba(16,185,129,.12)', color: 'var(--green2)',  dot: 'var(--green)',  label: 'Done' },
    inprogress: { bg: 'rgba(99,102,241,.12)', color: 'var(--indigo3)', dot: 'var(--indigo)', label: 'In progress' },
    high:       { bg: 'rgba(244,63,94,.12)',  color: 'var(--red2)',    dot: 'var(--red)',    label: 'High' },
    medium:     { bg: 'rgba(245,158,11,.12)', color: 'var(--amber2)',  dot: 'var(--amber)',  label: 'Medium' },
    low:        { bg: 'var(--surface3)',      color: 'var(--fg3)',     dot: 'var(--border2)',label: 'Low' },
  };
  const s = MAP[type] || MAP.free;
  return (
    <span className="sa-badge" style={{ background: s.bg, color: s.color }}>
      <span className="sa-badge-dot" style={{ background: s.dot }} />
      {s.label}
    </span>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="sa-stat" style={{ '--accent-color': color }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10,
          background: `${color}22`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          <Icon size={22} color={color} />
        </div>
        <div>
          <div style={{ fontSize: 12, color: 'var(--fg3)', fontWeight: 500, marginBottom: 4, textTransform: 'uppercase', letterSpacing: .5 }}>{label}</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--fg)', lineHeight: 1 }}>{value}</div>
          {sub && <div style={{ fontSize: 11, color: 'var(--fg3)', marginTop: 4 }}>{sub}</div>}
        </div>
      </div>
    </div>
  );
}

// ── Tenant Card ───────────────────────────────────────────────────────────────
function TenantCard({ t, onClick }) {
  const sa = t.superAdmin || {};
  const s = t.stats || {};
  const paused = sa.status === 'paused';
  return (
    <div onClick={onClick} style={{
      background: 'var(--surface)', border: `1px solid ${paused ? 'var(--amber)' : 'var(--border)'}`,
      borderLeft: paused ? '3px solid var(--amber)' : '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: 20, cursor: 'pointer',
      transition: 'border-color .15s, box-shadow .15s, transform .15s',
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 24px var(--indigo-glow)'; e.currentTarget.style.borderColor = 'var(--indigo)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = paused ? 'var(--amber)' : 'var(--border)'; e.currentTarget.style.transform = 'none'; }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {avatar(t.companyName, 36)}
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>{t.companyName}</div>
            <div style={{ fontSize: 11, color: 'var(--fg3)', marginTop: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Globe size={11} /> {t.subdomain}.lrbcloud.ai
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
          <Badge type={sa.status || 'active'} />
          <Badge type={sa.plan || 'free'} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
        {[[Users, s.employeeCount || 0, 'Employees'], [CheckCircle2, s.tasksThisMonth || 0, 'Tasks/mo'], [Package, s.ordersThisMonth || 0, 'Orders/mo']].map(([Icon, val, lbl]) => (
          <div key={lbl} style={{ background: 'var(--surface2)', borderRadius: 8, padding: '8px 10px', textAlign: 'center', border: '1px solid var(--border)' }}>
            <Icon size={13} color="var(--fg3)" style={{ marginBottom: 3 }} />
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg)' }}>{val}</div>
            <div style={{ fontSize: 10, color: 'var(--fg3)' }}>{lbl}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
        <div style={{ fontSize: 11, color: 'var(--fg3)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Clock size={11} /> {s.lastActivity?.employeeName || '—'} · {timeAgo(s.lastActivity?.createdAt)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--indigo2)', fontWeight: 500 }}>
          View details <ChevronRight size={12} />
        </div>
      </div>
    </div>
  );
}

// ── Shared UI helpers ─────────────────────────────────────────────────────────
function Overlay({ onClick, children }) {
  return <div className="sa-overlay" onClick={onClick}>{children}</div>;
}
function ModalBox({ children, style = {} }) {
  return <div className="sa-modal" style={style}>{children}</div>;
}
function Section({ icon: Icon, title, color, accent, children }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
      <div className="sa-section-hd">
        <Icon size={14} color={color} /> <span>{title}</span>
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}
function MsgBanner({ msg }) {
  const ok = msg === 'success';
  return (
    <div className={ok ? 'sa-msg-ok' : 'sa-msg-err'} style={{ marginBottom: 12 }}>
      {ok ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
      {ok ? 'Saved successfully' : msg.replace('error:', '')}
    </div>
  );
}

// ── Style shortcuts (reference var tokens) ────────────────────────────────────
const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid var(--border2)', borderRadius: 6, fontSize: 13, color: 'var(--fg)', outline: 'none', background: 'var(--surface2)', boxSizing: 'border-box', fontFamily: 'inherit', transition: 'border-color .15s' };
const labelStyle = { fontSize: 12, fontWeight: 500, color: 'var(--fg2)', display: 'block', marginBottom: 5 };
const primaryBtn = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: 'var(--indigo)', color: 'white', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'opacity .12s' };
const secondaryBtn = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', background: 'var(--surface3)', color: 'var(--fg2)', border: '1px solid var(--border2)', borderRadius: 7, fontSize: 13, fontWeight: 500, cursor: 'pointer' };
const iconBtn = { background: 'var(--surface3)', border: '1px solid var(--border)', borderRadius: 7, padding: '7px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--fg2)' };
const errorBanner = { padding: '8px 12px', borderRadius: 7, background: 'rgba(244,63,94,.12)', color: 'var(--red2)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 };

// ── Tenant Detail Modal ───────────────────────────────────────────────────────
function TenantDetail({ tenantId, onClose, onRefresh }) {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('overview');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [empLimit, setEmpLimit] = useState('');
  const [waLimit, setWaLimit] = useState('');
  const [uploadMb, setUploadMb] = useState(10);
  const [plan, setPlan] = useState('free');
  const [amount, setAmount] = useState('');
  const [renewalDate, setRenewal] = useState('');
  const [note, setNote] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [features, setFeatures] = useState({});
  const [hrModules, setHrModules] = useState({ attendance: false, leave: false, payroll: false });
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiMonthlyLimit, setAiMonthlyLimit] = useState(500);
  const [customMongoUri, setCustomMongoUri] = useState('');
  const [customWhatsappKey, setCustomWhatsappKey] = useState('');
  const [pauseReason, setPauseReason] = useState('');
  const [pauseFrom, setPauseFrom] = useState('');
  const [pauseTo, setPauseTo] = useState('');
  const [logFilter, setLogFilter] = useState('');
  const [switchAccess, setSwitchAccess] = useState([]);

  useEffect(() => {
    SA.get(`/superadmin/tenants/${tenantId}`).then(r => {
      setData(r.data);
      const sa = r.data.tenant?.superAdmin || {};
      setEmpLimit(sa.employeeLimit ?? 50);
      setWaLimit(sa.whatsappLimit ?? 1000);
      setUploadMb(sa.uploadLimitMb ?? 10);
      setPlan(sa.plan || 'free');
      setAmount(sa.amount || 0);
      setRenewal(sa.renewalDate ? sa.renewalDate.slice(0, 10) : '');
      setNote(sa.internalNote || '');
      setFeatures({ ...(sa.features || {}), personalTasks: sa.features?.personalTasks ?? true, formDesigner: sa.features?.formDesigner ?? false, menuControl: sa.features?.menuControl ?? false, dailyTaskAlert: sa.features?.dailyTaskAlert ?? false, planner: sa.features?.planner ?? false });
      setHrModules({ attendance: false, leave: false, payroll: false, ...(r.data.tenant?.hrModules || {}) });
      setCustomMongoUri(sa.customMongoUri || '');
      setCustomWhatsappKey(sa.customWhatsappKey || '');
      setAiEnabled(!!sa.aiAssistant?.enabled);
      setAiMonthlyLimit(sa.aiAssistant?.monthlyLimit ?? 500);
    }).catch(() => { });
    SA.get(`/superadmin/tenants/${tenantId}/switch-access`).then(r => setSwitchAccess(r.data.switches || [])).catch(() => { });
  }, [tenantId]);

  const api = async (fn) => {
    setSaving(true); setMsg('');
    try { await fn(); setMsg('success'); onRefresh(); setTimeout(() => setMsg(''), 2500); }
    catch (e) { setMsg('error:' + (e.response?.data?.message || 'Failed')); }
    finally { setSaving(false); }
  };

  if (!data) return (
    <Overlay onClick={onClose}>
      <ModalBox style={{ maxWidth: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
        <div style={{ color: 'var(--fg3)', fontSize: 14 }}>Loading…</div>
      </ModalBox>
    </Overlay>
  );

  const { tenant, employees = [], recentLogs = [], actionCounts = [], billing = [] } = data;
  const sa = tenant.superAdmin || {};
  const paused = sa.status === 'paused';
  const name = tenant.companyName;
  const countMap = {};
  actionCounts.forEach(a => { countMap[a._id] = a.count; });

  const TABS = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'employees', label: 'Employees', icon: Users },
    { id: 'logs', label: 'Activity', icon: Activity },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'controls', label: 'Controls', icon: Settings },
  ];

  const filteredLogs = logFilter
    ? recentLogs.filter(l => l.action?.includes(logFilter) || l.employeeName?.toLowerCase().includes(logFilter.toLowerCase()) || l.description?.toLowerCase().includes(logFilter.toLowerCase()))
    : recentLogs;

  const FEAT_ICONS = { tasks: CheckCircle2, personalTasks: NotebookPen, planner: ListOrdered, fms: Zap, chat: MessageSquare, reports: BarChart3, orderForms: ShoppingCart, whatsapp: Bell, rewards: Star, checklist: ClipboardList };

  return (
    <Overlay onClick={e => e.target === e.currentTarget && onClose()}>
      <ModalBox style={{ maxWidth: 800, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {avatar(name, 42)}
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--fg)' }}>{name}</div>
              <div style={{ fontSize: 12, color: 'var(--fg3)', display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
                <Mail size={11} /> {tenant.adminEmail}
                <span>·</span><Globe size={11} /> {tenant.subdomain}.lrbcloud.ai
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Badge type={sa.status || 'active'} />
            <Badge type={sa.plan || 'free'} />
            <button onClick={onClose} style={iconBtn}><X size={18} /></button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 24px', flexShrink: 0 }}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)} className={`sa-tab${tab === id ? ' active' : ''}`}>
              <Icon size={14} />{label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          {/* OVERVIEW */}
          {tab === 'overview' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
                {[
                  [Users, 'Employees', employees.length],
                  [CheckCircle2, 'Tasks created', countMap.task_created || 0],
                  [CheckCircle2, 'Tasks completed', countMap.task_completed || 0],
                  [Package, 'Orders/month', countMap.order_submitted || 0],
                  [Zap, 'Active flows', countMap.flow_active || 0],
                  [Lock, 'Logins/month', countMap.login || 0],
                ].map(([Icon, label, val]) => (
                  <div key={label} style={{ background: 'var(--surface2)', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, border: '1px solid var(--border)' }}>
                    <Icon size={18} color="var(--indigo2)" style={{ flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg)' }}>{val}</div>
                      <div style={{ fontSize: 11, color: 'var(--fg3)' }}>{label}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Features */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 14 }}>
                <div className="sa-section-hd"><ToggleRight size={14} /> Feature status</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 0 }}>
                  {Object.entries({ ...(sa.features || {}), personalTasks: sa.features?.personalTasks ?? true, formDesigner: sa.features?.formDesigner ?? false, menuControl: sa.features?.menuControl ?? false, dailyTaskAlert: sa.features?.dailyTaskAlert ?? false, planner: sa.features?.planner ?? false }).map(([f, on]) => {
                    const Icon = FEAT_ICONS[f] || Settings;
                    return (
                      <div key={f} style={{ padding: '10px 14px', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Icon size={14} color={on ? 'var(--green2)' : 'var(--fg3)'} />
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 500, color: on ? 'var(--fg)' : 'var(--fg3)', textTransform: 'capitalize' }}>{f === 'orderForms' ? 'Order Forms' : f}</div>
                          <div style={{ fontSize: 10, color: on ? 'var(--green2)' : 'var(--fg3)' }}>{on ? 'Enabled' : 'Disabled'}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg2)', marginBottom: 10, display: 'flex', gap: 6, alignItems: 'center' }}>
                    <Users size={13} /> Seat limits
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: 'var(--fg3)' }}>Employees</span>
                      <span style={{ fontWeight: 600, color: 'var(--fg)' }}>{employees.length} / {sa.employeeLimit || 50}</span>
                    </div>
                    <div style={{ height: 4, background: 'var(--surface3)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, (employees.length / (sa.employeeLimit || 50)) * 100)}%`, background: employees.length >= (sa.employeeLimit || 50) ? 'var(--red)' : 'var(--indigo)', borderRadius: 4 }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: 'var(--fg3)' }}>WhatsApp/mo</span>
                      <span style={{ fontWeight: 600, color: 'var(--fg)' }}>{fmt(sa.whatsappLimit || 1000)}</span>
                    </div>
                  </div>
                </div>
                <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg2)', marginBottom: 10, display: 'flex', gap: 6, alignItems: 'center' }}>
                    <StickyNote size={13} /> Internal note
                  </div>
                  {sa.internalNote
                    ? <div style={{ fontSize: 13, color: 'var(--fg2)', lineHeight: 1.6 }}>{sa.internalNote}</div>
                    : <div style={{ fontSize: 12, color: 'var(--fg3)' }}>No notes added yet</div>
                  }
                </div>
              </div>
            </div>
          )}

          {/* EMPLOYEES */}
          {tab === 'employees' && (
            <div>
              <div style={{ fontSize: 13, color: 'var(--fg3)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Users size={14} /> {employees.length} employees · {employees.filter(e => e.isActive !== false).length} active
              </div>
              <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                <ResponsiveTable>
                  <table className="mobile-card-table sa-table">
                    <thead>
                      <tr>{['Employee', 'Role', 'Last login', 'Status'].map(h => <th key={h}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {employees.map(e => (
                        <tr key={e._id}>
                          <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{avatar(e.name, 28)}<span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>{e.name}</span></div></td>
                          <td style={{ fontSize: 12, color: 'var(--fg3)' }}>{e.role || '—'}</td>
                          <td style={{ fontSize: 12, color: 'var(--fg3)' }}><div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={11} />{timeAgo(e.lastLogin)}</div></td>
                          <td><Badge type={e.isActive === false ? 'paused' : 'active'} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ResponsiveTable>
                {employees.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: 'var(--fg3)', fontSize: 13 }}>No employees yet</div>}
              </div>
            </div>
          )}

          {/* LOGS */}
          {tab === 'logs' && (
            <div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--border2)', borderRadius: 8, padding: '8px 12px', background: 'var(--surface2)' }}>
                  <Search size={14} color="var(--fg3)" />
                  <input value={logFilter} onChange={e => setLogFilter(e.target.value)} placeholder="Filter by name, action, description…" style={{ border: 'none', outline: 'none', fontSize: 13, color: 'var(--fg)', background: 'transparent', width: '100%' }} />
                </div>
                <select value={logFilter} onChange={e => setLogFilter(e.target.value)} style={{ ...inputStyle, maxWidth: 160 }}>
                  <option value="">All actions</option>
                  {['login', 'task_created', 'task_completed', 'order_submitted', 'step_completed', 'whatsapp_sent', 'flow_created'].map(a => (
                    <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div style={{ fontSize: 12, color: 'var(--fg3)', marginBottom: 10 }}>Last 7 days · {filteredLogs.length} entries</div>
              <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                {filteredLogs.slice(0, 50).map((log, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 14px', alignItems: 'flex-start', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--surface3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Activity size={13} color="var(--indigo2)" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: 'var(--fg)' }}>
                        <span style={{ fontWeight: 600 }}>{log.employeeName}</span>
                        <span style={{ color: 'var(--fg3)' }}> — {log.description || log.action?.replace(/_/g, ' ')}</span>
                      </div>
                      {(log.metadata?.taskTitle || log.metadata?.orderId) && (
                        <div style={{ fontSize: 11, color: 'var(--fg3)', marginTop: 2 }}>
                          {log.metadata.taskTitle && `Task: ${log.metadata.taskTitle}`}
                          {log.metadata.orderId && `Order: ${log.metadata.orderId}`}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--fg3)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Clock size={10} />{timeAgo(log.createdAt)}
                    </div>
                  </div>
                ))}
                {filteredLogs.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: 'var(--fg3)', fontSize: 13 }}>No activity found</div>}
              </div>
            </div>
          )}

          {/* BILLING */}
          {tab === 'billing' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                {[
                  ['Plan', <select key="plan" value={plan} onChange={e => setPlan(e.target.value)} style={inputStyle}>
                    {['free', 'starter', 'pro', 'enterprise', 'custom'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>],
                  ['Monthly amount (₹)', <input key="amt" type="number" value={amount} onChange={e => setAmount(e.target.value)} style={inputStyle} placeholder="0" />],
                  ['Renewal date', <input key="renew" type="date" value={renewalDate} onChange={e => setRenewal(e.target.value)} style={inputStyle} />],
                ].map(([label, field]) => (
                  <div key={label}><label style={labelStyle}>{label}</label>{field}</div>
                ))}
              </div>
              {msg && <MsgBanner msg={msg} />}
              <button onClick={() => api(() => SA.put(`/superadmin/tenants/${tenantId}/billing`, { plan, amount: Number(amount), renewalDate, status: 'paid' }))} disabled={saving} style={primaryBtn}>
                <Save size={14} />{saving ? 'Saving…' : 'Save billing'}
              </button>
              {billing.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 12 }}>Payment history</div>
                  <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                    <ResponsiveTable>
                      <table className="mobile-card-table sa-table">
                        <thead><tr>{['Date', 'Plan', 'Amount', 'Status'].map(h => <th key={h}>{h}</th>)}</tr></thead>
                        <tbody>
                          {billing.map((b, i) => (
                            <tr key={i}>
                              <td style={{ fontSize: 12, color: 'var(--fg2)' }}>{fmtDate(b.createdAt)}</td>
                              <td><Badge type={b.plan} /></td>
                              <td style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{fmtR(b.amount)}</td>
                              <td><Badge type={b.status} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </ResponsiveTable>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CONTROLS */}
          {tab === 'controls' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Pause / Resume */}
              <Section icon={paused ? PlayCircle : PauseCircle} title={paused ? 'Resume account' : 'Pause account'} color={paused ? 'var(--green)' : 'var(--amber)'} accent="">
                {paused && (
                  <div style={{ padding: '8px 12px', background: 'rgba(245,158,11,.12)', borderRadius: 8, fontSize: 12, color: 'var(--amber2)', marginBottom: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
                    <AlertCircle size={13} /> Paused {timeAgo(sa.pausedAt)} — {sa.pauseReason || 'No reason given'}
                  </div>
                )}
                {!paused && (
                  <div style={{ marginBottom: 12 }}>
                    <label style={labelStyle}>Reason (optional)</label>
                    <input value={pauseReason} onChange={e => setPauseReason(e.target.value)} placeholder="Why are you pausing this account?" style={{ ...inputStyle, marginBottom: 10 }} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <label style={labelStyle}>Pause from date (leave blank = now)</label>
                        <input type="date" value={pauseFrom} onChange={e => setPauseFrom(e.target.value)} style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Auto-resume on date (optional)</label>
                        <input type="date" value={pauseTo} onChange={e => setPauseTo(e.target.value)} style={inputStyle} />
                      </div>
                    </div>
                    {pauseFrom && new Date(pauseFrom) > new Date() && (
                      <div style={{ marginTop: 8, padding: '7px 12px', background: 'rgba(99,102,241,.12)', borderRadius: 8, fontSize: 12, color: 'var(--indigo3)', display: 'flex', gap: 6 }}>
                        <Calendar size={13} /> This will be a scheduled pause — account stays active until {new Date(pauseFrom).toDateString()}
                      </div>
                    )}
                    {pauseTo && (
                      <div style={{ marginTop: 6, padding: '7px 12px', background: 'rgba(16,185,129,.12)', borderRadius: 8, fontSize: 12, color: 'var(--green2)', display: 'flex', gap: 6 }}>
                        <Calendar size={13} /> Account will auto-resume on {new Date(pauseTo).toDateString()}
                      </div>
                    )}
                  </div>
                )}
                {paused && sa.scheduledPauseTo && (
                  <div style={{ padding: '8px 12px', background: 'rgba(16,185,129,.12)', borderRadius: 8, fontSize: 12, color: 'var(--green2)', marginBottom: 10, display: 'flex', gap: 6 }}>
                    <Calendar size={13} /> Scheduled to auto-resume on {new Date(sa.scheduledPauseTo).toDateString()}
                  </div>
                )}
                {msg && <MsgBanner msg={msg} />}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => api(() => paused
                    ? SA.post(`/superadmin/tenants/${tenantId}/resume`)
                    : SA.post(`/superadmin/tenants/${tenantId}/pause`, { reason: pauseReason, pauseFrom, pauseTo })
                  )} disabled={saving}
                    style={{ ...primaryBtn, background: paused ? 'var(--green)' : 'var(--amber)' }}>
                    {paused ? <><PlayCircle size={14} />{saving ? 'Resuming…' : 'Resume now'}</>
                      : pauseFrom && new Date(pauseFrom) > new Date()
                        ? <><Calendar size={14} />{saving ? 'Scheduling…' : 'Schedule pause'}</>
                        : <><PauseCircle size={14} />{saving ? 'Pausing…' : 'Pause now'}</>}
                  </button>
                </div>
              </Section>

              {/* Limits */}
              <Section icon={Users} title="Usage limits" color="var(--indigo2)" accent="">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                  <div><label style={labelStyle}>Max employees</label><input type="number" value={empLimit} onChange={e => setEmpLimit(e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>WhatsApp messages/month</label><input type="number" value={waLimit} onChange={e => setWaLimit(e.target.value)} style={inputStyle} /></div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Max upload size per file (MB)</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input type="number" min={1} max={100} value={uploadMb} onChange={e => setUploadMb(e.target.value)} style={{ ...inputStyle, maxWidth: 120 }} />
                    {[5, 10, 25, 50].map(n => (
                      <button key={n} type="button" onClick={() => setUploadMb(n)}
                        style={{ padding: '6px 12px', borderRadius: 7, border: `1px solid ${Number(uploadMb) === n ? 'var(--indigo)' : 'var(--border2)'}`, background: Number(uploadMb) === n ? 'rgba(99,102,241,.12)' : 'transparent', color: 'var(--fg)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{n} MB</button>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--fg3)', marginTop: 6 }}>Applies to every attachment this company uploads. Allowed range 1 to 100 MB.</div>
                </div>
                {msg && <MsgBanner msg={msg} />}
                <button onClick={() => api(() => SA.put(`/superadmin/tenants/${tenantId}/limits`, { employeeLimit: Number(empLimit), whatsappLimit: Number(waLimit), uploadLimitMb: Number(uploadMb) }))} disabled={saving} style={primaryBtn}>
                  <Save size={14} />{saving ? 'Saving…' : 'Save limits'}
                </button>
              </Section>

              {/* Custom MongoDB URI */}
              <Section icon={Settings} title="Custom Database (MongoDB)" color="var(--indigo2)" accent="">
                <div style={{ fontSize: 12, color: 'var(--fg3)', marginBottom: 8 }}>Optional. If set, this tenant's data will be stored in their own MongoDB.</div>
                <input type="text" placeholder="mongodb+srv://user:pass@cluster.mongodb.net/dbname" value={customMongoUri} onChange={e => setCustomMongoUri(e.target.value)}
                  style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, marginBottom: 10 }} />
                <button onClick={() => api(() => SA.put(`/superadmin/tenants/${tenantId}/custom-db`, { customMongoUri }))} disabled={saving} style={primaryBtn}>
                  <Save size={14} />{saving ? 'Saving…' : 'Save Database URI'}
                </button>
                {customMongoUri && (
                  <button onClick={() => { setCustomMongoUri(''); api(() => SA.put(`/superadmin/tenants/${tenantId}/custom-db`, { customMongoUri: '' })); }}
                    style={{ ...primaryBtn, background: 'transparent', color: 'var(--red)', border: '1px solid var(--red)', marginLeft: 8 }}>
                    Remove Custom DB
                  </button>
                )}
              </Section>

              {/* Custom WhatsApp */}
              <Section icon={Settings} title="Custom WhatsApp Integration" color="var(--green)" accent="">
                <div style={{ fontSize: 12, color: 'var(--fg3)', marginBottom: 12 }}>By default this tenant uses the shared DoubleTick account.</div>
                {(() => {
                  let parsed = {};
                  try { parsed = customWhatsappKey ? JSON.parse(customWhatsappKey) : {}; } catch {}
                  const provider = parsed.provider || (customWhatsappKey && !customWhatsappKey.startsWith('{') ? 'doubletick' : 'none');
                  const saveConfig = (config) => {
                    const val = config.provider === 'none' ? '' : JSON.stringify(config);
                    setCustomWhatsappKey(val);
                    api(() => SA.put(`/superadmin/tenants/${tenantId}/custom-whatsapp`, { customWhatsappKey: val }));
                  };
                  return (
                    <div>
                      <label style={labelStyle}>WhatsApp Provider</label>
                      <select value={provider} onChange={e => {
                        if (e.target.value === 'none') saveConfig({ provider: 'none' });
                        else if (e.target.value === 'doubletick') setCustomWhatsappKey(JSON.stringify({ provider: 'doubletick', apiKey: '' }));
                        else if (e.target.value === 'maytapi') setCustomWhatsappKey(JSON.stringify({ provider: 'maytapi', productId: '', token: '', phoneId: '' }));
                        else if (e.target.value === 'wati') setCustomWhatsappKey(JSON.stringify({ provider: 'wati', apiEndpoint: '', apiKey: '' }));
                      }} style={{ ...inputStyle, marginBottom: 10 }}>
                        <option value="none">Default (Shared DoubleTick)</option>
                        <option value="doubletick">DoubleTick (Own Account)</option>
                        <option value="maytapi">Maytapi</option>
                        <option value="wati">WATI</option>
                      </select>
                      {provider === 'doubletick' && (<div><label style={labelStyle}>DoubleTick API Key</label><input type="password" placeholder="key_xxxxxxxx" value={parsed.apiKey || ''} onChange={e => setCustomWhatsappKey(JSON.stringify({ ...parsed, provider: 'doubletick', apiKey: e.target.value }))} style={{ ...inputStyle, fontFamily: 'monospace', marginBottom: 8 }} /><button onClick={() => saveConfig({ ...parsed, provider: 'doubletick' })} disabled={saving} style={primaryBtn}><Save size={14} />{saving ? 'Saving…' : 'Save'}</button></div>)}
                      {provider === 'maytapi' && (<div><label style={labelStyle}>Product ID</label><input placeholder="e7a019ae-..." value={parsed.productId || ''} onChange={e => setCustomWhatsappKey(JSON.stringify({ ...parsed, provider: 'maytapi', productId: e.target.value }))} style={{ ...inputStyle, marginBottom: 8 }} /><label style={labelStyle}>Token</label><input type="password" value={parsed.token || ''} onChange={e => setCustomWhatsappKey(JSON.stringify({ ...parsed, provider: 'maytapi', token: e.target.value }))} style={{ ...inputStyle, marginBottom: 8 }} /><label style={labelStyle}>Phone ID</label><input value={parsed.phoneId || ''} onChange={e => setCustomWhatsappKey(JSON.stringify({ ...parsed, provider: 'maytapi', phoneId: e.target.value }))} style={{ ...inputStyle, marginBottom: 8 }} /><button onClick={() => saveConfig({ ...parsed, provider: 'maytapi' })} disabled={saving} style={primaryBtn}><Save size={14} />{saving ? 'Saving…' : 'Save'}</button></div>)}
                      {provider === 'wati' && (<div><label style={labelStyle}>API Endpoint</label><input placeholder="https://live-server-XXXXX.wati.io" value={parsed.apiEndpoint || ''} onChange={e => setCustomWhatsappKey(JSON.stringify({ ...parsed, provider: 'wati', apiEndpoint: e.target.value }))} style={{ ...inputStyle, marginBottom: 8 }} /><label style={labelStyle}>API Key</label><input type="password" value={parsed.apiKey || ''} onChange={e => setCustomWhatsappKey(JSON.stringify({ ...parsed, provider: 'wati', apiKey: e.target.value }))} style={{ ...inputStyle, marginBottom: 8 }} /><button onClick={() => saveConfig({ ...parsed, provider: 'wati' })} disabled={saving} style={primaryBtn}><Save size={14} />{saving ? 'Saving…' : 'Save'}</button></div>)}
                      {(provider !== 'none' && customWhatsappKey) && (<button onClick={() => saveConfig({ provider: 'none' })} style={{ ...primaryBtn, background: 'transparent', color: 'var(--red)', border: '1px solid var(--red)', marginLeft: 8, marginTop: 4 }}>Reset to Default</button>)}
                    </div>
                  );
                })()}
              </Section>

              {/* Feature flags */}
              <Section icon={ToggleRight} title="Feature flags" color="var(--purple2)" accent="">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                  {Object.entries(features).map(([f, on]) => {
                    const Icon = FEAT_ICONS[f] || Settings;
                    return (
                      <label key={f} onClick={() => setFeatures(p => ({ ...p, [f]: !p[f] }))}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', border: `1px solid ${on ? 'var(--indigo)' : 'var(--border)'}`, borderRadius: 8, cursor: 'pointer', background: on ? 'rgba(99,102,241,.08)' : 'var(--surface3)', transition: 'all .12s' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Icon size={14} color={on ? 'var(--indigo2)' : 'var(--fg3)'} />
                          <span style={{ fontSize: 13, fontWeight: 500, color: on ? 'var(--fg)' : 'var(--fg3)' }}>
                            {({ 'tasks': 'Manage Tasks', 'personalTasks': 'Personal Tasks', 'checklist': 'Checklist', 'fms': 'Flow Management', 'chat': 'Chat', 'whatsapp': 'WhatsApp', 'tracking': 'Coordinator Tracking', 'reviewMeeting': 'Review Meeting', 'employees': 'Employees', 'mapping': 'Mapping', 'formDesigner': 'Form designer', 'menuControl': 'Menu on/off', 'dailyTaskAlert': 'Daily task alert', 'planner': 'Planner', 'orderForms': 'Order Forms', 'newOrder': 'New Order', 'reports': 'Reports Hub', 'rewards': 'Rewards Log', 'settings': 'Settings' })[f] || f.charAt(0).toUpperCase() + f.slice(1)}
                          </span>
                        </div>
                        {on ? <ToggleRight size={20} color="var(--indigo2)" /> : <ToggleLeft size={20} color="var(--fg3)" />}
                      </label>
                    );
                  })}
                </div>
                {msg && <MsgBanner msg={msg} />}
                <button onClick={() => api(() => SA.put(`/superadmin/tenants/${tenantId}/features`, { features }))} disabled={saving} style={primaryBtn}>
                  <Save size={14} />{saving ? 'Saving…' : 'Save features'}
                </button>
              </Section>

              {/* Admin function switches */}
              <Section icon={ToggleRight} title="Admin function switches" color="var(--purple2)" accent="">
                <p style={{ fontSize: 12, color: 'var(--fg3)', margin: '0 0 12px' }}>Tick a switch to let this company's admin see it in Settings.</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8, marginBottom: 14 }}>
                  {switchAccess.map(sw => (
                    <label key={sw.key}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', border: `1px solid ${sw.visibleToAdmin ? 'var(--indigo)' : 'var(--border)'}`, borderRadius: 8, cursor: 'pointer', background: sw.visibleToAdmin ? 'rgba(99,102,241,.08)' : 'var(--surface3)' }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: sw.visibleToAdmin ? 'var(--fg)' : 'var(--fg3)' }}>{sw.label} <span style={{ color: 'var(--fg3)', fontSize: 11 }}>(now {sw.value ? 'on' : 'off'})</span></span>
                      <input type="checkbox" checked={sw.visibleToAdmin} onChange={() => setSwitchAccess(list => list.map(x => x.key === sw.key ? { ...x, visibleToAdmin: !x.visibleToAdmin } : x))} />
                    </label>
                  ))}
                </div>
                <button onClick={() => api(() => SA.put(`/superadmin/tenants/${tenantId}/switch-access`, { hidden: switchAccess.filter(x => !x.visibleToAdmin).map(x => x.key) }))} disabled={saving} style={primaryBtn}>
                  <Save size={14} />{saving ? 'Saving…' : 'Save admin access'}
                </button>
              </Section>

              {/* HR modules */}
              <Section icon={Calendar} title="HR modules (Attendance, Leave, Payroll)" color="var(--green)" accent="">
                <p style={{ fontSize: 12, color: 'var(--fg3)', margin: '0 0 12px' }}>These are off for every company until you switch them on.</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                  {[['attendance', 'Attendance'], ['leave', 'Leave'], ['payroll', 'Payroll']].map(([k, labelText]) => {
                    const on = !!hrModules[k];
                    return (
                      <label key={k} onClick={() => setHrModules(p => ({ ...p, [k]: !p[k] }))}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', border: `1px solid ${on ? 'var(--indigo)' : 'var(--border)'}`, borderRadius: 8, cursor: 'pointer', background: on ? 'rgba(99,102,241,.08)' : 'var(--surface3)', transition: 'all .12s' }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: on ? 'var(--fg)' : 'var(--fg3)' }}>{labelText}</span>
                        {on ? <ToggleRight size={20} color="var(--indigo2)" /> : <ToggleLeft size={20} color="var(--fg3)" />}
                      </label>
                    );
                  })}
                </div>
                <button onClick={() => api(() => SA.put(`/tasks/access/modules/${tenantId}`, { modules: hrModules }))} disabled={saving} style={primaryBtn}>
                  <Save size={14} />{saving ? 'Saving…' : 'Save HR modules'}
                </button>
              </Section>

              {/* AI Assistant */}
              <Section icon={Sparkles} title="AI Assistant" color="var(--purple2)" accent="">
                <p style={{ fontSize: 12, color: 'var(--fg3)', margin: '0 0 12px' }}>Off by default. When on, employees see a floating assistant panel.</p>
                <label onClick={() => setAiEnabled(v => !v)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', border: `1px solid ${aiEnabled ? 'var(--indigo)' : 'var(--border)'}`, borderRadius: 8, cursor: 'pointer', background: aiEnabled ? 'rgba(99,102,241,.08)' : 'var(--surface3)', transition: 'all .12s', marginBottom: 14 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: aiEnabled ? 'var(--fg)' : 'var(--fg3)' }}>AI Assistant enabled</span>
                  {aiEnabled ? <ToggleRight size={20} color="var(--indigo2)" /> : <ToggleLeft size={20} color="var(--fg3)" />}
                </label>
                <div style={{ marginBottom: 14 }}><label style={labelStyle}>Monthly message limit</label><input type="number" min="1" value={aiMonthlyLimit} onChange={e => setAiMonthlyLimit(e.target.value)} style={inputStyle} /></div>
                {msg && <MsgBanner msg={msg} />}
                <button onClick={() => api(() => SA.put(`/superadmin/tenants/${tenantId}/ai-assistant`, { enabled: aiEnabled, monthlyLimit: Number(aiMonthlyLimit) }))} disabled={saving} style={primaryBtn}>
                  <Save size={14} />{saving ? 'Saving…' : 'Save AI Assistant settings'}
                </button>
              </Section>

              {/* Reset password */}
              <Section icon={Lock} title="Reset admin password" color="var(--amber)" accent="">
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <input type={showPwd ? 'text' : 'password'} value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="New password (min 6 characters)" style={{ ...inputStyle, paddingRight: 36 }} />
                    <button onClick={() => setShowPwd(p => !p)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg3)', display: 'flex' }}>
                      {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <button onClick={() => api(() => SA.post(`/superadmin/tenants/${tenantId}/reset-password`, { newPassword: newPwd }))} disabled={saving || newPwd.length < 6}
                    style={{ ...primaryBtn, background: 'var(--amber)', opacity: newPwd.length < 6 ? 0.45 : 1 }}>
                    <Lock size={14} />{saving ? 'Saving…' : 'Reset'}
                  </button>
                </div>
                {msg && <MsgBanner msg={msg} />}
              </Section>

              {/* Internal note */}
              <Section icon={StickyNote} title="Internal note" color="var(--fg3)" accent="">
                <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Notes only visible to SuperAdmin team…"
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', minHeight: 72 }} />
                {msg && <MsgBanner msg={msg} />}
                <button onClick={() => api(() => SA.put(`/superadmin/tenants/${tenantId}/note`, { note }))} disabled={saving} style={{ ...primaryBtn, marginTop: 8 }}>
                  <Save size={14} />{saving ? 'Saving…' : 'Save note'}
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
  const [form, setForm] = useState({ companyName: '', subdomain: '', ownerEmail: '', adminPassword: '', whatsappNumber: '', openingTime: '09:00', closingTime: '18:00', plan: 'free' });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);

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
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (logoFile) fd.append('logo', logoFile);
      await SA.post('/tenants/create-company', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      onSuccess();
    } catch (err) { setError(err.response?.data?.message || 'Failed to create client'); }
    finally { setSaving(false); }
  };

  return (
    <Overlay onClick={e => e.target === e.currentTarget && onClose()}>
      <ModalBox style={{ maxWidth: 560 }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(99,102,241,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={18} color="var(--indigo2)" />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg)' }}>Add new client</div>
              <div style={{ fontSize: 12, color: 'var(--fg3)' }}>Provision a new tenant workspace</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--fg3)' }}>Step {step} of 2</span>
            <button onClick={onClose} style={iconBtn}><X size={18} /></button>
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ padding: '20px 24px', maxHeight: '70vh', overflowY: 'auto' }}>
            {step === 1 && (
              <>
                <div style={{ marginBottom: 18 }}>
                  <label style={labelStyle}>Company logo</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 72, height: 72, borderRadius: 12, border: '2px dashed var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: 'var(--surface2)', flexShrink: 0 }}>
                      {logoPreview ? <img src={logoPreview} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Building2 size={28} color="var(--fg3)" />}
                    </div>
                    <div>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: '1px solid var(--border2)', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500, color: 'var(--fg2)', background: 'var(--surface3)' }}>
                        <FileText size={14} /> Upload logo
                        <input type="file" accept="image/*" onChange={handleLogoChange} style={{ display: 'none' }} />
                      </label>
                      <div style={{ fontSize: 11, color: 'var(--fg3)', marginTop: 5 }}>PNG, JPG up to 5MB.</div>
                      {logoFile && <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 3, display: 'flex', gap: 4 }}><CheckCircle2 size={11} />{logoFile.name}</div>}
                    </div>
                  </div>
                </div>
                {[['Company name', 'companyName', 'text', 'e.g. Navtech Industries'], ['Subdomain', 'subdomain', 'text', 'navtech (lowercase, no spaces)'], ['Admin email', 'ownerEmail', 'email', 'admin@company.com'], ['Admin password', 'adminPassword', 'password', 'Minimum 6 characters']].map(([label, field, type, placeholder]) => (
                  <div key={field} style={{ marginBottom: 14 }}>
                    <label style={labelStyle}>{label} <span style={{ color: 'var(--red)' }}>*</span></label>
                    <input type={type} value={form[field]} placeholder={placeholder} required onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} style={inputStyle} />
                  </div>
                ))}
              </>
            )}
            {step === 2 && (
              <>
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>WhatsApp number</label>
                  <input type="text" value={form.whatsappNumber} placeholder="+919876543210" onChange={e => setForm(p => ({ ...p, whatsappNumber: e.target.value }))} style={inputStyle} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                  <div><label style={labelStyle}>Office opening time</label><input type="time" value={form.openingTime} onChange={e => setForm(p => ({ ...p, openingTime: e.target.value }))} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Office closing time</label><input type="time" value={form.closingTime} onChange={e => setForm(p => ({ ...p, closingTime: e.target.value }))} style={inputStyle} /></div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Starting plan</label>
                  <select value={form.plan} onChange={e => setForm(p => ({ ...p, plan: e.target.value }))} style={inputStyle}>
                    {['free', 'starter', 'pro', 'enterprise', 'custom'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </div>
                <div style={{ background: 'rgba(99,102,241,.08)', borderRadius: 10, padding: '12px 14px', border: '1px solid rgba(99,102,241,.2)' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--indigo3)', marginBottom: 6, display: 'flex', gap: 5, alignItems: 'center' }}><CheckCircle2 size={13} /> Summary</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--fg2)' }}>
                    <div><span style={{ color: 'var(--fg3)' }}>Company:</span> {form.companyName}</div>
                    <div><span style={{ color: 'var(--fg3)' }}>URL:</span> {form.subdomain}.lrbcloud.ai</div>
                    <div><span style={{ color: 'var(--fg3)' }}>Admin:</span> {form.ownerEmail}</div>
                    <div><span style={{ color: 'var(--fg3)' }}>Plan:</span> {form.plan}</div>
                  </div>
                </div>
              </>
            )}
            {error && <div style={{ ...errorBanner, marginTop: 12 }}><AlertCircle size={13} />{error}</div>}
          </div>
          <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={secondaryBtn}>Cancel</button>
            {step === 1
              ? <button type="button" onClick={() => { if (!form.companyName || !form.subdomain || !form.ownerEmail || !form.adminPassword) { setError('Please fill all required fields'); return; } setError(''); setStep(2); }} style={primaryBtn}>Next: Settings <ChevronRight size={14} /></button>
              : <><button type="button" onClick={() => setStep(1)} style={secondaryBtn}><ChevronRight size={14} style={{ transform: 'rotate(180deg)' }} /> Back</button><button type="submit" disabled={saving} style={primaryBtn}><Building2 size={14} />{saving ? 'Creating…' : 'Create workspace'}</button></>
            }
          </div>
        </form>
      </ModalBox>
    </Overlay>
  );
}

// ── Tickets Modal ─────────────────────────────────────────────────────────────
function TicketsModal({ onClose }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('open');
  const [search, setSearch] = useState('');

  const loadTickets = () => {
    setLoading(true);
    SA.get('/tickets/all').then(r => setTickets(Array.isArray(r.data) ? r.data : [])).catch(() => setTickets([])).finally(() => setLoading(false));
  };
  useEffect(loadTickets, []);

  const handleResolve = async (id) => {
    if (saving) return;
    const note = remarks.trim();
    if (!note) { alert('Please write how the issue was resolved before marking it Done.'); return; }
    setSaving(true);
    try {
      const r = await SA.put('/tickets/resolve', { ticketId: id, adminRemarks: note });
      const done = (r.data && r.data.ticket) || {};
      setTickets(p => p.map(t => t._id === id ? { ...t, status: 'Resolved', adminRemarks: note, resolutionRemarks: note, resolvedAt: done.resolvedAt || new Date().toISOString() } : t));
      setSelected(null); setRemarks('');
    } catch (e) {
      alert('Could not mark it Done: ' + (e.response?.data?.message || e.message));
      if (e.response && e.response.status === 409) loadTickets();
    } finally { setSaving(false); }
  };

  const handleStart = async (id) => {
    if (saving) return;
    setSaving(true);
    try { await SA.put('/tickets/start', { ticketId: id }); setTickets(p => p.map(t => t._id === id ? { ...t, status: 'In-Progress' } : t)); }
    catch (e) { alert('Could not start the ticket: ' + (e.response?.data?.message || e.message)); loadTickets(); }
    finally { setSaving(false); }
  };

  const isImage = url => url && /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  const filtered = tickets.filter(t => {
    const stLow = String(t.status || '').toLowerCase();
    const matchFilter = filter === 'all' || (filter === 'open' ? stLow !== 'resolved' : stLow === filter);
    const matchSearch = !search || (t.subject || t.title || '').toLowerCase().includes(search.toLowerCase()) || (t.raisedBy || t.employeeName || '').toLowerCase().includes(search.toLowerCase()) || (t.companyName || '').toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const openCount = tickets.filter(t => !t.status || String(t.status).toLowerCase() !== 'resolved').length;
  const resolvedCount = tickets.filter(t => String(t.status || '').toLowerCase() === 'resolved').length;

  return (
    <Overlay onClick={e => e.target === e.currentTarget && onClose()}>
      <ModalBox style={{ maxWidth: 860, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(139,92,246,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Ticket size={18} color="var(--purple2)" />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg)' }}>Support tickets</div>
                <div style={{ fontSize: 12, color: 'var(--fg3)' }}>{tickets.length} total</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={loadTickets} style={iconBtn}><RefreshCw size={14} /></button>
              <button onClick={onClose} style={iconBtn}><X size={18} /></button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            {[['all', 'All', tickets.length, 'var(--fg3)', 'var(--surface3)'], ['open', 'Open', openCount, 'var(--amber)', 'rgba(245,158,11,.1)'], ['resolved', 'Done', resolvedCount, 'var(--green)', 'rgba(16,185,129,.1)']].map(([f, label, count, color, bg]) => (
              <button key={f} onClick={() => setFilter(f)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', border: `1px solid ${filter === f ? color : 'var(--border)'}`, borderRadius: 8, background: filter === f ? bg : 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: filter === f ? 600 : 400, color: filter === f ? color : 'var(--fg3)' }}>
                {label}
                <span style={{ padding: '1px 7px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: filter === f ? `${color}20` : 'var(--surface3)', color: filter === f ? color : 'var(--fg3)' }}>{count}</span>
              </button>
            ))}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--border2)', borderRadius: 8, padding: '6px 12px', background: 'var(--surface2)' }}>
              <Search size={13} color="var(--fg3)" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by subject, employee, company…"
                style={{ border: 'none', outline: 'none', fontSize: 13, color: 'var(--fg)', background: 'transparent', width: '100%' }} />
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--fg3)' }}>Loading tickets…</div>}
          {!loading && filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Ticket size={40} color="var(--fg3)" style={{ margin: '0 auto 12px', display: 'block', opacity: .4 }} />
              <div style={{ fontSize: 14, color: 'var(--fg3)' }}>No {filter !== 'all' ? filter : ''} tickets found</div>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(t => {
              const isResolved = String(t.status || '').toLowerCase() === 'resolved';
              const files = t.initialMedia || t.files || t.attachments || [];
              return (
                <div key={t._id} style={{ border: `1px solid ${isResolved ? 'var(--border)' : 'rgba(245,158,11,.3)'}`, borderLeft: `3px solid ${isResolved ? 'var(--green)' : 'var(--amber)'}`, borderRadius: 10, overflow: 'hidden', background: 'var(--surface)' }}>
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 5 }}>{t.subject || t.title || 'No subject'}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, padding: '3px 10px', background: 'rgba(99,102,241,.1)', borderRadius: 6, color: 'var(--indigo3)' }}>
                            <Building2 size={12} /><strong>{t.companyName || t.tenantId?.companyName || '—'}</strong>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, padding: '3px 10px', background: 'var(--surface3)', borderRadius: 6, color: 'var(--fg2)', border: '1px solid var(--border)' }}>
                            <User size={12} />{t.raisedBy || t.reporterName || t.employeeName || '—'}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--fg3)' }}>
                            <Clock size={11} />{timeAgo(t.createdAt)}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        {t.priority && <Badge type={t.priority} />}
                        <Badge type={isResolved ? 'resolved' : (String(t.status || '').toLowerCase() === 'in-progress' ? 'inprogress' : 'open')} />
                      </div>
                    </div>
                    {(t.description || t.message || t.issue) && (
                      <div style={{ fontSize: 13, color: 'var(--fg2)', lineHeight: 1.6, marginBottom: 10, padding: '8px 12px', background: 'var(--surface2)', borderRadius: 8, borderLeft: '2px solid var(--border2)' }}>
                        {t.description || t.message || t.issue}
                      </div>
                    )}
                    {files.length > 0 && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg3)', marginBottom: 6, display: 'flex', gap: 5, alignItems: 'center' }}><FileText size={11} /> Attachments ({files.length})</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {files.map((file, fi) => {
                            const url = file.url || file.location || file;
                            const name = file.name || file.originalname || `File ${fi + 1}`;
                            return isImage(url)
                              ? <a key={fi} href={url} target="_blank" rel="noreferrer" style={{ display: 'block', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}><img src={url} alt={name} style={{ width: 80, height: 60, objectFit: 'cover', display: 'block' }} /></a>
                              : <a key={fi} href={url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 12, color: 'var(--indigo3)', textDecoration: 'none', background: 'rgba(99,102,241,.08)' }}><FileText size={13} />{name}</a>;
                          })}
                        </div>
                      </div>
                    )}
                    {isResolved ? (
                      <div style={{ padding: '8px 12px', background: 'rgba(16,185,129,.1)', borderRadius: 8, fontSize: 12, color: 'var(--green2)', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                        <CheckCircle2 size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                        <div>
                          <div style={{ fontWeight: 600, marginBottom: 2 }}>Done{t.resolvedAt ? ' · ' + new Date(t.resolvedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : ''}</div>
                          {(t.resolutionRemarks || t.adminRemarks || t.remarks || t.resolution) && <div style={{ opacity: .85 }}>{t.resolutionRemarks || t.adminRemarks || t.remarks || t.resolution}</div>}
                        </div>
                      </div>
                    ) : selected === t._id ? (
                      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 4 }}>
                        <label style={labelStyle}>Resolution remarks</label>
                        <textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Describe how this was resolved…" rows={2} style={{ ...inputStyle, resize: 'none', marginBottom: 10 }} />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => { setSelected(null); setRemarks(''); }} style={secondaryBtn}>Cancel</button>
                          <button onClick={() => handleResolve(t._id)} disabled={saving} style={{ ...primaryBtn, background: 'var(--green)' }}><CheckCircle2 size={14} />{saving ? 'Saving…' : 'Mark as Done'}</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                        {String(t.status || '').toLowerCase() === 'open' && (<button onClick={() => handleStart(t._id)} disabled={saving} style={{ ...secondaryBtn, fontSize: 12 }}><Clock size={13} /> Start work</button>)}
                        <button onClick={() => { setSelected(t._id); setRemarks(''); }} style={{ ...secondaryBtn, fontSize: 12 }}><CheckCircle2 size={13} /> Mark as Done</button>
                      </div>
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
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { dark, toggle } = useTheme();

  const handleLogin = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const res = await SA.post('/tenants/master-login', { username, password });
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('isSuperAdmin', 'true');
      localStorage.setItem('user', JSON.stringify({ ...user, isSuperAdmin: true }));
      recordLoginSession();
      onLogin(user);
    } catch (err) { setError(err.response?.data?.message || 'Invalid credentials'); }
    finally { setLoading(false); }
  };

  return (
    <div className={`sa-wrap${dark ? ' sa-dark' : ''}`} data-theme={dark ? 'dark' : 'light'}
      style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{THEME_CSS}</style>

      <button onClick={toggle} style={{ ...iconBtn, position: 'fixed', top: 20, right: 20 }}>
        {dark ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      <div style={{ width: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 60, height: 60, borderRadius: 16, background: 'var(--indigo)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 0 0 8px var(--indigo-glow)' }}>
            <Shield size={28} color='white' />
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--fg)', letterSpacing: -.5 }}>WorkPilot</div>
          <div style={{ fontSize: 14, color: 'var(--fg3)', marginTop: 4 }}>SuperAdmin Console</div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '28px 32px', boxShadow: '0 20px 60px rgba(0,0,0,.12)' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg)', marginBottom: 4 }}>Sign in</div>
          <div style={{ fontSize: 13, color: 'var(--fg3)', marginBottom: 22 }}>Enter your superadmin credentials</div>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Username</label>
              <div style={{ position: 'relative' }}>
                <User size={15} color="var(--fg3)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} required placeholder="Enter username" style={{ ...inputStyle, paddingLeft: 36 }} />
              </div>
            </div>
            <div style={{ marginBottom: 22 }}>
              <label style={labelStyle}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} color="var(--fg3)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required placeholder="Enter password" style={{ ...inputStyle, paddingLeft: 36, paddingRight: 36 }} />
                <button type="button" onClick={() => setShowPwd(p => !p)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg3)', display: 'flex' }}>
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            {error && <div style={{ ...errorBanner, marginBottom: 16 }}><AlertCircle size={13} />{error}</div>}
            <button type="submit" disabled={loading} style={{ ...primaryBtn, width: '100%', justifyContent: 'center', padding: '11px' }}>
              {loading ? 'Signing in…' : <><Shield size={15} />Sign in to console</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────
function SuperAdminPanel({ user: initialUser, onLogout: handleLogout }) {
  const [user] = useState(initialUser || null);
  const [stats, setStats] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [feed, setFeed] = useState([]);
  const [selectedTenant, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilter] = useState('all');
  const [showProvision, setShowProvision] = useState(false);
  const [showTickets, setShowTickets] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const { dark, toggle } = useTheme();

  const load = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) { console.warn('[SuperAdmin] No token found, skipping load'); return; }
    setLoading(true);
    try {
      const [sR, tR, fR] = await Promise.all([
        SA.get('/superadmin/dashboard'),
        SA.get('/superadmin/tenants'),
        SA.get('/superadmin/feed?limit=30'),
      ]);
      setStats(sR.data); setTenants(tR.data); setFeed(fR.data);
    } catch (e) {
      console.error('[SuperAdmin] Load error:', e.response?.status, e.message);
      if (e.response?.status === 401) { localStorage.removeItem('token'); localStorage.removeItem('isSuperAdmin'); handleLogout(); }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = tenants.filter(t => {
    const ms = !search || t.companyName?.toLowerCase().includes(search.toLowerCase()) || t.subdomain?.includes(search.toLowerCase());
    const mf = filterStatus === 'all' || t.superAdmin?.status === filterStatus || t.superAdmin?.plan === filterStatus;
    return ms && mf;
  });

  const FEED_ICONS = { login: Lock, task_created: CheckCircle2, order_submitted: Package, step_completed: Zap, whatsapp_sent: Bell, flow_created: Activity, default: Activity };

  return (
    <div className={`sa-wrap${dark ? ' sa-dark' : ''}`} data-theme={dark ? 'dark' : 'light'}
      style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <style>{THEME_CSS}</style>

      {/* Top nav */}
      <div className="sa-topnav">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--indigo)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 3px var(--indigo-glow)' }}>
            <Shield size={17} color='white' />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)', letterSpacing: -.3 }}>WorkPilot SuperAdmin</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setShowProvision(true)} style={primaryBtn}><Plus size={14} />Add client</button>
          <button onClick={() => setShowTickets(true)} style={secondaryBtn}><Ticket size={14} />Tickets</button>
          <button onClick={load} style={iconBtn}><RefreshCw size={15} style={loading ? { animation: 'sa-spin 1s linear infinite' } : {}} /></button>
          <button onClick={toggle} style={iconBtn}>{dark ? <Sun size={15} /> : <Moon size={15} />}</button>
          <div style={{ width: 1, height: 28, background: 'var(--border)', margin: '0 2px' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px', background: 'var(--surface2)', borderRadius: 8, border: '1px solid var(--border)' }}>
            {avatar(user?.name || 'SA', 24)}
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg2)' }}>{user?.name || 'SuperAdmin'}</span>
          </div>
          <button title="Sign out"
            onClick={async () => { if (await dialog.confirm('Are you sure you want to sign out?', { title: 'Sign out', confirmText: 'Yes', cancelText: 'No' })) handleLogout(); }}
            style={{ ...iconBtn, color: 'var(--red)', borderColor: 'rgba(244,63,94,.3)' }}>
            <LogOut size={15} />
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1300, margin: '0 auto', padding: '24px 28px' }}>

        {/* Stats */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
            <StatCard icon={Building2} label="Total tenants" value={stats.totalTenants} sub={`${stats.pausedTenants} paused`} color="var(--indigo)" />
            <StatCard icon={Users} label="Total employees" value={fmt(stats.totalEmployees)} sub="across all tenants" color="var(--green)" />
            <StatCard icon={DollarSign} label="Revenue this month" value={fmtR(stats.revenueThisMonth)} sub="paid invoices" color="var(--amber)" />
            <StatCard icon={Zap} label="Active today" value={stats.activeUsersToday} sub="logged in last 24h" color="var(--purple)" />
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>

          {/* Left: tenants */}
          <div>
            {/* Toolbar */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--border2)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', background: 'var(--surface)' }}>
                <Search size={15} color="var(--fg3)" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tenants…"
                  style={{ border: 'none', outline: 'none', fontSize: 13, color: 'var(--fg)', background: 'transparent', width: '100%' }} />
              </div>
              <select value={filterStatus} onChange={e => setFilter(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid var(--border2)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--fg2)', background: 'var(--surface)', outline: 'none' }}>
                <option value="all">All status</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
              <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                {[['grid', LayoutGrid], ['list', List]].map(([m, Icon]) => (
                  <button key={m} onClick={() => setViewMode(m)}
                    style={{ padding: '8px 10px', border: 'none', cursor: 'pointer', background: viewMode === m ? 'var(--indigo)' : 'var(--surface)', color: viewMode === m ? 'white' : 'var(--fg3)' }}>
                    <Icon size={15} />
                  </button>
                ))}
              </div>
            </div>

            <div style={{ fontSize: 12, color: 'var(--fg3)', marginBottom: 10 }}>
              {loading ? 'Loading…' : `${filtered.length} ${filtered.length === 1 ? 'tenant' : 'tenants'}`}
            </div>

            {viewMode === 'grid'
              ? <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {filtered.map(t => <TenantCard key={t._id} t={t} onClick={() => setSelected(t._id)} />)}
              </div>
              : <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: 'var(--surface)' }}>
                <ResponsiveTable>
                  <table className="mobile-card-table sa-table">
                    <thead>
                      <tr>
                        {['Company', 'Status', 'Plan', 'Employees', 'Tasks/mo', 'Orders/mo', 'Active Flows', 'Last Login', ''].map(h => <th key={h}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((t) => (
                        <tr key={t._id} className="sa-tenant-row" onClick={() => setSelected(t._id)}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              {avatar(t.companyName, 28)}
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{t.companyName}</div>
                                <div style={{ fontSize: 11, color: 'var(--fg3)' }}>{t.subdomain}.lrbcloud.ai</div>
                              </div>
                            </div>
                          </td>
                          <td><Badge type={t.superAdmin?.status || 'active'} /></td>
                          <td><Badge type={t.superAdmin?.plan || 'free'} /></td>
                          <td style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', textAlign: 'center' }}>{t.stats?.employeeCount || 0}</td>
                          <td style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', textAlign: 'center' }}>{t.stats?.tasksThisMonth || 0}</td>
                          <td style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', textAlign: 'center' }}>{t.stats?.ordersThisMonth || 0}</td>
                          <td style={{ fontSize: 13, fontWeight: 600, color: (t.stats?.activeFlows || 0) > 0 ? 'var(--indigo2)' : 'var(--fg3)', textAlign: 'center' }}>{t.stats?.activeFlows || 0}</td>
                          <td style={{ fontSize: 11, color: 'var(--fg3)', whiteSpace: 'nowrap' }}>{t.stats?.lastActivity ? timeAgo(t.stats.lastActivity.createdAt) : 'Never'}</td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--indigo2)', fontWeight: 500 }}><Eye size={13} /> View</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ResponsiveTable>
                {filtered.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: 'var(--fg3)', fontSize: 13 }}>No tenants found</div>}
              </div>
            }
          </div>

          {/* Right: live feed */}
          <div style={{ position: 'sticky', top: 76 }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', display: 'flex', gap: 6, alignItems: 'center' }}>
                  <Activity size={15} color="var(--indigo2)" /> Live activity
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div className="sa-live-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} />
                  <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 500 }}>All tenants</span>
                </div>
              </div>
              <div style={{ maxHeight: 540, overflowY: 'auto' }}>
                {feed.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: 'var(--fg3)', fontSize: 13 }}>No recent activity</div>}
                {feed.map((log, i) => {
                  const Icon = FEED_ICONS[log.action] || FEED_ICONS.default;
                  return (
                    <div key={i} className="sa-feed-item">
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(99,102,241,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={12} color="var(--indigo2)" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.employeeName}</div>
                        <div style={{ fontSize: 11, color: 'var(--fg3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.description || log.action?.replace(/_/g, ' ')}</div>
                        <div style={{ fontSize: 10, color: 'var(--fg3)', marginTop: 1 }}>{log.tenantId?.companyName || '—'}</div>
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--fg3)', flexShrink: 0 }}>{timeAgo(log.createdAt)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showProvision && <ProvisionModal onClose={() => setShowProvision(false)} onSuccess={() => { setShowProvision(false); load(); }} />}
      {showTickets && <TicketsModal onClose={() => setShowTickets(false)} />}
      {selectedTenant && <TenantDetail tenantId={selectedTenant} onClose={() => setSelected(null)} onRefresh={load} />}
    </div>
  );
}

// ── App wrapper ───────────────────────────────────────────────────────────────
export default function SuperAdmin({ isAuthenticated, onLogin, onLogout }) {
  if (!isAuthenticated) {
    return <LoginPage onLogin={(u) => { onLogin(localStorage.getItem('token'), { ...u, isSuperAdmin: true }); }} />;
  }
  const user = (() => { try { return JSON.parse(localStorage.getItem('user')) || {}; } catch { return {}; } })();
  return <SuperAdminPanel user={user} onLogout={onLogout} />;
}
