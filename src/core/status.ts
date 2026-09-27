import "server-only";
import { getAppContext } from "./app-context";
import { checkComfyUiHealth } from "./providers/comfyui/health";
import type { HealthResult } from "./providers/health";
import { createLlmProvider } from "./providers/llm";

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
}

/** Live system status. Every provider value comes from a real request made now. */
export async function getSystemStatus(): Promise<SystemStatus> {
  const { config, db, migrations, bibleSync } = getAppContext();
  const [comfyui, llm] = await Promise.all([
    checkComfyUiHealth({ url: config.comfyui.url, timeoutMs: config.providerTimeoutMs }),
    createLlmProvider(config).checkHealth(),
  ]);
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
  };
}
