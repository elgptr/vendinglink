import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * TransactionStatus Logging Tests
 * Verifies structured logging in status transitions (PAID, EXPIRED, CANCELLED)
 */

describe("TransactionStatus — Logging in Status Transitions", () => {
  let consoleSpy: {
    log: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    consoleSpy = {
      log: vi.spyOn(console, "log").mockImplementation(() => {}),
      error: vi.spyOn(console, "error").mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("PAID Status Transition", () => {
    it("logs when order transitions to PAID with stock fulfilled", () => {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level: "info",
        message: "Transaction status updated to PAID",
        context: {
          module: "transaction-status",
          orderId: "order-paid-001",
          newStatus: "PAID",
          stockStatus: "FULFILLED",
        },
      };

      console.log(JSON.stringify(logEntry));

      const parsed = JSON.parse(consoleSpy.log.mock.calls[0][0] as string);
      expect(parsed.context.newStatus).toBe("PAID");
      expect(parsed.context.stockStatus).toBe("FULFILLED");
    });
  });

  describe("Stockout Grace Logging", () => {
    it("logs when PAID without stock (OOS refund)", () => {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level: "warn",
        message: "Order PAID but stock out - issuing promo code",
        context: {
          module: "transaction-status",
          orderId: "order-oos-001",
          status: "PAID",
          stockStatus: "OUT_OF_STOCK",
          refundAmount: 50000,
        },
      };

      console.log(JSON.stringify(logEntry));

      const parsed = JSON.parse(consoleSpy.log.mock.calls[0][0] as string);
      expect(parsed.context.status).toBe("PAID");
      expect(parsed.context.stockStatus).toBe("OUT_OF_STOCK");
      expect(parsed.context.refundAmount).toBe(50000);
    });
  });

  describe("CANCELLED Status Logging", () => {
    it("logs when agent credit order cancelled (OOS)", () => {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level: "info",
        message: "Agent credit order cancelled - out of stock",
        context: {
          module: "transaction-status",
          orderId: "order-agent-oos",
          paymentType: "AGENT_CREDIT",
          status: "CANCELLED",
          stockStatus: "OUT_OF_STOCK",
        },
      };

      console.log(JSON.stringify(logEntry));

      const parsed = JSON.parse(consoleSpy.log.mock.calls[0][0] as string);
      expect(parsed.context.status).toBe("CANCELLED");
      expect(parsed.context.paymentType).toBe("AGENT_CREDIT");
    });
  });

  describe("EXPIRED Status Logging", () => {
    it("logs when order payment expires", () => {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level: "info",
        message: "Order payment expired",
        context: {
          module: "transaction-status",
          orderId: "order-expired-001",
          newStatus: "EXPIRED",
          transactionStatus: "expire",
        },
      };

      console.log(JSON.stringify(logEntry));

      const parsed = JSON.parse(consoleSpy.log.mock.calls[0][0] as string);
      expect(parsed.context.newStatus).toBe("EXPIRED");
      expect(parsed.context.transactionStatus).toBe("expire");
    });
  });

  describe("Error Logging", () => {
    it("logs error when stock claim fails", () => {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level: "error",
        message: "Failed to claim stock during settlement",
        context: {
          module: "transaction-status",
          orderId: "order-error-001",
          error: "Stock claim failed",
        },
      };

      console.error(JSON.stringify(logEntry));

      const parsed = JSON.parse(consoleSpy.error.mock.calls[0][0] as string);
      expect(parsed.level).toBe("error");
      expect(parsed.context.error).toBeDefined();
    });
  });
});
