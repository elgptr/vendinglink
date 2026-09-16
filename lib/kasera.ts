import crypto from "crypto";
import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "kasera-pay" });

const KASERA_BASE_URL = "https://pay.kasera.id/v1";

export interface KaseraCreatePaymentParams {
  orderId: string;
  amount: number;
  productName: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  description?: string;
  callbackUrl?: string;
}

export interface KaseraPaymentResult {
  id: string;
  amount: number;
  status: string;
  checkoutUrl: string;
  qrString?: string;
  expiresAt?: string;
}

export interface KaseraStatusResult {
  id: string;
  status: "pending" | "succeeded" | "expired" | "failed" | string;
  amount: number;
  paidAt?: string | null;
}

/**
 * Creates a QRIS payment request with Kasera Pay.
 * Direct QRIS API endpoint: POST /v1/transactions
 */
export async function createKaseraQrisPayment(
  params: KaseraCreatePaymentParams
): Promise<KaseraPaymentResult> {
  const apiKey = process.env.KASERA_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Konfigurasi Kasera Pay tidak lengkap. KASERA_API_KEY belum diatur di environment variable."
    );
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://toko.txsiber.online";
  const returnUrl =
    params.callbackUrl || `${appUrl}/customer/order/${params.orderId}`;

  const cleanDescription = (
    params.description ||
    params.productName ||
    "Pembayaran QRIS VendingLink"
  ).substring(0, 255);

  const cleanCustomerName = (params.customerName || "Customer").substring(
    0,
    120
  );
  const cleanPhone = params.customerPhone
    ? params.customerPhone.replace(/[^0-9+]/g, "").substring(0, 20)
    : undefined;

  const payload = {
    amount: Math.round(params.amount),
    description: cleanDescription,
    external_id: params.orderId,
    payment_methods: ["qris"],
    expires_in_minutes: 15,
    customer: {
      name: cleanCustomerName,
      email: params.customerEmail || undefined,
      phone: cleanPhone,
    },
    return_url: returnUrl,
  };

  log.info("Creating Kasera QRIS payment", {
    orderId: params.orderId,
    amount: params.amount,
  });

  const response = await fetch(`${KASERA_BASE_URL}/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "Idempotency-Key": params.orderId,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.id) {
    log.error("Kasera create transaction failed", {
      status: response.status,
      errorResponse: data,
    });
    const message =
      data.error?.message ||
      data.message ||
      "Gagal membuat transaksi Kasera Pay";
    throw new Error(`Kasera Error (${response.status}): ${message}`);
  }

  const qrString = data.payment?.qr_string;
  const checkoutUrl = data.checkout_url || "";

  return {
    id: data.id,
    amount: data.amount ?? params.amount,
    status: data.status || "pending",
    checkoutUrl,
    qrString,
    expiresAt: data.expires_at,
  };
}

/**
 * Retrieves payment status from Kasera Pay.
 * GET /v1/transactions/:id
 */
export async function getKaseraPaymentStatus(
  paymentId: string
): Promise<KaseraStatusResult> {
  const apiKey = process.env.KASERA_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Konfigurasi Kasera Pay tidak lengkap. KASERA_API_KEY belum diatur."
    );
  }

  const response = await fetch(`${KASERA_BASE_URL}/transactions/${paymentId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.id) {
    log.error("Kasera retrieve transaction failed", {
      paymentId,
      status: response.status,
      errorResponse: data,
    });
    throw new Error(
      `Kasera Error (${response.status}): Gagal mengambil status transaksi`
    );
  }

  return {
    id: data.id,
    status: data.status,
    amount: data.amount,
    paidAt: data.paid_at,
  };
}

/**
 * Verifies incoming Kasera webhook signature.
 * Supports both Kasera-Signature-V1 (timestamped HMAC-SHA256) and legacy Kasera-Signature.
 */
export function verifyKaseraWebhookSignature(params: {
  rawBody: string;
  signatureV1Header?: string | null;
  signatureHeader?: string | null;
  secretKey?: string;
  toleranceSeconds?: number;
}): boolean {
  const secret = params.secretKey || process.env.KASERA_WEBHOOK_SECRET;
  if (!secret) {
    log.warn("KASERA_WEBHOOK_SECRET is not configured");
    return false;
  }

  // 1. Verify modern Kasera-Signature-V1: t=<unix>,v1=<hex>[,v1=<hex2>]
  if (params.signatureV1Header) {
    try {
      const parts = params.signatureV1Header.split(",");
      const tPart = parts.find((p) => p.startsWith("t="));
      if (!tPart) return false;

      const t = Number(tPart.slice(2));
      if (!Number.isFinite(t)) return false;

      const tolerance = params.toleranceSeconds ?? 300; // 5 minutes
      if (Math.abs(Date.now() / 1000 - t) > tolerance) {
        log.warn("Kasera webhook signature timestamp expired", {
          headerTimestamp: t,
          now: Math.floor(Date.now() / 1000),
        });
        return false;
      }

      const expected = crypto
        .createHmac("sha256", secret)
        .update(`${t}.${params.rawBody}`)
        .digest("hex");

      const expectedBuf = Buffer.from(expected, "hex");

      return parts
        .filter((p) => p.startsWith("v1="))
        .some((p) => {
          const sigHex = p.slice(3);
          const sigBuf = Buffer.from(sigHex, "hex");
          return (
            sigBuf.length === expectedBuf.length &&
            crypto.timingSafeEqual(sigBuf, expectedBuf)
          );
        });
    } catch (err) {
      log.error("Kasera-Signature-V1 verification error", {
        error: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  }

  // 2. Fallback to legacy Kasera-Signature (deprecated hex HMAC-SHA256 over raw body)
  if (params.signatureHeader) {
    try {
      const expected = crypto
        .createHmac("sha256", secret)
        .update(params.rawBody)
        .digest("hex");

      const sigBuf = Buffer.from(params.signatureHeader, "hex");
      const expectedBuf = Buffer.from(expected, "hex");

      return (
        sigBuf.length === expectedBuf.length &&
        crypto.timingSafeEqual(sigBuf, expectedBuf)
      );
    } catch (err) {
      log.error("Kasera-Signature legacy verification error", {
        error: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  }

  return false;
}
