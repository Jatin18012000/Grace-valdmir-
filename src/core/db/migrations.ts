/**
 * Ordered schema migrations. Append only: never edit a migration that has been applied.
 * Later phases (references, jobs, assets, QC) add their tables as new migrations.
 */
export interface Migration {
  id: number;
  name: string;
  sql: string;
}

export const migrations: readonly Migration[] = [
  {
    id: 1,
    name: "characters",
    sql: `
      CREATE TABLE characters (
        id            TEXT PRIMARY KEY,
        name          TEXT NOT NULL,
        schema_version INTEGER NOT NULL,
        bible_json    TEXT NOT NULL,
        bible_sha256  TEXT NOT NULL,
        source_path   TEXT NOT NULL,
        created_at    TEXT NOT NULL,
        updated_at    TEXT NOT NULL
      );

      -- Every distinct Bible content ever loaded, for traceability.
      CREATE TABLE character_bible_versions (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        character_id  TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
        bible_sha256  TEXT NOT NULL,
        bible_json    TEXT NOT NULL,
        created_at    TEXT NOT NULL,
        UNIQUE (character_id, bible_sha256)
      );
    `,
  },
];
