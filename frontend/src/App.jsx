import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';

// Pages
import Register from './pages/Register';
import UploadDocument from './pages/UploadDocument';
import Login from './pages/Login';
import VerifyOtp from './pages/VerifyOtp';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';

function AppContent() {
  const location = useLocation();
  const isDashboard = location.pathname === '/dashboard' || location.pathname === '/admin';

  return (
    <div className="flex flex-col min-h-screen transition-colors duration-300" style={{ backgroundColor: 'var(--bg-color)' }}>
      {!isDashboard && <Navbar />}
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/register" element={<Register />} />
          <Route 
            path="/upload" 
            element={
              <ProtectedRoute>
                <UploadDocument />
              </ProtectedRoute>
            } 
          />
          <Route path="/login" element={<Login />} />
          <Route path="/verify-otp" element={<VerifyOtp />} />
          
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute adminOnly={true}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Catch-all route to handle invalid URLs */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
