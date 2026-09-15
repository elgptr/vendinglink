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
  }),
}));

import { GET } from "@/app/api/admin/health/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = vi.mocked(auth);
const mockQueryRaw = vi.mocked(prisma.$queryRaw);

describe("GET /api/admin/health — Extended Scenarios", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Database Latency Checks", () => {
    it("records latency in milliseconds", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "1", role: "ADMIN", name: "Admin" },
      } as any);
      mockQueryRaw.mockResolvedValue([{ 1: 1 }] as any);

      const res = await GET();
      const body = await res.json();

      expect(body.checks.database.latencyMs).toBeTypeOf("number");
      expect(body.checks.database.latencyMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Memory Check Edge Cases", () => {
    it("includes heap memory metrics in response", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "1", role: "ADMIN", name: "Admin" },
      } as any);
      mockQueryRaw.mockResolvedValue([{ 1: 1 }] as any);

      const res = await GET();
      const body = await res.json();

      expect(body.checks.memory.heapUsedMB).toBeTypeOf("number");
      expect(body.checks.memory.heapTotalMB).toBeTypeOf("number");
      expect(body.checks.memory.heapUsedMB).toBeGreaterThan(0);
      expect(body.checks.memory.heapTotalMB).toBeGreaterThan(0);
    });

    it("marks degraded when heap >90%", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "1", role: "ADMIN", name: "Admin" },
      } as any);
      mockQueryRaw.mockResolvedValue([{ 1: 1 }] as any);

      const res = await GET();
      const body = await res.json();

      const ratio = body.checks.memory.heapUsedMB / body.checks.memory.heapTotalMB;
      if (ratio > 0.9) {
        expect(body.checks.memory.status).toBe("degraded");
      } else {
        expect(body.checks.memory.status).toBe("healthy");
      }
    });
  });

  describe("Overall Status Determination", () => {
    it("returns unhealthy when database fails", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "1", role: "ADMIN", name: "Admin" },
      } as any);
      mockQueryRaw.mockRejectedValue(new Error("Connection timeout"));

      const res = await GET();
      const body = await res.json();

      expect(body.status).toBe("unhealthy");
      expect(res.status).toBe(503);
    });
  });

  describe("Error Handling", () => {
    it("returns structured error response on auth failure", async () => {
      mockAuth.mockRejectedValue(new Error("Auth system failure"));

      const res = await GET();
      const body = await res.json();

      expect(res.status).toBe(503);
      expect(body.status).toBe("unhealthy");
      expect(body.error).toBeDefined();
    });

    it("includes version and timestamp", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "1", role: "ADMIN", name: "Admin" },
      } as any);
      mockQueryRaw.mockResolvedValue([{ 1: 1 }] as any);

      const res = await GET();
      const body = await res.json();

      expect(body.version).toBe("0.3.0");
      expect(body.timestamp).toBeDefined();
    });
  });
});
