import path from "node:path";
import { z } from "zod";

/**
 * Runtime settings: the single definition of each setting's key, type and default.
 * Used by config (to validate environment seeds) and by the settings service.
 */
export const AUTOPILOT_MODES = ["ASSISTED", "SUPERVISED", "FULL"] as const;
export const PUBLISH_MODES = ["MANUAL", "AUTOMATIC"] as const;
export type AutopilotMode = (typeof AUTOPILOT_MODES)[number];
export type PublishMode = (typeof PUBLISH_MODES)[number];

export const settingSchemas = {
  autopilot_mode: z.enum(AUTOPILOT_MODES),
  publish_mode: z.enum(PUBLISH_MODES),
  comfyui_output_folder: z
    .string()
    .trim()
    .min(1)
    .refine((value) => path.isAbsolute(value), "Must be an absolute path"),
} as const;

export type SettingKey = keyof typeof settingSchemas;
export type Settings = { [K in SettingKey]: z.infer<(typeof settingSchemas)[K]> };
export const SETTING_KEYS = Object.keys(settingSchemas) as SettingKey[];

export const SETTING_DEFAULTS: Settings = {
  autopilot_mode: "ASSISTED",
  publish_mode: "MANUAL",
  // Jatin's Mac. Not assumed to exist on other machines; override with COMFYUI_OUTPUT_FOLDER.
  comfyui_output_folder: "/Users/jatinpal/ComfyUI/output/",
};

/** Environment variable that seeds each setting on first start. */
export const SETTING_ENV_VARS: Record<SettingKey, string> = {
  autopilot_mode: "AUTOPILOT_MODE",
  publish_mode: "PUBLISH_MODE",
  comfyui_output_folder: "COMFYUI_OUTPUT_FOLDER",
};

/**
 * Values that remove the human from publishing. They are rejected unless full autopilot has
 * been explicitly allowed (ALLOW_FULL_AUTOPILOT=true), which must not happen during development.
 */
export function isUnattendedValue<K extends SettingKey>(key: K, value: Settings[K]): boolean {
  return (key === "autopilot_mode" && value === "FULL") || (key === "publish_mode" && value === "AUTOMATIC");
}
