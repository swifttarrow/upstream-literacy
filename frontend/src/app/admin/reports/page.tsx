'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { getUser, isAuthenticated } from '@/lib/auth';
import NavBar from '@/components/NavBar';

interface Report {
  id: string;
  reporter_name: string;
  target_type: 'user' | 'message' | 'conversation';
  target_user_id: string | null;
  target_message_id: string | null;
  target_conversation_id: string | null;
  reason_code: string;
  details: string | null;
  status: 'open' | 'in_review' | 'resolved' | 'dismissed';
  created_at: string;
}

type ActionType =
  | 'dismiss_report'
  | 'resolve_report'
  | 'warn_user'
  | 'suspend_user'
  | 'unsuspend_user'
  | 'delete_message'
  | 'close_conversation';

export default function AdminReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<{ reports: Report[] }>(
        `/admin/reports?status=${statusFilter}`
      );
      setReports(data.reports);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        router.push('/discover');
      } else {
        setError('Failed to load reports');
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter, router]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    const user = getUser();
    const role = user?.platform_role as string;
    if (role !== 'admin' && role !== 'moderator') {
      router.push('/discover');
      return;
    }

    loadReports();
  }, [router, loadReports]);

  const handleAction = async (reportId: string, actionType: ActionType) => {
    setActionLoading(`${reportId}-${actionType}`);
    try {
      await api.post(`/admin/reports/${reportId}/actions`, {
        action_type: actionType,
        notes: notes[reportId] || undefined,
        suspend_days: actionType === 'suspend_user' ? 7 : undefined,
      });
      loadReports();
    } catch (err) {
      if (err instanceof ApiError) {
        const errData = err.data as { error?: string };
        setError(errData?.error || 'Action failed');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const statusColors: Record<string, string> = {
    open: 'bg-yellow-100 text-yellow-800',
    in_review: 'bg-blue-100 text-blue-800',
    resolved: 'bg-green-100 text-green-800',
    dismissed: 'bg-gray-100 text-gray-600',
  };

  return (
    <>
      <NavBar />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Reports Queue</h1>
          <p className="text-gray-600 mt-1">Moderator and admin view</p>
        </div>

        {/* Filters */}
        <div className="card mb-6 flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field w-40"
          >
            <option value="">All</option>
            <option value="open">Open</option>
            <option value="in_review">In Review</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-500">No reports found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <div key={report.id} className="card">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[report.status]}`}>
                        {report.status}
                      </span>
                      <span className="text-xs text-gray-500 capitalize">{report.target_type}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-900">
                      Reason: {report.reason_code}
                    </p>
                    <p className="text-xs text-gray-500">
                      Reported by: {report.reporter_name} &middot;{' '}
                      {new Date(report.created_at).toLocaleDateString()}
                    </p>
                    {report.details && (
                      <p className="text-sm text-gray-600 mt-2">{report.details}</p>
                    )}
                  </div>
                </div>

                {/* Notes input */}
                <div className="mb-3">
                  <input
                    type="text"
                    placeholder="Notes (optional)"
                    value={notes[report.id] || ''}
                    onChange={(e) =>
                      setNotes((prev) => ({ ...prev, [report.id]: e.target.value }))
                    }
                    className="input-field text-sm"
                  />
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleAction(report.id, 'dismiss_report')}
                    disabled={!!actionLoading}
                    className="btn-secondary text-sm py-1"
                  >
                    Dismiss
                  </button>
                  <button
                    onClick={() => handleAction(report.id, 'resolve_report')}
                    disabled={!!actionLoading}
                    className="btn-secondary text-sm py-1"
                  >
                    Resolve
                  </button>
                  {report.target_type === 'user' && (
                    <>
                      <button
                        onClick={() => handleAction(report.id, 'warn_user')}
                        disabled={!!actionLoading}
                        className="btn-secondary text-sm py-1"
                      >
                        Warn user
                      </button>
                      <button
                        onClick={() => handleAction(report.id, 'suspend_user')}
                        disabled={!!actionLoading}
                        className="bg-red-50 text-red-700 border border-red-200 px-3 py-1 rounded-lg text-sm hover:bg-red-100 disabled:opacity-50"
                      >
                        Suspend (7d)
                      </button>
                    </>
                  )}
                  {report.target_type === 'message' && (
                    <button
                      onClick={() => handleAction(report.id, 'delete_message')}
                      disabled={!!actionLoading}
                      className="bg-red-50 text-red-700 border border-red-200 px-3 py-1 rounded-lg text-sm hover:bg-red-100 disabled:opacity-50"
                    >
                      Delete message
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
