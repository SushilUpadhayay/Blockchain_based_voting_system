import React, { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import API from '../api/api';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect to the appropriate dashboard
  if (isAuthenticated && user?.isVerified) {
    return <Navigate to={user.role === 'admin' ? "/admin" : "/dashboard"} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await API.post('/auth/login', { email });
      const { requireSignature, walletAddress, signMessage } = response.data;
      
      let signature = null;
      let message = null;
      
      if (requireSignature) {
        toast.loading("Connecting MetaMask to verify wallet...", { id: "login-wallet" });
        if (!window.ethereum) {
          toast.error("MetaMask is required to log into this account.", { id: "login-wallet" });
          setLoading(false);
          return;
        }
        
        // Connect wallet
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        let currentWallet = accounts[0];
        
        if (currentWallet.toLowerCase() !== walletAddress.toLowerCase()) {
          try {
            toast.loading("Wallet mismatch. Opening MetaMask account selector...", { id: "login-wallet" });
            
            // Force MetaMask to display the account selection modal
            await window.ethereum.request({
              method: 'wallet_requestPermissions',
              params: [{ eth_accounts: {} }]
            });
            
            const accountsAfter = await window.ethereum.request({ method: 'eth_accounts' });
            const newWallet = accountsAfter[0];
            
            if (newWallet.toLowerCase() !== walletAddress.toLowerCase()) {
              toast.error(`Connected wallet does not match registered wallet for this account.\nExpected: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}\nGot: ${newWallet.slice(0, 6)}...${newWallet.slice(-4)}`, { id: "login-wallet", duration: 8000 });
              setLoading(false);
              return;
            }
            currentWallet = newWallet;
          } catch (permErr) {
            toast.error(`Connected wallet does not match registered wallet.\nExpected: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}\nGot: ${currentWallet.slice(0, 6)}...${currentWallet.slice(-4)}`, { id: "login-wallet", duration: 8000 });
            setLoading(false);
            return;
          }
        }
        
        // Prompt user to sign the dynamic server challenge
        toast.loading("Please sign the verification challenge in MetaMask...", { id: "login-wallet" });
        signature = await window.ethereum.request({
          method: 'personal_sign',
          params: [signMessage, currentWallet]
        });
        message = signMessage;
        toast.success("Wallet signature acquired successfully!", { id: "login-wallet" });
      }

      toast.success('OTP sent to your email!', { id: "login-wallet" });
      navigate('/verify-otp', { 
        state: { 
          email, 
          signature, 
          message 
        } 
      });
    } catch (error) {
      console.error('Login Error:', error);
      toast.error(error.response?.data?.message || 'Login failed. Please check your email and try again.', { id: "login-wallet" });
    } finally {
      setLoading(false);
    }
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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors flex justify-center items-center mt-6"
          >
            {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Send OTP'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm opacity-70" style={{ color: 'var(--text-color)' }}>
          Don't have an account?{' '}
          <Link to="/register" className="text-blue-600 font-medium hover:underline">Register</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
