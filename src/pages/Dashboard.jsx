import React, { useEffect, useState, useCallback } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import API from "../api/axiosConfig";

// Component Imports
import Sidebar from "../components/Sidebar";
import ScoreBadge from "../components/ScoreBadge";
import AddEmployee from "./AddEmployee";
import SettingsPage from "./Settings";
import CoordinatorMapping from "./CoordinatorMapping";
import RegisteredEmployees from "./RegisteredEmployees";
import ManageChecklist from "./ManageChecklist";
import ChecklistMonitor from "./ChecklistMonitor";
import ThemeToggle from "../components/ThemeToggle"; // Theme Engine
import FmsDashboard from './FmsDashboard';
import FlowManagement  from './FlowManagement';
import ChatPage        from './ChatPage';
import FloatingChat from '../components/FloatingChat';
import { isViewerOnly } from '../utils/viewerMode';
import { DialogHost } from '../components/Dialog';
import ErrorBoundary from '../components/ErrorBoundary';
import OrderFormsPage  from './OrderFormsPage';
import NewOrderPage    from './NewOrderPage';
import FlowMyTasks from './FlowMyTasks';
import LeavePage from './LeavePage';
import AttendancePage from './AttendancePage';
import ReportsTab from './ReportsTab';
// Task components
import CreateTask from "./CreateTask";
import ManageTasks from "./ManageTasks";
import DoerChecklist from "./DoerChecklist";
import CoordinatorDashboard from "./CoordinatorDashboard";
import CreateChecklist from "./CreateChecklist";
import RewardsLog from "./RewardsLog";

// Review Meeting Integration
import ReviewMeeting from "./ReviewMeeting";
import GlobalView from "./GlobalView";
import UserDashboard from "./UserDashboard";

// Support System Imports
import RaiseTicket from "./RaiseTicket";

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
  Calendar,
  Menu,
  X,
  ChevronRight,
  Activity,
  Clock,
  RefreshCcw,
  BarChart3, 
} from "lucide-react";

import { Plus } from "lucide-react";

/**
 * DASHBOARD: GLOBAL OPERATIONAL COMMAND v2.0
 * Fully Responsive | Multi-Tenant | Dual-Theme (Light/Dark)
 * UPDATED: Integrated Dual "Not Done %" Index for Checklist and Delegation.
 */
const Dashboard = ({ user, tenantId, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); 

const [isModalOpen, setIsModalOpen] = useState(false);
  const handleEditInitiated = (emp) => {
    setSelectedEmployee(emp);
    setIsModalOpen(true); // Open modal on edit
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEmployee(null);
  };




  // NEW: State for the Dual Header Efficiency Index
  const [userScore, setUserScore] = useState({ 
    chkNotDone: 0, 
    delNotDone: 0, 
    totalPoints: 0 
  });

  const [myBadges, setMyBadges] = useState([]);

  // Persistence Logic
  const currentTenantId = tenantId || localStorage.getItem("tenantId");


/*
  const [liveUser, setLiveUser] = useState(
  JSON.parse(localStorage.getItem("user"))
);


const sessionUser = liveUser;

*/


  const sessionUser =JSON.parse(localStorage.getItem("user"));

  const userId = user?._id || user?.id || sessionUser?.id || sessionUser?._id;

 const userRoles =
    user?.roles ||
    sessionUser?.roles ||
    (user?.role ? [user.role] : []) ||
    (sessionUser?.role ? [sessionUser.role] : []) ||
    [];

  // Determine if user has Administrative clearance
  const isAdmin = userRoles.some((role) => role.toLowerCase() === "admin");

  const badgeIconMap = {
    Star,
    Trophy,
    Medal,
    Zap,
    ShieldCheck,
    Flame,
    Target,
    Rocket,
    Award,
  };

  const fetchEmployees = useCallback(async () => {
    if (!currentTenantId) return;
    try {
      setLoading(true);
      const res = await API.get(`/tasks/employees/${currentTenantId}`);
      const data = Array.isArray(res.data)
        ? res.data
        : res.data?.employees || res.data?.data || [];
      setEmployees(data);
    } catch (err) {
      console.error("Fetch Error:", err);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [currentTenantId]);

  /**
   * NEW: FETCH DUAL USER EFFICIENCY SCORE
   * Pulls separate "Not Done" stats for Checklist and Delegation categories.
   */
  const fetchUserScore = useCallback(async () => {
    if (!userId || !currentTenantId) return;
    try {
      // One call for this person's own numbers (same source as the dashboard page)
      const res = await API.get(`/tasks/user-dashboard/${userId}`, { params: { view: 'Weekly' } });
      const d = res.data || {};
      const st = d.stats || {};
      const pc = (x) => (x && x.total > 0 ? (x.notDone / x.total) * 100 : 0);
      setUserScore({
        chkNotDone: pc(st.checklist),
        delNotDone: pc(st.delegation),
        totalPoints: d.employee?.totalPoints || 0
      });
      setMyBadges(Array.isArray(d.employee?.earnedBadges) ? d.employee.earnedBadges : []);
    } catch (err) {
      console.error("Failed to fetch dual efficiency stats:", err);
    }
  }, [userId, currentTenantId, employees]);

  useEffect(() => {
    fetchEmployees();
    setSidebarOpen(false);
  }, [fetchEmployees, location.pathname]);

  // Secondary effect to sync scores once employee list is loaded
  useEffect(() => {
    fetchUserScore();
    const interval = setInterval(fetchUserScore, 300000); // 5-minute sync
    return () => clearInterval(interval);
  }, [fetchUserScore]);

  const currentUserData = Array.isArray(employees)
    ? employees.find((emp) => emp._id === userId)
    : null;

  const badgeSource = currentUserData?.earnedBadges?.length > 0 ? currentUserData.earnedBadges : myBadges;
  const latestBadge = badgeSource.length > 0 ? badgeSource[badgeSource.length - 1] : null;

  const HeaderBadgeIcon = latestBadge
    ? badgeIconMap[latestBadge.iconName] || Star
    : null;

  const getPageTitle = () => {
    const path = location.pathname.split("/").pop();
    if (!path || path === "dashboard") return "Overview";
    return path.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const activeTab = location.pathname.split("/").pop() || "Dashboard";

  const handleNavigate = (tab) => {
    const route =
      tab === "Dashboard" ? "" : tab.toLowerCase().replace(/\s+/g, "-");
    navigate(`/dashboard/${route}`);
    setSelectedEmployee(null);
  };
/*




const refreshUserProfile = useCallback(async () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) return;

    const res = await API.get(`/superadmin/auth/me`);

    const updatedUser = res.data?.user || res.data;

    // ✅ update storage
    localStorage.setItem("user", JSON.stringify(updatedUser));

    // ✅ update state (THIS TRIGGERS UI)
    setLiveUser(updatedUser);
  } catch (err) {
    console.error("User refresh failed", err);
  }
}, [currentTenantId]);




useEffect(() => {
  refreshUserProfile();
}, [refreshUserProfile]);


useEffect(() => {
  const interval = setInterval(() => {
    refreshUserProfile();
  }, 60000); // every 1 min

  return () => clearInterval(interval);
}, [refreshUserProfile]);


*/
  /**
   * LEADERBOARD SUB-COMPONENT
   */
  const PerformanceLeaderboard = () => {
    const safeEmployees = Array.isArray(employees) ? employees : [];
    const topPerformers = [...safeEmployees]
      .sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0))
      .slice(0, 5);

    return (
      <div className="bg-card backdrop-blur-xl p-6 md:p-10 rounded-[2.5rem] border border-border shadow-2xl relative overflow-hidden group text-left">
        <div className="absolute -top-12 -right-12 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl group-hover:bg-amber-500/10 transition-colors pointer-events-none" />

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 relative z-10 gap-4">
          <h3 className="text-xl md:text-2xl font-black flex items-center gap-4 text-amber-600 dark:text-amber-400">
            <Trophy size={28} className="animate-pulse" /> Top Performers
          </h3>
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] bg-background px-5 py-2 rounded-full border border-border">
            Global Rankings
          </span>
        </div>

        <div className="flex flex-col gap-4 relative z-10">
          {topPerformers.length > 0 ? (
            topPerformers.map((emp, idx) => (
              <div
                key={emp._id}
                className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 bg-background/50 rounded-3xl border border-border hover:border-amber-500/30 transition-all group/item shadow-inner gap-4"
              >
                <div className="flex items-center gap-6">
                  <div
                    className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center font-black text-lg md:text-xl relative shrink-0
                  ${
                    idx === 0
                      ? "bg-amber-500 text-white dark:text-slate-950 shadow-lg"
                      : idx === 1
                      ? "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      : idx === 2
                      ? "bg-amber-700 text-white"
                      : "bg-card text-slate-400 border border-border"
                  }`}
                  >
                    {idx + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <p className="text-foreground font-black text-base md:text-lg group-hover/item:text-amber-600 dark:group-hover/item:text-amber-400 transition-colors truncate uppercase tracking-tight">{emp.name}</p>
                      {idx === 0 && <Crown size={14} className="text-amber-500 shrink-0" fill="currentColor" />}
                    </div>

                    <div className="flex gap-2 mt-2">
                      {Array.isArray(emp.earnedBadges) &&
                      emp.earnedBadges.length > 0 ? (
                        emp.earnedBadges.slice(0, 4).map((badge, bIdx) => {
                          const BadgeIcon =
                            badgeIconMap[badge.iconName] || Star;
                          return (
                            <div
                              key={bIdx}
                              title={badge.name}
                              className="w-7 h-7 rounded-lg flex items-center justify-center border border-border bg-card shadow-sm hover:scale-110 transition-transform"
                            >
                              <BadgeIcon size={12} color={badge.color} />
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest italic opacity-50">Node Initializing...</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-left sm:text-right border-t sm:border-t-0 border-border/50 pt-4 sm:pt-0 w-full sm:w-auto">
                  <div className="text-amber-600 dark:text-amber-400 font-black text-2xl md:text-3xl leading-none tracking-tighter">{emp.totalPoints || 0}</div>
                  <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1">Reward Ledger</div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center py-20 text-slate-400 text-sm font-bold uppercase tracking-widest">Points initialization pending...</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen w-screen bg-background overflow-hidden font-sans transition-colors duration-500 text-left">
      {/* MOBILE OVERLAY */}
      {sidebarOpen && ( <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[150] lg:hidden" onClick={() => setSidebarOpen(false)} /> )}

      {/* SIDEBAR WRAPPER */}
      <div className={`fixed inset-y-0 left-0 z-[200] transform transition-transform duration-500 lg:relative lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <Sidebar roles={userRoles} activeTab={activeTab} onNavigate={handleNavigate} onLogout={onLogout} />
      </div>

      <div className="flex-1 flex flex-col relative overflow-y-auto custom-scrollbar transition-all duration-500">
        {/* EXECUTIVE HEADER */}
        <header className="sticky top-0 z-[100] bg-card/80 backdrop-blur-xl border-b border-border px-4 md:px-10 py-4 flex justify-between items-center min-h-[80px]">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-3 bg-background border border-border rounded-xl text-foreground hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
            >
              <Menu size={20} />
            </button>

            <div className="hidden sm:flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-xl border border-primary/20">
                <Layout size={18} className="text-primary" />
              </div>
              <div className="flex flex-col">
                <h2 className="text-foreground text-sm md:text-base font-black tracking-tight leading-none mb-1 uppercase">
                  {getPageTitle()}
                </h2>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Work Pilot Node</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-8 h-full">
            
            {/* UPDATED DUAL EFFICIENCY INDEX PILL */}
            <div className="hidden md:flex items-center gap-6 pr-8 border-r border-border">
               <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] leading-tight text-right">Not Done<br/>Index</span>
               <div className="bg-background border border-border rounded-full p-1.5 flex items-center gap-6 pr-6 shadow-inner">
                  
                  {/* Category 1: Checklist */}
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                        <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-100 dark:text-slate-800" />
                        <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray="100" strokeDashoffset={100 - userScore.chkNotDone} className={`${userScore.chkNotDone > 20 ? 'text-red-500' : 'text-sky-500'} transition-all duration-1000`} />
                        </svg>
                        <span className="absolute text-[8px] font-black text-foreground">{Math.round(userScore.chkNotDone)}%</span>
                    </div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">CHK</span>
                  </div>

                  {/* Category 2: Delegation */}
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                        <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-100 dark:text-slate-800" />
                        <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray="100" strokeDashoffset={100 - userScore.delNotDone} className={`${userScore.delNotDone > 20 ? 'text-red-500' : 'text-purple-500'} transition-all duration-1000`} />
                        </svg>
                        <span className="absolute text-[8px] font-black text-foreground">{Math.round(userScore.delNotDone)}%</span>
                    </div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">DEL</span>
                  </div>
                  
                  <div className="h-6 w-px bg-border" />
                  
                  {/* Points Ledger */}
                  <div className="flex items-center gap-2">
                    <Trophy size={14} className="text-amber-500" />
                    <div className="flex flex-col">
                       <span className="text-xs font-black text-foreground leading-none">{userScore.totalPoints || currentUserData?.totalPoints || 0}</span>
                       <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Points</span>
                    </div>
                  </div>
               </div>
            </div>

            <div className="flex items-center gap-4">
              <ThemeToggle />
              <div className="text-right hidden sm:flex flex-col justify-center relative pr-2">
                {latestBadge && (
                  <div className="absolute -top-4 -right-1 animate-bounce-slow">
                    <HeaderBadgeIcon size={16} color={latestBadge.color} style={{ filter: `drop-shadow(0 0 8px ${latestBadge.color}60)` }} />
                  </div>
                )}
                <div className="text-foreground text-xs md:text-sm font-black leading-none uppercase tracking-tight">
                  {user?.name || sessionUser?.name}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* MAIN ROUTE HUB */}
        <main className="p-4 md:px-8 md:pt-3 md:pb-10 w-full max-w-8xl mx-auto animate-in fade-in slide-in-from-bottom-3 duration-700">
          <ErrorBoundary resetKey={location.pathname}>
          {isViewerOnly() ? (
          <Routes>
            <Route path="global-view" element={<GlobalView tenantId={currentTenantId} />} />
            <Route path="*" element={<Navigate to="/dashboard/global-view" replace />} />
          </Routes>
          ) : (
          <Routes>
            <Route path="/" element={<UserDashboard tenantId={currentTenantId} userId={userId} isAdmin={isAdmin} />} />

            <Route path="review-meeting" element={<ReviewMeeting tenantId={currentTenantId} />} />
            <Route path="global-view" element={<GlobalView tenantId={currentTenantId} />} />
           {/* <Route path="employees" element={
                <div className="flex flex-col gap-10">
                  <div className="bg-card p-2 rounded-[2.5rem] border border-border shadow-2xl">
                    <AddEmployee tenantId={currentTenantId} selectedEmployee={selectedEmployee} onSuccess={() => { fetchEmployees(); setSelectedEmployee(null); }} />
                  </div>
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                      <RefreshCcw className="animate-spin text-primary" size={32} />
                    </div>
                  ) : (
                    <RegisteredEmployees employees={employees} onEdit={(emp) => { setSelectedEmployee(emp); window.scrollTo({ top: 0, behavior: "smooth" }); }} fetchEmployees={fetchEmployees} />
                  )}
                </div>
              }
            />*/}


            <Route path="employees" element={
  <div className="relative">
    {/* POPUP MODAL OVERLAY */}
    {isModalOpen && (
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6">
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" 
          onClick={handleCloseModal}
        />
        
        {/* Modal Content */}
        <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar bg-card rounded-[2.5rem] border border-border shadow-2xl animate-in zoom-in-95 duration-300">
           {/* Close Button */}
           <button 
              onClick={handleCloseModal}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors z-[101]"
           >
              <X size={24} />
           </button>

           <AddEmployee 
              tenantId={currentTenantId} 
              selectedEmployee={selectedEmployee} 
              onSuccess={() => { 
                  fetchEmployees(); 
                  handleCloseModal(); 
              }} 
           />
        </div>
      </div>
    )}

    {/* DATA TABLE */}
    <RegisteredEmployees 
      employees={employees} 
      onEdit={handleEditInitiated} 
      fetchEmployees={fetchEmployees}
      onAddNew={() => {
        setSelectedEmployee(null); // Clear previous edit data
        setIsModalOpen(true);
      }}
    />
  </div>
} /> 

            <Route path="raise-ticket" element={ <RaiseTicket userId={userId} tenantId={currentTenantId} /> } />
            <Route path="factory-settings" element={<SettingsPage tenantId={currentTenantId} />} />
            <Route path="mapping" element={<CoordinatorMapping tenantId={currentTenantId} />} />
            <Route path="create-task" element={ <CreateTask tenantId={currentTenantId} assignerId={userId} /> } />
            <Route path="manage-tasks" element={ <ManageTasks assignerId={userId} tenantId={currentTenantId} /> } />
            <Route path="checklist-setup" element={<CreateChecklist tenantId={currentTenantId} />} />
            <Route path="manage-checklist" element={<ManageChecklist tenantId={currentTenantId} />} />
            <Route path="checklist-monitor" element={<ChecklistMonitor tenantId={currentTenantId} />} />
            <Route path="my-tasks" element={<DoerChecklist doerId={userId} />} />
            <Route path="checklist" element={<DoerChecklist doerId={userId} />} />
            <Route path="tracking" element={<CoordinatorDashboard coordinatorId={userId} />} />
            <Route path="rewards-log" element={ <RewardsLog userId={userId} tenantId={currentTenantId} /> } />
            <Route path="settings" element={<SettingsPage tenantId={tenantId} />} />
            <Route path="/reports" element={<ReportsTab tenantId={tenantId} />} />
            <Route path="fms-dashboard" element={<FmsDashboard tenantId={tenantId} />} />
            <Route path="chat" element={<ChatPage currentUser={user} />} />
            <Route path="order-forms" element={<OrderFormsPage tenantId={tenantId} />} />
            <Route path="new-order" element={<NewOrderPage tenantId={tenantId} />} />
            <Route path="flow-management" element={<FlowManagement tenantId={tenantId} user={user} />} />
            <Route path="flow-tasks" element={<FlowMyTasks employeeId={userId} />} />
            <Route path="leave" element={<LeavePage tenantId={currentTenantId} />} />
            <Route path="attendance" element={<AttendancePage />} />
          </Routes>
          )}
          </ErrorBoundary>
        </main>

        {/* STICKY FOOTER: stays at the bottom of the screen while the page scrolls */}
        <footer className="sticky bottom-0 z-[90] mt-auto border-t border-border bg-card/90 backdrop-blur-xl py-1.5 px-4 text-center">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 tracking-wide">
            Powered by{' '}
            <a href="https://lrbc.ai" target="_blank" rel="noopener noreferrer" className="font-black text-primary hover:underline">LRBC</a>
          </span>
        </footer>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.2); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--color-primary); }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(-5%); animation-timing-function: cubic-bezier(0.8,0,1,1); }
          50% { transform: none; animation-timing-function: cubic-bezier(0,0,0.2,1); }
        }
        .animate-bounce-slow { animation: bounce-slow 3s infinite; }
      `}</style>
      {!isViewerOnly() && <FloatingChat currentUser={user} />}
      <DialogHost />
    </div>
  );
};

export default Dashboard;