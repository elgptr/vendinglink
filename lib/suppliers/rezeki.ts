/**
 * Rezeki Shop Supplier Client
 *
 * Implements ISupplier for Rezeki Shop API.
 * API Key comes from REZEKI_API_KEY env var.
 */

import type {
  ISupplier,
  SupplierProduct,
  PurchaseOutcome,
  SupplierHealth,
} from "./types";

const TIMEOUT_MS = 45_000; // /v1/order hits upstream supplier and can be slow

function getApiKey(): string {
  const key = process.env.REZEKI_API_KEY;
  if (!key) throw new Error("REZEKI_API_KEY is not set");
  return key;
}

function getBaseUrl(): string {
  return process.env.REZEKI_API_URL || "https://api.prastyaaneki.biz.id";
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ── Rezeki supplier implementation ──────────────────────────────────────

export class RezekiSupplier implements ISupplier {
  readonly name = "REZEKI";

  /** GET /v1/balance — returns current balance */
  async checkBalance(): Promise<number> {
    const res = await fetchWithTimeout(`${getBaseUrl()}/v1/balance`, {
      headers: { "X-API-Key": getApiKey() },
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(`Rezeki /balance failed ${res.status}: ${body?.message ?? res.statusText}`);
    }

    const data = await res.json();
    return typeof data.balance === "number" ? data.balance : parseFloat(data.balance || "0");
  }

  /** GET /v1/products — full product catalog */
  async getProducts(): Promise<SupplierProduct[]> {
    const res = await fetchWithTimeout(`${getBaseUrl()}/v1/products`, {
      headers: { "X-API-Key": getApiKey() },
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(`Rezeki /products failed ${res.status}: ${body?.message ?? res.statusText}`);
    }

    const data = await res.json();
    const products = Array.isArray(data.products) ? data.products : (Array.isArray(data) ? data : (Array.isArray(data.data) ? data.data : []));

    return products.map((p: any) => {
      const inStock = p.availability === "in_stock";
      const stock = inStock ? (typeof p.stock === "number" && p.stock > 0 ? p.stock : 999) : 0;
      return {
        supplierId: String(p.id || p.product_id || ""),
        name: p.name || "Unknown Product",
        stock,
        price: Number(p.price_idr || p.price || 0),
        priceFrom: Number(p.price_idr || p.price || 0),
      };
    }).filter((p: SupplierProduct) => p.supplierId !== "");
  }

  /** GET /v1/products/{product_id} - check real-time product stock & availability */
  async checkProductStock(
    supplierProductId: string
  ): Promise<{ inStock: boolean; stock: number; price?: number } | null> {
    if (!supplierProductId) return null;
    try {
      const res = await fetchWithTimeout(
        `${getBaseUrl()}/v1/products/${encodeURIComponent(supplierProductId)}`,
        {
          headers: { "X-API-Key": getApiKey() },
          cache: "no-store",
        }
      );

      if (!res.ok) {
        if (res.status === 404) {
          return { inStock: false, stock: 0 };
        }
        return null;
      }

      const data = await res.json();
      const inStock = data.availability === "in_stock";
      const stock = inStock ? (typeof data.stock === "number" && data.stock > 0 ? data.stock : 999) : 0;

      return {
        inStock,
        stock,
        price: Number(data.price_idr || data.price || 0),
      };
    } catch (err) {
      console.error("[rezeki] checkProductStock error", { supplierProductId, err });
      return null;
    }
  }

  /**
   * POST /v1/order — purchase keys from Rezeki Shop.
   */
  async purchase(
    supplierProductId: string,
    quantity: number
  ): Promise<PurchaseOutcome> {
    if (process.env.REZEKI_ENABLED === "false") {
      return {
        success: false,
        code: "SUPPLIER_DISABLED",
        message: "Rezeki supplier is disabled via REZEKI_ENABLED=false",
      };
    }

    try {
      const res = await fetchWithTimeout(`${getBaseUrl()}/v1/order`, {
        method: "POST",
        headers: {
          "X-API-Key": getApiKey(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product_id: supplierProductId,
          quantity: quantity,
        }),
      });

      const raw = await res.json().catch(() => ({}));

      if (!res.ok) {
        let code: "OUT_OF_STOCK" | "INSUFFICIENT_BALANCE" | "INVALID_API_KEY" | "UNKNOWN" = "UNKNOWN";
        if (res.status === 400) code = "OUT_OF_STOCK";
        if (res.status === 402) code = "INSUFFICIENT_BALANCE";
        if (res.status === 401) code = "INVALID_API_KEY";
        // 404 = product hidden/not found, 422 = requires_email, 500/502 = upstream failure (refunded)
        console.error("[rezeki] order failed", { status: res.status, code, body: raw, productId: supplierProductId });

        return {
          success: false,
          code,
          message: raw.message || `HTTP Error ${res.status}`,
        };
      }

      // Success
      let items: string[] = [];
      if (Array.isArray(raw.delivered_keys)) {
        items = raw.delivered_keys;
      } else if (raw.delivered_key) {
        items = [raw.delivered_key];
      } else {
         return {
          success: false,
          code: "UNKNOWN",
          message: "API did not return delivered_key(s)",
        };
      }

      return {
        success: true,
        items,
        supplierOrderId: raw.order_id ? String(raw.order_id) : "rezeki-order",
        totalAmount: raw.balance?.balance_deducted || 0,
      };
    } catch (err) {
      console.error("[rezeki] order error", { productId: supplierProductId, baseUrl: getBaseUrl(), hasKey: !!process.env.REZEKI_API_KEY, err: err instanceof Error ? { name: err.name, message: err.message, cause: String((err as any).cause ?? "") } : String(err) });
      const isTimeout = err instanceof Error && (err.name === "AbortError" || err.message.includes("abort"));
      return {
        success: false,
        code: isTimeout ? "TIMEOUT" : "UNKNOWN",
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async isHealthy(): Promise<SupplierHealth> {
    try {
      const balance = await this.checkBalance();
      return { healthy: true, balance };
    } catch (err) {
      return {
        healthy: false,
        balance: null,
        reason: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

export const rezekiSupplier = new RezekiSupplier();
