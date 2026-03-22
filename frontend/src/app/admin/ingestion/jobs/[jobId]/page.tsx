'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { getUser, isAuthenticated } from '@/lib/auth';
import NavBar from '@/components/NavBar';

interface JobRecord {
  id: string;
  status: string;
  error_type: string | null;
  error_message: string | null;
  retry_eligible: boolean;
  warning_details: { warnings?: string[] } | null;
  candidate_id: string;
  district_name: string;
  state: string;
  nces_district_id: string;
  updated_at: string;
}

interface Job {
  id: string;
  status: string;
  total_count: number;
  succeeded_count: number;
  warning_count: number;
  failed_count: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  created_by_name: string | null;
}

interface ExistingAttribute {
  key: string;
  label: string;
  value_type: string;
  value_text: string | null;
  value_number: number | null;
  provenance: string;
}

interface RecordPreviewData {
  candidate: { name: string; state: string; district_size: string; nces_district_id: string; district_id: string | null };
  existing_attributes: ExistingAttribute[];
  normalized: { name: string; state: string; district_size: string; nces_district_id: string };
}

const JOB_STATUS_COLORS: Record<string, string> = {
  queued: 'bg-gray-100 text-gray-600',
  running: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  completed_with_warnings: 'bg-orange-100 text-orange-700',
  failed: 'bg-red-100 text-red-700',
  partially_failed: 'bg-red-50 text-red-600',
};

const RECORD_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  running: 'bg-yellow-100 text-yellow-700',
  succeeded: 'bg-green-100 text-green-700',
  succeeded_with_warnings: 'bg-orange-100 text-orange-700',
  failed: 'bg-red-100 text-red-700',
};

const TERMINAL_STATUSES = new Set([
  'completed', 'completed_with_warnings', 'failed', 'partially_failed'
]);

type TabType = 'all' | 'succeeded' | 'warnings' | 'failed';

export default function JobDetailPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.jobId as string;

  const [job, setJob] = useState<Job | null>(null);
  const [records, setRecords] = useState<JobRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<TabType>('all');
  const [retryLoading, setRetryLoading] = useState(false);
  const [retryError, setRetryError] = useState('');
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);
  const [expandedPreview, setExpandedPreview] = useState<RecordPreviewData | null>(null);
  const [expandedLoading, setExpandedLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleRowClick = async (record: JobRecord) => {
    if (expandedRecordId === record.id) {
      setExpandedRecordId(null);
      setExpandedPreview(null);
      return;
    }
    setExpandedRecordId(record.id);
    setExpandedPreview(null);
    setExpandedLoading(true);
    try {
      const data = await api.get<{
        candidate: { name: string; state: string; district_size: string; nces_district_id: string; district_id: string | null };
        existing_attributes: ExistingAttribute[];
        normalized: { name: string; state: string; district_size: string; nces_district_id: string };
      }>(`/admin/ingestion/candidates/${record.candidate_id}/preview`);
      setExpandedPreview(data);
    } catch {
      setExpandedPreview(null);
    } finally {
      setExpandedLoading(false);
    }
  };

  const loadJob = useCallback(async () => {
    try {
      const data = await api.get<{ job: Job; records: JobRecord[] }>(
        `/admin/ingestion/jobs/${jobId}`
      );
      setJob(data.job);
      setRecords(data.records);
      setError('');

      // Poll if job is still running (1s for responsive progress updates)
      if (!TERMINAL_STATUSES.has(data.job.status)) {
        if (pollRef.current) clearTimeout(pollRef.current);
        pollRef.current = setTimeout(loadJob, 1000);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError('Job not found');
      } else {
        setError('Failed to load job');
      }
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/login'); return; }
    const user = getUser();
    const role = user?.platform_role as string;
    if (role !== 'admin' && role !== 'moderator') { router.push('/discover'); return; }
    loadJob();
    return () => { if (pollRef.current) clearTimeout(pollRef.current); };
  }, [jobId, loadJob, router]);

  const handleRetryAll = async () => {
    setRetryLoading(true);
    setRetryError('');
    try {
      const result = await api.post<{ job_id: string; total_count: number }>(
        `/admin/ingestion/jobs/${jobId}/retry`,
        {}
      );
      router.push(`/admin/ingestion/jobs/${result.job_id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data as { message?: string };
        setRetryError(data?.message || 'Retry failed');
      }
    } finally {
      setRetryLoading(false);
    }
  };

  const filteredRecords = records.filter((r) => {
    if (tab === 'all') return true;
    if (tab === 'succeeded') return r.status === 'succeeded' || r.status === 'succeeded_with_warnings';
    if (tab === 'warnings') return r.status === 'succeeded_with_warnings';
    if (tab === 'failed') return r.status === 'failed';
    return true;
  });

  const failedEligibleCount = records.filter(
    (r) => r.status === 'failed' && r.retry_eligible
  ).length;

  const isRunning = job && !TERMINAL_STATUSES.has(job.status);
  const progress = job && job.total_count > 0
    ? Math.round(((job.succeeded_count + job.warning_count + job.failed_count) / job.total_count) * 100)
    : 0;

  if (loading) {
    return (
      <>
        <NavBar />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3" />
            <div className="card h-32" />
            <div className="card h-64" />
          </div>
        </div>
      </>
    );
  }

  if (error || !job) {
    return (
      <>
        <NavBar />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="card text-center py-12">
            <p className="text-gray-500">{error || 'Not found'}</p>
            <Link href="/admin/ingestion" className="mt-4 inline-block text-blue-600 hover:underline text-sm">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <NavBar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/admin/ingestion" className="text-sm text-gray-500 hover:text-gray-700 mb-3 inline-block">
            ← Back to Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Ingestion Job</h1>
              <p className="text-xs text-gray-400 font-mono mt-1">{job.id}</p>
            </div>
            <span className={`text-sm font-medium px-3 py-1 rounded-full ${JOB_STATUS_COLORS[job.status] || 'bg-gray-100 text-gray-600'}`}>
              {job.status.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        {/* Progress card */}
        <div className="card mb-6">
          <div className="grid grid-cols-4 gap-4 mb-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">{job.total_count}</div>
              <div className="text-xs text-gray-500">Total</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{job.succeeded_count + job.warning_count}</div>
              <div className="text-xs text-gray-500">Succeeded</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-500">{job.warning_count}</div>
              <div className="text-xs text-gray-500">Warnings</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{job.failed_count}</div>
              <div className="text-xs text-gray-500">Failed</div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                job.status === 'failed' ? 'bg-red-500' :
                job.status === 'completed_with_warnings' || job.status === 'partially_failed' ? 'bg-orange-500' :
                'bg-green-500'
              }`}
              style={{ width: `${isRunning ? Math.max(progress, 5) : 100}%` }}
            />
          </div>

          {isRunning && (
            <p className="text-xs text-gray-500 animate-pulse">Processing... {progress}% complete</p>
          )}

          <div className="flex items-center gap-4 text-xs text-gray-400 mt-2">
            {job.started_at && (
              <span>Started: {new Date(job.started_at).toLocaleString()}</span>
            )}
            {job.completed_at && (
              <span>Completed: {new Date(job.completed_at).toLocaleString()}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        {retryError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {retryError}
          </div>
        )}
        {failedEligibleCount > 0 && (
          <div className="mb-4 flex items-center gap-3">
            <button
              onClick={handleRetryAll}
              disabled={retryLoading}
              className="btn-secondary text-sm text-red-700 border-red-200 hover:bg-red-50 disabled:opacity-50"
            >
              {retryLoading ? 'Retrying...' : `Retry All Eligible (${failedEligibleCount})`}
            </button>
            <p className="text-xs text-gray-500">Only retry-eligible failures will be re-processed</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-4 border-b border-gray-200">
          {(['all', 'succeeded', 'warnings', 'failed'] as TabType[]).map((t) => {
            const counts: Record<TabType, number> = {
              all: records.length,
              succeeded: records.filter((r) => r.status === 'succeeded' || r.status === 'succeeded_with_warnings').length,
              warnings: records.filter((r) => r.status === 'succeeded_with_warnings').length,
              failed: records.filter((r) => r.status === 'failed').length,
            };
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm capitalize transition-colors ${
                  tab === t
                    ? 'border-b-2 border-blue-500 text-blue-600 font-medium'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t} ({counts[t]})
              </button>
            );
          })}
        </div>

        {/* Records list */}
        {filteredRecords.length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-gray-400 text-sm">No records in this category</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-500 mb-2">Click a row to expand and view processed data</p>
            <div className="card overflow-hidden p-0">
            <div className="divide-y divide-gray-100">
              {filteredRecords.map((record) => (
                <div key={record.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => handleRowClick(record)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRowClick(record)}
                    className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${RECORD_STATUS_COLORS[record.status] || 'bg-gray-100 text-gray-600'}`}>
                          {record.status.replace(/_/g, ' ')}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{record.district_name}</p>
                          <p className="text-xs text-gray-400">{record.state} · {record.nces_district_id}</p>
                        </div>
                        {expandedRecordId === record.id && (
                          <span className="text-xs text-blue-500">
                            {expandedLoading ? 'Loading...' : '▼'}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(record.updated_at).toLocaleTimeString()}
                      </span>
                    </div>

                    {/* Error details */}
                    {record.error_message && (
                      <div className="mt-2 pl-4">
                        <p className="text-xs text-red-600">
                          {record.error_type && <span className="font-medium">{record.error_type}: </span>}
                          {record.error_message}
                        </p>
                        {record.retry_eligible && (
                          <span className="text-xs text-green-600">Retry eligible</span>
                        )}
                      </div>
                    )}

                    {/* Warning details */}
                    {record.warning_details?.warnings && (
                      <div className="mt-2 pl-4">
                        {record.warning_details.warnings.map((w, i) => (
                          <p key={i} className="text-xs text-orange-600">{w}</p>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Expanded: processed data */}
                  {expandedRecordId === record.id && (
                    <div className="px-4 pb-4 pt-0 border-t border-gray-100 bg-gray-50/50">
                      {expandedLoading ? (
                        <p className="text-xs text-gray-500 py-2">Loading processed data...</p>
                      ) : expandedPreview ? (
                        <div className="space-y-3 text-sm">
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Normalized fields</p>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                              <span className="text-gray-500">Name</span>
                              <span>{expandedPreview.normalized.name}</span>
                              <span className="text-gray-500">State</span>
                              <span>{expandedPreview.normalized.state}</span>
                              <span className="text-gray-500">District type</span>
                              <span>{expandedPreview.normalized.district_size}</span>
                              <span className="text-gray-500">NCES ID</span>
                              <span className="font-mono">{expandedPreview.normalized.nces_district_id}</span>
                            </div>
                          </div>
                          {expandedPreview.existing_attributes.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">District attributes (after ingestion)</p>
                              <div className="space-y-1 text-xs">
                                {expandedPreview.existing_attributes.map((a) => (
                                  <div key={a.key} className="flex gap-2">
                                    <span className="text-gray-500 min-w-[100px]">{a.label}</span>
                                    <span>{a.value_text ?? (a.value_number != null ? String(a.value_number) : '—')}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {expandedPreview.candidate.district_id && (
                            <p className="text-xs text-gray-500">
                              District ID: <span className="font-mono">{expandedPreview.candidate.district_id}</span>
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 py-2">Could not load processed data</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          </>
        )}
      </div>
    </>
  );
}
