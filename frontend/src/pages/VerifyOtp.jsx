import React, { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import API from '../api/api';
import { useAuth } from '../context/AuthContext';

const VerifyOtp = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user, isAuthenticated } = useAuth();

  // If user is already logged in and verified, prevent access to this page
  if (isAuthenticated && user?.isVerified) {
    return <Navigate to="/dashboard" replace />;
  }

  // Retrieve email passed from Login page
  const email = location.state?.email || '';
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Missing email. Please login again.');
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      const response = await API.post('/auth/verify-otp', { email, otp });
      const { token, ...userData } = response.data;

      if (!token) {
        toast.error('Verification failed, no token received.');
        return;
      }

      login(token, userData);
      toast.success('Successfully logged in!');

      // Route based on role and status
      if (userData.role === 'admin') {
        navigate('/admin');
      } else if (userData.status === 'blocked') {
        // Blocked users should not be logged in — clear and redirect
        toast.error('Your account has been permanently blocked.');
        navigate('/login');
      } else if (userData.status === 'pending' && userData.documentPath === 'pending_upload') {
        // Registered but hasn't uploaded their document yet
        navigate('/upload');
      } else {
        // status: pending (doc uploaded, waiting approval), registered, or rejected
        // All go to the dashboard which handles their specific status UI
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('OTP Error:', error);
      toast.error(error.response?.data?.message || 'Invalid OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 transition-colors duration-300" style={{ backgroundColor: 'var(--bg-color)' }}>
      <div className="max-w-md w-full p-8 rounded-xl shadow-md border transition-colors duration-300" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
        <h2 className="text-2xl font-bold mb-6 text-center" style={{ color: 'var(--text-color)' }}>Verify OTP</h2>
        <p className="mb-6 text-center text-sm opacity-70" style={{ color: 'var(--text-color)' }}>
          Please enter the One-Time Password sent to <strong>{email || 'your email'}</strong>
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-color)' }}>Enter OTP</label>
            <input
              type="text"
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              className="w-full text-center tracking-[0.5em] text-xl font-mono px-4 py-3 rounded-lg outline-none transition-colors border"
              style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
              placeholder="••••••"
              maxLength={6}
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors flex justify-center items-center mt-6"
          >
            {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Verify & Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default VerifyOtp;
