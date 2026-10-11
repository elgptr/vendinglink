import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { Prisma, PrismaClient } from "@prisma/client";
import {
  generatePayoutBatch,
  buildPayoutBatchCsv,
  PayoutBatchExistsError,
} from "@/lib/promo/payout";
import { cleanupTestDatabase } from "../helpers/fixtures";

vi.mock("@/lib/logger", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(),
  }),
}));

const MIN_PAYOUT = 20000;
const PAST = new Date(Date.now() - 24 * 60 * 60 * 1000);

describe("lib/promo/payout — generatePayoutBatch (ST-2f)", () => {
  let prisma: PrismaClient;

  async function makeCustomer(phone: string, name = "Referrer") {
    return prisma.customer.create({ data: { phone, name } });
  }

  async function makePayableCredit(
    customerId: string,
    amount: number,
    overrides: Partial<{
      kind: string;
      status: string;
      payoutBatchId: string | null;
    }> = {}
  ) {
    return prisma.customerCredit.create({
      data: {
        customerId,
        kind: overrides.kind ?? "REFERRAL_COMMISSION",
        amount,
        status: overrides.status ?? "PAYABLE",
        payableAt: PAST,
        payoutBatchId: overrides.payoutBatchId ?? null,
      },
    });
  }

  beforeAll(async () => {
    prisma = new PrismaClient();
    await cleanupTestDatabase(prisma);
    await prisma.customerCredit.deleteMany({});
    await prisma.payoutBatch.deleteMany({});
    await prisma.customer.deleteMany({});
    await prisma.programConfig.deleteMany({});
    await prisma.programConfig.create({
      data: { minPayoutAmount: MIN_PAYOUT },
    });
  });

  afterAll(async () => {
    await prisma.customerCredit.deleteMany({});
    await prisma.payoutBatch.deleteMany({});
    await prisma.customer.deleteMany({});
    await prisma.programConfig.deleteMany({});
    await prisma.$disconnect();
  });

  it("groups PAYABLE credits per customer into one DRAFT batch", async () => {
    const a = await makeCustomer("628666000001");
    const b = await makeCustomer("628666000002", "Referrer B");
    await makePayableCredit(a.id, 12000);
    await makePayableCredit(a.id, 10000);
    await makePayableCredit(b.id, 25000);

    const result = await generatePayoutBatch(
      { period: "2099-01", channel: "GOPAY" },
      prisma
    );

    expect(result.batch).not.toBeNull();
    expect(result.batch!.status).toBe("DRAFT");
    expect(result.batch!.totalAmount).toBe(47000);
    expect(result.lines).toHaveLength(2);
    const lineA = result.lines.find((l) => l.customerId === a.id)!;
    expect(lineA).toMatchObject({
      phone: "628666000001",
      amount: 22000,
      creditCount: 2,
    });

    const linked = await prisma.customerCredit.count({
      where: { payoutBatchId: result.batch!.id },
    });
    expect(linked).toBe(3);
  });

  it("B3: below-threshold customers stay PAYABLE and roll over", async () => {
    const small = await makeCustomer("628666000003");
    const smallCredit = await makePayableCredit(small.id, 5000); // < 20.000
    const big = await makeCustomer("628666000004");
    await makePayableCredit(big.id, 30000);

    const result = await generatePayoutBatch(
      { period: "2099-02", channel: "GOPAY" },
      prisma
    );

    expect(result.skippedBelowThreshold).toBe(1);
    expect(result.lines).toHaveLength(1);
    expect(result.batch!.totalAmount).toBe(30000);

    const after = await prisma.customerCredit.findUniqueOrThrow({
      where: { id: smallCredit.id },
    });
    expect(after.status).toBe("PAYABLE");
    expect(after.payoutBatchId).toBeNull();

    // Next period, after accumulating more credit, the rollover joins the batch.
    await makePayableCredit(small.id, 16000); // 5.000 + 16.000 = 21.000 >= ambang
    const next = await generatePayoutBatch(
      { period: "2099-03", channel: "GOPAY" },
      prisma
    );
    expect(next.lines).toHaveLength(1);
    expect(next.batch!.totalAmount).toBe(21000);
  });

  it("rejects a duplicate period + channel", async () => {
    const c = await makeCustomer("628666000005");
    await makePayableCredit(c.id, 25000);
    await generatePayoutBatch({ period: "2099-04", channel: "OVO" }, prisma);

    await expect(
      generatePayoutBatch({ period: "2099-04", channel: "OVO" }, prisma)
    ).rejects.toBeInstanceOf(PayoutBatchExistsError);

    // The database constraint (not just the preflight check) prevents duplicates.
    await expect(prisma.payoutBatch.create({
      data: { period: "2099-04", channel: "OVO" },
    })).rejects.toMatchObject({ code: "P2002" });

    // Same period, different channel is allowed.
    await makePayableCredit(c.id, 25000);
    const other = await generatePayoutBatch(
      { period: "2099-04", channel: "GOPAY" },
      prisma
    );
    expect(other.batch).not.toBeNull();
  });

  it("returns no batch when nothing is eligible", async () => {
    await prisma.customerCredit.deleteMany({});
    const result = await generatePayoutBatch(
      { period: "2099-05", channel: "GOPAY" },
      prisma
    );
    expect(result.batch).toBeNull();
    expect(result.lines).toEqual([]);
    expect(await prisma.payoutBatch.count()).toBe(5); // unchanged from prior tests
  });

  it("rolls back the batch if the conditional credit claim fails", async () => {
    const c = await makeCustomer("628666000010");
    const credit = await makePayableCredit(c.id, 25000);
    const client = {
      $transaction: (callback: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
        prisma.$transaction((tx) => callback(new Proxy(tx, {
          get(target, property, receiver) {
            if (property === "customerCredit") {
              return new Proxy(target.customerCredit, {
                get(delegate, operation, delegateReceiver) {
                  if (operation === "updateMany") return async () => ({ count: 0 });
                  return Reflect.get(delegate, operation, delegateReceiver);
                },
              });
            }
            return Reflect.get(target, property, receiver);
          },
        }))),
    } as unknown as PrismaClient;

    await expect(generatePayoutBatch({ period: "2099-05", channel: "OVO" }, client))
      .rejects.toThrow("Credit sudah diambil batch lain");
    expect(await prisma.payoutBatch.count({ where: { period: "2099-05", channel: "OVO" } })).toBe(0);
    expect((await prisma.customerCredit.findUniqueOrThrow({ where: { id: credit.id } })).payoutBatchId).toBeNull();
    await prisma.customerCredit.delete({ where: { id: credit.id } });
  });

  it("ignores ACCRUED commissions and legacy STOCKOUT_REFUND credits", async () => {
    const c = await makeCustomer("628666000006");
    await makePayableCredit(c.id, 50000, { status: "ACCRUED" });
    await makePayableCredit(c.id, 50000, { kind: "STOCKOUT_REFUND" });

    const result = await generatePayoutBatch(
      { period: "2099-06", channel: "GOPAY" },
      prisma
    );
    expect(result.batch).toBeNull();

    await prisma.customerCredit.deleteMany({
      where: { customerId: c.id },
    });
  });

  it("builds a per-referrer CSV for the batch", async () => {
    const a = await makeCustomer("628666000007", "Csv, \"Quoted\"");
    const b = await makeCustomer("628666000008");
    await makePayableCredit(a.id, 15000);
    await makePayableCredit(a.id, 15000);
    await makePayableCredit(b.id, 22000);

    const { batch } = await generatePayoutBatch(
      { period: "2099-07", channel: "GOPAY" },
      prisma
    );

    const csv = await buildPayoutBatchCsv(batch!.id, prisma);
    expect(csv).not.toBeNull();
    const lines = csv!.trim().split("\n");
    expect(lines[0]).toBe("phone,name,amount,credit_count");
    expect(lines).toHaveLength(3);
    expect(lines).toContain('628666000007,"Csv, ""Quoted""",30000,2');
    expect(lines).toContain("628666000008,Referrer,22000,1");

    expect(await buildPayoutBatchCsv("nonexistent-id", prisma)).toBeNull();
  });

  it("neutralizes spreadsheet formulas in CSV names", async () => {
    const c = await makeCustomer("628666000009", "=HYPERLINK(\"https://example.com\")");
    await makePayableCredit(c.id, 20000);
    const { batch } = await generatePayoutBatch({ period: "2099-08", channel: "OVO" }, prisma);
    const csv = await buildPayoutBatchCsv(batch!.id, prisma);
    expect(csv).toContain('628666000009,"\'=HYPERLINK(""https://example.com"")",20000,1');
  });
});
