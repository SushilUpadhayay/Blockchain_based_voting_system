import React from 'react';
import { useVoting } from '../context/VotingContext';
import CandidateCard from './CandidateCard';
import { Wallet, Activity, RefreshCw } from 'lucide-react';

const Dashboard = () => {
  const { currentAccount, connectWallet, candidates, electionStatus, loadCandidates, isLoading } = useVoting();

  const handleRefresh = () => {
    loadCandidates();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Activity className="text-white w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-gray-900">VoteChain</span>
        </div>
        
        {currentAccount ? (
          <div className="flex items-center gap-3 bg-gray-100 px-4 py-2 rounded-full border border-gray-200">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-sm font-medium text-gray-700">
              {currentAccount.slice(0, 6)}...{currentAccount.slice(-4)}
            </span>
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
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 lg:p-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Live Election</h1>
            <p className="text-gray-500">Cast your vote securely on the blockchain. One wallet, one vote.</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className={`px-4 py-2 rounded-lg text-sm font-medium border flex items-center gap-2
              ${electionStatus.active 
                ? 'bg-green-50 text-green-700 border-green-200' 
                : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}
            >
              <div className={`w-2 h-2 rounded-full ${electionStatus.active ? 'bg-green-600 animate-pulse' : 'bg-yellow-600'}`}></div>
              {electionStatus.active ? 'Voting Active' : 'Voting Inactive'}
            </div>
            
            <button 
              onClick={handleRefresh}
              disabled={isLoading}
              className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 bg-white shadow-sm"
              title="Refresh Results"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Candidates Grid */}
        {!currentAccount ? (
          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-dashed border-gray-300">
            <Wallet className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Wallet Required</h3>
            <p className="text-gray-500 text-center max-w-md mb-6">
              Please connect your MetaMask wallet to view candidates and cast your vote.
            </p>
            <button
              onClick={connectWallet}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Connect MetaMask
            </button>
          </div>
        ) : candidates.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-2xl border border-gray-200">
            <p className="text-gray-500">No candidates found for this election.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {candidates.map((candidate) => (
              <CandidateCard key={candidate.id} candidate={candidate} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
