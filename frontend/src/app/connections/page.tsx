'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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

function tabFromUrl(searchParams: URLSearchParams | null): Tab | null {
  const t = searchParams?.get('tab');
  if (t === 'connected' || t === 'pending_sent' || t === 'pending_received') return t;
  return null;
}

export default function ConnectionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTab = tabFromUrl(searchParams);
  const [tab, setTab] = useState<Tab>(urlTab ?? 'connected');
  const [hasCheckedPendingReceived, setHasCheckedPendingReceived] = useState(!!urlTab);
  const [connectionsByTab, setConnectionsByTab] = useState<Partial<Record<Tab, Connection[]>>>({});
  const [loading, setLoading] = useState(true);
  const [showLoadingPlaceholder, setShowLoadingPlaceholder] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const loadIdRef = useRef(0);
  const connections = connectionsByTab[tab] ?? [];
  const hasCachedDataForTab = tab in connectionsByTab;
  const showSkeleton = loading && (showLoadingPlaceholder || !hasCachedDataForTab);

  const updateUrlForTab = useCallback((t: Tab) => {
    const params = new URLSearchParams();
    if (t !== 'connected') params.set('tab', t);
    const qs = params.toString();
    const path = qs ? `/connections?${qs}` : '/connections';
    router.replace(path, { scroll: false });
  }, [router]);

  const loadConnections = useCallback(async () => {
    const requestedTab = tab;
    const id = ++loadIdRef.current;
    setLoading(true);
    setError('');
    try {
      const data = await api.get<{
        connections: Connection[];
        meta?: { pending_received_count?: number };
      }>(`/connections?tab=${requestedTab}`);
      if (id !== loadIdRef.current) return;

      setConnectionsByTab((prev) => ({ ...prev, [requestedTab]: data.connections ?? [] }));

      // On first load with no URL tab: if user has pending received, switch to that tab
      const meta = data.meta;
      const pendingCount = meta?.pending_received_count ?? 0;
      if (
        !hasCheckedPendingReceived &&
        urlTab == null &&
        requestedTab === 'connected' &&
        pendingCount > 0
      ) {
        setHasCheckedPendingReceived(true);
        setTab('pending_received');
        updateUrlForTab('pending_received');
        return; // useEffect will re-run with new tab and load pending_received
      }
      setHasCheckedPendingReceived(true);
    } catch {
      if (id === loadIdRef.current) {
        setError('Failed to load connections');
      }
    } finally {
      if (id === loadIdRef.current) {
        setLoading(false);
      }
    }
  }, [tab, urlTab, hasCheckedPendingReceived, updateUrlForTab]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadConnections();
  }, [router, tab, loadConnections]);

  // Only show skeleton after 120ms to avoid flash on fast requests
  useEffect(() => {
    if (!loading) {
      setShowLoadingPlaceholder(false);
      return;
    }
    const t = setTimeout(() => setShowLoadingPlaceholder(true), 120);
    return () => clearTimeout(t);
  }, [loading]);

  const setTabAndUrl = (t: Tab) => {
    if (t === tab) return;
    setTab(t);
    setLoading(true);
    setShowLoadingPlaceholder(false);
    updateUrlForTab(t);
  };

  const handleAccept = async (connectionId: string) => {
    setActionLoading(connectionId);
    setError('');
    try {
      await api.post(`/connections/requests/${connectionId}/accept`);
      // Switch to Connected tab so user sees their new connection; useEffect will reload
      setTabAndUrl('connected');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      }
      loadConnections();
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
                onClick={() => setTabAndUrl(t.id)}
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

        {showSkeleton ? (
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
            {tab === 'connected' && (
              <p className="text-sm text-gray-400 mt-2">
                Check the <button type="button" onClick={() => setTabAndUrl('pending_received')} className="text-primary-600 hover:underline">Received</button> tab if someone has requested to connect with you.
              </p>
            )}
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
