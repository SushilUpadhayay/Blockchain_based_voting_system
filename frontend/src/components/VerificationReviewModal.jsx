import React, { useEffect } from 'react';
import {
  X,
  CheckCircle,
  XCircle,
  Ban,
  AlertTriangle,
  FileText,
  Check,
  User,
  Mail,
  Calendar,
  UserCheck,
  MapPin,
  FileBadge,
  CreditCard,
  Wallet,
  Building2,
  ScanLine,
  Image as ImageIcon
} from 'lucide-react';
import { getAssetUrl } from '../utils/assetUrl';

const VerificationReviewModal = ({
  isOpen,
  onClose,
  voter,
  onApprove,
  onReject,
  onBlock,
  actionLoading = false,
  blockchainLoading = false
}) => {
  // ESC key listener to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !voter) return null;

  const verification = voter.verification || {};
  const { excelFound, ocrFound, summary = {}, issues = [], fields = {} } = verification;

  // Format value for table display
  const renderValue = (val) => {
    if (val === null || val === undefined || val === '') {
      return <span className="opacity-40 font-mono text-xs">—</span>;
    }
    if (typeof val === 'object') {
      if (val.year && val.month && val.day) {
        return `${val.year}-${String(val.month).padStart(2, '0')}-${String(val.day).padStart(2, '0')}`;
      }
      return JSON.stringify(val);
    }
    return String(val);
  };

  // Format status badge
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'match':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/80 dark:text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-300 dark:border-emerald-800">
            <Check className="w-3.5 h-3.5" /> Match
          </span>
        );
      case 'mismatch':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-100 dark:bg-red-950/80 dark:text-red-300 px-2.5 py-1 rounded-full border border-red-300 dark:border-red-800">
            <AlertTriangle className="w-3.5 h-3.5" /> Mismatch
          </span>
        );
      case 'missing':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 dark:bg-amber-950/80 dark:text-amber-300 px-2.5 py-1 rounded-full border border-amber-300 dark:border-amber-800">
            <AlertTriangle className="w-3.5 h-3.5" /> Missing
          </span>
        );
      case 'not_available':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700">
            — N/A
          </span>
        );
    }
  };

  const fieldList = [
    { key: 'name', label: 'Full Name' },
    { key: 'dob', label: 'Date of Birth' },
    { key: 'gender', label: 'Gender' },
    { key: 'address', label: 'Permanent Address' },
    { key: 'citizenshipNumber', label: 'Citizenship Number' },
    { key: 'employeeId', label: 'Employee ID' }
  ];

  const frontDocUrl = getAssetUrl(voter.documentFrontPath || voter.documentPath);
  const backDocUrl = getAssetUrl(voter.documentBackPath);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Right-Side Drawer */}
      <div
        className="relative w-full max-w-3xl h-full flex flex-col shadow-2xl transition-transform duration-300 border-l"
        style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', color: 'var(--text-color)' }}
      >
        {/* Drawer Header */}
        <div className="px-6 py-5 border-b flex justify-between items-center bg-black/5 dark:bg-white/5" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center font-bold text-lg border border-indigo-500/20">
              {voter.name ? voter.name.charAt(0).toUpperCase() : 'V'}
            </div>
            <div>
              <h2 className="text-xl font-bold leading-tight" style={{ color: 'var(--text-color)' }}>
                Voter Verification Review
              </h2>
              <p className="text-xs opacity-70 mt-0.5">
                {voter.name} &bull; {voter.email}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl border opacity-70 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 transition-all"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Section 1: Registration Summary */}
          <section>
            <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-3 flex items-center gap-2">
              <User className="w-4 h-4" /> Section 1: Registration Summary
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl border bg-black/5 dark:bg-white/5" style={{ borderColor: 'var(--border-color)' }}>
              <div>
                <div className="text-xs opacity-60 flex items-center gap-1 mb-1"><User className="w-3.5 h-3.5" /> Full Name</div>
                <div className="font-semibold text-sm">{voter.name || '—'}</div>
              </div>
              <div>
                <div className="text-xs opacity-60 flex items-center gap-1 mb-1"><Mail className="w-3.5 h-3.5" /> Email Address</div>
                <div className="font-semibold text-sm truncate" title={voter.email}>{voter.email || '—'}</div>
              </div>
              <div>
                <div className="text-xs opacity-60 flex items-center gap-1 mb-1"><Calendar className="w-3.5 h-3.5" /> Date of Birth</div>
                <div className="font-semibold text-sm">{voter.dob || '—'}</div>
              </div>
              <div>
                <div className="text-xs opacity-60 flex items-center gap-1 mb-1"><UserCheck className="w-3.5 h-3.5" /> Gender</div>
                <div className="font-semibold text-sm capitalize">{voter.gender || '—'}</div>
              </div>
              <div>
                <div className="text-xs opacity-60 flex items-center gap-1 mb-1"><MapPin className="w-3.5 h-3.5" /> Permanent Address</div>
                <div className="font-semibold text-sm">{voter.address || '—'}</div>
              </div>
              <div>
                <div className="text-xs opacity-60 flex items-center gap-1 mb-1"><FileBadge className="w-3.5 h-3.5" /> Citizenship Number</div>
                <div className="font-semibold text-sm font-mono">{voter.citizenshipNumber || '—'}</div>
              </div>
              <div>
                <div className="text-xs opacity-60 flex items-center gap-1 mb-1"><Building2 className="w-3.5 h-3.5" /> Employee ID</div>
                <div className="font-semibold text-sm font-mono">{voter.employeeId || '—'}</div>
              </div>
              <div>
                <div className="text-xs opacity-60 flex items-center gap-1 mb-1"><Wallet className="w-3.5 h-3.5" /> Wallet Address</div>
                <div className="font-semibold text-xs font-mono truncate" title={voter.walletAddress}>
                  {voter.walletAddress ? `${voter.walletAddress.slice(0, 6)}...${voter.walletAddress.slice(-4)}` : 'Not linked'}
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Verification Summary */}
          <section>
            <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-3 flex items-center gap-2">
              <ScanLine className="w-4 h-4" /> Section 2: Verification Summary
            </h3>

            {/* Source Status & Summary Pill Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
              <div className="p-3 rounded-xl border bg-black/5 dark:bg-white/5 text-center" style={{ borderColor: 'var(--border-color)' }}>
                <div className="text-xs opacity-60 mb-1 font-medium">Excel Roster</div>
                {excelFound ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                    <Check className="w-3 h-3" /> Found
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 dark:bg-red-950/50 px-2 py-0.5 rounded border border-red-200 dark:border-red-800">
                    <X className="w-3 h-3" /> Not Found
                  </span>
                )}
              </div>

              <div className="p-3 rounded-xl border bg-black/5 dark:bg-white/5 text-center" style={{ borderColor: 'var(--border-color)' }}>
                <div className="text-xs opacity-60 mb-1 font-medium">OCR Data</div>
                {ocrFound ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                    <Check className="w-3 h-3" /> Available
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                    <X className="w-3 h-3" /> N/A
                  </span>
                )}
              </div>

              <div className="p-3 rounded-xl border bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-center">
                <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mb-0.5">Matches</div>
                <div className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400">{summary.matches ?? 0}</div>
              </div>

              <div className="p-3 rounded-xl border bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-center">
                <div className="text-xs text-red-700 dark:text-red-400 font-medium mb-0.5">Mismatches</div>
                <div className="text-xl font-extrabold text-red-700 dark:text-red-400">{summary.mismatches ?? 0}</div>
              </div>

              <div className="p-3 rounded-xl border bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-center col-span-2 sm:col-span-1">
                <div className="text-xs text-amber-700 dark:text-amber-400 font-medium mb-0.5">Missing</div>
                <div className="text-xl font-extrabold text-amber-700 dark:text-amber-400">{summary.missing ?? 0}</div>
              </div>
            </div>

            {/* Issues Box */}
            {issues.length === 0 ? (
              <div className="p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 text-sm font-semibold flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                ✓ No verification issues detected. All active sources match cleanly.
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-sm space-y-2">
                <div className="font-bold flex items-center gap-2 text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  Verification Alerts & Issues ({issues.length}):
                </div>
                <ul className="list-disc list-inside text-xs space-y-1 font-medium pl-1">
                  {issues.map((issue, idx) => (
                    <li key={idx} className="text-amber-800 dark:text-amber-300 font-mono">
                      ⚠ {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* Section 3: Field Comparison Table */}
          <section>
            <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Section 3: Field Comparison Table
            </h3>
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-color)' }}>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="uppercase tracking-wider font-bold opacity-70 border-b bg-black/5 dark:bg-white/5" style={{ borderColor: 'var(--border-color)' }}>
                      <th className="p-3">Field</th>
                      <th className="p-3">User Submitted</th>
                      <th className="p-3">Excel Roster</th>
                      <th className="p-3">OCR Extracted</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
                    {fieldList.map(({ key, label }) => {
                      const fieldData = fields[key] || {};
                      const { user, excel, ocr, status } = fieldData;

                      return (
                        <tr key={key} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                          <td className="p-3 font-semibold">{label}</td>
                          <td className="p-3 font-mono opacity-90">{renderValue(user)}</td>
                          <td className="p-3 font-mono opacity-90">{renderValue(excel)}</td>
                          <td className="p-3 font-mono opacity-90">{renderValue(ocr)}</td>
                          <td className="p-3 text-center">{renderStatusBadge(status)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Section 4: Citizenship Images */}
          <section>
            <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-3 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" /> Section 4: Uploaded Citizenship Images
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Front Document */}
              <div className="p-4 rounded-xl border bg-black/5 dark:bg-white/5 flex flex-col justify-between" style={{ borderColor: 'var(--border-color)' }}>
                <div className="text-xs font-bold mb-2 flex items-center justify-between">
                  <span>Front Citizenship Image</span>
                  {frontDocUrl && (
                    <a
                      href={frontDocUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:underline text-[11px] font-normal"
                    >
                      View Full Size
                    </a>
                  )}
                </div>
                {frontDocUrl ? (
                  <div className="relative aspect-video rounded-lg overflow-hidden border bg-black/10 flex items-center justify-center" style={{ borderColor: 'var(--border-color)' }}>
                    <img
                      src={frontDocUrl}
                      alt="Citizenship Front"
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div className="hidden flex-col items-center justify-center text-xs opacity-50 p-4 text-center">
                      <ImageIcon className="w-8 h-8 mb-1" />
                      Image preview unavailable
                    </div>
                  </div>
                ) : (
                  <div className="h-32 rounded-lg border border-dashed flex flex-col items-center justify-center opacity-50 text-xs" style={{ borderColor: 'var(--border-color)' }}>
                    <ImageIcon className="w-6 h-6 mb-1" />
                    No front image uploaded
                  </div>
                )}
              </div>

              {/* Back Document */}
              <div className="p-4 rounded-xl border bg-black/5 dark:bg-white/5 flex flex-col justify-between" style={{ borderColor: 'var(--border-color)' }}>
                <div className="text-xs font-bold mb-2 flex items-center justify-between">
                  <span>Back Citizenship Image</span>
                  {backDocUrl && (
                    <a
                      href={backDocUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:underline text-[11px] font-normal"
                    >
                      View Full Size
                    </a>
                  )}
                </div>
                {backDocUrl ? (
                  <div className="relative aspect-video rounded-lg overflow-hidden border bg-black/10 flex items-center justify-center" style={{ borderColor: 'var(--border-color)' }}>
                    <img
                      src={backDocUrl}
                      alt="Citizenship Back"
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div className="hidden flex-col items-center justify-center text-xs opacity-50 p-4 text-center">
                      <ImageIcon className="w-8 h-8 mb-1" />
                      Image preview unavailable
                    </div>
                  </div>
                ) : (
                  <div className="h-32 rounded-lg border border-dashed flex flex-col items-center justify-center opacity-50 text-xs" style={{ borderColor: 'var(--border-color)' }}>
                    <ImageIcon className="w-6 h-6 mb-1" />
                    No back image uploaded
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Section 5: Verifier Actions (Fixed Footer) */}
        <div
          className="p-4 px-6 border-t flex flex-wrap items-center justify-between gap-3 bg-black/5 dark:bg-white/5 sticky bottom-0 z-10"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold rounded-xl border hover:bg-black/5 dark:hover:bg-white/5 transition-all"
            style={{ color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
          >
            Close Review
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onApprove(voter._id, voter.walletAddress)}
              disabled={actionLoading || blockchainLoading || !voter.walletAddress}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all inline-flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
              title={!voter.walletAddress ? 'Voter has no linked wallet' : 'Authorize voter on blockchain via MetaMask'}
            >
              <CheckCircle className="w-4 h-4" /> Approve Voter
            </button>

            <button
              type="button"
              onClick={() => onReject(voter._id)}
              disabled={actionLoading}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-all inline-flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
            >
              <XCircle className="w-4 h-4" /> Reject
            </button>

            <button
              type="button"
              onClick={() => onBlock(voter._id)}
              disabled={actionLoading}
              className="px-4 py-2.5 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-xl transition-all inline-flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
            >
              <Ban className="w-4 h-4" /> Block
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerificationReviewModal;
