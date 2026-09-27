import "server-only";
import { getConfig, type AppConfig } from "./config";
import { appliedMigrations, migrate, openDatabase, type AppliedMigration, type Db } from "./db";
import { loadCharacterBibleFile } from "./character/load";
import { syncCharacterBible, type SyncOutcome } from "./character/repository";
import { toAppError } from "./errors";
import { recordEvent } from "./events";
import { initializeSettings } from "./settings";

/**
 * Server-side application context: config + migrated database, created once per process.
 * On startup: migrations run, missing settings are seeded, the Character Bible is synced,
 * and each step is written to the event log.
 */
export interface AppContext {
  config: AppConfig;
  db: Db;
  migrations: AppliedMigration[];
  bibleSync: { outcome: SyncOutcome; sha256: string } | { outcome: "ERROR"; error: string };
}

// Stored on globalThis: Next.js loads pages and API routes as separate bundles, so a
// module-level variable would create (and log) a second context in the same process.
const CONTEXT_KEY = Symbol.for("grace-autopilot.app-context");
type GlobalWithContext = typeof globalThis & { [CONTEXT_KEY]?: AppContext };
const store = globalThis as GlobalWithContext;

export function getAppContext(): AppContext {
  const existing = store[CONTEXT_KEY];
  if (existing) return existing;
  const config = getConfig();
  const db = openDatabase(config.dbPath);

  const newlyApplied = migrate(db);
  const migrations = appliedMigrations(db);
  for (const migration of migrations.filter((m) => newlyApplied.includes(m.id))) {
    recordEvent(db, {
      eventType: "MIGRATION_APPLIED",
      source: "db",
      message: `Applied migration ${migration.id} (${migration.name})`,
      metadata: { id: migration.id, name: migration.name },
    });
  }

  initializeSettings(db, config.settingsSeed, { allowFullAutopilot: config.allowFullAutopilot });

  let bibleSync: AppContext["bibleSync"];
  try {
    const loaded = loadCharacterBibleFile(config.characterBiblePath);
    const outcome = syncCharacterBible(db, loaded);
    bibleSync = { outcome, sha256: loaded.sha256 };
    if (outcome !== "UNCHANGED") {
      recordEvent(db, {
        eventType: "CHARACTER_BIBLE_SYNCED",
        source: "character",
        entityType: "CHARACTER",
        entityId: loaded.bible.characterId,
        message: `Character Bible ${outcome.toLowerCase()} (sha256 ${loaded.sha256.slice(0, 12)})`,
        metadata: { outcome, sha256: loaded.sha256, sourcePath: loaded.sourcePath },
      });
    }
  } catch (error) {
    // Keep serving: the UI shows the error instead of crashing.
    const appError = toAppError(error, "VALIDATION_ERROR");
    bibleSync = { outcome: "ERROR", error: appError.message };
    recordEvent(db, {
      eventType: "CHARACTER_BIBLE_INVALID",
      severity: "ERROR",
      source: "character",
      message: appError.message.slice(0, 2000),
      metadata: { error: { ...appError.toLog(), stack: undefined } },
    });
  }

  recordEvent(db, {
    eventType: "APP_STARTED",
    source: "app",
    message: "Application context initialised",
    metadata: { pid: process.pid, nodeVersion: process.version, migrationsApplied: newlyApplied },
  });

  const context: AppContext = { config, db, migrations, bibleSync };
  store[CONTEXT_KEY] = context;
  return context;
}

/** The context if it was already created, without creating it (for error handlers). */
export function getAppContextOrNull(): AppContext | null {
  return store[CONTEXT_KEY] ?? null;
}
