import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { POST } from "@/app/api/admin/upload/route";
import {
  createMockUser,
  createMockProduct,
  cleanupTestDatabase,
} from "../helpers/fixtures";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

describe("api/admin/upload — admin-only file upload", () => {
  let prisma: PrismaClient;
  let auth: any;

  beforeAll(async () => {
    prisma = new PrismaClient();
    const authModule = await import("@/lib/auth");
    auth = authModule.auth;
  });

  afterAll(async () => {
    await cleanupTestDatabase(prisma);
    await prisma.$disconnect();
  });

  it("should reject unauthenticated request with 401", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null);

    const formData = new FormData();
    const blob = new Blob([Buffer.from([0x89, 0x50, 0x4e, 0x47])], {
      type: "image/png",
    });
    formData.append("file", blob, "test.png");

    const mockRequest = new NextRequest("http://localhost:3000/api/admin/upload", {
      method: "POST",
      body: formData,
    });

    const response = await POST(mockRequest);
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toContain("Unauthorized");
  });

  it("should reject non-admin user with 403", async () => {
    const agent = await createMockUser(prisma, {
      username: `agent-${Date.now()}`,
      passwordHash: "$2a$10$fakehash",
      role: "AGENT",
      isApproved: true,
    });

    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: agent.id, role: "AGENT" },
    } as any);

    const formData = new FormData();
    const blob = new Blob([Buffer.from([0x89, 0x50, 0x4e, 0x47])], {
      type: "image/png",
    });
    formData.append("file", blob, "test.png");

    const mockRequest = new NextRequest("http://localhost:3000/api/admin/upload", {
      method: "POST",
      body: formData,
    });

    const response = await POST(mockRequest);
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toContain("Forbidden");
  });

  it("should accept admin with mocked storage", async () => {
    const admin = await createMockUser(prisma, {
      username: `admin-${Date.now()}`,
      passwordHash: "$2a$10$fakehash",
      role: "ADMIN",
    });

    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: admin.id, role: "ADMIN" },
    } as any);

    // Mock uploadFile
    const uploadFileModule = await import("@/lib/storage");
    vi.spyOn(uploadFileModule, "uploadFile").mockResolvedValueOnce({
      url: "/uploads/test-abc123.png",
      size: 1024,
      mimeType: "image/png",
    });

    const formData = new FormData();
    const blob = new Blob([Buffer.from([0x89, 0x50, 0x4e, 0x47])], {
      type: "image/png",
    });
    formData.append("file", blob, "test-image.png");

    const mockRequest = new NextRequest("http://localhost:3000/api/admin/upload", {
      method: "POST",
      body: formData,
    });

    const response = await POST(mockRequest);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.url).toBe("/uploads/test-abc123.png");
  });

  it("should link uploaded image to product", async () => {
    const admin = await createMockUser(prisma, {
      username: `admin-product-${Date.now()}`,
      passwordHash: "$2a$10$fakehash",
      role: "ADMIN",
    });

    const product = await createMockProduct(prisma);

    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: admin.id, role: "ADMIN" },
    } as any);

    const uploadFileModule = await import("@/lib/storage");
    vi.spyOn(uploadFileModule, "uploadFile").mockResolvedValueOnce({
      url: "/uploads/product-guide.png",
      size: 2048,
      mimeType: "image/png",
    });

    const formData = new FormData();
    const blob = new Blob([Buffer.from([0x89, 0x50, 0x4e, 0x47])], {
      type: "image/png",
    });
    formData.append("file", blob, "guide.png");
    formData.append("productId", product.id);

    const mockRequest = new NextRequest("http://localhost:3000/api/admin/upload", {
      method: "POST",
      body: formData,
    });

    const response = await POST(mockRequest);
    expect(response.status).toBe(200);

    // Verify product was updated
    const updated = await prisma.product.findUnique({
      where: { id: product.id },
      select: { guideImageUrl: true },
    });

    expect(updated?.guideImageUrl).toBe("/uploads/product-guide.png");
  });
});
