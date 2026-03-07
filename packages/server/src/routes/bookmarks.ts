import type { FastifyInstance } from 'fastify';
import { CreateBookmarkSchema } from '@finapp/shared';
import { bookmarkRepository } from '../repositories/bookmarkRepository';
import crypto from 'node:crypto';

export async function bookmarkRoutes(app: FastifyInstance) {
  app.get('/bookmarks', async () => {
    return bookmarkRepository.list();
  });

  app.post('/bookmarks', async (request, reply) => {
    const parseResult = CreateBookmarkSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: 'Invalid bookmark data',
        fieldErrors: parseResult.error.errors.map((err) => ({
          path: err.path.join('.'),
          issue: err.message,
        })),
      });
    }

    const { id, name, description, savedAt, payload } = parseResult.data;
    const bookmark = {
      id: id || crypto.randomUUID(),
      name,
      description,
      savedAt: savedAt || new Date().toISOString(),
      payload,
    };

    bookmarkRepository.create(bookmark);
    return reply.status(201).send(bookmark);
  });

  app.delete('/bookmarks/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = bookmarkRepository.delete(id);
    if (!deleted) {
      return reply.status(404).send({
        code: 'NOT_FOUND',
        message: 'Bookmark not found',
      });
    }
    return reply.status(204).send();
  });
}
