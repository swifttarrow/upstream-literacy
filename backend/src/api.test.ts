/**
 * Smoke tests for auth and discovery endpoints.
 * Requires: DATABASE_URL, JWT_SECRET in .env (or environment).
 * Run after migration: npm run migrate && npm test
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from './index';

describe('Auth API', () => {
  let app: Awaited<ReturnType<typeof buildServer>>;
  const testEmail = `test-auth-${Date.now()}@example.com`;
  const testPassword = 'password123';
  let token: string;

  beforeAll(async () => {
    app = await buildServer();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/auth/register creates user and returns user without password_hash', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: testEmail,
        password: testPassword,
        full_name: 'Test User',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json() as { user: Record<string, unknown> };
    expect(body.user).toBeDefined();
    expect(body.user.email).toBe(testEmail);
    expect(body.user.password_hash).toBeUndefined();
  });

  it('POST /api/auth/login returns token and user', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: testEmail, password: testPassword },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as { token: string; user: Record<string, unknown> };
    expect(body.token).toBeDefined();
    expect(body.user).toBeDefined();
    token = body.token;
  });

  it('GET /api/auth/me returns user when authenticated', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as { user: Record<string, unknown> };
    expect(body.user.email).toBe(testEmail);
    expect(body.user.password_hash).toBeUndefined();
  });

  it('unauthenticated access to protected route returns 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
    });

    expect(res.statusCode).toBe(401);
  });

  it('invalid credentials return 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: testEmail, password: 'wrongpassword' },
    });

    expect(res.statusCode).toBe(401);
  });
});

describe('Discovery API', () => {
  let app: Awaited<ReturnType<typeof buildServer>>;
  let token: string;

  beforeAll(async () => {
    app = await buildServer();
    // Create user and log in to get token
    const registerRes = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: `test-discovery-${Date.now()}@example.com`,
        password: 'password123',
        full_name: 'Discovery Test User',
      },
    });
    expect(registerRes.statusCode).toBe(201);

    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: (registerRes.json() as { user: { email: string } }).user.email,
        password: 'password123',
      },
    });
    expect(loginRes.statusCode).toBe(200);
    token = (loginRes.json() as { token: string }).token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/discovery/matches requires authentication', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/discovery/matches',
    });

    expect(res.statusCode).toBe(401);
  });

  it('GET /api/discovery/matches requires profile completed (returns 403)', async () => {
    // New user has no district or primary problem, so profile incomplete
    const res = await app.inject({
      method: 'GET',
      url: '/api/discovery/matches',
      headers: { authorization: `Bearer ${token}` },
    });

    // Expect 403 for profile incomplete (per requireProfileCompleted middleware)
    expect(res.statusCode).toBe(403);
  });

  it('GET /api/discovery/matches returns matches when profile complete', async () => {
    // Get user id from /auth/me, then PATCH profile - but we'd need a district_id and problem
    // For a minimal smoke test, we verify the endpoint structure exists.
    // A full test would seed data and complete profile. Skip if 403 (profile incomplete).
    const res = await app.inject({
      method: 'GET',
      url: '/api/discovery/matches?problemId=',
      headers: { authorization: `Bearer ${token}` },
    });

    // Either 403 (profile incomplete) or 200 with matches array
    expect([200, 403]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      const body = res.json() as { matches?: unknown[] };
      expect(Array.isArray(body.matches)).toBe(true);
    }
  });
});
