import React from 'react';
import { useVoting } from '../context/VotingContext';
import CandidateCard from './CandidateCard';
import AdminPanel from './AdminPanel';
import { Wallet, Activity, RefreshCw, AlertTriangle, ServerCrash, LogOut } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const {
    currentAccount,
    connectWallet,
    candidates,
    electionStatus,
    loadCandidates,
    isLoading,
    isAdmin,
    networkOk,
    networkError,
    contractFound,
    REQUIRED_CHAIN_ID,
    RPC_URL,
  } = useVoting();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const status = user?.status || 'pending';
  const rejectionReason = user?.rejectionReason || 'No reason provided';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300" style={{ backgroundColor: 'var(--bg-color)' }}>

      {/* ── Network Error Banner ── */}
      {currentAccount && !networkOk && (
        <div className="bg-red-600 text-white px-6 py-3 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <span className="font-semibold">Wrong Network — </span>
            {networkError}
            <div className="mt-1 font-mono text-red-100 text-xs">
              MetaMask → Settings → Networks → Add Network →
              RPC: <strong>{RPC_URL}</strong> | Chain ID: <strong>{REQUIRED_CHAIN_ID}</strong>
            </div>
          </div>
        </div>
      )}

      {/* ── Contract Not Found Banner ── */}
      {currentAccount && networkOk && !contractFound && (
        <div className="bg-orange-500 text-white px-6 py-3 flex items-start gap-3">
          <ServerCrash className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <span className="font-semibold">Contract Not Deployed — </span>
            No contract found at the configured address. Run:
            <code className="ml-2 bg-orange-700 px-2 py-0.5 rounded text-xs">
              npx hardhat run scripts/deploy.js --network localhost
            </code>
          </div>
        </div>
      )}

      {/* ── Navbar ── */}
      <nav
        className="border-b px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm transition-colors duration-300"
        style={{ backgroundColor: 'var(--nav-bg)', borderColor: 'var(--border-color)' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Activity className="text-white w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-color)' }}>VoteChain</span>
          <span className="ml-2 text-xs font-mono text-gray-400 hidden sm:block">
            Hardhat Local · chainId {REQUIRED_CHAIN_ID}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />

          {currentAccount ? (
            <div className="flex items-center gap-3 px-4 py-2 rounded-full border transition-colors"
              style={{ backgroundColor: 'var(--bg-color)', borderColor: 'var(--border-color)' }}>
              <div className={`w-2 h-2 rounded-full ${networkOk ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm font-medium" style={{ color: 'var(--text-color)' }}>
                {currentAccount.slice(0, 6)}…{currentAccount.slice(-4)}
              </span>
              {isAdmin && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                  Admin
                </span>
              )}
            </div>
          ) : (
            <button
              onClick={connectWallet}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              <Wallet className="w-4 h-4" />
              Connect Wallet
            </button>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors hover:bg-red-50 hover:border-red-200 hover:text-red-600"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-color)' }}
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </nav>

      {/* ── Main ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 lg:p-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-1" style={{ color: 'var(--text-color)' }}>Blockchain Ballot</h1>
            <p className="opacity-70" style={{ color: 'var(--text-color)' }}>Your vote is anonymous, transparent, and immutable.</p>
          </div>

          <div className="flex items-center gap-4">
            <div
              className={`px-4 py-2 rounded-lg text-sm font-bold border flex items-center gap-2
                ${!electionStatus.started
                  ? 'bg-gray-100 text-gray-600 border-gray-200'
                  : electionStatus.active
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-red-50 text-red-700 border-red-200'}`}
            >
              <div
                className={`w-2 h-2 rounded-full ${!electionStatus.started ? 'bg-gray-400' : electionStatus.active ? 'bg-green-600 animate-pulse' : 'bg-red-600'}`}
              />
              {!electionStatus.started
                ? 'ELECTION NOT STARTED'
                : electionStatus.active
                  ? 'VOTING LIVE'
                  : 'ELECTION CLOSED'}
            </div>

            <button
              onClick={() => loadCandidates()}
              disabled={isLoading}
              title="Refresh Results"
              className="p-2 opacity-70 hover:opacity-100 rounded-lg transition-colors border shadow-sm"
              style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Status-based Views */}
        {status === 'blocked' ? (
          <div className="flex flex-col items-center justify-center p-12 rounded-2xl border border-red-200 bg-red-50 text-center">
            <AlertTriangle className="w-12 h-12 mb-4 text-red-600" />
            <h3 className="text-xl font-bold mb-2 text-red-800">Access Permanently Blocked</h3>
            <p className="max-w-md opacity-80 text-red-700">
              Your account has been permanently blocked due to a policy violation or duplicate identity.
              If you believe this is an error, please contact support.
            </p>
          </div>
        ) : status === 'rejected' ? (
          <div className="flex flex-col items-center justify-center p-12 rounded-2xl border border-orange-200 bg-orange-50 text-center">
            <AlertTriangle className="w-12 h-12 mb-4 text-orange-600" />
            <h3 className="text-xl font-bold mb-2 text-orange-800">Registration Rejected</h3>
            <p className="max-w-md mb-4 text-orange-700">
              Reason: <span className="font-semibold underline">{rejectionReason}</span>
            </p>
            <p className="max-w-md mb-6 opacity-80 text-orange-700">
              You can correct the issues and resubmit your registration for another review.
            </p>
            <button
              onClick={() => navigate('/register')}
              className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-sm"
            >
              Update & Resubmit
            </button>
          </div>
        ) : status === 'pending' ? (
          <div className="flex flex-col items-center justify-center p-12 rounded-2xl border border-blue-200 bg-blue-50 text-center">
            <Activity className="w-12 h-12 mb-4 text-blue-600 animate-pulse" />
            <h3 className="text-xl font-bold mb-2 text-blue-800">Application Pending</h3>
            <p className="max-w-md mb-6 opacity-80 text-blue-700">
              Your registration is currently under review by the election administrators.
              This process usually takes 24–48 hours. Please check back later.
            </p>
            <div className="text-sm font-medium text-blue-600 bg-white px-4 py-2 rounded-full border border-blue-100 shadow-sm">
              Status: Waiting for Admin Approval
            </div>
          </div>
        ) : (
          <>
            {/* Registered user — show candidates / connect prompt */}
            {!currentAccount ? (
              <div
                className="flex flex-col items-center justify-center p-12 rounded-2xl border border-dashed transition-colors"
                style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
              >
                <Wallet className="w-12 h-12 mb-4 opacity-50" style={{ color: 'var(--text-color)' }} />
                <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-color)' }}>Wallet Required</h3>
                <p className="text-center max-w-md mb-6 opacity-70" style={{ color: 'var(--text-color)' }}>
                  Connect your MetaMask wallet to view candidates and cast your vote.
                </p>
                <button
                  onClick={connectWallet}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Connect MetaMask
                </button>
              </div>
            ) : candidates.length === 0 ? (
              <div
                className="text-center p-12 rounded-2xl border transition-colors"
                style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
              >
                <p className="opacity-70" style={{ color: 'var(--text-color)' }}>
                  No candidates found for this election.
                  {isAdmin && (
                    <span> Add candidates from the <a href="/admin" className="text-blue-600 font-medium hover:underline">Admin Panel</a>.</span>
                  )}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {candidates.map((candidate) => (
                  <CandidateCard key={candidate.id} candidate={candidate} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
