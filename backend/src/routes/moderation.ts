import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { pool } from '../db/index.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireModerator } from '../middleware/requireModerator.js';
import { insertAuditLog } from '../services/audit.js';
import { createNotification } from '../services/notifications.js';

const createReportSchema = z.object({
  target_type: z.enum(['user', 'message', 'conversation']),
  target_user_id: z.string().uuid().optional(),
  target_message_id: z.string().uuid().optional(),
  target_conversation_id: z.string().uuid().optional(),
  reason_code: z.string().min(1).max(100),
  details: z.string().max(2000).optional(),
});

const moderationActionSchema = z.object({
  action_type: z.enum([
    'dismiss_report',
    'resolve_report',
    'warn_user',
    'suspend_user',
    'unsuspend_user',
    'delete_message',
    'close_conversation',
  ]),
  notes: z.string().max(2000).optional(),
  metadata: z.record(z.unknown()).optional(),
  // For suspend_user: how many days
  suspend_days: z.number().int().min(1).max(365).optional(),
});

export default async function moderationRoutes(fastify: FastifyInstance) {
  // POST /reports
  fastify.post('/reports', { preHandler: authenticate }, async (request, reply) => {
    const parsed = createReportSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'validation_error', details: parsed.error.flatten() });
    }

    const { target_type, target_user_id, target_message_id, target_conversation_id, reason_code, details } = parsed.data;
    const reporterId = request.jwtUser!.userId;

    // Validate target matches type
    if (target_type === 'user' && !target_user_id) {
      return reply.status(400).send({ error: 'target_user_id required for user reports' });
    }
    if (target_type === 'message' && !target_message_id) {
      return reply.status(400).send({ error: 'target_message_id required for message reports' });
    }
    if (target_type === 'conversation' && !target_conversation_id) {
      return reply.status(400).send({ error: 'target_conversation_id required for conversation reports' });
    }

    const result = await pool.query(
      `INSERT INTO reports
       (reporter_id, target_type, target_user_id, target_message_id, target_conversation_id, reason_code, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        reporterId,
        target_type,
        target_user_id || null,
        target_message_id || null,
        target_conversation_id || null,
        reason_code,
        details || null,
      ]
    );

    return reply.status(201).send({ report: result.rows[0] });
  });

  // GET /admin/reports - moderator/admin
  fastify.get(
    '/admin/reports',
    { preHandler: [authenticate, requireModerator] },
    async (request, reply) => {
      const query = request.query as {
        status?: string;
        target_type?: string;
        page?: string;
        limit?: string;
      };

      const page = parseInt(query.page || '1');
      const limit = Math.min(parseInt(query.limit || '20'), 100);
      const offset = (page - 1) * limit;

      const conditions: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      if (query.status) {
        conditions.push(`r.status = $${idx++}`);
        values.push(query.status);
      }
      if (query.target_type) {
        conditions.push(`r.target_type = $${idx++}`);
        values.push(query.target_type);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const countResult = await pool.query(`SELECT COUNT(*) FROM reports r ${where}`, values);
      const total = parseInt(countResult.rows[0].count);

      values.push(limit, offset);
      const result = await pool.query(
        `SELECT r.*, u.full_name AS reporter_name
         FROM reports r
         JOIN users u ON u.id = r.reporter_id
         ${where}
         ORDER BY r.created_at DESC
         LIMIT $${idx++} OFFSET $${idx++}`,
        values
      );

      return reply.send({
        reports: result.rows,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    }
  );

  // POST /admin/reports/:id/actions
  fastify.post(
    '/admin/reports/:id/actions',
    { preHandler: [authenticate, requireModerator] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = moderationActionSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'validation_error', details: parsed.error.flatten() });
      }

      const { action_type, notes, metadata, suspend_days } = parsed.data;
      const moderatorId = request.jwtUser!.userId;

      // Get report
      const reportResult = await pool.query('SELECT * FROM reports WHERE id = $1', [id]);
      if (reportResult.rows.length === 0) {
        return reply.status(404).send({ error: 'report_not_found' });
      }

      const report = reportResult.rows[0];

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Insert moderation action
        const actionResult = await client.query(
          `INSERT INTO moderation_actions (report_id, moderator_id, action_type, notes, metadata)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [id, moderatorId, action_type, notes || null, JSON.stringify(metadata || {})]
        );

        // Update report status
        let newReportStatus: string;
        switch (action_type) {
          case 'dismiss_report': newReportStatus = 'dismissed'; break;
          case 'resolve_report': newReportStatus = 'resolved'; break;
          default: newReportStatus = 'in_review';
        }

        await client.query(
          `UPDATE reports SET status = $1, updated_at = now(),
           resolved_at = CASE WHEN $1 IN ('resolved', 'dismissed') THEN now() ELSE NULL END
           WHERE id = $2`,
          [newReportStatus, id]
        );

        // Handle specific actions
        if (action_type === 'suspend_user' && report.target_user_id) {
          const days = suspend_days || 7;
          await client.query(
            `UPDATE users SET suspended_until = now() + interval '1 day' * $1 WHERE id = $2`,
            [days, report.target_user_id]
          );

          await insertAuditLog(moderatorId, 'suspend_user', 'user', report.target_user_id, {
            report_id: id, days, reason: notes,
          });

          await createNotification(
            report.target_user_id,
            'moderation_update',
            'Account suspended',
            `Your account has been suspended for ${days} day(s).`,
            { report_id: id, action_type }
          );
        }

        if (action_type === 'unsuspend_user' && report.target_user_id) {
          await client.query(
            'UPDATE users SET suspended_until = NULL WHERE id = $1',
            [report.target_user_id]
          );

          await insertAuditLog(moderatorId, 'unsuspend_user', 'user', report.target_user_id, {
            report_id: id,
          });
        }

        if (action_type === 'delete_message' && report.target_message_id) {
          await client.query(
            'UPDATE messages SET deleted_at = now() WHERE id = $1',
            [report.target_message_id]
          );

          await insertAuditLog(moderatorId, 'delete_message', 'message', report.target_message_id, {
            report_id: id,
          });
        }

        if (action_type === 'close_conversation' && report.target_conversation_id) {
          await insertAuditLog(
            moderatorId,
            'close_conversation',
            'conversation',
            report.target_conversation_id,
            { report_id: id }
          );
        }

        await client.query('COMMIT');

        return reply.status(201).send({ action: actionResult.rows[0] });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }
  );
}
