import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * AdminRoute — wraps routes that require both authentication and admin authorization.
 */
const AdminRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-color)' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // 1. Authentication Check
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // 2. Verification Check
  if (!user.isVerified) {
    return <Navigate to="/verify-otp" replace />;
  }

  // 3. Authorization Check
  if (user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default AdminRoute;
