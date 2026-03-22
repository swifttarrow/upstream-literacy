'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { getUser, isAuthenticated } from '@/lib/auth';
import NavBar from '@/components/NavBar';

interface Candidate {
  id: string;
  nces_district_id: string;
  name: string;
  state: string;
  district_size: string;
  status: string;
  missing_data_indicator: boolean;
  last_refresh_at: string | null;
  district_id: string | null;
}

interface QualityAssessment {
  status: 'ready' | 'warning' | 'blocked';
  missing_required: string[];
  missing_recommended: string[];
}

interface ExistingAttribute {
  key: string;
  label: string;
  value_type: string;
  value_text: string | null;
  value_number: number | null;
  provenance: string;
  updated_at: string;
}

interface PreviewData {
  candidate: Candidate;
  quality: QualityAssessment;
  existing_attributes: ExistingAttribute[];
  source_metadata: {
    source: string;
    nces_district_id: string;
    last_refresh_at: string | null;
  };
  normalized: {
    name: string;
    state: string;
    district_size: string;
    nces_district_id: string;
  };
  missing_fields: string[];
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
  ready_to_ingest: 'Ready to Ingest',
  in_progress: 'In Progress',
  ingested: 'Ingested',
  ingested_with_warnings: 'Ingested with Warnings',
  failed: 'Failed',
};

const QUALITY_COLORS = {
  ready: 'bg-green-50 border-green-200 text-green-700',
  warning: 'bg-orange-50 border-orange-200 text-orange-700',
  blocked: 'bg-red-50 border-red-200 text-red-700',
};

export default function CandidatePreviewPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ingestLoading, setIngestLoading] = useState(false);
  const [ingestError, setIngestError] = useState('');

  const loadPreview = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get<PreviewData>(`/admin/ingestion/candidates/${id}/preview`);
      setPreview(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError('Candidate not found');
      } else if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        router.push('/discover');
      } else {
        setError('Failed to load preview');
      }
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/login'); return; }
    const user = getUser();
    const role = user?.platform_role as string;
    if (role !== 'admin' && role !== 'moderator') { router.push('/discover'); return; }
    loadPreview();
  }, [id, loadPreview, router]);

  const handleIngest = async () => {
    if (!preview) return;
    setIngestLoading(true);
    setIngestError('');
    try {
      const result = await api.post<{ job_id: string; total_count: number }>(
        '/admin/ingestion/trigger',
        { district_ids: [id] }
      );
      router.push(`/admin/ingestion/jobs/${result.job_id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data as { message?: string };
        setIngestError(data?.message || 'Failed to start ingestion');
      }
    } finally {
      setIngestLoading(false);
    }
  };

  const getAttributeValue = (attr: ExistingAttribute) => {
    if (attr.value_number !== null) return String(attr.value_number);
    if (attr.value_text !== null) return attr.value_text;
    return '—';
  };

  if (loading) {
    return (
      <>
        <NavBar />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/2" />
            <div className="card h-40" />
            <div className="card h-40" />
          </div>
        </div>
      </>
    );
  }

  if (error || !preview) {
    return (
      <>
        <NavBar />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="card text-center py-12">
            <p className="text-gray-500">{error || 'Not found'}</p>
            <Link href="/admin/ingestion" className="mt-4 inline-block text-blue-600 hover:underline text-sm">
              Back to Ingestion Dashboard
            </Link>
          </div>
        </div>
      </>
    );
  }

  const { candidate, quality, normalized, source_metadata, existing_attributes, missing_fields } = preview;
  const alreadyIngested = ['ingested', 'ingested_with_warnings'].includes(candidate.status);

  return (
    <>
      <NavBar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link href="/admin/ingestion" className="text-sm text-gray-500 hover:text-gray-700 mb-3 inline-block">
            ← Back to Dashboard
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{candidate.name}</h1>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-gray-500 text-sm">{candidate.state}</span>
                <span className="text-gray-400 text-sm font-mono">{candidate.nces_district_id}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[candidate.status] || 'bg-gray-100 text-gray-600'}`}>
                  {STATUS_LABELS[candidate.status] || candidate.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Data quality banner */}
        <div className={`card border mb-6 ${QUALITY_COLORS[quality.status]}`}>
          <div className="flex items-center gap-2">
            <span className="font-semibold capitalize">{quality.status === 'ready' ? 'Ready to ingest' : quality.status === 'warning' ? 'Can ingest with warnings' : 'Blocked — required fields missing'}</span>
          </div>
          {quality.missing_required.length > 0 && (
            <p className="text-sm mt-1">Missing required: {quality.missing_required.join(', ')}</p>
          )}
          {quality.missing_recommended.length > 0 && (
            <p className="text-sm mt-1">Missing recommended: {quality.missing_recommended.join(', ')}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Source data */}
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Source Data (Read-only)</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Name</dt>
                <dd className="font-medium text-gray-900">{candidate.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">State</dt>
                <dd className="font-medium text-gray-900">{candidate.state}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">NCES ID</dt>
                <dd className="font-mono text-gray-900">{candidate.nces_district_id}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">District Size</dt>
                <dd className="text-gray-900">{candidate.district_size === 'xl' ? 'XL' : candidate.district_size.replace(/^./, (c) => c.toUpperCase())}</dd>
              </div>
            </dl>
          </div>

          {/* Normalized data */}
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Normalized Values</h2>
            <dl className="space-y-2 text-sm">
              {Object.entries(normalized).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <dt className="text-gray-500 capitalize">{key.replace(/_/g, ' ')}</dt>
                  <dd className="font-medium text-gray-900">{String(value) || '—'}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* Missing fields / warnings */}
        {missing_fields.length > 0 && (
          <div className="card border border-orange-200 bg-orange-50 mb-6">
            <h2 className="text-sm font-semibold text-orange-700 mb-2">Missing or Incomplete Fields</h2>
            <ul className="text-sm text-orange-700 space-y-1">
              {missing_fields.map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Re-ingest preview: current vs incoming (side-by-side diff) */}
        {alreadyIngested && (
          <div className="card mb-6 border-2 border-amber-200 bg-amber-50/50">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Re-Ingest Preview: Current vs Incoming</h2>
            <p className="text-xs text-gray-600 mb-4">
              Re-ingestion will update source-backed fields. Overrides will be preserved.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 text-gray-500 font-medium">Field</th>
                    <th className="text-left py-2 text-gray-500 font-medium w-1/3">Current Value</th>
                    <th className="text-left py-2 text-gray-500 font-medium w-1/3">Incoming Value</th>
                    <th className="text-left py-2 text-gray-500 font-medium w-16">Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {Object.entries(normalized).map(([key, incomingVal]) => {
                    const attr = existing_attributes.find((a) => a.key === key);
                    const currentVal = attr ? getAttributeValue(attr) : '—';
                    const incomingStr = incomingVal != null ? String(incomingVal) : '—';
                    const isChanged = currentVal !== incomingStr;
                    const label = attr?.label ?? key.replace(/_/g, ' ');
                    return (
                      <tr key={key}>
                        <td className="py-2 text-gray-600">{label}</td>
                        <td className="py-2">
                          <span className="font-medium text-gray-900">{currentVal}</span>
                          {attr?.provenance === 'override' && (
                            <span className="ml-1 text-xs text-purple-600">(override)</span>
                          )}
                        </td>
                        <td className="py-2 font-medium text-gray-900">{incomingStr}</td>
                        <td className="py-2">
                          {isChanged ? (
                            <span className="text-xs font-medium text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
                              will update
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">same</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}


        {/* Source metadata */}
        <div className="card mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Source Metadata</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Source</dt>
              <dd className="text-gray-900">{source_metadata.source}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">NCES District ID</dt>
              <dd className="font-mono text-gray-900">{source_metadata.nces_district_id}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Last Refresh</dt>
              <dd className="text-gray-900">
                {source_metadata.last_refresh_at
                  ? new Date(source_metadata.last_refresh_at).toLocaleString()
                  : 'Not yet refreshed'}
              </dd>
            </div>
          </dl>
        </div>

        {/* Action bar */}
        {ingestError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {ingestError}
          </div>
        )}
        <div className="flex gap-3">
          <button
            onClick={handleIngest}
            disabled={quality.status === 'blocked' || ingestLoading || candidate.status === 'in_progress'}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {ingestLoading ? 'Starting...' : alreadyIngested ? 'Re-Ingest' : 'Ingest'}
          </button>
          {alreadyIngested && candidate.district_id && (
            <Link
              href={`/admin/ingestion/districts/${candidate.district_id}/edit`}
              className="btn-secondary"
            >
              Edit District
            </Link>
          )}
          <Link href="/admin/ingestion" className="btn-secondary">
            Cancel
          </Link>
        </div>
      </div>
    </>
  );
}
