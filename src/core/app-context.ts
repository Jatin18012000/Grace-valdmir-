import "server-only";
import { getConfig, type AppConfig } from "./config";
import { appliedMigrations, migrate, openDatabase, type AppliedMigration, type Db } from "./db";
import { loadCharacterBibleFile } from "./character/load";
import { syncCharacterBible, type SyncOutcome } from "./character/repository";

/**
 * Server-side application context: config + migrated database, created once per process.
 * On startup the Character Bible file is validated and synced into SQLite.
 */
export interface AppContext {
  config: AppConfig;
  db: Db;
  migrations: AppliedMigration[];
  bibleSync: { outcome: SyncOutcome; sha256: string } | { outcome: "ERROR"; error: string };
}

let context: AppContext | undefined;

export function getAppContext(): AppContext {
  if (context) return context;
  const config = getConfig();
  const db = openDatabase(config.dbPath);
  migrate(db);
  let bibleSync: AppContext["bibleSync"];
  try {
    const loaded = loadCharacterBibleFile(config.characterBiblePath);
    bibleSync = { outcome: syncCharacterBible(db, loaded), sha256: loaded.sha256 };
  } catch (error) {
    // Keep serving: the UI shows the error instead of crashing.
    bibleSync = { outcome: "ERROR", error: error instanceof Error ? error.message : String(error) };
  }
  context = { config, db, migrations: appliedMigrations(db), bibleSync };
  return context;
}
