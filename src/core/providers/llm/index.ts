import type { AppConfig } from "../../config";
import type { FetchLike } from "../health";
import { LmStudioProvider } from "./lmstudio";
import type { LlmProvider } from "./types";

export type { ChatMessage, ChatRequest, ChatResponse, LlmModel, LlmProvider } from "./types";
export { LlmProviderError } from "./types";

/**
 * Creates the configured LLM provider. To add a provider: implement LlmProvider,
 * add its id to the config enum, and add a case here. Callers do not change.
 */
export function createLlmProvider(config: AppConfig, fetchImpl?: FetchLike): LlmProvider {
  switch (config.llm.provider) {
    case "lmstudio":
      return new LmStudioProvider({
        url: config.llm.lmstudio.url,
        model: config.llm.lmstudio.model,
        timeoutMs: config.providerTimeoutMs,
        ...(fetchImpl ? { fetchImpl } : {}),
      });
  }
}
