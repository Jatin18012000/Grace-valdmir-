import { describe, expect, it } from "vitest";
import { loadCharacterBibleFile } from "@/core/character/load";
import { getCharacter, syncCharacterBible } from "@/core/character/repository";
import { appliedMigrations, migrate, openDatabase } from "@/core/db";
import { migrations } from "@/core/db/migrations";
import { listEvents, recordEvent } from "@/core/events";
import { getSettingValues, initializeSettings } from "@/core/settings";
import { BIBLE_PATH } from "./helpers";

describe("upgrading an existing Foundation database (migration 1 only)", () => {
  it("adds event_log and settings and keeps existing character data", () => {
    const db = openDatabase(":memory:");
    expect(migrate(db, migrations.slice(0, 1))).toEqual([1]);
    const loaded = loadCharacterBibleFile(BIBLE_PATH);
    syncCharacterBible(db, loaded);

    expect(migrate(db)).toEqual([2, 3]);
    expect(appliedMigrations(db).map((m) => m.id)).toEqual([1, 2, 3]);
    expect(getCharacter(db, "grace")?.bibleSha256).toBe(loaded.sha256);
    expect(getCharacter(db, "grace")?.versionCount).toBe(1);

    initializeSettings(db, {}, { allowFullAutopilot: false });
    expect(getSettingValues(db).autopilot_mode).toBe("ASSISTED");
    recordEvent(db, { eventType: "APP_STARTED", source: "app", message: "m" });
    expect(listEvents(db, { eventType: "APP_STARTED" })).toHaveLength(1);
  });

  it("enforces event_log and settings constraints at the database level", () => {
    const db = openDatabase(":memory:");
    migrate(db);
    const insertEvent = db.prepare(
      "INSERT INTO event_log (occurred_at, event_type, severity, source, message, metadata_json, created_at, entity_type, entity_id) VALUES ('t','APP_STARTED',?, 's','m',?, 't', ?, ?)",
    );
    expect(() => insertEvent.run("LOUD", "{}", null, null)).toThrow(/CHECK/);
    expect(() => insertEvent.run("INFO", "not json", null, null)).toThrow(/CHECK/);
    expect(() => insertEvent.run("INFO", "{}", "ASSET", null)).toThrow(/CHECK/);
    expect(() =>
      db.prepare("INSERT INTO settings (key, value_json, source, created_at, updated_at) VALUES ('k','1','ROBOT','t','t')").run(),
    ).toThrow(/CHECK/);
  });
});
