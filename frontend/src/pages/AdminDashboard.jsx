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

const AdminDashboard = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [candidateName, setCandidateName] = useState('');
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
      if (!window.confirm("Are you sure you want to reject this user?")) return;
      await API.post(`/admin/reject/${id}`);
      toast.success('User rejected from system');
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject user');
    }
  };

  const handleStartElection = async () => {
    try {
      setLoading(true);
      const toastId = toast.loading('Broadcasting start command...');
      await API.post('/admin/start-election');
      toast.success('Election is now LIVE on blockchain', { id: toastId });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to start election');
    } finally {
      setLoading(false);
    }
  };

  const handleEndElection = async () => {
    try {
      setLoading(true);
      const toastId = toast.loading('Broadcasting end command...');
      await API.post('/admin/end-election');
      toast.success('Election has been CLOSED', { id: toastId });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to end election');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCandidate = async (e) => {
    e.preventDefault();
    if (!candidateName.trim()) {
      toast.error('Candidate name is required');
      return;
    }
    try {
      setLoading(true);
      const toastId = toast.loading('Adding candidate to ledger...');
      await API.post('/admin/add-candidate', { name: candidateName });
      toast.success(`${candidateName} added as a candidate`, { id: toastId });
      setCandidateName('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Blockchain transaction failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
              <ShieldCheck className="text-blue-600 w-8 h-8" />
              Admin Control Panel
            </h1>
            <p className="mt-2 text-gray-500">Manage election configurations and voter approvals</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={fetchUsers}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className={`w-5 h-5 text-gray-400 ${fetching ? 'animate-spin' : ''}`} />
            </button>
            <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-semibold border border-blue-100">
              Network: Local Hardhat
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* SEC B: ELECTION CONTROL */}
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Play className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Election Status</h2>
            </div>
            <div className="space-y-4">
              <button
                onClick={handleStartElection}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-blue-200"
              >
                <Play className="w-4 h-4" />
                Start Election
              </button>
              <button
                onClick={handleEndElection}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-white hover:bg-red-50 border-2 border-red-100 text-red-600 disabled:opacity-50 font-bold py-3 px-4 rounded-xl transition-all"
              >
                <Square className="w-4 h-4" />
                End Election
              </button>
            </div>
            <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <p className="text-xs text-gray-500 leading-relaxed italic">
                * Starting the election freezes candidate list and opens voting. Closing ends all activity.
              </p>
            </div>
          </section>

          {/* SEC C: CANDIDATE MANAGEMENT */}
          <section className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-green-50 rounded-lg">
                <UserPlus className="w-5 h-5 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Candidate Enrollment</h2>
            </div>
            <form onSubmit={handleAddCandidate} className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Enter full name of candidate"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  className="w-full border border-gray-200 p-3 pl-4 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all text-gray-700"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !candidateName.trim()}
                className="bg-gray-900 hover:bg-black disabled:opacity-50 text-white font-bold py-3 px-8 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Add to Ballot
              </button>
            </form>
            <div className="mt-8 flex items-start gap-3 p-4 bg-blue-50 rounded-xl">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
              <p className="text-sm text-blue-800">
                Candidates must be added <strong>before</strong> the election starts. Blockchain entries are immutable.
              </p>
            </div>
          </section>
        </div>

        {/* SEC A: PENDING USERS */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Voter Verification Requests</h2>
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
                <tbody className="bg-white divide-y divide-gray-50">
                  {users.map((u) => (
                    <tr key={u._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-semibold text-gray-900">{u.name}</div>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-600">{u.email}</td>
                      <td className="py-4 px-6 text-sm font-mono text-gray-600">{u.idNumber}</td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2 text-xs font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded-md w-fit">
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
                            className="bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white p-2 rounded-lg transition-all shadow-md shadow-rose-100"
                            title="Reject Applicant"
                          >
                            <XCircle className="w-5 h-5" />
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
