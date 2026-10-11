import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { GET } from "@/app/api/promos/active/route";
import { cleanupTestDatabase } from "../helpers/fixtures";

describe("GET /api/promos/active", () => {
  let db: PrismaClient;
  beforeAll(async () => { db = new PrismaClient(); await cleanupTestDatabase(db); });
  afterAll(async () => { await cleanupTestDatabase(db); await db.$disconnect(); });

  it("returns only active scheduled rules inside UTC window with remaining quota", async () => {
    const past = new Date(Date.now() - 60_000);
    const future = new Date(Date.now() + 60_000);
    for (const [code, changes] of Object.entries({
      ACTIVE: {}, EXPIRED: { validUntil: past }, UPCOMING: { validFrom: future },
      INACTIVE: { isActive: false }, EXHAUSTED: { usedCount: 1, quotaTotal: 1 },
      MANUAL: { kind: "MANUAL" },
    })) {
      await db.voucherRule.create({ data: {
        code, name: code, kind: "SCHEDULED", discountType: "FIXED_IDR", value: 1000,
        validFrom: past, validUntil: future, ...changes,
      } });
    }
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const data = await response.json();
    expect(data.promos.map((promo: { code: string }) => promo.code)).toEqual(["ACTIVE"]);
    expect(JSON.stringify(data)).not.toContain("usedCount");
  });
});