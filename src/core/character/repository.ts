import type { Db } from "../db";
import { parseCharacterBible, type LoadedBible } from "./load";
import type { CharacterBible } from "./schema";

export interface StoredCharacter {
  id: string;
  name: string;
  bible: CharacterBible;
  bibleSha256: string;
  sourcePath: string;
  createdAt: string;
  updatedAt: string;
  versionCount: number;
}

interface CharacterRow {
  id: string;
  name: string;
  bible_json: string;
  bible_sha256: string;
  source_path: string;
  created_at: string;
  updated_at: string;
  version_count: number;
}

export type SyncOutcome = "CREATED" | "UPDATED" | "UNCHANGED";

/**
 * Stores a validated Bible. A new version row is written only when the content changes.
 */
export function syncCharacterBible(db: Db, loaded: LoadedBible, now = new Date()): SyncOutcome {
  const timestamp = now.toISOString();
  const { bible } = loaded;
  return db.transaction((): SyncOutcome => {
    const existing = db
      .prepare("SELECT bible_sha256 FROM characters WHERE id = ?")
      .get(bible.characterId) as { bible_sha256: string } | undefined;

    if (existing?.bible_sha256 === loaded.sha256) return "UNCHANGED";

    if (existing) {
      db.prepare(
        `UPDATE characters SET name = ?, schema_version = ?, bible_json = ?, bible_sha256 = ?,
           source_path = ?, updated_at = ? WHERE id = ?`,
      ).run(bible.name, bible.schemaVersion, loaded.canonicalJson, loaded.sha256, loaded.sourcePath, timestamp, bible.characterId);
    } else {
      db.prepare(
        `INSERT INTO characters (id, name, schema_version, bible_json, bible_sha256, source_path, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(bible.characterId, bible.name, bible.schemaVersion, loaded.canonicalJson, loaded.sha256, loaded.sourcePath, timestamp, timestamp);
    }
    db.prepare(
      `INSERT OR IGNORE INTO character_bible_versions (character_id, bible_sha256, bible_json, created_at)
       VALUES (?, ?, ?, ?)`,
    ).run(bible.characterId, loaded.sha256, loaded.canonicalJson, timestamp);
    return existing ? "UPDATED" : "CREATED";
  })();
}

const SELECT_CHARACTER = `
  SELECT c.id, c.name, c.bible_json, c.bible_sha256, c.source_path, c.created_at, c.updated_at,
         (SELECT COUNT(*) FROM character_bible_versions v WHERE v.character_id = c.id) AS version_count
  FROM characters c`;

function toStored(row: CharacterRow): StoredCharacter {
  // Re-validate on read: stored JSON is never trusted blindly.
  return {
    id: row.id,
    name: row.name,
    bible: parseCharacterBible(JSON.parse(row.bible_json)),
    bibleSha256: row.bible_sha256,
    sourcePath: row.source_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    versionCount: row.version_count,
  };
}

export function getCharacter(db: Db, id: string): StoredCharacter | null {
  const row = db.prepare(`${SELECT_CHARACTER} WHERE c.id = ?`).get(id) as CharacterRow | undefined;
  return row ? toStored(row) : null;
}

export function listCharacters(db: Db): StoredCharacter[] {
  return (db.prepare(`${SELECT_CHARACTER} ORDER BY c.id`).all() as CharacterRow[]).map(toStored);
}
