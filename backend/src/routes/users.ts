import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { pool } from '../db/index.js';
import { authenticate } from '../middleware/authenticate.js';

const updateProfileSchema = z.object({
  full_name: z.string().min(1).max(255).optional(),
  professional_role: z.string().max(255).optional(),
  bio: z.string().max(2000).optional(),
  district_id: z.string().uuid().optional().nullable(),
  primary_problem_id: z.string().uuid().optional().nullable(),
  secondary_problem_ids: z.array(z.string().uuid()).optional(),
});

async function checkAndSetProfileCompleted(userId: string): Promise<void> {
  // Profile is complete when: district_id is set AND at least one primary problem selection exists
  const result = await pool.query(
    `SELECT u.district_id,
            (SELECT COUNT(*) FROM user_problem_selections
             WHERE user_id = u.id AND is_primary = true) AS primary_count
     FROM users u WHERE u.id = $1`,
    [userId]
  );

  if (result.rows.length === 0) return;

  const { district_id, primary_count } = result.rows[0];
  if (district_id && parseInt(primary_count) > 0) {
    await pool.query(
      `UPDATE users SET profile_completed_at = now()
       WHERE id = $1 AND profile_completed_at IS NULL`,
      [userId]
    );
  }
}

export default async function usersRoutes(fastify: FastifyInstance) {
  // GET /users/me - full profile with district info and problem selections
  fastify.get(
    '/users/me',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = request.jwtUser!.userId;

      const userResult = await pool.query(
        `SELECT u.id, u.email, u.full_name, u.professional_role, u.bio,
                u.district_id, u.platform_role, u.membership_status, u.is_demo_profile,
                u.profile_completed_at, u.suspended_until, u.created_at, u.updated_at,
                d.name AS district_name, d.state_region AS district_state_region,
                d.city AS district_city
         FROM users u
         LEFT JOIN districts d ON d.id = u.district_id
         WHERE u.id = $1`,
        [userId]
      );

      if (userResult.rows.length === 0) {
        return reply.status(404).send({ error: 'user_not_found' });
      }

      const selectionsResult = await pool.query(
        `SELECT ups.problem_statement_id, ups.is_primary,
                ps.code, ps.label, ps.description,
                pc.name AS category_name, pc.slug AS category_slug
         FROM user_problem_selections ups
         JOIN problem_statements ps ON ps.id = ups.problem_statement_id
         JOIN problem_categories pc ON pc.id = ps.category_id
         WHERE ups.user_id = $1`,
        [userId]
      );

      const user = userResult.rows[0];
      user.problem_selections = selectionsResult.rows;

      return reply.send({ user });
    }
  );

  // PATCH /users/me - update profile
  fastify.patch(
    '/users/me',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = request.jwtUser!.userId;
      const parsed = updateProfileSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'validation_error', details: parsed.error.flatten() });
      }

      const { full_name, professional_role, bio, district_id, primary_problem_id, secondary_problem_ids } =
        parsed.data;

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Build dynamic update for user fields
        const updates: string[] = [];
        const values: unknown[] = [];
        let idx = 1;

        if (full_name !== undefined) {
          updates.push(`full_name = $${idx++}`);
          values.push(full_name);
        }
        if (professional_role !== undefined) {
          updates.push(`professional_role = $${idx++}`);
          values.push(professional_role);
        }
        if (bio !== undefined) {
          updates.push(`bio = $${idx++}`);
          values.push(bio);
        }
        if (district_id !== undefined) {
          updates.push(`district_id = $${idx++}`);
          values.push(district_id);
        }

        if (updates.length > 0) {
          values.push(userId);
          await client.query(
            `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}`,
            values
          );
        }

        // Handle problem selections
        if (primary_problem_id !== undefined) {
          if (primary_problem_id === null) {
            // Remove primary selection
            await client.query(
              'DELETE FROM user_problem_selections WHERE user_id = $1 AND is_primary = true',
              [userId]
            );
          } else {
            // Upsert primary selection (unique index ensures only one primary)
            await client.query(
              `INSERT INTO user_problem_selections (user_id, problem_statement_id, is_primary)
               VALUES ($1, $2, true)
               ON CONFLICT (user_id, problem_statement_id)
               DO UPDATE SET is_primary = true`,
              [userId, primary_problem_id]
            );
            // Clear primary flag from any other selections
            await client.query(
              `UPDATE user_problem_selections SET is_primary = false
               WHERE user_id = $1 AND problem_statement_id != $2 AND is_primary = true`,
              [userId, primary_problem_id]
            );
          }
        }

        if (secondary_problem_ids !== undefined) {
          // Remove secondary selections not in new list
          await client.query(
            `DELETE FROM user_problem_selections
             WHERE user_id = $1 AND is_primary = false
             AND problem_statement_id != ALL($2::uuid[])`,
            [userId, secondary_problem_ids]
          );

          // Insert new secondary selections
          for (const problemId of secondary_problem_ids) {
            await client.query(
              `INSERT INTO user_problem_selections (user_id, problem_statement_id, is_primary)
               VALUES ($1, $2, false)
               ON CONFLICT (user_id, problem_statement_id) DO NOTHING`,
              [userId, problemId]
            );
          }
        }

        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }

      // Check and set profile_completed_at
      await checkAndSetProfileCompleted(userId);

      // Return updated user
      const userResult = await pool.query(
        `SELECT u.id, u.email, u.full_name, u.professional_role, u.bio,
                u.district_id, u.platform_role, u.membership_status, u.is_demo_profile,
                u.profile_completed_at, u.suspended_until, u.created_at, u.updated_at
         FROM users u WHERE u.id = $1`,
        [userId]
      );

      return reply.send({ user: userResult.rows[0] });
    }
  );
}
