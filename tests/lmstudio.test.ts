import { describe, expect, it } from "vitest";
import { LmStudioProvider } from "@/core/providers/llm/lmstudio";
import { LlmProviderError } from "@/core/providers/llm";
import { stubFetch } from "./helpers";

const URL_BASE = "http://127.0.0.1:1234";

describe("LmStudioProvider.checkHealth", () => {
  it("reports ONLINE with the models LM Studio returned", async () => {
    const { fetchImpl } = stubFetch({ [`${URL_BASE}/v1/models`]: { json: { data: [{ id: "model-a" }, { id: "model-b" }] } } });
    const health = await new LmStudioProvider({ url: URL_BASE, model: "model-b", timeoutMs: 1000, fetchImpl }).checkHealth();
    expect(health.state).toBe("ONLINE");
    expect(health.details).toEqual({ models: ["model-a", "model-b"], configuredModel: "model-b", configuredModelAvailable: true });
    expect(health.error).toBeNull();
  });

  it("flags a configured model that is not loaded", async () => {
    const { fetchImpl } = stubFetch({ [`${URL_BASE}/v1/models`]: { json: { data: [{ id: "model-a" }] } } });
    const health = await new LmStudioProvider({ url: URL_BASE, model: "missing", timeoutMs: 1000, fetchImpl }).checkHealth();
    expect(health.details.configuredModelAvailable).toBe(false);
  });

  it("reports OFFLINE when the connection is refused", async () => {
    const { fetchImpl } = stubFetch({ [`${URL_BASE}/v1/models`]: "REFUSED" });
    const health = await new LmStudioProvider({ url: URL_BASE, timeoutMs: 1000, fetchImpl }).checkHealth();
    expect(health.state).toBe("OFFLINE");
    expect(health.error).toContain("ECONNREFUSED");
  });

  it("reports ERROR on a bad status or unexpected payload", async () => {
    const bad = stubFetch({ [`${URL_BASE}/v1/models`]: { status: 500, json: {} } });
    expect((await new LmStudioProvider({ url: URL_BASE, timeoutMs: 1000, fetchImpl: bad.fetchImpl }).checkHealth()).state).toBe("ERROR");
    const shape = stubFetch({ [`${URL_BASE}/v1/models`]: { json: { models: [] } } });
    expect((await new LmStudioProvider({ url: URL_BASE, timeoutMs: 1000, fetchImpl: shape.fetchImpl }).checkHealth()).state).toBe("ERROR");
  });
});

describe("LmStudioProvider.chat", () => {
  it("sends an OpenAI-compatible request and returns the content", async () => {
    const { fetchImpl, calls } = stubFetch({
      [`${URL_BASE}/v1/chat/completions`]: { json: { model: "model-a", choices: [{ message: { content: "hello" } }] } },
    });
    const provider = new LmStudioProvider({ url: URL_BASE, model: "model-a", timeoutMs: 1000, fetchImpl });
    const response = await provider.chat({ messages: [{ role: "user", content: "hi" }], temperature: 0.2 });
    expect(response).toEqual({ provider: "lmstudio", model: "model-a", content: "hello" });
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({
      model: "model-a",
      messages: [{ role: "user", content: "hi" }],
      stream: false,
      temperature: 0.2,
    });
  });

  it("refuses to chat without a model", async () => {
    const provider = new LmStudioProvider({ url: URL_BASE, timeoutMs: 1000 });
    await expect(provider.chat({ messages: [] })).rejects.toThrow(/No model configured/);
  });

  it("throws a provider error on HTTP failure or refused connection", async () => {
    const failing = stubFetch({ [`${URL_BASE}/v1/chat/completions`]: { status: 400, text: "bad request" } });
    await expect(
      new LmStudioProvider({ url: URL_BASE, model: "m", timeoutMs: 1000, fetchImpl: failing.fetchImpl }).chat({ messages: [] }),
    ).rejects.toThrow(LlmProviderError);
    const refused = stubFetch({ [`${URL_BASE}/v1/chat/completions`]: "REFUSED" });
    await expect(
      new LmStudioProvider({ url: URL_BASE, model: "m", timeoutMs: 1000, fetchImpl: refused.fetchImpl }).chat({ messages: [] }),
    ).rejects.toThrow(/Request failed/);
  });
});
