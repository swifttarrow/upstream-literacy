import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { pool } from '../db/index.js';
import { authenticate } from '../middleware/authenticate.js';
import { insertAuditLog } from '../services/audit.js';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().min(1).max(255),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function omitPasswordHash(user: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password_hash: _ph, ...rest } = user;
  return rest;
}

export default async function authRoutes(fastify: FastifyInstance) {
  // POST /auth/register
  fastify.post('/auth/register', async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'validation_error', details: parsed.error.flatten() });
    }

    const { email, password, full_name } = parsed.data;
    const password_hash = await bcrypt.hash(password, 12);

    try {
      const result = await pool.query(
        `INSERT INTO users (email, password_hash, full_name)
         VALUES ($1, $2, $3)
         RETURNING id, email, full_name, professional_role, bio, district_id, platform_role,
                   membership_status, is_demo_profile, profile_completed_at, suspended_until,
                   created_at, updated_at`,
        [email, password_hash, full_name]
      );

      const user = result.rows[0];
      await insertAuditLog(user.id, 'register', 'user', user.id, { email });

      return reply.status(201).send({ user: omitPasswordHash(user) });
    } catch (err: unknown) {
      const error = err as { code?: string };
      if (error.code === '23505') {
        return reply.status(409).send({ error: 'email_already_exists' });
      }
      throw err;
    }
  });

  // POST /auth/login
  fastify.post('/auth/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'validation_error', details: parsed.error.flatten() });
    }

    const { email, password } = parsed.data;

    const result = await pool.query(
      `SELECT id, email, password_hash, full_name, professional_role, bio, district_id,
              platform_role, membership_status, is_demo_profile, profile_completed_at,
              suspended_until, created_at, updated_at
       FROM users WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return reply.status(401).send({ error: 'invalid_credentials' });
    }

    const user = result.rows[0];

    if (!user.password_hash) {
      return reply.status(401).send({ error: 'invalid_credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return reply.status(401).send({ error: 'invalid_credentials' });
    }

    // Check suspension
    if (user.suspended_until && new Date(user.suspended_until) > new Date()) {
      return reply.status(403).send({
        error: 'account_suspended',
        suspended_until: user.suspended_until,
      });
    }

    const token = fastify.jwt.sign({
      userId: user.id,
      email: user.email,
      platform_role: user.platform_role,
    });

    await insertAuditLog(user.id, 'login', 'user', user.id, { email });

    return reply.send({
      token,
      user: omitPasswordHash(user),
    });
  });

  // GET /auth/me - protected
  fastify.get(
    '/auth/me',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = request.jwtUser!.userId;

      const result = await pool.query(
        `SELECT id, email, full_name, professional_role, bio, district_id,
                platform_role, membership_status, is_demo_profile, profile_completed_at,
                suspended_until, created_at, updated_at
         FROM users WHERE id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return reply.status(404).send({ error: 'user_not_found' });
      }

      return reply.send({ user: result.rows[0] });
    }
  );
}
