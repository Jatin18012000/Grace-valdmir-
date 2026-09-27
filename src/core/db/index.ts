import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { AppError } from "../errors";
import { migrations as defaultMigrations, type Migration } from "./migrations";

export type Db = Database.Database;

/** Opens (and creates if needed) a SQLite database. Use ":memory:" for tests. */
export function openDatabase(dbPath: string): Db {
  if (dbPath !== ":memory:") mkdirSync(path.dirname(dbPath), { recursive: true });
  let db: Db;
  try {
    db = new Database(dbPath);
  } catch (error) {
    throw new AppError("DATABASE_ERROR", `Cannot open SQLite database at ${dbPath}`, {
      cause: error,
      details: { dbPath },
    });
  }
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  return db;
}

export interface AppliedMigration {
  id: number;
  name: string;
  applied_at: string;
}

/** Applies pending migrations in order, each in its own transaction. Returns newly applied ids. */
export function migrate(db: Db, migrations: readonly Migration[] = defaultMigrations): number[] {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL
  )`);
  const applied = new Set(
    db.prepare("SELECT id FROM schema_migrations").all().map((row) => (row as { id: number }).id),
  );
  const ids = migrations.map((m) => m.id);
  if (new Set(ids).size !== ids.length || ids.some((id, i) => i > 0 && id <= (ids[i - 1] ?? 0))) {
    throw new AppError("DATABASE_ERROR", "Migration ids must be unique and strictly increasing.");
  }
  const newlyApplied: number[] = [];
  for (const migration of migrations) {
    if (applied.has(migration.id)) continue;
    try {
      db.transaction(() => {
        db.exec(migration.sql);
        db.prepare("INSERT INTO schema_migrations (id, name, applied_at) VALUES (?, ?, ?)").run(
          migration.id,
          migration.name,
          new Date().toISOString(),
        );
      })();
    } catch (error) {
      throw new AppError("DATABASE_ERROR", `Migration ${migration.id} (${migration.name}) failed`, {
        cause: error,
        details: { migrationId: migration.id, migrationName: migration.name, appliedBefore: newlyApplied },
      });
    }
    newlyApplied.push(migration.id);
  }
  return newlyApplied;
}

export function appliedMigrations(db: Db): AppliedMigration[] {
  return db
    .prepare("SELECT id, name, applied_at FROM schema_migrations ORDER BY id")
    .all() as AppliedMigration[];
}
