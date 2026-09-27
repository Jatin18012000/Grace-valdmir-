/**
 * Result of a real, live health check against a local provider.
 * ONLINE is only reported when the provider actually answered correctly.
 */
export type HealthState = "ONLINE" | "OFFLINE" | "ERROR";

export interface HealthResult {
  provider: string;
  url: string;
  state: HealthState;
  checkedAt: string;
  latencyMs: number | null;
  /** Provider-specific facts from the real response (e.g. model ids, versions). */
  details: Record<string, unknown>;
  error: string | null;
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface HttpOptions {
  fetchImpl?: FetchLike;
  timeoutMs: number;
}

/**
 * GET a JSON endpoint with a timeout.
 * Connection failures are reported as OFFLINE; any other failure (bad status, bad JSON) as ERROR.
 */
export async function getJson(
  url: string,
  options: HttpOptions,
): Promise<
  | { ok: true; body: unknown; latencyMs: number }
  | { ok: false; state: "OFFLINE" | "ERROR"; error: string; latencyMs: number | null }
> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const started = Date.now();
  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: "GET",
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(options.timeoutMs),
      cache: "no-store",
    });
  } catch (error) {
    return { ok: false, state: "OFFLINE", error: describeError(error), latencyMs: null };
  }
  const latencyMs = Date.now() - started;
  if (!response.ok) {
    return { ok: false, state: "ERROR", error: `HTTP ${response.status}`, latencyMs };
  }
  try {
    return { ok: true, body: await response.json(), latencyMs };
  } catch (error) {
    return { ok: false, state: "ERROR", error: `Invalid JSON: ${describeError(error)}`, latencyMs };
  }
}

export function describeError(error: unknown): string {
  if (error instanceof Error) {
    const cause = (error as Error & { cause?: unknown }).cause;
    const causeText = cause instanceof Error ? ` (${cause.message})` : "";
    return `${error.name}: ${error.message}${causeText}`;
  }
  return String(error);
}
