import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [token, setTokenState] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!token;

  // ── Token helpers ─────────────────────────────────────────────────────────
  const setToken = (newToken) => {
    setTokenState(newToken);
    if (newToken) {
      localStorage.setItem('token', newToken);
    } else {
      localStorage.removeItem('token');
    }
  };

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = (newToken, userData) => {
    setToken(newToken);
    if (userData) {
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    }
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  // ── Rehydrate user from localStorage on page reload ───────────────────────
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('[AuthContext] Failed to parse stored user:', e);
        // Corrupted data — clear it
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, login, logout, setToken, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
