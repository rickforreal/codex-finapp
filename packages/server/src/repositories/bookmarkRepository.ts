import type { BookmarkRecord } from '@finapp/shared';
import { getDb } from '../db/index';

export class BookmarkRepository {
  private db = getDb();

  list(): BookmarkRecord[] {
    const stmt = this.db.prepare('SELECT * FROM bookmarks ORDER BY savedAt DESC');
    return stmt.all() as BookmarkRecord[];
  }

  getById(id: string): BookmarkRecord | undefined {
    const stmt = this.db.prepare('SELECT * FROM bookmarks WHERE id = ?');
    return stmt.get(id) as BookmarkRecord | undefined;
  }

  create(bookmark: BookmarkRecord): void {
    const stmt = this.db.prepare(`
      INSERT INTO bookmarks (id, name, description, savedAt, payload)
      VALUES (@id, @name, @description, @savedAt, @payload)
    `);
    stmt.run(bookmark);
  }

  update(id: string, updates: Partial<Omit<BookmarkRecord, 'id'>>): void {
    const fields = Object.keys(updates);
    if (fields.length === 0) {
      return;
    }

    const setClause = fields.map((field) => `${field} = @${field}`).join(', ');
    const stmt = this.db.prepare(`UPDATE bookmarks SET ${setClause} WHERE id = @id`);
    stmt.run({ ...updates, id });
  }

  delete(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM bookmarks WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }
}

export const bookmarkRepository = new BookmarkRepository();
