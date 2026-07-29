import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import API from '../api/api';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../constants';

const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('token');
  const [electionInfo, setElectionInfo] = useState(null);
  const [tokenValidating, setTokenValidating] = useState(!!inviteToken);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    dob: '',
    gender: '',
    address: '',
    citizenshipNumber: '',
    employeeId: '',
    walletAddress: ''
  });
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState('');
  // cooldown: 60s timer that starts after the 3rd OTP request
  const [cooldown, setCooldown] = useState(0);
  // lockout: 30-minute lockout timer after 5 OTP requests
  const [lockout, setLockout] = useState(0);

  // Resolve invite token to election info
  useEffect(() => {
    if (!inviteToken) return;
    API.get(`/elections/by-token/${inviteToken}`)
      .then((res) => {
        setElectionInfo(res.data);
        if (res.data.status !== 'registration_open') {
          toast.error(`Registration for "${res.data.title}" is not currently open.`);
        }
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || 'Invalid or expired invitation link.');
      })
      .finally(() => setTokenValidating(false));
  }, [inviteToken]);



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

  const isBlocked = lockout > 0;
  const isOnCooldown = cooldown > 0;

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

  const getWalletSignature = async (address) => {
    try {
      toast.loading("Requesting cryptographic challenge from server...", { id: "signing" });
      const response = await API.get(`/auth/nonce?walletAddress=${address}`);
      const { message } = response.data;
      
      toast.loading("Please sign the verification message in MetaMask...", { id: "signing" });
      const signature = await window.ethereum.request({
        method: "personal_sign",
        params: [message, address]
      });
      
      toast.success("Identity verified cryptographically!", { id: "signing" });
      return { signature, message };
    } catch (error) {
      console.error("Signature collection failed:", error);
      toast.error(error.response?.data?.message || "Cryptographic verification cancelled.", { id: "signing" });
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!inviteToken) {
      toast.error('Please use the registration link from your election invitation email.');
      return;
    }
    if (
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.dob ||
      !formData.gender ||
      !formData.address.trim() ||
      !formData.citizenshipNumber.trim() ||
      !formData.employeeId.trim()
    ) {
      toast.error('Full name, email, date of birth, gender, address, citizenship number, and employee ID are required.');
      return;
    }

    // Block client-side if locked or on cooldown
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

    let address = formData.walletAddress;
    if (!address) {
      address = await handleConnectWallet();
      if (!address) {
        setLoading(false);
        return;
      }
    }

    // Collect cryptographic signature of the nonce challenge
    const sigData = await getWalletSignature(address);
    if (!sigData) {
      setLoading(false);
      return;
    }
    const { signature, message } = sigData;

    try {
      const response = await API.post('/auth/register-init', {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        dob: formData.dob,
        gender: formData.gender,
        address: formData.address.trim(),
        citizenshipNumber: formData.citizenshipNumber.trim(),
        employeeId: formData.employeeId.trim(),
        walletAddress: address,
        signature,
        message,
        ...(inviteToken && { inviteToken }),
      });
      const { cooldownSeconds } = response.data;
      if (cooldownSeconds && cooldownSeconds > 0) {
        setCooldown(cooldownSeconds);
      }
      toast.success('OTP sent to your email!');
      setStep(2);

    } catch (error) {
      console.error('Register Error:', error.response?.data || error.message);
      const data = error.response?.data || {};
      const remaining = data.remainingSeconds;
      if (remaining && typeof remaining === 'number') {
        if (remaining > 120) {
          setLockout(remaining);
        } else {
          setCooldown(remaining);
        }
      }
      toast.error(data.message || 'Registration failed.');
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
        otp,
        inviteToken,
      });
      const { token, ...userData } = response.data;

      if (token) {
        login(token, userData);
        toast.success("Registration successful! Please upload your document.");
        navigate(ROUTES.UPLOAD);
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
    // Block resend if locked or on cooldown
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
    const address = formData.walletAddress;

    if (!inviteToken) {
      toast.error('Please use the registration link from your election invitation email.');
      setLoading(false);
      return;
    }
    if (
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.dob ||
      !formData.gender ||
      !formData.address.trim() ||
      !formData.citizenshipNumber.trim() ||
      !formData.employeeId.trim()
    ) {
      toast.error('Full name, email, date of birth, gender, address, citizenship number, and employee ID are required.');
      setLoading(false);
      return;
    }

    const sigData = await getWalletSignature(address);
    if (!sigData) {
      setLoading(false);
      return;
    }
    const { signature, message } = sigData;

    try {
      const response = await API.post('/auth/register-init', {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        dob: formData.dob,
        gender: formData.gender,
        address: formData.address.trim(),
        citizenshipNumber: formData.citizenshipNumber.trim(),
        employeeId: formData.employeeId.trim(),
        walletAddress: address,
        signature,
        message,
        inviteToken,
      });
      const { cooldownSeconds } = response.data;
      if (cooldownSeconds && cooldownSeconds > 0) {
        setCooldown(cooldownSeconds);
      }
      toast.success('A new OTP has been sent to your email.');
    } catch (error) {
      const data = error.response?.data || {};
      const remaining = data.remainingSeconds;
      if (remaining && typeof remaining === 'number') {
        if (remaining > 120) {
          setLockout(remaining);
        } else {
          setCooldown(remaining);
        }
      }
      toast.error(data.message || 'Failed to resend OTP.');
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
        <h2 className="text-2xl font-bold mb-4 text-center" style={{ color: 'var(--text-color)' }}>
          {step === 1 ? 'Register to VoteChain' : 'Verify Your Email'}
        </h2>

        {/* Invite token validating spinner */}
        {tokenValidating && (
          <div className="flex items-center justify-center gap-2 text-sm text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 mb-4">
            <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            Validating your invitation link...
          </div>
        )}

        {/* Election invitation banner */}
        {electionInfo && !tokenValidating && (
          <div className="mb-5 p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-sm">
            <div className="font-bold text-xs uppercase tracking-wider text-indigo-500 mb-1">Official Invitation</div>
            <div className="font-bold text-base">{electionInfo.title}</div>
            <div className="text-xs text-indigo-700 mt-0.5">
              Election #{electionInfo.electionId} · Registration is {electionInfo.status === 'registration_open' ? 'Open' : electionInfo.status}
            </div>
          </div>
        )}

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
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-color)' }}>Gender</label>
              <select
                name="gender"
                required
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg outline-none transition-colors border"
                style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-color)' }}>Permanent Address</label>
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
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-color)' }}>Citizenship Number</label>
              <input
                type="text"
                name="citizenshipNumber"
                required
                value={formData.citizenshipNumber}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg outline-none transition-colors border"
                style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
                placeholder="Enter citizenship number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-color)' }}>Employee ID</label>
              <input
                type="text"
                name="employeeId"
                required
                value={formData.employeeId}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg outline-none transition-colors border"
                style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
                placeholder="Enter employee ID"
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
              disabled={loading || isBlocked || isOnCooldown}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors flex justify-center items-center mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : isBlocked ? (
                `Locked — ${formatTime(lockout)}`
              ) : isOnCooldown ? (
                `Please wait ${cooldown}s`
              ) : (
                'Send OTP'
              )}
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

              {isBlocked && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg text-center font-medium">
                  🔒 Account locked. Resend available in <strong>{formatTime(lockout)}</strong>.
                </div>
              )}

              {!isBlocked && isOnCooldown && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg text-center font-medium">
                  Please wait <strong>{cooldown}s</strong> before resending.
                </div>
              )}

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={loading || isBlocked || isOnCooldown}
                className="text-sm font-medium hover:underline opacity-70 hover:opacity-100 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ color: 'var(--text-color)' }}
              >
                {isBlocked ? `Locked — ${formatTime(lockout)}` : isOnCooldown ? `Resend in ${cooldown}s` : 'Resend Code'}
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
