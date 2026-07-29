import React, { useState, useEffect } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ShieldCheck, Lock, KeyRound, Mail, UserCheck } from 'lucide-react';
import API from '../api/api';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../constants';
import Navbar from '../components/Navbar';

const LOGIN_MODE = {
  VOTER: 'voter',
  ADMIN: 'admin',
};

const Login = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const [mode, setMode] = useState(LOGIN_MODE.VOTER);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Cooldown & Lockout states
  const [cooldown, setCooldown] = useState(0);
  const [lockout, setLockout] = useState(0);

  // Live countdown timers
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((prev) => (prev > 1 ? prev - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    if (lockout <= 0) return;
    const timer = setInterval(() => setLockout((prev) => (prev > 1 ? prev - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [lockout]);

  // If already authenticated and verified, redirect to role-specific dashboard
  if (isAuthenticated && user?.isVerified) {
    if (user.role === 'admin') {
      const firstAdminRole = user.adminRoles?.[0];
      const targetId = firstAdminRole?.electionId || 1;
      const targetPath = firstAdminRole?.role === 'verifier' ? `/elections/${targetId}/verifier` : `/elections/${targetId}/admin`;
      return <Navigate to={targetPath} replace />;
    }
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  const isBlocked = lockout > 0;
  const isOnCooldown = cooldown > 0;

  const handleVoterLogin = async (e) => {
    e.preventDefault();
    if (isBlocked) return toast.error('Account locked. Please try again later.');
    if (isOnCooldown) return toast.error(`Please wait ${cooldown}s before requesting a new OTP.`);

    setLoading(true);
    try {
      const response = await API.post('/auth/login', { email: email.trim().toLowerCase() });
      const { requireSignature, walletAddress, signMessage, cooldownSeconds } = response.data;

      if (cooldownSeconds && cooldownSeconds > 0) {
        setCooldown(cooldownSeconds);
      }

      let signature = null;
      let message = null;

      if (requireSignature) {
        toast.loading('Connecting MetaMask to verify wallet...', { id: 'login-wallet' });
        if (!window.ethereum) {
          toast.error('MetaMask is required to log into this account.', { id: 'login-wallet' });
          setLoading(false);
          return;
        }

        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        let currentWallet = accounts[0];

        if (currentWallet.toLowerCase() !== walletAddress.toLowerCase()) {
          try {
            toast.loading('Wallet mismatch. Opening account selector...', { id: 'login-wallet' });
            await window.ethereum.request({
              method: 'wallet_requestPermissions',
              params: [{ eth_accounts: {} }],
            });
            const accountsAfter = await window.ethereum.request({ method: 'eth_accounts' });
            currentWallet = accountsAfter[0];

            if (currentWallet.toLowerCase() !== walletAddress.toLowerCase()) {
              toast.error(
                `Wallet mismatch. Registered: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
                { id: 'login-wallet', duration: 6000 }
              );
              setLoading(false);
              return;
            }
          } catch {
            toast.error('Connected wallet does not match registered account.', { id: 'login-wallet' });
            setLoading(false);
            return;
          }
        }

        toast.loading('Please sign the challenge in MetaMask...', { id: 'login-wallet' });
        signature = await window.ethereum.request({
          method: 'personal_sign',
          params: [signMessage, currentWallet],
        });
        message = signMessage;
        toast.success('Wallet signature verified!', { id: 'login-wallet' });
      }

      toast.success('OTP sent to your email!', { id: 'login-wallet' });
      navigate(ROUTES.VERIFY_OTP, { state: { email: email.trim().toLowerCase(), signature, message } });
    } catch (error) {
      console.error('Voter login error:', error);
      const data = error.response?.data || {};
      if (data.remainingSeconds) {
        if (data.remainingSeconds > 120) setLockout(data.remainingSeconds);
        else setCooldown(data.remainingSeconds);
      }
      toast.error(data.message || 'Login failed. Please check your email.', { id: 'login-wallet' });
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return toast.error('Email and password are required.');

    setLoading(true);
    try {
      const response = await API.post('/auth/admin-login', {
        email: email.trim().toLowerCase(),
        password,
      });

      if (response.data.cooldownSeconds) {
        setCooldown(response.data.cooldownSeconds);
      }

      toast.success('Password verified! OTP sent to your email.');
      // Admin login reuses the existing verify-otp route and page seamlessly!
      navigate(ROUTES.VERIFY_OTP, { state: { email: email.trim().toLowerCase() } });
    } catch (error) {
      console.error('Admin login error:', error);
      toast.error(error.response?.data?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300" style={{ backgroundColor: 'var(--bg-color)' }}>
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full p-8 rounded-2xl shadow-xl border transition-colors duration-300" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
          
          {/* Mode Toggle Tabs */}
          <div className="flex rounded-xl p-1 mb-6 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
            <button
              onClick={() => setMode(LOGIN_MODE.VOTER)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                mode === LOGIN_MODE.VOTER ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'opacity-60'
              }`}
              style={{ color: mode === LOGIN_MODE.VOTER ? undefined : 'var(--text-color)' }}
            >
              <UserCheck className="w-4 h-4" /> Voter Login
            </button>
            <button
              onClick={() => setMode(LOGIN_MODE.ADMIN)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                mode === LOGIN_MODE.ADMIN ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'opacity-60'
              }`}
              style={{ color: mode === LOGIN_MODE.ADMIN ? undefined : 'var(--text-color)' }}
            >
              <ShieldCheck className="w-4 h-4" /> Admin / Verifier
            </button>
          </div>

          <h2 className="text-2xl font-bold mb-1 text-center" style={{ color: 'var(--text-color)' }}>
            {mode === LOGIN_MODE.VOTER ? 'Voter Sign In' : 'Admin & Verifier Sign In'}
          </h2>
          <p className="mb-6 text-center text-xs opacity-70" style={{ color: 'var(--text-color)' }}>
            {mode === LOGIN_MODE.VOTER
              ? 'Enter your registered email address to receive a 6-digit OTP code.'
              : 'Enter your administrator/verifier email and password.'}
          </p>

          {/* Voter Login Form */}
          {mode === LOGIN_MODE.VOTER && (
            <form onSubmit={handleVoterLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-color)' }}>
                  Email Address
                </label>
                <input
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl outline-none text-sm border"
                  style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
                  placeholder="voter@example.com" autoFocus
                />
              </div>

              {isBlocked && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl text-center font-medium">
                  🔒 Account locked. Try again in <strong>{formatTime(lockout)}</strong>.
                </div>
              )}

              {!isBlocked && isOnCooldown && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl text-center font-medium">
                  Please wait <strong>{cooldown}s</strong> before requesting a new OTP.
                </div>
              )}

              <button
                type="submit" disabled={loading || isBlocked || isOnCooldown || !email.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-md mt-4"
              >
                {loading ? 'Sending OTP...' : 'Send OTP & Proceed'}
              </button>
            </form>
          )}

          {/* Admin / Verifier Login Form */}
          {mode === LOGIN_MODE.ADMIN && (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-color)' }}>
                  Email Address
                </label>
                <input
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl outline-none text-sm border"
                  style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
                  placeholder="admin@organization.org" autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-color)' }}>
                  Password
                </label>
                <input
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl outline-none text-sm border"
                  style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
                  placeholder="Enter your password"
                />
              </div>

              <button
                type="submit" disabled={loading || !email.trim() || !password}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-md mt-4"
              >
                {loading ? 'Verifying Password...' : 'Verify Password & Send OTP'}
              </button>
            </form>
          )}

        </div>
      </main>
    </div>
  );
};

export default Login;
