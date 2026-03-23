// Use /api proxy (Next.js rewrites to backend) when no explicit API URL; avoids CORS and 404s when backend URL differs.
// Server-side must use full URL including /api since rewrites only apply to browser requests.
const API_BASE =
  typeof window !== 'undefined'
    ? process.env.NEXT_PUBLIC_API_URL || '/api'
    : process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001/api';

class ApiError extends Error {
  constructor(
    public status: number,
    public data: unknown,
    message?: string
  ) {
    super(message || `API Error ${status}`);
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const hasBody = options.body !== undefined && options.body !== null;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (hasBody && !headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    // Prevent stale cache for GET; connections/discovery tabs need fresh data
    cache: options.method === undefined || options.method === 'GET' ? 'no-store' : undefined,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new ApiError(response.status, data, data?.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

export { ApiError };
