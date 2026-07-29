import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Clock, AlertTriangle, CalendarDays, CheckCircle, FileX, Mail, Phone, ShieldCheck, UserRound } from 'lucide-react';
import { USER_STATUS, ROUTES } from '../constants';

const getPhoneHref = (phone) => `tel:${String(phone || '').replace(/[^\d+]/g, '')}`;

const formatDateTime = (value) => {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not set';

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const ElectionSchedulePanel = ({ schedule }) => {
  if (!schedule) return null;

  const rows = [
    ['Registration Start', schedule.registrationPeriod?.startDate],
    ['Registration End', schedule.registrationPeriod?.endDate],
    ['Election Start', schedule.votingPeriod?.startDate],
    ['Election End', schedule.votingPeriod?.endDate],
  ];

  return (
    <div
      className="w-full mt-8 pt-6 border-t text-left"
      style={{ borderColor: 'var(--border-color)' }}
    >
      <div className="flex items-start gap-2 mb-4">
        <CalendarDays className="w-5 h-5 text-emerald-600 mt-0.5" />
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Election Timeline
          </h2>
          <p className="text-sm font-semibold mt-1" style={{ color: 'var(--text-color)' }}>
            {schedule.title || `Election #${schedule.electionId}`}
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
        {rows.map(([label, value]) => (
          <div key={label} className="py-2 border-b border-black/5 dark:border-white/10">
            <dt className="text-xs font-bold uppercase tracking-wide opacity-60" style={{ color: 'var(--text-color)' }}>
              {label}
            </dt>
            <dd className="text-sm font-semibold mt-1" style={{ color: 'var(--text-color)' }}>
              {formatDateTime(value)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
};

const VerifierContactPanel = ({ contacts }) => {
  const verifierContacts = Array.isArray(contacts) ? contacts : [];
  if (verifierContacts.length === 0) return null;

  return (
    <div
      className="w-full mt-8 pt-6 border-t text-left"
      style={{ borderColor: 'var(--border-color)' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck className="w-5 h-5 text-indigo-600" />
        <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          Verifier Contact
        </h2>
      </div>

      <div>
        {verifierContacts.map((verifier, index) => (
          <div
            key={verifier._id || verifier.email || index}
            className={`flex items-start gap-3 ${index > 0 ? 'mt-4 pt-4 border-t' : ''}`}
            style={index > 0 ? { borderColor: 'var(--border-color)' } : undefined}
          >
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <UserRound className="w-5 h-5 text-indigo-700" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold truncate" style={{ color: 'var(--text-color)' }}>
                {verifier.name || 'Registration Verifier'}
              </p>
              <div className="mt-2 space-y-1.5 text-sm">
                {verifier.email && (
                  <a
                    href={`mailto:${verifier.email}`}
                    className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700"
                  >
                    <Mail className="w-4 h-4 flex-shrink-0" />
                    <span className="break-all">{verifier.email}</span>
                  </a>
                )}
                {verifier.phone ? (
                  <a
                    href={getPhoneHref(verifier.phone)}
                    className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700"
                  >
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    <span>{verifier.phone}</span>
                  </a>
                ) : (
                  <div className="flex items-center gap-2 opacity-60" style={{ color: 'var(--text-color)' }}>
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    <span>Phone not provided</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

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

const ApprovedCard = ({ user }) => {
  const targetElectionId = user?.electionId || user?.elections?.find((entry) => entry.status === USER_STATUS.REGISTERED)?.electionId;
  const votingPath = targetElectionId ? `/elections/${targetElectionId}/voting` : ROUTES.ELECTIONS;

  return (
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
        to={votingPath}
        className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl w-full sm:w-auto flex items-center justify-center gap-3"
      >
        Go to Voting Dashboard
        <span aria-hidden="true">&rarr;</span>
      </Link>
    </div>
  );
};

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
        <ElectionSchedulePanel schedule={user.electionSchedule} />
        <VerifierContactPanel contacts={user.verifierContacts} />
      </div>
    </div>
  );
};

export default StatusDashboard;
