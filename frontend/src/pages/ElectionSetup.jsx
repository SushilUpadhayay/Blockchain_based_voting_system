import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ShieldCheck,
  UserPlus,
  Upload,
  UserCheck,
  Play,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  Users,
  FileSpreadsheet,
  Mail,
  User,
  ExternalLink,
  ChevronRight,
  RotateCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useVoting } from '../context/VotingContext';
import API from '../api/api';
import Navbar from '../components/Navbar';

const ElectionSetup = () => {
  const { electionId: routeElectionId } = useParams();
  const electionId = Number(routeElectionId || 1);
  const navigate = useNavigate();

  const { user } = useAuth();
  const {
    addCandidate,
    uploadRoster,
    assignVerifier,
    openRegistration,
    syncBlockchain,
    isLoading: contextLoading,
  } = useVoting();

  const [setupSummary, setSetupSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form States
  const [candidateName, setCandidateName] = useState('');
  const [candidateParty, setCandidateParty] = useState('');
  const [candidatePhoto, setCandidatePhoto] = useState(null);

  const [rosterFile, setRosterFile] = useState(null);
  const [rosterRowErrors, setRosterRowErrors] = useState([]);

  const [verifierName, setVerifierName] = useState('');
  const [verifierEmail, setVerifierEmail] = useState('');

  useEffect(() => {
    fetchSetupSummary();
  }, [electionId]);

  const fetchSetupSummary = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/elections/${electionId}/setup-summary`);
      setSetupSummary(res.data);
    } catch (err) {
      console.error('Failed to fetch setup summary:', err);
      toast.error(err.response?.data?.message || 'Failed to load election setup summary.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCandidate = async (e) => {
    e.preventDefault();
    if (!candidateName.trim()) return toast.error('Candidate name is required.');

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('name', candidateName.trim());
      formData.append('party', candidateParty.trim());
      if (candidatePhoto) formData.append('photo', candidatePhoto);

      await addCandidate(electionId, formData);
      setCandidateName('');
      setCandidateParty('');
      setCandidatePhoto(null);
      fetchSetupSummary();
    } catch (err) {
      console.error('Add candidate error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRosterUpload = async (e) => {
    e.preventDefault();
    if (!rosterFile) return toast.error('Please select an Excel roster file.');

    try {
      setSubmitting(true);
      setRosterRowErrors([]);
      const formData = new FormData();
      formData.append('rosterFile', rosterFile);
      await uploadRoster(electionId, formData);
      setRosterFile(null);
      fetchSetupSummary();
    } catch (err) {
      console.error('Roster upload error:', err);
      // Surface per-row validation errors returned by the backend (HTTP 422)
      const data = err.response?.data;
      if (data?.rowErrors?.length) {
        setRosterRowErrors(data.rowErrors);
        toast.error(data.message || 'Roster upload failed — see row errors below.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleInviteVerifier = async (e) => {
    e.preventDefault();
    if (!verifierName.trim() || !verifierEmail.trim()) {
      return toast.error('Verifier name and email are required.');
    }

    try {
      setSubmitting(true);
      await assignVerifier(electionId, {
        name: verifierName.trim(),
        email: verifierEmail.trim().toLowerCase(),
      });
      setVerifierName('');
      setVerifierEmail('');
      fetchSetupSummary();
    } catch (err) {
      console.error('Invite verifier error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenRegistration = async () => {
    try {
      setSubmitting(true);
      await openRegistration(electionId);
      toast.success('Registration is now open! Redirecting to Super Admin Console...');
      setTimeout(() => navigate(`/elections/${electionId}/admin`), 1500);
    } catch (err) {
      console.error('Open registration error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSync = async () => {
    try {
      await syncBlockchain(electionId);
      fetchSetupSummary();
    } catch (err) {
      console.error('Sync error:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-color)' }}>
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        </div>
      </div>
    );
  }

  const isDraft = setupSummary?.status === 'draft';
  const hasRoster = (setupSummary?.rosterCount || 0) > 0;
  const hasCandidates = (setupSummary?.candidateCount || 0) > 0;

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300" style={{ backgroundColor: 'var(--bg-color)' }}>
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 lg:p-8 space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(`/elections/${electionId}/admin`)}
            className="inline-flex items-center gap-2 text-sm font-medium opacity-70 hover:opacity-100 transition-opacity"
            style={{ color: 'var(--text-color)' }}
          >
            <ArrowLeft className="w-4 h-4" /> Back to Admin Console
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSync}
              disabled={contextLoading}
              className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-xl border bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-all disabled:opacity-50"
              title="Manually sync election state with blockchain"
            >
              <RotateCw className={`w-3.5 h-3.5 ${contextLoading ? 'animate-spin' : ''}`} />
              Sync with Blockchain
            </button>
            <Link
              to={`/elections/${electionId}/admin`}
              className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 dark:bg-indigo-950/50 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800"
            >
              Admin Console <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Header */}
        <div className="rounded-2xl border p-6 shadow-xl relative overflow-hidden" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 mb-2">
                <ShieldCheck className="w-4 h-4" /> Election Setup Checklist
              </div>
              <h1 className="text-3xl font-extrabold" style={{ color: 'var(--text-color)' }}>
                {setupSummary?.title || `Election #${electionId}`}
              </h1>
              <p className="text-sm opacity-70 mt-1" style={{ color: 'var(--text-color)' }}>
                Complete the configuration steps below before opening voter registration.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider ${
                isDraft ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              }`}>
                Status: {setupSummary?.status || 'draft'}
              </span>
            </div>
          </div>
        </div>

        {/* Progress Overview Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border p-4 shadow-sm text-center" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
            <div className="text-xs font-bold opacity-60 uppercase mb-1" style={{ color: 'var(--text-color)' }}>Candidates</div>
            <div className="text-2xl font-extrabold text-indigo-600">{setupSummary?.candidateCount || 0}</div>
            <div className="text-xs opacity-50 mt-1" style={{ color: 'var(--text-color)' }}>{hasCandidates ? '✓ Configured' : 'Optional'}</div>
          </div>

          <div className="rounded-xl border p-4 shadow-sm text-center" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
            <div className="text-xs font-bold opacity-60 uppercase mb-1" style={{ color: 'var(--text-color)' }}>Eligible Voters</div>
            <div className="text-2xl font-extrabold text-indigo-600">{setupSummary?.rosterCount || 0}</div>
            <div className="text-xs opacity-50 mt-1" style={{ color: 'var(--text-color)' }}>{hasRoster ? '✓ Imported' : 'Required'}</div>
          </div>

          <div className="rounded-xl border p-4 shadow-sm text-center" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
            <div className="text-xs font-bold opacity-60 uppercase mb-1" style={{ color: 'var(--text-color)' }}>Verifier Invites</div>
            <div className="text-2xl font-extrabold text-indigo-600">{(setupSummary?.verifierInvites || []).length}</div>
            <div className="text-xs opacity-50 mt-1" style={{ color: 'var(--text-color)' }}>{setupSummary?.acceptedVerifiersCount || 0} Accepted</div>
          </div>

          <div className="rounded-xl border p-4 shadow-sm text-center" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
            <div className="text-xs font-bold opacity-60 uppercase mb-1" style={{ color: 'var(--text-color)' }}>Registration</div>
            <div className={`text-sm font-extrabold mt-2 ${isDraft ? 'text-amber-500' : 'text-emerald-500'}`}>
              {isDraft ? 'Ready to Open' : 'Open'}
            </div>
            <div className="text-xs opacity-50 mt-1" style={{ color: 'var(--text-color)' }}>{isDraft ? 'Pending Setup' : 'Live'}</div>
          </div>
        </div>

        {/* Setup Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* Card 1: Add Candidates */}
          <div className="rounded-2xl border p-6 shadow-md flex flex-col justify-between" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-color)' }}>
                  <UserPlus className="w-5 h-5 text-emerald-500" /> 1. Add Candidates
                </h2>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {setupSummary?.candidateCount || 0} Added
                </span>
              </div>
              <p className="text-xs opacity-70 mb-4" style={{ color: 'var(--text-color)' }}>
                Add candidates to the blockchain for this election. Each candidate receives a unique ID.
              </p>

              <form onSubmit={handleAddCandidate} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-color)' }}>Candidate Name *</label>
                  <input
                    type="text" required value={candidateName} onChange={(e) => setCandidateName(e.target.value)}
                    placeholder="e.g. Jane Doe"
                    className="w-full px-3 py-2 rounded-xl border text-xs outline-none"
                    style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-color)' }}>Political Party</label>
                  <input
                    type="text" value={candidateParty} onChange={(e) => setCandidateParty(e.target.value)}
                    placeholder="e.g. Democratic Alliance"
                    className="w-full px-3 py-2 rounded-xl border text-xs outline-none"
                    style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-color)' }}>Candidate Photo (optional)</label>
                  <input
                    type="file" accept="image/*" onChange={(e) => setCandidatePhoto(e.target.files[0])}
                    className="w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-emerald-50 file:text-emerald-700"
                  />
                </div>
                <button
                  type="submit" disabled={submitting || contextLoading || !candidateName.trim()}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs transition-all disabled:opacity-50 mt-2"
                >
                  {submitting ? 'Adding Candidate...' : 'Add Candidate to Blockchain'}
                </button>
              </form>
            </div>

            {/* List of candidates */}
            {(setupSummary?.candidates || []).length > 0 && (
              <div className="mt-4 pt-4 border-t space-y-2 max-h-40 overflow-y-auto" style={{ borderColor: 'var(--border-color)' }}>
                <div className="text-xs font-bold opacity-60" style={{ color: 'var(--text-color)' }}>Added Candidates:</div>
                {setupSummary.candidates.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-black/5 dark:bg-white/5 text-xs">
                    <span className="font-bold">{c.name}</span>
                    <span className="opacity-60">{c.party || 'Independent'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card 2: Roster Upload */}
          <div className="rounded-2xl border p-6 shadow-md flex flex-col justify-between" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-color)' }}>
                  <FileSpreadsheet className="w-5 h-5 text-indigo-500" /> 2. Import Voter Roster
                </h2>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  hasRoster ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  {hasRoster ? `${setupSummary.rosterCount} Voters` : 'Action Required'}
                </span>
              </div>

              {/* Required format info box */}
              <div className="mb-4 p-3 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40">
                <p className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 mb-2 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Required Excel Format — all 5 columns mandatory
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px] border-collapse">
                    <thead>
                      <tr className="bg-indigo-100 dark:bg-indigo-900/50">
                        {['email', 'Full Name', 'Employee ID', 'Citizenship Number', 'Date of Birth'].map(col => (
                          <th key={col} className="px-2 py-1 text-left font-bold text-indigo-800 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-700 whitespace-nowrap">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="opacity-60">
                        {['voter@org.np', 'Ram Prasad Shrestha', 'EMP-2024-001', '1234-5678', '1990-04-15'].map((ex, i) => (
                          <td key={i} className="px-2 py-1 border border-indigo-200 dark:border-indigo-700 italic" style={{ color: 'var(--text-color)' }}>{ex}</td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-2">
                  ⚠ Column names must match exactly (case-sensitive). Date of Birth must be <strong>YYYY-MM-DD</strong>. All rows must have all five fields — any row with a missing or invalid field will reject the entire upload.
                </p>
              </div>

              <form onSubmit={handleRosterUpload} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-color)' }}>Excel Roster File (.xlsx / .xls)</label>
                  <input
                    type="file" accept=".xlsx, .xls" onChange={(e) => { setRosterFile(e.target.files[0]); setRosterRowErrors([]); }}
                    className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:bg-indigo-50 file:text-indigo-700"
                  />
                </div>
                <button
                  type="submit" disabled={submitting || contextLoading || !rosterFile}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs transition-all disabled:opacity-50 mt-2"
                >
                  {submitting ? 'Importing Roster...' : 'Import Voter Roster'}
                </button>
              </form>

              {/* Per-row validation errors */}
              {rosterRowErrors.length > 0 && (
                <div className="mt-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-3">
                  <p className="text-[11px] font-bold text-red-700 dark:text-red-400 mb-2 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" /> {rosterRowErrors.length} row(s) failed validation — fix and re-upload:
                  </p>
                  <ul className="space-y-1 max-h-40 overflow-y-auto">
                    {rosterRowErrors.map((e, i) => (
                      <li key={i} className="text-[10px] text-red-700 dark:text-red-300 flex gap-1.5">
                        <span className="font-bold shrink-0">Row {e.row}:</span>
                        <span>{e.message.replace(/^Row \d+: /, '')}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t text-xs opacity-70" style={{ borderColor: 'var(--border-color)' }}>
              <strong>Import Status:</strong> {hasRoster ? `✓ ${setupSummary.rosterCount} voter(s) ready to receive invitations when registration opens.` : 'No roster uploaded yet.'}
            </div>
          </div>


          {/* Card 3: Invite Registration Verifiers */}
          <div className="rounded-2xl border p-6 shadow-md flex flex-col justify-between" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-color)' }}>
                  <UserCheck className="w-5 h-5 text-purple-500" /> 3. Invite Registration Verifiers
                </h2>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                  {(setupSummary?.verifierInvites || []).length} Invited
                </span>
              </div>
              <p className="text-xs opacity-70 mb-4" style={{ color: 'var(--text-color)' }}>
                Send invitation emails to Registration Verifiers. They will receive a link to self-register and link their wallet.
              </p>

              <form onSubmit={handleInviteVerifier} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-color)' }}>Verifier Full Name *</label>
                  <input
                    type="text" required value={verifierName} onChange={(e) => setVerifierName(e.target.value)}
                    placeholder="e.g. Dr. Robert Smith"
                    className="w-full px-3 py-2 rounded-xl border text-xs outline-none"
                    style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-color)' }}>Verifier Email *</label>
                  <input
                    type="email" required value={verifierEmail} onChange={(e) => setVerifierEmail(e.target.value)}
                    placeholder="e.g. verifier@organization.org"
                    className="w-full px-3 py-2 rounded-xl border text-xs outline-none"
                    style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
                  />
                </div>
                <button
                  type="submit" disabled={submitting || contextLoading || !verifierName.trim() || !verifierEmail.trim()}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 rounded-xl text-xs transition-all disabled:opacity-50 mt-2"
                >
                  {submitting ? 'Sending Invitation...' : 'Send Verifier Invitation Email'}
                </button>
              </form>
            </div>

            {/* List of verifier invitations */}
            {(setupSummary?.verifierInvites || []).length > 0 && (
              <div className="mt-4 pt-4 border-t space-y-2 max-h-36 overflow-y-auto" style={{ borderColor: 'var(--border-color)' }}>
                <div className="text-xs font-bold opacity-60" style={{ color: 'var(--text-color)' }}>Sent Invitations:</div>
                {setupSummary.verifierInvites.map((v) => (
                  <div key={v.email} className="flex items-center justify-between p-2 rounded-lg bg-black/5 dark:bg-white/5 text-xs">
                    <div>
                      <span className="font-bold">{v.name}</span>
                      <span className="opacity-60 block text-[10px]">{v.email}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      v.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {v.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card 4: Preview & Open Registration */}
          <div className="rounded-2xl border p-6 shadow-md flex flex-col justify-between" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-color)' }}>
                  <Play className="w-5 h-5 text-amber-500" /> 4. Open Registration
                </h2>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  isDraft ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  {isDraft ? 'Step Final' : 'Registration Live'}
                </span>
              </div>

              <p className="text-xs opacity-70 mb-4" style={{ color: 'var(--text-color)' }}>
                Opening registration transitions this election from <strong>draft</strong> to <strong>registration_open</strong> and dispatches invitation emails to all imported voters.
              </p>

              {/* Readonly Summary Details */}
              <div className="space-y-2 p-3 rounded-xl bg-black/5 dark:bg-white/5 text-xs mb-4">
                <div className="flex justify-between">
                  <span className="opacity-60">Election Title:</span>
                  <span className="font-bold">{setupSummary?.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-60">Candidates:</span>
                  <span className="font-bold">{setupSummary?.candidateCount} added</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-60">Roster Count:</span>
                  <span className="font-bold">{setupSummary?.rosterCount} voters</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-60">Registration Token:</span>
                  <span className="font-mono text-[10px] text-indigo-600">{setupSummary?.inviteToken}</span>
                </div>
              </div>
            </div>

            <div>
              {!hasRoster && isDraft && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs mb-3">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Please import a voter roster (Step 2) before opening registration.</span>
                </div>
              )}

              <button
                onClick={handleOpenRegistration}
                disabled={submitting || contextLoading || !hasRoster || !isDraft}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-lg flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {isDraft ? 'Open Registration & Send Invitations' : 'Registration Already Open'}
              </button>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default ElectionSetup;
