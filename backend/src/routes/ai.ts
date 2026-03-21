import { FastifyInstance } from 'fastify';
import OpenAI from 'openai';
import { pool } from '../db/index.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireProfileCompleted } from '../middleware/requireProfileCompleted.js';

const RATE_LIMIT_PER_HOUR = 5;
const PROMPT_VERSION = 'v1';
const AI_MODEL = 'gpt-4o-mini';

async function checkRateLimit(userId: string, kind: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT COUNT(*) FROM user_ai_artifacts
     WHERE user_id = $1 AND kind = $2
       AND created_at > now() - interval '1 hour'`,
    [userId, kind]
  );
  return parseInt(result.rows[0].count) < RATE_LIMIT_PER_HOUR;
}

async function getConversationMessages(conversationId: string, _userId: string) {
  const result = await pool.query(
    `SELECT m.body, m.created_at, u.full_name AS sender_name
     FROM messages m
     JOIN users u ON u.id = m.sender_id
     WHERE m.conversation_id = $1 AND m.deleted_at IS NULL
     ORDER BY m.created_at ASC
     LIMIT 100`,
    [conversationId]
  );
  return result.rows;
}

async function callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }

  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create({
    model: AI_MODEL,
    max_tokens: 1024,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });

  const choice = completion.choices[0];
  if (!choice?.message?.content) {
    throw new Error('Unexpected empty response from OpenAI');
  }
  return choice.message.content;
}

export default async function aiRoutes(fastify: FastifyInstance) {
  // POST /conversations/:id/summarize
  fastify.post(
    '/conversations/:id/summarize',
    { preHandler: [authenticate, requireProfileCompleted] },
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

      // Rate limit
      const allowed = await checkRateLimit(currentUserId, 'conversation_summary');
      if (!allowed) {
        return reply.status(429).send({ error: 'rate_limit_exceeded', limit: RATE_LIMIT_PER_HOUR, window: '1 hour' });
      }

      const messages = await getConversationMessages(id, currentUserId);
      if (messages.length === 0) {
        return reply.status(400).send({ error: 'no_messages_to_summarize' });
      }

      const conversationText = messages
        .map((m) => `${m.sender_name}: ${m.body}`)
        .join('\n');

      const systemPrompt = `You are an assistant for district education staff collaborating on shared challenges.
Summarize the following conversation concisely, highlighting key topics discussed, decisions made, and any action items mentioned.`;

      const userPrompt = `Please summarize this conversation:\n\n${conversationText}`;

      let summary: string;
      try {
        summary = await callLLM(systemPrompt, userPrompt);
      } catch (err) {
        console.error('OpenAI API error:', err);
        return reply.status(502).send({ error: 'ai_service_unavailable' });
      }

      const artifactResult = await pool.query(
        `INSERT INTO user_ai_artifacts
         (user_id, conversation_id, kind, content, model_name, prompt_version)
         VALUES ($1, $2, 'conversation_summary', $3, $4, $5)
         RETURNING *`,
        [currentUserId, id, JSON.stringify({ summary }), AI_MODEL, PROMPT_VERSION]
      );

      return reply.status(201).send({
        artifact: artifactResult.rows[0],
        summary,
      });
    }
  );

  // POST /conversations/:id/suggest-actions
  fastify.post(
    '/conversations/:id/suggest-actions',
    { preHandler: [authenticate, requireProfileCompleted] },
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

      // Rate limit
      const allowed = await checkRateLimit(currentUserId, 'suggested_actions');
      if (!allowed) {
        return reply.status(429).send({ error: 'rate_limit_exceeded', limit: RATE_LIMIT_PER_HOUR, window: '1 hour' });
      }

      const messages = await getConversationMessages(id, currentUserId);
      if (messages.length === 0) {
        return reply.status(400).send({ error: 'no_messages_to_analyze' });
      }

      const conversationText = messages
        .map((m) => `${m.sender_name}: ${m.body}`)
        .join('\n');

      const systemPrompt = `You are an assistant for district education staff.
Based on the conversation, suggest 3-5 concrete next steps or actions the participants could take to address their shared challenges.
Return a JSON array of action items with fields: "action" (brief title), "description" (1-2 sentences), "priority" (high/medium/low).`;

      const userPrompt = `Based on this conversation, what are the suggested next steps?\n\n${conversationText}\n\nReturn JSON array only.`;

      let suggestionsText: string;
      try {
        suggestionsText = await callLLM(systemPrompt, userPrompt);
      } catch (err) {
        console.error('OpenAI API error:', err);
        return reply.status(502).send({ error: 'ai_service_unavailable' });
      }

      let suggestions: unknown[];
      try {
        // Extract JSON from response
        const jsonMatch = suggestionsText.match(/\[[\s\S]*\]/);
        suggestions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      } catch {
        suggestions = [{ action: 'Review conversation', description: suggestionsText, priority: 'medium' }];
      }

      const artifactResult = await pool.query(
        `INSERT INTO user_ai_artifacts
         (user_id, conversation_id, kind, content, model_name, prompt_version)
         VALUES ($1, $2, 'suggested_actions', $3, $4, $5)
         RETURNING *`,
        [currentUserId, id, JSON.stringify({ suggestions }), AI_MODEL, PROMPT_VERSION]
      );

      return reply.status(201).send({
        artifact: artifactResult.rows[0],
        suggestions,
      });
    }
  );

  // GET /conversations/:id/artifacts
  fastify.get(
    '/conversations/:id/artifacts',
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
        `SELECT * FROM user_ai_artifacts
         WHERE user_id = $1 AND conversation_id = $2
         ORDER BY created_at DESC`,
        [currentUserId, id]
      );

      return reply.send({ artifacts: result.rows });
    }
  );
}
