import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute — wraps routes that require authentication.
 *
 * Props:
 *   adminOnly   — if true, also requires user.role === 'admin'
 *   uploadOnly  — if true, also requires user.status === 'pending' (doc upload step)
 */
const ProtectedRoute = ({ children, adminOnly = false, uploadOnly = false }) => {
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
    return <Navigate to="/login" replace />;
  }

  // Admin-only routes
  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  // Upload route guard — only pending users who haven't uploaded yet should be here.
  // Registered / rejected users should not revisit /upload.
  if (uploadOnly && user.status !== 'pending') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
