import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { NextRequest } from "next/server";
import { GET, POST, PATCH, DELETE } from "@/app/api/admin/categories/route";
import { createMockUser, cleanupTestDatabase } from "../helpers/fixtures";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/adminRateLimit", () => ({
  checkAdminRateLimit: () => ({ allowed: true }),
}));

function jsonRequest(method: string, url: string, body?: unknown) {
  return new NextRequest(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function uniqueSlug(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

describe("api/admin/categories", () => {
  let prisma: PrismaClient;
  let auth: ReturnType<typeof vi.fn>;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await cleanupTestDatabase(prisma);
    const authModule = await import("@/lib/auth");
    auth = authModule.auth as ReturnType<typeof vi.fn>;
  });

  afterAll(async () => {
    await cleanupTestDatabase(prisma);
    await prisma.$disconnect();
  });

  beforeEach(() => {
    auth.mockReset();
  });

  it("rejects unauthenticated GET with 403", async () => {
    auth.mockResolvedValueOnce(null);
    const res = await GET(new NextRequest("http://localhost:3000/api/admin/categories"));
    expect(res.status).toBe(403);
  });

  it("lists categories for admin", async () => {
    const admin = await createMockUser(prisma, { role: "ADMIN" });
    auth.mockResolvedValueOnce({ user: { id: admin.id, role: "ADMIN" } });

    const slug = uniqueSlug("ai-tools");
    await prisma.category.create({ data: { slug, name: "AI Tools" } });

    const res = await GET(new NextRequest("http://localhost:3000/api/admin/categories"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.some((c: { slug: string }) => c.slug === slug)).toBe(true);
  });

  it("creates a category for admin", async () => {
    const admin = await createMockUser(prisma, { role: "ADMIN" });
    auth.mockResolvedValueOnce({ user: { id: admin.id, role: "ADMIN" } });

    const slug = uniqueSlug("subscription");
    const res = await POST(
      jsonRequest("POST", "http://localhost:3000/api/admin/categories", {
        name: "Subscription",
        slug,
      })
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.slug).toBe(slug);
  });

  it("rejects invalid slug", async () => {
    const admin = await createMockUser(prisma, { role: "ADMIN" });
    auth.mockResolvedValueOnce({ user: { id: admin.id, role: "ADMIN" } });

    const res = await POST(
      jsonRequest("POST", "http://localhost:3000/api/admin/categories", {
        name: "Bad Slug",
        slug: "Bad_Slug",
      })
    );
    expect(res.status).toBe(400);
  });

  it("updates a category", async () => {
    const admin = await createMockUser(prisma, { role: "ADMIN" });
    auth.mockResolvedValueOnce({ user: { id: admin.id, role: "ADMIN" } });

    const slug = uniqueSlug("edit-me");
    const category = await prisma.category.create({ data: { slug, name: "Edit Me" } });
    const res = await PATCH(
      jsonRequest("PATCH", "http://localhost:3000/api/admin/categories", {
        id: category.id,
        name: "Updated",
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe("Updated");
  });

  it("prevents self-parenting", async () => {
    const admin = await createMockUser(prisma, { role: "ADMIN" });
    auth.mockResolvedValueOnce({ user: { id: admin.id, role: "ADMIN" } });

    const slug = uniqueSlug("self-parent");
    const category = await prisma.category.create({ data: { slug, name: "Self Parent" } });
    const res = await PATCH(
      jsonRequest("PATCH", "http://localhost:3000/api/admin/categories", {
        id: category.id,
        parentId: category.id,
      })
    );
    expect(res.status).toBe(400);
  });

  it("prevents deleting category with children", async () => {
    const admin = await createMockUser(prisma, { role: "ADMIN" });
    auth.mockResolvedValueOnce({ user: { id: admin.id, role: "ADMIN" } });

    const parentSlug = uniqueSlug("parent-cat");
    const childSlug = uniqueSlug("child-cat");
    const parent = await prisma.category.create({ data: { slug: parentSlug, name: "Parent" } });
    await prisma.category.create({ data: { slug: childSlug, name: "Child", parentId: parent.id } });

    const res = await DELETE(
      new NextRequest(`http://localhost:3000/api/admin/categories?id=${parent.id}`)
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("sub-kategori");
  });
});
