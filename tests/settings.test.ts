import { beforeEach, describe, expect, it } from "vitest";
import { ConfigError, loadConfig } from "@/core/config";
import { migrate, openDatabase, type Db } from "@/core/db";
import { AppError } from "@/core/errors";
import { listEvents } from "@/core/events";
import {
  SETTING_DEFAULTS,
  getAllSettings,
  getSetting,
  getSettingValues,
  initializeSettings,
  isSettingKey,
  updateSetting,
} from "@/core/settings";

const locked = { allowFullAutopilot: false };
let db: Db;
beforeEach(() => {
  db = openDatabase(":memory:");
  migrate(db);
});

describe("default settings", () => {
  it("are ASSISTED / MANUAL / Jatin's output folder", () => {
    expect(SETTING_DEFAULTS).toEqual({
      autopilot_mode: "ASSISTED",
      publish_mode: "MANUAL",
      comfyui_output_folder: "/Users/jatinpal/ComfyUI/output/",
    });
  });

  it("are created on first initialisation with source DEFAULT and an event", () => {
    expect(initializeSettings(db, {}, locked)).toEqual(["autopilot_mode", "publish_mode", "comfyui_output_folder"]);
    expect(getSettingValues(db)).toEqual(SETTING_DEFAULTS);
    expect(Object.values(getAllSettings(db)).every((s) => s.source === "DEFAULT")).toBe(true);
    expect(listEvents(db, { eventType: "SETTINGS_INITIALIZED" })).toHaveLength(1);
  });
});

describe("environment-to-settings initialisation", () => {
  it("seeds from config values parsed from the environment", () => {
    const config = loadConfig({ AUTOPILOT_MODE: "SUPERVISED", COMFYUI_OUTPUT_FOLDER: "/tmp/comfy-out" }, "/repo");
    initializeSettings(db, config.settingsSeed, { allowFullAutopilot: config.allowFullAutopilot });
    expect(getSetting(db, "autopilot_mode")).toMatchObject({ value: "SUPERVISED", source: "ENV" });
    expect(getSetting(db, "comfyui_output_folder")).toMatchObject({ value: "/tmp/comfy-out", source: "ENV" });
    expect(getSetting(db, "publish_mode")).toMatchObject({ value: "MANUAL", source: "DEFAULT" });
  });

  it("never overwrites a stored value on later starts", () => {
    initializeSettings(db, {}, locked);
    updateSetting(db, "autopilot_mode", "SUPERVISED", locked);
    expect(initializeSettings(db, { autopilot_mode: "ASSISTED" }, locked)).toEqual([]);
    expect(getSetting(db, "autopilot_mode")).toMatchObject({ value: "SUPERVISED", source: "USER" });
  });

  it("ignores empty environment values", () => {
    expect(loadConfig({ AUTOPILOT_MODE: " ", PUBLISH_MODE: "" }, "/repo").settingsSeed).toEqual({});
  });

  it.each([
    [{ AUTOPILOT_MODE: "TURBO" }],
    [{ PUBLISH_MODE: "SOMETIMES" }],
    [{ COMFYUI_OUTPUT_FOLDER: "relative/output" }],
    [{ AUTOPILOT_MODE: "FULL" }],
    [{ PUBLISH_MODE: "AUTOMATIC" }],
    [{ ALLOW_FULL_AUTOPILOT: "yes" }],
  ])("rejects invalid or unsafe environment %o", (env) => {
    expect(() => loadConfig(env, "/repo")).toThrow(ConfigError);
  });

  it("accepts FULL only when explicitly allowed", () => {
    const config = loadConfig({ AUTOPILOT_MODE: "FULL", ALLOW_FULL_AUTOPILOT: "true" }, "/repo");
    expect(config.allowFullAutopilot).toBe(true);
    expect(config.settingsSeed.autopilot_mode).toBe("FULL");
  });
});

describe("updateSetting", () => {
  beforeEach(() => {
    initializeSettings(db, {}, locked);
  });

  it("updates, marks source USER and records old and new values", () => {
    const updated = updateSetting(db, "comfyui_output_folder", "/Volumes/Data/comfy/output", locked, "test");
    expect(updated).toMatchObject({ value: "/Volumes/Data/comfy/output", source: "USER" });
    const [event] = listEvents(db, { eventType: "SETTING_CHANGED" });
    expect(event).toMatchObject({ entityType: "SETTING", entityId: "comfyui_output_folder" });
    expect(event?.metadata).toEqual({
      key: "comfyui_output_folder",
      previous: "/Users/jatinpal/ComfyUI/output/",
      next: "/Volumes/Data/comfy/output",
      actor: "test",
    });
  });

  it.each([
    ["autopilot_mode", "TURBO"],
    ["publish_mode", 1],
    ["comfyui_output_folder", ""],
    ["comfyui_output_folder", "relative/path"],
  ] as const)("rejects invalid value %s=%o and changes nothing", (key, value) => {
    expect(() => updateSetting(db, key, value, locked)).toThrow(AppError);
    expect(getSetting(db, key).source).toBe("DEFAULT");
    expect(listEvents(db, { eventType: "SETTING_CHANGED" })).toHaveLength(0);
  });

  it("blocks FULL autopilot and AUTOMATIC publishing unless allowed", () => {
    expect(() => updateSetting(db, "autopilot_mode", "FULL", locked)).toThrow(/ALLOW_FULL_AUTOPILOT/);
    expect(() => updateSetting(db, "publish_mode", "AUTOMATIC", locked)).toThrow(/ALLOW_FULL_AUTOPILOT/);
    expect(getSettingValues(db)).toMatchObject({ autopilot_mode: "ASSISTED", publish_mode: "MANUAL" });
    expect(updateSetting(db, "autopilot_mode", "FULL", { allowFullAutopilot: true }).value).toBe("FULL");
  });

  it("reports an uninitialised setting and knows its keys", () => {
    const empty = openDatabase(":memory:");
    migrate(empty);
    expect(() => getSetting(empty, "publish_mode")).toThrow(/not been initialised/);
    expect(isSettingKey("publish_mode")).toBe(true);
    expect(isSettingKey("theme")).toBe(false);
  });

  it("detects a corrupted stored value", () => {
    db.prepare("UPDATE settings SET value_json = ? WHERE key = 'autopilot_mode'").run(JSON.stringify("TURBO"));
    expect(() => getSetting(db, "autopilot_mode")).toThrow(/Stored value/);
  });
});
