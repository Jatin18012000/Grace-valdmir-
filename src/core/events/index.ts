import { z } from "zod";
import type { Db } from "../db";
import { AppError, redact, toAppError } from "../errors";

/**
 * Structured event log (table `event_log`).
 *
 * Event types, severities and entity types are closed lists. Pipeline event types are defined
 * now so later phases share one vocabulary; Phase 1 only emits the SYSTEM ones.
 */
export const PIPELINE_EVENT_TYPES = [
  "IDEA_CREATED",
  "BRIEF_CREATED",
  "PROMPT_CREATED",
  "GENERATION_QUEUED",
  "GENERATION_STARTED",
  "GENERATION_COMPLETED",
  "GENERATION_FAILED",
  "ASSET_DETECTED",
  "ASSET_INGESTED",
  "QC_STARTED",
  "QC_PASSED",
  "QC_REVIEW",
  "QC_FAILED",
  "CAPTION_CREATED",
  "PUBLISHING_QUEUED",
  "PUBLISHING_STARTED",
  "PUBLISHED",
  "PUBLISH_FAILED",
] as const;

export const SYSTEM_EVENT_TYPES = [
  "APP_STARTED",
  "MIGRATION_APPLIED",
  "SETTINGS_INITIALIZED",
  "SETTING_CHANGED",
  "CHARACTER_BIBLE_SYNCED",
  "CHARACTER_BIBLE_INVALID",
  "SYSTEM_ERROR",
] as const;

export const EVENT_TYPES = [...PIPELINE_EVENT_TYPES, ...SYSTEM_EVENT_TYPES] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const SEVERITIES = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const ENTITY_TYPES = [
  "SYSTEM",
  "SETTING",
  "CHARACTER",
  "IDEA",
  "BRIEF",
  "PROMPT",
  "GENERATION_JOB",
  "ASSET",
  "QC_RESULT",
  "CAPTION",
  "PUBLISHING_JOB",
] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

const eventInputSchema = z
  .strictObject({
    eventType: z.enum(EVENT_TYPES),
    severity: z.enum(SEVERITIES).default("INFO"),
    /** Module that emitted the event, e.g. "settings" or "app". */
    source: z.string().trim().min(1).max(100),
    entityType: z.enum(ENTITY_TYPES).optional(),
    entityId: z.string().trim().min(1).max(200).optional(),
    message: z.string().trim().min(1).max(2000),
    metadata: z.record(z.string(), z.unknown()).default({}),
    /** When the event happened. Defaults to now. */
    occurredAt: z.date().optional(),
  })
  .refine((e) => (e.entityType === undefined) === (e.entityId === undefined), {
    message: "entityType and entityId must be given together",
    path: ["entityId"],
  });

export type EventInput = z.input<typeof eventInputSchema>;

export interface LoggedEvent {
  id: number;
  occurredAt: string;
  eventType: EventType;
  severity: Severity;
  source: string;
  entityType: EntityType | null;
  entityId: string | null;
  message: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

interface EventRow {
  id: number;
  occurred_at: string;
  event_type: EventType;
  severity: Severity;
  source: string;
  entity_type: EntityType | null;
  entity_id: string | null;
  message: string;
  metadata_json: string;
  created_at: string;
}

/** Records an event. Metadata is redacted (secrets) and must be JSON-serialisable. */
export function recordEvent(db: Db, input: EventInput): LoggedEvent {
  const parsed = eventInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", `Invalid event: ${z.prettifyError(parsed.error)}`);
  }
  const event = parsed.data;
  let metadataJson: string;
  try {
    metadataJson = JSON.stringify(redact(event.metadata));
  } catch (error) {
    throw new AppError("VALIDATION_ERROR", "Event metadata is not JSON-serialisable", { cause: error });
  }
  const now = new Date().toISOString();
  try {
    const row = db
      .prepare(
        `INSERT INTO event_log
           (occurred_at, event_type, severity, source, entity_type, entity_id, message, metadata_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         RETURNING *`,
      )
      .get(
        (event.occurredAt ?? new Date()).toISOString(),
        event.eventType,
        event.severity,
        event.source,
        event.entityType ?? null,
        event.entityId ?? null,
        event.message,
        metadataJson,
        now,
      ) as EventRow;
    return toEvent(row);
  } catch (error) {
    throw new AppError("DATABASE_ERROR", "Failed to write event_log row", {
      cause: error,
      details: { eventType: event.eventType },
    });
  }
}

/**
 * Records an event without ever throwing. For use inside error handlers, where a failure to log
 * must not hide the original error. Returns null if the event could not be written.
 */
export function tryRecordEvent(db: Db, input: EventInput): LoggedEvent | null {
  try {
    return recordEvent(db, input);
  } catch (error) {
    console.error(JSON.stringify({ level: "ERROR", msg: "event_log write failed", error: toAppError(error).toLog() }));
    return null;
  }
}

/** Records an AppError as a SYSTEM_ERROR event with its redacted diagnostics. */
export function recordError(db: Db, error: unknown, source: string, context: Record<string, unknown> = {}): LoggedEvent | null {
  const appError = toAppError(error);
  const log = appError.toLog();
  return tryRecordEvent(db, {
    eventType: "SYSTEM_ERROR",
    severity: "ERROR",
    source,
    message: `${appError.code}: ${log.message}`.slice(0, 2000),
    metadata: { ...context, error: { ...log, stack: undefined } },
  });
}

export const eventQuerySchema = z.strictObject({
  eventType: z.enum(EVENT_TYPES).optional(),
  /** Minimum severity (inclusive). */
  minSeverity: z.enum(SEVERITIES).optional(),
  entityType: z.enum(ENTITY_TYPES).optional(),
  entityId: z.string().min(1).optional(),
  /** Return events with id lower than this (for paging back in time). */
  beforeId: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(50),
});
export type EventQuery = z.input<typeof eventQuerySchema>;

/** Newest first. */
export function listEvents(db: Db, query: EventQuery = {}): LoggedEvent[] {
  const parsed = eventQuerySchema.safeParse(query);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", `Invalid event query: ${z.prettifyError(parsed.error)}`);
  }
  const q = parsed.data;
  const where: string[] = [];
  const params: Array<string | number> = [];
  if (q.eventType) {
    where.push("event_type = ?");
    params.push(q.eventType);
  }
  if (q.minSeverity) {
    const allowed = SEVERITIES.slice(SEVERITIES.indexOf(q.minSeverity));
    where.push(`severity IN (${allowed.map(() => "?").join(", ")})`);
    params.push(...allowed);
  }
  if (q.entityType) {
    where.push("entity_type = ?");
    params.push(q.entityType);
  }
  if (q.entityId) {
    where.push("entity_id = ?");
    params.push(q.entityId);
  }
  if (q.beforeId) {
    where.push("id < ?");
    params.push(q.beforeId);
  }
  const sql = `SELECT * FROM event_log ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY id DESC LIMIT ?`;
  return (db.prepare(sql).all(...params, q.limit) as EventRow[]).map(toEvent);
}

function toEvent(row: EventRow): LoggedEvent {
  return {
    id: row.id,
    occurredAt: row.occurred_at,
    eventType: row.event_type,
    severity: row.severity,
    source: row.source,
    entityType: row.entity_type,
    entityId: row.entity_id,
    message: row.message,
    metadata: JSON.parse(row.metadata_json) as Record<string, unknown>,
    createdAt: row.created_at,
  };
}
