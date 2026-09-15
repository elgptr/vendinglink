import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Create the mock BEFORE vi.mock so it can be referenced in the factory
// (vitest hoists vi.mock above imports, so the variable must be hoisted too).
const sendPaymentNotificationMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ sent: true, mode: "mock" })
);

vi.mock("@/lib/whatsapp", async () => {
  const actual = await vi.importActual("@/lib/whatsapp");
  return {
    ...actual,
    sendPaymentNotification: sendPaymentNotificationMock,
  };
});

// Mock Prisma to avoid DB dependency.
vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: {
      findUnique: vi.fn(),
    },
    promoCode: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { notifyPaymentSuccess } from "@/lib/transactionStatus";

describe("Integration: Payment → WhatsApp Notification", () => {
  const baseTransaction = {
    orderId: "VM-FLOW-001",
    customerPhone: "6282254203272",
    productId: "prod-1",
    finalAmount: 50000,
    redeemUrl: "https://example.com/redeem/abc",
    stockStatus: "FULFILLED",
    promoCodeId: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    sendPaymentNotificationMock.mockResolvedValue({ sent: true, mode: "mock" });
    (prisma.product.findUnique as any).mockResolvedValue({
      name: "Premium Voucher",
    });
    (prisma.promoCode.findUnique as any).mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends WhatsApp notification for a fulfilled order", async () => {
    await notifyPaymentSuccess(baseTransaction);

    expect(sendPaymentNotificationMock).toHaveBeenCalledOnce();
    const [data] = sendPaymentNotificationMock.mock.calls[0];
    expect(data).toMatchObject({
      customerPhone: "6282254203272",
      orderId: "VM-FLOW-001",
      productName: "Premium Voucher",
      finalAmount: 50000,
      redeemUrl: "https://example.com/redeem/abc",
    });
  });

  it("does not send when there is no customer phone", async () => {
    await notifyPaymentSuccess({ ...baseTransaction, customerPhone: null });
    expect(sendPaymentNotificationMock).not.toHaveBeenCalled();
  });

  it("throws nothing even if WhatsApp fails (graceful degradation)", async () => {
    sendPaymentNotificationMock.mockRejectedValue(new Error("API down"));

    await expect(notifyPaymentSuccess(baseTransaction)).resolves.toBeUndefined();
  });

  it("includes promo code for out-of-stock compensation orders", async () => {
    (prisma.promoCode.findUnique as any).mockResolvedValue({
      code: "RESTOCK-COMP1",
    });

    await notifyPaymentSuccess({
      ...baseTransaction,
      promoCodeId: "promo-1",
      redeemUrl: null,
      stockStatus: "OUT_OF_STOCK",
    });

    expect(sendPaymentNotificationMock).toHaveBeenCalledOnce();
    const [data] = sendPaymentNotificationMock.mock.calls[0];
    expect(data.promoCode).toBe("RESTOCK-COMP1");
    expect(data.redeemUrl).toBeUndefined();
  });
});