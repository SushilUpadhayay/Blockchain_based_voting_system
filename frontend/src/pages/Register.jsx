import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import API from '../api/api';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    dob: '',
    address: '',
    idNumber: '',
    walletAddress: ''
  });
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleConnectWallet = async () => {
    try {
      if (!window.ethereum) {
        toast.error("Please install MetaMask!");
        return null;
      }
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const address = accounts[0];
      setFormData(prev => ({ ...prev, walletAddress: address }));
      toast.success("Wallet connected!");
      return address;
    } catch (error) {
      console.error("Wallet connection failed:", error);
      toast.error("Failed to connect wallet.");
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    let address = formData.walletAddress;
    if (!address) {
      address = await handleConnectWallet();
      if (!address) {
        setLoading(false);
        return; // Stop if wallet connection fails
      }
    }

    try {
      await API.post('/auth/register-init', {
        name: formData.name,
        email: formData.email,
        dob: formData.dob,
        address: formData.address,
        idNumber: formData.idNumber,
        walletAddress: address
      });
      toast.success("OTP sent to your email!");
      setStep(2);
    } catch (error) {
      console.error("Register Error:", error.response?.data || error.message);
      toast.error(error.response?.data?.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      return toast.error('Please enter a valid 6-digit OTP.');
    }
    
    setLoading(true);
    try {
      const response = await API.post('/auth/verify-register-otp', {
        email: formData.email,
        otp
      });
      const { token, ...userData } = response.data;

      if (token) {
        login(token, userData);
        toast.success("Registration successful! Please upload your document.");
        navigate('/upload');
      } else {
        throw new Error("No token returned from backend");
      }
    } catch (error) {
      console.error("OTP Verification Error:", error.response?.data || error.message);
      toast.error(error.response?.data?.message || "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    try {
      await API.post('/auth/register-init', {
        name: formData.name,
        email: formData.email,
        dob: formData.dob,
        address: formData.address,
        idNumber: formData.idNumber,
        walletAddress: formData.walletAddress
      });
      toast.success("A new OTP has been sent to your email.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to resend OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 transition-colors duration-300" style={{ backgroundColor: 'var(--bg-color)' }}>
      <div className="max-w-md w-full p-8 rounded-xl shadow-md border transition-colors duration-300" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
        <h2 className="text-2xl font-bold mb-6 text-center" style={{ color: 'var(--text-color)' }}>
          {step === 1 ? 'Register to VoteChain' : 'Verify Your Email'}
        </h2>
        
        {step === 1 ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-color)' }}>Full Name</label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg outline-none transition-colors border"
                style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
                placeholder="Sushil Upadhayaya"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-color)' }}>Email</label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg outline-none transition-colors border"
                style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
                placeholder="test@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-color)' }}>Date of Birth</label>
              <input
                type="date"
                name="dob"
                required
                value={formData.dob}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg outline-none transition-colors border"
                style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-color)' }}>Address</label>
              <input
                type="text"
                name="address"
                required
                value={formData.address}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg outline-none transition-colors border"
                style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
                placeholder="Kathmandu, Nepal"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-color)' }}>ID Number</label>
              <input
                type="text"
                name="idNumber"
                required
                value={formData.idNumber}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg outline-none transition-colors border"
                style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
                placeholder="Enter ID Number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-color)' }}>Wallet Address</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={formData.walletAddress || 'Not connected'}
                  className="flex-1 px-4 py-2 rounded-lg outline-none border"
                  style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)', opacity: 0.7 }}
                />
                {!formData.walletAddress && (
                  <button
                    type="button"
                    onClick={handleConnectWallet}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors whitespace-nowrap"
                  >
                    Connect
                  </button>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors flex justify-center items-center mt-6"
            >
              {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <p className="text-center text-sm opacity-80 mb-4" style={{ color: 'var(--text-color)' }}>
              We've sent a 6-digit code to <strong>{formData.email}</strong>.
            </p>
            <div>
              <input
                type="text"
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                maxLength={6}
                className="w-full text-center text-3xl font-mono tracking-[0.4em] py-4 rounded-xl border-2 outline-none transition-all"
                style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-3">
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Verifying...
                  </span>
                ) : 'Verify & Register'}
              </button>
              
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={loading}
                className="text-sm font-medium hover:underline opacity-70 hover:opacity-100 disabled:opacity-30"
                style={{ color: 'var(--text-color)' }}
              >
                Resend Code
              </button>
            </div>
          </form>
        )}
        
        {step === 1 && (
          <p className="mt-6 text-center text-sm opacity-70" style={{ color: 'var(--text-color)' }}>
            Already have an account? <Link to="/login" className="text-blue-600 font-medium hover:underline">Log in</Link>
          </p>
        )}
      </div>
    </div>
  );
};

export default Register;
