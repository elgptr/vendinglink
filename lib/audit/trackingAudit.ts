import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "tracking-audit" });

export type TrackingAuditEvent =
  | "TRACKING_LINK_CREATED"
  | "TRACKING_LINK_ACCESSED"
  | "TRACKING_LINK_EXPIRED"
  | "TRACKING_LINK_INVALIDATED";

export interface BaseTrackingAuditContext {
  trackingToken: string;
  requestId?: string;
  customerPhone?: string;
  productName?: string;
}

export interface TrackingLinkCreatedAuditContext extends BaseTrackingAuditContext {
  expiresAt?: string;
  clientIp?: string;
}

export interface TrackingLinkAccessedAuditContext extends BaseTrackingAuditContext {
  status: string;
  clientIp?: string;
  userAgent?: string;
}

export interface TrackingLinkExpiredAuditContext extends BaseTrackingAuditContext {
  expiredAt: string;
}

export interface TrackingLinkInvalidatedAuditContext extends BaseTrackingAuditContext {
  reason: string;
}

/**
 * Mask customer phone number for privacy in audit logs.
 * Example: '081234567890' -> '0812****7890'
 */
export function maskPhone(phone?: string): string {
  if (!phone) return "UNKNOWN";
  const clean = phone.replace(/\D/g, "");
  if (clean.length < 8) return "***";
  return `${clean.slice(0, 4)}****${clean.slice(-4)}`;
}

/**
 * Emits structured audit log when a new tracking link is generated.
 */
export function auditTrackingLinkCreated(ctx: TrackingLinkCreatedAuditContext): void {
  log.info("TRACKING_LINK_CREATED", {
    event: "TRACKING_LINK_CREATED",
    trackingToken: ctx.trackingToken,
    requestId: ctx.requestId,
    customerPhone: maskPhone(ctx.customerPhone),
    productName: ctx.productName,
    expiresAt: ctx.expiresAt,
    clientIp: ctx.clientIp || "unknown",
  });
}

/**
 * Emits structured audit log when a customer accesses their tracking page.
 */
export function auditTrackingLinkAccessed(ctx: TrackingLinkAccessedAuditContext): void {
  log.info("TRACKING_LINK_ACCESSED", {
    event: "TRACKING_LINK_ACCESSED",
    trackingToken: ctx.trackingToken,
    requestId: ctx.requestId,
    status: ctx.status,
    customerPhone: maskPhone(ctx.customerPhone),
    productName: ctx.productName,
    clientIp: ctx.clientIp || "unknown",
    userAgent: ctx.userAgent || "unknown",
  });
}

/**
 * Emits structured audit log when a tracking link has expired.
 */
export function auditTrackingLinkExpired(ctx: TrackingLinkExpiredAuditContext): void {
  log.warn("TRACKING_LINK_EXPIRED", {
    event: "TRACKING_LINK_EXPIRED",
    trackingToken: ctx.trackingToken,
    requestId: ctx.requestId,
    customerPhone: maskPhone(ctx.customerPhone),
    productName: ctx.productName,
    expiredAt: ctx.expiredAt,
  });
}

/**
 * Emits structured audit log when an admin or system invalidates a tracking link.
 */
export function auditTrackingLinkInvalidated(ctx: TrackingLinkInvalidatedAuditContext): void {
  log.warn("TRACKING_LINK_INVALIDATED", {
    event: "TRACKING_LINK_INVALIDATED",
    trackingToken: ctx.trackingToken,
    requestId: ctx.requestId,
    reason: ctx.reason,
    customerPhone: maskPhone(ctx.customerPhone),
  });
}
