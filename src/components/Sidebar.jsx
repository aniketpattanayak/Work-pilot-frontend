import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import API from '../api/axiosConfig';
import axios from 'axios';
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
  // Badge Icons
  Star,
  Medal,
  Flame,
  Target,
  Rocket,
  ShieldCheck as ShieldCheckIcon,
  Award,
  Zap
} from 'lucide-react';

const Sidebar = ({ roles = [], tenantId }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [factoryLogo, setFactoryLogo] = useState('');
  const [companyName, setCompanyName] = useState('WORK PILOT');
  const [loadingLogo, setLoadingLogo] = useState(false);

  // Parse user from local storage to get live point data and earned badges
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const currentTenantId = tenantId || localStorage.getItem('tenantId');
  const safeRoles = Array.isArray(roles) ? roles : [];

  // Icon Mapping for dynamic Badge Rendering
  const iconMap = {
    Star: Star,
    Trophy: Trophy,
    Medal: Medal,
    Zap: Zap,
    ShieldCheck: ShieldCheckIcon,
    Flame: Flame,
    Target: Target,
    Rocket: Rocket,
    Award: Award
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

  // --- UPDATED CATEGORIES PER YOUR REQUEST ---
  const categories = [
    {
      label: '',
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
        // Updated Label
        { name: 'Create Checklist', icon: <LayoutList />, roles: ['Admin'] },
        { name: 'Manage Checklist', icon: <ClipboardList />, roles: ['Admin'] },
        // Updated Label & Positioned before Monitor
        { name: 'My Checklist', icon: <ListTodo />, roles: ['Admin', 'Assigner', 'Doer', 'Coordinator'] },
        { name: 'Checklist Monitor', icon: <Activity />, roles: ['Admin', 'Coordinator'] },
      ]
    },
    {
      label: 'Security & Settings',
      items: [
        { name: 'Employees', icon: <Users />, roles: ['Admin'] },
        { name: 'Mapping', icon: <UserCog />, roles: ['Admin'] },
        { name: 'Tracking', icon: <Eye />, roles: ['Admin', 'Coordinator'] },
        { name: 'Rewards Log', icon: <HistoryIcon />, roles: ['Admin', 'Assigner', 'Doer', 'Coordinator'] },
        { name: 'Settings', icon: <Settings />, roles: ['Admin'] },
      ]
    }
  ];

  /**
   * FIX: Helper to standardize route generation
   */
  const getRoute = (itemName) => {
    if (itemName === 'Dashboard') return '';
    // Map custom display names to the actual routes defined in Dashboard.jsx
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
    <aside className="w-[280px] bg-slate-950 border-r border-slate-800/60 h-screen flex flex-col sticky top-0 z-[100] transition-all duration-300">
      
      {/* BRANDING SECTION */}
      <div className="px-6 py-10 flex flex-col justify-center min-h-[140px]">
        {loadingLogo ? (
          <div className="flex items-center gap-3">
            <RefreshCcw className="animate-spin text-sky-500" size={24} />
            <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">Loading...</span>
          </div>
        ) : factoryLogo ? (
          <div className="bg-white/5 p-2 rounded-xl inline-block border border-white/10 self-start mb-4">
            <img 
              src={factoryLogo} 
              alt="Logo" 
              className="max-h-[50px] object-contain" 
            />
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center text-slate-950">
                <ShieldCheck size={20} />
            </div>
            <h2 className="text-xl font-black text-white tracking-tighter">
              {companyName.toUpperCase()}
            </h2>
          </div>
        )}
        
        <div className="flex flex-wrap gap-1.5 mt-2">
          {safeRoles.length > 0 ? safeRoles.map((r, i) => (
            <span key={i} className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20">
              {r}
            </span>
          )) : (
            <span className="text-[10px] font-bold text-red-400 px-2 py-1 bg-red-500/10 rounded-md">
              UNAUTHORIZED
            </span>
          )}
        </div>

        {/* PERFORMANCE SCORE & BADGES */}
        {user?.totalPoints !== undefined && (
          <div className="mt-5 p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 shadow-[0_0_20px_rgba(251,191,36,0.05)]">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <Trophy size={16} className="text-amber-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-amber-500/60 uppercase tracking-[0.2em] leading-none mb-1">Performance Index</span>
                <span className="text-lg font-black text-white leading-none tracking-tight">
                  {user.totalPoints} <span className="text-[10px] text-slate-500 font-bold ml-0.5">PTS</span>
                </span>
              </div>
            </div>

            {user?.earnedBadges?.length > 0 && (
              <div className="mt-4 pt-3 border-t border-amber-500/10">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">Unlocked Achievements</p>
                <div className="flex flex-wrap gap-2">
                  {user.earnedBadges.map((badge, idx) => {
                    const IconComponent = iconMap[badge.iconName] || Star;
                    return (
                      <div 
                        key={idx} 
                        title={`${badge.name}`}
                        className="w-8 h-8 rounded-lg flex items-center justify-center border"
                        style={{ 
                          backgroundColor: `${badge.color}15`, 
                          borderColor: `${badge.color}30`
                        }}
                      >
                        <IconComponent 
                          size={14} 
                          color={badge.color} 
                          style={{ filter: `drop-shadow(0 0 5px ${badge.color}40)` }} 
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* NAVIGATION SECTION */}
      <nav className="flex-1 overflow-y-auto px-4 custom-scrollbar">
        {categories.map((cat, catIdx) => {
          const filteredItems = cat.items.filter(item => 
            item.roles.some(r => safeRoles.includes(r))
          );

          if (filteredItems.length === 0) return null;

          return (
            <div key={catIdx} className="mb-8">
              <h3 className="px-4 text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">
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
                        group flex items-center justify-between px-4 py-3 cursor-pointer rounded-xl transition-all duration-200
                        ${active 
                          ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' 
                          : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100 border border-transparent'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`${active ? 'text-sky-400' : 'text-slate-500 group-hover:text-slate-300'} transition-colors`}>
                           {React.cloneElement(item.icon, { size: 18 })}
                        </span>
                        <span className={`text-[13.5px] font-bold tracking-tight ${active ? 'font-black' : 'font-medium'}`}>
                          {item.name}
                        </span>
                      </div>
                      {active && (
                        <div className="w-1.5 h-1.5 rounded-full bg-sky-500 shadow-[0_0_8px_#38bdf8]" />
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
      
      {/* FOOTER */}
      <div className="mt-auto p-6 bg-slate-950/80 backdrop-blur-md border-t border-slate-800/40">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
            v 1.2.0 • PRO Edition
          </p>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
      `}</style>
    </aside>
  );
};

export default Sidebar;