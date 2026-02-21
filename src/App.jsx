import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SuperAdmin from './pages/SuperAdmin';
// NEW: Import ReviewMeeting to ensure the component is registered
import ReviewMeeting from './pages/ReviewMeeting'; 
// NEW: Import FmsDashboard to fix the blank page issue
import FmsDashboard from './pages/FmsDashboard'; 
// NEW: Import ReportsTab for factory-specific data logs
import ReportsTab from './pages/ReportsTab';
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
    const savedUser = localStorage.getItem('user');
    const savedTenantId = localStorage.getItem('tenantId');
    const token = localStorage.getItem('token'); 

    if (savedUser && savedUser !== "undefined") {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        if (parsedUser.isSuperAdmin) setIsSuperAuth(true);
      } catch (e) {
        console.error("Session restore error", e);
      }
    }
    
    if (savedTenantId) setTenantId(savedTenantId);
    setIsLoading(false);
  }, []);

  const handleLoginSuccess = (userData, tId) => {
    setUser(userData);
    setTenantId(tId);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('tenantId', tId);
  };

  const handleMasterLoginSuccess = (token, userData) => {
    setIsSuperAuth(true);
    setUser(userData);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.removeItem('tenantId'); 
  };

  const handleLogout = () => {
    setUser(null);
    setTenantId(null);
    setIsSuperAuth(false);
    localStorage.clear();
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

              <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
            </>
          )}
        </Routes>
      </div>
    </Router>
  );
}

export default App;