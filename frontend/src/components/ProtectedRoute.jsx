import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROUTES, USER_STATUS } from '../constants';

/**
 * ProtectedRoute — wraps routes that require authentication.
 *
 * Props:
 *   uploadOnly     — if true, restricts access to pending upload step
 *   registeredOnly — if true, restricts access to fully registered users
 */
const ProtectedRoute = ({ children, uploadOnly = false, registeredOnly = false }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-color)' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Must have a valid JWT token
  if (!isAuthenticated || !user) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  // Must be OTP verified
  if (!user.isVerified) {
    return <Navigate to={ROUTES.VERIFY_OTP} replace />;
  }

  // Upload route guard — only pending users should be here.
  if (uploadOnly && user.status !== USER_STATUS.PENDING) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  // Registered route guard - only fully registered users can access (e.g. /voting)
  if (registeredOnly && user.status !== USER_STATUS.REGISTERED) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  return children;
};

export default ProtectedRoute;
