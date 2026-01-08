import Database from 'better-sqlite3';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const dbPath = process.env.DATABASE_URL || path.join(__dirname, '../fiduciary.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

export const query = (text: string, params: any[] = []) => {
    return db.prepare(text).all(params);
};

export const execute = (text: string, params: any[] = []) => {
    return db.prepare(text).run(params);
};

export const initDb = async () => {
    const schema = `
    CREATE TABLE IF NOT EXISTS citations (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      title TEXT NOT NULL,
      source TEXT NOT NULL,
      summary TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS jurisdictions (
      citation_id TEXT REFERENCES citations(id),
      jurisdiction_name TEXT NOT NULL,
      PRIMARY KEY (citation_id, jurisdiction_name)
    );

    CREATE TABLE IF NOT EXISTS dependencies (
      citation_id TEXT REFERENCES citations(id),
      depends_on_id TEXT REFERENCES citations(id),
      PRIMARY KEY (citation_id, depends_on_id)
    );

    CREATE TABLE IF NOT EXISTS rule_effects (
      id TEXT PRIMARY KEY,
      citation_id TEXT REFERENCES citations(id),
      operation TEXT NOT NULL,
      constraint_type TEXT NOT NULL, -- REQUIRE, BLOCK, AUDIT
      description TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_citations_source ON citations(source);
    CREATE INDEX IF NOT EXISTS idx_rule_effects_operation ON rule_effects(operation);
  `;

    try {
        db.exec(schema);
        console.log('Database schema initialized');
    } catch (err) {
        console.error('Error initializing database schema:', err);
    }
};
