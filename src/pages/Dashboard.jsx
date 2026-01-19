import React, { useEffect, useState, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import API from '../api/axiosConfig';
import axios from 'axios';

// Component Imports
import Sidebar from '../components/Sidebar';
import ScoreBadge from '../components/ScoreBadge';
import AddEmployee from './AddEmployee'; 
import SettingsPage from './Settings'; 
import CoordinatorMapping from './CoordinatorMapping';
import RegisteredEmployees from './RegisteredEmployees'; 
import ManageChecklist from './ManageChecklist';
import ChecklistMonitor from './ChecklistMonitor'; 


// Task components
import CreateTask from './CreateTask'; 
import ManageTasks from './ManageTasks'; 
import DoerChecklist from './DoerChecklist'; 
import CoordinatorDashboard from './CoordinatorDashboard'; 
import CreateChecklist from './CreateChecklist'; 
import RewardsLog from './RewardsLog';

// Icons
import { 
  User, 
  LogOut, 
  Layout, 
  Trophy, 
  Medal, 
  Star, 
  Zap, 
  Flame, 
  Target, 
  Rocket, 
  Award, 
  ShieldCheck,
  Sparkles,
  Crown,
  Search,
  CheckCircle2,
  ArrowRight,
  Calendar
} from 'lucide-react';

const Dashboard = ({ user, tenantId, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [employees, setEmployees] = useState([]); 
  const [selectedEmployee, setSelectedEmployee] = useState(null); 
  const [loading, setLoading] = useState(false);

  // Persistence Logic (Preserved)
  const currentTenantId = tenantId || localStorage.getItem('tenantId');
  const sessionUser = JSON.parse(localStorage.getItem('user'));
  
  // CRITICAL: Accurate ID Detection
  const userId = user?._id || user?.id || sessionUser?.id || sessionUser?._id;

  // Multi-Role Logic (Preserved)
  const userRoles = user?.roles || sessionUser?.roles || 
                   (user?.role ? [user.role] : []) || 
                   (sessionUser?.role ? [sessionUser.role] : []) || [];

  // Icon Mapping for dynamic badge rendering
  const badgeIconMap = {
    Star: Star,
    Trophy: Trophy,
    Medal: Medal,
    Zap: Zap,
    ShieldCheck: ShieldCheck,
    Flame: Flame,
    Target: Target,
    Rocket: Rocket,
    Award: Award
  };

  /**
   * UPDATED: Defensive Data Fetching
   * Ensures 'employees' is always an array to prevent crashes.
   */
  const fetchEmployees = useCallback(async () => {
    if (!currentTenantId) return;
    try {
      setLoading(true);
      // Use the centralized API instance
      const res = await API.get(`/superadmin/employees/${currentTenantId}`);
      
      // Safety: Unwrap data if it's nested in an object (common in consolidated APIs)
      const data = Array.isArray(res.data) ? res.data : (res.data?.employees || res.data?.data || []);
      setEmployees(data);
    } catch (err) {
      console.error("Fetch Error:", err);
      setEmployees([]); // Fallback to empty array
    } finally {
      setLoading(false);
    }
  }, [currentTenantId]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // FIX: Added Array.isArray check to prevent '.find is not a function' error
  const currentUserData = Array.isArray(employees) 
    ? employees.find(emp => emp._id === userId) 
    : null;
  
  // Logic to get the LATEST earned badge for the header
  const latestBadge = currentUserData?.earnedBadges?.length > 0 
    ? currentUserData.earnedBadges[currentUserData.earnedBadges.length - 1] 
    : null;

  const HeaderBadgeIcon = latestBadge ? (badgeIconMap[latestBadge.iconName] || Star) : null;

  const getPageTitle = () => {
    const path = location.pathname.split('/').pop();
    if (!path || path === 'dashboard') return 'Overview';
    return path.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const activeTab = location.pathname.split('/').pop() || 'Dashboard';

  const handleNavigate = (tab) => {
    const route = tab === 'Dashboard' ? '' : tab.toLowerCase().replace(/\s+/g, '-');
    navigate(`/dashboard/${route}`);
    setSelectedEmployee(null); 
  };

  /**
   * LEADERBOARD SUB-COMPONENT (Optimized for Width)
   */
  const PerformanceLeaderboard = () => {
    // FIX: Ensure employees is an array before sorting/mapping
    const safeEmployees = Array.isArray(employees) ? employees : [];
    const topPerformers = [...safeEmployees]
      .sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0))
      .slice(0, 5);

    return (
      <div className="bg-slate-900/40 backdrop-blur-md p-10 rounded-[2.5rem] border border-slate-800/60 shadow-2xl relative overflow-hidden group">
        <div className="absolute -top-12 -right-12 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl group-hover:bg-amber-500/10 transition-colors" />
        
        <div className="flex justify-between items-center mb-10 relative z-10">
          <h3 className="text-2xl font-bold flex items-center gap-4 text-amber-400">
            <Trophy size={28} className="animate-pulse" /> Factory Top Performers
          </h3>
          <span className="text-[12px] font-black text-slate-500 uppercase tracking-widest bg-slate-950 px-4 py-1.5 rounded-full border border-slate-800">Global Rankings</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-1 gap-4 relative z-10">
          {topPerformers.length > 0 ? topPerformers.map((emp, idx) => (
            <div key={emp._id} className="relative flex items-center justify-between p-6 bg-slate-950/50 rounded-3xl border border-slate-800/50 hover:border-amber-500/30 transition-all group/item shadow-inner">
              
              {idx === 0 && (
                <div className="absolute -top-3 left-8 z-20 animate-bounce">
                  <div className="bg-gradient-to-r from-amber-400 to-yellow-600 p-1.5 rounded-md shadow-[0_0_15px_rgba(251,191,36,0.5)] border border-white/20">
                    <Trophy size={12} className="text-slate-950" fill="currentColor" />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl relative
                  ${idx === 0 ? 'bg-amber-500 text-slate-950 shadow-[0_0_20px_rgba(251,191,36,0.4)]' : 
                    idx === 1 ? 'bg-slate-300 text-slate-950' : 
                    idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-900 text-slate-500 border border-slate-800'}`}>
                  {idx + 1}
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <p className="text-white font-black text-lg group-hover/item:text-amber-400 transition-colors">{emp.name}</p>
                    {idx === 0 && (
                       <span className="text-[8px] font-black bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2.5 py-1 rounded-full uppercase tracking-widest shadow-[0_0_10px_rgba(251,191,36,0.2)]">
                         Champion
                       </span>
                    )}
                  </div>
                  
                  <div className="flex gap-2 mt-2">
                    {/* FIX: Safe check for earnedBadges map */}
                    {Array.isArray(emp.earnedBadges) && emp.earnedBadges.length > 0 ? (
                      emp.earnedBadges.slice(0, 5).map((badge, bIdx) => {
                        const BadgeIcon = badgeIconMap[badge.iconName] || Star;
                        return (
                          <div 
                            key={bIdx} 
                            title={badge.name}
                            className="w-7 h-7 rounded-lg flex items-center justify-center border border-white/5 shadow-inner hover:scale-110 transition-transform"
                            style={{ backgroundColor: `${badge.color}20` }}
                          >
                             <BadgeIcon size={14} color={badge.color} style={{ filter: `drop-shadow(0 0 3px ${badge.color}50)` }} />
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-[10px] text-slate-700 font-bold uppercase tracking-widest">Awaiting First Achievement</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-amber-400 font-black text-3xl leading-none tracking-tighter">{emp.totalPoints || 0}</div>
                <div className="text-[10px] text-slate-600 font-black uppercase tracking-widest mt-1">Reward Points</div>
              </div>
            </div>
          )) : (
            <p className="text-center py-20 text-slate-600 text-sm font-bold uppercase tracking-widest">Points initialization pending...</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen w-screen bg-slate-950 overflow-hidden font-sans selection:bg-sky-500/30">
      
      <Sidebar 
        roles={userRoles} 
        activeTab={activeTab} 
        onNavigate={handleNavigate} 
      />
      
      <div className="flex-1 flex flex-col relative overflow-y-auto bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900 to-slate-950 custom-scrollbar">
        
        {/* EXECUTIVE STICKY HEADER */}
        <header className="sticky top-0 z-[100] bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50 px-10 py-4 flex justify-between items-center min-h-[80px]">
          <div className="flex items-center gap-4">
            <div className="bg-sky-500/10 p-2.5 rounded-xl border border-sky-500/20">
              <Layout size={20} className="text-sky-400" />
            </div>
            <div className="flex flex-col justify-center">
              <h2 className="text-slate-100 text-lg font-bold tracking-tight leading-none mb-1">
                {getPageTitle()}
              </h2>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">
                Work Pilot Node
              </span>
            </div>
          </div>

          <div className="flex items-center gap-8 h-full">
            <div className="hidden md:flex items-center gap-4 border-r border-slate-800 pr-8 h-10">
               <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest leading-none">Efficiency Index</span>
               <div className="flex items-center justify-center">
                  <ScoreBadge employeeId={userId} minimalist={true} /> 
               </div>
            </div>

            <div className="flex items-center gap-5">
              <div className="text-right flex flex-col justify-center relative">
                
                {latestBadge && (
                  <div className="absolute -top-3.5 -right-2 animate-bounce-slow">
                     <HeaderBadgeIcon 
                        size={14} 
                        color={latestBadge.color} 
                        fill={latestBadge.color} 
                        fillOpacity={0.2} 
                        style={{ filter: `drop-shadow(0 0 8px ${latestBadge.color}80)` }}
                      />
                  </div>
                )}
                
                <div className="flex items-center gap-2 justify-end">
                    <div className="text-slate-200 text-sm font-black leading-none">{user?.name || sessionUser?.name}</div>
                    
                    {/* <span 
                      className="text-[7px] font-black text-slate-950 px-1.5 py-0.5 rounded-sm uppercase tracking-tighter shadow-lg"
                      style={{ backgroundColor: latestBadge ? latestBadge.color : '#fbbf24' }}
                    >
                      {latestBadge ? latestBadge.name : 'Standard Node'}
                    </span> */}
                </div>
                {/* <div className="inline-block self-end mt-1">
                    <span className="text-sky-400 text-[9px] font-black uppercase tracking-[0.2em] leading-none bg-sky-500/10 px-2 py-1 rounded border border-sky-500/20">
                      {userRoles[0] || 'Member'}
                    </span>
                </div> */}
              </div>
              
              <button 
                onClick={onLogout}
                title="Secure Sign Out"
                className="group bg-red-500/5 border border-red-500/20 p-3 rounded-2xl text-red-400 hover:bg-red-500/10 transition-all active:scale-95 shadow-lg shadow-red-500/5"
              >
                <LogOut size={18} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </header>

        {/* PAGE CONTENT CONTAINER */}
        <div className="p-10 w-full max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-3 duration-500">
          <Routes>
            <Route path="/" element={
              <div className="text-white space-y-10">
                <div className="mb-4">
                  <h1 className="text-4xl font-black tracking-tighter mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-500">
                    Station Overview
                  </h1>
                  <p className="text-slate-400 text-lg">Central command for factory telemetry and staff performance.</p>
                </div>

                {/* SYSTEM IDENTITY (TOP FULL WIDTH) */}
                <div className="bg-slate-900/40 backdrop-blur-md p-10 rounded-[2.5rem] border border-slate-800/60 shadow-2xl relative overflow-hidden group">
                  <div className="absolute -top-24 -right-24 w-80 h-80 bg-sky-500/5 rounded-full blur-3xl group-hover:bg-sky-500/10 transition-colors" />
                  
                  <div className="flex justify-between items-center mb-10 relative z-10">
                    <h3 className="text-2xl font-bold flex items-center gap-3 text-sky-400">
                      <User size={28} /> System Identity
                    </h3>
                    <div className="flex items-center gap-2 bg-sky-500/10 px-6 py-2 rounded-full border border-sky-500/20 shadow-inner">
                      <div className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                      <span className="text-[12px] font-black text-sky-400 uppercase tracking-widest">Authorized Active Session</span>
                    </div>
                  </div>
                  
                  <div className="relative z-10 grid grid-cols-1 xl:grid-cols-[1fr_1.5fr] gap-12 items-start">
                    {/* Score Badge Left Side */}
                    <div className="bg-slate-950/50 p-8 rounded-[2rem] border border-slate-800/40 shadow-inner">
                      <ScoreBadge employeeId={userId} />
                    </div>

                    {/* Achievement Gallery Right Side */}
                    <div className="space-y-6">
                      {/* FIX: Safe check for earnedBadges map in system identity section */}
                      {Array.isArray(currentUserData?.earnedBadges) && currentUserData.earnedBadges.length > 0 ? (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-700">
                           <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] mb-6 flex items-center gap-3 px-1">
                             <Sparkles size={16} className="text-amber-400" /> Achievement Workshop Log
                           </h4>
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {currentUserData.earnedBadges.map((badge, bIdx) => {
                                const BadgeIcon = badgeIconMap[badge.iconName] || Star;
                                return (
                                  <div key={bIdx} className="flex items-center gap-4 bg-slate-950/60 p-4 rounded-3xl border border-slate-800/40 hover:border-amber-500/20 transition-all group/badge shadow-sm">
                                    <div 
                                      className="w-12 h-12 rounded-2xl flex items-center justify-center border border-white/5 shadow-inner"
                                      style={{ backgroundColor: `${badge.color}15` }}
                                    >
                                       <BadgeIcon size={22} color={badge.color} />
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-sm font-black text-slate-200 group-hover/badge:text-amber-400 transition-colors">
                                        {badge.name}
                                      </span>
                                      <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
                                        Unlocked Milestone
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                           </div>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center p-10 border-2 border-dashed border-slate-800/50 rounded-[2rem] opacity-30">
                           <Medal size={48} className="text-slate-600 mb-4" />
                           <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Workshop Awaiting Completion Data</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-10 pt-8 border-t border-slate-800/60 flex gap-4 flex-wrap relative z-10">
                    {/* FIX: Added check before mapping roles */}
                    {Array.isArray(userRoles) && userRoles.map((role, idx) => (
                      <span key={idx} className="text-[11px] font-black tracking-widest uppercase text-slate-400 bg-slate-950 px-6 py-3 rounded-2xl border border-slate-800 shadow-sm transition-colors hover:border-sky-500/30">
                        Operational Tier: {role}
                      </span>
                    ))}
                  </div>
                </div>

                {/* FACTORY TOP PERFORMERS (BELOW) */}
                <PerformanceLeaderboard />
              </div>
            } />

            <Route path="employees" element={
              <div className="flex flex-col gap-10">
                <div className="bg-slate-900/30 p-1.5 rounded-[2.5rem] border border-slate-800/40 shadow-inner">
                  <AddEmployee 
                    tenantId={currentTenantId} 
                    selectedEmployee={selectedEmployee} 
                    onSuccess={() => {
                      fetchEmployees(); 
                      setSelectedEmployee(null); 
                    }} 
                  />
                </div>
                <div className="relative">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                      <div className="w-10 h-10 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin" />
                      <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Synchronizing Personnel Data...</p>
                    </div>
                  ) : (
                    <RegisteredEmployees 
                      employees={employees} 
                      onEdit={(emp) => {
                        setSelectedEmployee(emp); 
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }} 
                      fetchEmployees={fetchEmployees}
                    />
                  )}
                </div>
              </div>
            } />

            <Route path="factory-settings" element={<SettingsPage tenantId={currentTenantId} />} />
            <Route path="mapping" element={<CoordinatorMapping tenantId={currentTenantId} />} />
            <Route path="create-task" element={<CreateTask tenantId={currentTenantId} assignerId={userId} />} />
            <Route path="manage-tasks" element={<ManageTasks assignerId={userId} tenantId={currentTenantId} />} />
            <Route path="checklist-setup" element={<CreateChecklist tenantId={currentTenantId} />} />
            <Route path="manage-checklist" element={<ManageChecklist tenantId={currentTenantId} />} />
            <Route path="checklist-monitor" element={<ChecklistMonitor tenantId={currentTenantId} />} />
            <Route path="my-tasks" element={<DoerChecklist doerId={userId} />} />
            <Route path="checklist" element={<DoerChecklist doerId={userId} />} />
            <Route path="tracking" element={<CoordinatorDashboard coordinatorId={userId} />} />
            <Route path="rewards-log" element={<RewardsLog userId={userId} tenantId={currentTenantId} />} />
            <Route path="settings" element={<SettingsPage tenantId={tenantId} />} />
          </Routes>
        </div>
      </div>

      {/* Internal Custom Scrollbar Styling */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #334155;
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;