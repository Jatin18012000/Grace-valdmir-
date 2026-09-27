import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadCharacterBibleFile } from "@/core/character/load";
import { getCharacter, listCharacters, syncCharacterBible } from "@/core/character/repository";
import { appliedMigrations, migrate, openDatabase } from "@/core/db";
import { BIBLE_PATH } from "./helpers";

const dirs: string[] = [];
function tempDbPath() {
  const dir = mkdtempSync(path.join(tmpdir(), "grace-db-"));
  dirs.push(dir);
  return path.join(dir, "nested", "grace.db");
}
afterEach(() => dirs.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })));

describe("SQLite initialisation", () => {
  it("creates the file, applies migrations once and is idempotent", () => {
    const dbPath = tempDbPath();
    const db = openDatabase(dbPath);
    expect(migrate(db)).toEqual([1, 2, 3]);
    expect(migrate(db)).toEqual([]);
    expect(appliedMigrations(db).map((m) => m.name)).toEqual(["characters", "event_log", "settings"]);
    expect(db.pragma("foreign_keys", { simple: true })).toBe(1);
    db.close();

    const reopened = openDatabase(dbPath);
    expect(migrate(reopened)).toEqual([]);
    reopened.close();
  });

  it("rejects out-of-order migrations", () => {
    const db = openDatabase(":memory:");
    expect(() => migrate(db, [{ id: 2, name: "b", sql: "" }, { id: 1, name: "a", sql: "" }])).toThrow(/strictly increasing/);
  });

  it("rolls back a failing migration", () => {
    const db = openDatabase(":memory:");
    expect(() => migrate(db, [{ id: 1, name: "bad", sql: "CREATE TABLE t (x); SELECT * FROM missing;" }])).toThrow(
      /Migration 1 \(bad\) failed/,
    );
    expect(appliedMigrations(db)).toEqual([]);
    expect(db.prepare("SELECT name FROM sqlite_master WHERE name = 't'").get()).toBeUndefined();
  });
});

describe("Character repository", () => {
  it("creates, skips unchanged content, and versions changes", () => {
    const db = openDatabase(":memory:");
    migrate(db);
    const loaded = loadCharacterBibleFile(BIBLE_PATH);

    expect(syncCharacterBible(db, loaded)).toBe("CREATED");
    expect(syncCharacterBible(db, loaded)).toBe("UNCHANGED");

    const stored = getCharacter(db, "grace");
    expect(stored?.bible).toEqual(loaded.bible);
    expect(stored?.versionCount).toBe(1);

    const changedBible = { ...loaded.bible, name: "Grace Vladmir (test)" };
    const changedJson = JSON.stringify(changedBible);
    const changed = { ...loaded, bible: changedBible, canonicalJson: changedJson, sha256: "b".repeat(64) };
    expect(syncCharacterBible(db, changed)).toBe("UPDATED");
    expect(getCharacter(db, "grace")?.name).toBe("Grace Vladmir (test)");
    expect(getCharacter(db, "grace")?.versionCount).toBe(2);
    expect(listCharacters(db)).toHaveLength(1);
    expect(getCharacter(db, "nobody")).toBeNull();
  });
});
