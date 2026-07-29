import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Trophy, Award, ArrowLeft, BarChart2, ShieldCheck, RefreshCw } from 'lucide-react';
import API from '../api/api';
import Navbar from '../components/Navbar';
import { getAssetUrl } from '../utils/assetUrl';

const ElectionResults = () => {
  const { electionId } = useParams();
  const navigate = useNavigate();

  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResults();
  }, [electionId]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/elections/${electionId}/results`);
      setResults(res.data);
    } catch (err) {
      console.error('Failed to fetch election results:', err);
      toast.error('Failed to load official election results.');
    } finally {
      setLoading(false);
    }
  };

  const totalVotes = results?.candidates?.reduce((sum, c) => sum + Number(c.voteCount), 0) || 0;
  const sortedCandidates = results?.candidates
    ? [...results.candidates].sort((a, b) => Number(b.voteCount) - Number(a.voteCount))
    : [];

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300" style={{ backgroundColor: 'var(--bg-color)' }}>
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto p-6 lg:p-8">
        <button
          onClick={() => navigate('/elections')}
          className="inline-flex items-center gap-2 text-sm font-medium mb-6 opacity-70 hover:opacity-100 transition-opacity"
          style={{ color: 'var(--text-color)' }}
        >
          <ArrowLeft className="w-4 h-4" /> Back to Election Portal
        </button>

        {loading ? (
          <div className="p-16 text-center">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm opacity-70" style={{ color: 'var(--text-color)' }}>Fetching official blockchain results...</p>
          </div>
        ) : !results ? (
          <div className="p-12 text-center opacity-60">
            <p>No results available for this election.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Header Banner */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-8 text-white shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-white/20 px-3 py-1 rounded-full mb-3">
                  <ShieldCheck className="w-3.5 h-3.5" /> VERIFIED ON-CHAIN
                </span>
                <h1 className="text-3xl font-extrabold mb-2">Official Results — Election #{electionId}</h1>
                <p className="text-indigo-100 text-sm">
                  Total Valid Votes Cast: <strong className="text-white text-base">{totalVotes}</strong>
                </p>
              </div>

              <Trophy className="w-20 h-20 text-yellow-300 opacity-90 hidden sm:block flex-shrink-0" />
            </div>

            {/* Winner Spotlight Banner */}
            {results.winner && (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-6 shadow-lg flex items-center gap-6">
                <div className="p-4 bg-amber-500 text-white rounded-2xl shadow-md">
                  <Award className="w-10 h-10" />
                </div>
                <div>
                  <span className="text-xs font-bold tracking-wider uppercase text-amber-700">Winner Declaration</span>
                  <h2 className="text-2xl font-black text-amber-950 mt-0.5">{results.winner}</h2>
                  <p className="text-xs text-amber-800 mt-1">
                    Declared winner on-chain based on highest verified vote count.
                  </p>
                </div>
              </div>
            )}

            {/* Candidates Leaderboard Table */}
            <div
              className="rounded-2xl border shadow-xl overflow-hidden"
              style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
            >
              <div className="p-6 border-b flex justify-between items-center" style={{ borderColor: 'var(--border-color)' }}>
                <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-color)' }}>
                  <BarChart2 className="w-5 h-5 text-indigo-600" /> Candidate Standings & Vote Breakdown
                </h3>

                <button
                  onClick={fetchResults}
                  className="p-2 opacity-70 hover:opacity-100 rounded-lg transition-colors border shadow-sm"
                  style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
                  title="Refresh Results"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              <div className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
                {sortedCandidates.map((candidate, idx) => {
                  const votes = Number(candidate.voteCount);
                  const percentage = totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(1) : 0;
                  const isWinner = results.winner === candidate.name;

                  return (
                    <div key={candidate.id} className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-10 h-10 rounded-xl font-bold flex items-center justify-center text-sm ${
                            idx === 0
                              ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                              : idx === 1
                              ? 'bg-gray-200 text-gray-800'
                              : 'bg-black/5 dark:bg-white/10 text-gray-600'
                          }`}
                        >
                          #{idx + 1}
                        </div>

                        {candidate.photoPath ? (
                          <img
                            src={getAssetUrl(candidate.photoPath)}
                            alt={candidate.name}
                            className="w-12 h-12 rounded-full object-cover border border-gray-200"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center">
                            {candidate.name?.charAt(0) || '?'}
                          </div>
                        )}

                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-lg font-bold" style={{ color: 'var(--text-color)' }}>
                              {candidate.name}
                            </h4>
                            {isWinner && (
                              <span className="text-xs font-bold bg-yellow-400 text-yellow-950 px-2 py-0.5 rounded">
                                Winner
                              </span>
                            )}
                          </div>
                          <p className="text-xs opacity-60" style={{ color: 'var(--text-color)' }}>
                            {candidate.party || 'Independent Candidate'}
                          </p>
                        </div>
                      </div>

                      <div className="w-full sm:w-64">
                        <div className="flex justify-between text-xs font-bold mb-1" style={{ color: 'var(--text-color)' }}>
                          <span>{votes} votes</span>
                          <span>{percentage}%</span>
                        </div>
                        <div className="w-full bg-black/10 dark:bg-white/10 h-3 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${isWinner ? 'bg-amber-500' : 'bg-indigo-600'}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ElectionResults;
