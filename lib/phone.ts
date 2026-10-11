/**
 * Canonical phone normalization shared across the storefront.
 *
 * Converts Indonesian phone numbers into Saungwa / internal format:
 *   - strips spaces, dashes, parentheses
 *   - removes leading +
 *   - converts 08xx → 628xx
 *   - validates length (10-13 digits total after 62)
 *
 * Output: "628xxxxxxxxxx" (no +)
 */
export function normalizePhone(phone: string): string | null {
  if (!phone || typeof phone !== "string") return null;

  let cleaned = phone.replace(/[\s\-()]/g, "").trim();

  if (cleaned.startsWith("+")) {
    cleaned = cleaned.slice(1);
  }

  if (cleaned.startsWith("08")) {
    cleaned = "62" + cleaned.slice(1);
  }

  if (!/^62\d{9,12}$/.test(cleaned)) {
    return null;
  }

  return cleaned;
}
