import React from 'react';
import { useVoting } from '../context/VotingContext';
import { User, CheckCircle2 } from 'lucide-react';
import { getAssetUrl } from '../utils/assetUrl';

const CandidateCard = ({ candidate, onVote }) => {
  const { hasVoted, electionStatus, isLoading, currentAccount, candidates } = useVoting();

  const handleVote = () => {
    onVote?.();
  };

  const isVotingDisabled = !electionStatus.active || hasVoted || isLoading || !currentAccount;

  // Live vote share calculation
  const totalVotes = candidates.reduce((sum, c) => sum + Number(c.voteCount), 0);
  const pct = totalVotes > 0 ? Math.round((Number(candidate.voteCount) / totalVotes) * 100) : 0;
  const isLeading = candidates.length > 0 &&
    Number(candidate.voteCount) > 0 &&
    Number(candidate.voteCount) === Math.max(...candidates.map(c => Number(c.voteCount)));

  return (
    <div
      className={`rounded-xl border p-6 flex flex-col items-center transition-all hover:shadow-lg ${isLeading && electionStatus.active ? 'border-blue-300 shadow-blue-50 shadow-md' : ''}`}
      style={{ backgroundColor: 'var(--card-bg)', borderColor: isLeading && electionStatus.active ? undefined : 'var(--border-color)' }}
    >
      {/* Candidate Photo / Avatar */}
      {candidate.photoPath ? (
        <img
          src={getAssetUrl(candidate.photoPath)}
          alt={candidate.name}
          className={`w-20 h-20 rounded-full object-cover mb-3 border-2 shadow-md ${isLeading && electionStatus.active ? 'border-blue-500 shadow-blue-200' : 'border-gray-200'}`}
        />
      ) : (
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-3 ${isLeading && electionStatus.active ? 'bg-blue-100' : 'bg-gray-100'}`}>
          <User className={`w-10 h-10 ${isLeading && electionStatus.active ? 'text-blue-600' : 'text-gray-500'}`} />
        </div>
      )}

      <h3 className="text-xl font-semibold mb-1 text-center" style={{ color: 'var(--text-color)' }}>{candidate.name}</h3>

      {/* Party affiliation */}
      <div className="mb-2">
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 inline-block">
          {candidate.party || 'Independent'}
        </span>
      </div>

      <p className="text-xs mb-4 opacity-50" style={{ color: 'var(--text-color)' }}>Candidate ID: {candidate.id}</p>

      {/* Vote count */}
      <div className="w-full rounded-lg p-4 mb-3 flex justify-between items-center transition-colors" style={{ backgroundColor: 'var(--bg-color)' }}>
        <span className="text-sm font-medium opacity-70" style={{ color: 'var(--text-color)' }}>Votes Received</span>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold" style={{ color: 'var(--text-color)' }}>{candidate.voteCount}</span>
          {totalVotes > 0 && (
            <span className="text-xs font-semibold opacity-50" style={{ color: 'var(--text-color)' }}>({pct}%)</span>
          )}
        </div>
      </div>

      {/* Progress bar — only shown when there are votes */}
      {totalVotes > 0 && (
        <div className="w-full mb-4">
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border-color)' }}>
            <div
              className={`h-full rounded-full transition-all duration-700 ${isLeading ? 'bg-blue-500' : 'bg-gray-300'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Vote Button */}
      <button
        onClick={handleVote}
        disabled={isVotingDisabled}
        className={`w-full py-3 px-4 rounded-lg font-bold flex justify-center items-center gap-2 transition-all
          ${isVotingDisabled
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-100 active:scale-95'}`}
      >
        {hasVoted ? (
          <>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            VOTE CAST
          </>
        ) : !electionStatus.started ? (
          'AWAITING START'
        ) : !electionStatus.active ? (
          'ELECTION ENDED'
        ) : !currentAccount ? (
          'CONNECT WALLET'
        ) : (
          'CAST YOUR VOTE'
        )}
      </button>
    </div>
  );
};

export default CandidateCard;
