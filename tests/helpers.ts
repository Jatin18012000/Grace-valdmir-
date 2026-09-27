import path from "node:path";
import type { FetchLike } from "@/core/providers/health";

export const REPO_ROOT = path.resolve(import.meta.dirname, "..");
export const BIBLE_PATH = path.join(REPO_ROOT, "characters/grace/bible.json");

/** Test double for fetch: returns a canned JSON response per URL, or throws like a refused connection. */
export function stubFetch(routes: Record<string, { status?: number; json?: unknown; text?: string } | "REFUSED">): {
  fetchImpl: FetchLike;
  calls: Array<{ url: string; init: RequestInit | undefined }>;
} {
  const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
  const fetchImpl: FetchLike = async (url, init) => {
    calls.push({ url, init });
    const route = routes[url];
    if (route === undefined) throw new Error(`Unexpected URL in test: ${url}`);
    if (route === "REFUSED") throw new TypeError("fetch failed", { cause: new Error("connect ECONNREFUSED") });
    const body = route.text ?? JSON.stringify(route.json);
    return new Response(body, { status: route.status ?? 200, headers: { "content-type": "application/json" } });
  };
  return { fetchImpl, calls };
}
