import { z } from 'zod';

export const BookmarkSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  savedAt: z.string().datetime(),
  payload: z.string().min(1),
  description: z.string().optional(),
});

export const CreateBookmarkSchema = BookmarkSchema.omit({ id: true, savedAt: true }).extend({
  id: z.string().optional(),
  savedAt: z.string().optional(),
});

export const ListBookmarksResponseSchema = z.array(BookmarkSchema);

export type CreateBookmarkRequest = z.infer<typeof CreateBookmarkSchema>;
