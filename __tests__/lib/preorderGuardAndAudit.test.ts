import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  assertNoExistingActiveRequest,
  assertProductNeedsPreOrder,
} from "@/lib/guards/preorderGuard";
import {
  maskPhone,
  auditTrackingLinkCreated,
  auditTrackingLinkAccessed,
  auditTrackingLinkExpired,
  auditTrackingLinkInvalidated,
} from "@/lib/audit/trackingAudit";

describe("Pre-Order Guard & Audit Logger Unit Tests", () => {
  const prisma = new PrismaClient();
  const testPhone = "628777666555";
  let testProductId: string;

  beforeAll(async () => {
    const prod = await prisma.product.create({
      data: {
        name: `Guard Unit Test Product ${Date.now()}`,
        price: 75000,
        type: "LINK",
      },
    });
    testProductId = prod.id;
  });

  afterAll(async () => {
    await prisma.customerProductRequest.deleteMany({
      where: { customerPhone: testPhone },
    });
    await prisma.redeemStock.deleteMany({
      where: { productId: testProductId },
    });
    await prisma.product.deleteMany({
      where: { id: testProductId },
    });
    await prisma.$disconnect();
  });

  describe("assertNoExistingActiveRequest", () => {
    it("allows request when no active requests exist for the phone", async () => {
      const res = await assertNoExistingActiveRequest(testPhone);
      expect(res.allowed).toBe(true);
    });

    it("blocks request when there is an active SEARCHING request", async () => {
      const req = await prisma.customerProductRequest.create({
        data: {
          customerPhone: testPhone,
          customerRef: "cust_test_guard",
          productName: "Active Item",
          status: "SEARCHING",
          trackingToken: "trk_active_1",
        },
      });

      const res = await assertNoExistingActiveRequest(testPhone);
      expect(res.allowed).toBe(false);
      expect(res.activeRequest?.id).toBe(req.id);
      expect(res.reason).toContain("Active Item");

      await prisma.customerProductRequest.delete({ where: { id: req.id } });
    });

    it("allows request if previous request is CONFIRMED or REJECTED", async () => {
      const req = await prisma.customerProductRequest.create({
        data: {
          customerPhone: testPhone,
          customerRef: "cust_test_guard_done",
          productName: "Finished Item",
          status: "CONFIRMED",
          trackingToken: "trk_done_1",
        },
      });

      const res = await assertNoExistingActiveRequest(testPhone);
      expect(res.allowed).toBe(true);

      await prisma.customerProductRequest.delete({ where: { id: req.id } });
    });
  });

  describe("assertProductNeedsPreOrder", () => {
    it("allows pre-order when product has 0 available redeem stocks", async () => {
      const res = await assertProductNeedsPreOrder(testProductId);
      expect(res.allowed).toBe(true);
    });

    it("blocks pre-order when product has available redeem stocks in catalog", async () => {
      const stock = await prisma.redeemStock.create({
        data: {
          productId: testProductId,
          redeemUrl: "https://example.com/item-123",
          status: "AVAILABLE",
        },
      });

      const res = await assertProductNeedsPreOrder(testProductId);
      expect(res.allowed).toBe(false);
      expect(res.inStock).toBe(true);
      expect(res.stockCount).toBe(1);

      await prisma.redeemStock.delete({ where: { id: stock.id } });
    });
  });

  describe("trackingAudit formatting & masking", () => {
    it("masks phone numbers correctly", () => {
      expect(maskPhone("081234567890")).toBe("0812****7890");
      expect(maskPhone("6282254203272")).toBe("6282****3272");
      expect(maskPhone("123")).toBe("***");
      expect(maskPhone(undefined)).toBe("UNKNOWN");
    });

    it("executes audit logging methods without error", () => {
      expect(() => {
        auditTrackingLinkCreated({
          trackingToken: "trk_log_1",
          requestId: "req_1",
          customerPhone: "081234567890",
          productName: "Test",
          expiresAt: new Date().toISOString(),
        });

        auditTrackingLinkAccessed({
          trackingToken: "trk_log_1",
          requestId: "req_1",
          status: "SEARCHING",
          customerPhone: "081234567890",
          productName: "Test",
        });

        auditTrackingLinkExpired({
          trackingToken: "trk_log_1",
          requestId: "req_1",
          customerPhone: "081234567890",
          productName: "Test",
          expiredAt: new Date().toISOString(),
        });

        auditTrackingLinkInvalidated({
          trackingToken: "trk_log_1",
          requestId: "req_1",
          reason: "Manual admin cancel",
        });
      }).not.toThrow();
    });
  });
});
