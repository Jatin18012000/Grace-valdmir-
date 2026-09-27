import path from "node:path";
import { z } from "zod";
import { AppError, type AppErrorOptions } from "../errors";
import {
  SETTING_ENV_VARS,
  SETTING_KEYS,
  isUnattendedValue,
  settingSchemas,
  type Settings,
} from "../settings/definitions";

/**
 * Application configuration, read from environment variables and validated with zod.
 * Invalid configuration fails fast with a readable error instead of misbehaving later.
 */
const httpUrl = z
  .url({ protocol: /^https?$/ })
  .transform((value) => value.replace(/\/+$/, ""));

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

export const configSchema = z.object({
  dbPath: z.string().min(1),
  characterBiblePath: z.string().min(1),
  comfyui: z.object({
    url: httpUrl,
  }),
  llm: z.object({
    provider: z.enum(["lmstudio"]),
    lmstudio: z.object({
      url: httpUrl,
      model: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    }),
  }),
  providerTimeoutMs: z.coerce.number().int().min(100).max(60_000),
  /** Safety lock: FULL autopilot / AUTOMATIC publishing are rejected unless this is true. */
  allowFullAutopilot: z.enum(["true", "false"]).transform((value) => value === "true"),
  /** Initial values for runtime settings, only for keys set in the environment. */
  settingsSeed: z.strictObject({
    autopilot_mode: settingSchemas.autopilot_mode.optional(),
    publish_mode: settingSchemas.publish_mode.optional(),
    comfyui_output_folder: settingSchemas.comfyui_output_folder.optional(),
  }),
});

export type AppConfig = z.infer<typeof configSchema>;

export class ConfigError extends AppError {
  constructor(message: string, options: AppErrorOptions = {}) {
    super("CONFIGURATION_ERROR", message, options);
    this.name = "ConfigError";
  }
}

type Env = Record<string, string | undefined>;

export function loadConfig(env: Env = process.env, cwd: string = process.cwd()): AppConfig {
  const raw = {
    dbPath: path.resolve(cwd, env.GRACE_DB_PATH ?? "./data/grace.db"),
    characterBiblePath: path.resolve(
      cwd,
      env.GRACE_CHARACTER_BIBLE_PATH ?? "./characters/grace/bible.json",
    ),
    comfyui: { url: env.COMFYUI_URL ?? "http://127.0.0.1:8188" },
    llm: {
      provider: env.LLM_PROVIDER ?? "lmstudio",
      lmstudio: {
        url: env.LMSTUDIO_URL ?? "http://127.0.0.1:1234",
        model: env.LMSTUDIO_MODEL,
      },
    },
    providerTimeoutMs: env.PROVIDER_TIMEOUT_MS ?? "3000",
    allowFullAutopilot: (env.ALLOW_FULL_AUTOPILOT ?? "false").trim().toLowerCase(),
    settingsSeed: Object.fromEntries(
      SETTING_KEYS.flatMap((key) => {
        const value = env[SETTING_ENV_VARS[key]];
        return value === undefined || value.trim() === "" ? [] : [[key, value.trim()]];
      }),
    ),
  };

  const result = configSchema.safeParse(raw);
  if (!result.success) {
    throw new ConfigError(`Invalid configuration:\n${z.prettifyError(result.error)}`);
  }
  if (!result.data.allowFullAutopilot) {
    for (const key of SETTING_KEYS) {
      const value = result.data.settingsSeed[key];
      if (value !== undefined && isUnattendedValue(key, value as Settings[typeof key])) {
        throw new ConfigError(
          `${SETTING_ENV_VARS[key]}=${value} is not allowed while ALLOW_FULL_AUTOPILOT is not true.`,
        );
      }
    }
  }
  return result.data;
}

let cached: AppConfig | undefined;

/** Process-wide configuration (loaded once). */
export function getConfig(): AppConfig {
  cached ??= loadConfig();
  return cached;
}
