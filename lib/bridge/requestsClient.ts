import crypto from "crypto";
import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "bridge-requests-client" });

function getBridgeBaseUrl(): string {
  return process.env.BRIDGE_URL || "http://localhost:5000";
}

function getBridgeSecretKey(): string {
  return process.env.BRIDGE_SECRET_KEY || "";
}

export interface CreateProductRequestInput {
  customerRef: string;
  query: string;
  productId?: string | null;
  categorySlug?: string | null;
  maxBudget?: number | null;
}

export interface CreateProductRequestResult {
  success: boolean;
  requestId?: string;
  status?: string;
  message?: string;
  error?: string;
}

export interface ConfirmProductRequestResult {
  success: boolean;
  transactionId?: string;
  status?: string;
  error?: string;
}

/**
 * Kirim permintaan pengadaan produk baru ke Bridge (POST /api/v1/requests)
 */
export async function createBridgeProductRequest(
  input: CreateProductRequestInput
): Promise<CreateProductRequestResult> {
  const baseUrl = getBridgeBaseUrl();
  const secretKey = getBridgeSecretKey();
  const idempotencyKey = crypto.randomUUID();

  try {
    const url = `${baseUrl.replace(/\/$/, "")}/api/v1/requests`;
    log.info("Sending product search request to bridge", {
      url,
      customerRef: input.customerRef,
      query: input.query,
      productId: input.productId,
    });

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secretKey}`,
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        customerRef: input.customerRef,
        query: input.query,
        vlProductId: input.productId || undefined,
        categorySlug: input.categorySlug || undefined,
        maxBudget: input.maxBudget || undefined,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.status === 202 || res.status === 200) {
      return {
        success: true,
        requestId: data.requestId || data.id,
        status: data.status || "SEARCHING",
        message: data.message || "Pencarian produk sedang diproses",
      };
    }

    log.warn("Bridge rejected product search request", {
      status: res.status,
      data,
    });

    return {
      success: false,
      error: data.message || data.error || `HTTP ${res.status}`,
    };
  } catch (error) {
    log.error("Failed to connect to bridge for product search", {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal terhubung ke Bridge server",
    };
  }
}

/**
 * Konfirmasi pembelian penawaran produk ke Bridge (POST /api/v1/requests/:id/confirm)
 */
export async function confirmBridgeProductRequest(
  requestId: string
): Promise<ConfirmProductRequestResult> {
  const baseUrl = getBridgeBaseUrl();
  const secretKey = getBridgeSecretKey();

  try {
    const url = `${baseUrl.replace(/\/$/, "")}/api/v1/requests/${encodeURIComponent(requestId)}/confirm`;
    log.info("Sending product request confirmation to bridge", { requestId, url });

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secretKey}`,
      },
    });

    const data = await res.json().catch(() => ({}));

    if (res.status === 200 || res.status === 201) {
      return {
        success: true,
        transactionId: data.transactionId,
        status: data.status || "CONFIRMED",
      };
    }

    log.warn("Bridge rejected request confirmation", {
      status: res.status,
      requestId,
      data,
    });

    return {
      success: false,
      error: data.message || data.error || `HTTP ${res.status}`,
    };
  } catch (error) {
    log.error("Failed to connect to bridge for request confirmation", {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal terhubung ke Bridge server",
    };
  }
}
