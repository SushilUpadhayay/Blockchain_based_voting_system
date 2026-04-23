import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  Users, 
  Play, 
  Square, 
  UserPlus, 
  CheckCircle, 
  XCircle, 
  ShieldCheck, 
  AlertCircle,
  RefreshCw,
  Wallet
} from 'lucide-react';
import API from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useVoting } from '../context/VotingContext';
import ThemeToggle from '../components/ThemeToggle';

const AdminDashboard = () => {
  const { user } = useAuth();
  const { 
    addCandidate, 
    startElection, 
    endElection, 
    authorizeVoter,
    electionStatus, 
    isLoading: blockchainLoading,
    candidates,
    currentAccount,
    connectWallet
  } = useVoting();

  const [users, setUsers] = useState([]);
  const [candidateName, setCandidateName] = useState('');
  const [voterAddress, setVoterAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers();
    }
  }, [user]);

  if (user?.role !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  const fetchUsers = async () => {
    setFetching(true);
    try {
      const res = await API.get('/admin/pending-users');
      setUsers(res.data);
    } catch (error) {
      toast.error('Failed to fetch pending users');
    } finally {
      setFetching(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      setLoading(true);
      const toastId = toast.loading('Registering voter on blockchain...');
      await API.post(`/admin/approve/${id}`);
      toast.success('User approved and registered on blockchain', { id: toastId });
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Blockchain registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (id) => {
    try {
      const reason = window.prompt("Please provide a reason for rejection:");
      if (!reason) return; // Cancel if no reason provided

      setLoading(true);
      await API.post(`/admin/reject/${id}`, { reason });
      toast.success('User rejected with reason');
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject user');
    } finally {
      setLoading(false);
    }
  };

  const handleBlock = async (id) => {
    try {
      if (!window.confirm("Are you sure you want to PERMANENTLY BLOCK this user? They will be barred from the system forever.")) return;
      
      setLoading(true);
      await API.post(`/admin/block/${id}`);
      toast.success('User permanently blocked');
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to block user');
    } finally {
      setLoading(false);
    }
  };

  const handleAuthorizeVoter = async (e) => {
    e.preventDefault();
    const addr = voterAddress.trim();
    if (!addr.startsWith('0x') || addr.length !== 42) {
      return toast.error('Please enter a valid Ethereum wallet address');
    }
    await authorizeVoter(addr);
    setVoterAddress('');
  };

  const handleStartElection = async () => {
    if (candidates.length === 0) {
      return toast.error('Please add at least one candidate first.');
    }
    await startElection();
  };

  const handleEndElection = async () => {
    if (!window.confirm("Confirm closing the election? No more votes can be cast.")) return;
    await endElection();
  };

  const handleAddCandidate = async (e) => {
    e.preventDefault();
    if (!candidateName.trim()) {
      return toast.error('Candidate name is required');
    }
    await addCandidate(candidateName.trim());
    setCandidateName('');
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300" style={{ backgroundColor: 'var(--bg-color)' }}>
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-8 rounded-2xl shadow-sm border transition-colors duration-300"
             style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
          <div>
            <h1 className="text-3xl font-extrabold flex items-center gap-3" style={{ color: 'var(--text-color)' }}>
              <ShieldCheck className="text-blue-600 w-8 h-8" />
              Admin Control Panel
            </h1>
            <div className="mt-2 flex items-center gap-4">
              <p className="text-sm opacity-70" style={{ color: 'var(--text-color)' }}>Manage election configurations and voter approvals</p>
              <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 border ${
                !electionStatus.started ? 'bg-gray-100 text-gray-600 border-gray-200' :
                electionStatus.active ? 'bg-green-100 text-green-700 border-green-200 animate-pulse' :
                'bg-red-100 text-red-700 border-red-200'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  !electionStatus.started ? 'bg-gray-400' :
                  electionStatus.active ? 'bg-green-600' : 'bg-red-600'
                }`} />
                {!electionStatus.started ? 'NOT STARTED' : electionStatus.active ? 'LIVE' : 'ENDED'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {currentAccount ? (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl border transition-colors"
                   style={{ backgroundColor: 'var(--bg-color)', borderColor: 'var(--border-color)' }}>
                <Wallet className="w-4 h-4 opacity-50" style={{ color: 'var(--text-color)' }} />
                <span className="text-xs font-mono opacity-70" style={{ color: 'var(--text-color)' }}>
                  {currentAccount.slice(0, 6)}...{currentAccount.slice(-4)}
                </span>
                <span className="ml-2 w-2 h-2 bg-green-500 rounded-full" />
              </div>
            ) : (
              <button 
                onClick={connectWallet}
                className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-lg shadow-amber-100"
              >
                <Wallet className="w-4 h-4" />
                Connect Admin Wallet
              </button>
            )}
            <button 
              onClick={fetchUsers}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className={`w-5 h-5 text-gray-400 ${fetching ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* SEC B: ELECTION CONTROL */}
          <section className="p-6 rounded-2xl shadow-sm border hover:shadow-md transition-all"
                   style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Play className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-color)' }}>Election Control</h2>
            </div>
            <div className="space-y-4">
              <button
                onClick={handleStartElection}
                disabled={blockchainLoading || electionStatus.started || !currentAccount}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-blue-200"
              >
                <Play className="w-4 h-4" />
                {electionStatus.started ? 'Election Started' : 'Start Election'}
              </button>
              <button
                onClick={handleEndElection}
                disabled={blockchainLoading || !electionStatus.active || !currentAccount}
                className="w-full flex items-center justify-center gap-2 bg-white hover:bg-red-50 border-2 border-red-100 text-red-600 disabled:opacity-50 font-bold py-3 px-4 rounded-xl transition-all"
              >
                <Square className="w-4 h-4" />
                {!electionStatus.started ? 'End Election' : !electionStatus.active ? 'Closed' : 'End Election'}
              </button>
            </div>
            {!currentAccount && (
              <p className="mt-4 text-xs text-amber-600 text-center font-medium">
                Wallet connection required for admin actions
              </p>
            )}
          </section>

          {/* SEC D: MANUAL AUTHORIZATION */}
          <section className="p-6 rounded-2xl shadow-sm border hover:shadow-md transition-all"
                   style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-amber-50 rounded-lg">
                <ShieldCheck className="w-5 h-5 text-amber-600" />
              </div>
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-color)' }}>Manual Authorization</h2>
            </div>
            <form onSubmit={handleAuthorizeVoter} className="space-y-4">
              <div>
                <label className="block text-xs font-bold opacity-50 uppercase tracking-widest mb-2" style={{ color: 'var(--text-color)' }}>Wallet Address</label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={voterAddress}
                  onChange={(e) => setVoterAddress(e.target.value)}
                  disabled={blockchainLoading || !currentAccount}
                  className="w-full border p-3 rounded-xl outline-none focus:ring-4 focus:ring-amber-100 focus:border-amber-400 transition-all text-sm font-mono"
                  style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
                />
              </div>
              <button
                type="submit"
                disabled={blockchainLoading || !voterAddress.trim() || !currentAccount}
                className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-amber-100 flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Authorize Voter
              </button>
            </form>
            <p className="mt-4 text-xs text-gray-400 leading-relaxed italic">
              * Bypass the registration workflow by manually white-listing a wallet address.
            </p>
          </section>

          {/* SEC C: CANDIDATE MANAGEMENT */}
          <section className="lg:col-span-2 p-6 rounded-2xl shadow-sm border hover:shadow-md transition-all"
                   style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-green-50 rounded-lg">
                <UserPlus className="w-5 h-5 text-green-600" />
              </div>
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-color)' }}>Candidate Enrollment</h2>
              <span className="ml-auto text-xs font-bold opacity-50 px-2 py-1 rounded" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}>
                Current: {candidates.length}
              </span>
            </div>
            
            {electionStatus.started ? (
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-3 text-gray-500">
                <AlertCircle className="w-5 h-5" />
                <p className="text-sm">Candidate enrollment is <strong>locked</strong> once election has started.</p>
              </div>
            ) : (
              <form onSubmit={handleAddCandidate} className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Enter full name of candidate"
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    disabled={blockchainLoading || electionStatus.started || !currentAccount}
                    className="w-full border p-3 pl-4 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all"
                    style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={blockchainLoading || electionStatus.started || !candidateName.trim() || !currentAccount}
                  className="bg-gray-900 hover:bg-black disabled:opacity-50 text-white font-bold py-3 px-8 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  Add to Ballot
                </button>
              </form>
            )}

            <div className="mt-8 flex items-start gap-3 p-4 bg-blue-50 rounded-xl">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
              <p className="text-sm text-blue-800">
                Candidates must be added <strong>before</strong> starting the election. Every name is permanently recorded on the blockchain.
              </p>
            </div>
          </section>
        </div>

        {/* SEC A: PENDING USERS */}
        <section className="rounded-2xl shadow-sm border overflow-hidden transition-all"
                 style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
          <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-color)' }}>Voter Verification Requests</h2>
            </div>
            <span className="bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              {users.length} Pending
            </span>
          </div>

          <div className="overflow-x-auto">
            {users.length === 0 ? (
              <div className="py-20 text-center">
                <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="text-gray-300 w-8 h-8" />
                </div>
                <h3 className="text-gray-900 font-medium text-lg">All caught up!</h3>
                <p className="text-gray-500">No pending voter approvals at the moment.</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-4 px-6 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Applicant</th>
                    <th className="py-4 px-6 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Contact Info</th>
                    <th className="py-4 px-6 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">ID Number</th>
                    <th className="py-4 px-6 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Blockchain Wallet</th>
                    <th className="py-4 px-6 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Decision</th>
                  </tr>
                </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
                    {users.map((u) => (
                      <tr key={u._id} className="hover:opacity-80 transition-colors">
                        <td className="py-4 px-6">
                          <div className="font-semibold" style={{ color: 'var(--text-color)' }}>{u.name}</div>
                        </td>
                        <td className="py-4 px-6 text-sm opacity-70" style={{ color: 'var(--text-color)' }}>{u.email}</td>
                        <td className="py-4 px-6 text-sm font-mono opacity-70" style={{ color: 'var(--text-color)' }}>{u.idNumber}</td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2 text-xs font-mono opacity-50 px-2 py-1 rounded-md w-fit"
                               style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}>
                            <Wallet className="w-3 h-3" />
                            {u.walletAddress ? `${u.walletAddress.slice(0, 6)}...${u.walletAddress.slice(-4)}` : 'N/A'}
                          </div>
                        </td>
                      <td className="py-4 px-6">
                        <div className="flex justify-center items-center gap-3">
                          <button
                            onClick={() => handleApprove(u._id)}
                            disabled={loading || !u.walletAddress}
                            className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white p-2 rounded-lg transition-all shadow-md shadow-emerald-100"
                            title="Approve & Register"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleReject(u._id)}
                            disabled={loading}
                            className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white p-2 rounded-lg transition-all shadow-md shadow-orange-100"
                            title="Reject Applicant"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleBlock(u._id)}
                            disabled={loading}
                            className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white p-2 rounded-lg transition-all shadow-md shadow-rose-200"
                            title="Permanently Block"
                          >
                            <AlertCircle className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminDashboard;
