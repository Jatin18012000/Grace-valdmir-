import { describe, expect, it } from "vitest";
import { loadConfig } from "@/core/config";
import { checkComfyUiHealth } from "@/core/providers/comfyui/health";
import { createLlmProvider } from "@/core/providers/llm";
import { stubFetch } from "./helpers";

describe("createLlmProvider", () => {
  it("creates the configured provider behind the generic interface", async () => {
    const config = loadConfig({ LMSTUDIO_URL: "http://127.0.0.1:9999" }, "/repo");
    const { fetchImpl, calls } = stubFetch({ "http://127.0.0.1:9999/v1/models": { json: { data: [] } } });
    const provider = createLlmProvider(config, fetchImpl);
    expect(provider.id).toBe("lmstudio");
    expect((await provider.checkHealth()).state).toBe("ONLINE");
    expect(calls[0]?.url).toBe("http://127.0.0.1:9999/v1/models");
  });
});

describe("checkComfyUiHealth", () => {
  const url = "http://127.0.0.1:8188";

  it("reports ONLINE with facts from /system_stats", async () => {
    const { fetchImpl } = stubFetch({
      [`${url}/system_stats`]: { json: { system: { os: "darwin", comfyui_version: "0.18.1" }, devices: [{ name: "mps", type: "mps" }] } },
    });
    const health = await checkComfyUiHealth({ url, timeoutMs: 1000, fetchImpl });
    expect(health.state).toBe("ONLINE");
    expect(health.details).toEqual({ comfyuiVersion: "0.18.1", os: "darwin", devices: ["mps"] });
  });

  it("reports OFFLINE when nothing is listening", async () => {
    const { fetchImpl } = stubFetch({ [`${url}/system_stats`]: "REFUSED" });
    expect((await checkComfyUiHealth({ url, timeoutMs: 1000, fetchImpl })).state).toBe("OFFLINE");
  });

  it("reports ERROR when another service answers on the port", async () => {
    const { fetchImpl } = stubFetch({ [`${url}/system_stats`]: { json: { hello: "world" } } });
    expect((await checkComfyUiHealth({ url, timeoutMs: 1000, fetchImpl })).state).toBe("ERROR");
  });

  it("reports OFFLINE against a real closed port (no stub)", async () => {
    const health = await checkComfyUiHealth({ url: "http://127.0.0.1:9", timeoutMs: 1000 });
    expect(health.state).toBe("OFFLINE");
  });
});
