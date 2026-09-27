import { beforeEach, describe, expect, it } from "vitest";
import { migrate, openDatabase, type Db } from "@/core/db";
import { AppError, REDACTED } from "@/core/errors";
import { EVENT_TYPES, PIPELINE_EVENT_TYPES, listEvents, recordError, recordEvent, tryRecordEvent } from "@/core/events";

let db: Db;
beforeEach(() => {
  db = openDatabase(":memory:");
  migrate(db);
});

describe("recordEvent", () => {
  it("stores a structured event and returns it", () => {
    const event = recordEvent(db, {
      eventType: "SETTING_CHANGED",
      severity: "INFO",
      source: "settings",
      entityType: "SETTING",
      entityId: "autopilot_mode",
      message: "changed",
      metadata: { previous: "ASSISTED", next: "SUPERVISED" },
      occurredAt: new Date("2026-09-27T10:00:00.000Z"),
    });
    expect(event).toMatchObject({
      id: 1,
      occurredAt: "2026-09-27T10:00:00.000Z",
      eventType: "SETTING_CHANGED",
      severity: "INFO",
      source: "settings",
      entityType: "SETTING",
      entityId: "autopilot_mode",
      message: "changed",
      metadata: { previous: "ASSISTED", next: "SUPERVISED" },
    });
    expect(event.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("defaults severity to INFO and metadata to {}", () => {
    const event = recordEvent(db, { eventType: "APP_STARTED", source: "app", message: "started" });
    expect(event.severity).toBe("INFO");
    expect(event.metadata).toEqual({});
    expect(event.entityType).toBeNull();
  });

  it("defines every pipeline event type required for tracing", () => {
    expect(PIPELINE_EVENT_TYPES).toHaveLength(18);
    for (const type of ["IDEA_CREATED", "GENERATION_FAILED", "QC_REVIEW", "PUBLISHED", "PUBLISH_FAILED"]) {
      expect(EVENT_TYPES).toContain(type);
    }
  });

  it.each([
    [{ eventType: "SOMETHING_MADE_UP", source: "x", message: "m" }],
    [{ eventType: "APP_STARTED", severity: "LOUD", source: "x", message: "m" }],
    [{ eventType: "APP_STARTED", source: "", message: "m" }],
    [{ eventType: "APP_STARTED", source: "x", message: "" }],
    [{ eventType: "APP_STARTED", source: "x", message: "m", entityType: "ASSET" }],
    [{ eventType: "APP_STARTED", source: "x", message: "m", entityType: "BANANA", entityId: "1" }],
  ])("rejects invalid input %o", (input) => {
    expect(() => recordEvent(db, input as never)).toThrow(AppError);
    expect(listEvents(db)).toHaveLength(0);
  });

  it("redacts secrets in metadata", () => {
    const event = recordEvent(db, { eventType: "APP_STARTED", source: "app", message: "m", metadata: { token: "abc", ok: 1 } });
    expect(event.metadata).toEqual({ token: REDACTED, ok: 1 });
  });

  it("rejects metadata that cannot be serialised", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    // redact() caps depth, so a circular object becomes a bounded structure rather than hanging.
    expect(() => recordEvent(db, { eventType: "APP_STARTED", source: "app", message: "m", metadata: { circular } })).not.toThrow();
    expect(() => recordEvent(db, { eventType: "APP_STARTED", source: "app", message: "m", metadata: { n: 10n } })).toThrow(/JSON-serialisable/);
  });
});

describe("listEvents", () => {
  beforeEach(() => {
    recordEvent(db, { eventType: "APP_STARTED", severity: "DEBUG", source: "app", message: "1" });
    recordEvent(db, { eventType: "SETTING_CHANGED", severity: "INFO", source: "settings", entityType: "SETTING", entityId: "publish_mode", message: "2" });
    recordEvent(db, { eventType: "SYSTEM_ERROR", severity: "WARNING", source: "api", message: "3" });
    recordEvent(db, { eventType: "SYSTEM_ERROR", severity: "CRITICAL", source: "api", message: "4" });
  });

  it("returns newest first", () => {
    expect(listEvents(db).map((e) => e.message)).toEqual(["4", "3", "2", "1"]);
  });

  it("filters by minimum severity", () => {
    expect(listEvents(db, { minSeverity: "WARNING" }).map((e) => e.severity)).toEqual(["CRITICAL", "WARNING"]);
    expect(listEvents(db, { minSeverity: "DEBUG" })).toHaveLength(4);
  });

  it("filters by type, entity, and pages with beforeId/limit", () => {
    expect(listEvents(db, { eventType: "SYSTEM_ERROR" })).toHaveLength(2);
    expect(listEvents(db, { entityType: "SETTING", entityId: "publish_mode" }).map((e) => e.message)).toEqual(["2"]);
    const page1 = listEvents(db, { limit: 2 });
    const page2 = listEvents(db, { limit: 2, beforeId: page1.at(-1)?.id ?? 0 });
    expect([...page1, ...page2].map((e) => e.message)).toEqual(["4", "3", "2", "1"]);
  });

  it("accepts query-string values and rejects invalid queries", () => {
    expect(listEvents(db, { limit: "1" as unknown as number })).toHaveLength(1);
    expect(() => listEvents(db, { minSeverity: "LOUD" as never })).toThrow(AppError);
    expect(() => listEvents(db, { limit: 0 })).toThrow(AppError);
  });
});

describe("error logging", () => {
  it("records an AppError as a redacted SYSTEM_ERROR event", () => {
    const error = new AppError("COMFYUI_ERROR", "failed", { details: { apiKey: "x" }, cause: new Error("root") });
    const event = recordError(db, error, "test", { route: "/api/x" });
    expect(event).toMatchObject({ eventType: "SYSTEM_ERROR", severity: "ERROR", source: "test", message: "COMFYUI_ERROR: failed" });
    const logged = event?.metadata.error as Record<string, unknown>;
    expect(logged.details).toEqual({ apiKey: REDACTED });
    expect(logged.cause).toMatchObject({ message: "root" });
    expect(logged.stack).toBeUndefined();
    expect(event?.metadata.route).toBe("/api/x");
  });

  it("never throws when the log itself cannot be written", () => {
    const closed = openDatabase(":memory:");
    closed.close();
    expect(tryRecordEvent(closed, { eventType: "APP_STARTED", source: "app", message: "m" })).toBeNull();
  });
});
