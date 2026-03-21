'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { api, ApiError } from '@/lib/api';
import { getUser, isAuthenticated } from '@/lib/auth';
import NavBar from '@/components/NavBar';

const IngestionMap = dynamic(() => import('@/components/IngestionMap'), { ssr: false });

interface Candidate {
  id: string;
  nces_district_id: string;
  name: string;
  state: string;
  district_type: string;
  status: string;
  missing_data_indicator: boolean;
  last_refresh_at: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface Summary {
  not_ingested: string;
  ready_to_ingest: string;
  in_progress: string;
  ingested: string;
  ingested_with_warnings: string;
  failed: string;
  total: string;
}

interface Job {
  id: string;
  status: string;
  total_count: number;
  succeeded_count: number;
  warning_count: number;
  failed_count: number;
  created_at: string;
  created_by_name: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  not_ingested: 'bg-gray-100 text-gray-600',
  ready_to_ingest: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  ingested: 'bg-green-100 text-green-700',
  ingested_with_warnings: 'bg-orange-100 text-orange-700',
  failed: 'bg-red-100 text-red-700',
};

const STATUS_LABELS: Record<string, string> = {
  not_ingested: 'Not Ingested',
  ready_to_ingest: 'Ready',
  in_progress: 'In Progress',
  ingested: 'Ingested',
  ingested_with_warnings: 'Warnings',
  failed: 'Failed',
};

const JOB_STATUS_COLORS: Record<string, string> = {
  queued: 'bg-gray-100 text-gray-600',
  running: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  completed_with_warnings: 'bg-orange-100 text-orange-700',
  failed: 'bg-red-100 text-red-700',
  partially_failed: 'bg-red-50 text-red-600',
};

const US_STATES = [
  'AK','AL','AR','AZ','CA','CO','CT','DC','DE','FL','GA','HI','IA','ID',
  'IL','IN','KS','KY','LA','MA','MD','ME','MI','MN','MO','MS','MT','NC',
  'ND','NE','NH','NJ','NM','NV','NY','OH','OK','OR','PA','RI','SC','SD',
  'TN','TX','UT','VA','VT','WA','WI','WV','WY',
];

export default function IngestionDashboardPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-8 text-gray-500">Loading...</div>}>
      <IngestionDashboard />
    </Suspense>
  );
}

function IngestionDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'table' | 'map'>('table');

  // Filters from URL
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [stateFilter, setStateFilter] = useState(searchParams.get('state') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));

  // Debounce search
  const [searchDebounced, setSearchDebounced] = useState(search);
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const updateUrl = useCallback((params: Record<string, string>) => {
    const sp = new URLSearchParams();
    if (params.search) sp.set('search', params.search);
    if (params.state) sp.set('state', params.state);
    if (params.status) sp.set('status', params.status);
    if (params.page && params.page !== '1') sp.set('page', params.page);
    const query = sp.toString();
    router.replace(`/admin/ingestion${query ? '?' + query : ''}`, { scroll: false });
  }, [router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (searchDebounced) params.set('search', searchDebounced);
      if (stateFilter) params.set('state', stateFilter);
      if (statusFilter) params.set('status', statusFilter);
      params.set('page', String(page));
      params.set('limit', '20');

      const [candidatesData, summaryData] = await Promise.all([
        api.get<{ candidates: Candidate[]; pagination: Pagination }>(
          `/admin/ingestion/candidates?${params}`
        ),
        api.get<{ summary: Summary; recent_jobs: Job[] }>('/admin/ingestion/summary'),
      ]);

      setCandidates(candidatesData.candidates);
      setPagination(candidatesData.pagination);
      setSummary(summaryData.summary);
      setRecentJobs(summaryData.recent_jobs);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        router.push('/discover');
      } else {
        setError('Failed to load ingestion data');
      }
    } finally {
      setLoading(false);
    }
  }, [searchDebounced, stateFilter, statusFilter, page, router]);

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/login'); return; }
    const user = getUser();
    const role = user?.platform_role as string;
    if (role !== 'admin' && role !== 'moderator') { router.push('/discover'); return; }
    loadData();
  }, [loadData, router]);

  const handleFilterChange = (key: string, value: string) => {
    const newPage = 1;
    if (key === 'search') setSearch(value);
    if (key === 'state') setStateFilter(value);
    if (key === 'status') setStatusFilter(value);
    setPage(newPage);
    updateUrl({
      search: key === 'search' ? value : search,
      state: key === 'state' ? value : stateFilter,
      status: key === 'status' ? value : statusFilter,
      page: '1',
    });
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === candidates.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(candidates.map((c) => c.id)));
    }
  };

  const handleIngestSelected = async () => {
    if (selected.size === 0) return;
    setActionLoading(true);
    setActionError('');
    try {
      const body: { district_ids: string[]; confirm?: boolean } = {
        district_ids: Array.from(selected),
      };
      if (selected.size > 10) body.confirm = true;
      const result = await api.post<{ job_id: string; total_count: number }>(
        '/admin/ingestion/trigger',
        body
      );
      setSelected(new Set());
      router.push(`/admin/ingestion/jobs/${result.job_id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data as { message?: string };
        setActionError(data?.message || 'Failed to start ingestion');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const hasFailed = candidates.some((c) => c.status === 'failed');
  const hasWarnings = candidates.some((c) => c.status === 'ingested_with_warnings');

  return (
    <>
      <NavBar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ingestion Console</h1>
            <p className="text-gray-500 mt-1 text-sm">Manage district data ingestion from NCES</p>
          </div>
        </div>

        {/* Summary cards */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            {[
              { key: 'not_ingested', label: 'Not Ingested', color: 'bg-gray-50 border-gray-200' },
              { key: 'ingested', label: 'Ingested', color: 'bg-green-50 border-green-200' },
              { key: 'ingested_with_warnings', label: 'Warnings', color: 'bg-orange-50 border-orange-200' },
              { key: 'failed', label: 'Failed', color: 'bg-red-50 border-red-200' },
              { key: 'in_progress', label: 'In Progress', color: 'bg-yellow-50 border-yellow-200' },
              { key: 'total', label: 'Total', color: 'bg-blue-50 border-blue-200' },
            ].map(({ key, label, color }) => (
              <button
                key={key}
                onClick={() => key !== 'total' && handleFilterChange('status', statusFilter === key ? '' : key)}
                className={`card ${color} border text-left transition-all ${
                  statusFilter === key ? 'ring-2 ring-blue-500' : 'hover:shadow-md'
                } ${key === 'total' ? 'cursor-default' : 'cursor-pointer'}`}
              >
                <div className="text-2xl font-bold text-gray-900">
                  {summary[key as keyof Summary]}
                </div>
                <div className="text-xs text-gray-500 mt-1">{label}</div>
              </button>
            ))}
          </div>
        )}

        {/* Recent jobs */}
        {recentJobs.length > 0 && (
          <div className="card mb-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Recent Jobs</h2>
            <div className="space-y-2">
              {recentJobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/admin/ingestion/jobs/${job.id}`}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${JOB_STATUS_COLORS[job.status] || 'bg-gray-100 text-gray-600'}`}>
                      {job.status.replace(/_/g, ' ')}
                    </span>
                    <span className="text-sm text-gray-600">
                      {job.total_count} districts
                      {job.succeeded_count > 0 && ` · ${job.succeeded_count} ok`}
                      {job.warning_count > 0 && ` · ${job.warning_count} warn`}
                      {job.failed_count > 0 && ` · ${job.failed_count} failed`}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(job.created_at).toLocaleString()}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="card mb-4 flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search districts..."
            value={search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="input-field flex-1 min-w-48"
          />
          <select
            value={stateFilter}
            onChange={(e) => handleFilterChange('state', e.target.value)}
            className="input-field w-32"
          >
            <option value="">All states</option>
            {US_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="input-field w-44"
          >
            <option value="">All statuses</option>
            <option value="not_ingested">Not Ingested</option>
            <option value="ready_to_ingest">Ready to Ingest</option>
            <option value="in_progress">In Progress</option>
            <option value="ingested">Ingested</option>
            <option value="ingested_with_warnings">Warnings</option>
            <option value="failed">Failed</option>
          </select>
          {hasFailed && (
            <button
              onClick={() => handleFilterChange('status', 'failed')}
              className="btn-secondary text-sm py-1.5 text-red-700 border-red-200 hover:bg-red-50"
            >
              View Failed
            </button>
          )}
          {hasWarnings && (
            <button
              onClick={() => handleFilterChange('status', 'ingested_with_warnings')}
              className="btn-secondary text-sm py-1.5 text-orange-700 border-orange-200 hover:bg-orange-50"
            >
              View Warnings
            </button>
          )}
        </div>

        {/* Table / Map tabs */}
        <div className="flex items-center gap-1 mb-4 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('table')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'table'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Table
          </button>
          <button
            onClick={() => setActiveTab('map')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'map'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Map
          </button>
        </div>

        {/* Map view */}
        {activeTab === 'map' && (
          <IngestionMap
            search={searchDebounced}
            stateFilter={stateFilter}
            statusFilter={statusFilter}
            totalCandidates={pagination?.total ?? 0}
          />
        )}

        {/* Action bar + table (table tab only) */}
        {activeTab === 'table' && (
        <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-gray-500">
            {pagination && `${pagination.total} districts`}
            {selected.size > 0 && ` · ${selected.size} selected`}
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleIngestSelected}
              disabled={selected.size === 0 || actionLoading}
              className="btn-primary text-sm py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading ? 'Starting...' : `Ingest Selected (${selected.size})`}
            </button>
          </div>
        </div>

        {actionError && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {actionError}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Candidate table */}
        {loading ? (
          <div className="card">
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="animate-pulse flex items-center gap-4 py-3">
                  <div className="w-4 h-4 bg-gray-200 rounded" />
                  <div className="flex-1 h-4 bg-gray-200 rounded" />
                  <div className="w-8 h-4 bg-gray-200 rounded" />
                  <div className="w-24 h-4 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          </div>
        ) : candidates.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-500">No districts found</p>
            {(search || stateFilter || statusFilter) && (
              <button
                onClick={() => { setSearch(''); setStateFilter(''); setStatusFilter(''); setPage(1); }}
                className="mt-2 text-sm text-blue-600 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left w-10">
                      <input
                        type="checkbox"
                        checked={selected.size === candidates.length && candidates.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">District</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">State</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">NCES ID</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Data</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Last Refresh</th>
                    <th className="px-4 py-3 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {candidates.map((candidate) => (
                    <tr
                      key={candidate.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(candidate.id)}
                          onChange={() => toggleSelect(candidate.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {candidate.name}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{candidate.state}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                        {candidate.nces_district_id}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[candidate.status] || 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_LABELS[candidate.status] || candidate.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {candidate.missing_data_indicator && (
                          <span className="text-xs text-orange-600 font-medium">Missing data</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {candidate.last_refresh_at
                          ? new Date(candidate.last_refresh_at).toLocaleDateString()
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/ingestion/candidates/${candidate.id}`}
                          className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                        >
                          Preview
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  Page {pagination.page} of {pagination.pages} ({pagination.total} total)
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setPage(page - 1); updateUrl({ search, state: stateFilter, status: statusFilter, page: String(page - 1) }); }}
                    disabled={page <= 1}
                    className="btn-secondary text-xs py-1 px-2 disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => { setPage(page + 1); updateUrl({ search, state: stateFilter, status: statusFilter, page: String(page + 1) }); }}
                    disabled={page >= pagination.pages}
                    className="btn-secondary text-xs py-1 px-2 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        </div>
        )}
      </div>
    </>
  );
}
