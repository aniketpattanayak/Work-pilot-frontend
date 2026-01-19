import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SuperAdmin from './pages/SuperAdmin';
import { getSubdomain } from './utils/subdomain';

function App() {
  const [user, setUser] = useState(null);
  const [tenantId, setTenantId] = useState(null);
  const [isSuperAuth, setIsSuperAuth] = useState(false);
  const [isLoading, setIsLoading] = useState(true); 
  
  const subdomain = getSubdomain();

  // 1. RESTORE SESSION ON REFRESH
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const savedTenantId = localStorage.getItem('tenantId');
    const token = localStorage.getItem('token'); 

    if (savedUser && savedUser !== "undefined") {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        if (parsedUser.isSuperAdmin) {
          setIsSuperAuth(true);
        }
      } catch (e) {
        console.error("Session restore error", e);
      }
    }
    
    if (savedTenantId) {
      setTenantId(savedTenantId);
    }
    
    setIsLoading(false);
  }, []);

  // 2. HANDLE FACTORY LOGIN SUCCESS
  const handleLoginSuccess = (userData, tId) => {
    setUser(userData);
    setTenantId(tId);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('tenantId', tId);
  };

  // 3. HANDLE MASTER LOGIN SUCCESS
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
    return <div style={{ background: '#0f172a', height: '100vh' }}></div>;
  }

  return (
    <Router>
      <div style={{ background: '#0f172a', minHeight: '100vh' }}>
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