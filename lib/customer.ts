import type { PrismaClient } from "@prisma/client";
import { normalizePhone } from "@/lib/phone";
import { generateReferralCode } from "@/lib/referral";
import { sanitizeString } from "@/lib/utils";

export interface UpsertCustomerInput {
  prisma: PrismaClient;
  phone: string;
  name?: string | null;
  consentPromo?: boolean;
}

export interface UpsertCustomerResult {
  id: string;
  phone: string;
  name: string | null;
  consentPromoAt: Date | null;
  referralCode: string | null;
}

/**
 * Upsert a customer by normalized phone number.
 *
 * - Normalizes the phone to 628xxx before lookup.
 - Generates a referral code automatically for new customers.
 * - Records `consentPromoAt` only when the customer explicitly opts in.
 */
export async function upsertCustomer({
  prisma,
  phone,
  name,
  consentPromo,
}: UpsertCustomerInput): Promise<UpsertCustomerResult> {
  const normalized = normalizePhone(phone);
  if (!normalized) {
    throw new Error("Nomor WhatsApp tidak valid");
  }

  const sanitizedName = name ? sanitizeString(name) : null;

  const existing = await prisma.customer.findUnique({
    where: { phone: normalized },
    include: { referralCode: { select: { code: true } } },
  });

  if (existing) {
    const updateData: Record<string, unknown> = {};
    if (sanitizedName && !existing.name) updateData.name = sanitizedName;
    if (consentPromo && !existing.consentPromoAt) {
      updateData.consentPromoAt = new Date();
    }

    const updated = Object.keys(updateData).length
      ? await prisma.customer.update({ where: { id: existing.id }, data: updateData })
      : existing;

    // Customers backfilled from historical transactions (engine migration
    // wave 2) have no ReferralCode yet — create one lazily on their next
    // checkout/registration.
    let referralCode = existing.referralCode?.code ?? null;
    if (!referralCode) {
      const code = await generateReferralCode(prisma, {
        name: sanitizedName ?? existing.name,
        phone: normalized,
      });
      await prisma.referralCode.create({
        data: { code, customerId: existing.id },
      });
      referralCode = code;
    }

    return {
      id: updated.id,
      phone: updated.phone,
      name: updated.name,
      consentPromoAt: updated.consentPromoAt,
      referralCode,
    };
  }

  const code = await generateReferralCode(prisma, { name: sanitizedName, phone: normalized });

  const created = await prisma.customer.create({
    data: {
      phone: normalized,
      name: sanitizedName,
      consentPromoAt: consentPromo ? new Date() : null,
      referralCode: {
        create: { code },
      },
    },
    include: { referralCode: { select: { code: true } } },
  });

  return {
    id: created.id,
    phone: created.phone,
    name: created.name,
    consentPromoAt: created.consentPromoAt,
    referralCode: created.referralCode?.code ?? null,
  };
}
