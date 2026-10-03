import initSqlJs, { type Database, type SqlValue } from 'sql.js';
import fs from 'node:fs';
import path from 'node:path';
import { env, projectRoot } from './env.js';

const databasePath = path.resolve(projectRoot, env.databasePath);
fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const SQL = await initSqlJs();
export const database: Database = fs.existsSync(databasePath)
  ? new SQL.Database(fs.readFileSync(databasePath))
  : new SQL.Database();
database.run('PRAGMA foreign_keys = ON');
database.run(`
  CREATE TABLE IF NOT EXISTS places (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, category TEXT NOT NULL,
    description TEXT, address TEXT NOT NULL,
    latitude REAL NOT NULL CHECK (latitude >= -90 AND latitude <= 90),
    longitude REAL NOT NULL CHECK (longitude >= -180 AND longitude <= 180),
    contributor_name TEXT NOT NULL, contributor_email TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS accessibility_features (
    id INTEGER PRIMARY KEY AUTOINCREMENT, place_id INTEGER NOT NULL, type TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('available', 'unavailable', 'unknown')), notes TEXT,
    FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE, UNIQUE (place_id, type)
  );
  CREATE INDEX IF NOT EXISTS idx_places_name ON places(name);
  CREATE INDEX IF NOT EXISTS idx_places_category ON places(category);
  CREATE INDEX IF NOT EXISTS idx_features_type_status ON accessibility_features(type, status);
`);

export function saveDatabase(): void { fs.writeFileSync(databasePath, Buffer.from(database.export())); }
export type DbRow = Record<string, SqlValue>;
export function all<T extends DbRow>(sql: string, params: SqlValue[] = []): T[] {
  const statement = database.prepare(sql);
  try {
    statement.bind(params);
    const rows: T[] = [];
    while (statement.step()) rows.push(statement.getAsObject() as T);
    return rows;
  } finally { statement.free(); }
}
export function get<T extends DbRow>(sql: string, params: SqlValue[] = []): T | undefined { return all<T>(sql, params)[0]; }
export function run(sql: string, params: SqlValue[] = []): { changes: number; lastInsertRowid: number } {
  database.run(sql, params);
  const result = get<{ changes: number; lastInsertRowid: number }>('SELECT changes() AS changes, last_insert_rowid() AS lastInsertRowid');
  return { changes: Number(result?.changes ?? 0), lastInsertRowid: Number(result?.lastInsertRowid ?? 0) };
}
export function transaction<T>(work: () => T): T {
  database.run('BEGIN');
  try { const result = work(); database.run('COMMIT'); saveDatabase(); return result; }
  catch (error) { database.run('ROLLBACK'); throw error; }
}





