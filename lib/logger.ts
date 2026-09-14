/**
 * Structured Logger for VendingLink
 * Phase 3: Observability — zero external dependencies.
 *
 * Usage:
 *   import { createLogger } from "@/lib/logger";
 *   const log = createLogger({ module: "checkout-agent" });
 *   log.info("Checkout started", { userId, productId });
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  requestId?: string;
}

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getMinLevel(): LogLevel {
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[getMinLevel()];
}

function formatEntry(entry: LogEntry): string {
  return JSON.stringify(entry);
}

function emit(entry: LogEntry): void {
  if (!shouldLog(entry.level)) return;

  const line = formatEntry(entry);
  if (entry.level === "error") {
    console.error(line);
  } else if (entry.level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export interface Logger {
  debug(message: string, extra?: Record<string, unknown>): void;
  info(message: string, extra?: Record<string, unknown>): void;
  warn(message: string, extra?: Record<string, unknown>): void;
  error(message: string, extra?: Record<string, unknown>): void;
  child(extra: Record<string, unknown>): Logger;
}

export function createLogger(
  baseContext: Record<string, unknown> = {},
  requestId?: string
): Logger {
  function log(
    level: LogLevel,
    message: string,
    extra?: Record<string, unknown>
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(requestId && { requestId }),
      ...(Object.keys({ ...baseContext, ...extra }).length > 0 && {
        context: { ...baseContext, ...extra },
      }),
    };
    emit(entry);
  }

  return {
    debug: (msg, extra) => log("debug", msg, extra),
    info: (msg, extra) => log("info", msg, extra),
    warn: (msg, extra) => log("warn", msg, extra),
    error: (msg, extra) => log("error", msg, extra),
    child: (extra) =>
      createLogger({ ...baseContext, ...extra }, requestId),
  };
}
