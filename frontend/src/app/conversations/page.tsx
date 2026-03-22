'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import NavBar from '@/components/NavBar';

interface Conversation {
  id: string;
  type: 'direct' | 'group';
  created_at: string;
  updated_at: string;
  shared_problem_statement_id: string | null;
}

export default function ConversationsPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<{ conversations: Conversation[] }>('/conversations');
      setConversations(data.conversations);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        router.push('/profile/setup');
      } else {
        setError('Failed to load conversations');
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadConversations();
  }, [router, loadConversations]);

  return (
    <>
      <NavBar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <Link href="/groups/new" className="btn-primary text-sm">
            New group
          </Link>
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
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-500">No conversations yet.</p>
            <p className="text-sm text-gray-400 mt-2">
              Connect with peers and start a conversation.
            </p>
            <Link href="/connections" className="btn-primary mt-4 inline-block text-sm">
              View connections
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conv) => (
              <Link
                key={conv.id}
                href={`/conversations/${conv.id}`}
                className="card block hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-900">
                      {conv.type === 'group' ? 'Group conversation' : 'Direct message'}
                    </span>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Updated {new Date(conv.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    conv.type === 'group'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {conv.type}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
