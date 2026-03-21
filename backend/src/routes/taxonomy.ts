import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { pool } from '../db/index.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

const createCategorySchema = z.object({
  parent_id: z.string().uuid().optional().nullable(),
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
  sort_order: z.number().int().default(0),
});

const updateCategorySchema = z.object({
  parent_id: z.string().uuid().optional().nullable(),
  name: z.string().min(1).max(255).optional(),
  slug: z.string().min(1).max(255).optional(),
  sort_order: z.number().int().optional(),
});

const createStatementSchema = z.object({
  category_id: z.string().uuid(),
  code: z.string().min(1).max(100),
  label: z.string().min(1).max(500),
  description: z.string().optional(),
  status: z.enum(['draft', 'active', 'archived']).default('active'),
  sort_order: z.number().int().default(0),
});

const updateStatementSchema = z.object({
  category_id: z.string().uuid().optional(),
  code: z.string().min(1).max(100).optional(),
  label: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
  sort_order: z.number().int().optional(),
});

export default async function taxonomyRoutes(fastify: FastifyInstance) {
  // GET /problem-categories
  fastify.get('/problem-categories', { preHandler: authenticate }, async (_request, reply) => {
    const result = await pool.query(
      `SELECT id, parent_id, name, slug, sort_order, created_at
       FROM problem_categories
       ORDER BY sort_order, name`
    );
    return reply.send({ categories: result.rows });
  });

  // GET /problem-statements
  fastify.get('/problem-statements', { preHandler: authenticate }, async (request, reply) => {
    const query = request.query as { category_id?: string };
    const { platform_role } = request.jwtUser!;

    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    // Members only see active statements; admin/moderator see all
    if (platform_role === 'member') {
      conditions.push(`ps.status = 'active'`);
    }

    if (query.category_id) {
      conditions.push(`ps.category_id = $${idx++}`);
      values.push(query.category_id);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT ps.id, ps.category_id, ps.code, ps.label, ps.description,
              ps.status, ps.sort_order, ps.created_at, ps.updated_at,
              pc.name AS category_name, pc.slug AS category_slug
       FROM problem_statements ps
       JOIN problem_categories pc ON pc.id = ps.category_id
       ${where}
       ORDER BY pc.sort_order, ps.sort_order, ps.label`,
      values
    );

    return reply.send({ statements: result.rows });
  });

  // Admin routes
  fastify.post(
    '/admin/problem-categories',
    { preHandler: [authenticate, requireAdmin] },
    async (request, reply) => {
      const parsed = createCategorySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'validation_error', details: parsed.error.flatten() });
      }

      const { parent_id, name, slug, sort_order } = parsed.data;

      try {
        const result = await pool.query(
          `INSERT INTO problem_categories (parent_id, name, slug, sort_order)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [parent_id || null, name, slug, sort_order]
        );
        return reply.status(201).send({ category: result.rows[0] });
      } catch (err: unknown) {
        const error = err as { code?: string };
        if (error.code === '23505') {
          return reply.status(409).send({ error: 'slug_already_exists' });
        }
        throw err;
      }
    }
  );

  fastify.patch(
    '/admin/problem-categories/:id',
    { preHandler: [authenticate, requireAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = updateCategorySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'validation_error', details: parsed.error.flatten() });
      }

      const updates: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      const data = parsed.data;
      if (data.name !== undefined) { updates.push(`name = $${idx++}`); values.push(data.name); }
      if (data.slug !== undefined) { updates.push(`slug = $${idx++}`); values.push(data.slug); }
      if (data.sort_order !== undefined) { updates.push(`sort_order = $${idx++}`); values.push(data.sort_order); }
      if (data.parent_id !== undefined) { updates.push(`parent_id = $${idx++}`); values.push(data.parent_id); }

      if (updates.length === 0) {
        return reply.status(400).send({ error: 'no_updates_provided' });
      }

      values.push(id);
      const result = await pool.query(
        `UPDATE problem_categories SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return reply.status(404).send({ error: 'category_not_found' });
      }

      return reply.send({ category: result.rows[0] });
    }
  );

  fastify.post(
    '/admin/problem-statements',
    { preHandler: [authenticate, requireAdmin] },
    async (request, reply) => {
      const parsed = createStatementSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'validation_error', details: parsed.error.flatten() });
      }

      const { category_id, code, label, description, status, sort_order } = parsed.data;

      try {
        const result = await pool.query(
          `INSERT INTO problem_statements (category_id, code, label, description, status, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [category_id, code, label, description || null, status, sort_order]
        );
        return reply.status(201).send({ statement: result.rows[0] });
      } catch (err: unknown) {
        const error = err as { code?: string };
        if (error.code === '23505') {
          return reply.status(409).send({ error: 'code_already_exists' });
        }
        throw err;
      }
    }
  );

  fastify.patch(
    '/admin/problem-statements/:id',
    { preHandler: [authenticate, requireAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = updateStatementSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'validation_error', details: parsed.error.flatten() });
      }

      const updates: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      const data = parsed.data;
      if (data.category_id !== undefined) { updates.push(`category_id = $${idx++}`); values.push(data.category_id); }
      if (data.code !== undefined) { updates.push(`code = $${idx++}`); values.push(data.code); }
      if (data.label !== undefined) { updates.push(`label = $${idx++}`); values.push(data.label); }
      if (data.description !== undefined) { updates.push(`description = $${idx++}`); values.push(data.description); }
      if (data.status !== undefined) { updates.push(`status = $${idx++}`); values.push(data.status); }
      if (data.sort_order !== undefined) { updates.push(`sort_order = $${idx++}`); values.push(data.sort_order); }

      if (updates.length === 0) {
        return reply.status(400).send({ error: 'no_updates_provided' });
      }

      values.push(id);
      const result = await pool.query(
        `UPDATE problem_statements SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return reply.status(404).send({ error: 'statement_not_found' });
      }

      return reply.send({ statement: result.rows[0] });
    }
  );
}
