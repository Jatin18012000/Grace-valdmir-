/**
 * Initialises the SQLite database and syncs the Character Bible.
 * Usage: npm run db:init
 */
import { loadConfig } from "../src/core/config";
import { appliedMigrations, migrate, openDatabase } from "../src/core/db";
import { loadCharacterBibleFile } from "../src/core/character/load";
import { syncCharacterBible } from "../src/core/character/repository";
import { lockedIdentityFields, pendingIdentityFields } from "../src/core/character/schema";

const config = loadConfig();
const db = openDatabase(config.dbPath);
const newlyApplied = migrate(db);
const loaded = loadCharacterBibleFile(config.characterBiblePath);
const outcome = syncCharacterBible(db, loaded);

console.log(`Database: ${config.dbPath}`);
console.log(`Migrations applied now: ${newlyApplied.length ? newlyApplied.join(", ") : "none (already up to date)"}`);
console.log(`Migrations total: ${appliedMigrations(db).map((m) => `${m.id}:${m.name}`).join(", ")}`);
console.log(`Character "${loaded.bible.characterId}": ${outcome} (sha256 ${loaded.sha256.slice(0, 12)}…)`);
console.log(`Locked identity fields: ${lockedIdentityFields(loaded.bible).map(([f]) => f).join(", ")}`);
console.log(`Pending identity fields: ${pendingIdentityFields(loaded.bible).join(", ")}`);
db.close();
