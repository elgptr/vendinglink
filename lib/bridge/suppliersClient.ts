import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "bridge-suppliers-client" });

function getBridgeBaseUrl(): string {
  return process.env.BRIDGE_URL || "http://localhost:5000";
}

function getBridgeSecretKey(): string {
  return process.env.BRIDGE_SECRET_KEY || "";
}

export interface BridgeSupplier {
  code: string;
  displayName: string;
  baseUrl: string;
  authType: string;
  status: 'PENDING_VALIDATION' | 'ACTIVE' | 'PAUSED' | 'DEPRECATED' | 'NEEDS_REVIEW';
  descriptor: Record<string, any>;
  credentialsMasked: string;
  lastError?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BridgeBuiltInSupplier {
  code: string;
  displayName: string;
  isBuiltIn: boolean;
}

export interface CreateSupplierInput {
  code: string;
  displayName: string;
  baseUrl: string;
  authType?: string;
  credentials: Record<string, any> | string;
  descriptor: Record<string, any> | string;
  validateImmediately?: boolean;
}

export interface SupplierValidationSummary {
  success: boolean;
  code: string;
  balance?: number;
  productCount?: number;
  error?: string;
  checkedAt: string;
}

/**
 * Fetch all registered dynamic suppliers and built-ins from Bridge
 */
export async function fetchBridgeSuppliers(): Promise<{
  suppliers: BridgeSupplier[];
  builtIns: BridgeBuiltInSupplier[];
  error?: string;
}> {
  const baseUrl = getBridgeBaseUrl();
  const secretKey = getBridgeSecretKey();

  try {
    const url = `${baseUrl.replace(/\/$/, "")}/api/v1/suppliers`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      log.warn("Failed to fetch suppliers from bridge", { status: res.status });
      return { suppliers: [], builtIns: [], error: `HTTP ${res.status}` };
    }

    const data = await res.json();
    return {
      suppliers: data.suppliers || [],
      builtIns: data.builtIns || [],
    };
  } catch (error) {
    log.error("Failed to connect to bridge for suppliers list", {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      suppliers: [],
      builtIns: [],
      error: error instanceof Error ? error.message : "Gagal terhubung ke Bridge server",
    };
  }
}

/**
 * Fetch single supplier detail + current balance from Bridge
 */
export async function fetchBridgeSupplier(code: string): Promise<{
  supplier: BridgeSupplier | null;
  currentBalance: number | null;
  error?: string;
}> {
  const baseUrl = getBridgeBaseUrl();
  const secretKey = getBridgeSecretKey();

  try {
    const url = `${baseUrl.replace(/\/$/, "")}/api/v1/suppliers/${encodeURIComponent(code)}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return { supplier: null, currentBalance: null, error: `HTTP ${res.status}` };
    }

    const data = await res.json();
    return {
      supplier: data.supplier,
      currentBalance: data.currentBalance ?? null,
    };
  } catch (error) {
    return {
      supplier: null,
      currentBalance: null,
      error: error instanceof Error ? error.message : "Gagal terhubung ke Bridge server",
    };
  }
}

/**
 * Register a new supplier on Bridge
 */
export async function createBridgeSupplier(input: CreateSupplierInput): Promise<{
  success: boolean;
  supplier?: BridgeSupplier;
  validation?: SupplierValidationSummary | null;
  error?: string;
}> {
  const baseUrl = getBridgeBaseUrl();
  const secretKey = getBridgeSecretKey();

  try {
    const url = `${baseUrl.replace(/\/$/, "")}/api/v1/suppliers`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secretKey}`,
      },
      body: JSON.stringify(input),
    });

    const data = await res.json().catch(() => ({}));

    if (res.status === 201 || res.status === 200) {
      return {
        success: true,
        supplier: data.supplier,
        validation: data.validation,
      };
    }

    return {
      success: false,
      error: data.error || (data.details ? JSON.stringify(data.details) : `HTTP ${res.status}`),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal menghubungi Bridge server",
    };
  }
}

/**
 * Update an existing supplier on Bridge (e.g. pause, resume, edit descriptor)
 */
export async function updateBridgeSupplier(
  code: string,
  payload: Partial<{
    displayName: string;
    baseUrl: string;
    authType: string;
    credentials: any;
    descriptor: any;
    status: string;
  }>
): Promise<{
  success: boolean;
  supplier?: BridgeSupplier;
  error?: string;
}> {
  const baseUrl = getBridgeBaseUrl();
  const secretKey = getBridgeSecretKey();

  try {
    const url = `${baseUrl.replace(/\/$/, "")}/api/v1/suppliers/${encodeURIComponent(code)}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secretKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      return {
        success: true,
        supplier: data.supplier,
      };
    }

    return {
      success: false,
      error: data.error || `HTTP ${res.status}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal menghubungi Bridge server",
    };
  }
}

/**
 * Trigger on-demand dry-run validation for a supplier on Bridge
 */
export async function validateBridgeSupplier(code: string): Promise<{
  success: boolean;
  supplier?: BridgeSupplier;
  validation?: SupplierValidationSummary;
  error?: string;
}> {
  const baseUrl = getBridgeBaseUrl();
  const secretKey = getBridgeSecretKey();

  try {
    const url = `${baseUrl.replace(/\/$/, "")}/api/v1/suppliers/${encodeURIComponent(code)}/validate`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      return {
        success: data.validation?.success ?? true,
        supplier: data.supplier,
        validation: data.validation,
      };
    }

    return {
      success: false,
      error: data.error || `HTTP ${res.status}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal menghubungi Bridge server",
    };
  }
}
