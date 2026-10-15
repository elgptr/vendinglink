import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { NextRequest } from "next/server";
import { GET, POST, PATCH, DELETE } from "@/app/api/admin/voucher-rules/route";
import { cleanupTestDatabase } from "../helpers/fixtures";

vi.mock("@/lib/auth", () => ({ requireAdminSession: vi.fn() }));

const body = {
  code: "SCHEDULED-T", name: "Promo terjadwal", discountType: "FIXED_IDR",
  value: 1000, maxDiscount: null, minSpend: 0,
  validFrom: "2026-10-11T00:00:00.000Z", validUntil: "2026-11-11T00:00:00.000Z",
  quotaTotal: 2, quotaPerCustomer: 1, categoryId: null, isActive: true,
};
const request = (data: unknown, method = "POST") => new NextRequest("http://localhost/api/admin/voucher-rules", {
  method, body: JSON.stringify(data), headers: { "Content-Type": "application/json" },
});

describe("admin scheduled VoucherRule lifecycle", () => {
  let db: PrismaClient;
  let session: ReturnType<typeof vi.fn>;
  beforeAll(async () => {
    db = new PrismaClient(); await cleanupTestDatabase(db);
    session = (await import("@/lib/auth")).requireAdminSession as ReturnType<typeof vi.fn>;
  });
  afterAll(async () => { await cleanupTestDatabase(db); await db.$disconnect(); });
  beforeEach(() => { session.mockReset(); session.mockResolvedValue({ user: { role: "ADMIN" } }); });

  it("denies unauthenticated access", async () => {
    session.mockResolvedValue(null);
    expect((await GET()).status).toBe(403);
    expect((await POST(request(body))).status).toBe(403);
  });

  it("rejects missing expiry, invalid window and unbounded percent", async () => {
    expect((await POST(request({ ...body, validUntil: null }))).status).toBe(400);
    expect((await POST(request({ ...body, validUntil: body.validFrom }))).status).toBe(400);
    expect((await POST(request({ ...body, discountType: "PERCENT", value: 50 }))).status).toBe(400);
  });

  it("creates, edits and archives without losing redemption history", async () => {
    const created = await POST(request(body));
    expect(created.status).toBe(201);
    const rule = await created.json();
    expect(rule.kind).toBe("SCHEDULED");
    expect(rule.validUntil).toBe(body.validUntil);
    expect((await POST(request(body))).status).toBe(409);
    const changed = await PATCH(request({ ...body, id: rule.id, name: "Baru" }, "PATCH"));
    expect(changed.status).toBe(200);
    expect((await changed.json()).name).toBe("Baru");
    const buyer = await db.customer.create({ data: { phone: `62855${Date.now()}` } });
    const product = await db.product.create({ data: { name: "Scheduled test", price: 5000, type: "LINK" } });
    const order = await db.transaction.create({ data: { orderId: "SCHEDULED-ORDER", productId: product.id, originalPrice: 5000, finalAmount: 4000 } });
    await db.voucherRedemption.create({ data: { ruleId: rule.id, customerId: buyer.id, transactionId: order.id } });
    expect((await DELETE(new NextRequest(`http://localhost/api/admin/voucher-rules?id=${rule.id}`, { method: "DELETE" }))).status).toBe(200);
    expect((await db.voucherRule.findUniqueOrThrow({ where: { id: rule.id } })).isActive).toBe(false);
    expect(await db.voucherRedemption.count({ where: { ruleId: rule.id } })).toBe(1);
  });

  it("updates and clears categoryId via PATCH", async () => {
    const category = await db.category.create({
      data: { name: "Snack & Drink", slug: `snack-drink-${Date.now()}` },
    });

    const createRes = await POST(request({ ...body, code: "SCHED-CAT-UPD", categoryId: null }));
    expect(createRes.status).toBe(201);
    const createdRule = await createRes.json();
    expect(createdRule.categoryId).toBeNull();

    // Update with categoryId
    const patchWithCat = await PATCH(
      request({ ...body, id: createdRule.id, code: "SCHED-CAT-UPD", categoryId: category.id }, "PATCH")
    );
    expect(patchWithCat.status).toBe(200);
    const patchedRule = await patchWithCat.json();
    expect(patchedRule.categoryId).toBe(category.id);

    // Verify in DB
    const inDbWithCat = await db.voucherRule.findUniqueOrThrow({ where: { id: createdRule.id } });
    expect(inDbWithCat.categoryId).toBe(category.id);

    // Update clearing categoryId back to null
    const patchClearCat = await PATCH(
      request({ ...body, id: createdRule.id, code: "SCHED-CAT-UPD", categoryId: null }, "PATCH")
    );
    expect(patchClearCat.status).toBe(200);
    const clearedRule = await patchClearCat.json();
    expect(clearedRule.categoryId).toBeNull();

    // Verify in DB
    const inDbCleared = await db.voucherRule.findUniqueOrThrow({ where: { id: createdRule.id } });
    expect(inDbCleared.categoryId).toBeNull();
  });
});