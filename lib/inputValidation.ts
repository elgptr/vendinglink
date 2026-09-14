/**
 * Input validation and sanitization middleware utilities (Phase 2 — HIGH SECURITY).
 *
 * Centralises sanitisation, payload-size enforcement and structural validation
 * so critical endpoints (checkout, registration, webhook) share the same
 * hardened pipeline.
 *
 * All functions are pure (no side effects) and safe to use in both the Node
 * route handlers and the Vitest unit tests.
 */

import { z } from "zod";

// ── Constants ──────────────────────────────────────────────────────────────
const DEFAULT_MAX_BODY_BYTES = 10 * 1024; // 10 KB
const DEFAULT_MAX_STRING_LENGTH = 255;

// ── Sanitisation ───────────────────────────────────────────────────────────

/**
 * Deeply sanitise a string: strip HTML tags, remove dangerous protocol handlers,
 * encode common entities, collapse whitespace and clamp length.
 */
export function sanitizeInput(input: string, maxLength = DEFAULT_MAX_STRING_LENGTH): string {
  if (typeof input !== "string") return "";
  return (
    input
      // Strip HTML tags
      .replace(/<[^>]*>/g, "")
      // Remove dangerous protocols
      .replace(/javascript:/gi, "")
      .replace(/vbscript:/gi, "")
      .replace(/data:/gi, "")
      // Remove inline event handlers
      .replace(/on\w+\s*=/gi, "")
      // Encode critical characters
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
      // Remove null bytes
      .replace(/\0/g, "")
      // Collapse excessive whitespace
      .replace(/\s{2,}/g, " ")
      .trim()
      .slice(0, maxLength)
  );
}

// ── Payload size ───────────────────────────────────────────────────────────

export interface PayloadSizeCheckResult {
  allowed: boolean;
  /** Human-readable reason when `allowed` is false. */
  reason?: string;
}

/**
 * Validate that a `Content-Length` is within the allowed maximum.
 * For non-streaming JSON bodies the request's header can be checked before
 * reading the body, preventing memory abuse.
 */
export function validatePayloadSize(
  contentLength: number | null | undefined,
  maxBytes = DEFAULT_MAX_BODY_BYTES
): PayloadSizeCheckResult {
  if (contentLength === null || contentLength === undefined) {
    // Header missing — allow (we cannot enforce what we don't know).
    return { allowed: true };
  }
  if (!Number.isFinite(contentLength) || contentLength < 0) {
    return { allowed: false, reason: "Content-Length must be a non-negative integer" };
  }
  if (contentLength > maxBytes) {
    return {
      allowed: false,
      reason: `Payload too large: ${contentLength} bytes exceeds limit of ${maxBytes} bytes`,
    };
  }
  return { allowed: true };
}

// ── JSON body validation ───────────────────────────────────────────────────

export interface JsonParseResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Attempt to parse a JSON string and optionally validate it against a Zod schema.
 * Returns a structured result instead of throwing.
 */
export function parseAndValidateJson<T>(
  raw: string,
  schema?: z.ZodType<T>
): JsonParseResult<T> {
  if (typeof raw !== "string" || raw.trim() === "") {
    return { success: false, error: "Empty request body" };
  }

  if (raw.length > DEFAULT_MAX_BODY_BYTES * 2) {
    // Hard safety cap even before JSON.parse.
    return { success: false, error: "Body exceeds safety cap" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { success: false, error: "Malformed JSON payload" };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { success: false, error: "JSON body must be a non-null object" };
  }

  if (schema) {
    const result = schema.safeParse(parsed);
    if (!result.success) {
      const issues = result.error.issues.map((i) => i.message).join("; ");
      return { success: false, error: issues };
    }
    return { success: true, data: result.data };
  }

  return { success: true, data: parsed as T };
}

// ── Convenience middleware factory ─────────────────────────────────────────

export interface InputValidationOptions {
  /** Maximum allowed body size in bytes. Defaults to 10 KB. */
  maxBodyBytes?: number;
  /** Zod schema to validate against. */
  schema?: z.ZodType<unknown>;
}

export interface InputValidationResult {
  ok: boolean;
  status?: number;
  errorBody?: Record<string, unknown>;
}

/**
 * Run all input validations (size + JSON parse + schema) against a raw
 * request body string. Returns a structured object the caller can turn into
 * a `NextResponse` when `ok === false`.
 */
export function validateRequestInput(
  rawBody: string,
  options: InputValidationOptions = {}
): InputValidationResult {
  const { maxBodyBytes = DEFAULT_MAX_BODY_BYTES, schema } = options;

  // 1. Size check
  const sizeCheck = validatePayloadSize(rawBody.length, maxBodyBytes);
  if (!sizeCheck.allowed) {
    return {
      ok: false,
      status: 413,
      errorBody: { error: sizeCheck.reason },
    };
  }

  // 2. JSON parse + optional schema validation
  const parsed = parseAndValidateJson(rawBody, schema as z.ZodType<unknown>);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      errorBody: { error: parsed.error },
    };
  }

  return { ok: true };
}

// ── SQL / NoSQL injection heuristics ───────────────────────────────────────

/**
 * Quick heuristic check for common SQL injection patterns.
 * Note: Prisma parameterises queries, but this adds a defense-in-depth layer
 * to prevent obviously malicious strings from reaching the DB at all.
 */
export function hasSqlInjectionPattern(input: string): boolean {
  const patterns = [
    /'\s*OR\s+'?1'?\s*=\s*'?1/i,
    /--\s/,
    /;\s*DROP\s+/i,
    /;\s*DELETE\s+/i,
    /;\s*UPDATE\s+/i,
    /;\s*INSERT\s+/i,
    /UNION\s+SELECT/i,
    /\/\*.*\*\//,
  ];
  return patterns.some((re) => re.test(input));
}