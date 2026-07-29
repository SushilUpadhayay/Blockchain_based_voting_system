import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  KeyRound,
  Wallet,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import API from '../api/api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

const STEPS = {
  ELECTION: 1,
  IDENTITY: 2,
  WALLET: 3,
  OTP_VERIFY: 4,
};

const CreateElection = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [step, setStep] = useState(STEPS.ELECTION);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Election Details
  const [electionDetails, setElectionDetails] = useState({
    title: '',
    description: '',
    registrationStartDate: '',
    registrationEndDate: '',
    votingStartDate: '',
    votingEndDate: '',
  });

  // Step 2: Election Administrator Identity
  const [identity, setIdentity] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    password: '',
    confirmPassword: '',
  });

  // Step 3: Wallet Connect & Signature
  const [wallet, setWallet] = useState({
    walletAddress: '',
    signature: '',
    message: '',
  });

  // Step 4: OTP
  const [otp, setOtp] = useState('');

  // ── Step Handlers ──────────────────────────────────────────────────────────

  const handleStep1Next = (e) => {
    e.preventDefault();
    if (!electionDetails.title.trim()) {
      return toast.error('Election title is required.');
    }
    if (!electionDetails.description.trim()) {
      return toast.error('Election description is required.');
    }
    if (
      !electionDetails.registrationStartDate ||
      !electionDetails.registrationEndDate ||
      !electionDetails.votingStartDate ||
      !electionDetails.votingEndDate
    ) {
      return toast.error('Registration and election start/end dates are required.');
    }

    const registrationStart = new Date(electionDetails.registrationStartDate);
    const registrationEnd = new Date(electionDetails.registrationEndDate);
    const votingStart = new Date(electionDetails.votingStartDate);
    const votingEnd = new Date(electionDetails.votingEndDate);

    if (registrationEnd <= registrationStart) {
      return toast.error('Registration end date must be after the start date.');
    }
    if (votingEnd <= votingStart) {
      return toast.error('Election end date must be after the start date.');
    }

    setStep(STEPS.IDENTITY);
  };

  const handleStep2Next = (e) => {
    e.preventDefault();
    if (!identity.name.trim()) return toast.error('Full name is required.');
    if (!identity.email.trim()) return toast.error('Email address is required.');
    if (!identity.phone.trim()) return toast.error('Phone number is required.');
    if (!identity.address.trim()) return toast.error('Address is required.');
    if (!identity.password || identity.password.length < 8) {
      return toast.error('Password must be at least 8 characters long.');
    }
    if (identity.password !== identity.confirmPassword) {
      return toast.error('Passwords do not match. Please check your password confirmation.');
    }
    setStep(STEPS.WALLET);
  };

  const handleConnectAndSignWallet = async () => {
    if (!window.ethereum) {
      return toast.error('MetaMask extension is required. Please install MetaMask to proceed.');
    }

    setSubmitting(true);
    try {
      toast.loading('Connecting MetaMask...', { id: 'wallet-step' });
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const address = accounts[0];

      // Fetch nonce challenge
      const nonceRes = await API.get(`/auth/nonce?walletAddress=${address}`);
      const { message } = nonceRes.data;

      toast.loading('Please sign the verification challenge in MetaMask...', { id: 'wallet-step' });
      const sig = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, address],
      });

      setWallet({
        walletAddress: address,
        signature: sig,
        message,
      });

      toast.loading('Sending OTP to your email...', { id: 'wallet-step' });

      // Fire the backend init call — only advance to OTP step AFTER it succeeds
      // so the OTP input never appears before the email is actually sent.
      await handleInitRegistration(address, sig, message);

      toast.success('OTP sent! Check your inbox.', { id: 'wallet-step' });
      setStep(STEPS.OTP_VERIFY);
    } catch (err) {
      console.error('Wallet connect / registration init error:', err);
      toast.error(err.response?.data?.message || err.message || 'Wallet signature failed.', { id: 'wallet-step' });
      setStep(STEPS.WALLET);
    } finally {
      setSubmitting(false);
    }
  };

  const handleInitRegistration = async (wAddress, sig, msg) => {
    const payload = {
      name: identity.name.trim(),
      email: identity.email.trim().toLowerCase(),
      phone: identity.phone.trim(),
      address: identity.address.trim(),
      password: identity.password,
      walletAddress: wAddress || wallet.walletAddress,
      signature: sig || wallet.signature,
      message: msg || wallet.message,
      electionDetails: {
        title: electionDetails.title.trim(),
        description: electionDetails.description.trim(),
        registrationPeriod: {
          startDate: electionDetails.registrationStartDate || null,
          endDate: electionDetails.registrationEndDate || null,
        },
        votingPeriod: {
          startDate: electionDetails.votingStartDate || null,
          endDate: electionDetails.votingEndDate || null,
        },
      },
    };

    await API.post('/auth/register-superadmin-init', payload);
    // Caller is responsible for success feedback and step advancement.
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp.trim()) return toast.error('Please enter the 6-digit OTP code.');

    setSubmitting(true);
    try {
      const res = await API.post('/auth/verify-superadmin-otp', {
        email: identity.email.trim().toLowerCase(),
        otp: otp.trim(),
      });

      const { token, electionId, ...userData } = res.data;
      login(token, userData); // Store session in AuthContext

      toast.success('Account created & election deployed on blockchain!');
      navigate(`/elections/${electionId}/setup`);
    } catch (err) {
      console.error('OTP verify error:', err);
      toast.error(err.response?.data?.message || 'OTP verification failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Step Indicators ────────────────────────────────────────────────────────

  const StepDot = ({ num, label, active, done }) => (
    <div className="flex items-center gap-2">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
          done
            ? 'bg-emerald-500 text-white'
            : active
            ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-900/50'
            : 'bg-gray-200 dark:bg-gray-800 text-gray-400'
        }`}
      >
        {done ? <CheckCircle2 className="w-4 h-4" /> : num}
      </div>
      <span className={`text-xs font-bold hidden sm:inline ${active ? 'text-indigo-600 dark:text-indigo-400' : 'opacity-50'}`} style={{ color: active ? undefined : 'var(--text-color)' }}>
        {label}
      </span>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300" style={{ backgroundColor: 'var(--bg-color)' }}>
      <Navbar />

      <main className="flex-1 max-w-3xl w-full mx-auto p-6 lg:p-8">
        <button
          onClick={() => navigate('/elections')}
          className="inline-flex items-center gap-2 text-sm font-medium mb-6 opacity-70 hover:opacity-100 transition-opacity"
          style={{ color: 'var(--text-color)' }}
        >
          <ArrowLeft className="w-4 h-4" /> Back to Election Portal
        </button>

        {/* Multi-step Header & Stepper */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold mb-2" style={{ color: 'var(--text-color)' }}>
            Election Administrator Onboarding Wizard
          </h1>
          <p className="text-sm opacity-70 mb-6" style={{ color: 'var(--text-color)' }}>
            Set up your election details, verify your identity & wallet, and deploy to the blockchain.
          </p>

          <div className="flex items-center justify-between gap-2 p-4 rounded-2xl border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
            <StepDot num={1} label="Election" active={step === STEPS.ELECTION} done={step > STEPS.ELECTION} />
            <div className="h-0.5 flex-1 bg-gray-200 dark:bg-gray-700" />
            <StepDot num={2} label="Identity" active={step === STEPS.IDENTITY} done={step > STEPS.IDENTITY} />
            <div className="h-0.5 flex-1 bg-gray-200 dark:bg-gray-700" />
            <StepDot num={3} label="Wallet" active={step === STEPS.WALLET} done={step > STEPS.WALLET} />
            <div className="h-0.5 flex-1 bg-gray-200 dark:bg-gray-700" />
            <StepDot num={4} label="OTP" active={step === STEPS.OTP_VERIFY} done={step > STEPS.OTP_VERIFY} />
          </div>
        </div>

        {/* Main Wizard Form Container */}
        <div className="rounded-2xl border p-8 shadow-xl" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>

          {/* ── STEP 1: Election Details ─────────────────────────────────── */}
          {step === STEPS.ELECTION && (
            <form onSubmit={handleStep1Next} className="space-y-6">
              <h2 className="text-xl font-bold pb-2 border-b" style={{ color: 'var(--text-color)', borderColor: 'var(--border-color)' }}>
                Step 1 — Election Configuration
              </h2>

              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: 'var(--text-color)' }}>
                  Election Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text" required value={electionDetails.title}
                  onChange={(e) => setElectionDetails({ ...electionDetails, title: e.target.value })}
                  placeholder="e.g. 2026 General Assembly Election"
                  className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                  style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: 'var(--text-color)' }}>
                  Description / Guidelines <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3} required value={electionDetails.description}
                  onChange={(e) => setElectionDetails({ ...electionDetails, description: e.target.value })}
                  placeholder="Describe the scope, eligibility criteria, and rules..."
                  className="w-full px-4 py-3 rounded-xl border text-sm outline-none resize-none"
                  style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-color)' }}>
                    Registration Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local" required value={electionDetails.registrationStartDate}
                    onChange={(e) => setElectionDetails({ ...electionDetails, registrationStartDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border text-xs outline-none"
                    style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-color)' }}>
                    Registration End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local" required value={electionDetails.registrationEndDate}
                    onChange={(e) => setElectionDetails({ ...electionDetails, registrationEndDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border text-xs outline-none"
                    style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-color)' }}>
                    Election Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local" required value={electionDetails.votingStartDate}
                    onChange={(e) => setElectionDetails({ ...electionDetails, votingStartDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border text-xs outline-none"
                    style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-color)' }}>
                    Election End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local" required value={electionDetails.votingEndDate}
                    onChange={(e) => setElectionDetails({ ...electionDetails, votingEndDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border text-xs outline-none"
                    style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-3 rounded-xl text-sm transition-all shadow-lg"
                >
                  Continue to Step 2 →
                </button>
              </div>
            </form>
          )}

          {/* ── STEP 2: Election Administrator Identity ─────────────────────────────── */}
          {step === STEPS.IDENTITY && (
            <form onSubmit={handleStep2Next} className="space-y-5">
              <h2 className="text-xl font-bold pb-2 border-b" style={{ color: 'var(--text-color)', borderColor: 'var(--border-color)' }}>
                Step 2 — Election Administrator Credentials
              </h2>

              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: 'var(--text-color)' }}>
                  <User className="w-4 h-4 inline mr-1 text-indigo-500" /> Full Name *
                </label>
                <input
                  type="text" required value={identity.name} onChange={(e) => setIdentity({ ...identity, name: e.target.value })}
                  placeholder="e.g. Alice Smith" className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none"
                  style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: 'var(--text-color)' }}>
                  <Mail className="w-4 h-4 inline mr-1 text-indigo-500" /> Email Address *
                </label>
                <input
                  type="email" required value={identity.email} onChange={(e) => setIdentity({ ...identity, email: e.target.value })}
                  placeholder="alice@organization.org" className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none"
                  style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-1.5" style={{ color: 'var(--text-color)' }}>
                    <Phone className="w-4 h-4 inline mr-1 text-indigo-500" /> Phone *
                  </label>
                  <input
                    type="tel" required value={identity.phone} onChange={(e) => setIdentity({ ...identity, phone: e.target.value })}
                    placeholder="+977 9800000000" className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none"
                    style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1.5" style={{ color: 'var(--text-color)' }}>
                    <MapPin className="w-4 h-4 inline mr-1 text-indigo-500" /> Address *
                  </label>
                  <input
                    type="text" required value={identity.address} onChange={(e) => setIdentity({ ...identity, address: e.target.value })}
                    placeholder="Kathmandu, Nepal" className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none"
                    style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-sm font-bold mb-1.5" style={{ color: 'var(--text-color)' }}>
                    <KeyRound className="w-4 h-4 inline mr-1 text-indigo-500" /> Password *
                  </label>
                  <input
                    type="password" required minLength={8} value={identity.password} onChange={(e) => setIdentity({ ...identity, password: e.target.value })}
                    placeholder="At least 8 characters" className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none"
                    style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1.5" style={{ color: 'var(--text-color)' }}>
                    <KeyRound className="w-4 h-4 inline mr-1 text-indigo-500" /> Confirm Password *
                  </label>
                  <input
                    type="password" required value={identity.confirmPassword} onChange={(e) => setIdentity({ ...identity, confirmPassword: e.target.value })}
                    placeholder="Re-enter password" className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none"
                    style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
                <button
                  type="button" onClick={() => setStep(STEPS.ELECTION)}
                  className="px-5 py-2.5 rounded-xl border text-sm font-medium opacity-70 hover:opacity-100"
                  style={{ color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
                >
                  ← Back to Step 1
                </button>

                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-3 rounded-xl text-sm transition-all shadow-lg"
                >
                  Continue to Step 3 (Wallet) →
                </button>
              </div>
            </form>
          )}

          {/* ── STEP 3: Connect Wallet & Sign ───────────────────────────── */}
          {step === STEPS.WALLET && (
            <div className="space-y-6 text-center py-4">
              <div className="w-16 h-16 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto">
                <Wallet className="w-8 h-8" />
              </div>

              <h2 className="text-xl font-bold" style={{ color: 'var(--text-color)' }}>
                Step 3 — Connect MetaMask Wallet
              </h2>

              <p className="text-sm opacity-70 max-w-md mx-auto" style={{ color: 'var(--text-color)' }}>
                Connect your Web3 wallet and sign the verification challenge. This wallet address will become the on-chain Election Administrator for <strong>{electionDetails.title}</strong>.
              </p>

              {submitting ? (
                <div className="p-4 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs text-indigo-700 dark:text-indigo-300">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                  Sending registration OTP to <strong>{identity.email}</strong>...
                </div>
              ) : (
                <button
                  onClick={handleConnectAndSignWallet}
                  disabled={submitting}
                  className="w-full max-w-sm mx-auto bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <Wallet className="w-4 h-4" /> Connect MetaMask & Sign Challenge
                </button>
              )}

              <div className="flex justify-start">
                <button
                  type="button" onClick={() => setStep(STEPS.IDENTITY)}
                  className="px-4 py-2 rounded-xl border text-xs font-medium opacity-70 hover:opacity-100"
                  style={{ color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
                >
                  ← Back to Step 2
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 4: Verify OTP ──────────────────────────────────────── */}
          {step === STEPS.OTP_VERIFY && (
            <form onSubmit={handleVerifyOtp} className="space-y-6 text-center py-2">
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-color)' }}>
                Step 4 — Verify Email OTP
              </h2>
              <p className="text-sm opacity-70 max-w-md mx-auto" style={{ color: 'var(--text-color)' }}>
                A 6-digit OTP code has been sent to <strong>{identity.email}</strong>. Enter it below to deploy your election on the blockchain.
              </p>

              <input
                type="text" inputMode="numeric" required maxLength={6} value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                className="w-full max-w-xs mx-auto px-4 py-3 rounded-xl border text-center text-2xl font-mono tracking-widest outline-none"
                style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
                autoFocus
              />

              <button
                type="submit" disabled={submitting || otp.length !== 6}
                className="w-full max-w-xs mx-auto bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-lg flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {submitting ? 'Deploying to Blockchain...' : 'Verify & Deploy Election'}
              </button>
            </form>
          )}

        </div>
      </main>
    </div>
  );
};

export default CreateElection;
