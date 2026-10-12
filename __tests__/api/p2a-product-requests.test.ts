import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";

// Stub lib/auth getClientIp to avoid next-auth ESM Vitest loader issue
vi.mock("@/lib/auth", () => ({
  getClientIp: (r: NextRequest) =>
    r.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    r.headers.get("x-real-ip") ||
    "127.0.0.1",
}));

const {
  sendProductFoundNotificationMock,
  sendProductStatusNotificationMock,
  createBridgeProductRequestMock,
  confirmBridgeProductRequestMock,
} = vi.hoisted(() => ({
  sendProductFoundNotificationMock: vi.fn().mockResolvedValue({ sent: true, mode: "mock" }),
  sendProductStatusNotificationMock: vi.fn().mockResolvedValue({ sent: true, mode: "mock" }),
  createBridgeProductRequestMock: vi.fn().mockResolvedValue({
    success: true,
    requestId: "brg-req-mock-12345",
    status: "SEARCHING",
  }),
  confirmBridgeProductRequestMock: vi.fn().mockResolvedValue({
    success: true,
    transactionId: "BRG-20261012-MOCKTX",
    status: "CONFIRMED",
  }),
}));

vi.mock("@/lib/whatsapp", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/whatsapp")>();
  return {
    ...actual,
    sendProductFoundNotification: sendProductFoundNotificationMock,
    sendProductStatusNotification: sendProductStatusNotificationMock,
  };
});

vi.mock("@/lib/bridge/requestsClient", () => ({
  createBridgeProductRequest: (...args: unknown[]) => createBridgeProductRequestMock(...args),
  confirmBridgeProductRequest: (...args: unknown[]) => confirmBridgeProductRequestMock(...args),
}));

import { POST as customerSubmitHandler } from "@/app/api/customer/product-requests/route";
import { POST as webhookUpdateHandler } from "@/app/api/bridge/webhook/request-update/route";
import { POST as customerConfirmHandler } from "@/app/api/customer/product-requests/[id]/confirm/route";

describe("Sprint P2a Storefront: Product Request, Webhook & Confirmation", () => {
  const prisma = new PrismaClient();
  const TEST_SECRET = "test_bridge_secret_p2a_778899";
  const originalEnv = process.env;

  let testProduct: { id: string; name: string; price: number };

  beforeAll(async () => {
    testProduct = await prisma.product.create({
      data: {
        name: `Test AI Tool Out-Of-Stock ${Date.now()}`,
        price: 150000,
        type: "LINK",
        supplierMode: "MANUAL",
      },
    });
  });

  afterAll(async () => {
    await prisma.customerProductRequest.deleteMany({
      where: { customerPhone: "6281234567890" },
    });
    await prisma.product.deleteMany({
      where: { id: testProduct.id },
    });
    await prisma.$disconnect();
  });

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      BRIDGE_SECRET_KEY: TEST_SECRET,
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  function createBridgeRequest(body: object, secret?: string) {
    const headers = new Headers({
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret ?? TEST_SECRET}`,
    });
    return new NextRequest("http://localhost:3000/api/bridge/webhook/request-update", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  }

  // ── ST-P2a-1: Customer Submit Request ─────────────────────────────────────
  it("ST-P2a-1: Customer berhasil membuat request produk dan status tercatat SEARCHING", async () => {
    const req = new NextRequest("http://localhost:3000/api/customer/product-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerPhone: "081234567890",
        productName: testProduct.name,
        productId: testProduct.id,
        categorySlug: "ai-tools",
        maxBudget: 150000,
      }),
    });

    const res = await customerSubmitHandler(req);
    expect(res.status).toBe(202);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.bridgeRequestId).toBe("brg-req-mock-12345");
    expect(json.status).toBe("SEARCHING");

    // Verify DB
    const saved = await prisma.customerProductRequest.findUnique({
      where: { id: json.id },
    });
    expect(saved).toBeDefined();
    expect(saved?.customerPhone).toBe("6281234567890");
    expect(saved?.status).toBe("SEARCHING");
    expect(saved?.bridgeRequestId).toBe("brg-req-mock-12345");
  });

  it("ST-P2a-1: Menolak nomor WhatsApp tidak valid", async () => {
    const req = new NextRequest("http://localhost:3000/api/customer/product-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerPhone: "123", // invalid
        productName: testProduct.name,
      }),
    });

    const res = await customerSubmitHandler(req);
    expect(res.status).toBe(400);
  });

  // ── ST-P2a-2 & ST-P2a-3: Webhook Receiver & WhatsApp Forwarding ────────────
  it("ST-P2a-2: Webhook request-update menolak request tanpa Bearer token valid", async () => {
    const req = createBridgeRequest(
      { requestId: "mock-123", status: "FOUND" },
      "wrong-secret"
    );

    const res = await webhookUpdateHandler(req);
    expect(res.status).toBe(401);
  });

  it("ST-P2a-2 & ST-P2a-3: Webhook status FOUND mengupdate harga dan memicu WhatsApp penawaran", async () => {
    // Seed a request
    const seeded = await prisma.customerProductRequest.create({
      data: {
        customerPhone: "6281234567890",
        customerRef: "cust_seed_test_1",
        productName: testProduct.name,
        productId: testProduct.id,
        bridgeRequestId: `brg-seed-found-${Date.now()}`,
        status: "SEARCHING",
      },
    });

    const req = createBridgeRequest({
      requestId: seeded.bridgeRequestId!,
      status: "FOUND",
      quotedPrice: 135000,
      foundSupplierCode: "RZK",
      foundProductId: "rzk-ai-001",
    });

    const res = await webhookUpdateHandler(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.status).toBe("FOUND");

    // Check DB record
    const updated = await prisma.customerProductRequest.findUnique({
      where: { id: seeded.id },
    });
    expect(updated?.status).toBe("FOUND");
    expect(updated?.quotedPrice).toBe(135000);
    expect(updated?.foundSupplierCode).toBe("RZK");
    expect(updated?.notifiedAt).toBeDefined();

    // Check WhatsApp notification called
    expect(sendProductFoundNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        customerPhone: "6281234567890",
        productName: testProduct.name,
        quotedPrice: 135000,
        confirmationUrl: `http://localhost:3000/request-confirm/${seeded.id}`,
      })
    );
  });

  it("ST-P2a-2 & ST-P2a-3: Webhook status REJECTED mengupdate reason dan memicu notifikasi pembatalan", async () => {
    const seeded = await prisma.customerProductRequest.create({
      data: {
        customerPhone: "6281234567890",
        customerRef: "cust_seed_test_rej",
        productName: testProduct.name,
        bridgeRequestId: `brg-seed-rej-${Date.now()}`,
        status: "SEARCHING",
      },
    });

    const req = createBridgeRequest({
      requestId: seeded.bridgeRequestId!,
      status: "REJECTED",
      rejectionReason: "Plafon belanja harian terlampaui",
    });

    const res = await webhookUpdateHandler(req);
    expect(res.status).toBe(200);

    const updated = await prisma.customerProductRequest.findUnique({
      where: { id: seeded.id },
    });
    expect(updated?.status).toBe("REJECTED");
    expect(updated?.rejectionReason).toBe("Plafon belanja harian terlampaui");

    expect(sendProductStatusNotificationMock).toHaveBeenCalledWith(
      "6281234567890",
      testProduct.name,
      "REJECTED",
      "Plafon belanja harian terlampaui"
    );
  });

  // ── ST-P2a-4: Customer Confirmation ──────────────────────────────────────
  it("ST-P2a-4: Customer mengonfirmasi pesanan FOUND dan trigger confirm ke Bridge", async () => {
    const seeded = await prisma.customerProductRequest.create({
      data: {
        customerPhone: "6281234567890",
        customerRef: "cust_seed_confirm",
        productName: testProduct.name,
        bridgeRequestId: `brg-seed-confirm-${Date.now()}`,
        status: "FOUND",
        quotedPrice: 120000,
      },
    });

    const req = new NextRequest(`http://localhost:3000/api/customer/product-requests/${seeded.id}/confirm`, {
      method: "POST",
    });

    const res = await customerConfirmHandler(req, {
      params: Promise.resolve({ id: seeded.id }),
    });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.status).toBe("CONFIRMED");
    expect(json.transactionId).toBe("BRG-20261012-MOCKTX");

    // Verify DB update
    const confirmed = await prisma.customerProductRequest.findUnique({
      where: { id: seeded.id },
    });
    expect(confirmed?.status).toBe("CONFIRMED");
    expect(confirmed?.transactionId).toBe("BRG-20261012-MOCKTX");
    expect(confirmed?.confirmedAt).toBeDefined();

    // Verify Bridge client was called with bridgeRequestId
    expect(confirmBridgeProductRequestMock).toHaveBeenCalledWith(seeded.bridgeRequestId);
  });

  it("ST-P2a-4: Menolak konfirmasi jika request masih berstatus SEARCHING", async () => {
    const seeded = await prisma.customerProductRequest.create({
      data: {
        customerPhone: "6281234567890",
        customerRef: "cust_seed_searching",
        productName: testProduct.name,
        bridgeRequestId: `brg-seed-search-${Date.now()}`,
        status: "SEARCHING",
      },
    });

    const req = new NextRequest(`http://localhost:3000/api/customer/product-requests/${seeded.id}/confirm`, {
      method: "POST",
    });

    const res = await customerConfirmHandler(req, {
      params: Promise.resolve({ id: seeded.id }),
    });
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toContain("FOUND");
  });
});
