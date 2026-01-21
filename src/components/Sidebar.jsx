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
  Menu, 
  X, 
  LogOut,
  LifeBuoy // New: Added for Support/Raise Ticket
} from 'lucide-react';

/**
 * SIDEBAR: ADAPTIVE NAVIGATION COMMAND v1.6
 * Optimized for mobile responsiveness and dual-theme (Light/Dark) support.
 * Updated: Integrated Support Ticketing category for all personnel.
 */
const Sidebar = ({ roles = [], tenantId, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [factoryLogo, setFactoryLogo] = useState('');
  const [companyName, setCompanyName] = useState('WORK PILOT');
  const [loadingLogo, setLoadingLogo] = useState(false);

  // Parse user session safely
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const currentTenantId = tenantId || localStorage.getItem('tenantId');
  const safeRoles = Array.isArray(roles) ? roles : [];

  const iconMap = {
    Star, Trophy, Medal, Zap, 
    ShieldCheck: ShieldCheckIcon, 
    Flame, Target, Rocket, Award
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
      console.error("Sidebar Branding Fetch Error:", err);
    } finally {
      setLoadingLogo(false);
    }
  }, [currentTenantId]);

  useEffect(() => {
    fetchFactoryBranding();
    window.addEventListener('brandingUpdated', fetchFactoryBranding);
    return () => window.removeEventListener('brandingUpdated', fetchFactoryBranding);
  }, [fetchFactoryBranding]);

  // CATEGORY DEFINITIONS
  const categories = [
    {
      label: 'Main',
      items: [
        { name: 'Dashboard', icon: <LayoutDashboard />, roles: ['Admin', 'Assigner', 'Doer', 'Coordinator', 'Viewer'] },
      ]
    },
    {
      label: 'Delegation Task',
      items: [
        { name: 'Create Task', icon: <ListTodo />, roles: ['Admin', 'Assigner'] },
        { name: 'Manage Tasks', icon: <ClipboardList />, roles: ['Admin', 'Assigner'] },
        { name: 'My Tasks', icon: <CheckSquare />, roles: ['Admin', 'Assigner', 'Doer', 'Coordinator'] },
      ]
    },
    {
      label: 'Checklist Task',
      items: [
        { name: 'Create Checklist', icon: <LayoutList />, roles: ['Admin'] },
        { name: 'Manage Checklist', icon: <ClipboardList />, roles: ['Admin'] },
        { name: 'My Checklist', icon: <ListTodo />, roles: ['Admin', 'Assigner', 'Doer', 'Coordinator'] },
        { name: 'Checklist Monitor', icon: <Activity />, roles: ['Admin', 'Coordinator'] },
      ]
    },
    {
      label: 'Administration',
      items: [
        { name: 'Employees', icon: <Users />, roles: ['Admin'] },
        { name: 'Mapping', icon: <UserCog />, roles: ['Admin'] },
        { name: 'Tracking', icon: <Eye />, roles: ['Admin', 'Coordinator'] },
        { name: 'Rewards Log', icon: <HistoryIcon />, roles: ['Admin', 'Assigner', 'Doer', 'Coordinator'] },
        { name: 'Settings', icon: <Settings />, roles: ['Admin'] },
      ]
    },
    {
      // NEW CATEGORY: SUPPORT SYSTEM
      label: 'Support',
      items: [
        { name: 'Raise Ticket', icon: <LifeBuoy />, roles: ['Admin', 'Assigner', 'Doer', 'Coordinator', 'Viewer'] },
      ]
    }
  ];

  const getRoute = (itemName) => {
    if (itemName === 'Dashboard') return '';
    if (itemName === 'Create Checklist') return 'checklist-setup';
    if (itemName === 'My Checklist') return 'checklist';
    return itemName.toLowerCase().replace(/\s+/g, '-');
  };

  const isActive = (itemName) => {
    const route = getRoute(itemName);
    const currentPath = location.pathname.split('/').pop() || '';
    if (route === '' && (currentPath === 'dashboard' || currentPath === '')) return true;
    return currentPath === route;
  };

  const handleNavigate = (itemName) => {
    const route = getRoute(itemName);
    navigate(`/dashboard/${route}`);
  };

  return (
    <aside className="w-[280px] bg-card text-card-foreground border-r border-border h-screen flex flex-col sticky top-0 z-[100] transition-all duration-500 overflow-hidden shadow-2xl dark:shadow-none">
      
      {/* BRANDING SECTION */}
      <div className="px-6 py-8 flex flex-col justify-center min-h-[160px] border-b border-border/50">
        {loadingLogo ? (
          <div className="flex items-center gap-3">
            <RefreshCcw className="animate-spin text-primary" size={20} />
            <span className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest">Syncing Identity...</span>
          </div>
        ) : factoryLogo ? (
          <div className="mb-4">
            <img 
              src={factoryLogo} 
              alt="Logo" 
              className="max-h-[45px] w-auto object-contain brightness-100 dark:brightness-110" 
            />
          </div>
        ) : (
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-sky-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
                <ShieldCheck size={24} />
            </div>
            <h2 className="text-lg font-black text-foreground tracking-tighter leading-tight uppercase">
              {companyName}
            </h2>
          </div>
        )}
        
        <div className="flex flex-wrap gap-1.5">
          {safeRoles.length > 0 ? safeRoles.map((r, i) => (
            <span key={i} className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md bg-primary/10 text-primary border border-primary/20 shadow-sm">
              {r}
            </span>
          )) : (
            <span className="text-[9px] font-bold text-red-500 px-2 py-1 bg-red-50 dark:bg-red-500/10 rounded-md border border-red-100 dark:border-red-500/20">
              UNAUTHORIZED
            </span>
          )}
        </div>
      </div>

      {/* PERFORMANCE SCORE & BADGES */}
      {user?.totalPoints !== undefined && (
        <div className="mx-4 mt-6 p-4 rounded-2xl bg-background border border-border shadow-inner transition-all duration-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg shadow-sm">
              <Trophy size={16} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-500 dark:text-amber-500/60 uppercase tracking-[0.2em] leading-none mb-1">Performance</span>
              <span className="text-lg font-black text-foreground leading-none tracking-tight">
                {user.totalPoints} <span className="text-[10px] text-slate-400 font-bold ml-0.5">PTS</span>
              </span>
            </div>
          </div>

          {user?.earnedBadges?.length > 0 && (
            <div className="mt-4 pt-3 border-t border-border">
              <div className="flex flex-wrap gap-2">
                {user.earnedBadges.map((badge, idx) => {
                  const IconComponent = iconMap[badge.iconName] || Star;
                  return (
                    <div 
                      key={idx} 
                      title={`${badge.name}`}
                      className="w-7 h-7 rounded-lg flex items-center justify-center border bg-card transition-transform hover:scale-110 cursor-help"
                      style={{ 
                        backgroundColor: `${badge.color}15`, 
                        borderColor: `${badge.color}30`,
                      }}
                    >
                      <IconComponent 
                        size={12} 
                        color={badge.color} 
                        style={{ filter: `drop-shadow(0 0 3px ${badge.color}60)` }} 
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* NAVIGATION SECTION */}
      <nav className="flex-1 overflow-y-auto mt-6 px-3 custom-scrollbar">
        {categories.map((cat, catIdx) => {
          const filteredItems = cat.items.filter(item => 
            item.roles.some(r => safeRoles.includes(r))
          );

          if (filteredItems.length === 0) return null;

          return (
            <div key={catIdx} className="mb-6">
              <h3 className="px-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.25em] mb-3">
                {cat.label}
              </h3>
              <ul className="space-y-1">
                {filteredItems.map((item, index) => {
                  const active = isActive(item.name);
                  return (
                    <li 
                      key={index} 
                      onClick={() => handleNavigate(item.name)} 
                      className={`
                        group flex items-center justify-between px-4 py-3 cursor-pointer rounded-xl transition-all duration-500
                        ${active 
                          ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm font-black' 
                          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent hover:translate-x-1'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`transition-colors duration-500 ${active ? 'text-primary' : 'text-slate-400 dark:text-slate-600 group-hover:text-primary'}`}>
                           {React.cloneElement(item.icon, { size: 18, strokeWidth: active ? 2.5 : 2 })}
                        </span>
                        <span className={`text-[13px] tracking-tight transition-colors duration-500 ${active ? 'text-primary' : 'font-semibold group-hover:text-primary'}`}>
                          {item.name}
                        </span>
                      </div>
                      {active && <ChevronRight size={14} className="text-primary animate-pulse" />}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* LOGOUT ACTION */}
      <div className="px-3 py-4 border-t border-border/50 mt-auto bg-card">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all duration-300 font-semibold group"
        >
          <LogOut size={18} className="group-hover:scale-110 transition-transform" />
          <span className="text-[13px] tracking-tight">Logout</span>
        </button>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { 
          background: rgba(148, 163, 184, 0.2); 
          border-radius: 10px; 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { 
          background: var(--color-primary); 
        }
      `}</style>
    </aside>
  );
};

export default Sidebar;