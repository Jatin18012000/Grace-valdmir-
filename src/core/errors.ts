/**
 * Application error model.
 *
 * Every error that leaves a module should be an AppError with a code. The developer-facing
 * message and details go to logs (with secrets redacted); the userMessage is safe to show
 * in the UI or return from an API.
 */
export const ERROR_CODES = [
  "CONFIGURATION_ERROR",
  "DATABASE_ERROR",
  "VALIDATION_ERROR",
  "NOT_FOUND",
  "LLM_ERROR",
  "COMFYUI_ERROR",
  "GENERATION_ERROR",
  "ASSET_ERROR",
  "QC_ERROR",
  "SCHEDULING_ERROR",
  "PUBLISHING_ERROR",
  "UNKNOWN_ERROR",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

const DEFAULT_USER_MESSAGES: Record<ErrorCode, string> = {
  CONFIGURATION_ERROR: "The application is misconfigured. Check the server logs.",
  DATABASE_ERROR: "A database error occurred.",
  VALIDATION_ERROR: "The input is invalid.",
  NOT_FOUND: "The requested item was not found.",
  LLM_ERROR: "The language model provider failed or is unavailable.",
  COMFYUI_ERROR: "ComfyUI failed or is unavailable.",
  GENERATION_ERROR: "Generation failed.",
  ASSET_ERROR: "An asset operation failed.",
  QC_ERROR: "Quality control failed to run.",
  SCHEDULING_ERROR: "A scheduling operation failed.",
  PUBLISHING_ERROR: "Publishing failed.",
  UNKNOWN_ERROR: "An unexpected error occurred.",
};

const HTTP_STATUS: Record<ErrorCode, number> = {
  CONFIGURATION_ERROR: 500,
  DATABASE_ERROR: 500,
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  LLM_ERROR: 502,
  COMFYUI_ERROR: 502,
  GENERATION_ERROR: 500,
  ASSET_ERROR: 500,
  QC_ERROR: 500,
  SCHEDULING_ERROR: 500,
  PUBLISHING_ERROR: 500,
  UNKNOWN_ERROR: 500,
};

export interface AppErrorOptions {
  /** Safe message for users. Defaults to a generic message for the code. */
  userMessage?: string;
  /** Structured diagnostics. Redacted before logging. */
  details?: Record<string, unknown>;
  cause?: unknown;
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly userMessage: string;
  readonly details: Record<string, unknown>;

  constructor(code: ErrorCode, message: string, options: AppErrorOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "AppError";
    this.code = code;
    this.userMessage = options.userMessage ?? DEFAULT_USER_MESSAGES[code];
    this.details = options.details ?? {};
  }

  get httpStatus(): number {
    return HTTP_STATUS[this.code];
  }

  /** Safe for API responses and the UI: no stack, cause or internal details. */
  toPublic(): { code: ErrorCode; message: string } {
    return { code: this.code, message: this.userMessage };
  }

  /** Full developer diagnostics, with secrets redacted. */
  toLog(): SerializedError {
    return {
      name: this.name,
      code: this.code,
      message: redactString(this.message),
      userMessage: this.userMessage,
      details: redact(this.details) as Record<string, unknown>,
      cause: serializeCause(this.cause, 0),
      // The stack's first line repeats the message, so it is redacted too.
      stack: this.stack === undefined ? null : redactString(this.stack),
    };
  }
}

export interface SerializedCause {
  name: string;
  message: string;
  code: string | null;
  cause: SerializedCause | null;
}

export interface SerializedError {
  name: string;
  code: ErrorCode;
  message: string;
  userMessage: string;
  details: Record<string, unknown>;
  cause: SerializedCause | null;
  stack: string | null;
}

const MAX_CAUSE_DEPTH = 5;

function serializeCause(cause: unknown, depth: number): SerializedCause | null {
  if (cause === undefined || cause === null || depth >= MAX_CAUSE_DEPTH) return null;
  if (cause instanceof Error) {
    const code = (cause as Error & { code?: unknown }).code;
    return {
      name: cause.name,
      message: redactString(cause.message),
      code: typeof code === "string" ? code : null,
      cause: serializeCause(cause.cause, depth + 1),
    };
  }
  return { name: typeof cause, message: redactString(String(cause)), code: null, cause: null };
}

/** Normalises anything thrown into an AppError, keeping the original as the cause. */
export function toAppError(error: unknown, fallbackCode: ErrorCode = "UNKNOWN_ERROR"): AppError {
  if (error instanceof AppError) return error;
  const message = error instanceof Error ? error.message : String(error);
  return new AppError(fallbackCode, message, { cause: error });
}

export function isAppError(error: unknown, code?: ErrorCode): error is AppError {
  return error instanceof AppError && (code === undefined || error.code === code);
}

// ---------------------------------------------------------------------------
// Redaction of sensitive values in logged data.
// ---------------------------------------------------------------------------

const SENSITIVE_KEY = /pass(word)?|secret|token|api[-_]?key|authori[sz]ation|cookie|credential|session/i;
const MAX_STRING = 2000;
export const REDACTED = "[REDACTED]";

function redactString(value: string): string {
  const withoutUrlCredentials = value.replace(/(\w+:\/\/)[^/\s:@]+:[^/\s@]+@/g, `$1${REDACTED}@`);
  return withoutUrlCredentials.length > MAX_STRING
    ? `${withoutUrlCredentials.slice(0, MAX_STRING)}…[truncated]`
    : withoutUrlCredentials;
}

/** Deep-copies a value, replacing sensitive keys and credentials in URLs. */
export function redact(value: unknown, depth = 0): unknown {
  if (depth > 8) return "[max depth]";
  if (typeof value === "string") return redactString(value);
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));
  if (value instanceof Error) return serializeCause(value, 0);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        SENSITIVE_KEY.test(key) ? REDACTED : redact(item, depth + 1),
      ]),
    );
  }
  return value;
}
