import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "crypto";
import {
  createKaseraQrisPayment,
  getKaseraPaymentStatus,
  verifyKaseraWebhookSignature,
} from "@/lib/kasera";

describe("Kasera Pay Library (lib/kasera.ts)", () => {
  const originalEnv = process.env;
  const TEST_SECRET = "whsec_test_secret_1234567890abcdef";
  const TEST_API_KEY = "kp_live_test_api_key_12345";

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      KASERA_API_KEY: TEST_API_KEY,
      KASERA_WEBHOOK_SECRET: TEST_SECRET,
    };
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("verifyKaseraWebhookSignature", () => {
    it("should verify valid Kasera-Signature-V1 with timestamp", () => {
      const rawBody = JSON.stringify({
        id: "evt_123",
        type: "payment.paid",
        data: { external_id: "VM-12345", amount: 10000 },
      });
      const now = Math.floor(Date.now() / 1000);
      const expectedHex = crypto
        .createHmac("sha256", TEST_SECRET)
        .update(`${now}.${rawBody}`)
        .digest("hex");

      const v1Header = `t=${now},v1=${expectedHex}`;

      const isValid = verifyKaseraWebhookSignature({
        rawBody,
        signatureV1Header: v1Header,
        secretKey: TEST_SECRET,
      });

      expect(isValid).toBe(true);
    });

    it("should verify Kasera-Signature-V1 during secret rotation (multiple v1 entries)", () => {
      const rawBody = JSON.stringify({ id: "evt_123" });
      const now = Math.floor(Date.now() / 1000);
      const expectedHex = crypto
        .createHmac("sha256", TEST_SECRET)
        .update(`${now}.${rawBody}`)
        .digest("hex");

      const v1Header = `t=${now},v1=invalid_old_signature,v1=${expectedHex}`;

      const isValid = verifyKaseraWebhookSignature({
        rawBody,
        signatureV1Header: v1Header,
        secretKey: TEST_SECRET,
      });

      expect(isValid).toBe(true);
    });

    it("should reject expired timestamp in Kasera-Signature-V1 (> 300s)", () => {
      const rawBody = JSON.stringify({ id: "evt_old" });
      const pastTime = Math.floor(Date.now() / 1000) - 400; // 400 seconds ago
      const expectedHex = crypto
        .createHmac("sha256", TEST_SECRET)
        .update(`${pastTime}.${rawBody}`)
        .digest("hex");

      const v1Header = `t=${pastTime},v1=${expectedHex}`;

      const isValid = verifyKaseraWebhookSignature({
        rawBody,
        signatureV1Header: v1Header,
        secretKey: TEST_SECRET,
      });

      expect(isValid).toBe(false);
    });

    it("should reject tampered rawBody in Kasera-Signature-V1", () => {
      const originalBody = JSON.stringify({ amount: 10000 });
      const tamperedBody = JSON.stringify({ amount: 1000 });
      const now = Math.floor(Date.now() / 1000);

      const expectedHex = crypto
        .createHmac("sha256", TEST_SECRET)
        .update(`${now}.${originalBody}`)
        .digest("hex");

      const v1Header = `t=${now},v1=${expectedHex}`;

      const isValid = verifyKaseraWebhookSignature({
        rawBody: tamperedBody,
        signatureV1Header: v1Header,
        secretKey: TEST_SECRET,
      });

      expect(isValid).toBe(false);
    });

    it("should verify legacy Kasera-Signature (hex without timestamp)", () => {
      const rawBody = JSON.stringify({ id: "evt_legacy" });
      const expectedHex = crypto
        .createHmac("sha256", TEST_SECRET)
        .update(rawBody)
        .digest("hex");

      const isValid = verifyKaseraWebhookSignature({
        rawBody,
        signatureHeader: expectedHex,
        secretKey: TEST_SECRET,
      });

      expect(isValid).toBe(true);
    });

    it("should reject invalid legacy Kasera-Signature", () => {
      const rawBody = JSON.stringify({ id: "evt_legacy" });
      const isValid = verifyKaseraWebhookSignature({
        rawBody,
        signatureHeader: "deadbeefcafebabe12345678",
        secretKey: TEST_SECRET,
      });

      expect(isValid).toBe(false);
    });

    it("should return false if secret is missing", () => {
      delete process.env.KASERA_WEBHOOK_SECRET;
      const isValid = verifyKaseraWebhookSignature({
        rawBody: "{}",
        signatureHeader: "sig",
      });

      expect(isValid).toBe(false);
    });
  });

  describe("createKaseraQrisPayment", () => {
    it("should send correct payload with expires_in_minutes: 15 and idempotency header", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "payreq_test_123",
          status: "pending",
          amount: 50000,
          checkout_url: "https://pay.kasera.id/p/test-url",
          payment: {
            type: "qr",
            qr_string: "00020101021226670016COM.KASERA...",
          },
          expires_at: "2026-09-16T16:00:00+07:00",
        }),
      });
      global.fetch = mockFetch;

      const result = await createKaseraQrisPayment({
        orderId: "VM-1234567890",
        amount: 50000,
        productName: "Produk Kopi Susu",
        customerName: "Budi Santoso",
        customerPhone: "081234567890",
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe("https://pay.kasera.id/v1/transactions");
      expect(options.headers["Authorization"]).toBe(`Bearer ${TEST_API_KEY}`);
      expect(options.headers["Idempotency-Key"]).toBe("VM-1234567890");

      const body = JSON.parse(options.body);
      expect(body.amount).toBe(50000);
      expect(body.payment_methods).toEqual(["qris"]);
      expect(body.expires_in_minutes).toBe(15);
      expect(body.external_id).toBe("VM-1234567890");
      expect(body.customer.name).toBe("Budi Santoso");

      expect(result.id).toBe("payreq_test_123");
      expect(result.checkoutUrl).toBe("https://pay.kasera.id/p/test-url");
      expect(result.qrString).toBe("00020101021226670016COM.KASERA...");
    });

    it("should throw informative error if API key is missing", async () => {
      delete process.env.KASERA_API_KEY;

      await expect(
        createKaseraQrisPayment({
          orderId: "VM-123",
          amount: 10000,
          productName: "Test",
        })
      ).rejects.toThrow("KASERA_API_KEY belum diatur");
    });

    it("should throw error if Kasera returns non-200 response", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        json: async () => ({
          error: { message: "Invalid amount or currency" },
        }),
      });

      await expect(
        createKaseraQrisPayment({
          orderId: "VM-123",
          amount: 10000,
          productName: "Test",
        })
      ).rejects.toThrow("Kasera Error (422): Invalid amount or currency");
    });
  });

  describe("getKaseraPaymentStatus", () => {
    it("should query GET /v1/transactions/:id with auth header", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "payreq_123",
          status: "succeeded",
          amount: 25000,
          paid_at: "2026-09-16T15:30:00Z",
        }),
      });
      global.fetch = mockFetch;

      const result = await getKaseraPaymentStatus("payreq_123");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://pay.kasera.id/v1/transactions/payreq_123",
        expect.objectContaining({
          method: "GET",
          headers: {
            Authorization: `Bearer ${TEST_API_KEY}`,
          },
        })
      );

      expect(result.id).toBe("payreq_123");
      expect(result.status).toBe("succeeded");
      expect(result.amount).toBe(25000);
      expect(result.paidAt).toBe("2026-09-16T15:30:00Z");
    });
  });
});
