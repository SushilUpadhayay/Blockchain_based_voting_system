import React, { createContext, useContext, useState, useEffect } from 'react';
import API from '../api/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [token, setTokenState] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!token && !!user;

  // ── Token helpers
  const setToken = (newToken) => {
    setTokenState(newToken);
    if (newToken) {
      localStorage.setItem('token', newToken);
    } else {
      localStorage.removeItem('token');
    }
  };

  // ── Login 
  const login = (newToken, userData) => {
    setToken(newToken);
    if (userData) {
      const verifiedUser = { ...userData, isVerified: true };
      setUser(verifiedUser);
      localStorage.setItem('user', JSON.stringify(verifiedUser));
    }
  };

  // ── Logout
  const logout = (showToast = true) => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    if (showToast) {
      toast.success('Logged out successfully', {
        icon: '👋',
        duration: 3000,
      });
    }
  };

  // ── Validate stored token and load user profile on startup
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          // Verify JWT with the backend before considering the user authenticated
          const response = await API.get('/user/profile');
          const userData = response.data;
          
          // Rehydrate validated user state
          const verifiedUser = { ...userData, isVerified: true };
          setUser(verifiedUser);
          localStorage.setItem('user', JSON.stringify(verifiedUser));
        } catch (error) {
          console.error('[AuthContext] Session validation failed on startup:', error.message);
          // Token is expired, invalid, user is blocked/rejected, or session fails
          // Pass false so no toast is shown — this is a silent startup validation
          logout(false);
        }
      } else {
        // No session token present
        setUser(null);
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, login, logout, setToken, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
