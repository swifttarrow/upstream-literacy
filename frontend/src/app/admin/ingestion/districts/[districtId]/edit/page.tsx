'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { getUser, isAuthenticated } from '@/lib/auth';
import NavBar from '@/components/NavBar';

interface Attribute {
  key: string;
  label: string;
  value_type: string;
  sort_order: number;
  value_text: string | null;
  value_number: number | null;
  provenance: 'ingest' | 'override';
  updated_at: string;
}

interface District {
  id: string;
  name: string;
  state_region: string;
  external_ref: string | null;
  attributes: Attribute[];
}

const EDITABLE_KEYS = [
  'district_type',
  'enrollment_bucket',
  'frl_bucket',
  'el_bucket',
  'grade_bands',
  'display_name',
  'notes',
];

export default function DistrictEditPage() {
  const router = useRouter();
  const params = useParams();
  const districtId = params.districtId as string;

  const [district, setDistrict] = useState<District | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [reason, setReason] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [revertLoading, setRevertLoading] = useState<string | null>(null);

  const loadDistrict = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get<{ district: District }>(`/districts/${districtId}`);
      setDistrict(data.district);

      // Initialize field values from current effective values
      const initial: Record<string, string> = {};
      for (const attr of data.district.attributes) {
        if (EDITABLE_KEYS.includes(attr.key)) {
          const val = attr.value_text !== null ? attr.value_text : attr.value_number !== null ? String(attr.value_number) : '';
          initial[attr.key] = val;
        }
      }
      setFieldValues(initial);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError('District not found');
      } else if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        router.push('/discover');
      } else {
        setError('Failed to load district');
      }
    } finally {
      setLoading(false);
    }
  }, [districtId, router]);

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/login'); return; }
    const user = getUser();
    const role = user?.platform_role as string;
    if (role !== 'admin' && role !== 'moderator') { router.push('/discover'); return; }
    loadDistrict();
  }, [districtId, loadDistrict, router]);

  const handleSave = async () => {
    if (!district) return;
    setSaveLoading(true);
    setSaveError('');
    setSaveSuccess(false);

    const fields = Object.entries(fieldValues)
      .filter(([key]) => EDITABLE_KEYS.includes(key))
      .map(([key, value]) => ({
        key,
        value_text: value || null,
      }));

    if (fields.length === 0) {
      setSaveLoading(false);
      return;
    }

    try {
      await api.patch(`/admin/ingestion/districts/${districtId}`, {
        fields,
        reason: reason || undefined,
      });
      setSaveSuccess(true);
      loadDistrict(); // Reload to show updated provenance
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data as { error?: string; details?: unknown };
        setSaveError(data?.error || 'Save failed');
      }
    } finally {
      setSaveLoading(false);
    }
  };

  const handleRevert = async (fieldKey: string) => {
    setRevertLoading(fieldKey);
    try {
      await api.delete(`/admin/ingestion/districts/${districtId}/overrides/${fieldKey}`);
      loadDistrict();
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data as { error?: string };
        setSaveError(data?.error || 'Revert failed');
      }
    } finally {
      setRevertLoading(null);
    }
  };

  const getAttribute = (key: string) =>
    district?.attributes.find((a) => a.key === key);

  if (loading) {
    return (
      <>
        <NavBar />
        <div className="max-w-3xl mx-auto px-4 py-8 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-4" />
          <div className="card h-48" />
        </div>
      </>
    );
  }

  if (error || !district) {
    return (
      <>
        <NavBar />
        <div className="max-w-3xl mx-auto px-4 py-8">
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

  // Non-editable source attributes
  const sourceAttrs = district.attributes.filter((a) => !EDITABLE_KEYS.includes(a.key));
  const editableAttrs = EDITABLE_KEYS.map((key) => ({
    key,
    label: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    attr: getAttribute(key),
  }));

  return (
    <>
      <NavBar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/admin/ingestion" className="text-sm text-gray-500 hover:text-gray-700 mb-3 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Edit District</h1>
          <p className="text-gray-500 mt-1">{district.name} · {district.state_region}</p>
        </div>

        {/* Source values (read-only) */}
        <div className="card mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Source Values (Read-only)</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Name</dt>
              <dd className="text-gray-900">{district.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">State</dt>
              <dd className="text-gray-900">{district.state_region}</dd>
            </div>
            {district.external_ref && (
              <div className="flex justify-between">
                <dt className="text-gray-500">NCES Ref</dt>
                <dd className="font-mono text-gray-900">{district.external_ref}</dd>
              </div>
            )}
            {sourceAttrs.map((attr) => (
              <div key={attr.key} className="flex justify-between">
                <dt className="text-gray-500">{attr.label}</dt>
                <dd className="text-gray-900">
                  {attr.value_text ?? (attr.value_number !== null ? attr.value_number : '—')}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Editable normalized values */}
        <div className="card mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Editable Normalized Values</h2>
          <div className="space-y-4">
            {editableAttrs.map(({ key, label, attr }) => (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">
                    {label}
                    {attr?.provenance === 'override' && (
                      <span className="ml-2 text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">override</span>
                    )}
                    {attr?.provenance === 'ingest' && (
                      <span className="ml-2 text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">source</span>
                    )}
                  </label>
                  {attr?.provenance === 'override' && (
                    <button
                      onClick={() => handleRevert(key)}
                      disabled={revertLoading === key}
                      className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    >
                      {revertLoading === key ? 'Reverting...' : 'Revert to source'}
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={fieldValues[key] ?? ''}
                  onChange={(e) => setFieldValues((prev) => ({ ...prev, [key]: e.target.value }))}
                  placeholder={`Enter ${label.toLowerCase()}...`}
                  className="input-field"
                />
                {attr && (
                  <p className="text-xs text-gray-400 mt-1">
                    Source: {attr.value_text ?? (attr.value_number !== null ? attr.value_number : 'empty')}
                    {' '}&middot; Last updated {new Date(attr.updated_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}

            {/* Override reason */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Override Reason (optional)
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason for changes..."
                className="input-field"
              />
            </div>
          </div>
        </div>

        {saveError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {saveError}
          </div>
        )}
        {saveSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            Changes saved successfully.
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saveLoading}
            className="btn-primary disabled:opacity-50"
          >
            {saveLoading ? 'Saving...' : 'Save Changes'}
          </button>
          <Link href="/admin/ingestion" className="btn-secondary">
            Cancel
          </Link>
        </div>
      </div>
    </>
  );
}
