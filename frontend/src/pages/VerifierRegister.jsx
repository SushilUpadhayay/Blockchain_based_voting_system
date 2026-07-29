import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ShieldCheck,
  KeyRound,
  Wallet,
  Mail,
  User,
  Phone,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import API from '../api/api';
import { useAuth } from '../context/AuthContext';

const STEPS = {
  LOADING: 'loading',
  INVALID: 'invalid',
  DETAILS: 'details',
  WALLET: 'wallet',
  OTP: 'otp',
  DONE: 'done',
};

const VerifierRegister = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const token = searchParams.get('token');

  const [step, setStep] = useState(STEPS.LOADING);
  const [inviteInfo, setInviteInfo] = useState(null);
  const [error, setError] = useState('');

  // Step 2 form
  const [formData, setFormData] = useState({ name: '', phone: '', password: '', confirmPassword: '' });
  // Step 4 OTP
  const [otp, setOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Validate token
  useEffect(() => {
    if (!token) {
      setError('No invitation token found in this link.');
      setStep(STEPS.INVALID);
      return;
    }
    API.get(`/elections/verifier-invite/${token}`)
      .then((res) => {
        setInviteInfo(res.data);
        setFormData((f) => ({ ...f, name: res.data.name || '' }));
        setStep(STEPS.DETAILS);
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'This invitation link is invalid or has expired.');
        setStep(STEPS.INVALID);
      });
  }, [token]);

  const handleDetailsNext = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error('Name is required.');
    if (!formData.phone.trim()) return toast.error('Phone number is required.');
    if (!formData.password || formData.password.length < 8)
      return toast.error('Password must be at least 8 characters.');
    if (formData.password !== formData.confirmPassword)
      return toast.error('Passwords do not match.');
    setStep(STEPS.WALLET);
  };

  const handleConnectWallet = async () => {
    if (!window.ethereum) {
      return toast.error('MetaMask is required. Please install it and try again.');
    }
    setSubmitting(true);
    try {
      toast.loading('Connecting MetaMask...', { id: 'wallet' });
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const address = accounts[0];

      // Fetch nonce challenge
      const nonceRes = await API.get(`/auth/nonce?walletAddress=${address}`);
      const { message } = nonceRes.data;

      toast.loading('Please sign the verification challenge in MetaMask...', { id: 'wallet' });
      const sig = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, address],
      });

      toast.success('Wallet connected and signed!', { id: 'wallet' });
      setStep(STEPS.OTP);

      // Trigger registerVerifierInit — sends OTP, validates invite + signature server-side
      await API.post('/auth/register-verifier-init', {
        inviteToken: token,
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        password: formData.password,
        walletAddress: address,
        signature: sig,
        message,
      });
      toast.success('OTP sent to your email!');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Wallet connection failed.', { id: 'wallet' });
      setStep(STEPS.WALLET);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp.trim()) return toast.error('Please enter your OTP.');
    setSubmitting(true);
    try {
      const res = await API.post('/auth/verify-verifier-otp', {
        email: inviteInfo.email,
        otp: otp.trim(),
        inviteToken: token,
      });
      const { token: sessionToken, ...userData } = res.data;
      login(sessionToken, userData);
      setStep(STEPS.DONE);
      toast.success('Verifier registration complete!');
      setTimeout(() => navigate(`/elections/${res.data.electionId}/verifier`), 2000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'OTP verification failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Render helpers ────────────────────────────────────────────────────────

  const StepDot = ({ num, active, done }) => (
    <div
      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all
        ${done ? 'bg-emerald-500 border-emerald-500 text-white' : active ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-transparent border-gray-300 text-gray-400'}`}
    >
      {done ? <CheckCircle2 className="w-4 h-4" /> : num}
    </div>
  );

  const stepIndex = { [STEPS.DETAILS]: 1, [STEPS.WALLET]: 2, [STEPS.OTP]: 3, [STEPS.DONE]: 4 };
  const currentStep = stepIndex[step] || 0;

  if (step === STEPS.LOADING) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-color)' }}>
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (step === STEPS.INVALID) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: 'var(--bg-color)' }}>
        <div className="max-w-md w-full p-8 rounded-2xl border text-center shadow-xl" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-color)' }}>Invalid Invitation</h1>
          <p className="text-sm opacity-70 mb-6" style={{ color: 'var(--text-color)' }}>{error}</p>
          <button onClick={() => navigate('/')} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm">
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 transition-colors duration-300" style={{ backgroundColor: 'var(--bg-color)' }}>
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-100 text-indigo-700 text-sm font-bold mb-4">
            <ShieldCheck className="w-4 h-4" /> Verifier Registration
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: 'var(--text-color)' }}>
            {inviteInfo?.electionTitle}
          </h1>
          <p className="text-sm opacity-60 mt-1" style={{ color: 'var(--text-color)' }}>
            You've been invited to serve as a Registration Verifier for this election.
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {[1, 2, 3, 4].map((n) => (
            <React.Fragment key={n}>
              <StepDot num={n} active={currentStep === n} done={currentStep > n} />
              {n < 4 && <div className={`h-0.5 w-8 rounded ${currentStep > n ? 'bg-emerald-400' : 'bg-gray-200'}`} />}
            </React.Fragment>
          ))}
        </div>

        <div className="rounded-2xl border p-8 shadow-xl" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>

          {/* ── Step 2: Account details ─────────────────────────────────── */}
          {step === STEPS.DETAILS && (
            <form onSubmit={handleDetailsNext} className="space-y-5">
              <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-color)' }}>
                Step 1 — Your Account Details
              </h2>

              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: 'var(--text-color)' }}>
                  <User className="w-4 h-4 inline mr-1 text-indigo-500" />Full Name
                </label>
                <input
                  type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none"
                  style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: 'var(--text-color)' }}>
                  <Mail className="w-4 h-4 inline mr-1 text-indigo-500" />Email
                </label>
                <input
                  type="email" value={inviteInfo?.email || ''} disabled
                  className="w-full px-4 py-2.5 rounded-xl border text-sm opacity-60 cursor-not-allowed"
                  style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
                />
                <p className="text-xs opacity-50 mt-1" style={{ color: 'var(--text-color)' }}>
                  Email is fixed to your invitation address.
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: 'var(--text-color)' }}>
                  <Phone className="w-4 h-4 inline mr-1 text-indigo-500" />Phone
                </label>
                <input
                  type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 555 000 0000"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none"
                  style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: 'var(--text-color)' }}>
                  <KeyRound className="w-4 h-4 inline mr-1 text-indigo-500" />Password
                </label>
                <input
                  type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required minLength={8} placeholder="At least 8 characters"
                  className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none"
                  style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: 'var(--text-color)' }}>
                  <KeyRound className="w-4 h-4 inline mr-1 text-indigo-500" />Confirm Password
                </label>
                <input
                  type="password" value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required placeholder="Re-enter password"
                  className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none"
                  style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
                />
              </div>

              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl text-sm transition-all mt-2">
                Continue →
              </button>
            </form>
          )}

          {/* ── Step 3: Wallet connect ──────────────────────────────────── */}
          {step === STEPS.WALLET && (
            <div className="space-y-6 text-center">
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-color)' }}>
                Step 2 — Connect Your Wallet
              </h2>
              <p className="text-sm opacity-70" style={{ color: 'var(--text-color)' }}>
                Connect and sign with MetaMask to prove wallet ownership. This wallet will be assigned as the
                on-chain Registration Verifier after OTP verification.
              </p>
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 text-left">
                <strong>Note:</strong> If you already have an account, use the same wallet address. Connecting a
                different wallet will be rejected to protect your existing voter registrations.
              </div>
              <button
                onClick={handleConnectWallet}
                disabled={submitting}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                {submitting ? 'Connecting...' : 'Connect MetaMask & Sign'}
              </button>
            </div>
          )}

          {/* ── Step 4: OTP ────────────────────────────────────────────── */}
          {step === STEPS.OTP && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-color)' }}>
                Step 3 — Verify Your Email
              </h2>
              <p className="text-sm opacity-70" style={{ color: 'var(--text-color)' }}>
                A 6-digit OTP has been sent to <strong>{inviteInfo?.email}</strong>. Enter it below to complete
                verifier registration and trigger on-chain assignment.
              </p>
              <input
                type="text" inputMode="numeric" required maxLength={6} value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter 6-digit OTP"
                className="w-full px-4 py-3 rounded-xl border text-center text-xl font-mono tracking-widest outline-none"
                style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
                autoFocus
              />
              <button
                type="submit" disabled={submitting || otp.length !== 6}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {submitting ? 'Verifying & Deploying On-Chain...' : 'Verify & Complete Registration'}
              </button>
            </form>
          )}

          {/* ── Done ───────────────────────────────────────────────────── */}
          {step === STEPS.DONE && (
            <div className="text-center space-y-4 py-4">
              <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
              <h2 className="text-2xl font-bold text-emerald-600">Registration Complete!</h2>
              <p className="text-sm opacity-70" style={{ color: 'var(--text-color)' }}>
                You are now an authorized Registration Verifier on the blockchain. Redirecting to your verifier
                dashboard...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifierRegister;
