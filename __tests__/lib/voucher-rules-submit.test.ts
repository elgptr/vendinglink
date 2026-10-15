import { describe, it, expect, vi } from "vitest";
import { submitVoucherRule, type VoucherRuleFormData } from "@/lib/voucherRuleForm";

const validForm: VoucherRuleFormData = {
  code: "DISCOUNT50",
  name: "Diskon 50 Persen",
  discountType: "PERCENT",
  value: 50,
  maxDiscount: 20000,
  minSpend: 10000,
  validFrom: "2026-10-15T10:00",
  validUntil: "2026-10-20T10:00",
  quotaTotal: 100,
  quotaPerCustomer: 1,
  categoryId: null,
  isActive: true,
  bannerImageUrl: null,
  bannerType: "FULL_STRIP",
  bannerText: null,
  bannerCtaText: null,
  bannerCtaUrl: "/customer#catalog",
};

describe("submitVoucherRule guard & submit logic (Fix A)", () => {
  it("early-returns with message and avoids fetch when validFrom or validUntil is empty", async () => {
    const fetchFn = vi.fn();

    // Empty validFrom
    const res1 = await submitVoucherRule({
      form: { ...validForm, validFrom: "" },
      editing: null,
      fetchFn: fetchFn as unknown as typeof fetch,
    });
    expect(res1.success).toBe(false);
    expect(res1.message).toBe("Waktu mulai berlaku dan berakhir wajib diisi.");
    expect(fetchFn).not.toHaveBeenCalled();

    // Empty validUntil
    const res2 = await submitVoucherRule({
      form: { ...validForm, validUntil: "   " },
      editing: null,
      fetchFn: fetchFn as unknown as typeof fetch,
    });
    expect(res2.success).toBe(false);
    expect(res2.message).toBe("Waktu mulai berlaku dan berakhir wajib diisi.");
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("early-returns with message and avoids fetch when FULL_STRIP banner with image has missing CTA url", async () => {
    const fetchFn = vi.fn();
    const res = await submitVoucherRule({
      form: {
        ...validForm,
        bannerType: "FULL_STRIP",
        bannerImageUrl: "https://example.com/banner.png",
        bannerCtaUrl: "",
      },
      editing: null,
      fetchFn: fetchFn as unknown as typeof fetch,
    });

    expect(res.success).toBe(false);
    expect(res.message).toBe(
      "CTA Target URL wajib diisi jika menggunakan Banner Horizontal Penuh (Full Strip) agar banner dapat diklik pelanggan."
    );
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("catches invalid date formatting and avoids fetch", async () => {
    const fetchFn = vi.fn();
    const res = await submitVoucherRule({
      form: { ...validForm, validFrom: "bukan-tanggal-valid" },
      editing: null,
      fetchFn: fetchFn as unknown as typeof fetch,
    });

    expect(res.success).toBe(false);
    expect(res.message).toBe("Format tanggal tidak valid. Pastikan format tanggal dan waktu sudah benar.");
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("catches network rejection and returns friendly error message without throwing", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    const res = await submitVoucherRule({
      form: validForm,
      editing: null,
      fetchFn: fetchFn as unknown as typeof fetch,
    });

    expect(res.success).toBe(false);
    expect(res.message).toBe("Koneksi ke server gagal. Periksa jaringan Anda dan coba lagi.");
  });

  it("handles non-200 API responses gracefully by extracting error message", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({
        error: "Validasi gagal — maxDiscount: Persentase maksimal 100 dan wajib memiliki batas diskon",
      }),
    });

    const res = await submitVoucherRule({
      form: validForm,
      editing: null,
      fetchFn: fetchFn as unknown as typeof fetch,
    });

    expect(res.success).toBe(false);
    expect(res.message).toContain("Validasi gagal");
  });

  it("successfully formats ISO dates and calls POST for new rules", async () => {
    let capturedUrl = "";
    let capturedOptions: RequestInit | undefined;
    const fetchFn = vi.fn().mockImplementation((url, opts) => {
      capturedUrl = url as string;
      capturedOptions = opts as RequestInit;
      return Promise.resolve({
        ok: true,
        json: vi.fn().mockResolvedValue({ id: "rule-123" }),
      });
    });

    const res = await submitVoucherRule({
      form: validForm,
      editing: null,
      fetchFn: fetchFn as unknown as typeof fetch,
    });

    expect(res.success).toBe(true);
    expect(res.message).toBe("Aturan voucher dan banner tersimpan dengan sukses.");
    expect(capturedUrl).toBe("/api/admin/voucher-rules");
    expect(capturedOptions?.method).toBe("POST");

    const sentBody = JSON.parse(capturedOptions?.body as string);
    expect(sentBody.code).toBe("DISCOUNT50");
    expect(new Date(sentBody.validFrom).toISOString()).toBe(sentBody.validFrom);
    expect(new Date(sentBody.validUntil).toISOString()).toBe(sentBody.validUntil);
    expect(sentBody.id).toBeUndefined();
  });

  it("successfully formats ISO dates and calls PATCH with id for existing rules", async () => {
    let capturedOptions: RequestInit | undefined;
    const fetchFn = vi.fn().mockImplementation((_url, opts) => {
      capturedOptions = opts as RequestInit;
      return Promise.resolve({
        ok: true,
        json: vi.fn().mockResolvedValue({ id: "rule-edit-456" }),
      });
    });

    const res = await submitVoucherRule({
      form: validForm,
      editing: "rule-edit-456",
      fetchFn: fetchFn as unknown as typeof fetch,
    });

    expect(res.success).toBe(true);
    expect(capturedOptions?.method).toBe("PATCH");

    const sentBody = JSON.parse(capturedOptions?.body as string);
    expect(sentBody.id).toBe("rule-edit-456");
  });
});
