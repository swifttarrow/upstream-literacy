import { FastifyRequest, FastifyReply } from 'fastify';

export async function requireModerator(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const role = request.jwtUser?.platform_role;
  if (!role || (role !== 'admin' && role !== 'moderator')) {
    return reply.status(403).send({ error: 'forbidden', message: 'Moderator access required' });
  }
}
