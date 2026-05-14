import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SuperAdmin from './pages/SuperAdmin';
import ReviewMeeting from './pages/ReviewMeeting'; 
import FmsDashboard from './pages/FmsDashboard'; 
import ReportsTab from './pages/ReportsTab';
import SubscriptionPaused from './pages/SubscriptionPaused';
import { getSubdomain } from './utils/subdomain';

/**
 * CORE APPLICATION ROUTER v1.9
 * Purpose: Global state management and top-level route distribution.
 * Updated: Integrated ReportsTab and preserved all existing logic.
 */
function App() {
  const [user, setUser] = useState(null);
  const [tenantId, setTenantId] = useState(null);
  const [isSuperAuth, setIsSuperAuth] = useState(false);
  const [isLoading, setIsLoading] = useState(true); 
  
  const subdomain = getSubdomain();

  useEffect(() => {
    const savedUser     = localStorage.getItem('user');
    const savedTenantId = localStorage.getItem('tenantId');
    const token         = localStorage.getItem('token');

    const init = async () => {
      // Don't run subscription check on the suspended page itself (prevents redirect loop)
      if (window.location.pathname === '/suspended') {
        setIsLoading(false);
        return;
      }

      // Restore SuperAdmin session — check localStorage flag first (most reliable)
      const isSuperAdminFlag = localStorage.getItem('isSuperAdmin') === 'true';

      if (savedUser && savedUser !== 'undefined') {
        try {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
          if (parsedUser.isSuperAdmin || isSuperAdminFlag) {
            setIsSuperAuth(true);
            setIsLoading(false);
            return;
          }
        } catch (e) {
          console.error('Session restore error', e);
        }
      }

      // Check subscription status on every app load for non-superadmin users
      if (subdomain && token) {
        try {
          const res = await fetch(
            `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/tasks/verify/${subdomain}`
          );
          const data = await res.json();

          if (data.subscription?.status === 'paused') {
            sessionStorage.setItem('suspendedReason',      data.subscription.reason   || '');
            sessionStorage.setItem('suspendedPausedAt',    data.subscription.pausedAt || '');
            sessionStorage.setItem('suspendedCompanyName', data.companyName            || '');
            setIsLoading(false);
            window.location.replace('/suspended');
            return;
          }
        } catch (e) {
          // Network error — let normal flow continue
        }
      }

      if (savedTenantId) setTenantId(savedTenantId);
      setIsLoading(false);
    };

    init();
  }, []);

  const handleLoginSuccess = (userData, tId) => {
    setUser(userData);
    setTenantId(tId);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('tenantId', tId);
  };

  const handleMasterLoginSuccess = (token, userData) => {
    // Ensure isSuperAdmin flag is stored in the user object so it survives page refresh
    const superUser = { ...userData, isSuperAdmin: true };
    setIsSuperAuth(true);
    setUser(superUser);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(superUser));
    localStorage.setItem('isSuperAdmin', 'true');
    localStorage.removeItem('tenantId');
  };

  const handleLogout = () => {
    setUser(null);
    setTenantId(null);
    setIsSuperAuth(false);
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = subdomain ? "/login" : "/";
  };

  if (isLoading) {
    return <div className="h-screen bg-background animate-pulse"></div>;
  }

  return (
    <Router>
      <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 transition-colors duration-500">
        <Routes>
          {(!subdomain || subdomain === "") ? (
            <Route path="/*" element={
              <SuperAdmin 
                isAuthenticated={isSuperAuth} 
                onLogin={handleMasterLoginSuccess} 
                onLogout={handleLogout} 
              />
            } />
          ) : (
            <>
              <Route 
                path="/login" 
                element={user ? <Navigate to="/dashboard" /> : <Login onLoginSuccess={handleLoginSuccess} />} 
              />

              {/**
               * DASHBOARD PARENT ROUTE
               * This route catches all /dashboard/... paths and passes them 
               * to the Dashboard layout component.
               */}
              <Route 
                path="/dashboard/*" 
                element={
                  user ? (
                    <Dashboard user={user} tenantId={tenantId} onLogout={handleLogout} />
                  ) : (
                    <Navigate to="/login" />
                  )
                } 
              />

              <Route path="/suspended" element={
                <SubscriptionPaused
                  reason={sessionStorage.getItem('suspendedReason') || ''}
                  pausedAt={sessionStorage.getItem('suspendedPausedAt') || null}
                  companyName={sessionStorage.getItem('suspendedCompanyName') || ''}
                />
              } />

              <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
            </>
          )}
        </Routes>
      </div>
    </Router>
  );
}

export default App;