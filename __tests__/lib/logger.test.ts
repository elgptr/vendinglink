import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createLogger } from "@/lib/logger";

describe("createLogger", () => {
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
    vi.unstubAllEnvs();
  });

  it("outputs structured JSON to console.log for info level", () => {
    const log = createLogger({ module: "test" });
    log.info("hello");

    expect(consoleSpy.log).toHaveBeenCalledOnce();
    const output = JSON.parse(consoleSpy.log.mock.calls[0][0] as string);
    expect(output).toMatchObject({
      level: "info",
      message: "hello",
      context: { module: "test" },
    });
    expect(output.timestamp).toBeDefined();
  });

  it("outputs to console.error for error level", () => {
    const log = createLogger();
    log.error("fail");

    expect(consoleSpy.error).toHaveBeenCalledOnce();
    const output = JSON.parse(consoleSpy.error.mock.calls[0][0] as string);
    expect(output.level).toBe("error");
    expect(output.message).toBe("fail");
  });

  it("outputs to console.warn for warn level", () => {
    const log = createLogger();
    log.warn("caution");

    expect(consoleSpy.warn).toHaveBeenCalledOnce();
    const output = JSON.parse(consoleSpy.warn.mock.calls[0][0] as string);
    expect(output.level).toBe("warn");
  });

  it("merges extra context into log entry", () => {
    const log = createLogger({ module: "checkout" });
    log.info("order created", { orderId: "abc123", amount: 50000 });

    const output = JSON.parse(consoleSpy.log.mock.calls[0][0] as string);
    expect(output.context).toEqual({
      module: "checkout",
      orderId: "abc123",
      amount: 50000,
    });
  });

  it("includes requestId when provided", () => {
    const log = createLogger({ module: "api" }, "req-xyz");
    log.info("request received");

    const output = JSON.parse(consoleSpy.log.mock.calls[0][0] as string);
    expect(output.requestId).toBe("req-xyz");
  });

  it("omits context field when no context is provided", () => {
    const log = createLogger();
    log.info("bare message");

    const output = JSON.parse(consoleSpy.log.mock.calls[0][0] as string);
    expect(output.context).toBeUndefined();
  });

  it("child logger inherits parent context and adds its own", () => {
    const parent = createLogger({ module: "checkout" });
    const child = parent.child({ step: "payment" });
    child.info("processing");

    const output = JSON.parse(consoleSpy.log.mock.calls[0][0] as string);
    expect(output.context).toEqual({
      module: "checkout",
      step: "payment",
    });
  });

  it("suppresses debug logs in production", () => {
    vi.stubEnv("NODE_ENV", "production");

    const log = createLogger();
    log.debug("should not appear");

    expect(consoleSpy.log).not.toHaveBeenCalled();
  });

  it("emits debug logs in development", () => {
    vi.stubEnv("NODE_ENV", "development");

    const log = createLogger();
    log.debug("should appear");

    expect(consoleSpy.log).toHaveBeenCalledOnce();
  });
});
