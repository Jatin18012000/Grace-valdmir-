import { z } from "zod";
import type { Db } from "../db";
import { AppError } from "../errors";
import { recordEvent } from "../events";
import {
  SETTING_DEFAULTS,
  SETTING_ENV_VARS,
  SETTING_KEYS,
  isUnattendedValue,
  settingSchemas,
  type SettingKey,
  type Settings,
} from "./definitions";

export * from "./definitions";

/**
 * Settings service: the only code that reads or writes the `settings` table.
 *
 * Precedence: a value stored in SQLite always wins. Environment variables only seed a key the
 * first time it is created; after that, changes go through updateSetting().
 */
export type SettingSource = "DEFAULT" | "ENV" | "USER";

export interface SettingRecord<K extends SettingKey = SettingKey> {
  key: K;
  value: Settings[K];
  source: SettingSource;
  createdAt: string;
  updatedAt: string;
}

interface SettingRow {
  key: string;
  value_json: string;
  source: SettingSource;
  created_at: string;
  updated_at: string;
}

export interface SettingsPolicy {
  /** From config ALLOW_FULL_AUTOPILOT. When false, FULL / AUTOMATIC values are rejected. */
  allowFullAutopilot: boolean;
}

/**
 * Creates any missing settings (env seed if given, else default). Existing values are never
 * overwritten. Returns the keys that were created.
 */
export type SettingsSeed = { [K in SettingKey]?: Settings[K] | undefined };

export function initializeSettings(
  db: Db,
  seed: SettingsSeed,
  policy: SettingsPolicy,
  now = new Date(),
): SettingKey[] {
  const timestamp = now.toISOString();
  const existing = new Set(
    (db.prepare("SELECT key FROM settings").all() as Array<{ key: string }>).map((row) => row.key),
  );
  const created: Array<{ key: SettingKey; source: SettingSource; value: unknown }> = [];

  db.transaction(() => {
    for (const key of SETTING_KEYS) {
      if (existing.has(key)) continue;
      const fromEnv = seed[key] !== undefined;
      const value = validateValue(key, fromEnv ? seed[key] : SETTING_DEFAULTS[key], policy);
      const source: SettingSource = fromEnv ? "ENV" : "DEFAULT";
      db.prepare(
        "INSERT INTO settings (key, value_json, source, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      ).run(key, JSON.stringify(value), source, timestamp, timestamp);
      created.push({ key, source, value });
    }
    if (created.length > 0) {
      recordEvent(db, {
        eventType: "SETTINGS_INITIALIZED",
        source: "settings",
        entityType: "SYSTEM",
        entityId: "settings",
        message: `Initialised settings: ${created.map((c) => `${c.key} (${c.source})`).join(", ")}`,
        metadata: { created },
        occurredAt: now,
      });
    }
  })();
  return created.map((c) => c.key);
}

export function getSetting<K extends SettingKey>(db: Db, key: K): SettingRecord<K> {
  const row = db.prepare("SELECT * FROM settings WHERE key = ?").get(key) as SettingRow | undefined;
  if (!row) {
    throw new AppError("CONFIGURATION_ERROR", `Setting "${key}" has not been initialised`, {
      details: { key },
    });
  }
  return toRecord(key, row);
}

export function getAllSettings(db: Db): { [K in SettingKey]: SettingRecord<K> } {
  return Object.fromEntries(SETTING_KEYS.map((key) => [key, getSetting(db, key)])) as {
    [K in SettingKey]: SettingRecord<K>;
  };
}

/** Plain values, for code that only needs the current settings. */
export function getSettingValues(db: Db): Settings {
  return Object.fromEntries(SETTING_KEYS.map((key) => [key, getSetting(db, key).value])) as Settings;
}

/** Updates a setting after validation and records a SETTING_CHANGED event with old and new values. */
export function updateSetting<K extends SettingKey>(
  db: Db,
  key: K,
  value: unknown,
  policy: SettingsPolicy,
  actor = "user",
  now = new Date(),
): SettingRecord<K> {
  const validated = validateValue(key, value, policy);
  const timestamp = now.toISOString();
  return db.transaction(() => {
    const previous = getSetting(db, key);
    db.prepare("UPDATE settings SET value_json = ?, source = 'USER', updated_at = ? WHERE key = ?").run(
      JSON.stringify(validated),
      timestamp,
      key,
    );
    recordEvent(db, {
      eventType: "SETTING_CHANGED",
      source: "settings",
      entityType: "SETTING",
      entityId: key,
      message: `${key} changed from ${JSON.stringify(previous.value)} to ${JSON.stringify(validated)}`,
      metadata: { key, previous: previous.value, next: validated, actor },
      occurredAt: now,
    });
    return getSetting(db, key);
  })();
}

export function isSettingKey(key: string): key is SettingKey {
  return (SETTING_KEYS as string[]).includes(key);
}

function validateValue<K extends SettingKey>(key: K, value: unknown, policy: SettingsPolicy): Settings[K] {
  const result = settingSchemas[key].safeParse(value);
  if (!result.success) {
    throw new AppError("VALIDATION_ERROR", `Invalid value for setting "${key}": ${z.prettifyError(result.error)}`, {
      userMessage: `Invalid value for ${key}.`,
      details: { key, envVar: SETTING_ENV_VARS[key] },
    });
  }
  const parsed = result.data as Settings[K];
  if (!policy.allowFullAutopilot && isUnattendedValue(key, parsed)) {
    throw new AppError("VALIDATION_ERROR", `"${key}" = ${String(parsed)} is blocked: ALLOW_FULL_AUTOPILOT is not true`, {
      userMessage: `${String(parsed)} is disabled. Full autopilot needs explicit approval.`,
      details: { key },
    });
  }
  return parsed;
}

function toRecord<K extends SettingKey>(key: K, row: SettingRow): SettingRecord<K> {
  // Stored values are re-validated; a corrupted row is reported, not silently used.
  const result = settingSchemas[key].safeParse(JSON.parse(row.value_json));
  if (!result.success) {
    throw new AppError("DATABASE_ERROR", `Stored value for setting "${key}" is invalid`, { details: { key } });
  }
  return {
    key,
    value: result.data as Settings[K],
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
