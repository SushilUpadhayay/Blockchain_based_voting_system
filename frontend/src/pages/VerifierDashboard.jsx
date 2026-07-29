import React, { useState, useEffect, useMemo } from 'react';
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
  Eye,
  Search,
  Filter,
  SlidersHorizontal,
  AlertTriangle,
  FileQuestion,
  Check,
  RotateCcw
} from 'lucide-react';
import API from '../api/api';
import Navbar from '../components/Navbar';
import ConfirmDialog from '../components/ConfirmDialog';
import VerificationReviewModal from '../components/VerificationReviewModal';
import { useVoting } from '../context/VotingContext';

const VerifierDashboard = () => {
  const { electionId } = useParams();
  const navigate = useNavigate();
  const { approveVoter, syncBlockchain, isLoading: blockchainLoading } = useVoting();

  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [expandedOcrRow, setExpandedOcrRow] = useState(null);
  const [selectedVoterForReview, setSelectedVoterForReview] = useState(null);

  // Search, Filter, and Sort states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, NO_ISSUES, HAS_ISSUES, EXCEL_MISSING, OCR_MISSING
  const [sortBy, setSortBy] = useState('NAME_ASC'); // NAME_ASC, NAME_DESC, MATCHES_DESC, MISMATCHES_DESC, DATE_DESC

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

  // Helper to get voter verification status category (NO_ISSUES, HAS_ISSUES, EXCEL_MISSING, OCR_MISSING)
  const getVoterStatusCategory = (voter) => {
    const ver = voter?.verification;
    if (!ver) return 'OCR_MISSING';

    const { excelFound, ocrFound, summary = {}, issues = [] } = ver;

    if (!excelFound && !ocrFound) return 'EXCEL_AND_OCR_MISSING';
    if (!excelFound) return 'EXCEL_MISSING';
    if (!ocrFound) return 'OCR_MISSING';

    if (issues.length > 0 || (summary.mismatches || 0) > 0 || (summary.missing || 0) > 0) {
      return 'HAS_ISSUES';
    }

    return 'NO_ISSUES';
  };

  // Memoized Metric Statistics
  const dashboardStats = useMemo(() => {
    let total = pendingUsers.length;
    let noIssues = 0;
    let hasIssues = 0;
    let excelMissing = 0;
    let ocrMissing = 0;

    for (const user of pendingUsers) {
      const ver = user.verification || {};
      const cat = getVoterStatusCategory(user);

      if (cat === 'NO_ISSUES') {
        noIssues++;
      } else if (cat === 'HAS_ISSUES') {
        hasIssues++;
      }

      if (!ver.excelFound) {
        excelMissing++;
      }
      if (!ver.ocrFound) {
        ocrMissing++;
      }
    }

    return { total, noIssues, hasIssues, excelMissing, ocrMissing };
  }, [pendingUsers]);

  // Memoized Filtering, Searching & Sorting
  const processedUsers = useMemo(() => {
    return pendingUsers
      .filter((user) => {
        // Search Filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const nameMatch = (user.name || '').toLowerCase().includes(q);
          const emailMatch = (user.email || '').toLowerCase().includes(q);
          const idMatch = (user.citizenshipNumber || '').toLowerCase().includes(q);
          const empMatch = (user.employeeId || '').toLowerCase().includes(q);

          if (!nameMatch && !emailMatch && !idMatch && !empMatch) {
            return false;
          }
        }

        // Status Filter
        const ver = user.verification || {};
        const cat = getVoterStatusCategory(user);

        if (filterStatus === 'NO_ISSUES' && cat !== 'NO_ISSUES') return false;
        if (filterStatus === 'HAS_ISSUES' && cat !== 'HAS_ISSUES') return false;
        if (filterStatus === 'EXCEL_MISSING' && ver.excelFound) return false;
        if (filterStatus === 'OCR_MISSING' && ver.ocrFound) return false;

        return true;
      })
      .sort((a, b) => {
        const aVer = a.verification || {};
        const bVer = b.verification || {};
        const aMatches = aVer.summary?.matches || 0;
        const bMatches = bVer.summary?.matches || 0;
        const aMismatches = aVer.summary?.mismatches || 0;
        const bMismatches = bVer.summary?.mismatches || 0;

        switch (sortBy) {
          case 'NAME_ASC':
            return (a.name || '').localeCompare(b.name || '');
          case 'NAME_DESC':
            return (b.name || '').localeCompare(a.name || '');
          case 'MATCHES_DESC':
            return bMatches - aMatches;
          case 'MISMATCHES_DESC':
            return bMismatches - aMismatches;
          case 'DATE_DESC':
            return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
          default:
            return 0;
        }
      });
  }, [pendingUsers, searchQuery, filterStatus, sortBy]);

  const resetFilters = () => {
    setSearchQuery('');
    setFilterStatus('ALL');
    setSortBy('NAME_ASC');
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

        {/* Dashboard Metric Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`p-4 rounded-2xl border text-left transition-all ${
              filterStatus === 'ALL'
                ? 'ring-2 ring-indigo-500 shadow-md bg-indigo-50/50 dark:bg-indigo-950/30'
                : 'hover:bg-black/5 dark:hover:bg-white/5'
            }`}
            style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
          >
            <div className="text-xs font-semibold opacity-60 mb-1">Pending Applications</div>
            <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">{dashboardStats.total}</div>
          </button>

          <button
            onClick={() => setFilterStatus('NO_ISSUES')}
            className={`p-4 rounded-2xl border text-left transition-all ${
              filterStatus === 'NO_ISSUES'
                ? 'ring-2 ring-emerald-500 shadow-md bg-emerald-50/50 dark:bg-emerald-950/30'
                : 'hover:bg-black/5 dark:hover:bg-white/5'
            }`}
            style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
          >
            <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> No Issues
            </div>
            <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{dashboardStats.noIssues}</div>
          </button>

          <button
            onClick={() => setFilterStatus('HAS_ISSUES')}
            className={`p-4 rounded-2xl border text-left transition-all ${
              filterStatus === 'HAS_ISSUES'
                ? 'ring-2 ring-amber-500 shadow-md bg-amber-50/50 dark:bg-amber-950/30'
                : 'hover:bg-black/5 dark:hover:bg-white/5'
            }`}
            style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
          >
            <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Has Issues
            </div>
            <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">{dashboardStats.hasIssues}</div>
          </button>

          <button
            onClick={() => setFilterStatus('EXCEL_MISSING')}
            className={`p-4 rounded-2xl border text-left transition-all ${
              filterStatus === 'EXCEL_MISSING'
                ? 'ring-2 ring-red-500 shadow-md bg-red-50/50 dark:bg-red-950/30'
                : 'hover:bg-black/5 dark:hover:bg-white/5'
            }`}
            style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
          >
            <div className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1 flex items-center gap-1">
              <FileQuestion className="w-3.5 h-3.5" /> Excel Missing
            </div>
            <div className="text-2xl font-extrabold text-red-600 dark:text-red-400">{dashboardStats.excelMissing}</div>
          </button>

          <button
            onClick={() => setFilterStatus('OCR_MISSING')}
            className={`p-4 rounded-2xl border text-left transition-all col-span-2 sm:col-span-1 ${
              filterStatus === 'OCR_MISSING'
                ? 'ring-2 ring-rose-500 shadow-md bg-rose-50/50 dark:bg-rose-950/30'
                : 'hover:bg-black/5 dark:hover:bg-white/5'
            }`}
            style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
          >
            <div className="text-xs font-semibold text-rose-600 dark:text-rose-400 mb-1 flex items-center gap-1">
              <ScanLine className="w-3.5 h-3.5" /> OCR Missing
            </div>
            <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">{dashboardStats.ocrMissing}</div>
          </button>
        </div>

        {/* Search, Filter & Sort Controls Bar */}
        <div
          className="p-4 rounded-2xl border shadow-sm mb-6 space-y-4 md:space-y-0 md:flex md:items-center md:justify-between gap-4"
          style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
        >
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 opacity-50" style={{ color: 'var(--text-color)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, citizenship #, employee ID..."
              className="w-full pl-10 pr-9 py-2 rounded-xl text-xs outline-none border transition-colors"
              style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Options */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 text-xs font-semibold opacity-70 mr-1" style={{ color: 'var(--text-color)' }}>
              <Filter className="w-3.5 h-3.5" /> Filter:
            </div>

            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                filterStatus === 'ALL'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-80'
              }`}
              style={filterStatus !== 'ALL' ? { color: 'var(--text-color)', borderColor: 'var(--border-color)' } : {}}
            >
              All ({pendingUsers.length})
            </button>

            <button
              onClick={() => setFilterStatus('NO_ISSUES')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                filterStatus === 'NO_ISSUES'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-80'
              }`}
              style={filterStatus !== 'NO_ISSUES' ? { color: 'var(--text-color)', borderColor: 'var(--border-color)' } : {}}
            >
              No Issues ({dashboardStats.noIssues})
            </button>

            <button
              onClick={() => setFilterStatus('HAS_ISSUES')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                filterStatus === 'HAS_ISSUES'
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-80'
              }`}
              style={filterStatus !== 'HAS_ISSUES' ? { color: 'var(--text-color)', borderColor: 'var(--border-color)' } : {}}
            >
              Has Issues ({dashboardStats.hasIssues})
            </button>

            <button
              onClick={() => setFilterStatus('EXCEL_MISSING')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                filterStatus === 'EXCEL_MISSING'
                  ? 'bg-red-600 text-white border-red-600'
                  : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-80'
              }`}
              style={filterStatus !== 'EXCEL_MISSING' ? { color: 'var(--text-color)', borderColor: 'var(--border-color)' } : {}}
            >
              Excel Missing ({dashboardStats.excelMissing})
            </button>

            <button
              onClick={() => setFilterStatus('OCR_MISSING')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                filterStatus === 'OCR_MISSING'
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-80'
              }`}
              style={filterStatus !== 'OCR_MISSING' ? { color: 'var(--text-color)', borderColor: 'var(--border-color)' } : {}}
            >
              OCR Missing ({dashboardStats.ocrMissing})
            </button>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 ml-2 border-l pl-3" style={{ borderColor: 'var(--border-color)' }}>
              <SlidersHorizontal className="w-3.5 h-3.5 opacity-60" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="py-1.5 px-2 rounded-lg text-xs font-semibold outline-none border transition-colors cursor-pointer"
                style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
              >
                <option value="NAME_ASC">Name (A &rarr; Z)</option>
                <option value="NAME_DESC">Name (Z &rarr; A)</option>
                <option value="MATCHES_DESC">Matches (High &rarr; Low)</option>
                <option value="MISMATCHES_DESC">Mismatches (High &rarr; Low)</option>
                <option value="DATE_DESC">Date (Newest First)</option>
              </select>
            </div>

            {(searchQuery || filterStatus !== 'ALL' || sortBy !== 'NAME_ASC') && (
              <button
                onClick={resetFilters}
                className="p-1.5 rounded-lg border text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 opacity-70 hover:opacity-100 flex items-center gap-1"
                style={{ color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
                title="Reset all search, filter, and sort settings"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            )}
          </div>
        </div>

        {/* Pending Users Table */}
        <div
          className="rounded-2xl border shadow-xl overflow-hidden"
          style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
        >
          <div className="p-6 border-b flex justify-between items-center" style={{ borderColor: 'var(--border-color)' }}>
            <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-color)' }}>
              <span>Pending Voter Applications</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 font-mono font-bold">
                {processedUsers.length} of {pendingUsers.length}
              </span>
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
          ) : processedUsers.length === 0 ? (
            <div className="p-12 text-center opacity-60">
              <p className="text-sm">No voter applications match your search and filter criteria.</p>
              {(searchQuery || filterStatus !== 'ALL') && (
                <button
                  onClick={resetFilters}
                  className="mt-3 text-xs font-bold text-indigo-600 hover:underline"
                >
                  Clear filters & search
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-xs uppercase tracking-wider opacity-60 border-b" style={{ borderColor: 'var(--border-color)', color: 'var(--text-color)' }}>
                    <th className="p-4">Status Indicator</th>
                    <th className="p-4">Voter Name</th>
                    <th className="p-4">Citizenship / Emp ID</th>
                    <th className="p-4">Verification Breakdown</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-sm" style={{ borderColor: 'var(--border-color)' }}>
                  {processedUsers.map((u) => {
                    const isOcrOpen = expandedOcrRow === u._id;
                    const ocr = u.ocrData;
                    const ver = u.verification || {};
                    const { excelFound, ocrFound, summary = {}, issues = [] } = ver;
                    const cat = getVoterStatusCategory(u);

                    return (
                      <React.Fragment key={u._id}>
                        <tr className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                          {/* Visual Status Indicator */}
                          <td className="p-4 whitespace-nowrap">
                            {cat === 'NO_ISSUES' && (
                              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                No Issues
                              </span>
                            )}
                            {cat === 'HAS_ISSUES' && (
                              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800">
                                <span className="w-2 h-2 rounded-full bg-amber-500" />
                                Has Issues ({issues.length})
                              </span>
                            )}
                            {(cat === 'EXCEL_MISSING' || cat === 'OCR_MISSING' || cat === 'EXCEL_AND_OCR_MISSING') && (
                              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/50 px-2.5 py-1 rounded-full border border-red-200 dark:border-red-800">
                                <span className="w-2 h-2 rounded-full bg-red-500" />
                                Missing Data
                              </span>
                            )}
                          </td>

                          {/* Voter Name & Email */}
                          <td className="p-4">
                            <div className="font-bold" style={{ color: 'var(--text-color)' }}>{u.name}</div>
                            <div className="text-xs opacity-60 truncate max-w-xs">{u.email}</div>
                          </td>

                          {/* Citizenship & Employee ID */}
                          <td className="p-4 font-mono text-xs">
                            <div style={{ color: 'var(--text-color)' }}>{u.citizenshipNumber || '—'}</div>
                            <div className="opacity-60">{u.employeeId ? `EMP: ${u.employeeId}` : 'No Emp ID'}</div>
                          </td>

                          {/* Verification Breakdown */}
                          <td className="p-4">
                            <div className="flex flex-wrap items-center gap-1.5 text-xs">
                              <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold border ${
                                excelFound
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                                  : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800'
                              }`}>
                                Excel: {excelFound ? '✓' : '✗'}
                              </span>

                              <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold border ${
                                ocrFound
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                                  : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'
                              }`}>
                                OCR: {ocrFound ? '✓' : '✗'}
                              </span>

                              <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                {summary.matches ?? 0} Match
                              </span>

                              {(summary.mismatches || 0) > 0 && (
                                <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                                  {summary.mismatches} Mismatch
                                </span>
                              )}

                              {(summary.missing || 0) > 0 && (
                                <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                  {summary.missing} Missing
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Action Buttons */}
                          <td className="p-4 text-right space-x-2 whitespace-nowrap">
                            <button
                              onClick={() => setSelectedVoterForReview(u)}
                              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-all inline-flex items-center gap-1 shadow-xs"
                            >
                              <Eye className="w-3.5 h-3.5" /> Review
                            </button>

                            <button
                              onClick={() => setExpandedOcrRow(isOcrOpen ? null : u._id)}
                              className="px-2.5 py-1 text-xs rounded-lg border hover:bg-black/5 dark:hover:bg-white/5"
                              style={{ color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
                            >
                              {isOcrOpen ? <ChevronUp className="w-3.5 h-3.5 inline" /> : <ChevronDown className="w-3.5 h-3.5 inline" />} OCR Info
                            </button>

                            <button
                              onClick={() => handleApprove(u._id, u.walletAddress)}
                              disabled={actionLoading || blockchainLoading || !u.walletAddress}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-all inline-flex items-center gap-1 disabled:opacity-50"
                              title={!u.walletAddress ? 'Voter has no linked wallet' : 'Approve via MetaMask'}
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Approve
                            </button>

                            <button
                              onClick={() => handleOpenRejectDialog(u._id)}
                              disabled={actionLoading}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg transition-all inline-flex items-center gap-1 disabled:opacity-50"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Reject
                            </button>

                            <button
                              onClick={() => handleOpenBlockDialog(u._id)}
                              disabled={actionLoading}
                              className="px-3 py-1 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-lg transition-all inline-flex items-center gap-1 disabled:opacity-50"
                            >
                              <Ban className="w-3.5 h-3.5" /> Block
                            </button>
                          </td>
                        </tr>

                        {isOcrOpen && (
                          <tr>
                            <td colSpan={5} className="p-4 bg-black/5 dark:bg-white/5 border-b" style={{ borderColor: 'var(--border-color)' }}>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                <div>
                                  <h4 className="font-bold mb-2 text-indigo-600">User Provided Identity:</h4>
                                  <p><strong>Name:</strong> {u.name}</p>
                                  <p><strong>DOB:</strong> {u.dob}</p>
                                  <p><strong>Address:</strong> {u.address}</p>
                                  <p><strong>Citizenship Number:</strong> {u.citizenshipNumber}</p>
                                  <p><strong>Employee ID:</strong> {u.employeeId || 'N/A'}</p>
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

        {/* Verification Review Modal / Drawer */}
        <VerificationReviewModal
          isOpen={!!selectedVoterForReview}
          onClose={() => setSelectedVoterForReview(null)}
          voter={selectedVoterForReview}
          onApprove={(userId, walletAddress) => {
            setSelectedVoterForReview(null);
            handleApprove(userId, walletAddress);
          }}
          onReject={(userId) => {
            setSelectedVoterForReview(null);
            handleOpenRejectDialog(userId);
          }}
          onBlock={(userId) => {
            setSelectedVoterForReview(null);
            handleOpenBlockDialog(userId);
          }}
          actionLoading={actionLoading}
          blockchainLoading={blockchainLoading}
        />
      </main>
    </div>
  );
};

export default VerifierDashboard;
