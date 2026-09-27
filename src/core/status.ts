import "server-only";
import { existsSync, statSync } from "node:fs";
import { getAppContext } from "./app-context";
import { checkComfyUiHealth } from "./providers/comfyui/health";
import type { HealthResult } from "./providers/health";
import { createLlmProvider } from "./providers/llm";
import { listEvents, type LoggedEvent } from "./events";
import { getAllSettings, type SettingRecord, type SettingKey } from "./settings";

export interface SystemStatus {
  checkedAt: string;
  database: {
    path: string;
    migrations: Array<{ id: number; name: string; appliedAt: string }>;
    characterCount: number;
  };
  characterBible: ReturnType<typeof getAppContext>["bibleSync"];
  comfyui: HealthResult;
  llm: HealthResult;
  settings: { [K in SettingKey]: SettingRecord<K> };
  /** Real check of the configured ComfyUI output folder on this machine. */
  outputFolder: { path: string; exists: boolean; isDirectory: boolean };
  recentEvents: LoggedEvent[];
}

/** Live system status. Every provider value comes from a real request made now. */
export async function getSystemStatus(): Promise<SystemStatus> {
  const { config, db, migrations, bibleSync } = getAppContext();
  const [comfyui, llm] = await Promise.all([
    checkComfyUiHealth({ url: config.comfyui.url, timeoutMs: config.providerTimeoutMs }),
    createLlmProvider(config).checkHealth(),
  ]);
  const settings = getAllSettings(db);
  const outputPath = settings.comfyui_output_folder.value;
  const { count } = db.prepare("SELECT COUNT(*) AS count FROM characters").get() as { count: number };
  return {
    checkedAt: new Date().toISOString(),
    database: {
      path: config.dbPath,
      migrations: migrations.map((m) => ({ id: m.id, name: m.name, appliedAt: m.applied_at })),
      characterCount: count,
    },
    characterBible: bibleSync,
    comfyui,
    llm,
    settings,
    outputFolder: {
      path: outputPath,
      exists: existsSync(outputPath),
      isDirectory: existsSync(outputPath) && statSync(outputPath).isDirectory(),
    },
    recentEvents: listEvents(db, { limit: 10 }),
  };
}
