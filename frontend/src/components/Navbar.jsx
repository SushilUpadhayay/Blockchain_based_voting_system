import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Activity, Sun, Moon } from 'lucide-react';
import LogoutButton from './LogoutButton';
import { ROUTES, getDashboardConfig } from '../constants';

const AUTH_PAGES = [ROUTES.LOGIN, ROUTES.REGISTER, ROUTES.UPLOAD, ROUTES.VERIFY_OTP];

const Navbar = () => {
  const { isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  const isAuthPage = AUTH_PAGES.includes(location.pathname);

  return (
    <nav className="border-b px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm transition-colors duration-300" 
         style={{ backgroundColor: 'var(--nav-bg)', borderColor: 'var(--border-color)' }}>
      <div className="flex items-center gap-6">
        <Link to={ROUTES.HOME} className="flex items-center gap-2">
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
          <LogoutButton variant="full" />
        ) : (
          !isAuthPage && (
            <>
              <Link to={ROUTES.LOGIN} className="text-sm font-medium hover:text-blue-600 transition-colors" style={{ color: 'var(--text-color)' }}>
                Login
              </Link>
              <Link 
                to={ROUTES.REGISTER} 
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
