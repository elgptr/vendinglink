import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { generateReferralCode } from "@/lib/referral";
import { cleanupTestDatabase } from "../helpers/fixtures";

describe("lib/referral", () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await cleanupTestDatabase(prisma);
  });

  afterAll(async () => {
    await cleanupTestDatabase(prisma);
    await prisma.$disconnect();
  });

  it("generates a 13-character code from acronym + last 4 digits + filler", async () => {
    const code = await generateReferralCode(prisma, { name: "Rizky Fauzi", phone: "081234567890" });
    expect(code).toMatch(/^[A-Z0-9]{13}$/);
    expect(code.startsWith("RF")).toBe(true);
    expect(code.slice(2, 6)).toBe("7890");
  });

  it("uses fallback XX for empty names", async () => {
    const code = await generateReferralCode(prisma, { name: "", phone: "081234567890" });
    expect(code.startsWith("XX")).toBe(true);
    expect(code).toHaveLength(13);
  });

  it("uses fallback XX for non-Latin names", async () => {
    const code = await generateReferralCode(prisma, { name: "中文", phone: "081234567890" });
    expect(code.startsWith("XX")).toBe(true);
    expect(code).toHaveLength(13);
  });

  it("uses first 3 chars of a single-word name", async () => {
    const code = await generateReferralCode(prisma, { name: "Budi", phone: "081234567890" });
    expect(code.startsWith("BUD")).toBe(true);
    expect(code).toHaveLength(13);
  });

  it("rejects invalid phone", async () => {
    await expect(generateReferralCode(prisma, { name: "Test", phone: "123" })).rejects.toThrow("Invalid phone number");
  });
});
