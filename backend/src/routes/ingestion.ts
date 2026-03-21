import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { pool } from '../db/index.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireModerator } from '../middleware/requireModerator.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import {
  createIngestionJob,
  getJobWithRecords,
  getRecentJobs,
  processIngestionJob,
} from '../services/ingestion.js';
import { sendIngestionJob } from '../jobs/ingestion-worker.js';
import { insertAuditLog } from '../services/audit.js';

const candidateFilterSchema = z.object({
  search: z.string().optional(),
  state: z.string().optional(),
  status: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const triggerSchema = z.object({
  district_ids: z.array(z.string().uuid()).min(1).max(100),
  confirm: z.boolean().optional(),
});

// Data quality rules: fields required for ingestion readiness
const REQUIRED_FIELDS = ['name', 'state', 'nces_district_id'];
const RECOMMENDED_FIELDS = ['district_type'];

function assessDataQuality(candidate: Record<string, unknown>): {
  status: 'ready' | 'warning' | 'blocked';
  missing_required: string[];
  missing_recommended: string[];
} {
  const missingRequired = REQUIRED_FIELDS.filter((f) => !candidate[f]);
  const missingRecommended = RECOMMENDED_FIELDS.filter((f) => !candidate[f]);

  if (missingRequired.length > 0) {
    return { status: 'blocked', missing_required: missingRequired, missing_recommended: missingRecommended };
  }
  if (missingRecommended.length > 0) {
    return { status: 'warning', missing_required: [], missing_recommended: missingRecommended };
  }
  return { status: 'ready', missing_required: [], missing_recommended: [] };
}

export default async function ingestionRoutes(fastify: FastifyInstance) {
  // GET /admin/ingestion/candidates
  fastify.get(
    '/admin/ingestion/candidates',
    { preHandler: [authenticate, requireModerator] },
    async (request, reply) => {
      const parsed = candidateFilterSchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'validation_error', details: parsed.error.flatten() });
      }

      const { search, state, status, page, limit } = parsed.data;
      const offset = (page - 1) * limit;

      const conditions: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      if (search) {
        conditions.push(`dc.name ILIKE $${idx++}`);
        values.push(`%${search}%`);
      }
      if (state) {
        conditions.push(`dc.state ILIKE $${idx++}`);
        values.push(`%${state}%`);
      }
      if (status) {
        conditions.push(`dc.status = $${idx++}`);
        values.push(status);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const countResult = await pool.query(
        `SELECT COUNT(*) FROM district_candidates dc ${where}`,
        values
      );
      const total = parseInt(countResult.rows[0].count);

      values.push(limit, offset);
      const result = await pool.query(
        `SELECT dc.id, dc.nces_district_id, dc.name, dc.state, dc.district_type,
                dc.status, dc.missing_data_indicator, dc.last_refresh_at,
                dc.district_id, dc.created_at
         FROM district_candidates dc
         ${where}
         ORDER BY dc.name
         LIMIT $${idx++} OFFSET $${idx++}`,
        values
      );

      return reply.send({
        candidates: result.rows,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    }
  );

  // GET /admin/ingestion/summary
  fastify.get(
    '/admin/ingestion/summary',
    { preHandler: [authenticate, requireModerator] },
    async (_request, reply) => {
      const result = await pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'not_ingested') AS not_ingested,
           COUNT(*) FILTER (WHERE status = 'ready_to_ingest') AS ready_to_ingest,
           COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
           COUNT(*) FILTER (WHERE status = 'ingested') AS ingested,
           COUNT(*) FILTER (WHERE status = 'ingested_with_warnings') AS ingested_with_warnings,
           COUNT(*) FILTER (WHERE status = 'failed') AS failed,
           COUNT(*) AS total
         FROM district_candidates`
      );

      const jobs = await getRecentJobs(5);

      return reply.send({ summary: result.rows[0], recent_jobs: jobs });
    }
  );

  // GET /admin/ingestion/jobs
  fastify.get(
    '/admin/ingestion/jobs',
    { preHandler: [authenticate, requireModerator] },
    async (request, reply) => {
      const { limit = '20' } = request.query as { limit?: string };
      const jobs = await getRecentJobs(Math.min(parseInt(limit), 50));
      return reply.send({ jobs });
    }
  );

  // GET /admin/ingestion/jobs/:jobId
  fastify.get(
    '/admin/ingestion/jobs/:jobId',
    { preHandler: [authenticate, requireModerator] },
    async (request, reply) => {
      const { jobId } = request.params as { jobId: string };
      const data = await getJobWithRecords(jobId);
      if (!data) return reply.status(404).send({ error: 'job_not_found' });
      return reply.send(data);
    }
  );

  // GET /admin/ingestion/candidates/:id/preview
  fastify.get(
    '/admin/ingestion/candidates/:id/preview',
    { preHandler: [authenticate, requireModerator] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const userId = request.jwtUser!.userId;

      const candidateResult = await pool.query(
        'SELECT * FROM district_candidates WHERE id = $1',
        [id]
      );
      if (candidateResult.rows.length === 0) {
        return reply.status(404).send({ error: 'candidate_not_found' });
      }
      const candidate = candidateResult.rows[0];

      // If already ingested, fetch existing district attributes
      let existingAttributes: unknown[] = [];
      if (candidate.district_id) {
        const attrsResult = await pool.query(
          `SELECT dav.value_text, dav.value_number, dav.provenance, dav.updated_at,
                  dad.key, dad.label, dad.value_type
           FROM district_effective_attribute_values dav
           JOIN district_attribute_definitions dad ON dad.id = dav.definition_id
           WHERE dav.district_id = $1
           ORDER BY dad.sort_order`,
          [candidate.district_id]
        );
        existingAttributes = attrsResult.rows;
      }

      const quality = assessDataQuality(candidate);

      // Log preview audit
      await insertAuditLog(userId, 'ingestion_preview_viewed', 'district_candidate', id, {
        candidate_name: candidate.name,
      });

      return reply.send({
        candidate,
        quality,
        existing_attributes: existingAttributes,
        source_metadata: {
          source: 'nces_seed',
          nces_district_id: candidate.nces_district_id,
          last_refresh_at: candidate.last_refresh_at,
        },
        normalized: {
          name: candidate.name,
          state: candidate.state,
          district_type: candidate.district_type,
          nces_district_id: candidate.nces_district_id,
        },
        missing_fields: [...quality.missing_required, ...quality.missing_recommended],
      });
    }
  );

  // POST /admin/ingestion/trigger
  fastify.post(
    '/admin/ingestion/trigger',
    { preHandler: [authenticate, requireModerator] },
    async (request, reply) => {
      const parsed = triggerSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'validation_error', details: parsed.error.flatten() });
      }

      const { district_ids, confirm } = parsed.data;
      const userId = request.jwtUser!.userId;

      // Batch (>10) requires confirm:true
      if (district_ids.length > 10 && !confirm) {
        return reply.status(400).send({
          error: 'confirmation_required',
          message: `Batch ingestion of ${district_ids.length} districts requires confirm: true`,
        });
      }

      // Check no district is already in_progress
      const inProgressResult = await pool.query(
        `SELECT dc.id, dc.name FROM district_candidates dc
         WHERE dc.id = ANY($1::uuid[]) AND dc.status = 'in_progress'`,
        [district_ids]
      );
      if (inProgressResult.rows.length > 0) {
        const names = inProgressResult.rows.map((r) => r.name).join(', ');
        return reply.status(409).send({
          error: 'already_in_progress',
          message: `Ingestion already active for: ${names}`,
          districts: inProgressResult.rows,
        });
      }

      // Verify all candidate ids exist
      const candidatesResult = await pool.query(
        'SELECT id FROM district_candidates WHERE id = ANY($1::uuid[])',
        [district_ids]
      );
      if (candidatesResult.rows.length !== district_ids.length) {
        return reply.status(400).send({ error: 'invalid_candidate_ids' });
      }

      // Create job
      const jobId = await createIngestionJob({ candidateIds: district_ids, createdBy: userId });

      // Mark candidates as in_progress
      await pool.query(
        `UPDATE district_candidates SET status = 'in_progress', updated_at = now()
         WHERE id = ANY($1::uuid[])`,
        [district_ids]
      );

      // Audit
      await insertAuditLog(userId, 'ingestion_started', 'district_ingestion_job', jobId, {
        district_ids,
        total_count: district_ids.length,
      });

      // Enqueue via pg-boss for durability; fallback to direct processing if worker not started
      const queued = await sendIngestionJob(jobId);
      if (!queued) {
        processIngestionJob(jobId).catch((err) => {
          console.error(`Ingestion job ${jobId} failed:`, err);
        });
      }

      return reply.status(201).send({ job_id: jobId, total_count: district_ids.length });
    }
  );

  // POST /admin/ingestion/jobs/:jobId/retry
  fastify.post(
    '/admin/ingestion/jobs/:jobId/retry',
    { preHandler: [authenticate, requireModerator] },
    async (request, reply) => {
      const { jobId } = request.params as { jobId: string };
      const userId = request.jwtUser!.userId;
      const { district_ids } = (request.body as { district_ids?: string[] }) ?? {};

      // Get eligible failed records
      let eligibleQuery = `
        SELECT r.candidate_id FROM district_ingestion_job_records r
        WHERE r.job_id = $1 AND r.status = 'failed' AND r.retry_eligible = true`;
      const queryValues: unknown[] = [jobId];
      if (district_ids && district_ids.length > 0) {
        eligibleQuery += ` AND r.candidate_id = ANY($2::uuid[])`;
        queryValues.push(district_ids);
      }

      const eligibleResult = await pool.query(eligibleQuery, queryValues);
      if (eligibleResult.rows.length === 0) {
        return reply.status(400).send({ error: 'no_eligible_records', message: 'No retry-eligible failed records found' });
      }

      const candidateIds = eligibleResult.rows.map((r) => r.candidate_id);
      const retryJobId = await createIngestionJob({ candidateIds, createdBy: userId });

      await pool.query(
        `UPDATE district_candidates SET status = 'in_progress', updated_at = now()
         WHERE id = ANY($1::uuid[])`,
        [candidateIds]
      );

      await insertAuditLog(userId, 'ingestion_retried', 'district_ingestion_job', retryJobId, {
        parent_job_id: jobId,
        retry_count: candidateIds.length,
      });

      const queued = await sendIngestionJob(retryJobId);
      if (!queued) {
        processIngestionJob(retryJobId).catch((err) => {
          console.error(`Retry job ${retryJobId} failed:`, err);
        });
      }

      return reply.status(201).send({ job_id: retryJobId, total_count: candidateIds.length });
    }
  );

  // PATCH /admin/ingestion/districts/:districtId — post-ingestion edit (create overrides)
  const editSchema = z.object({
    fields: z.array(
      z.object({
        key: z.string(),
        value_text: z.string().optional().nullable(),
        value_number: z.number().optional().nullable(),
      })
    ).min(1),
    reason: z.string().optional(),
  });

  fastify.patch(
    '/admin/ingestion/districts/:districtId',
    { preHandler: [authenticate, requireModerator] },
    async (request, reply) => {
      const { districtId } = request.params as { districtId: string };
      const parsed = editSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'validation_error', details: parsed.error.flatten() });
      }
      const { fields, reason } = parsed.data;
      const userId = request.jwtUser!.userId;

      const districtCheck = await pool.query('SELECT id FROM districts WHERE id = $1', [districtId]);
      if (districtCheck.rows.length === 0) {
        return reply.status(404).send({ error: 'district_not_found' });
      }

      // Fetch definition IDs for requested keys
      const keys = fields.map((f) => f.key);
      const defsResult = await pool.query(
        'SELECT id, key FROM district_attribute_definitions WHERE key = ANY($1::text[])',
        [keys]
      );
      const defMap = new Map<string, string>(defsResult.rows.map((r) => [r.key, r.id]));

      const missing = keys.filter((k) => !defMap.has(k));
      if (missing.length > 0) {
        return reply.status(400).send({ error: 'unknown_fields', fields: missing });
      }

      const client = await pool.connect();
      const overrides = [];
      try {
        await client.query('BEGIN');
        for (const field of fields) {
          const definitionId = defMap.get(field.key)!;
          const overrideResult = await client.query(
            `INSERT INTO district_admin_overrides
             (district_id, definition_id, value_text, value_number, admin_user_id, reason)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [districtId, definitionId, field.value_text ?? null, field.value_number ?? null, userId, reason ?? null]
          );
          const override = overrideResult.rows[0];
          overrides.push(override);

          await client.query(
            `INSERT INTO district_effective_attribute_values
             (district_id, definition_id, value_text, value_number, provenance, last_override_id, updated_at)
             VALUES ($1, $2, $3, $4, 'override', $5, now())
             ON CONFLICT (district_id, definition_id)
             DO UPDATE SET
               value_text = EXCLUDED.value_text,
               value_number = EXCLUDED.value_number,
               provenance = 'override',
               last_override_id = EXCLUDED.last_override_id,
               updated_at = now()`,
            [districtId, definitionId, field.value_text ?? null, field.value_number ?? null, override.id]
          );
        }
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }

      await insertAuditLog(userId, 'district_edited', 'district', districtId, {
        fields: fields.map((f) => f.key),
        reason,
      });

      return reply.send({ overrides });
    }
  );

  // DELETE /admin/ingestion/districts/:districtId/overrides/:fieldKey — revert to source value
  fastify.delete(
    '/admin/ingestion/districts/:districtId/overrides/:fieldKey',
    { preHandler: [authenticate, requireModerator] },
    async (request, reply) => {
      const { districtId, fieldKey } = request.params as { districtId: string; fieldKey: string };
      const userId = request.jwtUser!.userId;

      const defResult = await pool.query(
        'SELECT id FROM district_attribute_definitions WHERE key = $1',
        [fieldKey]
      );
      if (defResult.rows.length === 0) {
        return reply.status(404).send({ error: 'field_not_found' });
      }
      const definitionId = defResult.rows[0].id;

      // Find the most recent ingest event for this district to restore
      const ingestResult = await pool.query(
        `SELECT die.id, die.normalized_attributes
         FROM district_ingestion_events die
         WHERE die.district_id = $1
         ORDER BY die.ingested_at DESC
         LIMIT 1`,
        [districtId]
      );

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        if (ingestResult.rows.length > 0) {
          const event = ingestResult.rows[0];
          const attrs = event.normalized_attributes as Record<string, unknown>;
          const sourceValue = attrs[fieldKey];
          const isNum = typeof sourceValue === 'number';

          await client.query(
            `UPDATE district_effective_attribute_values
             SET value_text = $1,
                 value_number = $2,
                 provenance = 'ingest',
                 last_ingestion_event_id = $3,
                 last_override_id = NULL,
                 updated_at = now()
             WHERE district_id = $4 AND definition_id = $5`,
            [
              isNum ? null : sourceValue != null ? String(sourceValue) : null,
              isNum ? sourceValue : null,
              event.id,
              districtId,
              definitionId,
            ]
          );
        } else {
          // No ingest event; delete effective value entirely
          await client.query(
            'DELETE FROM district_effective_attribute_values WHERE district_id = $1 AND definition_id = $2',
            [districtId, definitionId]
          );
        }

        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }

      await insertAuditLog(userId, 'override_reverted', 'district', districtId, { field_key: fieldKey });

      return reply.send({ reverted: true, field_key: fieldKey });
    }
  );

  // GET /admin/ingestion/audit
  fastify.get(
    '/admin/ingestion/audit',
    { preHandler: [authenticate, requireAdmin] },
    async (request, reply) => {
      const { district_id, actor_id, from, to, limit = '50' } = request.query as Record<string, string>;

      const conditions: string[] = [`a.entity_type IN ('district_candidate', 'district_ingestion_job', 'district')`];
      const values: unknown[] = [];
      let idx = 1;

      if (district_id) {
        conditions.push(`a.entity_id = $${idx++}`);
        values.push(district_id);
      }
      if (actor_id) {
        conditions.push(`a.actor_user_id = $${idx++}`);
        values.push(actor_id);
      }
      if (from) {
        conditions.push(`a.created_at >= $${idx++}`);
        values.push(from);
      }
      if (to) {
        conditions.push(`a.created_at <= $${idx++}`);
        values.push(to);
      }

      values.push(Math.min(parseInt(limit), 200));
      const result = await pool.query(
        `SELECT a.*, u.full_name AS actor_name
         FROM audit_log_entries a
         LEFT JOIN users u ON u.id = a.actor_user_id
         WHERE ${conditions.join(' AND ')}
         ORDER BY a.created_at DESC
         LIMIT $${idx++}`,
        values
      );

      return reply.send({ audit_entries: result.rows });
    }
  );
}
