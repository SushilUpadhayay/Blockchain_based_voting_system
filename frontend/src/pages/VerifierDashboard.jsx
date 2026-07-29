import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  FileText,
  ScanLine,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  X,
  RotateCw,
  Ban,
} from 'lucide-react';
import API from '../api/api';
import Navbar from '../components/Navbar';
import ConfirmDialog from '../components/ConfirmDialog';
import { useVoting } from '../context/VotingContext';

const VerifierDashboard = () => {
  const { electionId } = useParams();
  const navigate = useNavigate();
  const { approveVoter, syncBlockchain, isLoading: blockchainLoading } = useVoting();

  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [expandedOcrRow, setExpandedOcrRow] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);

  const [dialogConfig, setDialogConfig] = useState({
    isOpen: false,
    userId: null,
    reason: '',
  });
  const [blockDialogConfig, setBlockDialogConfig] = useState({
    isOpen: false,
    userId: null,
  });

  useEffect(() => {
    fetchPendingUsers();
  }, [electionId]);

  const fetchPendingUsers = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/admin/elections/${electionId}/pending-users`);
      setPendingUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch pending users:', err);
      toast.error('Failed to load pending applications.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId, walletAddress) => {
    try {
      setActionLoading(true);
      await approveVoter(electionId, userId, walletAddress);
      fetchPendingUsers();
    } catch (err) {
      // error already shown by context toast
      console.error('Approval error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      await syncBlockchain(electionId);
      await fetchPendingUsers();
    } catch (err) {
      console.error('Sync error:', err);
    }
  };

  const handleOpenRejectDialog = (userId) => {
    setDialogConfig({ isOpen: true, userId, reason: '' });
  };

  const handleOpenBlockDialog = (userId) => {
    setBlockDialogConfig({ isOpen: true, userId });
  };

  const executeReject = async () => {
    const { userId, reason } = dialogConfig;
    setDialogConfig({ isOpen: false, userId: null, reason: '' });

    try {
      setActionLoading(true);
      await API.post(`/admin/elections/${electionId}/reject/${userId}`, { reason });
      toast.success('User registration rejected.');
      fetchPendingUsers();
    } catch (err) {
      console.error('Rejection error:', err);
      toast.error(err.response?.data?.message || 'Rejection failed');
    } finally {
      setActionLoading(false);
    }
  };

  const executeBlock = async () => {
    const { userId } = blockDialogConfig;
    setBlockDialogConfig({ isOpen: false, userId: null });

    try {
      setActionLoading(true);
      await API.post(`/admin/elections/${electionId}/block/${userId}`, {});
      toast.success('Voter blocked for this election.');
      fetchPendingUsers();
    } catch (err) {
      console.error('Block voter error:', err);
      toast.error(err.response?.data?.message || 'Block failed');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300" style={{ backgroundColor: 'var(--bg-color)' }}>
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 lg:p-8">
        <button
          onClick={() => navigate('/elections')}
          className="inline-flex items-center gap-2 text-sm font-medium mb-6 opacity-70 hover:opacity-100 transition-opacity"
          style={{ color: 'var(--text-color)' }}
        >
          <ArrowLeft className="w-4 h-4" /> Back to Election Portal
        </button>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold flex items-center gap-3" style={{ color: 'var(--text-color)' }}>
              <ShieldCheck className="w-8 h-8 text-indigo-600" />
              Registration Verifier Portal (Election #{electionId})
            </h1>
            <p className="text-sm opacity-70 mt-1" style={{ color: 'var(--text-color)' }}>
              Inspect citizenship OCR extractions and authorize eligible voters for this election.
            </p>
          </div>
          <button
            onClick={handleSync}
            disabled={blockchainLoading}
            className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl border bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-all disabled:opacity-50"
            title="Manually sync election state with blockchain"
          >
            <RotateCw className={`w-3.5 h-3.5 ${blockchainLoading ? 'animate-spin' : ''}`} />
            Sync with Blockchain
          </button>
        </div>

        {/* Pending Users Table */}
        <div
          className="rounded-2xl border shadow-xl overflow-hidden"
          style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
        >
          <div className="p-6 border-b flex justify-between items-center" style={{ borderColor: 'var(--border-color)' }}>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-color)' }}>
              Pending Voter Applications ({pendingUsers.length})
            </h2>
            <button
              onClick={fetchPendingUsers}
              className="text-xs font-bold px-3 py-1.5 rounded-lg border hover:bg-black/5 dark:hover:bg-white/5 transition-all"
              style={{ color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
            >
              Refresh List
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm opacity-60">Loading pending applications...</p>
            </div>
          ) : pendingUsers.length === 0 ? (
            <div className="p-12 text-center opacity-60">
              <p className="text-sm">No pending voter applications for this election.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-xs uppercase tracking-wider opacity-60 border-b" style={{ borderColor: 'var(--border-color)', color: 'var(--text-color)' }}>
                    <th className="p-4">Voter Name</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">ID Number</th>
                    <th className="p-4">Wallet Address</th>
                    <th className="p-4">OCR Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-sm" style={{ borderColor: 'var(--border-color)' }}>
                  {pendingUsers.map((u) => {
                    const isOcrOpen = expandedOcrRow === u._id;
                    const ocr = u.ocrData;

                    return (
                      <React.Fragment key={u._id}>
                        <tr className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                          <td className="p-4 font-bold" style={{ color: 'var(--text-color)' }}>{u.name}</td>
                          <td className="p-4 opacity-80" style={{ color: 'var(--text-color)' }}>{u.email}</td>
                          <td className="p-4 font-mono opacity-80" style={{ color: 'var(--text-color)' }}>{u.citizenshipNumber}</td>
                          <td className="p-4 font-mono text-xs opacity-70" style={{ color: 'var(--text-color)' }}>
                            {u.walletAddress ? `${u.walletAddress.slice(0, 6)}...${u.walletAddress.slice(-4)}` : 'Not linked'}
                          </td>
                          <td className="p-4">
                            {ocr?.ocrSuccess ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                <ScanLine className="w-3 h-3" /> OCR Matched ({ocr.confidence}%)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                Manual Review Required
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-right space-x-2">
                            <button
                              onClick={() => setExpandedOcrRow(isOcrOpen ? null : u._id)}
                              className="px-2.5 py-1 text-xs rounded border hover:bg-black/5 dark:hover:bg-white/5"
                              style={{ color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
                            >
                              {isOcrOpen ? <ChevronUp className="w-3.5 h-3.5 inline" /> : <ChevronDown className="w-3.5 h-3.5 inline" />} OCR Info
                            </button>

                            <button
                              onClick={() => handleApprove(u._id, u.walletAddress)}
                              disabled={actionLoading || blockchainLoading || !u.walletAddress}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded transition-all inline-flex items-center gap-1 disabled:opacity-50"
                              title={!u.walletAddress ? 'Voter has no linked wallet' : 'Approve via MetaMask'}
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Approve
                            </button>

                            <button
                              onClick={() => handleOpenRejectDialog(u._id)}
                              disabled={actionLoading}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded transition-all inline-flex items-center gap-1 disabled:opacity-50"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Reject
                            </button>

                            <button
                              onClick={() => handleOpenBlockDialog(u._id)}
                              disabled={actionLoading}
                              className="px-3 py-1 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded transition-all inline-flex items-center gap-1 disabled:opacity-50"
                            >
                              <Ban className="w-3.5 h-3.5" /> Block
                            </button>
                          </td>
                        </tr>

                        {isOcrOpen && (
                          <tr>
                            <td colSpan={6} className="p-4 bg-black/5 dark:bg-white/5 border-b" style={{ borderColor: 'var(--border-color)' }}>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                <div>
                                  <h4 className="font-bold mb-2 text-indigo-600">User Provided Identity:</h4>
                                  <p><strong>Name:</strong> {u.name}</p>
                                  <p><strong>DOB:</strong> {u.dob}</p>
                                  <p><strong>Address:</strong> {u.address}</p>
                                  <p><strong>Citizenship Number:</strong> {u.citizenshipNumber}</p>
                                </div>

                                <div>
                                  <h4 className="font-bold mb-2 text-emerald-600">Extracted Document Data (OCR):</h4>
                                  {ocr?.ocrSuccess ? (
                                    <>
                                      <p><strong>Full Name:</strong> {ocr.fullName || 'N/A'}</p>
                                      <p><strong>Citizenship No:</strong> {ocr.citizenshipNumber || 'N/A'}</p>
                                      <p><strong>District:</strong> {ocr.permanentDistrict || 'N/A'}</p>
                                      <p><strong>Confidence:</strong> {ocr.confidence}%</p>
                                    </>
                                  ) : (
                                    <p className="text-red-500">OCR Extraction Failed: {ocr?.ocrError || 'Unreadable image'}</p>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Reject Dialog */}
        <ConfirmDialog
          isOpen={dialogConfig.isOpen}
          onClose={() => setDialogConfig({ isOpen: false, userId: null, reason: '' })}
          onConfirm={executeReject}
          title="Reject Voter Registration"
          message="Please provide a clear reason for rejecting this voter application:"
          danger
          confirmText="Reject"
          input={{
            label: 'Rejection Reason',
            placeholder: 'e.g. ID document does not match name on roster',
            value: dialogConfig.reason,
            onChange: (val) => setDialogConfig({ ...dialogConfig, reason: val }),
          }}
        />

        {/* Block Dialog */}
        <ConfirmDialog
          isOpen={blockDialogConfig.isOpen}
          onClose={() => setBlockDialogConfig({ isOpen: false, userId: null })}
          onConfirm={executeBlock}
          title="Block this voter?"
          message="They will no longer be able to participate in this election until unblocked."
          danger
          confirmText="Block"
        />
      </main>
    </div>
  );
};

export default VerifierDashboard;
