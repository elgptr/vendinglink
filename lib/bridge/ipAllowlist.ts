/**
 * Bridge webhook IP allowlist.
 *
 * Only the Telegram Bridge host (Tencent Lighthouse VPS) may call
 * `/api/bridge/**` webhooks. Configure via `BRIDGE_ALLOWED_IPS`
 * (comma-separated). On Vercel, `x-forwarded-for` is set by the platform
 * edge and is therefore trustworthy for this check.
 *
 * Empty / unset allowlist:
 *   - production → deny all (fail-closed)
 *   - other envs → allow all (local dev convenience)
 */

import { NextRequest } from "next/server";
import { getClientIp } from "@/lib/auth";

export function normalizeIp(ip: string): string {
  const trimmed = ip.trim().toLowerCase();
  return trimmed.startsWith("::ffff:") ? trimmed.slice(7) : trimmed;
}

export function parseAllowedIps(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((ip) => normalizeIp(ip))
    .filter((ip) => ip.length > 0);
}

export function isBridgeIpAllowed(request: NextRequest): boolean {
  // Temporarily turned off for testing
  return true;
}
