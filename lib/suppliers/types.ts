/**
 * Supplier Abstraction Layer — Shared Types
 *
 * All external key suppliers (DigitalCore, future suppliers) implement
 * the ISupplier interface. The SupplierRouter selects the correct
 * supplier based on per-product config, so checkout logic never needs
 * to know which supplier is active.
 */

// ── Product as reported by an external supplier ──────────────────────────────

export interface SupplierProduct {
  /** Supplier-specific product slug / ID (e.g. "gemini_pro_18_months") */
  supplierId: string;
  /** Human-readable name */
  name: string;
  /** Available stock units */
  stock: number;
  /** Base price in the supplier's currency (USD for DigitalCore) */
  price: number;
  /** Lowest possible price after wholesale tier discount */
  priceFrom: number;
}

// ── Purchase result ───────────────────────────────────────────────────────────

export interface PurchaseResult {
  success: true;
  /** Delivered keys/links, one element per unit purchased */
  items: string[];
  /** Supplier-side order reference (for audit logs) */
  supplierOrderId: string;
  /** Cost actually charged to the supplier account (supplier's currency) */
  totalAmount: number;
}

export interface PurchaseError {
  success: false;
  /** Machine-readable error code (mirrors supplier error codes where possible) */
  code:
    | "OUT_OF_STOCK"
    | "INSUFFICIENT_BALANCE"
    | "INVALID_API_KEY"
    | "SUPPLIER_DISABLED"
    | "TIMEOUT"
    | "UNKNOWN";
  message: string;
}

export type PurchaseOutcome = PurchaseResult | PurchaseError;

// ── Supplier health ───────────────────────────────────────────────────────────

export interface SupplierHealth {
  healthy: boolean;
  /** Current balance in supplier currency (null if unknown) */
  balance: number | null;
  /** Short description of why the supplier is unhealthy (if applicable) */
  reason?: string;
}

// ── Core interface ────────────────────────────────────────────────────────────

export interface ISupplier {
  /**
   * Unique supplier name used in DB config and log messages.
   * Must match the `provider` column in SupplierConfig.
   */
  readonly name: string;

  /**
   * Return current account balance (in supplier currency).
   * Throws if the API call fails.
   */
  checkBalance(): Promise<number>;

  /**
   * Return the full product catalog available from this supplier.
   * Throws if the API call fails.
   */
  getProducts(): Promise<SupplierProduct[]>;

  /**
   * Purchase `quantity` units of `productId` from the supplier.
   * NEVER throws — always returns a PurchaseOutcome so callers
   * can handle both success and failure paths uniformly.
   */
  purchase(productId: string, quantity: number): Promise<PurchaseOutcome>;

  /**
   * Quick health-check: returns balance + reachability.
   * Should complete within ~5 seconds and never throw.
   */
  isHealthy(): Promise<SupplierHealth>;
}

// ── Supplier mode stored per product ─────────────────────────────────────────

export type SupplierMode =
  | "MANUAL"        // Use RedeemStock table (existing behaviour)
  | "DIGITALCORE"   // Buy automatically via DigitalCore API on checkout
  | "AUTO";         // Try MANUAL first; fallback to DIGITALCORE if out-of-stock
