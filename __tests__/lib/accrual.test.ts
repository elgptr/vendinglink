import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { promoteAccruedCreditsToPayable } from "@/lib/promo/accrual";
import { cleanupTestDatabase, createMockProduct, createMockTransaction } from "../helpers/fixtures";

vi.mock("@/lib/logger", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(),
  }),
}));

const CUSTOMER_PHONE = "628444000001";
const PAST = new Date(Date.now() - 24 * 60 * 60 * 1000);
const FUTURE = new Date(Date.now() + 24 * 60 * 60 * 1000);

describe("lib/promo/accrual — promoteAccruedCreditsToPayable (ST-2e)", () => {
  let prisma: PrismaClient;
  let customerId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await cleanupTestDatabase(prisma);
    // cleanupTestDatabase doesn't touch these — clear leftovers from prior runs.
    await prisma.customerCredit.deleteMany({});
    await prisma.customer.deleteMany({});

    const customer = await prisma.customer.create({
      data: { phone: CUSTOMER_PHONE, name: "Accrual Tester" },
    });
    customerId = customer.id;
  });

  afterAll(async () => {
    await prisma.customerCredit.deleteMany({});
    await prisma.customer.deleteMany({});
    await prisma.$disconnect();
  });

  it("promotes an ACCRUED credit whose payableAt has passed", async () => {
    const credit = await prisma.customerCredit.create({
      data: {
        customerId,
        kind: "REFERRAL_COMMISSION",
        amount: 5000,
        status: "ACCRUED",
        payableAt: PAST,
      },
    });

    const promoted = await promoteAccruedCreditsToPayable(prisma);
    expect(promoted).toBe(1);

    const after = await prisma.customerCredit.findUniqueOrThrow({
      where: { id: credit.id },
    });
    expect(after.status).toBe("PAYABLE");
  });

  it("leaves an ACCRUED credit whose payableAt is still in the future", async () => {
    const credit = await prisma.customerCredit.create({
      data: {
        customerId,
        kind: "REFERRAL_COMMISSION",
        amount: 5000,
        status: "ACCRUED",
        payableAt: FUTURE,
      },
    });

    const promoted = await promoteAccruedCreditsToPayable(prisma);
    expect(promoted).toBe(0);

    const after = await prisma.customerCredit.findUniqueOrThrow({
      where: { id: credit.id },
    });
    expect(after.status).toBe("ACCRUED");

    await prisma.customerCredit.delete({ where: { id: credit.id } });
  });

  it("never promotes legacy STOCKOUT_REFUND credits (payableAt NULL)", async () => {
    const credit = await prisma.customerCredit.create({
      data: {
        claimCode: "TSTOCKOUT0001",
        kind: "STOCKOUT_REFUND",
        amount: 10000,
        status: "ACCRUED",
        payableAt: null,
      },
    });

    const promoted = await promoteAccruedCreditsToPayable(prisma);
    expect(promoted).toBe(0);

    const after = await prisma.customerCredit.findUniqueOrThrow({
      where: { id: credit.id },
    });
    expect(after.status).toBe("ACCRUED");

    await prisma.customerCredit.delete({ where: { id: credit.id } });
  });

  it("leaves non-ACCRUED credits untouched even with a past payableAt", async () => {
    const statuses = ["PAYABLE", "REDEEMED", "PAID", "VOID", "EXPIRED"];
    for (const status of statuses) {
      const credit = await prisma.customerCredit.create({
        data: {
          customerId,
          kind: "REFERRAL_COMMISSION",
          amount: 1000,
          status,
          payableAt: PAST,
        },
      });

      const promoted = await promoteAccruedCreditsToPayable(prisma);
      expect(promoted).toBe(0);

      const after = await prisma.customerCredit.findUniqueOrThrow({
        where: { id: credit.id },
      });
      expect(after.status).toBe(status);

      await prisma.customerCredit.delete({ where: { id: credit.id } });
    }
  });

  it("is idempotent — a second run promotes nothing", async () => {
    await prisma.customerCredit.create({
      data: {
        customerId,
        kind: "REFERRAL_COMMISSION",
        amount: 5000,
        status: "ACCRUED",
        payableAt: PAST,
      },
    });

    expect(await promoteAccruedCreditsToPayable(prisma)).toBe(1);
    // Cron fires again (or piggybacks elsewhere): nothing left to promote.
    expect(await promoteAccruedCreditsToPayable(prisma)).toBe(0);

    await prisma.customerCredit.deleteMany({
      where: { kind: "REFERRAL_COMMISSION" },
    });
  });

  it("honours the explicit `now` parameter (deterministic window boundary)", async () => {
    const credit = await prisma.customerCredit.create({
      data: {
        customerId,
        kind: "REFERRAL_COMMISSION",
        amount: 5000,
        status: "ACCRUED",
        payableAt: FUTURE, // matures tomorrow
      },
    });

    // Not yet matured at the default now.
    expect(await promoteAccruedCreditsToPayable(prisma)).toBe(0);

    // Matured when evaluated as-of the day after tomorrow.
    const dayAfterTomorrow = new Date(Date.now() + 48 * 60 * 60 * 1000);
    expect(await promoteAccruedCreditsToPayable(prisma, dayAfterTomorrow)).toBe(1);

    const after = await prisma.customerCredit.findUniqueOrThrow({
      where: { id: credit.id },
    });
    expect(after.status).toBe("PAYABLE");

    await prisma.customerCredit.delete({ where: { id: credit.id } });
  });

  it("voids unbatched stockout commissions before promotion, without changing paid credits", async () => {
    const product = await createMockProduct(prisma);
    const order = await createMockTransaction(prisma, { productId: product.id, status: "PAID", stockStatus: "OUT_OF_STOCK" });
    const credit = await prisma.customerCredit.create({ data: {
      customerId, kind: "REFERRAL_COMMISSION", amount: 5000,
      sourceTxnId: order.id, status: "ACCRUED", payableAt: PAST,
    } });
    expect(await promoteAccruedCreditsToPayable(prisma)).toBe(0);
    expect((await prisma.customerCredit.findUniqueOrThrow({ where: { id: credit.id } })).status).toBe("VOID");
    expect(await promoteAccruedCreditsToPayable(prisma)).toBe(0);
    await prisma.customerCredit.update({ where: { id: credit.id }, data: { status: "PAID" } });
    expect(await promoteAccruedCreditsToPayable(prisma)).toBe(0);
    expect((await prisma.customerCredit.findUniqueOrThrow({ where: { id: credit.id } })).status).toBe("PAID");
  });
});
