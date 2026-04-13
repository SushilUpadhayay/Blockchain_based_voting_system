import React from 'react';
import { useVoting } from '../context/VotingContext';
import { User, CheckCircle2 } from 'lucide-react';

const CandidateCard = ({ candidate }) => {
  const { vote, hasVoted, electionStatus, isLoading } = useVoting();

  const handleVote = () => {
    vote(candidate.id);
  };

  const isVotingDisabled = !electionStatus.active || hasVoted || isLoading;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col items-center transition-all hover:shadow-md">
      <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
        <User className="w-8 h-8 text-blue-600" />
      </div>
      
      <h3 className="text-xl font-semibold text-gray-800 mb-1">{candidate.name}</h3>
      <p className="text-gray-500 text-sm mb-6">Candidate ID: {candidate.id}</p>
      
      <div className="w-full flex justify-between items-center bg-gray-50 rounded-lg p-4 mb-6">
        <span className="text-sm text-gray-600 font-medium">Votes Received</span>
        <span className="text-2xl font-bold text-gray-900">{candidate.voteCount}</span>
      </div>

      <button
        onClick={handleVote}
        disabled={isVotingDisabled}
        className={`w-full py-3 px-4 rounded-lg font-medium flex justify-center items-center gap-2 transition-colors
          ${isVotingDisabled 
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow active:scale-95'}`}
      >
        {hasVoted ? (
          <>
            <CheckCircle2 className="w-5 h-5" />
            Vote Cast
          </>
        ) : (
          "Vote for Candidate"
        )}
      </button>
    </div>
  );
};

export default CandidateCard;
