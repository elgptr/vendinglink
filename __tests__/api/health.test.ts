import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before importing the route
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(),
  }),
}));

import { GET } from "@/app/api/admin/health/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = vi.mocked(auth);
const mockQueryRaw = vi.mocked(prisma.$queryRaw);

describe("GET /api/admin/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null as any);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 when user is not admin", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", role: "AGENT", name: "Test" },
    } as any);

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns healthy status when DB is connected", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", role: "ADMIN", name: "Admin" },
    } as any);
    mockQueryRaw.mockResolvedValue([{ 1: 1 }] as any);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("healthy");
    expect(body.checks.database.status).toBe("healthy");
    expect(body.checks.database.latencyMs).toBeTypeOf("number");
    expect(body.checks.memory.status).toBe("healthy");
    expect(body.checks.memory.heapUsedMB).toBeTypeOf("number");
    expect(body.uptimeSeconds).toBeTypeOf("number");
    expect(body.version).toBe("0.3.0");
  });

  it("returns unhealthy when DB query fails", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", role: "ADMIN", name: "Admin" },
    } as any);
    mockQueryRaw.mockRejectedValue(new Error("Connection refused"));

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.status).toBe("unhealthy");
    expect(body.checks.database.status).toBe("unhealthy");
    expect(body.checks.database.error).toBe("Connection refused");
  });

  it("returns proper response structure", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", role: "ADMIN", name: "Admin" },
    } as any);
    mockQueryRaw.mockResolvedValue([{ 1: 1 }] as any);

    const res = await GET();
    const body = await res.json();

    expect(body).toHaveProperty("status");
    expect(body).toHaveProperty("timestamp");
    expect(body).toHaveProperty("uptimeSeconds");
    expect(body).toHaveProperty("version");
    expect(body).toHaveProperty("checks");
    expect(body.checks).toHaveProperty("database");
    expect(body.checks).toHaveProperty("memory");
  });
});
