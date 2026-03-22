import { FastifyRequest, FastifyReply } from 'fastify';
import { pool } from '../db/index.js';
import { JwtPayload } from '../types.js';

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // WebSocket handshake sends token in query (?token=...); jwtVerify only checks Authorization header
    const queryToken = (request.query as { token?: string })?.token;
    if (queryToken) {
      request.jwtUser = await request.server.jwt.verify<JwtPayload>(queryToken);
    } else {
      await request.jwtVerify();
      request.jwtUser = request.user as JwtPayload;
    }
    const payload = request.jwtUser;

    // Check if user is suspended
    const result = await pool.query(
      'SELECT suspended_until FROM users WHERE id = $1',
      [payload.userId]
    );

    if (result.rows.length === 0) {
      return reply.status(401).send({ error: 'user_not_found' });
    }

    const user = result.rows[0];
    if (user.suspended_until && new Date(user.suspended_until) > new Date()) {
      return reply.status(403).send({
        error: 'account_suspended',
        suspended_until: user.suspended_until,
      });
    }
  } catch {
    return reply.status(401).send({ error: 'unauthorized' });
  }
}
