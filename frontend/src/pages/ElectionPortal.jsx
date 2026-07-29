import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Vote,
  Shield,
  PlusCircle,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  Search,
  ExternalLink,
  Award,
} from 'lucide-react';
import API from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useVoting } from '../context/VotingContext';
import Navbar from '../components/Navbar';

const ElectionPortal = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentAccount, connectWallet } = useVoting();
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchElections();
  }, []);

  const fetchElections = async () => {
    try {
      setLoading(true);
      const res = await API.get('/elections');
      setElections(res.data);
    } catch (err) {
      console.error('Failed to fetch elections:', err);
      toast.error('Failed to load elections.');
    } finally {
      setLoading(false);
    }
  };

  const filteredElections = elections.filter((e) =>
    e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.description && e.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusBadge = (status) => {
    switch (status) {
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5" /> DRAFT
          </span>
        );
      case 'registration_open':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <Users className="w-3.5 h-3.5" /> REGISTRATION OPEN
          </span>
        );
      case 'voting_active':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 animate-pulse">
            <CheckCircle2 className="w-3.5 h-3.5" /> VOTING LIVE
          </span>
        );
      case 'ended':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-800 border border-gray-200">
            <Award className="w-3.5 h-3.5" /> ENDED
          </span>
        );
      default:
        return null;
    }
  };

  const getUserRoleInElection = (election) => {
    const userWallet = (currentAccount || user?.walletAddress || '').toLowerCase();
    const savedElectionRole = (user?.adminRoles || []).find(
      (entry) => Number(entry.electionId) === Number(election.electionId)
    )?.role;

    const isSuperAdmin = savedElectionRole === 'superadmin' || (userWallet && (election.superAdmin || '').toLowerCase() === userWallet);
    const isVerifier = savedElectionRole === 'verifier' || (userWallet && (election.verifiers || []).map((v) => v.toLowerCase()).includes(userWallet));

    if (isSuperAdmin) return { role: 'Super Admin', color: 'bg-purple-100 text-purple-800 border-purple-200' };
    if (isVerifier) return { role: 'Registration Verifier', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' };
    return null;
  };

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300" style={{ backgroundColor: 'var(--bg-color)' }}>
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 lg:p-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3" style={{ color: 'var(--text-color)' }}>
              <Vote className="w-8 h-8 text-indigo-600" />
              Election Portal
            </h1>
            <p className="text-sm opacity-70 mt-1" style={{ color: 'var(--text-color)' }}>
              Browse active, upcoming, and past decentralised elections across the network.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {currentAccount ? (
              <button
                onClick={() => navigate('/elections/create')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg hover:shadow-indigo-500/25 transition-all flex items-center gap-2 text-sm"
              >
                <PlusCircle className="w-4 h-4" /> Create Election
              </button>
            ) : (
              <button
                onClick={connectWallet}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg transition-all text-sm"
              >
                Connect Wallet to Create
              </button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-8 max-w-md">
          <Search className="w-5 h-5 absolute left-3.5 top-3 opacity-40" style={{ color: 'var(--text-color)' }} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search elections by title or keyword..."
            className="w-full pl-11 pr-4 py-2.5 rounded-xl border text-sm outline-none transition-all"
            style={{
              backgroundColor: 'var(--card-bg)',
              color: 'var(--text-color)',
              borderColor: 'var(--border-color)',
            }}
          />
        </div>

        {/* Elections Grid */}
        {loading ? (
          <div className="flex items-center justify-center p-16">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredElections.length === 0 ? (
          <div
            className="p-12 text-center rounded-2xl border border-dashed flex flex-col items-center justify-center"
            style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
          >
            <Sparkles className="w-12 h-12 opacity-30 mb-3" style={{ color: 'var(--text-color)' }} />
            <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--text-color)' }}>No Elections Found</h3>
            <p className="text-sm opacity-60 max-w-md mb-6" style={{ color: 'var(--text-color)' }}>
              No elections match your criteria. Create a new election to get started.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredElections.map((election) => {
              const userRoleInfo = getUserRoleInElection(election);

              return (
                <div
                  key={election.electionId}
                  className="rounded-2xl border p-6 flex flex-col justify-between shadow-md hover:shadow-xl transition-all relative overflow-hidden"
                  style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-black/5 dark:bg-white/10" style={{ color: 'var(--text-color)' }}>
                        #ID-{election.electionId}
                      </span>
                      {getStatusBadge(election.status)}
                    </div>

                    <h3 className="text-xl font-bold mb-2 line-clamp-1" style={{ color: 'var(--text-color)' }}>
                      {election.title}
                    </h3>
                    <p className="text-sm opacity-70 mb-4 line-clamp-2" style={{ color: 'var(--text-color)' }}>
                      {election.description || 'No description provided.'}
                    </p>

                    {userRoleInfo && (
                      <div className="mb-4">
                        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-md border ${userRoleInfo.color}`}>
                          <Shield className="w-3 h-3" /> {userRoleInfo.role}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-black/5 dark:border-white/5 flex flex-col gap-2">
                    {/* Role-specific Navigation Links */}
                    {userRoleInfo?.role === 'Super Admin' && (
                      <button
                        onClick={() => navigate(`/elections/${election.electionId}/admin`)}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 rounded-xl text-sm transition-all flex items-center justify-center gap-2"
                      >
                        Super Admin Panel <ArrowRight className="w-4 h-4" />
                      </button>
                    )}

                    {userRoleInfo?.role === 'Registration Verifier' && (
                      <button
                        onClick={() => navigate(`/elections/${election.electionId}/verifier`)}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-xl text-sm transition-all flex items-center justify-center gap-2"
                      >
                        Verifier Portal <ArrowRight className="w-4 h-4" />
                      </button>
                    )}

                    {election.status === 'voting_active' && (
                      <button
                        onClick={() => navigate(`/elections/${election.electionId}/voting`)}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                      >
                        Enter Voting Ballot <Vote className="w-4 h-4" />
                      </button>
                    )}

                    {election.status === 'ended' && (
                      <button
                        onClick={() => navigate(`/elections/${election.electionId}/results`)}
                        className="w-full bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 rounded-xl text-sm transition-all flex items-center justify-center gap-2"
                      >
                        View Official Results <Award className="w-4 h-4" />
                      </button>
                    )}

                    {election.inviteToken && election.status === 'registration_open' && (
                      <a
                        href={`/register?token=${election.inviteToken}`}
                        className="w-full bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 border border-blue-200"
                      >
                        Registration Invite Link <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default ElectionPortal;
