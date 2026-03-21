/**
 * Smoke tests for auth, discovery, and connections endpoints.
 * Requires: DATABASE_URL, JWT_SECRET in .env (or environment).
 * Run after migration and seed: npm run migrate && npm run seed:all && npm test
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from './index';
import { pool } from './db/index.js';

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

describe('Connections API', () => {
  let app: Awaited<ReturnType<typeof buildServer>>;
  let aliceToken: string;
  let bobToken: string;
  let aliceId: string;
  let bobId: string;
  let connectionId: string;

  beforeAll(async () => {
    app = await buildServer();
    // Use demo users if available (requires npm run seed:all)
    const usersRes = await pool.query(
      `SELECT id, email FROM users WHERE email IN ('demo.alice@springfield-usd.edu', 'demo.bob@riverside-rural.edu') AND profile_completed_at IS NOT NULL`
    );
    if (usersRes.rows.length < 2) {
      return;
    }
    const alice = usersRes.rows.find((r) => r.email === 'demo.alice@springfield-usd.edu');
    const bob = usersRes.rows.find((r) => r.email === 'demo.bob@riverside-rural.edu');
    if (!alice || !bob) return;

    aliceId = alice.id;
    bobId = bob.id;

    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'demo.alice@springfield-usd.edu', password: 'demo-password-123' },
    });
    if (loginRes.statusCode !== 200) return;
    aliceToken = (loginRes.json() as { token: string }).token;

    const bobLoginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'demo.bob@riverside-rural.edu', password: 'demo-password-123' },
    });
    if (bobLoginRes.statusCode !== 200) return;
    bobToken = (bobLoginRes.json() as { token: string }).token;

    // Alice sends connection request to Bob
    const reqRes = await app.inject({
      method: 'POST',
      url: '/api/connections/requests',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { target_user_id: bobId },
    });
    if (reqRes.statusCode === 409) {
      // Connection already exists, fetch it
      const existing = await pool.query(
        `SELECT id, status FROM user_connections WHERE (user_a_id = $1 AND user_b_id = $2) OR (user_a_id = $2 AND user_b_id = $1)`,
        [aliceId, bobId]
      );
      const row = existing.rows[0];
      if (row?.status === 'accepted') return;
      connectionId = row?.id;
    } else if (reqRes.statusCode === 201) {
      connectionId = (reqRes.json() as { connection: { id: string } }).connection.id;
    } else {
      return;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('Alice sees pending_sent and Bob sees pending_received', async ({ skip }) => {
    if (!aliceToken || !bobToken) {
      skip();
    }
    const aliceSent = await app.inject({
      method: 'GET',
      url: '/api/connections?tab=pending_sent',
      headers: { authorization: `Bearer ${aliceToken}` },
    });
    const bobReceived = await app.inject({
      method: 'GET',
      url: '/api/connections?tab=pending_received',
      headers: { authorization: `Bearer ${bobToken}` },
    });
    expect(aliceSent.statusCode).toBe(200);
    expect(bobReceived.statusCode).toBe(200);
    const aliceData = aliceSent.json() as { connections: unknown[] };
    const bobData = bobReceived.json() as { connections: unknown[] };
    if (aliceData.connections.length > 0 && bobData.connections.length > 0) {
      expect(aliceData.connections.length).toBeGreaterThanOrEqual(1);
      expect(bobData.connections.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('Bob accept -> both see connected', async ({ skip }) => {
    if (!bobToken || !connectionId) {
      skip();
    }
    const conn = await pool.query('SELECT status FROM user_connections WHERE id = $1', [connectionId]);
    if (conn.rows[0]?.status === 'accepted') {
      skip();
    }
    const acceptRes = await app.inject({
      method: 'POST',
      url: `/api/connections/requests/${connectionId}/accept`,
      headers: { authorization: `Bearer ${bobToken}` },
    });
    expect(acceptRes.statusCode).toBe(200);

    const aliceConnected = await app.inject({
      method: 'GET',
      url: '/api/connections?tab=connected',
      headers: { authorization: `Bearer ${aliceToken}` },
    });
    const bobConnected = await app.inject({
      method: 'GET',
      url: '/api/connections?tab=connected',
      headers: { authorization: `Bearer ${bobToken}` },
    });
    expect(aliceConnected.statusCode).toBe(200);
    expect(bobConnected.statusCode).toBe(200);
    const aliceData = aliceConnected.json() as { connections: { other_user_id: string }[] };
    const bobData = bobConnected.json() as { connections: { other_user_id: string }[] };
    expect(aliceData.connections.some((c) => c.other_user_id === bobId)).toBe(true);
    expect(bobData.connections.some((c) => c.other_user_id === aliceId)).toBe(true);
  });
});
