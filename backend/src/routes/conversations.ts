import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { pool } from '../db/index.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireProfileCompleted } from '../middleware/requireProfileCompleted.js';
import { createNotification } from '../services/notifications.js';
import { wsConnections } from '../services/notifications.js';

const createDirectSchema = z.object({
  type: z.literal('direct'),
  other_user_id: z.string().uuid(),
  shared_problem_statement_id: z.string().uuid().optional().nullable(),
});

const createGroupSchema = z.object({
  type: z.literal('group'),
  participant_ids: z.array(z.string().uuid()).min(1).max(7),
  shared_problem_statement_id: z.string().uuid().optional().nullable(),
});

const sendMessageSchema = z.object({
  body: z.string().min(1).max(10000),
});

async function isConnected(userAId: string, userBId: string): Promise<boolean> {
  const [a, b] = userAId < userBId ? [userAId, userBId] : [userBId, userAId];
  const result = await pool.query(
    `SELECT id FROM user_connections
     WHERE user_a_id = $1 AND user_b_id = $2 AND status = 'accepted'`,
    [a, b]
  );
  return result.rows.length > 0;
}

async function broadcastMessage(
  conversationId: string,
  messageData: Record<string, unknown>,
  senderIdToSkip?: string
): Promise<void> {
  // Get all active participants
  const participantsResult = await pool.query(
    `SELECT user_id FROM conversation_participants
     WHERE conversation_id = $1 AND left_at IS NULL`,
    [conversationId]
  );

  const payload = JSON.stringify({ event: 'new_message', data: messageData });

  for (const row of participantsResult.rows) {
    if (row.user_id === senderIdToSkip) continue;
    const conns = wsConnections.get(row.user_id);
    if (conns) {
      conns.forEach((ws) => {
        try {
          const socket = ws as { send: (data: string) => void; readyState: number };
          if (socket.readyState === 1) socket.send(payload);
        } catch { /* ignore */ }
      });
    }
  }
}

export default async function conversationsRoutes(fastify: FastifyInstance) {
  // POST /conversations - create direct or group
  fastify.post(
    '/conversations',
    { preHandler: [authenticate, requireProfileCompleted] },
    async (request, reply) => {
      const body = request.body as { type?: string };
      const currentUserId = request.jwtUser!.userId;

      if (body?.type === 'direct') {
        const parsed = createDirectSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({ error: 'validation_error', details: parsed.error.flatten() });
        }

        const { other_user_id, shared_problem_statement_id } = parsed.data;

        if (other_user_id === currentUserId) {
          return reply.status(400).send({ error: 'cannot_message_self' });
        }

        // Must be connected
        const connected = await isConnected(currentUserId, other_user_id);
        if (!connected) {
          return reply.status(403).send({ error: 'not_connected' });
        }

        const [userLowId, userHighId] =
          currentUserId < other_user_id
            ? [currentUserId, other_user_id]
            : [other_user_id, currentUserId];

        // Check if direct conversation already exists
        const existingResult = await pool.query(
          `SELECT cdp.conversation_id FROM conversation_direct_pairs cdp
           WHERE cdp.user_low_id = $1 AND cdp.user_high_id = $2`,
          [userLowId, userHighId]
        );

        if (existingResult.rows.length > 0) {
          const convResult = await pool.query(
            'SELECT * FROM conversations WHERE id = $1',
            [existingResult.rows[0].conversation_id]
          );
          return reply.status(409).send({
            error: 'conversation_already_exists',
            conversation: convResult.rows[0],
          });
        }

        const client = await pool.connect();
        try {
          await client.query('BEGIN');

          const convResult = await client.query(
            `INSERT INTO conversations (type, shared_problem_statement_id, created_by_user_id)
             VALUES ('direct', $1, $2)
             RETURNING *`,
            [shared_problem_statement_id || null, currentUserId]
          );
          const conv = convResult.rows[0];

          await client.query(
            `INSERT INTO conversation_direct_pairs (conversation_id, user_low_id, user_high_id)
             VALUES ($1, $2, $3)`,
            [conv.id, userLowId, userHighId]
          );

          await client.query(
            `INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2), ($1, $3)`,
            [conv.id, currentUserId, other_user_id]
          );

          await client.query('COMMIT');
          return reply.status(201).send({ conversation: conv });
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        } finally {
          client.release();
        }
      } else if (body?.type === 'group') {
        const parsed = createGroupSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({ error: 'validation_error', details: parsed.error.flatten() });
        }

        const { participant_ids, shared_problem_statement_id } = parsed.data;

        // All participants must be connected to creator
        for (const pid of participant_ids) {
          const connected = await isConnected(currentUserId, pid);
          if (!connected) {
            return reply.status(403).send({
              error: 'participant_not_connected',
              participant_id: pid,
            });
          }
        }

        const allParticipants = [currentUserId, ...participant_ids];

        if (allParticipants.length > 8) {
          return reply.status(400).send({ error: 'too_many_participants', max: 8 });
        }

        const client = await pool.connect();
        try {
          await client.query('BEGIN');

          const convResult = await client.query(
            `INSERT INTO conversations (type, shared_problem_statement_id, created_by_user_id)
             VALUES ('group', $1, $2)
             RETURNING *`,
            [shared_problem_statement_id || null, currentUserId]
          );
          const conv = convResult.rows[0];

          for (const uid of allParticipants) {
            await client.query(
              `INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2)`,
              [conv.id, uid]
            );
          }

          await client.query('COMMIT');
          return reply.status(201).send({ conversation: conv });
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        } finally {
          client.release();
        }
      } else {
        return reply.status(400).send({ error: 'type must be direct or group' });
      }
    }
  );

  // GET /conversations - inbox list
  fastify.get(
    '/conversations',
    { preHandler: [authenticate, requireProfileCompleted] },
    async (request, reply) => {
      const currentUserId = request.jwtUser!.userId;

      const result = await pool.query(
        `SELECT c.id, c.type, c.shared_problem_statement_id, c.created_by_user_id,
                c.created_at, c.updated_at,
                cp.joined_at, cp.left_at
         FROM conversations c
         JOIN conversation_participants cp ON cp.conversation_id = c.id
         WHERE cp.user_id = $1 AND cp.left_at IS NULL
         ORDER BY c.updated_at DESC`,
        [currentUserId]
      );

      return reply.send({ conversations: result.rows });
    }
  );

  // GET /conversations/:id - detail
  fastify.get(
    '/conversations/:id',
    { preHandler: authenticate },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const currentUserId = request.jwtUser!.userId;

      // Verify participant
      const partResult = await pool.query(
        `SELECT * FROM conversation_participants
         WHERE conversation_id = $1 AND user_id = $2 AND left_at IS NULL`,
        [id, currentUserId]
      );

      if (partResult.rows.length === 0) {
        return reply.status(403).send({ error: 'not_a_participant' });
      }

      const convResult = await pool.query(
        `SELECT c.*, ps.label AS shared_problem_label, ps.code AS shared_problem_code
         FROM conversations c
         LEFT JOIN problem_statements ps ON ps.id = c.shared_problem_statement_id
         WHERE c.id = $1`,
        [id]
      );

      if (convResult.rows.length === 0) {
        return reply.status(404).send({ error: 'conversation_not_found' });
      }

      return reply.send({ conversation: convResult.rows[0] });
    }
  );

  // GET /conversations/:id/messages - paginated
  fastify.get(
    '/conversations/:id/messages',
    { preHandler: authenticate },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const currentUserId = request.jwtUser!.userId;
      const query = request.query as { page?: string; limit?: string };
      const page = parseInt(query.page || '1');
      const limit = Math.min(parseInt(query.limit || '50'), 100);
      const offset = (page - 1) * limit;

      // Verify participant
      const partResult = await pool.query(
        `SELECT * FROM conversation_participants
         WHERE conversation_id = $1 AND user_id = $2`,
        [id, currentUserId]
      );

      if (partResult.rows.length === 0) {
        return reply.status(403).send({ error: 'not_a_participant' });
      }

      const result = await pool.query(
        `SELECT m.id, m.conversation_id, m.sender_id, m.body, m.created_at, m.edited_at,
                u.full_name AS sender_name
         FROM messages m
         JOIN users u ON u.id = m.sender_id
         WHERE m.conversation_id = $1 AND m.deleted_at IS NULL
         ORDER BY m.created_at DESC
         LIMIT $2 OFFSET $3`,
        [id, limit, offset]
      );

      const countResult = await pool.query(
        'SELECT COUNT(*) FROM messages WHERE conversation_id = $1 AND deleted_at IS NULL',
        [id]
      );

      return reply.send({
        messages: result.rows.reverse(),
        pagination: {
          page, limit,
          total: parseInt(countResult.rows[0].count),
          pages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
        },
      });
    }
  );

  // POST /conversations/:id/messages - send message
  fastify.post(
    '/conversations/:id/messages',
    { preHandler: [authenticate, requireProfileCompleted] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const currentUserId = request.jwtUser!.userId;

      const parsed = sendMessageSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'validation_error', details: parsed.error.flatten() });
      }

      // Verify participant
      const partResult = await pool.query(
        `SELECT * FROM conversation_participants
         WHERE conversation_id = $1 AND user_id = $2 AND left_at IS NULL`,
        [id, currentUserId]
      );

      if (partResult.rows.length === 0) {
        return reply.status(403).send({ error: 'not_a_participant' });
      }

      const msgResult = await pool.query(
        `INSERT INTO messages (conversation_id, sender_id, body)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [id, currentUserId, parsed.data.body]
      );

      const message = msgResult.rows[0];

      // Update conversation updated_at
      await pool.query(
        'UPDATE conversations SET updated_at = now() WHERE id = $1',
        [id]
      );

      // Get sender name for notifications
      const senderResult = await pool.query(
        'SELECT full_name FROM users WHERE id = $1',
        [currentUserId]
      );
      const senderName = senderResult.rows[0]?.full_name || 'Someone';

      // Broadcast via WebSocket
      await broadcastMessage(id, { ...message, sender_name: senderName }, currentUserId);

      // Notify other participants
      const participantsResult = await pool.query(
        `SELECT user_id FROM conversation_participants
         WHERE conversation_id = $1 AND user_id != $2 AND left_at IS NULL`,
        [id, currentUserId]
      );

      for (const row of participantsResult.rows) {
        await createNotification(
          row.user_id,
          'new_message',
          'New message',
          `${senderName}: ${parsed.data.body.slice(0, 100)}`,
          { conversation_id: id, message_id: message.id }
        );
      }

      return reply.status(201).send({ message });
    }
  );

  // GET /conversations/:id/participants
  fastify.get(
    '/conversations/:id/participants',
    { preHandler: authenticate },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const currentUserId = request.jwtUser!.userId;

      // Verify participant
      const partResult = await pool.query(
        `SELECT * FROM conversation_participants
         WHERE conversation_id = $1 AND user_id = $2`,
        [id, currentUserId]
      );

      if (partResult.rows.length === 0) {
        return reply.status(403).send({ error: 'not_a_participant' });
      }

      const result = await pool.query(
        `SELECT cp.user_id, cp.joined_at, cp.left_at,
                u.full_name, u.professional_role, u.is_demo_profile,
                d.name AS district_name
         FROM conversation_participants cp
         JOIN users u ON u.id = cp.user_id
         LEFT JOIN districts d ON d.id = u.district_id
         WHERE cp.conversation_id = $1
         ORDER BY cp.joined_at`,
        [id]
      );

      return reply.send({ participants: result.rows });
    }
  );

  // POST /conversations/:id/participants - invite to group
  fastify.post(
    '/conversations/:id/participants',
    { preHandler: authenticate },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const currentUserId = request.jwtUser!.userId;
      const body = request.body as { user_id?: string };

      if (!body?.user_id) {
        return reply.status(400).send({ error: 'user_id is required' });
      }

      const inviteeId = body.user_id;

      // Verify conversation is a group
      const convResult = await pool.query(
        'SELECT * FROM conversations WHERE id = $1',
        [id]
      );

      if (convResult.rows.length === 0) {
        return reply.status(404).send({ error: 'conversation_not_found' });
      }

      const conv = convResult.rows[0];
      if (conv.type !== 'group') {
        return reply.status(400).send({ error: 'not_a_group_conversation' });
      }

      // Verify requester is creator or admin
      const isAdmin = request.jwtUser!.platform_role === 'admin';
      if (conv.created_by_user_id !== currentUserId && !isAdmin) {
        return reply.status(403).send({ error: 'forbidden' });
      }

      // Invitee must be connected to creator
      const connected = await isConnected(conv.created_by_user_id, inviteeId);
      if (!connected) {
        return reply.status(403).send({ error: 'invitee_not_connected_to_creator' });
      }

      // Check active participant count (trigger also enforces this)
      const countResult = await pool.query(
        `SELECT COUNT(*) FROM conversation_participants
         WHERE conversation_id = $1 AND left_at IS NULL`,
        [id]
      );

      if (parseInt(countResult.rows[0].count) >= 8) {
        return reply.status(400).send({ error: 'group_is_full', max: 8 });
      }

      try {
        await pool.query(
          `INSERT INTO conversation_participants (conversation_id, user_id)
           VALUES ($1, $2)`,
          [id, inviteeId]
        );
      } catch (err: unknown) {
        const error = err as { code?: string; message?: string };
        if (error.code === '23505') {
          return reply.status(409).send({ error: 'already_a_participant' });
        }
        if (error.message?.includes('at most 8')) {
          return reply.status(400).send({ error: 'group_is_full', max: 8 });
        }
        throw err;
      }

      return reply.status(201).send({ message: 'participant_added' });
    }
  );

  // DELETE /conversations/:id/participants/me - leave group
  fastify.delete(
    '/conversations/:id/participants/me',
    { preHandler: authenticate },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const currentUserId = request.jwtUser!.userId;

      const result = await pool.query(
        `UPDATE conversation_participants
         SET left_at = now()
         WHERE conversation_id = $1 AND user_id = $2 AND left_at IS NULL
         RETURNING *`,
        [id, currentUserId]
      );

      if (result.rows.length === 0) {
        return reply.status(404).send({ error: 'not_a_participant' });
      }

      return reply.send({ message: 'left_conversation' });
    }
  );

  // WebSocket endpoint GET /ws
  fastify.get('/ws', { websocket: true, preHandler: authenticate }, (socket, request) => {
    const userId = request.jwtUser!.userId;

    // Register connection
    if (!wsConnections.has(userId)) {
      wsConnections.set(userId, new Set());
    }
    wsConnections.get(userId)!.add(socket);

    socket.on('message', async (rawData: Buffer) => {
      try {
        const msg = JSON.parse(rawData.toString());

        if (msg.event === 'subscribe' && msg.conversation_id) {
          // Subscribe to conversation (implicit via userId registration)
          socket.send(JSON.stringify({ event: 'subscribed', conversation_id: msg.conversation_id }));
        }
      } catch {
        // ignore invalid messages
      }
    });

    socket.on('close', () => {
      const conns = wsConnections.get(userId);
      if (conns) {
        conns.delete(socket);
        if (conns.size === 0) {
          wsConnections.delete(userId);
        }
      }
    });

    socket.send(JSON.stringify({ event: 'connected', userId }));
  });
}
