import React, { useEffect, useState, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import API from '../api/axiosConfig';
import ThemeToggle from '../components/ThemeToggle';

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
  Menu,
  X,
  ChevronRight,
  Activity,
  Crown,
  RefreshCcw,
  WifiOff
} from 'lucide-react';

const Dashboard = ({ user, tenantId, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [employees, setEmployees] = useState([]); 
  const [selectedEmployee, setSelectedEmployee] = useState(null); 
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [networkError, setNetworkError] = useState(false); 

  const currentTenantId = tenantId || localStorage.getItem('tenantId');
  const sessionUser = JSON.parse(localStorage.getItem('user'));
  
  const userId = user?._id || user?.id || sessionUser?.id || sessionUser?._id;

  const userRoles = user?.roles || sessionUser?.roles || 
                   (user?.role ? [user.role] : []) || 
                   (sessionUser?.role ? [sessionUser.role] : []) || [];

  const badgeIconMap = {
    Star, Trophy, Medal, Zap, ShieldCheck, Flame, Target, Rocket, Award
  };

  /**
   * REFRESH PERSONNEL DATA
   * Preserved: Logic for multi-tenant data unwrap and network failure handling.
   */
  const fetchEmployees = useCallback(async () => {
    if (!currentTenantId) return;
    try {
      setLoading(true);
      setNetworkError(false);
      const res = await API.get(`/superadmin/employees/${currentTenantId}`);
      const data = Array.isArray(res.data) ? res.data : (res.data?.employees || res.data?.data || []);
      setEmployees(data);
    } catch (err) {
      console.error("Dashboard Personnel Sync Error:", err);
      if (err.code === 'ERR_NETWORK') setNetworkError(true);
      setEmployees([]); 
    } finally {
      setLoading(false);
    }
  }, [currentTenantId]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const currentUserData = Array.isArray(employees) 
    ? employees.find(emp => emp._id === userId) 
    : null;
  
  const latestBadge = currentUserData?.earnedBadges?.length > 0 
    ? currentUserData.earnedBadges[currentUserData.earnedBadges.length - 1] 
    : null;

  const HeaderBadgeIcon = latestBadge ? (badgeIconMap[latestBadge.iconName] || Star) : null;

  const getPageTitle = () => {
    const path = location.pathname.split('/').pop();
    if (!path || path === 'dashboard' || path === '') return 'Executive Overview';
    return path.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const activeTab = location.pathname.split('/').pop() || 'Dashboard';

  const handleNavigate = (tab) => {
    const route = tab === 'Dashboard' ? '' : tab.toLowerCase().replace(/\s+/g, '-');
    navigate(`/dashboard/${route}`);
    setSelectedEmployee(null); 
    setSidebarOpen(false);
  };

  /**
   * LEADERBOARD MODULE: PERFORMANCE ANALYTICS
   * Fully adapted for Semantic Themes.
   */
  const PerformanceLeaderboard = () => {
    const safeEmployees = Array.isArray(employees) ? employees : [];
    const topPerformers = [...safeEmployees]
      .sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0))
      .slice(0, 5);

    return (
      <div className="bg-card backdrop-blur-xl p-8 md:p-12 rounded-[3.5rem] border border-border shadow-2xl relative overflow-hidden group transition-all duration-500">
        <div className="absolute -top-12 -right-12 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-12 gap-6 relative z-10">
          <div className="flex items-center gap-5">
            <div className="p-3.5 bg-amber-500/10 rounded-2xl border border-amber-500/20 shadow-inner">
                <Trophy size={32} className="text-amber-500 animate-pulse" />
            </div>
            <h3 className="text-3xl font-black text-foreground tracking-tighter uppercase leading-none">Global Rankings</h3>
          </div>
          <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em] bg-background px-6 py-2.5 rounded-full border border-border shadow-inner">Operational Excellence</span>
        </div>

        <div className="space-y-5 relative z-10">
          {topPerformers.map((emp, idx) => (
            <div key={emp._id} className="relative flex items-center justify-between p-6 md:p-8 bg-background border border-border rounded-[2.5rem] hover:border-amber-500/40 hover:bg-card hover:shadow-xl transition-all duration-300 group/item">
              {idx === 0 && (
                <div className="absolute -top-4 left-10 z-20">
                  <div className="bg-gradient-to-r from-amber-400 to-yellow-600 p-2 rounded-xl shadow-2xl border border-white/20">
                    <Crown size={14} className="text-slate-950" fill="currentColor" />
                  </div>
                </div>
              )}
              <div className="flex items-center gap-6 md:gap-10">
                <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center font-black text-2xl shadow-inner transition-transform group-hover/item:scale-105
                  ${idx === 0 ? 'bg-amber-500 text-slate-950' : 
                    idx === 1 ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200' : 
                    idx === 2 ? 'bg-amber-800 text-white' : 'bg-card border border-border text-slate-400'}`}>
                  {idx + 1}
                </div>
                <div>
                  <p className="text-foreground font-black text-lg md:text-xl group-hover/item:text-amber-600 transition-colors truncate max-w-[140px] md:max-w-none uppercase tracking-tight">{emp.name}</p>
                  <div className="flex gap-2 mt-3">
                    {Array.isArray(emp.earnedBadges) && emp.earnedBadges.length > 0 ? (
                      emp.earnedBadges.slice(0, 5).map((badge, bIdx) => {
                        const BadgeIcon = badgeIconMap[badge.iconName] || Star;
                        return (
                          <div key={bIdx} title={badge.name} className="w-8 h-8 rounded-xl flex items-center justify-center border border-border shadow-sm transition-all hover:scale-110" style={{ backgroundColor: `${badge.color}15` }}>
                             <BadgeIcon size={14} color={badge.color} />
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1">Pending Achievement</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-amber-600 dark:text-amber-400 font-black text-3xl md:text-4xl leading-none tracking-tighter">{emp.totalPoints || 0}</div>
                <div className="text-[10px] text-slate-500 font-black uppercase tracking-[0.25em] mt-3">Node Output</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden font-sans transition-all duration-700 selection:bg-primary/30">
      
      {/* ADAPTIVE SIDEBAR CONTAINER */}
      <div className={`
        fixed inset-y-0 left-0 transform transition-transform duration-500 ease-in-out z-[200]
        lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0 shadow-[50px_0_100px_rgba(0,0,0,0.3)]' : '-translate-x-full'}
      `}>
        <Sidebar roles={userRoles} activeTab={activeTab} onNavigate={handleNavigate} />
        
      </div>

      {isSidebarOpen && <div onClick={() => setSidebarOpen(false)} className="lg:hidden fixed inset-0 bg-slate-950/40 backdrop-blur-md z-[150] transition-opacity duration-500" />}
      
      <div className="flex-1 flex flex-col relative overflow-y-auto custom-scrollbar">
        
        {/* EXECUTIVE COMMAND HEADER: Fixed background color for both modes */}
        <header className="sticky top-0 z-[100] bg-card/80 backdrop-blur-2xl border-b border-border px-8 md:px-12 py-6 flex justify-between items-center min-h-[100px] transition-all duration-500">
          <div className="flex items-center gap-6">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-4 bg-background border border-border text-slate-500 rounded-[1.5rem] hover:text-primary shadow-sm active:scale-90 transition-all">
              <Menu size={24} />
            </button>
            <div className="hidden sm:flex bg-primary/10 p-3 rounded-2xl border border-primary/20 shadow-inner transition-transform hover:scale-110">
              <Layout size={26} className="text-primary" />
            </div>
            <div className="flex flex-col justify-center">
              <h2 className="text-foreground text-xl font-black tracking-tighter leading-none mb-2 uppercase">{getPageTitle()}</h2>
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em] leading-none">Authorization Valid</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 md:gap-12 h-full">
            {/* PULSE INDEX: No longer hardcoded dark */}
            <div className="hidden lg:flex items-center gap-6 border-r border-border pr-12 h-12">
               <span className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em] leading-none">Operational Pulse</span>
               <ScoreBadge employeeId={userId} minimalist={true} /> 
            </div>

            <div className="flex items-center gap-5 md:gap-8">
              <ThemeToggle />
              
              <div className="text-right hidden sm:flex flex-col justify-center relative min-w-[120px]">
                {latestBadge && (
                  <div className="absolute -top-5 -right-3 animate-bounce-slow">
                     <HeaderBadgeIcon size={20} color={latestBadge.color} style={{ filter: `drop-shadow(0 0 10px ${latestBadge.color}80)` }} />
                  </div>
                )}
                <div className="flex items-center gap-4 justify-end">
                    <div className="text-foreground text-base font-black leading-none uppercase tracking-tight">{user?.name || sessionUser?.name}</div>
                    <div className="w-3 h-3 rounded-full shadow-inner" style={{ backgroundColor: latestBadge ? latestBadge.color : '#38bdf8' }} />
                </div>
                <div className="inline-block self-end mt-2.5">
                    <span className="text-primary text-[10px] font-black uppercase tracking-[0.3em] leading-none bg-primary/10 px-3 py-2 rounded-xl border border-primary/20 shadow-sm">
                      {userRoles[0] || 'Authenticated Node'}
                    </span>
                </div>
              </div>
              
              {/* EXIT TRIGGER */}
              <button onClick={onLogout} title="De-authorize Session" className="group bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl text-rose-600 dark:text-rose-500 hover:bg-rose-600 hover:text-white active:scale-95 shadow-lg transition-all duration-300">
                <LogOut size={22} className="group-hover:rotate-12 transition-transform" />
              </button>
            </div>
          </div>
        </header>

        {/* MAIN MISSION AREA */}
        <main className="p-6 md:p-14 w-full max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000">
          
          {/* NETWORK HANDSHAKE FAILURE UI */}
          {networkError && (
            <div className="mb-12 bg-rose-500/10 border border-rose-500/20 p-10 rounded-[4rem] text-center animate-in zoom-in-95 duration-500 shadow-2xl">
                <WifiOff className="mx-auto text-rose-500 mb-6" size={56} />
                <h3 className="text-rose-600 dark:text-rose-500 font-black uppercase tracking-tighter text-2xl leading-none">Handshake Severed</h3>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] font-black uppercase tracking-widest mt-3 opacity-80">Unable to establish secure telemetry with the master node.</p>
                <button onClick={fetchEmployees} className="mt-8 px-10 py-4 bg-rose-600 text-white font-black text-[11px] uppercase tracking-[0.4em] rounded-[1.5rem] shadow-xl shadow-rose-600/20 active:scale-95 transition-all">Retry Synchronization</button>
            </div>
          )}

          <Routes>
            <Route path="/" element={
              <div className="space-y-16">
                <div className="flex items-baseline gap-4">
                    <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-foreground uppercase leading-none">Central Station</h1>
                    <div className="h-1.5 flex-1 bg-border/40 rounded-full" />
                </div>
                
                {/* PRIMARY SYSTEM IDENTITY CARD */}
                <div className="bg-card backdrop-blur-xl p-8 md:p-14 rounded-[4rem] border border-border shadow-[0_40px_80px_rgba(0,0,0,0.05)] dark:shadow-none relative overflow-hidden group transition-all duration-500">
                  <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none group-hover:opacity-60 transition-opacity" />
                  
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-8 relative z-10">
                    <div className="flex items-center gap-6">
                        <div className="p-4 bg-primary/10 rounded-[1.8rem] border border-primary/20 shadow-inner">
                            <User size={36} className="text-primary" />
                        </div>
                        <div>
                            <h3 className="text-3xl font-black text-foreground uppercase tracking-tighter leading-none">Node Intelligence</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] mt-2 opacity-70">Authenticated Profile Telemetry</p>
                        </div>
                    </div>
                  </div>

                  <div className="relative z-10 grid grid-cols-1 xl:grid-cols-[1.1fr_1.4fr] gap-14 items-start">
                    <div className="bg-background/50 backdrop-blur-xl p-8 md:p-12 rounded-[3.5rem] border border-border shadow-inner">
                      <ScoreBadge employeeId={userId} />
                    </div>
                    
                    <div className="space-y-10">
                      {Array.isArray(currentUserData?.earnedBadges) && currentUserData.earnedBadges.length > 0 ? (
                        <div className="animate-in fade-in slide-in-from-right-10 duration-1000">
                           <h4 className="text-[10px] font-black text-slate-400 dark:text-primary uppercase tracking-[0.5em] mb-10 flex items-center gap-4 px-3">
                             <Sparkles size={18} className="text-amber-500 animate-pulse" /> Unlocked Merit Badges
                           </h4>
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                              {currentUserData.earnedBadges.map((badge, bIdx) => {
                                const BadgeIcon = badgeIconMap[badge.iconName] || Star;
                                return (
                                  <div key={bIdx} className="flex items-center gap-6 bg-background border border-border p-6 rounded-[2.5rem] hover:border-primary/40 hover:scale-[1.02] hover:shadow-2xl transition-all duration-300 group/badge shadow-sm">
                                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center border border-border shadow-inner transition-transform group-hover/badge:rotate-6" style={{ backgroundColor: `${badge.color}15` }}>
                                       <BadgeIcon size={32} color={badge.color} style={{ filter: `drop-shadow(0 0 10px ${badge.color}80)` }} />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                      <span className="text-lg font-black text-foreground group-hover/badge:text-primary transition-colors truncate uppercase tracking-tight">{badge.name}</span>
                                      <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mt-2">Protocol Verified</span>
                                    </div>
                                  </div>
                                );
                              })}
                           </div>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center py-24 px-12 border-4 border-dashed border-border rounded-[4rem] opacity-20 grayscale transition-all">
                           <Award size={80} className="text-slate-300 dark:text-slate-700 mb-8" />
                           <p className="text-[12px] font-black uppercase tracking-[0.6em] text-slate-400 text-center leading-loose">Mission history required <br/> to generate achievement nodes.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <PerformanceLeaderboard />
              </div>
            } />

            {/* ROUTE MAPPING: All Page Wrappers now use bg-card */}
            <Route path="employees" element={
              <div className="flex flex-col gap-16">
                <div className="bg-card backdrop-blur-xl p-4 rounded-[4rem] border border-border shadow-inner">
                  <AddEmployee tenantId={currentTenantId} selectedEmployee={selectedEmployee} onSuccess={() => { fetchEmployees(); setSelectedEmployee(null); }} />
                </div>
                <div className="relative">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-48 gap-8 transition-colors duration-700">
                        <div className="relative">
                            <RefreshCcw className="animate-spin text-primary" size={64} />
                            <div className="absolute inset-0 blur-3xl bg-primary/20 animate-pulse rounded-full"></div>
                        </div>
                        <p className="text-slate-400 dark:text-slate-500 font-black text-[13px] tracking-[0.6em] uppercase">Decrypting Personnel Registry...</p>
                    </div>
                  ) : (
                    <RegisteredEmployees employees={employees} onEdit={(emp) => { setSelectedEmployee(emp); window.scrollTo({ top: 0, behavior: 'smooth' }); }} fetchEmployees={fetchEmployees} />
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
          </Routes>
        </main>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.2); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(56, 189, 248, 0.4); }
        @keyframes bounce-slow { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        .animate-bounce-slow { animation: bounce-slow 3s infinite ease-in-out; }
      `}</style>
    </div>
  );
};

export default Dashboard;