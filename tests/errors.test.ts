import { describe, expect, it } from "vitest";
import { ConfigError, loadConfig } from "@/core/config";
import { CharacterBibleError, loadCharacterBibleFile } from "@/core/character/load";
import { AppError, ERROR_CODES, REDACTED, isAppError, redact, toAppError } from "@/core/errors";
import { LlmProviderError } from "@/core/providers/llm";
import { LmStudioProvider } from "@/core/providers/llm/lmstudio";
import { stubFetch } from "./helpers";

describe("AppError", () => {
  it("covers every required error category", () => {
    expect(ERROR_CODES).toEqual(
      expect.arrayContaining([
        "CONFIGURATION_ERROR", "DATABASE_ERROR", "VALIDATION_ERROR", "LLM_ERROR", "COMFYUI_ERROR",
        "GENERATION_ERROR", "ASSET_ERROR", "QC_ERROR", "SCHEDULING_ERROR", "PUBLISHING_ERROR", "UNKNOWN_ERROR",
      ]),
    );
  });

  it("separates the safe public message from developer diagnostics", () => {
    const error = new AppError("DATABASE_ERROR", "UNIQUE constraint failed: settings.key", {
      details: { table: "settings" },
      cause: new Error("SQLITE_CONSTRAINT"),
    });
    expect(error.toPublic()).toEqual({ code: "DATABASE_ERROR", message: "A database error occurred." });
    expect(error.httpStatus).toBe(500);
    const log = error.toLog();
    expect(log.message).toContain("UNIQUE constraint");
    expect(log.details).toEqual({ table: "settings" });
    expect(log.cause).toMatchObject({ name: "Error", message: "SQLITE_CONSTRAINT" });
    expect(log.stack).toContain("AppError");
  });

  it("maps codes to HTTP statuses", () => {
    expect(new AppError("VALIDATION_ERROR", "x").httpStatus).toBe(400);
    expect(new AppError("NOT_FOUND", "x").httpStatus).toBe(404);
    expect(new AppError("COMFYUI_ERROR", "x").httpStatus).toBe(502);
  });

  it("preserves a chain of causes, with codes", () => {
    const root = Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" });
    const middle = new TypeError("fetch failed", { cause: root });
    const log = new AppError("COMFYUI_ERROR", "health check failed", { cause: middle }).toLog();
    expect(log.cause?.name).toBe("TypeError");
    expect(log.cause?.cause).toMatchObject({ message: "connect ECONNREFUSED", code: "ECONNREFUSED" });
  });

  it("normalises unknown throwables and keeps the original", () => {
    const original = new RangeError("boom");
    const wrapped = toAppError(original, "GENERATION_ERROR");
    expect(wrapped.code).toBe("GENERATION_ERROR");
    expect(wrapped.cause).toBe(original);
    expect(toAppError("plain string").code).toBe("UNKNOWN_ERROR");
    const existing = new AppError("QC_ERROR", "x");
    expect(toAppError(existing)).toBe(existing);
    expect(isAppError(existing, "QC_ERROR")).toBe(true);
    expect(isAppError(existing, "ASSET_ERROR")).toBe(false);
  });

  it("serialises to JSON without throwing", () => {
    const error = new AppError("PUBLISHING_ERROR", "x", { cause: "not an error object" });
    expect(() => JSON.stringify(error.toLog())).not.toThrow();
  });
});

describe("redaction", () => {
  it("removes secrets from details, nested objects and URLs", () => {
    const log = new AppError("LLM_ERROR", "failed calling http://user:hunter2@127.0.0.1:1234/v1", {
      details: { apiKey: "sk-123", nested: { password: "p", ok: "visible" }, headers: [{ Authorization: "Bearer x" }] },
    }).toLog();
    expect(log.message).toBe(`failed calling http://${REDACTED}@127.0.0.1:1234/v1`);
    expect(log.details).toEqual({
      apiKey: REDACTED,
      nested: { password: REDACTED, ok: "visible" },
      headers: [{ Authorization: REDACTED }],
    });
    expect(JSON.stringify(log)).not.toContain("hunter2");
    expect(JSON.stringify(log)).not.toContain("sk-123");
  });

  it("truncates very long strings", () => {
    expect(String(redact("a".repeat(5000))).length).toBeLessThan(2100);
  });
});

describe("existing errors are AppErrors with categories", () => {
  it("ConfigError is CONFIGURATION_ERROR", () => {
    try {
      loadConfig({ COMFYUI_URL: "nope" }, "/repo");
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      expect(isAppError(error, "CONFIGURATION_ERROR")).toBe(true);
    }
  });

  it("CharacterBibleError is VALIDATION_ERROR and keeps the cause", () => {
    try {
      loadCharacterBibleFile("/does/not/exist.json");
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(CharacterBibleError);
      expect(isAppError(error, "VALIDATION_ERROR")).toBe(true);
      expect((error as AppError).cause).toBeInstanceOf(Error);
      expect((error as AppError).details).toEqual({ filePath: "/does/not/exist.json" });
    }
  });

  it("LlmProviderError is LLM_ERROR and keeps the network cause", async () => {
    const { fetchImpl } = stubFetch({ "http://127.0.0.1:1234/v1/chat/completions": "REFUSED" });
    const provider = new LmStudioProvider({ url: "http://127.0.0.1:1234", model: "m", timeoutMs: 1000, fetchImpl });
    const error = await provider.chat({ messages: [] }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(LlmProviderError);
    expect(isAppError(error, "LLM_ERROR")).toBe(true);
    expect((error as AppError).details).toEqual({ provider: "lmstudio" });
    expect((error as AppError).toLog().cause?.cause?.message).toContain("ECONNREFUSED");
  });
});
