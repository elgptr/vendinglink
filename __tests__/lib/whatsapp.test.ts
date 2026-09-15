import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  normalizePhone,
  buildPaymentMessage,
  sendPaymentNotification,
} from "@/lib/whatsapp";

// ─── normalizePhone ───────────────────────────────────────────────────────────

describe("normalizePhone", () => {
  it("converts 08xx format to 62xx", () => {
    expect(normalizePhone("082254203272")).toBe("6282254203272");
  });

  it("handles +62 prefix", () => {
    expect(normalizePhone("+6282254203272")).toBe("6282254203272");
  });

  it("passes through already-normalized numbers", () => {
    expect(normalizePhone("6282254203272")).toBe("6282254203272");
  });

  it("handles numbers with spaces and dashes", () => {
    expect(normalizePhone("0822-542-03272")).toBe("6282254203272");
    expect(normalizePhone("0822 542 03272")).toBe("6282254203272");
    expect(normalizePhone("+62 822 542 03272")).toBe("6282254203272");
  });

  it("returns null for empty or non-string input", () => {
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone(null as unknown as string)).toBeNull();
    expect(normalizePhone(undefined as unknown as string)).toBeNull();
  });

  it("returns null for invalid formats", () => {
    expect(normalizePhone("12345678")).toBeNull(); // No 62 prefix
    expect(normalizePhone("abc")).toBeNull();
    expect(normalizePhone("62")).toBeNull(); // Too short
  });

  it("accepts long numbers (up to 13 digits)", () => {
    expect(normalizePhone("62812345678901")).toBe("62812345678901");
  });

  it("rejects too-long numbers (>13 digits)", () => {
    expect(normalizePhone("628123456789012")).toBeNull();
  });
});

// ─── buildPaymentMessage ─────────────────────────────────────────────────────

describe("buildPaymentMessage", () => {
  const baseData = {
    customerPhone: "6282254203272",
    orderId: "VM-123456-ABC",
    productName: "Premium Voucher",
    finalAmount: 50000,
  };

  it("includes basic order info", () => {
    const msg = buildPaymentMessage(baseData);
    expect(msg).toContain("Pembayaran Berhasil!");
    expect(msg).toContain("VM-123456-ABC");
    expect(msg).toContain("Premium Voucher");
    expect(msg).toContain("50.000");
  });

  it("includes redeemUrl when fulfilled", () => {
    const msg = buildPaymentMessage({
      ...baseData,
      redeemUrl: "https://example.com/redeem/abc123",
    });
    expect(msg).toContain("https://example.com/redeem/abc123");
    expect(msg).toContain("Link Redeem");
  });

  it("includes promo code when out of stock", () => {
    const msg = buildPaymentMessage({
      ...baseData,
      promoCode: "RESTOCK-XXXX",
    });
    expect(msg).toContain("RESTOCK-XXXX");
    expect(msg).toContain("Kode Promo");
    expect(msg).toContain("Stok sedang habis");
  });

  it("ends with thank you message", () => {
    const msg = buildPaymentMessage(baseData);
    expect(msg).toContain("Terima kasih telah berbelanja!");
  });
});
// ─── sendPaymentNotification (mock mode) ─────────────────────────────────────

describe("sendPaymentNotification (mock mode)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
    process.env.SAUNGWA_MODE = "mock";
  });

  afterEach(() => {
    (process as any).env = originalEnv;
    vi.restoreAllMocks();
  });

  it("skips when no phone number", async () => {
    const result = await sendPaymentNotification({
      customerPhone: "",
      orderId: "VM-TEST-001",
      productName: "Test Product",
      finalAmount: 50000,
    });
    expect(result.sent).toBe(false);
    expect(result.error).toBe("No customer phone");
  });

  it("skips when phone format is invalid", async () => {
    const result = await sendPaymentNotification({
      customerPhone: "not-a-phone",
      orderId: "VM-TEST-002",
      productName: "Test Product",
      finalAmount: 50000,
    });
    expect(result.sent).toBe(false);
    expect(result.error).toContain("Invalid phone format");
  });

  it("returns sent:true in mock mode", async () => {
    const result = await sendPaymentNotification({
      customerPhone: "6282254203272",
      orderId: "VM-TEST-003",
      productName: "Test Product",
      finalAmount: 50000,
      redeemUrl: "https://example.com/redeem",
    });
    expect(result.sent).toBe(true);
    expect(result.mode).toBe("mock");
  });

  it("normalizes phone before sending", async () => {
    const result = await sendPaymentNotification({
      customerPhone: "082254203272",
      orderId: "VM-TEST-004",
      productName: "Test Product",
      finalAmount: 50000,
    });
    expect(result.sent).toBe(true);
    expect(result.mode).toBe("mock");
  });
});
// ─── sendPaymentNotification (live mode, mocked fetch) ───────────────────────

describe("sendPaymentNotification (live mode)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
    process.env.SAUNGWA_MODE = "live";
    process.env.SAUNGWA_APPKEY = "test-appkey";
    process.env.SAUNGWA_AUTHKEY = "test-authkey";
  });

  afterEach(() => {
    (process as any).env = originalEnv;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("calls Saungwa API with correct FormData payload", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message_status: "Success",
        data: { from: "6281", to: "6282254203272", status_code: 200 },
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await sendPaymentNotification({
      customerPhone: "6282254203272",
      orderId: "VM-LIVE-001",
      productName: "Premium Voucher",
      finalAmount: 50000,
      redeemUrl: "https://example.com/redeem",
    });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("https://app.saungwa.com/api/create-message");
    expect(options.method).toBe("POST");

    const body = options.body as FormData;
    expect(body.get("appkey")).toBe("test-appkey");
    expect(body.get("authkey")).toBe("test-authkey");
    expect(body.get("to")).toBe("6282254203272");
    expect(body.get("message")).toContain("Pembayaran Berhasil!");
    expect(result.sent).toBe(true);
    expect(result.mode).toBe("live");
  });

  it("returns error when API keys are missing", async () => {
    delete process.env.SAUNGWA_APPKEY;
    delete process.env.SAUNGWA_AUTHKEY;
    const result = await sendPaymentNotification({
      customerPhone: "6282254203272",
      orderId: "VM-LIVE-002",
      productName: "Test",
      finalAmount: 50000,
    });
    expect(result.sent).toBe(false);
    expect(result.error).toContain("SAUNGWA_APPKEY");
  });

  it("returns error when fetch fails (network)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network error"))
    );
    const result = await sendPaymentNotification({
      customerPhone: "6282254203272",
      orderId: "VM-LIVE-003",
      productName: "Test",
      finalAmount: 50000,
    });
    expect(result.sent).toBe(false);
    expect(result.error).toBe("Network error");
  });

  it("returns error when API responds with failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ message: "Invalid phone" }),
      })
    );
    const result = await sendPaymentNotification({
      customerPhone: "6282254203272",
      orderId: "VM-LIVE-004",
      productName: "Test",
      finalAmount: 50000,
    });
    expect(result.sent).toBe(false);
    expect(result.error).toBe("Invalid phone");
  });
});