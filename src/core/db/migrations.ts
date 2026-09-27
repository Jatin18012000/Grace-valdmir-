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
  {
    id: 2,
    name: "event_log",
    sql: `
      CREATE TABLE event_log (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        occurred_at  TEXT NOT NULL,
        event_type   TEXT NOT NULL,
        severity     TEXT NOT NULL CHECK (severity IN ('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL')),
        source       TEXT NOT NULL,
        entity_type  TEXT,
        entity_id    TEXT,
        message      TEXT NOT NULL,
        metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
        created_at   TEXT NOT NULL,
        CHECK ((entity_type IS NULL) = (entity_id IS NULL))
      );
      CREATE INDEX idx_event_log_occurred_at ON event_log (occurred_at);
      CREATE INDEX idx_event_log_type ON event_log (event_type);
      CREATE INDEX idx_event_log_entity ON event_log (entity_type, entity_id);
    `,
  },
  {
    id: 3,
    name: "settings",
    sql: `
      CREATE TABLE settings (
        key         TEXT PRIMARY KEY,
        value_json  TEXT NOT NULL CHECK (json_valid(value_json)),
        source      TEXT NOT NULL CHECK (source IN ('DEFAULT', 'ENV', 'USER')),
        created_at  TEXT NOT NULL,
        updated_at  TEXT NOT NULL
      );
    `,
  },
];
