import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SuperAdmin from './pages/SuperAdmin';
import { getSubdomain } from './utils/subdomain';

/**
 * WORK PILOT: CORE ARCHITECTURE v1.3
 * Purpose: Global Route Orchestration, Multi-Tenant Logic, and Adaptive Theme Sync
 */
function App() {
  const [user, setUser] = useState(null);
  const [tenantId, setTenantId] = useState(null);
  const [isSuperAuth, setIsSuperAuth] = useState(false);
  const [isLoading, setIsLoading] = useState(true); 
  
  // Theme state: defaults to dark, but checks localStorage for user preference
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  
  const subdomain = getSubdomain();

  // 1. THEME ENGINE: Forcefully applies the dark class to the HTML root
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // 2. SESSION RESTORATION PROTOCOL
  useEffect(() => {
    const initializeSession = () => {
      try {
        const savedUser = localStorage.getItem('user');
        const savedTenantId = localStorage.getItem('tenantId');

        if (savedUser && savedUser !== "undefined") {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
          
          if (parsedUser.isSuperAdmin) {
            setIsSuperAuth(true);
          }
        }
        
        if (savedTenantId) {
          setTenantId(savedTenantId);
        }
      } catch (error) {
        console.error("Session Hydration Error:", error);
        localStorage.clear();
      } finally {
        setIsLoading(false);
      }
    };

    initializeSession();
  }, []);

  // 3. FACTORY LOGIN SUCCESS HANDLER
  const handleLoginSuccess = (userData, tId) => {
    setUser(userData);
    setTenantId(tId);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('tenantId', tId);
  };

  // 4. MASTER ROOT LOGIN SUCCESS HANDLER
  const handleMasterLoginSuccess = (token, userData) => {
    setIsSuperAuth(true);
    setUser(userData);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.removeItem('tenantId'); 
  };

  // 5. SECURITY DISCONNECT PROTOCOL
  const handleLogout = () => {
    setUser(null);
    setTenantId(null);
    setIsSuperAuth(false);
    localStorage.clear();
    window.location.href = subdomain ? "/login" : "/";
  };

  // EXECUTIVE LOADING SHIELD (Updated to use theme variables)
  if (isLoading) {
    return (
      <div className="h-screen w-full bg-background flex items-center justify-center">
        <div className="relative flex flex-col items-center gap-4">
           <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
           <p className="text-slate-500 font-black text-[10px] tracking-[0.5em] uppercase">Booting Core Logic...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      {/* CRITICAL FIX: 
          Removed 'bg-[#020617]' which was forcing Dark Mode colors 
          even when the light class was applied. Now uses 'bg-background'.
      */}
      <div className="min-h-screen transition-colors duration-500 ease-in-out bg-background text-foreground">
        
        <Routes>
          {/* ENVIRONMENT A: ROOT DOMAIN (Master Console) */}
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
              {/* ENVIRONMENT B: TENANT DOMAIN (Factory Instance) */}
              <Route 
                path="/login" 
                element={
                  user ? <Navigate to="/dashboard" /> : <Login onLoginSuccess={handleLoginSuccess} />
                } 
              />

              <Route 
                path="/dashboard/*" 
                element={
                  user ? (
                    <Dashboard 
                      user={user} 
                      tenantId={tenantId} 
                      onLogout={handleLogout} 
                    />
                  ) : (
                    <Navigate to="/login" />
                  )
                } 
              />

              {/* AUTOMATIC REDIRECT LOGIC */}
              <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
            </>
          )}
        </Routes>
      </div>
    </Router>
  );
}

export default App;