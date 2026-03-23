import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { pool } from '../db/index.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireProfileCompleted } from '../middleware/requireProfileCompleted.js';

const matchQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

interface MatchResult {
  id: string;
  email: string;
  full_name: string;
  professional_role: string | null;
  bio: string | null;
  district_id: string | null;
  district_name: string | null;
  district_state_region: string | null;
  membership_status: string;
  is_demo_profile: boolean;
  profile_completed_at: Date | null;
  connectionStatus: 'none' | 'pending_sent' | 'pending_received' | 'connected';
  explanation: string;
  districtSimilarityScore: number;
  problemSimilarityScore: number;
  compositeScore: number;
}

export default async function discoveryRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/discovery/matches',
    { preHandler: [authenticate, requireProfileCompleted] },
    async (request, reply) => {
      const parsed = matchQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'validation_error', details: parsed.error.flatten() });
      }

      const { page, limit } = parsed.data;
      const currentUserId = request.jwtUser!.userId;
      const offset = (page - 1) * limit;

      // Get current user's profile for matching context
      const selfResult = await pool.query(
        `SELECT u.id, u.district_id, u.professional_role, d.name AS district_name, d.state_region
         FROM users u
         LEFT JOIN districts d ON d.id = u.district_id
         WHERE u.id = $1`,
        [currentUserId]
      );
      const self = selfResult.rows[0];
      if (!self) {
        return reply.status(404).send({ error: 'user_not_found' });
      }

      // Get current user's all problem IDs
      const selfProblemsResult = await pool.query(
        `SELECT ups.problem_statement_id, ps.label
         FROM user_problem_selections ups
         JOIN problem_statements ps ON ps.id = ups.problem_statement_id
         WHERE ups.user_id = $1`,
        [currentUserId]
      );
      const selfProblemIds = selfProblemsResult.rows.map((r) => r.problem_statement_id);
      const selfProblemWeight = selfProblemIds.length > 0 ? 50 / selfProblemIds.length : 0;

      // Fetch candidate users: approved, non-suspended, profile completed, excluding self
      const candidatesResult = await pool.query(
        `SELECT u.id, u.email, u.full_name, u.professional_role, u.bio,
                u.district_id, u.membership_status, u.is_demo_profile, u.profile_completed_at,
                d.name AS district_name, d.state_region AS district_state_region, d.city AS district_city
         FROM users u
         LEFT JOIN districts d ON d.id = u.district_id
         WHERE u.id != $1
           AND u.membership_status = 'approved'
           AND u.profile_completed_at IS NOT NULL
           AND (u.suspended_until IS NULL OR u.suspended_until <= now())
         ORDER BY u.created_at DESC`,
        [currentUserId]
      );

      const candidates = candidatesResult.rows;

      // Get all candidates' problem selections in bulk
      const candidateIds = candidates.map((c) => c.id);
      let candidateProblemMap: Map<string, { problem_statement_id: string; is_primary: boolean }[]> = new Map();

      if (candidateIds.length > 0) {
        const problemsResult = await pool.query(
          `SELECT user_id, problem_statement_id, is_primary
           FROM user_problem_selections
           WHERE user_id = ANY($1::uuid[])`,
          [candidateIds]
        );
        for (const row of problemsResult.rows) {
          if (!candidateProblemMap.has(row.user_id)) {
            candidateProblemMap.set(row.user_id, []);
          }
          candidateProblemMap.get(row.user_id)!.push(row);
        }
      }

      // Fetch district characteristics (locale + size) for self and all candidate districts.
      const districtIds = Array.from(
        new Set(
          [self.district_id, ...candidates.map((c) => c.district_id)]
            .filter((id): id is string => Boolean(id))
        )
      );
      const districtCharMap = new Map<string, { district_size: string | null; locale_type: string | null; locale_subtype: string | null }>();
      if (districtIds.length > 0) {
        const districtCharsResult = await pool.query(
          `SELECT
             dav.district_id,
             MAX(CASE WHEN dad.key = 'district_size' THEN COALESCE(dav.value_text, dav.value_number::text) END) AS district_size,
             MAX(CASE WHEN dad.key = 'locale_type' THEN COALESCE(dav.value_text, dav.value_number::text) END) AS locale_type,
             MAX(CASE WHEN dad.key = 'locale_subtype' THEN COALESCE(dav.value_text, dav.value_number::text) END) AS locale_subtype
           FROM district_effective_attribute_values dav
           JOIN district_attribute_definitions dad ON dad.id = dav.definition_id
           WHERE dav.district_id = ANY($1::uuid[])
             AND dad.key IN ('district_size', 'locale_type', 'locale_subtype')
           GROUP BY dav.district_id`,
          [districtIds]
        );
        for (const row of districtCharsResult.rows) {
          districtCharMap.set(row.district_id, {
            district_size: row.district_size ?? null,
            locale_type: row.locale_type ?? null,
            locale_subtype: row.locale_subtype ?? null,
          });
        }

        // Fallback to district_candidates (via districts.external_ref -> NCES ID) when effective attrs are missing.
        const districtCandidateFallbackResult = await pool.query(
          `SELECT
             d.id AS district_id,
             dc.district_size,
             dc.locale_type,
             dc.locale_subtype
           FROM districts d
           LEFT JOIN district_candidates dc
             ON dc.nces_district_id = regexp_replace(COALESCE(d.external_ref, ''), '^NCES-', '')
           WHERE d.id = ANY($1::uuid[])`,
          [districtIds]
        );
        for (const row of districtCandidateFallbackResult.rows) {
          const existing = districtCharMap.get(row.district_id) ?? {
            district_size: null,
            locale_type: null,
            locale_subtype: null,
          };
          districtCharMap.set(row.district_id, {
            district_size: existing.district_size ?? row.district_size ?? null,
            locale_type: existing.locale_type ?? row.locale_type ?? null,
            locale_subtype: existing.locale_subtype ?? row.locale_subtype ?? null,
          });
        }
      }

      const selfDistrictChars = self.district_id ? districtCharMap.get(self.district_id) : null;

      // Get connection status for all candidates
      let connectionMap: Map<string, string> = new Map();
      if (candidateIds.length > 0) {
        const connsResult = await pool.query(
          `SELECT
             CASE WHEN user_a_id = $1 THEN user_b_id ELSE user_a_id END AS other_user_id,
             status,
             requested_by_user_id
           FROM user_connections
           WHERE user_a_id = $1 OR user_b_id = $1`,
          [currentUserId]
        );
        for (const row of connsResult.rows) {
          let connStatus: string;
          if (row.status === 'accepted') {
            connStatus = 'connected';
          } else if (row.requested_by_user_id === currentUserId) {
            connStatus = 'pending_sent';
          } else {
            connStatus = 'pending_received';
          }
          connectionMap.set(row.other_user_id, connStatus);
        }
      }

      // Score and rank candidates
      const scored: MatchResult[] = [];

      for (const candidate of candidates) {
        const candidateProblems = candidateProblemMap.get(candidate.id) || [];
        const candidateProblemIds = candidateProblems.map((p) => p.problem_statement_id);
        const candidateProblemSet = new Set(candidateProblemIds);
        const candidateDistrictChars = candidate.district_id ? districtCharMap.get(candidate.district_id) : null;

        // Match users outside of their district only.
        if (self.district_id && candidate.district_id === self.district_id) continue;

        let districtSimilarityScore = 0;
        let problemSimilarityScore = 0;
        const explanationParts: string[] = [];

        // District similarity (50 max): locale type 15 + locale subtype 15 + size 10 + same state 10.
        if (
          selfDistrictChars?.locale_type &&
          candidateDistrictChars?.locale_type &&
          selfDistrictChars.locale_type === candidateDistrictChars.locale_type
        ) {
          districtSimilarityScore += 15;
          explanationParts.push('same locale type');
        }
        if (
          selfDistrictChars?.locale_subtype &&
          candidateDistrictChars?.locale_subtype &&
          selfDistrictChars.locale_subtype === candidateDistrictChars.locale_subtype
        ) {
          districtSimilarityScore += 15;
          explanationParts.push('same locale subtype');
        }
        if (
          selfDistrictChars?.district_size &&
          candidateDistrictChars?.district_size &&
          selfDistrictChars.district_size === candidateDistrictChars.district_size
        ) {
          districtSimilarityScore += 10;
          explanationParts.push('same district size');
        }
        if (self.state_region && candidate.district_state_region === self.state_region) {
          districtSimilarityScore += 10;
          explanationParts.push('same state/region');
        }

        // Problem similarity (50 max), normalized by how many statements the current user selected.
        const sharedProblemCount = selfProblemIds.filter((id) => candidateProblemSet.has(id)).length;
        if (sharedProblemCount > 0 && selfProblemWeight > 0) {
          problemSimilarityScore = Math.min(50, sharedProblemCount * selfProblemWeight);
          explanationParts.push(`${sharedProblemCount} shared challenge${sharedProblemCount === 1 ? '' : 's'}`);
        }

        const compositeScore = districtSimilarityScore + problemSimilarityScore;

        // Only return matches with non-zero district similarity and sufficient composite relevance.
        if (districtSimilarityScore <= 0) continue;
        if (compositeScore <= 30) continue;

        const explanation = explanationParts.length > 0 ? explanationParts.join(', ') : 'profile-based similarity';

        const connStatus = connectionMap.get(candidate.id) || 'none';

        scored.push({
          ...candidate,
          connectionStatus: connStatus as MatchResult['connectionStatus'],
          explanation,
          districtSimilarityScore,
          problemSimilarityScore: Number(problemSimilarityScore.toFixed(2)),
          compositeScore: Number(compositeScore.toFixed(2)),
        });
      }

      // Sort by composite score descending, then by name for determinism.
      scored.sort((a, b) => {
        if (b.compositeScore !== a.compositeScore) return b.compositeScore - a.compositeScore;
        return a.full_name.localeCompare(b.full_name);
      });

      const total = scored.length;
      const paginated = scored.slice(offset, offset + limit);
      const matches = paginated;

      return reply.send({
        matches,
        meta: {
          total,
          profile_context: {
            district: {
              id: self.district_id,
              name: self.district_name ?? null,
              state_region: self.state_region ?? null,
              district_size: selfDistrictChars?.district_size ?? null,
              locale_type: selfDistrictChars?.locale_type ?? null,
              locale_subtype: selfDistrictChars?.locale_subtype ?? null,
            },
            selected_problem_statements: selfProblemsResult.rows.map((r) => ({
              id: r.problem_statement_id,
              label: r.label,
            })),
          },
        },
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    }
  );
}
