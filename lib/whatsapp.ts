/**
 * WhatsApp Notification Service (Saungwa Integration)
 * Sends transaction notifications to customers after payment.
 *
 * Uses Saungwa API: https://app.saungwa.com/api/create-message
 *
 * Usage:
 *   import { sendPaymentNotification } from "@/lib/whatsapp";
 *   await sendPaymentNotification({
 *     customerPhone: "6282254203272",
 *     orderId: "VM-123456-ABC",
 *     productName: "Premium Voucher",
 *     finalAmount: 50000,
 *     redeemUrl: "https://example.com/redeem/xxx",
 *   });
 */

import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "whatsapp" });

const SAUNGWA_API_URL = "https://app.saungwa.com/api/create-message";

/**
 * Read WhatsApp mode from env at call time so tests can toggle it.
 * Returns "live" when explicitly set to "live", otherwise "mock".
 */
function getMode(): "live" | "mock" {
  return process.env.SAUNGWA_MODE === "live" ? "live" : "mock";
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WhatsAppPaymentData {
  customerPhone: string;
  orderId: string;
  productName: string;
  finalAmount: number;
  redeemUrl?: string; // Present when stockStatus === "FULFILLED"
  promoCode?: string; // Present when stockStatus === "OUT_OF_STOCK"
}

export interface WhatsAppSendResult {
  sent: boolean;
  messageId?: string;
  error?: string;
  mode: "live" | "mock";
}

// ─── Phone Validation ─────────────────────────────────────────────────────────

/**
 * Normalize Indonesian phone number to Saungwa's expected format.
 * Input:  "082254203272", "+6282254203272", "6282254203272"
 * Output: "6282254203272" (always starts with 62, no + prefix)
 */
export function normalizePhone(phone: string): string | null {
  if (!phone || typeof phone !== "string") return null;

  let cleaned = phone.replace(/[\s\-()]/g, "").trim();

  // Remove leading + if present
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.slice(1);
  }

  // Convert 08xx → 628xx (Indonesian local format)
  if (cleaned.startsWith("08")) {
    cleaned = "62" + cleaned.slice(1);
  }

  // Validate final format: must start with 62 and have 10-13 digits total
  if (!/^62\d{9,12}$/.test(cleaned)) {
    return null;
  }

  return cleaned;
}
// ─── Message Builder ──────────────────────────────────────────────────────────

/**
 * Build payment notification message based on fulfillment status.
 */
export function buildPaymentMessage(data: WhatsAppPaymentData): string {
  const lines: string[] = [];

  lines.push("*Pembayaran Berhasil!*");
  lines.push("");
  lines.push(`Pesanan: *${data.orderId}*`);
  lines.push(`Produk: ${data.productName}`);
  lines.push(`Total: Rp ${data.finalAmount.toLocaleString("id-ID")}`);

  if (data.redeemUrl) {
    lines.push("");
    lines.push("*Link Redeem:*");
    lines.push(data.redeemUrl);
    lines.push("");
    lines.push("Gunakan link di atas untuk menukarkan voucher Anda. Khusus Code Redeem Claude Token ikuti Panduan MWAPI di link: https://s.id/5OuKq");
  } else if (data.promoCode) {
    lines.push("");
    lines.push("Stok sedang habis. Sebagai kompensasi:");
    lines.push(`Kode Promo: *${data.promoCode}*`);
    lines.push("Gunakan kode di atas untuk diskon di pembelian berikutnya.");
  }

  lines.push("");
  lines.push("Terima kasih telah berbelanja!");

  return lines.join("\n");
}
// ─── API Sender ───────────────────────────────────────────────────────────────

/**
 * Send a text message via Saungwa API.
 * Internal function — called by sendPaymentNotification.
 */
async function sendViaSaungwa(
  to: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const appKey = process.env.SAUNGWA_APPKEY;
  const authKey = process.env.SAUNGWA_AUTHKEY;

  if (!appKey || !authKey) {
    return {
      success: false,
      error:
        "SAUNGWA_APPKEY and/or SAUNGWA_AUTHKEY environment variable is not set",
    };
  }

  try {
    const formData = new FormData();
    formData.append("appkey", appKey);
    formData.append("authkey", authKey);
    formData.append("to", to);
    formData.append("message", message);

    const response = await fetch(SAUNGWA_API_URL, {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    const isSuccess =
      result?.message_status === "Success" || result?.data?.status_code === 200;

    if (response.ok && isSuccess) {
      return {
        success: true,
        messageId: result?.data?.message_id || result?.message_id || undefined,
      };
    }

    return {
      success: false,
      error: result?.message || result?.error || `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}
// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * Send a payment notification to the customer via WhatsApp.
 *
 * - In "mock" mode: logs the message without sending (for development).
 * - In "live" mode: calls Saungwa API and returns the result.
 * - Never throws — all errors are caught and returned in the result.
 */
export async function sendPaymentNotification(
  data: WhatsAppPaymentData
): Promise<WhatsAppSendResult> {
  const mode = getMode();

  // Skip if no phone number
  if (!data.customerPhone) {
    log.info("Skipping WhatsApp — no customer phone", { orderId: data.orderId });
    return { sent: false, error: "No customer phone", mode };
  }

  const normalizedPhone = normalizePhone(data.customerPhone);
  if (!normalizedPhone) {
    log.warn("Skipping WhatsApp — invalid phone format", {
      orderId: data.orderId,
      phone: data.customerPhone,
    });
    return {
      sent: false,
      error: `Invalid phone format: ${data.customerPhone}`,
      mode,
    };
  }

  const message = buildPaymentMessage(data);

  // ── Mock mode: log only ──────────────────────────────────────────────
  if (mode === "mock") {
    log.info("WhatsApp (mock): would send message", {
      orderId: data.orderId,
      to: normalizedPhone,
      messagePreview: message.substring(0, 100) + "...",
    });
    return { sent: true, mode: "mock" };
  }

  // ── Live mode: call Saungwa API ───────────────────────────────────────
  log.info("WhatsApp: sending payment notification", {
    orderId: data.orderId,
    to: normalizedPhone,
  });

  const result = await sendViaSaungwa(normalizedPhone, message);

  if (result.success) {
    log.info("WhatsApp: notification sent", {
      orderId: data.orderId,
      to: normalizedPhone,
      messageId: result.messageId,
    });
    return { sent: true, messageId: result.messageId, mode: "live" };
  }

  log.error("WhatsApp: notification failed", {
    orderId: data.orderId,
    to: normalizedPhone,
    error: result.error,
  });
  return { sent: false, error: result.error, mode: "live" };
}

// ─── WA Selling Channel Message Builders & Senders ──────────────────────────

export function buildCatalogAndTemplateMessage(products: { id: string; name: string; price: number }[]): string {
  const lines: string[] = [];
  lines.push("Halo! Berikut adalah katalog produk kami hari ini:");
  lines.push("");

  products.forEach((p) => {
    lines.push(`- ${p.name} - Rp ${p.price.toLocaleString("id-ID")}`);
  });

  lines.push("");
  lines.push("Untuk melakukan pemesanan, silakan *Copy (Salin)* form di bawah ini, isi datanya, dan balas pesan ini:");
  lines.push("");
  lines.push("*--- FORM PEMESANAN ---*");
  lines.push("Nama Pemesan : ");
  lines.push("Nama Produk : ");
  lines.push("Jumlah : 1");
  lines.push("Kode Promo (opsional) : ");
  lines.push("Pembayaran : QRIS");
  lines.push("*------------------------*");

  return lines.join("\n");
}

export async function sendEmptyStockMessage(phone: string): Promise<WhatsAppSendResult> {
  const mode = getMode();
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) return { sent: false, error: "Invalid phone format", mode };

  const message = "Mohon maaf, saat ini semua stok toko online kami sedang kosong. Silakan cek secara berkala.";

  if (mode === "mock") {
    log.info("WhatsApp (mock): sendEmptyStockMessage", { to: normalizedPhone });
    return { sent: true, mode: "mock" };
  }

  const result = await sendViaSaungwa(normalizedPhone, message);
  return { sent: result.success, messageId: result.messageId, error: result.error, mode: "live" };
}

export async function sendCatalogAndTemplateMessage(
  phone: string,
  products: { id: string; name: string; price: number }[]
): Promise<WhatsAppSendResult> {
  const mode = getMode();
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) return { sent: false, error: "Invalid phone format", mode };

  const message = buildCatalogAndTemplateMessage(products);

  if (mode === "mock") {
    log.info("WhatsApp (mock): sendCatalogAndTemplateMessage", { to: normalizedPhone });
    return { sent: true, mode: "mock" };
  }

  const result = await sendViaSaungwa(normalizedPhone, message);
  return { sent: result.success, messageId: result.messageId, error: result.error, mode: "live" };
}

export async function sendInvalidOrderFormatMessage(phone: string): Promise<WhatsAppSendResult> {
  const mode = getMode();
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) return { sent: false, error: "Invalid phone format", mode };

  const message = "Mohon maaf, format pemesanan Anda tidak sesuai atau tidak lengkap. Silakan copy dan isi form pemesanan dengan benar.";

  if (mode === "mock") {
    log.info("WhatsApp (mock): sendInvalidOrderFormatMessage", { to: normalizedPhone });
    return { sent: true, mode: "mock" };
  }

  const result = await sendViaSaungwa(normalizedPhone, message);
  return { sent: result.success, messageId: result.messageId, error: result.error, mode: "live" };
}

export async function sendOrderCheckoutLink(
  phone: string,
  orderId: string,
  checkoutUrl: string
): Promise<WhatsAppSendResult> {
  const mode = getMode();
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) return { sent: false, error: "Invalid phone format", mode };

  const message = `Pesanan Anda (*${orderId}*) telah kami terima.\n\nSilakan selesaikan pembayaran melalui link berikut:\n${checkoutUrl}\n\nTerima kasih!`;

  if (mode === "mock") {
    log.info("WhatsApp (mock): sendOrderCheckoutLink", { to: normalizedPhone, orderId });
    return { sent: true, mode: "mock" };
  }

  const result = await sendViaSaungwa(normalizedPhone, message);
  return { sent: result.success, messageId: result.messageId, error: result.error, mode: "live" };
}