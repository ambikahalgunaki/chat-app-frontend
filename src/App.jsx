import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    try { return saved ? JSON.parse(saved) : null; } 
    catch (e) { return null; }
  });

  const [token, setToken] = useState(() => {
    const savedToken = localStorage.getItem('token');
    if (!savedToken || savedToken === 'null' || savedToken === 'undefined') return null;
    return savedToken;
  });

  // 1. THEME STATE (Saves to localStorage so it remembers)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('chatAppTheme') || 'light';
  });

  // 2. EFFECT TO APPLY THEME TO HTML DOCUMENT
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('chatAppTheme', theme);
  }, [theme]);

  useEffect(() => {
    if (token && user) {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }, [token, user]);

  useEffect(() => {
    if (token && !user) setToken(null);
  }, [token, user]);

  const handleLogin = (tokenData, userData) => {
    setToken(tokenData);
    setUser(userData);
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
  };

  const handleUpdateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  // 3. TOGGLE FUNCTION
  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="app">
        <Routes>
          <Route path="/login" element={token ? <Navigate to="/" /> : <Login onLogin={handleLogin} />} />
          <Route path="/register" element={token ? <Navigate to="/" /> : <Register />} />
          <Route 
            path="/" 
            element={
              token && user ? (
                <Dashboard 
                  user={user} 
                  onLogout={handleLogout} 
                  onUpdateUser={handleUpdateUser}
                  theme={theme}            // 4. PASS THEME HERE!
                  toggleTheme={toggleTheme} // 5. PASS TOGGLE HERE!
                />
              ) : (
                <Navigate to="/login" />
              )
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;