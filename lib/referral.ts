import { randomBytes } from "crypto";
import type { PrismaClient } from "@prisma/client";
import { normalizePhone } from "@/lib/phone";

const REFERRAL_CODE_LENGTH = 13;
const RANDOM_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const MAX_ATTEMPTS = 5;

function extractAcronym(name: string | null | undefined): string {
  if (!name) return "XX";

  // Decompose accents and strip non-ASCII word characters.
  const ascii = name
    .normalize("NFKD")
    .replace(/[^\p{ASCII}\s]/gu, "")
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim();

  if (!ascii) return "XX";

  const words = ascii.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "XX";

  if (words.length === 1) {
    return words[0].slice(0, 3).toUpperCase();
  }

  return words
    .slice(0, 3)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function randomFiller(length: number): string {
  return Array.from({ length }, () => {
    const byte = randomBytes(1)[0];
    return RANDOM_CHARS[byte % RANDOM_CHARS.length];
  }).join("");
}

function buildCode(acronym: string, last4: string): string {
  const fillerLength = REFERRAL_CODE_LENGTH - acronym.length - last4.length;
  const filler = fillerLength > 0 ? randomFiller(fillerLength) : "";
  return `${acronym}${last4}${filler}`;
}

export interface GenerateReferralCodeInput {
  name?: string | null;
  phone: string;
}

/**
 * Generate a unique referral code for a customer.
 *
 * Format: acronym(name) + last 4 phone digits + random filler = 13 characters.
 * Example: "RF5456DMALDFQ"
 *
 * Falls back to "XX" for empty/non-Latin names.
 */
export async function generateReferralCode(
  prisma: PrismaClient,
  input: GenerateReferralCodeInput
): Promise<string> {
  const normalized = normalizePhone(input.phone);
  if (!normalized) {
    throw new Error("Invalid phone number");
  }

  const acronym = extractAcronym(input.name);
  const last4 = normalized.slice(-4);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const code = buildCode(acronym, last4);
    const existing = await prisma.referralCode.findUnique({ where: { code } });
    if (!existing) return code;
  }

  throw new Error("Unable to generate unique referral code");
}
