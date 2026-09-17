import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/webhooks/saungwa/route";
import { prisma } from "@/lib/prisma";
import * as whatsappService from "@/lib/whatsapp";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    transaction: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/whatsapp", () => ({
  sendEmptyStockMessage: vi.fn(),
  sendCatalogAndTemplateMessage: vi.fn(),
  sendInvalidOrderFormatMessage: vi.fn(),
  sendOrderCheckoutLink: vi.fn(),
}));

vi.mock("@/lib/utils", () => ({
  generateOrderId: vi.fn(() => "VM-12345"),
}));

describe("SaungWA Webhook POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createRequest = (body: any) => {
    return new NextRequest("http://localhost:3000/api/webhooks/saungwa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  };

  it("handles 'beli' keyword when stock is empty", async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([]);

    const req = createRequest({ from: "6281234567890", message: "halo mau beli dong" });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(prisma.product.findMany).toHaveBeenCalled();
    expect(whatsappService.sendEmptyStockMessage).toHaveBeenCalledWith("6281234567890");
  });

  it("handles 'katalog' keyword when products exist", async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([
      { id: "1", name: "Kopi", price: 15000, code: "KOPI-01" } as any,
    ]);

    const req = createRequest({ from: "6281234567890", message: "minta KATALOG" });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(whatsappService.sendCatalogAndTemplateMessage).toHaveBeenCalledWith(
      "6281234567890",
      expect.any(Array)
    );
  });

  it("handles valid order form submission", async () => {
    const orderMessage = `
--- FORM PEMESANAN ---
Nama Pemesan : John Doe
Nama Produk : Kopi
Jumlah : 1
Kode Promo (opsional) : 
Pembayaran : QRIS
------------------------
    `.trim();

    vi.mocked(prisma.product.findFirst).mockResolvedValue({ id: "1", price: 15000 } as any);
    vi.mocked(prisma.transaction.create).mockResolvedValue({ orderId: "VM-12345" } as any);

    const req = createRequest({ from: "6281234567890", message: orderMessage });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(prisma.transaction.create).toHaveBeenCalled();
    expect(whatsappService.sendOrderCheckoutLink).toHaveBeenCalledWith(
      "6281234567890",
      "VM-12345",
      expect.stringContaining("?show_qr=true")
    );
  });

  it("handles invalid order form submission", async () => {
    const orderMessage = `
--- FORM PEMESANAN ---
Nama Pemesan : 
Nama Produk : 
Jumlah : 
Kode Promo (opsional) : 
Pembayaran : QRIS
------------------------
    `.trim();

    const req = createRequest({ from: "6281234567890", message: orderMessage });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(whatsappService.sendInvalidOrderFormatMessage).toHaveBeenCalledWith("6281234567890");
  });

  it("ignores unknown messages", async () => {
    const req = createRequest({ from: "6281234567890", message: "halo selamat pagi" });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(prisma.product.findMany).not.toHaveBeenCalled();
  });
});
