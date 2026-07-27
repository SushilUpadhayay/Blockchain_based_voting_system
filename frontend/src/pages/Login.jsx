import React, { useState, useEffect } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import API from '../api/api';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../constants';

const Login = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  // cooldown: seconds remaining before next OTP can be requested (60s cooldown after 3rd request)
  const [cooldown, setCooldown] = useState(0);
  // lockout: seconds remaining for a 30-minute lockout (after 5 requests)
  const [lockout, setLockout] = useState(0);

  // Live countdown for cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Live countdown for lockout timer
  useEffect(() => {
    if (lockout <= 0) return;
    const timer = setInterval(() => {
      setLockout((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [lockout]);

  // If already logged in, redirect to the appropriate dashboard
  if (isAuthenticated && user?.isVerified) {
    return <Navigate to={user.role === 'admin' ? ROUTES.ADMIN : ROUTES.DASHBOARD} replace />;
  }

  const isBlocked = lockout > 0;
  const isOnCooldown = cooldown > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Block action client-side if still locked out or on cooldown
    if (isBlocked) {
      const mins = Math.ceil(lockout / 60);
      toast.error(`Account locked. Please try again in ${mins} minute${mins !== 1 ? 's' : ''}.`);
      return;
    }
    if (isOnCooldown) {
      toast.error(`Please wait ${cooldown}s before requesting a new OTP.`);
      return;
    }

    setLoading(true);
    try {
      // Step 1: Check rate-limit FIRST by calling the backend
      const response = await API.post('/auth/login', { email });
      const { requireSignature, walletAddress, signMessage, cooldownSeconds } = response.data;

      // Backend approved the request — update cooldown if it starts now
      if (cooldownSeconds && cooldownSeconds > 0) {
        setCooldown(cooldownSeconds);
      }

      // Step 2: ONLY open MetaMask AFTER backend approved the OTP request
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
            toast.loading('Wallet mismatch. Opening MetaMask account selector...', { id: 'login-wallet' });
            await window.ethereum.request({
              method: 'wallet_requestPermissions',
              params: [{ eth_accounts: {} }]
            });
            const accountsAfter = await window.ethereum.request({ method: 'eth_accounts' });
            const newWallet = accountsAfter[0];
            if (newWallet.toLowerCase() !== walletAddress.toLowerCase()) {
              toast.error(
                `Connected wallet does not match registered wallet.\nExpected: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}\nGot: ${newWallet.slice(0, 6)}...${newWallet.slice(-4)}`,
                { id: 'login-wallet', duration: 8000 }
              );
              setLoading(false);
              return;
            }
            currentWallet = newWallet;
          } catch {
            toast.error(
              `Connected wallet does not match registered wallet.\nExpected: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}\nGot: ${currentWallet.slice(0, 6)}...${currentWallet.slice(-4)}`,
              { id: 'login-wallet', duration: 8000 }
            );
            setLoading(false);
            return;
          }
        }

        toast.loading('Please sign the verification challenge in MetaMask...', { id: 'login-wallet' });
        signature = await window.ethereum.request({
          method: 'personal_sign',
          params: [signMessage, currentWallet]
        });
        message = signMessage;
        toast.success('Wallet signature acquired successfully!', { id: 'login-wallet' });
      }

      toast.success('OTP sent to your email!', { id: 'login-wallet' });
      navigate(ROUTES.VERIFY_OTP, { state: { email, signature, message } });

    } catch (error) {
      console.error('Login Error:', error);
      const data = error.response?.data || {};
      const remaining = data.remainingSeconds;

      // Detect lockout (30 min) vs cooldown (60s) from backend
      if (remaining && typeof remaining === 'number') {
        if (remaining > 120) {
          // > 2 minutes = lockout
          setLockout(remaining);
          toast.error(data.message || 'Account locked out. Too many OTP requests.');
        } else {
          // ≤ 120 seconds = short cooldown
          setCooldown(remaining);
          toast.error(data.message || `Please wait ${remaining}s before requesting a new OTP.`);
        }
      } else {
        toast.error(data.message || 'Login failed. Please check your email and try again.', { id: 'login-wallet' });
      }
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
    <div className="min-h-screen flex items-center justify-center p-6 transition-colors duration-300" style={{ backgroundColor: 'var(--bg-color)' }}>
      <div className="max-w-md w-full p-8 rounded-xl shadow-md border transition-colors duration-300" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
        <h2 className="text-2xl font-bold mb-6 text-center" style={{ color: 'var(--text-color)' }}>Log in</h2>
        <p className="mb-6 text-center text-sm opacity-70" style={{ color: 'var(--text-color)' }}>
          Enter your registered email to receive a secure one-time code.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-color)' }}>Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 rounded-lg outline-none transition-colors border"
              style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
              placeholder="john@example.com"
              autoFocus
            />
          </div>

          {isBlocked && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg text-center font-medium">
              🔒 Account locked. Try again in <strong>{formatTime(lockout)}</strong>.
            </div>
          )}

          {!isBlocked && isOnCooldown && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg text-center font-medium">
              Please wait <strong>{cooldown}s</strong> before requesting a new OTP.
            </div>
          )}

          <button
            type="submit"
            disabled={loading || isBlocked || isOnCooldown}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors flex justify-center items-center mt-6"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : isBlocked ? (
              `Locked — ${formatTime(lockout)}`
            ) : isOnCooldown ? (
              `Please wait ${cooldown}s`
            ) : (
              'Send OTP'
            )}
          </button>
        </form>
        <p className="mt-6 text-center text-sm opacity-70" style={{ color: 'var(--text-color)' }}>
          Don't have an account?{' '}
          <Link to={ROUTES.REGISTER} className="text-blue-600 font-medium hover:underline">Register</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
