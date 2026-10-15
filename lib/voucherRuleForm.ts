export type VoucherRuleFormData = {
  code: string;
  name: string;
  discountType: "FIXED_IDR" | "PERCENT";
  value: number;
  maxDiscount: number | null;
  minSpend: number;
  validFrom: string;
  validUntil: string;
  quotaTotal: number | null;
  quotaPerCustomer: number;
  categoryId: string | null;
  isActive: boolean;
  bannerImageUrl?: string | null;
  bannerType?: "FULL_STRIP" | "BADGE_COMPOSED" | null;
  bannerText?: string | null;
  bannerCtaText?: string | null;
  bannerCtaUrl?: string | null;
};

export type SubmitVoucherRuleOptions = {
  form: VoucherRuleFormData;
  editing: string | null;
  fetchFn?: typeof fetch;
};

export type SubmitVoucherRuleResult =
  | { success: true; message: string; data?: unknown }
  | { success: false; message: string };

/**
 * Validates and submits voucher rule form data for POST (create) and PATCH (update).
 * Robustly guards against missing dates, invalid date inputs, and network rejections.
 */
export async function submitVoucherRule({
  form,
  editing,
  fetchFn = fetch,
}: SubmitVoucherRuleOptions): Promise<SubmitVoucherRuleResult> {
  // 1. Early-return if dates are missing/empty
  if (!form.validFrom || !form.validUntil || !form.validFrom.trim() || !form.validUntil.trim()) {
    return {
      success: false,
      message: "Waktu mulai berlaku dan berakhir wajib diisi.",
    };
  }

  // 2. Enforce mandatory CTA Target URL for FULL_STRIP mode if banner image is configured
  if (form.bannerType === "FULL_STRIP" && form.bannerImageUrl) {
    if (!form.bannerCtaUrl || !form.bannerCtaUrl.trim()) {
      return {
        success: false,
        message: "CTA Target URL wajib diisi jika menggunakan Banner Horizontal Penuh (Full Strip) agar banner dapat diklik pelanggan.",
      };
    }
  }

  // 3. Guard date to ISO conversion
  let validFromIso: string;
  let validUntilIso: string;
  try {
    const fromDate = new Date(form.validFrom);
    const untilDate = new Date(form.validUntil);
    if (isNaN(fromDate.getTime()) || isNaN(untilDate.getTime())) {
      throw new RangeError("Invalid time value");
    }
    validFromIso = fromDate.toISOString();
    validUntilIso = untilDate.toISOString();
  } catch {
    return {
      success: false,
      message: "Format tanggal tidak valid. Pastikan format tanggal dan waktu sudah benar.",
    };
  }

  // 4. Construct request payload
  const body = {
    ...form,
    ...(editing ? { id: editing } : {}),
    validFrom: validFromIso,
    validUntil: validUntilIso,
  };

  // 5. Wrap fetch & response parsing in try/catch to ensure UI never freezes on network drop
  try {
    const res = await fetchFn("/api/admin/voucher-rules", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return {
        success: false,
        message: err.error || "Gagal menyimpan. Periksa kode, waktu, kategori, kuota, atau konfigurasi banner.",
      };
    }

    const data = await res.json().catch(() => undefined);
    return {
      success: true,
      message: "Aturan voucher dan banner tersimpan dengan sukses.",
      data,
    };
  } catch {
    return {
      success: false,
      message: "Koneksi ke server gagal. Periksa jaringan Anda dan coba lagi.",
    };
  }
}
