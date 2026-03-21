'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import NavBar from '@/components/NavBar';

interface Match {
  id: string;
  full_name: string;
  professional_role: string | null;
  bio: string | null;
  district_name: string | null;
  district_state_region: string | null;
  is_demo_profile: boolean;
  matchType: 'exact' | 'close';
  explanation: string;
  connectionStatus: 'none' | 'pending_sent' | 'pending_received' | 'connected';
}

interface MatchResponse {
  matches: Match[];
  meta: { total: number; coldStart: boolean };
  pagination: { page: number; total: number; pages: number };
}

interface ProblemStatement {
  id: string;
  label: string;
  category_name: string;
}

export default function DiscoverPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [meta, setMeta] = useState<{ total: number; coldStart: boolean } | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [problems, setProblems] = useState<ProblemStatement[]>([]);

  const [filters, setFilters] = useState({
    problemId: '',
    stateRegion: '',
    professionalRole: '',
  });

  const [connectingIds, setConnectingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadProblems();
    loadMatches(1, true);
  }, [router]);

  const loadProblems = async () => {
    try {
      const data = await api.get<{ statements: ProblemStatement[] }>('/problem-statements');
      setProblems(data.statements);
    } catch {
      // ignore
    }
  };

  const buildQuery = (p: number, f = filters) => {
    const params = new URLSearchParams();
    params.set('page', String(p));
    if (f.problemId) params.set('problemId', f.problemId);
    if (f.stateRegion) params.set('stateRegion', f.stateRegion);
    if (f.professionalRole) params.set('professionalRole', f.professionalRole);
    return params.toString();
  };

  const loadMatches = async (p: number, reset = false, f = filters) => {
    if (reset) setLoading(true);
    else setLoadingMore(true);
    setError('');

    try {
      const data = await api.get<MatchResponse>(`/discovery/matches?${buildQuery(p, f)}`);
      setMatches((prev) => (reset ? data.matches : [...prev, ...data.matches]));
      setMeta(data.meta);
      setPage(p);
      setTotalPages(data.pagination.pages);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        router.push('/profile/setup');
      } else {
        setError('Failed to load matches. Please try again.');
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleFilterChange = (field: string, value: string) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    loadMatches(1, true, newFilters);
  };

  const handleConnect = async (userId: string) => {
    setConnectingIds((prev) => new Set(Array.from(prev).concat(userId)));
    try {
      await api.post('/connections/requests', { target_user_id: userId });
      setMatches((prev) =>
        prev.map((m) =>
          m.id === userId ? { ...m, connectionStatus: 'pending_sent' as const } : m
        )
      );
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setMatches((prev) =>
            prev.map((m) =>
              m.id === userId ? { ...m, connectionStatus: 'pending_sent' as const } : m
            )
          );
        }
      }
    } finally {
      setConnectingIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  return (
    <>
      <NavBar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Discover peers</h1>
          <p className="text-gray-600 mt-1">
            Find district staff working on similar challenges
          </p>
        </div>

        {/* Filters */}
        <div className="card mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Challenge</label>
              <select
                value={filters.problemId}
                onChange={(e) => handleFilterChange('problemId', e.target.value)}
                className="input-field"
              >
                <option value="">All challenges</option>
                {problems.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State / Region</label>
              <input
                type="text"
                value={filters.stateRegion}
                onChange={(e) => handleFilterChange('stateRegion', e.target.value)}
                className="input-field"
                placeholder="e.g. CA, TX"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <input
                type="text"
                value={filters.professionalRole}
                onChange={(e) => handleFilterChange('professionalRole', e.target.value)}
                className="input-field"
                placeholder="e.g. Superintendent"
              />
            </div>
          </div>
        </div>

        {/* Cold start notice */}
        {meta?.coldStart && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
            Not many exact matches yet — showing peers with related challenges to help you get started.
          </div>
        )}

        {/* Results */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/4 mb-4" />
                <div className="h-3 bg-gray-200 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : matches.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-500">No matches found. Try adjusting your filters.</p>
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-gray-500">{meta?.total || 0} peers found</div>
            <div className="space-y-4">
              {matches.map((match) => (
                <div key={match.id} className="card flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{match.full_name}</h3>
                      <span className={match.matchType === 'exact' ? 'badge-exact' : 'badge-close'}>
                        {match.matchType === 'exact' ? 'Exact match' : 'Close match'}
                      </span>
                      {match.is_demo_profile && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          Demo
                        </span>
                      )}
                    </div>

                    {match.professional_role && (
                      <p className="text-sm text-gray-600">{match.professional_role}</p>
                    )}

                    {match.district_name && (
                      <p className="text-sm text-gray-500">
                        {match.district_name}
                        {match.district_state_region ? ` · ${match.district_state_region}` : ''}
                      </p>
                    )}

                    {match.bio && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">{match.bio}</p>
                    )}

                    <p className="text-xs text-gray-400 mt-2 italic">{match.explanation}</p>
                  </div>

                  <div className="flex-shrink-0">
                    {match.connectionStatus === 'connected' ? (
                      <span className="text-sm text-green-600 font-medium">Connected</span>
                    ) : match.connectionStatus === 'pending_sent' ? (
                      <span className="text-sm text-gray-500">Request sent</span>
                    ) : match.connectionStatus === 'pending_received' ? (
                      <span className="text-sm text-primary-600 font-medium">Review request</span>
                    ) : (
                      <button
                        onClick={() => handleConnect(match.id)}
                        disabled={connectingIds.has(match.id)}
                        className="btn-primary text-sm"
                      >
                        {connectingIds.has(match.id) ? 'Connecting...' : 'Connect'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {page < totalPages && (
              <div className="mt-6 text-center">
                <button
                  onClick={() => loadMatches(page + 1)}
                  disabled={loadingMore}
                  className="btn-secondary"
                >
                  {loadingMore ? 'Loading...' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
