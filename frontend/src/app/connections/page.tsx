'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import NavBar from '@/components/NavBar';

interface Connection {
  id: string;
  status: string;
  requested_by_user_id: string;
  created_at: string;
  resolved_at: string | null;
  other_user_id: string;
  full_name: string;
  professional_role: string | null;
  district_name: string | null;
}

type Tab = 'connected' | 'pending_sent' | 'pending_received';

export default function ConnectionsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('connected');
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadConnections();
  }, [tab, router]);

  const loadConnections = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get<{ connections: Connection[] }>(
        `/connections?tab=${tab}`
      );
      setConnections(data.connections);
    } catch {
      setError('Failed to load connections');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (connectionId: string) => {
    setActionLoading(connectionId);
    try {
      await api.post(`/connections/requests/${connectionId}/accept`);
      loadConnections();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (connectionId: string) => {
    setActionLoading(connectionId);
    try {
      await api.post(`/connections/requests/${connectionId}/reject`);
      loadConnections();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleMessage = async (otherUserId: string) => {
    try {
      const data = await api.post<{ conversation: { id: string } }>('/conversations', {
        type: 'direct',
        other_user_id: otherUserId,
      });
      router.push(`/conversations/${data.conversation.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const errorData = err.data as { conversation?: { id: string } };
        if (errorData?.conversation?.id) {
          router.push(`/conversations/${errorData.conversation.id}`);
        }
      }
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'connected', label: 'Connected' },
    { id: 'pending_received', label: 'Received' },
    { id: 'pending_sent', label: 'Sent' },
  ];

  return (
    <>
      <NavBar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Connections</h1>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex gap-6">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`py-2 text-sm font-medium border-b-2 transition-colors ${
                  tab === t.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/4" />
              </div>
            ))}
          </div>
        ) : connections.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-500">
              {tab === 'connected' && 'No connections yet. Visit Discover to find peers.'}
              {tab === 'pending_sent' && 'No pending outgoing requests.'}
              {tab === 'pending_received' && 'No pending incoming requests.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {connections.map((conn) => (
              <div key={conn.id} className="card flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{conn.full_name}</h3>
                  {conn.professional_role && (
                    <p className="text-sm text-gray-600">{conn.professional_role}</p>
                  )}
                  {conn.district_name && (
                    <p className="text-sm text-gray-500">{conn.district_name}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {tab === 'connected' && (
                    <button
                      onClick={() => handleMessage(conn.other_user_id)}
                      className="btn-primary text-sm"
                    >
                      Message
                    </button>
                  )}

                  {tab === 'pending_received' && (
                    <>
                      <button
                        onClick={() => handleAccept(conn.id)}
                        disabled={actionLoading === conn.id}
                        className="btn-primary text-sm"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleReject(conn.id)}
                        disabled={actionLoading === conn.id}
                        className="btn-secondary text-sm"
                      >
                        Decline
                      </button>
                    </>
                  )}

                  {tab === 'pending_sent' && (
                    <span className="text-sm text-gray-500">Pending</span>
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
