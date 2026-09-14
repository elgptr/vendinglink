/**
 * Discount Code Validation Module (Initiative 2 - Abuse Protection)
 *
 * Provides unified interface for validating voucher codes and promo codes.
 * Ensures case-sensitive matching (uppercase + numbers only) and prevents
 * enumeration attacks by returning identical responses for non-existent vs
 * expired/used codes.
 *
 * Implementation scope:
 * - Query Prisma for voucher/promo by code
 * - Validate active status, expiration, usage limits
 * - Return null for any rejection (no info leak)
 */

export interface DiscountCode {
  id: string;
  code: string;
  discountAmount: number;
  usedCount?: number;
  maxUsage?: number;
  usedAt?: Date | null;
  isActive?: boolean;
  expiresAt?: Date;
}

/**
 * Validate a voucher code against database.
 *
 * Returns voucher object if:
 * - Code exists in database
 * - isActive is true
 * - expiresAt is in future
 * - usedCount < maxUsage
 *
 * Returns null otherwise (includes expired, inactive, maxed-out, non-existent).
 * This prevents enumeration attacks by not distinguishing between different
 * failure reasons.
 *
 * @param _code - Voucher code (must be uppercase + numbers only, case-sensitive)
 * @returns Voucher object if valid, null otherwise
 */
export async function validateVoucher(_code: string): Promise<DiscountCode | null> {
  throw new Error('validateVoucher: not implemented (Initiative 2 - Phase 2)');
}

/**
 * Validate a promo code against database.
 *
 * Returns promo object if:
 * - Code exists in database
 * - usedAt is null (not yet used, single-use only)
 * - expiresAt is in future
 *
 * Returns null otherwise (includes used, expired, non-existent).
 * This prevents enumeration attacks.
 *
 * @param _code - Promo code (must be uppercase + numbers only, case-sensitive)
 * @returns Promo object if valid, null otherwise
 */
export async function validatePromoCode(_code: string): Promise<DiscountCode | null> {
  throw new Error('validatePromoCode: not implemented (Initiative 2 - Phase 2)');
}

/**
 * Unified discount code validation.
 *
 * Routes to appropriate validator based on discount type.
 * Used in checkout flow and rate-limited endpoints.
 *
 * @param code - Discount code (case-sensitive, uppercase + numbers only)
 * @param type - Type of discount: 'voucher' or 'promoCode'
 * @returns Discount object if valid, null otherwise
 */
export async function validateDiscountCode(
  code: string,
  type: 'voucher' | 'promoCode'
): Promise<DiscountCode | null> {
  if (type === 'voucher') {
    return validateVoucher(code);
  } else if (type === 'promoCode') {
    return validatePromoCode(code);
  }
  return null;
}
