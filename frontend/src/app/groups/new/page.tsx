'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';

interface Connection {
  other_user_id: string;
  full_name: string;
  professional_role: string | null;
}

interface ProblemStatement {
  id: string;
  label: string;
}

export default function NewGroupPage() {
  const router = useRouter();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [problems, setProblems] = useState<ProblemStatement[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [sharedProblemId, setSharedProblemId] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadData();
  }, [router]);

  const loadData = async () => {
    try {
      const [connRes, probRes] = await Promise.all([
        api.get<{ connections: Connection[] }>('/connections?tab=connected'),
        api.get<{ statements: ProblemStatement[] }>('/problem-statements'),
      ]);
      setConnections(connRes.connections);
      setProblems(probRes.statements);
    } catch {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const toggleParticipant = (userId: string) => {
    setSelected((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selected.length === 0) {
      setError('Select at least one participant');
      return;
    }

    if (selected.length > 7) {
      setError('Groups can have at most 8 participants (including yourself)');
      return;
    }

    setCreating(true);
    setError('');

    try {
      const data = await api.post<{ conversation: { id: string } }>('/conversations', {
        type: 'group',
        participant_ids: selected,
        shared_problem_statement_id: sharedProblemId || null,
      });
      router.push(`/conversations/${data.conversation.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        const errData = err.data as { error?: string; participant_id?: string };
        if (errData?.error === 'participant_not_connected') {
          setError(`Participant ${errData.participant_id} is not connected to you`);
        } else {
          setError(errData?.error || 'Failed to create group');
        }
      } else {
        setError('Network error');
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Create group conversation</h1>
          <p className="text-gray-600 mt-1">Add connected peers to a group (max 8 total)</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="animate-pulse text-gray-400">Loading...</div>
        ) : (
          <form onSubmit={handleCreate} className="space-y-6">
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Select participants ({selected.length}/7 selected)
              </h2>

              {connections.length === 0 ? (
                <p className="text-gray-500 text-sm">
                  No connected peers yet. Connect with others first.
                </p>
              ) : (
                <div className="space-y-2">
                  {connections.map((conn) => (
                    <label key={conn.other_user_id} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selected.includes(conn.other_user_id)}
                        onChange={() => toggleParticipant(conn.other_user_id)}
                        disabled={!selected.includes(conn.other_user_id) && selected.length >= 7}
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{conn.full_name}</div>
                        {conn.professional_role && (
                          <div className="text-xs text-gray-500">{conn.professional_role}</div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {problems.length > 0 && (
              <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Shared challenge (optional)
                </h2>
                <select
                  value={sharedProblemId}
                  onChange={(e) => setSharedProblemId(e.target.value)}
                  className="input-field"
                >
                  <option value="">Select a shared challenge...</option>
                  {problems.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating || selected.length === 0}
                className="btn-primary flex-1"
              >
                {creating ? 'Creating...' : 'Create group'}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
