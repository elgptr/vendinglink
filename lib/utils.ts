import crypto from "crypto";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind CSS classes safely
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format number as Indonesian Rupiah
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format date to Indonesian locale string
 */
export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(date));
}

/**
 * Generate unique order ID
 */
export function generateOrderId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `VM-${timestamp}-${random}`;
}

/**
 * Validate Midtrans webhook signature
 * SHA512(order_id + status_code + gross_amount + server_key)
 */
export function validateMidtransSignature(params: {
  orderId: string;
  statusCode: string;
  grossAmount: string;
  serverKey: string;
  receivedSignature: string;
}): boolean {
  const { orderId, statusCode, grossAmount, serverKey, receivedSignature } = params;

  const rawString = `${orderId}${statusCode}${grossAmount}${serverKey}`;
  const expectedSignature = crypto
    .createHash("sha512")
    .update(rawString)
    .digest("hex");

  return expectedSignature === receivedSignature;
}

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "")
    .trim()
    .slice(0, 255); // max length
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Export transactions to CSV format
 */
export function exportToCsv(
  data: Record<string, unknown>[],
  filename: string
): string {
  if (data.length === 0) return "";

  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => {
      const val = row[h];
      const str = val === null || val === undefined ? "" : String(val);
      // Escape commas and quotes
      return str.includes(",") || str.includes('"')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    }).join(",")
  );

  return [headers.join(","), ...rows].join("\n");
}

/**
 * Parse bulk links from textarea (1 line = 1 link)
 */
export function parseBulkLinks(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && isValidUrl(line));
}

/**
 * Calculate countdown remaining seconds from creation time
 * Midtrans QRIS expires in 15 minutes (900 seconds)
 */
export function getExpirySeconds(createdAt: Date, expiryMinutes = 15): number {
  const expiryMs = expiryMinutes * 60 * 1000;
  const elapsed = Date.now() - new Date(createdAt).getTime();
  return Math.max(0, Math.floor((expiryMs - elapsed) / 1000));
}
