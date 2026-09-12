import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  sanitizeInput,
  validatePayloadSize,
  parseAndValidateJson,
  validateRequestInput,
  hasSqlInjectionPattern,
} from "@/lib/inputValidation";

describe("lib/inputValidation.ts — sanitizeInput", () => {
  it("strips HTML tags (keeps inner text)", () => {
    expect(sanitizeInput("<script>alert(1)</script>hello")).toBe("alert(1)hello");
    expect(sanitizeInput("<b>bold</b>")).toBe("bold");
  });

  it("removes dangerous protocols and event handlers", () => {
    expect(sanitizeInput("javascript:alert(1)")).not.toMatch(/javascript/i);
    expect(sanitizeInput("<img src=x onerror=alert(1)>")).not.toMatch(/onerror/);
  });

  it("encodes or strips meta characters", () => {
    expect(sanitizeInput('say "hi"')).not.toContain('"');
    expect(sanitizeInput("abc\0def")).not.toContain("\0");
  });

  it("collapses whitespace and trims", () => {
    expect(sanitizeInput("  a   b  c  ")).toBe("a b c");
  });

  it("clamps length and handles non-strings", () => {
    expect(sanitizeInput("x".repeat(500), 10)).toHaveLength(10);
    // @ts-expect-error intentional bad input to test runtime guard
    expect(sanitizeInput(null)).toBe("");
  });
});

describe("lib/inputValidation.ts — validatePayloadSize", () => {
  it("allows bodies within the limit", () => {
    expect(validatePayloadSize(1000, 10 * 1024).allowed).toBe(true);
  });

  it("rejects oversized bodies", () => {
    const r = validatePayloadSize(20 * 1024, 10 * 1024);
    expect(r.allowed).toBe(false);
    expect(r.reason).toContain("exceeds limit");
  });

  it("rejects invalid / negative content-length", () => {
    expect(validatePayloadSize(-5).allowed).toBe(false);
  });

  it("allows when header is missing", () => {
    expect(validatePayloadSize(null).allowed).toBe(true);
    expect(validatePayloadSize(undefined).allowed).toBe(true);
  });
});

describe("lib/inputValidation.ts — parseAndValidateJson", () => {
  it("parses valid JSON objects", () => {
    const r = parseAndValidateJson('{"a":1}');
    expect(r.success).toBe(true);
    expect(r.data).toEqual({ a: 1 });
  });

  it("rejects malformed JSON", () => {
    const r = parseAndValidateJson("{not json");
    expect(r.success).toBe(false);
    expect(r.error).toContain("Malformed");
  });

  it("rejects empty body", () => {
    expect(parseAndValidateJson("").success).toBe(false);
    expect(parseAndValidateJson("   ").success).toBe(false);
  });

  it("rejects non-object bodies (arrays, primitives)", () => {
    expect(parseAndValidateJson("[1,2,3]").success).toBe(false);
    expect(parseAndValidateJson('"a string"').success).toBe(false);
  });

  it("validates against a zod schema", () => {
    const schema = z.object({ username: z.string().min(3) });
    const ok = parseAndValidateJson('{"username":"abc"}', schema);
    expect(ok.success).toBe(true);

    const bad = parseAndValidateJson('{"username":"x"}', schema);
    expect(bad.success).toBe(false);
  });
});

describe("lib/inputValidation.ts — validateRequestInput", () => {
  it("returns ok for a valid payload", () => {
    const r = validateRequestInput('{"productId":"p1"}', {
      schema: z.object({ productId: z.string() }),
    });
    expect(r.ok).toBe(true);
  });

  it("returns 413 for oversized payload", () => {
    const huge = JSON.stringify({ data: "x".repeat(20 * 1024) });
    const r = validateRequestInput(huge, { maxBodyBytes: 10 * 1024 });
    expect(r.ok).toBe(false);
    expect(r.status).toBe(413);
  });

  it("returns 400 for schema violations", () => {
    const r = validateRequestInput('{"n":123}'.replace("123", '"x"'), {
      schema: z.object({ n: z.number() }),
    });
    expect(r.ok).toBe(false);
    expect(r.status).toBe(400);
  });
});

describe("lib/inputValidation.ts — hasSqlInjectionPattern", () => {
  it("detects classic injection patterns", () => {
    expect(hasSqlInjectionPattern("' OR '1'='1")).toBe(true);
    expect(hasSqlInjectionPattern("1; DROP TABLE users")).toBe(true);
    expect(hasSqlInjectionPattern("SELECT * FROM users UNION SELECT")).toBe(true);
  });

  it("does not flag normal text", () => {
    expect(hasSqlInjectionPattern("John Doe")).toBe(false);
    expect(hasSqlInjectionPattern("product guide for new users")).toBe(false);
  });
});