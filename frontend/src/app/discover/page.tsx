'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import { pageCache } from '@/lib/page-cache';

const CACHE_KEY = 'discover:page1';

interface Match {
  id: string;
  full_name: string;
  professional_role: string | null;
  bio: string | null;
  district_name: string | null;
  district_state_region: string | null;
  is_demo_profile: boolean;
  explanation: string;
  connectionStatus: 'none' | 'pending_sent' | 'pending_received' | 'connected';
  districtSimilarityScore: number;
  problemSimilarityScore: number;
  compositeScore: number;
}

interface MatchResponse {
  matches: Match[];
  meta: {
    total: number;
    profile_context: {
      district: {
        id: string | null;
        name: string | null;
        state_region: string | null;
        district_size: string | null;
        locale_type: string | null;
        locale_subtype: string | null;
      };
      selected_problem_statements: { id: string; label: string }[];
    };
  };
  pagination: { page: number; total: number; pages: number };
}

type DiscoverCache = { matches: Match[]; meta: MatchResponse['meta']; totalPages: number };

export default function DiscoverPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>(() => {
    const c = pageCache.get<DiscoverCache>(CACHE_KEY);
    return c?.matches ?? [];
  });
  const [loading, setLoading] = useState(() => !pageCache.has(CACHE_KEY));
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [meta, setMeta] = useState<MatchResponse['meta'] | null>(() => {
    const c = pageCache.get<DiscoverCache>(CACHE_KEY);
    return c?.meta ?? null;
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(() => {
    const c = pageCache.get<DiscoverCache>(CACHE_KEY);
    return c?.totalPages ?? 1;
  });

  const [connectingIds, setConnectingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadMatches(1, true);
  }, [router]);

  const buildQuery = (p: number) => {
    const params = new URLSearchParams();
    params.set('page', String(p));
    return params.toString();
  };

  const loadMatches = async (p: number, reset = false) => {
    const isDefaultView = p === 1;
    const hasCached = isDefaultView && pageCache.has(CACHE_KEY);
    if (reset && !hasCached) setLoading(true);
    else if (!reset) setLoadingMore(true);
    setError('');

    try {
      const data = await api.get<MatchResponse>(`/discovery/matches?${buildQuery(p)}`);
      if (isDefaultView) {
        pageCache.set(CACHE_KEY, { matches: data.matches, meta: data.meta, totalPages: data.pagination.pages });
      }
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
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Discover peers</h1>
          <p className="text-gray-600 mt-1">
            Matches are based on the challenges and district characteristics you set in your profile.
          </p>
        </div>

        {meta?.profile_context && (
          <div className="card mb-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Your matching profile</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">District characteristics</p>
                <ul className="space-y-1 text-gray-700">
                  <li><span className="text-gray-500">District:</span> {meta.profile_context.district.name || '—'}</li>
                  <li><span className="text-gray-500">State/region:</span> {meta.profile_context.district.state_region || '—'}</li>
                  <li><span className="text-gray-500">Size:</span> {meta.profile_context.district.district_size || '—'}</li>
                  <li><span className="text-gray-500">Locale type:</span> {meta.profile_context.district.locale_type || '—'}</li>
                  <li><span className="text-gray-500">Locale subtype:</span> {meta.profile_context.district.locale_subtype || '—'}</li>
                </ul>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Selected problem statements</p>
                {meta.profile_context.selected_problem_statements.length === 0 ? (
                  <p className="text-gray-500">No problem statements selected.</p>
                ) : (
                  <ul className="list-disc ml-5 space-y-1 text-gray-700">
                    {meta.profile_context.selected_problem_statements.map((p) => (
                      <li key={p.id}>{p.label}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
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
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        {Math.round(match.compositeScore)}/100
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

                    <p className="text-xs text-gray-400 mt-2 italic">
                      {match.explanation} · district {Math.round(match.districtSimilarityScore)}/50 · problems {Math.round(match.problemSimilarityScore)}/50
                    </p>
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
