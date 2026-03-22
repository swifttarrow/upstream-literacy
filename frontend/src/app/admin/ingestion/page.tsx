'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { api, ApiError } from '@/lib/api';
import { getToken, getUser, isAuthenticated } from '@/lib/auth';
import NavBar from '@/components/NavBar';
import { InfoTooltip } from '@/components/InfoTooltip';

const IngestionMap = dynamic(() => import('@/components/IngestionMap'), { ssr: false });

interface Candidate {
  id: string;
  nces_district_id: string;
  name: string;
  state: string;
  district_size: string;
  locale_type?: string | null;
  locale_subtype?: string | null;
  status: string;
  missing_data_indicator: boolean;
  missing_coordinates?: boolean;
  last_refresh_at: string | null;
  enrollment: number | null;
  nces_year: string | null;
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
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [jobsModalOpen, setJobsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'table' | 'map'>('table');

  // Upload state
  const [ccdFile, setCcdFile] = useState<File | null>(null);
  const [edgeFile, setEdgeFile] = useState<File | null>(null);
  const [membershipFile, setMembershipFile] = useState<File | null>(null);
  const [ncesYear, setNcesYear] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  // Filters from URL
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [stateFilter, setStateFilter] = useState(searchParams.get('state') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [districtSizeFilter, setDistrictTypeFilter] = useState(searchParams.get('district_size') || '');
  const [localeTypeFilter, setLocaleTypeFilter] = useState(searchParams.get('locale_type') || '');
  const [localeSubtypeFilter, setLocaleSubtypeFilter] = useState(searchParams.get('locale_subtype') || '');
  const [ncesYearFilter, setNcesYearFilter] = useState(searchParams.get('nces_year') || '');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));
  const [ncesYears, setNcesYears] = useState<string[]>([]);

  const LOCALE_TYPES = ['City', 'Suburb', 'Town', 'Rural'];
  const LOCALE_SUBTYPES = ['Large', 'Midsize', 'Small', 'Fringe', 'Distant', 'Remote'];

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
    if (params.district_size) sp.set('district_size', params.district_size);
    if (params.locale_type) sp.set('locale_type', params.locale_type);
    if (params.locale_subtype) sp.set('locale_subtype', params.locale_subtype);
    if (params.nces_year) sp.set('nces_year', params.nces_year);
    if (params.page && params.page !== '1') sp.set('page', params.page);
    const query = sp.toString();
    router.replace(`/admin/ingestion${query ? '?' + query : ''}`, { scroll: false });
  }, [router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    const hadData = (pagination?.total ?? 0) > 0 || recentJobs.length > 0;
    try {
      const params = new URLSearchParams();
      if (searchDebounced) params.set('search', searchDebounced);
      if (stateFilter) params.set('state', stateFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (districtSizeFilter) params.set('district_size', districtSizeFilter);
      if (localeTypeFilter) params.set('locale_type', localeTypeFilter);
      if (localeSubtypeFilter) params.set('locale_subtype', localeSubtypeFilter);
      if (ncesYearFilter) params.set('nces_year', ncesYearFilter);
      params.set('page', String(page));
      params.set('limit', '20');

      const summaryParams = ncesYearFilter ? `?nces_year=${encodeURIComponent(ncesYearFilter)}` : '';
      const [candidatesData, summaryData] = await Promise.all([
        api.get<{ candidates: Candidate[]; pagination: Pagination }>(
          `/admin/ingestion/candidates?${params}`
        ),
        api.get<{ summary: Summary; recent_jobs: Job[]; nces_years: string[] }>(
          `/admin/ingestion/summary${summaryParams}`
        ),
      ]);

      setCandidates(candidatesData.candidates);
      setPagination(candidatesData.pagination);
      setSummary(summaryData.summary);
      setRecentJobs(summaryData.recent_jobs);
      setNcesYears(summaryData.nces_years || []);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        router.push('/discover');
      } else {
        // Only set error if we have data—when no data uploaded, leave blank
        if (hadData) setError('Failed to load ingestion data.');
      }
    } finally {
      setLoading(false);
    }
  }, [searchDebounced, stateFilter, statusFilter, districtSizeFilter, localeTypeFilter, localeSubtypeFilter, ncesYearFilter, page, router]);

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/login'); return; }
    const user = getUser();
    const role = user?.platform_role as string;
    if (role !== 'admin' && role !== 'moderator') { router.push('/discover'); return; }
    loadData();
  }, [loadData, router]);

  // Default modal open when no data on first load
  useEffect(() => {
    if (!loading && (pagination?.total ?? 0) === 0 && recentJobs.length === 0) {
      setUploadModalOpen(true);
    }
  }, [loading, pagination?.total, recentJobs.length]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ccdFile || !edgeFile || !membershipFile) return;
    setUploadLoading(true);
    setUploadError('');
    setUploadSuccess('');
    setUploadProgress(0);
    const token = getToken();
    const apiBase = typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_API_URL || '/api' : 'http://127.0.0.1:3001/api';
    const base = apiBase.replace(/\/?$/, '');
    try {
      const filesToUpload: { purpose: 'ccd' | 'edge' | 'membership'; file: File }[] = [
        { purpose: 'ccd', file: ccdFile },
        { purpose: 'edge', file: edgeFile },
        { purpose: 'membership', file: membershipFile },
      ];
      const objectKeys: Record<string, string> = {};
      const totalFiles = filesToUpload.length;
      for (let i = 0; i < filesToUpload.length; i++) {
        const { purpose, file } = filesToUpload[i];
        const urlRes = await fetch(`${base}/admin/ingestion/upload-url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ purpose, filename: file.name }),
        });
        const urlData = await urlRes.json();
        if (!urlRes.ok) {
          setUploadError(urlData.message || urlData.error || 'Failed to get upload URL. Is R2/S3 configured?');
          return;
        }
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          const progressBase = (i / totalFiles) * 80;
          xhr.upload.addEventListener('progress', (ev) => {
            if (ev.lengthComputable) {
              setUploadProgress(Math.round(progressBase + (ev.loaded / ev.total) * (80 / totalFiles)));
            }
          });
          xhr.addEventListener('load', () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`))));
          xhr.addEventListener('error', () => reject(new Error('Upload failed')));
          xhr.open('PUT', urlData.uploadUrl);
          xhr.setRequestHeader('Content-Type', 'text/csv');
          xhr.send(file);
        });
        objectKeys[purpose === 'ccd' ? 'ccd_object_key' : purpose === 'edge' ? 'edge_object_key' : 'membership_object_key'] = urlData.objectKey;
      }
      setUploadProgress(90);
      const processRes = await fetch(`${base}/admin/ingestion/process-upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          ccd_object_key: objectKeys.ccd_object_key,
          edge_object_key: objectKeys.edge_object_key,
          membership_object_key: objectKeys.membership_object_key!,
          nces_year: ncesYear || undefined,
        }),
      });
      const data = await processRes.json();
      setUploadProgress(100);
      if (!processRes.ok) {
        setUploadError(data.message || data.error || 'Processing failed');
        return;
      }
      const diag = data.coordinates_diagnostic;
      const enrDiag = data.enrollment_diagnostic;
      let msg = `Upload complete — ${data.total_count} districts queued (job ${data.job_id.slice(0, 8)}…)`;
      if (diag?.without_coordinates > 0) {
        msg += ` ${diag.with_coordinates} with coordinates, ${diag.without_coordinates} missing.`;
      }
      if (enrDiag) {
        msg += ` ${enrDiag.with_enrollment} with enrollment${enrDiag.from_membership_file ? ' (from Membership file)' : ''}.`;
      }
      setUploadSuccess(msg);
      setCcdFile(null);
      setEdgeFile(null);
      setMembershipFile(null);
      router.push(`/admin/ingestion/jobs/${data.job_id}`);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadLoading(false);
      setUploadProgress(0);
    }
  };

  const closeUploadModal = () => {
    setUploadModalOpen(false);
  };

  const handleFilterChange = (key: string, value: string) => {
    setPage(1);
    if (key === 'search') setSearch(value);
    if (key === 'state') setStateFilter(value);
    if (key === 'status') setStatusFilter(value);
    if (key === 'district_size') setDistrictTypeFilter(value);
    if (key === 'locale_type') setLocaleTypeFilter(value);
    if (key === 'locale_subtype') setLocaleSubtypeFilter(value);
    if (key === 'nces_year') setNcesYearFilter(value);
    updateUrl({
      search: key === 'search' ? value : search,
      state: key === 'state' ? value : stateFilter,
      status: key === 'status' ? value : statusFilter,
      district_size: key === 'district_size' ? value : districtSizeFilter,
      locale_type: key === 'locale_type' ? value : localeTypeFilter,
      locale_subtype: key === 'locale_subtype' ? value : localeSubtypeFilter,
      nces_year: key === 'nces_year' ? value : ncesYearFilter,
      page: '1',
    });
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setJobsModalOpen(true)}
              className="btn-secondary"
            >
              Recent Jobs
            </button>
            <button
              onClick={() => setUploadModalOpen(true)}
              className="btn-primary"
            >
              Upload NCES Data
            </button>
          </div>
        </div>

        {/* Persistent upload error — visible even when modal is closed */}
        {uploadError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start justify-between gap-4">
            <p className="text-sm text-red-700 flex-1">{uploadError}</p>
            <button
              type="button"
              onClick={() => setUploadError('')}
              className="text-red-500 hover:text-red-700 shrink-0"
              aria-label="Dismiss"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Upload Modal */}
        {uploadModalOpen && (
          <div
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4"
            onClick={(e) => e.target === e.currentTarget && closeUploadModal()}
          >
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Upload NCES Data</h2>
                <button
                  onClick={closeUploadModal}
                  className="text-gray-400 hover:text-gray-600 p-1"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleUpload} className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <label className="text-sm font-medium text-gray-700">
                        CCD District File
                      </label>
                      <InfoTooltip
                        content={
                          <>
                            NCES CCD LEA directory CSV.{' '}
                            <a href="https://nces.ed.gov/ccd/files.asp" target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:underline">
                              Download from NCES CCD
                            </a>
                          </>
                        }
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </InfoTooltip>
                    </div>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => setCcdFile(e.target.files?.[0] ?? null)}
                      className="block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border file:border-gray-300 file:text-sm file:bg-white hover:file:bg-gray-50"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <label className="text-sm font-medium text-gray-700">
                        EDGE Geocode File
                      </label>
                      <InfoTooltip
                        content={
                          <>
                            EDGE Public LEA Geocode CSV (extract from ZIP).{' '}
                            <a href="https://nces.ed.gov/programs/edge/geographic/schoollocations" target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:underline">
                              Download from NCES EDGE
                            </a>
                          </>
                        }
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </InfoTooltip>
                    </div>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => setEdgeFile(e.target.files?.[0] ?? null)}
                      className="block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border file:border-gray-300 file:text-sm file:bg-white hover:file:bg-gray-50"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <label className="text-sm font-medium text-gray-700">
                        CCD Membership File
                      </label>
                      <InfoTooltip
                        content={
                          <>
                            CCD LEA Membership file (C052) has enrollment. The Directory file does not. On the LEA Universe page, find your school year and click the &quot;Membership&quot; row → Flat File link.{' '}
                            <a href="https://nces.ed.gov/ccd/pubagency.asp" target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:underline">
                              NCES LEA Universe (pubagency.asp)
                            </a>
                          </>
                        }
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </InfoTooltip>
                    </div>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => setMembershipFile(e.target.files?.[0] ?? null)}
                      className="block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border file:border-gray-300 file:text-sm file:bg-white hover:file:bg-gray-50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">NCES Year (optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 2023-24"
                    value={ncesYear}
                    onChange={(e) => setNcesYear(e.target.value)}
                    className="input-field w-36"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <button
                    type="submit"
                    disabled={!ccdFile || !edgeFile || !membershipFile || uploadLoading}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                  >
                    {uploadLoading && (
                      <svg
                        className="animate-spin h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        aria-hidden
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                    )}
                    {uploadLoading ? `Uploading… ${uploadProgress}%` : 'Upload'}
                  </button>
                </div>
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="h-1.5 bg-gray-200 rounded overflow-hidden">
                    <div className="h-full bg-blue-500 transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                )}
                {(uploadError || uploadSuccess) && (
                  <div className="space-y-2">
                    {uploadError && (
                      <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
                        {uploadError}
                      </p>
                    )}
                    {uploadSuccess && (
                      <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded p-2">{uploadSuccess}</p>
                    )}
                  </div>
                )}
              </form>
            </div>
          </div>
        )}

        {/* Recent Jobs Modal */}
        {jobsModalOpen && (
          <div
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4"
            onClick={(e) => e.target === e.currentTarget && setJobsModalOpen(false)}
          >
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-gray-200 flex items-center justify-between shrink-0">
                <h2 className="text-lg font-semibold text-gray-900">Recent Jobs</h2>
                <button
                  onClick={() => setJobsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6 overflow-y-auto">
                {recentJobs.length === 0 ? (
                  <p className="text-gray-500 text-sm">No ingestion jobs yet.</p>
                ) : (
                  <div className="space-y-2">
                    {recentJobs.map((job) => (
                      <Link
                        key={job.id}
                        href={`/admin/ingestion/jobs/${job.id}`}
                        onClick={() => setJobsModalOpen(false)}
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
                )}
              </div>
            </div>
          </div>
        )}

        {/* Empty state — no data yet */}
        {!loading && !error && pagination?.total === 0 && recentJobs.length === 0 && (
          <div className="card border-2 border-dashed border-gray-200 bg-gray-50/50 mb-6 text-center py-12">
            <p className="text-gray-600 font-medium">No district data yet</p>
            <p className="text-gray-500 text-sm mt-1 max-w-md mx-auto">
              Click &quot;Upload NCES Data&quot; to import district data from NCES. Districts will be ingested automatically when you upload.
            </p>
          </div>
        )}

        {/* Summary cards — Ingested, Warning, Failed, Total */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { key: 'ingested', label: 'Ingested', color: 'bg-green-50 border-green-200' },
              { key: 'ingested_with_warnings', label: 'Warnings', color: 'bg-orange-50 border-orange-200' },
              { key: 'failed', label: 'Failed', color: 'bg-red-50 border-red-200' },
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

        {/* Filters — search + matching criteria */}
        <div className="card mb-4 space-y-3">
          <p className="text-xs text-gray-500">Search &amp; matching criteria</p>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="Search districts..."
              value={search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="input-field flex-1 min-w-48"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={stateFilter}
              onChange={(e) => handleFilterChange('state', e.target.value)}
              className="input-field !w-auto min-w-[11rem] flex-none"
              title="State"
            >
              <option value="">All states</option>
              {US_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="input-field !w-auto min-w-[11rem] flex-none"
              title="Status"
            >
              <option value="">All statuses</option>
              {Object.entries(STATUS_LABELS).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
            <select
              value={districtSizeFilter}
              onChange={(e) => handleFilterChange('district_size', e.target.value)}
              className="input-field !w-auto min-w-[12rem] flex-none"
              title="District size (enrollment-based)"
            >
              <option value="">All district sizes</option>
              <option value="small">Small (&lt;2,500)</option>
              <option value="medium">Medium (2,500–10K)</option>
              <option value="large">Large (10K–25K)</option>
              <option value="xl">XL (25K+)</option>
            </select>
            <select
              value={localeTypeFilter}
              onChange={(e) => handleFilterChange('locale_type', e.target.value)}
              className="input-field !w-auto min-w-[11rem] flex-none"
              title="Locale type (City, Suburb, Town, Rural)"
            >
              <option value="">All locale types</option>
              {LOCALE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select
              value={localeSubtypeFilter}
              onChange={(e) => handleFilterChange('locale_subtype', e.target.value)}
              className="input-field !w-auto min-w-[11rem] flex-none"
              title="Locale subtype"
            >
              <option value="">All locale subtypes</option>
              {LOCALE_SUBTYPES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {ncesYears.length > 1 && (
              <select
                value={ncesYearFilter}
                onChange={(e) => handleFilterChange('nces_year', e.target.value)}
                className="input-field !w-auto min-w-[10rem] flex-none"
                title="NCES year"
              >
                <option value="">All years</option>
                {ncesYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            )}
            {hasFailed && (
              <button
                onClick={() => handleFilterChange('status', 'failed')}
                className="btn-secondary text-sm py-1.5 text-red-700 border-red-200 hover:bg-red-50"
              >
                View Failed
              </button>
            )}
            {(search || stateFilter || statusFilter || districtSizeFilter || localeTypeFilter || localeSubtypeFilter || ncesYearFilter) && (
              <button
                onClick={() => {
                  setSearch('');
                  setStateFilter('');
                  setStatusFilter('');
                  setDistrictTypeFilter('');
                  setLocaleTypeFilter('');
                  setLocaleSubtypeFilter('');
                  setNcesYearFilter('');
                  setPage(1);
                  updateUrl({ search: '', state: '', status: '', district_size: '', locale_type: '', locale_subtype: '', nces_year: '', page: '1' });
                }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear filters
              </button>
            )}
          </div>
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
            districtSizeFilter={districtSizeFilter}
            localeTypeFilter={localeTypeFilter}
            localeSubtypeFilter={localeSubtypeFilter}
            ncesYearFilter={ncesYearFilter}
          />
        )}

        {/* Table (table tab only) */}
        {activeTab === 'table' && (
        <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-gray-500">
            {pagination && `${pagination.total} districts`}
            {loading && candidates.length > 0 && (
              <span className="ml-2 inline-flex items-center gap-1.5 text-gray-400">
                <span className="animate-spin w-3.5 h-3.5 border border-gray-300 border-t-gray-500 rounded-full" />
                Updating…
              </span>
            )}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Candidate table — show skeletons only on initial load; keep previous data visible when refetching */}
        {loading && candidates.length === 0 ? (
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
            <p className="text-gray-500">
              {pagination?.total === 0 && !search && !stateFilter && !statusFilter && !districtSizeFilter && !localeTypeFilter && !localeSubtypeFilter && !ncesYearFilter
                ? 'No district data yet. Click "Upload NCES Data" to get started.'
                : 'No districts found'}
            </p>
          </div>
        ) : (
          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">District Name</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 w-20">State</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 w-24">Size</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 w-32">Locale</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 w-28">NCES ID</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 w-28">Enrollment</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 w-28">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 w-28">Last Refresh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {candidates.map((candidate) => (
                    <tr
                      key={candidate.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => router.push(`/admin/ingestion/candidates/${candidate.id}`)}
                      onKeyDown={(e) => e.key === 'Enter' && router.push(`/admin/ingestion/candidates/${candidate.id}`)}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {candidate.name}
                        {(candidate.missing_data_indicator || candidate.missing_coordinates) && (
                          <span
                            className="ml-1.5 text-xs text-orange-500 cursor-help"
                            title={
                              [candidate.missing_data_indicator && 'Missing fields', candidate.missing_coordinates && 'No coordinates'].filter(Boolean).join('; ')
                            }
                          >
                            ⚠
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{candidate.state}</td>
                      <td className="px-4 py-3 text-gray-600 text-sm">
                        {candidate.district_size === 'xl' ? 'XL' : candidate.district_size.replace(/^./, (c) => c.toUpperCase())}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm">
                        {[candidate.locale_type, candidate.locale_subtype].filter(Boolean).join(' ') || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                        {candidate.nces_district_id}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm">
                        {candidate.enrollment != null
                          ? candidate.enrollment.toLocaleString()
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[candidate.status] || 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_LABELS[candidate.status] || candidate.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {candidate.last_refresh_at
                          ? new Date(candidate.last_refresh_at).toLocaleDateString()
                          : '—'}
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
                    onClick={() => { setPage(page - 1); updateUrl({ search, state: stateFilter, status: statusFilter, district_size: districtSizeFilter, locale_type: localeTypeFilter, locale_subtype: localeSubtypeFilter, page: String(page - 1) }); }}
                    disabled={page <= 1}
                    className="btn-secondary text-xs py-1 px-2 disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => { setPage(page + 1); updateUrl({ search, state: stateFilter, status: statusFilter, district_size: districtSizeFilter, locale_type: localeTypeFilter, locale_subtype: localeSubtypeFilter, page: String(page + 1) }); }}
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
