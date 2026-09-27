import path from "node:path";
import { describe, expect, it } from "vitest";
import { ConfigError, loadConfig } from "@/core/config";

describe("loadConfig", () => {
  it("applies local defaults", () => {
    const config = loadConfig({}, "/repo");
    expect(config.dbPath).toBe(path.resolve("/repo/data/grace.db"));
    expect(config.comfyui.url).toBe("http://127.0.0.1:8188");
    expect(config.llm).toEqual({ provider: "lmstudio", lmstudio: { url: "http://127.0.0.1:1234", model: undefined } });
    expect(config.providerTimeoutMs).toBe(3000);
  });

  it("reads environment overrides and strips trailing slashes", () => {
    const config = loadConfig(
      { COMFYUI_URL: "http://127.0.0.1:8000/", LMSTUDIO_URL: "http://localhost:1235", LMSTUDIO_MODEL: "some-model", PROVIDER_TIMEOUT_MS: "500" },
      "/repo",
    );
    expect(config.comfyui.url).toBe("http://127.0.0.1:8000");
    expect(config.llm.lmstudio).toEqual({ url: "http://localhost:1235", model: "some-model" });
    expect(config.providerTimeoutMs).toBe(500);
  });

  it("treats an empty model as not configured", () => {
    expect(loadConfig({ LMSTUDIO_MODEL: "  " }, "/repo").llm.lmstudio.model).toBeUndefined();
  });

  it.each([
    [{ COMFYUI_URL: "not a url" }],
    [{ LMSTUDIO_URL: "ftp://127.0.0.1" }],
    [{ LLM_PROVIDER: "ollama" }],
    [{ PROVIDER_TIMEOUT_MS: "abc" }],
    [{ PROVIDER_TIMEOUT_MS: "10" }],
  ])("rejects invalid configuration %o", (env) => {
    expect(() => loadConfig(env, "/repo")).toThrow(ConfigError);
  });
});
