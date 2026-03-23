'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { clearToken, getUser, isAuthenticated } from '@/lib/auth';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
}

const typeLabel: Record<string, string> = {
  new_message: 'Message',
  connection_request: 'Connection',
  connection_accepted: 'Connection',
  membership_status: 'Account',
  moderation_update: 'Moderation',
  system: 'System',
};

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [recentNotifications, setRecentNotifications] = useState<Notification[]>([]);
  const [dropdownLoading, setDropdownLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !isAuthenticated()) return;
    const fetchUnread = async () => {
      try {
        const data = await api.get<{ unread_count: number }>('/notifications?limit=1');
        setUnreadCount(data.unread_count);
      } catch {
        // ignore
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [mounted]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const loadRecent = async () => {
      setDropdownLoading(true);
      try {
        const data = await api.get<{
          notifications: Notification[];
          unread_count: number;
        }>('/notifications?limit=5');
        setRecentNotifications(data.notifications);
        setUnreadCount(data.unread_count);
      } catch {
        // ignore
      } finally {
        setDropdownLoading(false);
      }
    };
    loadRecent();
  }, [dropdownOpen]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  const handleLogout = () => {
    clearToken();
    router.push('/login');
  };

  // Defer auth-dependent render until after mount to avoid hydration mismatch
  // (localStorage is undefined on server, so isAuthenticated() differs between server/client)
  // Render a stable placeholder while mounting to prevent layout shift / content flash.
  if (!mounted) {
    return <div className="h-16 bg-white border-b border-gray-200 sticky top-0 z-50" />;
  }
  if (!isAuthenticated()) return null;

  const user = getUser();
  const role = user?.platform_role as string | undefined;
  const isModerator = role === 'admin' || role === 'moderator';

  const hasCompletedOnboarding = Boolean(user?.profile_completed_at);

  const navLinks = [
    {
      href: '/discover',
      label: 'Discover',
      disabled: !hasCompletedOnboarding,
    },
    {
      href: '/connections',
      label: 'Connections',
      disabled: !hasCompletedOnboarding,
    },
    {
      href: '/conversations',
      label: 'Messages',
      disabled: !hasCompletedOnboarding,
    },
    ...(isModerator ? [{ href: '/admin/ingestion', label: 'Admin' }] : []),
  ];

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 overflow-visible">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/discover" className="font-bold text-primary-700 text-lg">
              Upstream Literacy
            </Link>
            <div className="hidden md:flex items-center gap-6">
              {navLinks.map((link) =>
                link.disabled ? (
                  <span
                    key={link.href}
                    className="text-sm font-medium text-gray-400 cursor-not-allowed"
                    aria-disabled="true"
                    title="Complete profile setup to unlock this section"
                  >
                    {link.label}
                  </span>
                ) : (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`text-sm font-medium transition-colors ${
                      pathname?.startsWith(link.href)
                        ? 'text-primary-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {link.label}
                  </Link>
                )
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 overflow-visible">
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen((o) => !o)}
                className="relative p-1.5 -m-1.5 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
                title="Notifications"
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
              >
                <svg
                  className="w-6 h-6 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-semibold rounded-full shadow-sm">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-80 max-h-[360px] flex flex-col bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-[100]">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                  </div>
                  <div className="overflow-y-auto flex-1 min-h-0">
                    {dropdownLoading ? (
                      <div className="px-4 py-6 space-y-3">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="animate-pulse">
                            <div className="h-3 bg-gray-200 rounded w-1/3 mb-2" />
                            <div className="h-4 bg-gray-200 rounded w-2/3" />
                          </div>
                        ))}
                      </div>
                    ) : recentNotifications.length === 0 ? (
                      <p className="px-4 py-6 text-sm text-gray-500">No notifications yet</p>
                    ) : (
                      <div className="py-1">
                        {recentNotifications.map((notif) => (
                          <Link
                            key={notif.id}
                            href="/notifications"
                            onClick={() => setDropdownOpen(false)}
                            className={`block px-4 py-2.5 hover:bg-gray-50 transition-colors ${
                              !notif.read_at ? 'bg-primary-50/50' : ''
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <span
                                className={`w-1.5 h-1.5 mt-1.5 shrink-0 rounded-full ${
                                  !notif.read_at ? 'bg-primary-500' : 'invisible'
                                }`}
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {notif.title}
                                </p>
                                {notif.body && (
                                  <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                                    {notif.body}
                                  </p>
                                )}
                                <span className="text-xs text-gray-400">
                                  {typeLabel[notif.type] || notif.type} ·{' '}
                                  {new Date(notif.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                  <Link
                    href="/notifications"
                    onClick={() => setDropdownOpen(false)}
                    className="px-4 py-2.5 text-sm font-medium text-primary-600 hover:bg-primary-50 border-t border-gray-100"
                  >
                    See all
                  </Link>
                </div>
              )}
            </div>

            <Link
              href="/profile/setup"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Profile
            </Link>

            <button
              onClick={handleLogout}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
