import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// The data directory should be at the root of the server package
const DEFAULT_DATA_DIR = path.resolve(__dirname, '../../data');
const DB_PATH = process.env.FINAPP_DB_PATH || path.join(DEFAULT_DATA_DIR, 'finapp.db');

export function initDb() {
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS bookmarks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      savedAt TEXT NOT NULL,
      payload TEXT NOT NULL
    );
  `);

  return db;
}

// Singleton instance for the app
let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!dbInstance) {
    dbInstance = initDb();
  }
  return dbInstance;
}
