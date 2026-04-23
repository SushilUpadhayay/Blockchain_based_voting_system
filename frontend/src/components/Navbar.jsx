import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Activity, LogOut, Sun, Moon } from 'lucide-react';

const Navbar = () => {
  const { isAuthenticated, logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAuthPage = ['/login', '/register', '/upload', '/verify-otp'].includes(location.pathname);

  return (
    <nav className="border-b px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm transition-colors duration-300" 
         style={{ backgroundColor: 'var(--nav-bg)', borderColor: 'var(--border-color)' }}>
      <div className="flex items-center gap-2">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Activity className="text-white w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-color)' }}>VoteChain</span>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors mr-2"
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          style={{ color: 'var(--text-color)' }}
        >
          {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </button>

        {isAuthenticated ? (
          <>
            {!isAuthPage && user?.role === "admin" && (
              <button 
                onClick={() => navigate("/admin")}
                className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 hover:bg-blue-100 transition-all"
              >
                ADMIN PANEL
              </button>
            )}
            {!isAuthPage && user?.role !== "admin" && (
              <Link to="/dashboard" className="text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 hover:bg-emerald-100 transition-all">
                VOTING DASHBOARD
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm font-medium hover:text-red-600 transition-colors ml-2"
              style={{ color: 'var(--text-color)' }}
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </>
        ) : (
          !isAuthPage && (
            <>
              <Link to="/login" className="text-sm font-medium hover:text-blue-600 transition-colors" style={{ color: 'var(--text-color)' }}>
                Login
              </Link>
              <Link 
                to="/register" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Register
              </Link>
            </>
          )
        )}
      </div>
    </nav>
  );
};

export default Navbar;
