import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Clock, AlertTriangle, CheckCircle, FileX } from 'lucide-react';
import { USER_STATUS, ROUTES } from '../constants';

/* Small status card components */
const PendingCard = () => (
  <div className="flex flex-col items-center">
    <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-6">
      <Clock className="w-10 h-10 text-amber-600" />
    </div>
    <h1 className="text-3xl font-bold mb-4" style={{ color: 'var(--text-color)' }}>Registration Under Review</h1>
    <p className="text-lg mb-6" style={{ color: 'var(--text-muted)' }}>
      Your voter registration is currently being reviewed by the election administrator. 
      You will receive an email notification once your status has been updated.
    </p>
    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl w-full">
      <p className="text-amber-800 font-medium">Please check back later.</p>
    </div>
  </div>
);

const RejectedCard = ({ user }) => (
  <div className="flex flex-col items-center">
    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
      <FileX className="w-10 h-10 text-red-600" />
    </div>
    <h1 className="text-3xl font-bold mb-4 text-red-600">Registration Rejected</h1>
    <p className="text-lg mb-6" style={{ color: 'var(--text-muted)' }}>
      Unfortunately, your voter registration was not approved.
    </p>
    {user?.rejectionReason && (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl w-full text-left mb-8 shadow-sm">
        <h3 className="text-red-800 font-bold mb-2">Reason for rejection:</h3>
        <p className="text-red-700">{user.rejectionReason}</p>
      </div>
    )}
    <Link 
      to={ROUTES.REGISTER} 
      className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl w-full sm:w-auto"
    >
      Register Again
    </Link>
  </div>
);

const ApprovedCard = () => (
  <div className="flex flex-col items-center">
    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
      <CheckCircle className="w-10 h-10 text-emerald-600" />
    </div>
    <h1 className="text-3xl font-bold mb-4" style={{ color: 'var(--text-color)' }}>Registration Approved</h1>
    <p className="text-lg mb-2 text-emerald-700 font-semibold">
      Your registration has been successfully approved.
    </p>
    <p className="text-base mb-8 opacity-80" style={{ color: 'var(--text-muted)' }}>
      Your identity has been verified and your wallet is authorized on the blockchain. You can now participate in the election.
    </p>
    <Link 
      to={ROUTES.VOTING} 
      className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl w-full sm:w-auto flex items-center justify-center gap-3"
    >
      Go to Voting Dashboard
      <span aria-hidden="true">&rarr;</span>
    </Link>
  </div>
);

const BlockedCard = () => (
  <div className="flex flex-col items-center">
    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
      <AlertTriangle className="w-10 h-10 text-gray-600" />
    </div>
    <h1 className="text-3xl font-bold mb-4" style={{ color: 'var(--text-color)' }}>Account Blocked</h1>
    <p className="text-lg" style={{ color: 'var(--text-muted)' }}>
      Your account has been blocked by the election administrator.
    </p>
  </div>
);

/* Map of user statuses to component cards */
const STATUS_VIEWS = {
  [USER_STATUS.PENDING]: PendingCard,
  [USER_STATUS.REJECTED]: RejectedCard,
  [USER_STATUS.REGISTERED]: ApprovedCard,
  [USER_STATUS.BLOCKED]: BlockedCard,
};

const StatusDashboard = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate(ROUTES.LOGIN);
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated || !user) return null;

  const StatusView = STATUS_VIEWS[user.status] || PendingCard;

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }} className="max-w-2xl w-full rounded-2xl p-8 shadow-xl text-center">
        <StatusView user={user} />
      </div>
    </div>
  );
};

export default StatusDashboard;
