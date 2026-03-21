'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { getToken, isAuthenticated } from '@/lib/auth';
import NavBar from '@/components/NavBar';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  body: string;
  created_at: string;
}

interface Participant {
  user_id: string;
  full_name: string;
  professional_role: string | null;
  left_at: string | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const WS_BASE = API_BASE.replace(/^http/, 'ws');

export default function ConversationPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { id } = params;

  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadData();
    connectWebSocket();

    return () => {
      wsRef.current?.close();
    };
  }, [id, router]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [messagesRes, participantsRes] = await Promise.all([
        api.get<{ messages: Message[] }>(`/conversations/${id}/messages`),
        api.get<{ participants: Participant[] }>(`/conversations/${id}/participants`),
      ]);
      setMessages(messagesRes.messages);
      setParticipants(participantsRes.participants.filter((p) => !p.left_at));
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        router.push('/conversations');
      } else {
        setError('Failed to load conversation');
      }
    } finally {
      setLoading(false);
    }
  };

  const connectWebSocket = useCallback(() => {
    const token = getToken();
    if (!token) return;

    const ws = new WebSocket(`${WS_BASE}/ws?token=${token}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.event === 'new_message' && msg.data.conversation_id === id) {
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === msg.data.id)) return prev;
            return [...prev, msg.data];
          });
        }
      } catch {
        // ignore
      }
    };

    ws.onopen = () => {
      ws.send(JSON.stringify({ event: 'subscribe', conversation_id: id }));
    };

    ws.onclose = () => {
      // Reconnect after delay
      setTimeout(connectWebSocket, 3000);
    };
  }, [id]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const data = await api.post<{ message: Message }>(
        `/conversations/${id}/messages`,
        { body: newMessage.trim() }
      );
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.message.id)) return prev;
        return [...prev, data.message];
      });
      setNewMessage('');
    } catch {
      setError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleSummarize = async () => {
    setAiLoading(true);
    setAiResult('');
    try {
      const data = await api.post<{ summary: string }>(`/conversations/${id}/summarize`);
      setAiResult(data.summary);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setAiResult('Rate limit reached. Try again in an hour.');
      } else {
        setAiResult('Failed to generate summary.');
      }
    } finally {
      setAiLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!confirm('Leave this conversation?')) return;
    try {
      await api.delete(`/conversations/${id}/participants/me`);
      router.push('/conversations');
    } catch {
      setError('Failed to leave conversation');
    }
  };

  return (
    <>
      <NavBar />
      <div className="max-w-4xl mx-auto px-4 py-4 flex flex-col h-[calc(100vh-4rem)]">
        {/* Header */}
        <div className="card mb-4 flex items-center justify-between py-3">
          <div>
            <h1 className="font-semibold text-gray-900">Conversation</h1>
            <p className="text-sm text-gray-500">
              {participants.map((p) => p.full_name).join(', ')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSummarize}
              disabled={aiLoading}
              className="btn-secondary text-sm"
            >
              {aiLoading ? 'Summarizing...' : 'AI Summary'}
            </button>
            <button onClick={handleLeave} className="text-sm text-red-600 hover:text-red-700">
              Leave
            </button>
          </div>
        </div>

        {/* AI Result */}
        {aiResult && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">AI Summary</h3>
            <p className="text-sm text-blue-800">{aiResult}</p>
            <button
              onClick={() => setAiResult('')}
              className="mt-2 text-xs text-blue-600 hover:text-blue-700"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto card mb-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-pulse text-gray-400">Loading messages...</div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-400">No messages yet. Say hello!</p>
            </div>
          ) : (
            <div className="space-y-4 p-4">
              {messages.map((msg) => (
                <div key={msg.id} className="flex flex-col">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">{msg.sender_name}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2 max-w-prose">
                    {msg.body}
                  </p>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Compose */}
        <form onSubmit={handleSend} className="flex gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="input-field flex-1"
            placeholder="Type a message..."
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="btn-primary"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </>
  );
}
