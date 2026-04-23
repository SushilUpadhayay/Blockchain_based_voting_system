import React from 'react';
import { useVoting } from '../context/VotingContext';
import { User, CheckCircle2 } from 'lucide-react';

const CandidateCard = ({ candidate }) => {
  const { vote, hasVoted, electionStatus, isLoading, currentAccount } = useVoting();

  const handleVote = () => {
    vote(candidate.id);
  };

  const isVotingDisabled = !electionStatus.active || hasVoted || isLoading;

  return (
    <div className="rounded-xl shadow-sm border p-6 flex flex-col items-center transition-all hover:shadow-md" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
      <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
        <User className="w-8 h-8 text-blue-600" />
      </div>
      
      <h3 className="text-xl font-semibold mb-1" style={{ color: 'var(--text-color)' }}>{candidate.name}</h3>
      <p className="text-sm mb-6 opacity-70" style={{ color: 'var(--text-color)' }}>Candidate ID: {candidate.id}</p>
      
      <div className="w-full flex justify-between items-center rounded-lg p-4 mb-6 transition-colors" style={{ backgroundColor: 'var(--bg-color)' }}>
        <span className="text-sm font-medium opacity-70" style={{ color: 'var(--text-color)' }}>Votes Received</span>
        <span className="text-2xl font-bold" style={{ color: 'var(--text-color)' }}>{candidate.voteCount}</span>
      </div>

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
          "AWAITING START"
        ) : !electionStatus.active ? (
          "ELECTION ENDED"
        ) : !currentAccount ? (
          "CONNECT WALLET TO VOTE"
        ) : (
          "CAST YOUR VOTE"
        )}
      </button>
    </div>
  );
};

export default CandidateCard;
