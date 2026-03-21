import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { pool } from '../db/index.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireProfileCompleted } from '../middleware/requireProfileCompleted.js';
import { createNotification } from '../services/notifications.js';

const requestConnectionSchema = z.object({
  target_user_id: z.string().uuid(),
});

export default async function connectionsRoutes(fastify: FastifyInstance) {
  // POST /connections/requests
  fastify.post(
    '/connections/requests',
    { preHandler: [authenticate, requireProfileCompleted] },
    async (request, reply) => {
      const parsed = requestConnectionSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'validation_error', details: parsed.error.flatten() });
      }

      const { target_user_id } = parsed.data;
      const currentUserId = request.jwtUser!.userId;

      if (target_user_id === currentUserId) {
        return reply.status(400).send({ error: 'cannot_connect_with_self' });
      }

      // Enforce user_a < user_b ordering
      const [userAId, userBId] =
        currentUserId < target_user_id
          ? [currentUserId, target_user_id]
          : [target_user_id, currentUserId];

      // Check target user exists and is approved
      const targetResult = await pool.query(
        `SELECT id, full_name, membership_status, profile_completed_at FROM users WHERE id = $1`,
        [target_user_id]
      );

      if (targetResult.rows.length === 0) {
        return reply.status(404).send({ error: 'user_not_found' });
      }

      const targetUser = targetResult.rows[0];
      if (targetUser.membership_status !== 'approved') {
        return reply.status(400).send({ error: 'target_user_not_available' });
      }

      try {
        const result = await pool.query(
          `INSERT INTO user_connections (user_a_id, user_b_id, status, requested_by_user_id)
           VALUES ($1, $2, 'pending', $3)
           RETURNING *`,
          [userAId, userBId, currentUserId]
        );

        // Notify target user
        const senderResult = await pool.query(
          'SELECT full_name FROM users WHERE id = $1',
          [currentUserId]
        );
        const senderName = senderResult.rows[0]?.full_name || 'Someone';

        await createNotification(
          target_user_id,
          'connection_request',
          'New connection request',
          `${senderName} wants to connect with you`,
          { connection_id: result.rows[0].id, requester_id: currentUserId }
        );

        return reply.status(201).send({ connection: result.rows[0] });
      } catch (err: unknown) {
        const error = err as { code?: string };
        if (error.code === '23505') {
          return reply.status(409).send({ error: 'connection_already_exists' });
        }
        throw err;
      }
    }
  );

  // POST /connections/requests/:id/accept
  fastify.post(
    '/connections/requests/:id/accept',
    { preHandler: authenticate },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const currentUserId = request.jwtUser!.userId;

      const connResult = await pool.query(
        'SELECT * FROM user_connections WHERE id = $1',
        [id]
      );

      if (connResult.rows.length === 0) {
        return reply.status(404).send({ error: 'connection_not_found' });
      }

      const conn = connResult.rows[0];

      // Only the target (non-requester) can accept
      const targetUserId =
        conn.requested_by_user_id === conn.user_a_id ? conn.user_b_id : conn.user_a_id;

      if (targetUserId !== currentUserId) {
        return reply.status(403).send({ error: 'forbidden' });
      }

      if (conn.status !== 'pending') {
        return reply.status(400).send({ error: 'connection_not_pending' });
      }

      const result = await pool.query(
        `UPDATE user_connections
         SET status = 'accepted', resolved_at = now()
         WHERE id = $1
         RETURNING *`,
        [id]
      );

      // Notify the requester
      const accepterResult = await pool.query(
        'SELECT full_name FROM users WHERE id = $1',
        [currentUserId]
      );
      const accepterName = accepterResult.rows[0]?.full_name || 'Someone';

      await createNotification(
        conn.requested_by_user_id,
        'connection_accepted',
        'Connection accepted',
        `${accepterName} accepted your connection request`,
        { connection_id: id, accepter_id: currentUserId }
      );

      return reply.send({ connection: result.rows[0] });
    }
  );

  // POST /connections/requests/:id/reject
  fastify.post(
    '/connections/requests/:id/reject',
    { preHandler: authenticate },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const currentUserId = request.jwtUser!.userId;

      const connResult = await pool.query(
        'SELECT * FROM user_connections WHERE id = $1',
        [id]
      );

      if (connResult.rows.length === 0) {
        return reply.status(404).send({ error: 'connection_not_found' });
      }

      const conn = connResult.rows[0];

      // Only the target (non-requester) can reject
      const targetUserId =
        conn.requested_by_user_id === conn.user_a_id ? conn.user_b_id : conn.user_a_id;

      if (targetUserId !== currentUserId) {
        return reply.status(403).send({ error: 'forbidden' });
      }

      if (conn.status !== 'pending') {
        return reply.status(400).send({ error: 'connection_not_pending' });
      }

      await pool.query('DELETE FROM user_connections WHERE id = $1', [id]);

      return reply.send({ message: 'connection_rejected' });
    }
  );

  // GET /connections
  fastify.get(
    '/connections',
    { preHandler: authenticate },
    async (request, reply) => {
      const currentUserId = request.jwtUser!.userId;
      const query = request.query as { tab?: string };
      const tab = query.tab || 'connected';

      let result;

      if (tab === 'connected') {
        result = await pool.query(
          `SELECT uc.id, uc.status, uc.requested_by_user_id, uc.created_at, uc.resolved_at,
                  u.id AS other_user_id, u.full_name, u.professional_role, u.bio,
                  d.name AS district_name, d.state_region AS district_state_region
           FROM user_connections uc
           JOIN users u ON (
             CASE WHEN uc.user_a_id = $1 THEN uc.user_b_id ELSE uc.user_a_id END = u.id
           )
           LEFT JOIN districts d ON d.id = u.district_id
           WHERE (uc.user_a_id = $1 OR uc.user_b_id = $1) AND uc.status = 'accepted'
           ORDER BY uc.resolved_at DESC`,
          [currentUserId]
        );
      } else if (tab === 'pending_sent') {
        result = await pool.query(
          `SELECT uc.id, uc.status, uc.requested_by_user_id, uc.created_at,
                  u.id AS other_user_id, u.full_name, u.professional_role,
                  d.name AS district_name
           FROM user_connections uc
           JOIN users u ON (
             CASE WHEN uc.user_a_id = $1 THEN uc.user_b_id ELSE uc.user_a_id END = u.id
           )
           LEFT JOIN districts d ON d.id = u.district_id
           WHERE (uc.user_a_id = $1 OR uc.user_b_id = $1)
             AND uc.status = 'pending'
             AND uc.requested_by_user_id = $1
           ORDER BY uc.created_at DESC`,
          [currentUserId]
        );
      } else if (tab === 'pending_received') {
        result = await pool.query(
          `SELECT uc.id, uc.status, uc.requested_by_user_id, uc.created_at,
                  u.id AS other_user_id, u.full_name, u.professional_role,
                  d.name AS district_name
           FROM user_connections uc
           JOIN users u ON (
             CASE WHEN uc.user_a_id = $1 THEN uc.user_b_id ELSE uc.user_a_id END = u.id
           )
           LEFT JOIN districts d ON d.id = u.district_id
           WHERE (uc.user_a_id = $1 OR uc.user_b_id = $1)
             AND uc.status = 'pending'
             AND uc.requested_by_user_id != $1
           ORDER BY uc.created_at DESC`,
          [currentUserId]
        );
      } else {
        return reply.status(400).send({ error: 'invalid_tab', valid: ['connected', 'pending_sent', 'pending_received'] });
      }

      return reply.send({ connections: result.rows });
    }
  );
}
