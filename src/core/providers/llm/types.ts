import type { HealthResult } from "../health";

/**
 * Provider-neutral LLM interface. The content engine depends only on this,
 * never on a concrete provider such as LM Studio.
 */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  /** Overrides the configured default model. */
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatResponse {
  provider: string;
  model: string;
  content: string;
}

export interface LlmModel {
  id: string;
}

export interface LlmProvider {
  readonly id: string;
  checkHealth(): Promise<HealthResult>;
  listModels(): Promise<LlmModel[]>;
  chat(request: ChatRequest): Promise<ChatResponse>;
}

export class LlmProviderError extends Error {
  constructor(
    readonly provider: string,
    message: string,
  ) {
    super(`[${provider}] ${message}`);
    this.name = "LlmProviderError";
  }
}
