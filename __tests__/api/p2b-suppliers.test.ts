import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Stub lib/auth getClientIp to avoid next-auth ESM Vitest loader issue
vi.mock("@/lib/auth", () => ({
  getClientIp: (r: NextRequest) =>
    r.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    r.headers.get("x-real-ip") ||
    "127.0.0.1",
}));

const {
  fetchBridgeSuppliersMock,
  fetchBridgeSupplierMock,
  createBridgeSupplierMock,
  updateBridgeSupplierMock,
  validateBridgeSupplierMock,
  checkBalanceMock,
} = vi.hoisted(() => ({
  fetchBridgeSuppliersMock: vi.fn(),
  fetchBridgeSupplierMock: vi.fn(),
  createBridgeSupplierMock: vi.fn(),
  updateBridgeSupplierMock: vi.fn(),
  validateBridgeSupplierMock: vi.fn(),
  checkBalanceMock: vi.fn().mockResolvedValue(150000),
}));

vi.mock("@/lib/suppliers", () => ({
  rezekiSupplier: {
    name: "Rezeki Shop",
    checkBalance: checkBalanceMock,
  },
}));

vi.mock("@/lib/bridge/suppliersClient", () => ({
  fetchBridgeSuppliers: fetchBridgeSuppliersMock,
  fetchBridgeSupplier: fetchBridgeSupplierMock,
  createBridgeSupplier: createBridgeSupplierMock,
  updateBridgeSupplier: updateBridgeSupplierMock,
  validateBridgeSupplier: validateBridgeSupplierMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    supplierProductMapping: {
      findMany: vi.fn().mockResolvedValue([
        {
          supplierCode: "RZK",
          supplierProductId: "item_01",
          productId: "prod_01",
          product: { id: "prod_01", name: "Produk 1" },
        },
      ]),
      create: vi.fn().mockImplementation(({ data }) =>
        Promise.resolve({ ...data, product: { id: data.productId, name: "New Prod" } })
      ),
      delete: vi.fn().mockResolvedValue({}),
    },
    product: {
      findMany: vi.fn().mockResolvedValue([{ id: "prod_01", name: "Produk 1", supplierProductId: null }]),
    },
  },
}));

import { GET, POST, PATCH } from "@/app/api/admin/suppliers/route";
import { POST as POSTValidate } from "@/app/api/admin/suppliers/[code]/validate/route";

describe("P2b Admin Dynamic Suppliers API & Bridge Proxy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/admin/suppliers", () => {
    it("returns product mappings, products, and dynamic suppliers from Bridge", async () => {
      fetchBridgeSuppliersMock.mockResolvedValueOnce({
        suppliers: [
          {
            code: "DGF",
            displayName: "Digiflazz",
            baseUrl: "https://api.digiflazz.test",
            authType: "API_KEY",
            status: "ACTIVE",
            descriptor: { version: "1.0" },
            credentialsMasked: "••••••••",
            lastError: null,
          },
        ],
        builtIns: [
          { code: "RZK", displayName: "Rezeki Shop", isBuiltIn: true },
          { code: "PDA", displayName: "Prime Digital", isBuiltIn: true },
          { code: "DAI", displayName: "Digital AI Store", isBuiltIn: true },
        ],
      });

      const req = new NextRequest("http://localhost:3000/api/admin/suppliers");
      const res = await GET(req);

      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.mappings).toHaveLength(1);
      expect(data.products).toHaveLength(1);
      expect(data.suppliers).toHaveLength(1);
      expect(data.suppliers[0].code).toBe("DGF");
      expect(data.suppliers[0].credentialsMasked).toBe("••••••••");
      expect(data.builtIns).toHaveLength(3);
    });

    it("returns real-time balances for all registered suppliers when action=balances", async () => {
      fetchBridgeSuppliersMock.mockResolvedValueOnce({
        suppliers: [
          { code: "DGF", displayName: "Digiflazz" },
        ],
      });
      fetchBridgeSupplierMock.mockImplementation((code: string) => {
        if (code === "DGF") return Promise.resolve({ currentBalance: 320000 });
        if (code === "PDA") return Promise.resolve({ currentBalance: 50000 });
        return Promise.resolve({ currentBalance: null });
      });

      const req = new NextRequest("http://localhost:3000/api/admin/suppliers?action=balances");
      const res = await GET(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.balances.RZK.balance).toBe(150000);
      expect(data.balances.RZK.status).toBe("OK");
      expect(data.balances.DGF.balance).toBe(320000);
    });
  });

  describe("POST /api/admin/suppliers (create_supplier)", () => {
    it("validates and forwards new supplier registration to Bridge client", async () => {
      createBridgeSupplierMock.mockResolvedValueOnce({
        success: true,
        supplier: {
          code: "VIP",
          displayName: "VIP Reseller",
          baseUrl: "https://api.vip.test",
          authType: "API_KEY",
          status: "ACTIVE",
          credentialsMasked: "••••••••",
        },
        validation: {
          success: true,
          code: "VIP",
          balance: 500000,
          productCount: 20,
        },
      });

      const body = {
        action: "create_supplier",
        code: "VIP",
        displayName: "VIP Reseller",
        baseUrl: "https://api.vip.test",
        authType: "API_KEY",
        credentials: { apiKey: "vip-secret" },
        descriptor: { version: "1.0" },
        validateImmediately: true,
      };

      const req = new NextRequest("http://localhost:3000/api/admin/suppliers", {
        method: "POST",
        body: JSON.stringify(body),
      });

      const res = await POST(req);
      expect(res.status).toBe(201);
      const data = await res.json();

      expect(data.supplier.code).toBe("VIP");
      expect(data.validation.success).toBe(true);
      expect(createBridgeSupplierMock).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "VIP",
          displayName: "VIP Reseller",
        })
      );
    });

    it("returns 400 when required fields are missing", async () => {
      const body = {
        action: "create_supplier",
        code: "VIP",
        // missing displayName, baseUrl, credentials, descriptor
      };

      const req = new NextRequest("http://localhost:3000/api/admin/suppliers", {
        method: "POST",
        body: JSON.stringify(body),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Field supplier tidak lengkap");
    });
  });

  describe("PATCH /api/admin/suppliers", () => {
    it("updates supplier status (e.g. PAUSED / ACTIVE) via Bridge", async () => {
      updateBridgeSupplierMock.mockResolvedValueOnce({
        success: true,
        supplier: {
          code: "VIP",
          status: "PAUSED",
        },
      });

      const req = new NextRequest("http://localhost:3000/api/admin/suppliers", {
        method: "PATCH",
        body: JSON.stringify({
          code: "VIP",
          status: "PAUSED",
        }),
      });

      const res = await PATCH(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.supplier.status).toBe("PAUSED");
    });
  });

  describe("POST /api/admin/suppliers/[code]/validate", () => {
    it("triggers on-demand dry-run validation for a supplier", async () => {
      validateBridgeSupplierMock.mockResolvedValueOnce({
        success: true,
        validation: {
          success: true,
          code: "DGF",
          balance: 750000,
          productCount: 45,
          checkedAt: new Date().toISOString(),
        },
      });

      const req = new NextRequest("http://localhost:3000/api/admin/suppliers/DGF/validate", {
        method: "POST",
      });

      const res = await POSTValidate(req, {
        params: Promise.resolve({ code: "DGF" }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.validation.balance).toBe(750000);
      expect(validateBridgeSupplierMock).toHaveBeenCalledWith("DGF");
    });
  });
});
