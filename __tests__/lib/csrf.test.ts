import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  generateCsrfToken,
  isValidTokenFormat,
  safeEqual,
  validateDoubleSubmitToken,
  consumeToken,
  resetConsumedTokens,
  pruneConsumedTokens,
  buildCookieHeader,
  verifyCsrfRequest,
  extractCsrfTokens,
  CSRF_COOKIE_NAME,
} from "@/lib/csrf";

describe("lib/csrf.ts", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetConsumedTokens();
  });

  afterEach(() => {
    vi.useRealTimers();
    resetConsumedTokens();
  });

  it("generates a well-formed random token", () => {
    const token = generateCsrfToken();
    expect(isValidTokenFormat(token)).toBe(true);
    expect(token).toHaveLength(64);
  });

  it("generates unique tokens on each call", () => {
    const a = generateCsrfToken();
    const b = generateCsrfToken();
    const c = generateCsrfToken();
    expect(a).not.toBe(b);
    expect(b).not.toBe(c);
  });

  it("rejects malformed tokens in format check", () => {
    expect(isValidTokenFormat("")).toBe(false);
    expect(isValidTokenFormat("short")).toBe(false);
    expect(isValidTokenFormat("G".repeat(64))).toBe(false); // uppercase not allowed
    expect(isValidTokenFormat("z".repeat(64))).toBe(false); // non-hex
  });

  it("passes when cookie and submitted tokens match", () => {
    const token = generateCsrfToken();
    expect(validateDoubleSubmitToken(token, token)).toBe(true);
  });

  it("fails on token mismatch (constant-time compare)", () => {
    const a = generateCsrfToken();
    const b = generateCsrfToken();
    expect(validateDoubleSubmitToken(a, b)).toBe(false);
  });

  it("fails when either token is missing", () => {
    const token = generateCsrfToken();
    expect(validateDoubleSubmitToken(undefined, token)).toBe(false);
    expect(validateDoubleSubmitToken(token, undefined)).toBe(false);
    expect(validateDoubleSubmitToken("", token)).toBe(false);
  });

  it("prevents replay when single-use is enabled", () => {
    const token = generateCsrfToken();
    // First submission accepted and consumes the token.
    expect(validateDoubleSubmitToken(token, token, { singleUse: true })).toBe(true);
    // Replay of the same token must fail.
    expect(validateDoubleSubmitToken(token, token, { singleUse: true })).toBe(false);
  });

  it("re-enables a consumed token after TTL expiry", () => {
    const token = generateCsrfToken();
    expect(validateDoubleSubmitToken(token, token, { singleUse: true })).toBe(true);
    expect(validateDoubleSubmitToken(token, token, { singleUse: true })).toBe(false);

    // Advance beyond TTL (10 min) and prune.
    vi.advanceTimersByTime(11 * 60 * 1000);
    pruneConsumedTokens(10 * 60 * 1000);
    expect(consumeToken(token, 10 * 60 * 1000)).toBe(true);
  });

  it("builds a secure cookie header", () => {
    const token = generateCsrfToken();
    const header = buildCookieHeader(token, true);
    expect(header).toContain(`${CSRF_COOKIE_NAME}=${token}`);
    expect(header).toContain("SameSite=Lax");
    expect(header).toContain("Secure");
    expect(header).toContain("Path=/");
  });

  it("safely compares equal and unequal values", () => {
    expect(safeEqual("same", "same")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false); // different lengths
  });

  it("verifyCsrfRequest fails open when no tokens present", () => {
    expect(verifyCsrfRequest(undefined, undefined)).toBe(true);
    expect(verifyCsrfRequest("", "")).toBe(true);
  });

  it("verifyCsrfRequest enforces matching tokens when present", () => {
    const token = generateCsrfToken();
    // Both present & matching → allowed.
    expect(verifyCsrfRequest(token, token)).toBe(true);
    // Mismatch present → rejected (e.g. attacker-supplied token).
    expect(verifyCsrfRequest(token, generateCsrfToken())).toBe(false);
    // Only one side present → rejected.
    expect(verifyCsrfRequest(token, undefined)).toBe(false);
    expect(verifyCsrfRequest(undefined, token)).toBe(false);
  });

  it("extractCsrfTokens parses the cookie header and preserves header token", () => {
    const token = generateCsrfToken();
    const cookieHeader = `some=1; ${CSRF_COOKIE_NAME}=${token}; other=2`;
    const { cookieToken, submittedToken } = extractCsrfTokens(cookieHeader, token);
    expect(cookieToken).toBe(token);
    expect(submittedToken).toBe(token);
  });

  it("extractCsrfTokens handles missing cookie", () => {
    const { cookieToken, submittedToken } = extractCsrfTokens("nope=3", null);
    expect(cookieToken).toBeUndefined();
    expect(submittedToken).toBeUndefined();
  });
});