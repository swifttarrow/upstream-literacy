import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { pool } from '../db/index.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

const districtFilterSchema = z.object({
  state: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const overrideSchema = z.object({
  definition_id: z.string().uuid(),
  value_text: z.string().optional().nullable(),
  value_number: z.number().optional().nullable(),
  value_json: z.unknown().optional().nullable(),
  reason: z.string().optional(),
});

export default async function districtsRoutes(fastify: FastifyInstance) {
  // GET /districts - list with optional filters
  fastify.get('/districts', { preHandler: authenticate }, async (request, reply) => {
    const parsed = districtFilterSchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'validation_error', details: parsed.error.flatten() });
    }

    const { state, search, page, limit } = parsed.data;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (state) {
      conditions.push(`d.state_region ILIKE $${idx++}`);
      values.push(`%${state}%`);
    }
    if (search) {
      conditions.push(`(d.name ILIKE $${idx++} OR d.city ILIKE $${idx - 1})`);
      values.push(`%${search}%`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM districts d ${where}`,
      values
    );
    const total = parseInt(countResult.rows[0].count);

    values.push(limit, offset);
    const result = await pool.query(
      `SELECT d.id, d.name, d.slug, d.country_code, d.state_region, d.city,
              d.is_demo, d.created_at, d.updated_at
       FROM districts d
       ${where}
       ORDER BY d.name
       LIMIT $${idx++} OFFSET $${idx++}`,
      values
    );

    return reply.send({
      districts: result.rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  });

  // GET /districts/:id - detail with effective attribute values
  fastify.get('/districts/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const districtResult = await pool.query(
      'SELECT * FROM districts WHERE id = $1',
      [id]
    );

    if (districtResult.rows.length === 0) {
      return reply.status(404).send({ error: 'district_not_found' });
    }

    const district = districtResult.rows[0];

    // Get effective attribute values with definitions and provenance
    const attrsResult = await pool.query(
      `SELECT dav.id, dav.definition_id, dav.value_text, dav.value_number, dav.value_json,
              dav.provenance, dav.last_ingestion_event_id, dav.last_override_id, dav.updated_at,
              dad.key, dad.label, dad.value_type, dad.sort_order,
              die.ingested_at AS last_ingested_at, die.source_label
       FROM district_effective_attribute_values dav
       JOIN district_attribute_definitions dad ON dad.id = dav.definition_id
       LEFT JOIN district_ingestion_events die ON die.id = dav.last_ingestion_event_id
       WHERE dav.district_id = $1
       ORDER BY dad.sort_order`,
      [id]
    );

    district.attributes = attrsResult.rows;

    return reply.send({ district });
  });

  // POST /admin/districts/:id/overrides
  fastify.post(
    '/admin/districts/:id/overrides',
    { preHandler: [authenticate, requireAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = overrideSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'validation_error', details: parsed.error.flatten() });
      }

      const { definition_id, value_text, value_number, value_json, reason } = parsed.data;
      const adminUserId = request.jwtUser!.userId;

      // Verify district exists
      const districtCheck = await pool.query('SELECT id FROM districts WHERE id = $1', [id]);
      if (districtCheck.rows.length === 0) {
        return reply.status(404).send({ error: 'district_not_found' });
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Insert override
        const overrideResult = await client.query(
          `INSERT INTO district_admin_overrides
           (district_id, definition_id, value_text, value_number, value_json, admin_user_id, reason)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [id, definition_id, value_text || null, value_number || null,
           value_json ? JSON.stringify(value_json) : null, adminUserId, reason || null]
        );

        const override = overrideResult.rows[0];

        // Upsert effective attribute value with override provenance
        await client.query(
          `INSERT INTO district_effective_attribute_values
           (district_id, definition_id, value_text, value_number, value_json, provenance, last_override_id, updated_at)
           VALUES ($1, $2, $3, $4, $5, 'override', $6, now())
           ON CONFLICT (district_id, definition_id)
           DO UPDATE SET
             value_text = EXCLUDED.value_text,
             value_number = EXCLUDED.value_number,
             value_json = EXCLUDED.value_json,
             provenance = 'override',
             last_override_id = EXCLUDED.last_override_id,
             updated_at = now()`,
          [id, definition_id, value_text || null, value_number || null,
           value_json ? JSON.stringify(value_json) : null, override.id]
        );

        await client.query('COMMIT');
        return reply.status(201).send({ override });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }
  );
}
