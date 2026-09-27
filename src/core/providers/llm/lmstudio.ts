import { z } from "zod";
import { describeError, getJson, type FetchLike, type HealthResult } from "../health";
import {
  LlmProviderError,
  type ChatRequest,
  type ChatResponse,
  type LlmModel,
  type LlmProvider,
} from "./types";

/**
 * LM Studio provider, using LM Studio's OpenAI-compatible local server
 * (GET /v1/models, POST /v1/chat/completions).
 */
export interface LmStudioOptions {
  url: string;
  model?: string | undefined;
  timeoutMs: number;
  fetchImpl?: FetchLike;
}

const modelsResponseSchema = z.object({
  data: z.array(z.object({ id: z.string().min(1) })),
});

const chatResponseSchema = z.object({
  model: z.string().optional(),
  choices: z
    .array(z.object({ message: z.object({ content: z.string().nullable() }) }))
    .min(1),
});

export class LmStudioProvider implements LlmProvider {
  readonly id = "lmstudio";

  constructor(private readonly options: LmStudioOptions) {}

  async checkHealth(): Promise<HealthResult> {
    const url = `${this.options.url}/v1/models`;
    const checkedAt = new Date().toISOString();
    const result = await getJson(url, this.httpOptions());
    if (!result.ok) {
      return this.health(result.state, checkedAt, result.latencyMs, {}, result.error);
    }
    const parsed = modelsResponseSchema.safeParse(result.body);
    if (!parsed.success) {
      return this.health("ERROR", checkedAt, result.latencyMs, {}, "Unexpected /v1/models response shape");
    }
    const models = parsed.data.data.map((m) => m.id);
    const configured = this.options.model ?? null;
    return this.health("ONLINE", checkedAt, result.latencyMs, {
      models,
      configuredModel: configured,
      configuredModelAvailable: configured === null ? null : models.includes(configured),
    }, null);
  }

  async listModels(): Promise<LlmModel[]> {
    const result = await getJson(`${this.options.url}/v1/models`, this.httpOptions());
    if (!result.ok) throw new LlmProviderError(this.id, `Cannot list models: ${result.error}`);
    const parsed = modelsResponseSchema.safeParse(result.body);
    if (!parsed.success) throw new LlmProviderError(this.id, "Unexpected /v1/models response shape");
    return parsed.data.data.map((m) => ({ id: m.id }));
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const model = request.model ?? this.options.model;
    if (!model) {
      throw new LlmProviderError(this.id, "No model configured. Set LMSTUDIO_MODEL or pass request.model.");
    }
    const fetchImpl = this.options.fetchImpl ?? fetch;
    const body: Record<string, unknown> = { model, messages: request.messages, stream: false };
    if (request.temperature !== undefined) body.temperature = request.temperature;
    if (request.maxTokens !== undefined) body.max_tokens = request.maxTokens;

    let response: Response;
    try {
      response = await fetchImpl(`${this.options.url}/v1/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(body),
        // Generation is slower than a health check; allow 20x the health timeout.
        signal: AbortSignal.timeout(this.options.timeoutMs * 20),
        cache: "no-store",
      });
    } catch (error) {
      throw new LlmProviderError(this.id, `Request failed: ${describeError(error)}`);
    }
    if (!response.ok) {
      throw new LlmProviderError(this.id, `HTTP ${response.status}: ${await safeText(response)}`);
    }
    const parsed = chatResponseSchema.safeParse(await response.json().catch(() => null));
    if (!parsed.success) throw new LlmProviderError(this.id, "Unexpected chat completion response shape");
    const content = parsed.data.choices[0]?.message.content;
    if (content == null) throw new LlmProviderError(this.id, "Chat completion returned no content");
    return { provider: this.id, model: parsed.data.model ?? model, content };
  }

  private httpOptions() {
    return this.options.fetchImpl
      ? { timeoutMs: this.options.timeoutMs, fetchImpl: this.options.fetchImpl }
      : { timeoutMs: this.options.timeoutMs };
  }

  private health(
    state: HealthResult["state"],
    checkedAt: string,
    latencyMs: number | null,
    details: Record<string, unknown>,
    error: string | null,
  ): HealthResult {
    return { provider: this.id, url: this.options.url, state, checkedAt, latencyMs, details, error };
  }
}

async function safeText(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, 500);
  } catch {
    return "<no body>";
  }
}
