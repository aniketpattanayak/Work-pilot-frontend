import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import API from '../api/axiosConfig';
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  ListTodo,
  Settings,
  Eye,
  ClipboardList,
  UserCog,
  LayoutList,
  Activity,
  ChevronRight,
  RefreshCcw,
  ShieldCheck,
  Trophy,
  History as HistoryIcon,
  Star,
  Medal,
  Flame,
  Target,
  Rocket,
  ShieldCheck as ShieldCheckIcon,
  Award,
  Zap,
  LogOut,
  LifeBuoy,
  BarChart3,
  GitBranch,
  FileText,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

/**
 * SIDEBAR: ADAPTIVE NAVIGATION COMMAND v2.0
 * Feature: Collapsible — minimize to icon-rail (68px), expand to full panel (260px).
 * Collapsed mode: icons only with native title tooltips.
 * State persisted to localStorage so it survives page refresh.
 */
const Sidebar = ({ roles = [], tenantId, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebarCollapsed') === 'true'; } catch { return false; }
  });
  const [factoryLogo, setFactoryLogo] = useState('');
  const [companyName, setCompanyName] = useState('WORK PILOT');
  const [loadingLogo, setLoadingLogo] = useState(false);

  const user = JSON.parse(localStorage.getItem('user')) || {};
  const currentTenantId = tenantId || localStorage.getItem('tenantId');
  const safeRoles = Array.isArray(roles) ? roles : [];
  const iconMap = { Star, Trophy, Medal, Zap, ShieldCheck: ShieldCheckIcon, Flame, Target, Rocket, Award };

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem('sidebarCollapsed', String(next)); } catch {}
  };

  const fetchFactoryBranding = useCallback(async () => {
    if (!currentTenantId) return;
    try {
      setLoadingLogo(true);
      const res = await API.get(`/superadmin/settings/${currentTenantId}`);
      if (res.data) {
        setFactoryLogo(res.data.logo || '');
        setCompanyName(res.data.companyName || 'WORK PILOT');
      }
    } catch (err) {
      console.error('Sidebar Branding Fetch Error:', err);
    } finally {
      setLoadingLogo(false);
    }
  }, [currentTenantId]);

  useEffect(() => {
    fetchFactoryBranding();
    window.addEventListener('brandingUpdated', fetchFactoryBranding);
    return () => window.removeEventListener('brandingUpdated', fetchFactoryBranding);
  }, [fetchFactoryBranding]);

  const categories = [
    {
      label: 'Main',
      items: [
        { name: 'Dashboard',        icon: <LayoutDashboard />, roles: ['Admin', 'Assigner', 'Doer', 'Coordinator', 'Viewer'] },
        { name: 'Manage Tasks',     icon: <ClipboardList />,   roles: ['Admin', 'Assigner'] },
        { name: 'Manage Checklist', icon: <LayoutList />,      roles: ['Admin'] },
        { name: 'My Tasks',         icon: <CheckSquare />,     roles: ['Admin', 'Assigner', 'Doer', 'Coordinator'] },
        { name: 'My Checklist',     icon: <ListTodo />,        roles: [] },
      ],
    },
    {
      label: 'Administration',
      items: [
        { name: 'Employees',         icon: <Users />,       roles: ['Admin'] },
        { name: 'Mapping',           icon: <UserCog />,     roles: ['Admin'] },
        { name: 'Tracking',          icon: <Eye />,         roles: ['Admin', 'Coordinator'] },
        { name: 'Checklist Monitor', icon: <Activity />,    roles: ['Admin', 'Coordinator'] },
        { name: 'Flow Management',   icon: <GitBranch />,   roles: ['Admin'] },
        { name: 'Review Meeting',    icon: <BarChart3 />,   roles: ['Admin', 'Coordinator'] },
        { name: 'Reports Hub',       icon: <FileText />,    roles: ['Admin'] },
        { name: 'Rewards Log',       icon: <HistoryIcon />, roles: ['Admin', 'Assigner', 'Doer', 'Coordinator'] },
        { name: 'Settings',          icon: <Settings />,    roles: ['Admin'] },
      ],
    },
    {
      label: 'Support',
      items: [
        { name: 'Raise Ticket', icon: <LifeBuoy />, roles: ['Admin', 'Assigner', 'Doer', 'Coordinator', 'Viewer'] },
      ],
    },
  ];

  const getRoute = (itemName) => {
    if (itemName === 'Dashboard')       return '';
    if (itemName === 'My Checklist')    return 'checklist';
    if (itemName === 'Flow Management') return 'fms-dashboard';
    if (itemName === 'Reports Hub')     return 'reports';
    return itemName.toLowerCase().replace(/\s+/g, '-');
  };

  const isActive = (itemName) => {
    const route = getRoute(itemName);
    const currentPath = location.pathname.split('/').pop() || '';
    if (route === '' && (currentPath === 'dashboard' || currentPath === '')) return true;
    return currentPath === route;
  };

  const handleNavigate = (itemName) => {
    navigate(`/dashboard/${getRoute(itemName)}`);
  };

  return (
    <aside
      style={{ width: collapsed ? '68px' : '260px' }}
      className="bg-card text-card-foreground border-r border-border h-screen flex flex-col sticky top-0 z-[100] shadow-xl dark:shadow-none overflow-hidden transition-all duration-300 ease-in-out flex-shrink-0"
    >

      {/* ── HEADER: LOGO + TOGGLE ─────────────────────────────── */}
      <div className={`flex items-center border-b border-border/50 flex-shrink-0 transition-all duration-300 ${collapsed ? 'flex-col gap-3 px-2 py-4' : 'flex-row justify-between px-4 py-4'}`}>

        {/* Logo area */}
        <div className={`flex items-center gap-2.5 min-w-0 overflow-hidden ${collapsed ? 'justify-center' : 'flex-1'}`}>
          {loadingLogo ? (
            <RefreshCcw className="animate-spin text-primary flex-shrink-0" size={16} />
          ) : factoryLogo ? (
            <img
              src={factoryLogo}
              alt="Logo"
              className={`object-contain flex-shrink-0 ${collapsed ? 'w-8 h-8 rounded-lg' : 'max-h-[34px] w-auto'}`}
            />
          ) : (
            <>
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-primary/20 flex-shrink-0">
                <ShieldCheck size={15} />
              </div>
              {!collapsed && (
                <span className="text-[13px] font-black text-foreground tracking-tight uppercase truncate">
                  {companyName}
                </span>
              )}
            </>
          )}
        </div>

        {/* Toggle button */}
        <button
          onClick={toggleCollapsed}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all duration-200 active:scale-90 flex-shrink-0"
        >
          {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
        </button>
      </div>

      {/* ── ROLE BADGES (expanded only) ───────────────────────── */}
      {!collapsed && (
        <div className="px-4 pt-3 pb-1 flex flex-wrap gap-1.5 flex-shrink-0 overflow-hidden">
          {safeRoles.length > 0 ? safeRoles.map((r, i) => (
            <span key={i} className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
              {r}
            </span>
          )) : (
            <span className="text-[8px] font-bold text-red-500 px-2 py-0.5 bg-red-50 dark:bg-red-500/10 rounded-md border border-red-200 dark:border-red-500/20">
              UNAUTHORIZED
            </span>
          )}
        </div>
      )}

      {/* ── PERFORMANCE SCORE (expanded only) ─────────────────── */}
      {!collapsed && user?.totalPoints !== undefined && (
        <div className="mx-3 mt-3 mb-1 p-3 rounded-xl bg-background border border-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-amber-500/10 rounded-lg flex-shrink-0">
              <Trophy size={13} className="text-amber-500" />
            </div>
            <div>
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-0.5">Performance</p>
              <p className="text-sm font-black text-foreground leading-none">
                {user.totalPoints} <span className="text-[9px] text-slate-400 font-bold">PTS</span>
              </p>
            </div>
          </div>
          {user?.earnedBadges?.length > 0 && (
            <div className="mt-2.5 pt-2 border-t border-border flex flex-wrap gap-1.5">
              {user.earnedBadges.map((badge, idx) => {
                const IconComponent = iconMap[badge.iconName] || Star;
                return (
                  <div key={idx} title={badge.name}
                    className="w-6 h-6 rounded-lg flex items-center justify-center border cursor-help hover:scale-110 transition-transform"
                    style={{ backgroundColor: `${badge.color}15`, borderColor: `${badge.color}30` }}
                  >
                    <IconComponent size={10} color={badge.color} style={{ filter: `drop-shadow(0 0 3px ${badge.color}60)` }} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── NAVIGATION ────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 custom-scrollbar">
        {categories.map((cat, catIdx) => {
          const filteredItems = cat.items.filter(item =>
            item.roles.some(r => safeRoles.includes(r))
          );
          if (filteredItems.length === 0) return null;

          return (
            <div key={catIdx} className="mb-4">

              {/* Category label */}
              {!collapsed ? (
                <p className="px-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.25em] mb-1.5 leading-none">
                  {cat.label}
                </p>
              ) : (
                /* Collapsed: thin divider between sections */
                catIdx > 0 && <div className="h-px bg-border/60 mx-1 mb-2 mt-1" />
              )}

              <ul className="space-y-0.5">
                {filteredItems.map((item, index) => {
                  const active = isActive(item.name);
                  return (
                    <li key={index}>
                      <button
                        onClick={() => handleNavigate(item.name)}
                        title={item.name}
                        className={`
                          w-full flex items-center rounded-xl border transition-all duration-200 active:scale-95
                          ${collapsed
                            ? 'justify-center px-0 py-2.5'
                            : 'justify-between px-3 py-2.5 gap-3'
                          }
                          ${active
                            ? 'bg-primary/10 border-primary/20 shadow-sm'
                            : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/70'
                          }
                        `}
                      >
                        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3 min-w-0'}`}>
                          <span className={`flex-shrink-0 transition-colors duration-200 ${active ? 'text-primary' : 'text-slate-400 dark:text-slate-500 group-hover:text-primary'}`}>
                            {React.cloneElement(item.icon, { size: 17, strokeWidth: active ? 2.5 : 2 })}
                          </span>
                          {!collapsed && (
                            <span className={`text-[12.5px] tracking-tight truncate transition-colors duration-200 ${active ? 'font-black text-primary' : 'font-semibold text-slate-600 dark:text-slate-400'}`}>
                              {item.name}
                            </span>
                          )}
                        </div>
                        {!collapsed && active && (
                          <ChevronRight size={13} className="text-primary flex-shrink-0" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* ── LOGOUT ────────────────────────────────────────────── */}
      <div className="border-t border-border/50 px-2 py-3 flex-shrink-0">
        <button
          onClick={onLogout}
          title="Logout"
          className={`
            w-full flex items-center rounded-xl text-red-500
            hover:bg-red-50 dark:hover:bg-red-500/10
            border border-transparent hover:border-red-500/10
            transition-all duration-200 active:scale-95
            ${collapsed ? 'justify-center py-2.5' : 'gap-3 px-3 py-2.5'}
          `}
        >
          <LogOut size={17} className="flex-shrink-0" />
          {!collapsed && <span className="text-[12.5px] font-semibold tracking-tight">Logout</span>}
        </button>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--color-primary); }
      `}</style>
    </aside>
  );
};

export default Sidebar;