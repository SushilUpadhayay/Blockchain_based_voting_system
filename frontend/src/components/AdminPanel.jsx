import React, { useState } from 'react';
import { useVoting } from '../context/VotingContext';
import { UserPlus, Plus, PlayCircle, StopCircle, Shield } from 'lucide-react';

const AdminPanel = () => {
  const {
    electionStatus,
    isLoading,
    addCandidate,
    authorizeVoter,
    startElection,
    endElection,
  } = useVoting();

  const [candidateName, setCandidateName] = useState('');
  const [voterAddress, setVoterAddress] = useState('');

  const handleAddCandidate = async (e) => {
    e.preventDefault();
    const name = candidateName.trim();
    if (!name) return;
    await addCandidate(name);
    setCandidateName('');
  };

  const handleAuthorizeVoter = async (e) => {
    e.preventDefault();
    const addr = voterAddress.trim();
    if (!addr) return;
    await authorizeVoter(addr);
    setVoterAddress('');
  };

  return (
    <div className="rounded-2xl p-6 shadow-sm mb-8 border transition-colors" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
          <Shield className="w-4 h-4 text-white" />
        </div>
        <h2 className="text-lg font-bold" style={{ color: 'var(--text-color)' }}>Admin Panel</h2>
        <span className="ml-auto text-xs font-semibold px-2 py-1 rounded-full opacity-70" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}>
          Admin Only
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Add Candidate */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--text-color)' }}>
            Add Candidate
          </label>
          <form onSubmit={handleAddCandidate} className="flex gap-2">
            <input
              type="text"
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              placeholder="Candidate name"
              disabled={electionStatus.started || isLoading}
              className="flex-1 px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
            />
            <button
              type="submit"
              disabled={!candidateName.trim() || electionStatus.started || isLoading}
              className="flex items-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 
                         text-white text-sm font-medium rounded-lg transition-colors 
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </form>
          {electionStatus.started && (
            <p className="text-xs text-yellow-600">
              ⚠ Election already started — no new candidates allowed.
            </p>
          )}
        </div>

        {/* Authorize Voter */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--text-color)' }}>
            Authorize Voter
          </label>
          <form onSubmit={handleAuthorizeVoter} className="flex gap-2">
            <input
              type="text"
              value={voterAddress}
              onChange={(e) => setVoterAddress(e.target.value)}
              placeholder="0x... wallet address"
              disabled={isLoading}
              className="flex-1 px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-colors font-mono"
              style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
            />
            <button
              type="submit"
              disabled={!voterAddress.trim() || isLoading}
              className="flex items-center gap-1 px-3 py-2 bg-green-600 hover:bg-green-700 
                         text-white text-sm font-medium rounded-lg transition-colors 
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <UserPlus className="w-4 h-4" />
              Auth
            </button>
          </form>
        </div>
      </div>

      {/* Election Controls */}
      <div className="mt-6 pt-6 border-t flex items-center gap-3 flex-wrap" style={{ borderColor: 'var(--border-color)' }}>
        <span className="text-sm font-semibold mr-2" style={{ color: 'var(--text-color)' }}>
          Election Control:
        </span>

        {!electionStatus.started ? (
          <button
            onClick={startElection}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 
                       text-white text-sm font-medium rounded-lg transition-colors 
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PlayCircle className="w-4 h-4" />
            Start Election
          </button>
        ) : electionStatus.active ? (
          <button
            onClick={endElection}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 
                       text-white text-sm font-medium rounded-lg transition-colors 
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <StopCircle className="w-4 h-4" />
            End Election
          </button>
        ) : (
          <span className="text-sm text-gray-500">Election has ended.</span>
        )}

        <div className="ml-auto text-xs text-gray-400">
          Status: {!electionStatus.started ? '⬜ Not Started' : electionStatus.active ? '🟢 Active' : '🔴 Ended'}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
