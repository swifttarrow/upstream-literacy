import { FastifyInstance } from 'fastify';
import { pool } from '../db/index.js';
import { authenticate } from '../middleware/authenticate.js';

export default async function notificationsRoutes(fastify: FastifyInstance) {
  // GET /notifications
  fastify.get('/notifications', { preHandler: authenticate }, async (request, reply) => {
    const currentUserId = request.jwtUser!.userId;
    const query = request.query as { page?: string; limit?: string; unread_only?: string };
    const page = parseInt(query.page || '1');
    const limit = Math.min(parseInt(query.limit || '20'), 100);
    const offset = (page - 1) * limit;
    const unreadOnly = query.unread_only === 'true';

    const conditions = [`user_id = $1`];
    const values: unknown[] = [currentUserId];
    let idx = 2;

    if (unreadOnly) {
      conditions.push(`read_at IS NULL`);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM notifications ${where}`,
      values
    );
    const total = parseInt(countResult.rows[0].count);

    const unreadCountResult = await pool.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read_at IS NULL',
      [currentUserId]
    );
    const unreadCount = parseInt(unreadCountResult.rows[0].count);

    values.push(limit, offset);
    const result = await pool.query(
      `SELECT * FROM notifications ${where}
       ORDER BY created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      values
    );

    reply.header('X-Unread-Count', String(unreadCount));

    return reply.send({
      notifications: result.rows,
      unread_count: unreadCount,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  });

  // POST /notifications/:id/read
  fastify.post('/notifications/:id/read', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const currentUserId = request.jwtUser!.userId;

    const result = await pool.query(
      `UPDATE notifications SET read_at = now()
       WHERE id = $1 AND user_id = $2 AND read_at IS NULL
       RETURNING *`,
      [id, currentUserId]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({ error: 'notification_not_found' });
    }

    return reply.send({ notification: result.rows[0] });
  });

  // POST /notifications/read-all
  fastify.post('/notifications/read-all', { preHandler: authenticate }, async (request, reply) => {
    const currentUserId = request.jwtUser!.userId;

    const result = await pool.query(
      `UPDATE notifications SET read_at = now()
       WHERE user_id = $1 AND read_at IS NULL`,
      [currentUserId]
    );

    return reply.send({ updated: result.rowCount });
  });
}
