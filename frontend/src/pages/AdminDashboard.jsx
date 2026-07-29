import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Users,
  Play,
  Square,
  UserCheck,
  UserMinus,
  ArrowLeft,
  Settings,
  ShieldCheck,
  Award,
  AlertCircle,
  ExternalLink,
  RotateCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useVoting } from '../context/VotingContext';
import API from '../api/api';
import Navbar from '../components/Navbar';

const AdminDashboard = () => {
  const { electionId: routeElectionId } = useParams();
  const electionId = Number(routeElectionId || 1);
  const navigate = useNavigate();

  const { user } = useAuth();
  const {
    removeVerifier,
    startElection,
    endElection,
    syncBlockchain,
    electionStatus,
    isLoading: blockchainLoading,
    candidates,
    loadCandidates,
  } = useVoting();

  const [electionInfo, setElectionInfo] = useState(null);
  const [candidateList, setCandidateList] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchElectionDetails();
    fetchCandidates();
  }, [electionId]);

  const fetchElectionDetails = async () => {
    try {
      const res = await API.get(`/elections/${electionId}`);
      setElectionInfo(res.data);
    } catch (err) {
      console.error('Failed to fetch election details:', err);
    }
  };

  const fetchCandidates = async () => {
    try {
      const res = await API.get(`/elections/${electionId}/candidates`);
      if (Array.isArray(res.data)) {
        setCandidateList(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch candidates list:', err);
    }
  };

  const handleRemoveVerifier = async (address) => {
    try {
      setLoading(true);
      await removeVerifier(electionId, address);
      fetchElectionDetails();
    } catch (err) {
      // error already shown by context toast
      console.error('Remove verifier error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      const result = await syncBlockchain(electionId);
      if (result) {
        fetchElectionDetails();
        fetchCandidates();
      }
    } catch (err) {
      console.error('Sync error:', err);
    }
  };

  const isDraft = electionInfo?.status === 'draft';

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300" style={{ backgroundColor: 'var(--bg-color)' }}>
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 lg:p-8 space-y-8">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/elections')}
            className="inline-flex items-center gap-2 text-sm font-medium opacity-70 hover:opacity-100 transition-opacity"
            style={{ color: 'var(--text-color)' }}
          >
            <ArrowLeft className="w-4 h-4" /> Back to Election Portal
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSync}
              disabled={blockchainLoading || loading}
              className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-xl border bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-all disabled:opacity-50"
              title="Manually sync election state with blockchain"
            >
              <RotateCw className={`w-3.5 h-3.5 ${blockchainLoading ? 'animate-spin' : ''}`} />
              Sync with Blockchain
            </button>
            <Link
              to={`/elections/${electionId}/setup`}
              className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 transition-all"
            >
              <Settings className="w-3.5 h-3.5" /> Manage Setup Checklist
            </Link>
          </div>
        </div>

        {/* Setup In-Progress Banner (If status === 'draft') */}
        {isDraft && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  Election Setup is Currently in Draft Mode
                </h3>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                  Complete candidate entry, roster import, and verifier invitations on the Setup Checklist page before opening registration.
                </p>
              </div>
            </div>
            <Link
              to={`/elections/${electionId}/setup`}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2 rounded-xl flex-shrink-0 transition-all shadow"
            >
              Go to Setup Checklist →
            </Link>
          </div>
        )}

        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-black/5 dark:border-white/5">
          <div>
            <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950 px-2.5 py-1 rounded">
              Election Administrator Console (Election #{electionId})
            </span>
            <h1 className="text-3xl font-extrabold mt-1" style={{ color: 'var(--text-color)' }}>
              {electionInfo?.title || `Election #${electionId}`}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {!electionStatus.started ? (
              <button
                onClick={() => startElection(electionId)}
                disabled={blockchainLoading || loading || isDraft}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg hover:shadow-emerald-500/25 transition-all text-sm flex items-center gap-2"
                title={isDraft ? 'Open registration first' : 'Start election voting period'}
              >
                <Play className="w-4 h-4" /> Start Election
              </button>
            ) : electionStatus.active ? (
              <button
                onClick={() => endElection(electionId)}
                disabled={blockchainLoading || loading}
                className="bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg hover:shadow-red-500/25 transition-all text-sm flex items-center gap-2"
              >
                <Square className="w-4 h-4" /> End Election
              </button>
            ) : (
              <span className="px-4 py-2 bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-bold text-sm rounded-xl">
                ELECTION CONCLUDED
              </span>
            )}
          </div>
        </div>

        {/* Overview Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Accepted Registration Verifiers Card */}
          <div className="rounded-2xl border p-6 shadow-md" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-color)' }}>
                <UserCheck className="w-5 h-5 text-purple-600" /> Authorized Verifiers
              </h3>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                {(electionInfo?.verifiers || []).length} On-Chain
              </span>
            </div>
            <p className="text-xs opacity-70 mb-4" style={{ color: 'var(--text-color)' }}>
              Wallet addresses authorized on-chain to verify OCR citizenship documents for this election.
            </p>

            {(electionInfo?.verifiers || []).length === 0 ? (
              <div className="text-xs opacity-60 p-4 text-center rounded-xl bg-black/5 dark:bg-white/5">
                No verifiers have accepted invitations yet.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {electionInfo.verifiers.map((v) => (
                  <div key={v} className="flex items-center justify-between p-2.5 rounded-xl bg-black/5 dark:bg-white/5 text-xs font-mono">
                    <span className="truncate max-w-[240px]">{v}</span>
                    <button
                      onClick={() => handleRemoveVerifier(v)}
                      disabled={loading}
                      className="text-red-500 hover:text-red-700 p-1 transition-colors"
                      title="Remove verifier from blockchain"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Candidates Read-Only Overview Card */}
          <div className="rounded-2xl border p-6 shadow-md" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-color)' }}>
                <Award className="w-5 h-5 text-emerald-600" /> Election Candidates
              </h3>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                {(candidateList || []).length} Registered
              </span>
            </div>

            {(candidateList || []).length === 0 ? (
              <div className="text-xs opacity-60 p-4 text-center rounded-xl bg-black/5 dark:bg-white/5">
                No candidates added yet. Add candidates in the <Link to={`/elections/${electionId}/setup`} className="text-indigo-600 font-bold underline">Setup Checklist</Link>.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {candidateList.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-2.5 rounded-xl bg-black/5 dark:bg-white/5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[10px]">
                        {c.id}
                      </span>
                      <span className="font-bold">{c.name}</span>
                    </div>
                    <span className="opacity-60">{c.party || 'Independent'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
