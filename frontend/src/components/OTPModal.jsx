import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import API from '../api/api';

/**
 * OTPModal — used for the voting OTP verification flow.
 *
 * Props:
 *   isOpen    — whether the modal is visible
 *   onClose   — callback to close the modal
 *   onVerified — callback called on successful OTP verification
 *   purpose   — 'voting' (default) — determines which endpoint is used
 */
const OTPModal = ({ isOpen, onClose, onVerified, purpose = 'voting' }) => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [requesting, setRequesting] = useState(false);

  // Auto-request OTP when modal opens
  useEffect(() => {
    if (isOpen) {
      setOtp('');
      handleRequestOTP();
    }
  }, [isOpen]);

  const handleRequestOTP = async () => {
    // This modal is currently only used for voting OTP.
    // The voting OTP endpoint requires an authenticated user (JWT in header).
    if (purpose !== 'voting') {
      console.warn('[OTPModal] Only "voting" purpose is supported in this modal.');
      return;
    }

    setRequesting(true);
    try {
      await API.post('/auth/request-vote-otp');
      toast.success('Voting OTP sent to your registered email.');
    } catch (error) {
      console.error('OTP Request Error:', error);
      toast.error(error.response?.data?.message || 'Failed to send OTP. Please try again.');
      onClose();
    } finally {
      setRequesting(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      return toast.error('Please enter a valid 6-digit OTP.');
    }

    setLoading(true);
    try {
      await API.post('/auth/verify-vote-otp', { otp });
      toast.success('OTP verified successfully!');
      onVerified();
      onClose();
    } catch (error) {
      console.error('OTP Verification Error:', error);
      toast.error(error.response?.data?.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold" style={{ color: 'var(--text-color)' }}>
              Confirm Your Vote
            </h3>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-black/10 transition-colors"
              style={{ color: 'var(--text-color)' }}
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="mb-6 text-sm opacity-80" style={{ color: 'var(--text-color)' }}>
            To securely cast your vote, please enter the 6-digit code sent to your registered email.
          </p>

          <form onSubmit={handleVerify} className="space-y-6">
            <input
              type="text"
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="••••••"
              maxLength={6}
              className="w-full text-center text-3xl font-mono tracking-[0.4em] py-4 rounded-xl border-2 outline-none transition-all"
              style={{
                backgroundColor: 'var(--bg-color)',
                color: 'var(--text-color)',
                borderColor: 'var(--border-color)',
              }}
              autoFocus
            />

            <div className="flex flex-col gap-3">
              <button
                type="submit"
                disabled={loading || requesting || otp.length !== 6}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg hover:shadow-blue-500/20 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Verifying...
                  </span>
                ) : 'Confirm & Cast Vote'}
              </button>

              <button
                type="button"
                onClick={handleRequestOTP}
                disabled={loading || requesting}
                className="text-sm font-medium hover:underline opacity-70 hover:opacity-100 disabled:opacity-30"
                style={{ color: 'var(--text-color)' }}
              >
                {requesting ? 'Sending new OTP...' : 'Resend Code'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default OTPModal;
