import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/csrf/route";
import { CSRF_COOKIE_NAME, isValidTokenFormat } from "@/lib/csrf";

/**
 * Unit tests for the public CSRF token bootstrap endpoint.
 *
 * The handler needs no database, no request context (it always issues a fresh
 * token), and no auth — this is the token-distribution half of the double-submit
 * scheme. It is tested directly against the Node runtime where `@/lib/csrf`
 * (node `crypto`) is available.
 */
describe("GET /api/csrf", () => {
  it("returns a well-formed token in the JSON body", async () => {
    const res = GET(null as never);
    expect(res.status).toBe(200);
    const body = await res.clone().json();
    expect(isValidTokenFormat(body.token)).toBe(true);
    expect(body.token).toHaveLength(64);
  });

  it("issues a fresh token on each call", async () => {
    const bodyA = await GET(null as never).json();
    const bodyB = await GET(null as never).json();
    expect(bodyA.token).not.toBe(bodyB.token);
  });

  it("sets the double-submit cookie to the returned token", async () => {
    const res = GET(null as never);
    const setCookie = res.headers.get("set-cookie") ?? "";
    const body = await res.clone().json();
    expect(setCookie).toContain(`${CSRF_COOKIE_NAME}=${body.token}`);
    expect(setCookie).toContain("SameSite=Lax");
  });

  it("does not allow the response to be cached", async () => {
    const res = GET(null as never);
    expect(res.headers.get("cache-control")).toContain("no-store");
  });
});