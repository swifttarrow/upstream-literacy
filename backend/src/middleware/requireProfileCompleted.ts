import { FastifyRequest, FastifyReply } from 'fastify';
import { pool } from '../db/index.js';

export async function requireProfileCompleted(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (!request.jwtUser) {
    return reply.status(401).send({ error: 'unauthorized' });
  }

  const result = await pool.query(
    'SELECT profile_completed_at FROM users WHERE id = $1',
    [request.jwtUser.userId]
  );

  if (result.rows.length === 0 || !result.rows[0].profile_completed_at) {
    return reply.status(403).send({ error: 'profile_incomplete' });
  }
}
