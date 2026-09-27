import { z } from "zod";
import { getJson, type FetchLike, type HealthResult } from "../health";

/**
 * ComfyUI health check only (GET /system_stats). Workflow submission is a later phase.
 */
const systemStatsSchema = z.object({
  system: z
    .object({
      os: z.string().optional(),
      comfyui_version: z.string().optional(),
      python_version: z.string().optional(),
    })
    .loose(),
  devices: z.array(z.object({ name: z.string().optional(), type: z.string().optional() }).loose()).optional(),
});

export async function checkComfyUiHealth(options: {
  url: string;
  timeoutMs: number;
  fetchImpl?: FetchLike;
}): Promise<HealthResult> {
  const checkedAt = new Date().toISOString();
  const result = await getJson(`${options.url}/system_stats`, {
    timeoutMs: options.timeoutMs,
    ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
  });
  const base = { provider: "comfyui", url: options.url, checkedAt };
  if (!result.ok) {
    return { ...base, state: result.state, latencyMs: result.latencyMs, details: {}, error: result.error };
  }
  const parsed = systemStatsSchema.safeParse(result.body);
  if (!parsed.success) {
    return {
      ...base,
      state: "ERROR",
      latencyMs: result.latencyMs,
      details: {},
      error: "Unexpected /system_stats response shape",
    };
  }
  return {
    ...base,
    state: "ONLINE",
    latencyMs: result.latencyMs,
    details: {
      comfyuiVersion: parsed.data.system.comfyui_version ?? null,
      os: parsed.data.system.os ?? null,
      devices: (parsed.data.devices ?? []).map((d) => d.name ?? d.type ?? "unknown"),
    },
    error: null,
  };
}
