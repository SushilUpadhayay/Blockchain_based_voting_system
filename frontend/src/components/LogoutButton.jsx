import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * LogoutButton — reusable logout control.
 *
 * Props:
 *   variant  — 'icon'   : icon-only compact button (default for Navbar)
 *              'full'   : icon + "Logout" label (for AdminDashboard header)
 *              'danger' : red-styled full button (prominent placement)
 */
const LogoutButton = ({ variant = 'icon' }) => {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  if (!isAuthenticated) return null;

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    // Small delay so loading state is visible before navigation
    await new Promise((res) => setTimeout(res, 150));
    logout();           // clears state, localStorage, fires toast
    navigate('/login', { replace: true });
  };

  if (variant === 'danger') {
    return (
      <button
        id="admin-logout-btn"
        onClick={handleLogout}
        disabled={loggingOut}
        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all shadow-md shadow-red-200 active:scale-95"
        title="Logout from Admin Panel"
      >
        <LogOut className={`w-4 h-4 ${loggingOut ? 'animate-spin' : ''}`} />
        {loggingOut ? 'Logging out…' : 'Logout'}
      </button>
    );
  }

  if (variant === 'full') {
    return (
      <button
        id="logout-btn-full"
        onClick={handleLogout}
        disabled={loggingOut}
        className="flex items-center gap-2 text-sm font-medium hover:text-red-600 disabled:opacity-60 transition-colors"
        style={{ color: 'var(--text-color)' }}
        title="Logout"
      >
        <LogOut className={`w-4 h-4 ${loggingOut ? 'animate-spin' : ''}`} />
        {loggingOut ? 'Logging out…' : 'Logout'}
      </button>
    );
  }

  // default: icon-only
  return (
    <button
      id="logout-btn-icon"
      onClick={handleLogout}
      disabled={loggingOut}
      className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-60 transition-colors"
      title="Logout"
    >
      <LogOut className={`w-5 h-5 ${loggingOut ? 'animate-spin' : ''}`} />
    </button>
  );
};

export default LogoutButton;
