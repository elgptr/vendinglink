import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createLogger } from "@/lib/logger";

describe("createLogger — Edge Cases", () => {
  let consoleSpy: {
    log: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    consoleSpy = {
      log: vi.spyOn(console, "log").mockImplementation(() => {}),
      warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
      error: vi.spyOn(console, "error").mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Empty & Null Context Handling", () => {
    it("handles empty base context", () => {
      const log = createLogger({});
      log.info("test message");

      expect(consoleSpy.log).toHaveBeenCalledOnce();
      const output = JSON.parse(consoleSpy.log.mock.calls[0][0] as string);
      expect(output.context).toBeUndefined();
    });

    it("handles undefined extra context", () => {
      const log = createLogger({ module: "test" });
      log.info("test message", undefined);

      const output = JSON.parse(consoleSpy.log.mock.calls[0][0] as string);
      expect(output.context).toEqual({ module: "test" });
    });

    it("handles null values in extra context", () => {
      const log = createLogger();
      log.info("test", { userId: null, orderId: undefined });

      const output = JSON.parse(consoleSpy.log.mock.calls[0][0] as string);
      expect(output.context).toEqual({ userId: null, orderId: undefined });
    });

    it("merges empty extra context into base context", () => {
      const log = createLogger({ module: "checkout" });
      log.info("test", {});

      const output = JSON.parse(consoleSpy.log.mock.calls[0][0] as string);
      expect(output.context).toEqual({ module: "checkout" });
    });
  });

  describe("Large Message Handling", () => {
    it("handles very long messages without truncation", () => {
      const log = createLogger();
      const longMsg = "x".repeat(10000);
      log.info(longMsg);

      const output = JSON.parse(consoleSpy.log.mock.calls[0][0] as string);
      expect(output.message).toBe(longMsg);
    });

    it("handles messages with special characters", () => {
      const log = createLogger();
      const specialMsg = 'Test\n\t"quote"\r\n<tag>';
      log.info(specialMsg);

      const output = JSON.parse(consoleSpy.log.mock.calls[0][0] as string);
      expect(output.message).toBe(specialMsg);
    });
  });

  describe("Concurrent Logging", () => {
    it("handles rapid sequential logging without interleaving", () => {
      const log = createLogger({ module: "concurrent" });

      for (let i = 0; i < 100; i++) {
        log.info(`message ${i}`, { index: i });
      }

      expect(consoleSpy.log).toHaveBeenCalledTimes(100);

      const allCalls = consoleSpy.log.mock.calls.map((call: unknown[]) =>
        JSON.parse(call[0] as string)
      );
      allCalls.forEach((call: { context?: { index?: number } }, idx: number) => {
        expect(call.context?.index).toBe(idx);
      });
    });

    it("handles mixed log levels concurrently", () => {
      const log = createLogger();

      log.info("info");
      log.warn("warn");
      log.error("error");
      log.debug("debug");

      expect(consoleSpy.log).toHaveBeenCalledTimes(2);
      expect(consoleSpy.warn).toHaveBeenCalledOnce();
      expect(consoleSpy.error).toHaveBeenCalledOnce();
    });
  });

  describe("RequestId Lifecycle", () => {
    it("propagates requestId through child loggers", () => {
      const parentLog = createLogger({ module: "parent" }, "req-123");
      const childLog = parentLog.child({ step: "checkout" });

      childLog.info("test");

      const output = JSON.parse(consoleSpy.log.mock.calls[0][0] as string);
      expect(output.requestId).toBe("req-123");
    });

    it("creates independent child loggers from same parent", () => {
      const parent = createLogger({ userId: "user-1" }, "req-123");
      const child1 = parent.child({ action: "create" });
      const child2 = parent.child({ action: "delete" });

      child1.info("action 1");
      child2.info("action 2");

      const output1 = JSON.parse(consoleSpy.log.mock.calls[0][0] as string);
      const output2 = JSON.parse(consoleSpy.log.mock.calls[1][0] as string);

      expect(output1.context.action).toBe("create");
      expect(output2.context.action).toBe("delete");
    });
  });

  describe("Timestamp Accuracy", () => {
    it("includes valid ISO timestamp", () => {
      const log = createLogger();
      log.info("test");

      const output = JSON.parse(consoleSpy.log.mock.calls[0][0] as string);
      expect(output.timestamp).toBeDefined();
      expect(() => new Date(output.timestamp)).not.toThrow();
    });
  });

  describe("Context Merging Edge Cases", () => {
    it("extra context overrides base context keys", () => {
      const log = createLogger({ userId: "user-old", module: "checkout" });
      log.info("test", { userId: "user-new" });

      const output = JSON.parse(consoleSpy.log.mock.calls[0][0] as string);
      expect(output.context.userId).toBe("user-new");
      expect(output.context.module).toBe("checkout");
    });

    it("handles deeply nested context objects", () => {
      const log = createLogger();
      log.info("test", {
        order: { id: "order-123", amount: 50000 },
      });

      const output = JSON.parse(consoleSpy.log.mock.calls[0][0] as string);
      expect(output.context.order.amount).toBe(50000);
    });
  });
});
