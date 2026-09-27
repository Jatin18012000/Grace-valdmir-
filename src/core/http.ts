import "server-only";
import { NextResponse } from "next/server";
import { getAppContextOrNull } from "./app-context";
import { toAppError } from "./errors";
import { recordError } from "./events";

/**
 * Wraps an API route handler. Any thrown error becomes a safe JSON response
 * { error: { code, message } } with the right HTTP status. Full diagnostics go to the server
 * log (redacted) and, for server errors, to the event log.
 */
export function withErrorHandling<Args extends unknown[]>(
  source: string,
  handler: (...args: Args) => Promise<Response> | Response,
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (error) {
      const appError = toAppError(error);
      const status = appError.httpStatus;
      if (status >= 500) {
        console.error(JSON.stringify({ level: "ERROR", source, error: appError.toLog() }));
        const context = getAppContextOrNull();
        if (context) recordError(context.db, appError, source);
      }
      return NextResponse.json({ error: appError.toPublic() }, { status });
    }
  };
}
