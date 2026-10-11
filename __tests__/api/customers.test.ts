import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/customers/route";
import { cleanupTestDatabase } from "../helpers/fixtures";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/csrf", () => ({
  extractCsrfTokens: () => ({ cookieToken: undefined, submittedToken: undefined }),
  verifyCsrfRequest: () => true,
}));

function uniquePhone() {
  const suffix = Math.floor(Math.random() * 1e9).toString().padStart(9, "0");
  return `08${suffix}`;
}

function jsonRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/customers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("api/customers", () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await cleanupTestDatabase(prisma);
  });

  afterAll(async () => {
    await cleanupTestDatabase(prisma);
    await prisma.$disconnect();
  });

  it("creates a new customer and referral code", async () => {
    const phone = uniquePhone();
    const res = await POST(jsonRequest({ name: "Budi Santoso", phone, consentPromo: true }));
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.phone).toBe("62" + phone.slice(1));
    expect(data.name).toBe("Budi Santoso");
    expect(data.consentPromoAt).toBeTruthy();
    expect(data.referralCode).toMatch(/^[A-Z0-9]{13}$/);
  });

  it("upserts existing customer without overwriting name", async () => {
    const phone = uniquePhone();
    await POST(jsonRequest({ name: "First Name", phone }));
    const res = await POST(jsonRequest({ name: "Second Name", phone, consentPromo: true }));
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.name).toBe("First Name");
    expect(data.consentPromoAt).toBeTruthy();
  });

  it("rejects invalid phone", async () => {
    const res = await POST(jsonRequest({ name: "Test", phone: "123" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("tidak valid");
  });
});
