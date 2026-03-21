import { FastifyRequest, FastifyReply } from 'fastify';

export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (!request.jwtUser || request.jwtUser.platform_role !== 'admin') {
    return reply.status(403).send({ error: 'forbidden', message: 'Admin access required' });
  }
}
