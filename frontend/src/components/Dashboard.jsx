import React from 'react';
import { useVoting } from '../context/VotingContext';
import CandidateCard from './CandidateCard';
import { Wallet, Activity, RefreshCw, AlertTriangle, ServerCrash, LogOut, Trophy } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const {
    currentAccount,
    connectWallet,
    candidates,
    electionStatus,
    loadInitialData,
    isLoading,
    networkOk,
    networkError,
    contractFound,
    REQUIRED_CHAIN_ID,
    RPC_URL,
    winner,
  } = useVoting();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const status = user?.status || 'pending';
  const rejectionReason = user?.rejectionReason || 'No reason provided';

  const electionEnded = electionStatus.started && !electionStatus.active;
  const totalVotes = candidates.reduce((sum, c) => sum + Number(c.voteCount), 0);
  const sortedCandidates = [...candidates].sort((a, b) => Number(b.voteCount) - Number(a.voteCount));

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

      {/* ── Main ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 lg:p-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-1" style={{ color: 'var(--text-color)' }}>Blockchain Ballot</h1>
            <p className="opacity-70" style={{ color: 'var(--text-color)' }}>Your vote is anonymous, transparent, and immutable.</p>
          </div>

          <div className="flex items-center gap-3">
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
              onClick={() => loadInitialData(currentAccount)}
              disabled={isLoading}
              title="Refresh Results"
              className="p-2 opacity-70 hover:opacity-100 rounded-lg transition-colors border shadow-sm"
              style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={handleLogout}
              title="Logout"
              className="p-2 opacity-70 hover:opacity-100 hover:text-red-600 rounded-lg transition-colors border shadow-sm"
              style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
            >
              <LogOut className="w-5 h-5" />
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
              Update &amp; Resubmit
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
            {/* Wallet not connected */}
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

            ) : electionEnded ? (
              /* ── ELECTION RESULTS VIEW ── */
              <div className="space-y-6">
                {/* Results Header */}
                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-8 text-white shadow-xl flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-bold mb-2">Election Results</h2>
                    <p className="opacity-90">The election has concluded. Here are the final results.</p>
                    <p className="text-indigo-200 text-sm mt-1">Total votes cast: <strong className="text-white">{totalVotes}</strong></p>
                  </div>
                  <Trophy className="w-16 h-16 opacity-40 hidden sm:block" />
                </div>

                {/* Winner Banner */}
                {winner && (
                  <div className="bg-yellow-50 border-2 border-yellow-300 p-6 rounded-2xl flex items-center gap-5 shadow-md">
                    <div className="bg-yellow-400 p-4 rounded-full shadow-inner">
                      <Trophy className="w-8 h-8 text-yellow-900" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-yellow-700 uppercase tracking-widest mb-1">🎉 Winner</p>
                      <p className="text-3xl font-extrabold text-yellow-900">{winner}</p>
                    </div>
                  </div>
                )}

                {/* Ranked Results List */}
                <div className="rounded-2xl border shadow-sm overflow-hidden" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                  <div className="p-5 border-b font-bold text-sm uppercase tracking-widest opacity-60" style={{ borderColor: 'var(--border-color)', color: 'var(--text-color)' }}>
                    Candidate Rankings
                  </div>
                  <div className="p-6 space-y-4">
                    {sortedCandidates.map((c, index) => {
                      const pct = totalVotes > 0 ? (Number(c.voteCount) / totalVotes) * 100 : 0;
                      const isTop = index === 0 && Number(c.voteCount) > 0;
                      const barColors = ['bg-yellow-400', 'bg-slate-400', 'bg-orange-400', 'bg-blue-400', 'bg-purple-400'];
                      const rankColors = ['text-yellow-500', 'text-gray-400', 'text-orange-400'];
                      return (
                        <div
                          key={c.id}
                          className={`p-4 rounded-xl transition-all ${isTop ? 'border-2 border-yellow-200 bg-yellow-50/60' : ''}`}
                          style={isTop ? {} : { backgroundColor: 'var(--bg-color)' }}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`text-xl font-black min-w-[2rem] ${rankColors[index] ?? 'text-gray-300'}`}>
                              #{index + 1}
                            </span>
                            {isTop && <Trophy className="w-4 h-4 text-yellow-500" />}
                            <span className="font-semibold flex-1 text-base" style={{ color: 'var(--text-color)' }}>{c.name}</span>
                            <span className="font-bold text-lg" style={{ color: 'var(--text-color)' }}>{c.voteCount}</span>
                            <span className="text-sm font-semibold w-12 text-right opacity-60" style={{ color: 'var(--text-color)' }}>
                              {Math.round(pct)}%
                            </span>
                          </div>
                          <div className="w-full h-3 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border-color)' }}>
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${barColors[index] ?? 'bg-blue-400'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    {sortedCandidates.length === 0 && (
                      <p className="text-center py-8 opacity-50" style={{ color: 'var(--text-color)' }}>No candidates in this election.</p>
                    )}
                  </div>
                </div>
              </div>

            ) : candidates.length === 0 ? (
              <div
                className="text-center p-12 rounded-2xl border transition-colors"
                style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
              >
                <p className="opacity-70" style={{ color: 'var(--text-color)' }}>No candidates found for this election.</p>
              </div>

            ) : (
              /* ── LIVE VOTING GRID ── */
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
