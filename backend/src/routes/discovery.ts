import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { pool } from '../db/index.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireProfileCompleted } from '../middleware/requireProfileCompleted.js';

const matchQuerySchema = z.object({
  problemId: z.string().uuid().optional(),
  districtId: z.string().uuid().optional(),
  professionalRole: z.string().optional(),
  stateRegion: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

type MatchType = 'exact' | 'close';

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
  matchType: MatchType;
  explanation: string;
  connectionStatus: 'none' | 'pending_sent' | 'pending_received' | 'connected';
  matchScore: number;
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

      const { problemId, districtId, professionalRole, stateRegion, page, limit } = parsed.data;
      const currentUserId = request.jwtUser!.userId;
      const offset = (page - 1) * limit;

      // Get current user's profile for matching context
      const selfResult = await pool.query(
        `SELECT u.id, u.district_id, u.professional_role, d.state_region
         FROM users u
         LEFT JOIN districts d ON d.id = u.district_id
         WHERE u.id = $1`,
        [currentUserId]
      );
      const self = selfResult.rows[0];

      // Get current user's primary problem
      const selfPrimaryResult = await pool.query(
        `SELECT problem_statement_id FROM user_problem_selections
         WHERE user_id = $1 AND is_primary = true`,
        [currentUserId]
      );
      const selfPrimaryProblemId = selfPrimaryResult.rows[0]?.problem_statement_id || null;

      // Get current user's all problem IDs
      const selfProblemsResult = await pool.query(
        `SELECT problem_statement_id FROM user_problem_selections WHERE user_id = $1`,
        [currentUserId]
      );
      const selfProblemIds = selfProblemsResult.rows.map((r) => r.problem_statement_id);

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
        const candidatePrimaryProblemId = candidateProblems.find((p) => p.is_primary)?.problem_statement_id;
        const candidateProblemIds = candidateProblems.map((p) => p.problem_statement_id);

        let score = 0;
        const explanationParts: string[] = [];

        // Apply filters
        if (problemId) {
          if (!candidateProblemIds.includes(problemId)) continue;
        }
        if (districtId && candidate.district_id !== districtId) continue;
        if (professionalRole && candidate.professional_role !== professionalRole) continue;
        if (stateRegion && candidate.district_state_region !== stateRegion) continue;

        // Scoring
        // Primary problem match (highest weight)
        if (selfPrimaryProblemId && candidatePrimaryProblemId === selfPrimaryProblemId) {
          score += 100;
          explanationParts.push('shares your primary challenge');
        } else if (selfPrimaryProblemId && candidateProblemIds.includes(selfPrimaryProblemId)) {
          score += 60;
          explanationParts.push('working on your primary challenge area');
        }

        // Secondary problem overlap
        const sharedSecondary = selfProblemIds.filter((id) =>
          id !== selfPrimaryProblemId && candidateProblemIds.includes(id)
        );
        if (sharedSecondary.length > 0) {
          score += sharedSecondary.length * 20;
          explanationParts.push(`shares ${sharedSecondary.length} other challenge area(s)`);
        }

        // Same district
        if (self.district_id && candidate.district_id === self.district_id) {
          score += 30;
          explanationParts.push('same district');
        }

        // Same state
        if (self.state_region && candidate.district_state_region === self.state_region) {
          score += 10;
          explanationParts.push('same state/region');
        }

        // Same role
        if (self.professional_role && candidate.professional_role === self.professional_role) {
          score += 15;
          explanationParts.push('same professional role');
        }

        // Demo profiles get a small boost for cold start
        if (candidate.is_demo_profile) {
          score += 5;
        }

        const primaryMatches =
          selfPrimaryProblemId && candidatePrimaryProblemId === selfPrimaryProblemId;
        const matchType: MatchType = primaryMatches ? 'exact' : 'close';
        const explanation =
          explanationParts.length > 0
            ? explanationParts.join(', ')
            : 'may have relevant experience';

        const connStatus = connectionMap.get(candidate.id) || 'none';

        scored.push({
          ...candidate,
          matchType,
          explanation,
          connectionStatus: connStatus as MatchResult['connectionStatus'],
          matchScore: score,
        });
      }

      // Sort by score descending, then by name for determinism
      scored.sort((a, b) => {
        if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
        return a.full_name.localeCompare(b.full_name);
      });

      // Cold-start: if no exact matches from real users, include demo profiles
      const realExact = scored.filter((m) => m.matchType === 'exact' && !m.is_demo_profile);
      const total = scored.length;
      const paginated = scored.slice(offset, offset + limit);

      // Remove matchScore from response
      const matches = paginated.map(({ matchScore: _ms, ...rest }) => rest);

      return reply.send({
        matches,
        meta: {
          total,
          realExactCount: realExact.length,
          coldStart: realExact.length === 0,
        },
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    }
  );
}
