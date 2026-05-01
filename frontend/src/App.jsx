import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import ThemeToggle from './components/ThemeToggle';


// Pages
import Register from './pages/Register';
import UploadDocument from './pages/UploadDocument';
import Login from './pages/Login';
import VerifyOtp from './pages/VerifyOtp';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import Home from './pages/Home';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';

function AppContent() {
  const location = useLocation();


  return (
    <div className="flex flex-col min-h-screen transition-colors duration-300" style={{ backgroundColor: 'var(--bg-color)' }}>
      <div className="flex-1 relative">
        {/* Persistent Floating Controls (Theme/Logout) */}
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-white/10 dark:bg-black/10 backdrop-blur-lg p-2 rounded-2xl border border-white/20 dark:border-white/10 shadow-2xl">
          <ThemeToggle />
        </div>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/upload"
            element={
              <ProtectedRoute uploadOnly>
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
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            } 
          />

          {/* Catch-all route to handle invalid URLs */}
          <Route path="*" element={<Navigate to="/" replace />} />
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
