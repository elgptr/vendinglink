import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { upsertCustomer } from "@/lib/customer";
import { cleanupTestDatabase } from "../helpers/fixtures";

function uniquePhone() {
  const suffix = Math.floor(Math.random() * 1e9).toString().padStart(9, "0");
  return `08${suffix}`;
}

describe("lib/customer", () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await cleanupTestDatabase(prisma);
  });

  afterAll(async () => {
    await cleanupTestDatabase(prisma);
    await prisma.$disconnect();
  });

  it("creates a customer and referral code on first upsert", async () => {
    const result = await upsertCustomer({
      prisma,
      phone: uniquePhone(),
      name: "Budi Santoso",
      consentPromo: true,
    });

    expect(result.phone.startsWith("628")).toBe(true);
    expect(result.name).toBe("Budi Santoso");
    expect(result.consentPromoAt).toBeTruthy();
    expect(result.referralCode).toMatch(/^[A-Z0-9]{13}$/);
  });

  it("normalizes +62 and spaces", async () => {
    const result = await upsertCustomer({
      prisma,
      phone: "+62 822-5420-3272",
      name: "Ani",
    });

    expect(result.phone).toBe("6282254203272");
  });

  it("does not duplicate customers with the same normalized phone", async () => {
    const phone = uniquePhone();
    const first = await upsertCustomer({ prisma, phone, name: "First" });
    const second = await upsertCustomer({ prisma, phone: `+62${phone.slice(1)}`, name: "Second" });

    expect(first.id).toBe(second.id);
    expect(second.name).toBe("First"); // name should not be overwritten
  });

  it("records consentPromoAt only when consented", async () => {
    const phone = uniquePhone();
    const withoutConsent = await upsertCustomer({ prisma, phone, name: "No Consent" });
    expect(withoutConsent.consentPromoAt).toBeNull();

    const withConsent = await upsertCustomer({ prisma, phone, name: "With Consent", consentPromo: true });
    expect(withConsent.consentPromoAt).toBeTruthy();
  });

  it("throws on invalid phone", async () => {
    await expect(upsertCustomer({ prisma, phone: "abc", name: "Test" })).rejects.toThrow("tidak valid");
  });
});
