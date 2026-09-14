import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/discount', () => ({
  validateVoucher: vi.fn(),
  validatePromoCode: vi.fn(),
  validateDiscountCode: vi.fn()
}));

import {
  validateVoucher,
  validatePromoCode,
  validateDiscountCode
} from '@/lib/discount';

describe('Discount Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateVoucher', () => {
    it('should validate active, non-expired voucher', async () => {
      const mockVoucher = { id: '1', code: 'DISC10', discountAmount: 100000 };
      vi.mocked(validateVoucher).mockResolvedValue(mockVoucher);
      const result = await validateVoucher('DISC10');
      expect(result?.discountAmount).toBe(100000);
    });

    it('should reject expired voucher', async () => {
      vi.mocked(validateVoucher).mockResolvedValue(null);
      const result = await validateVoucher('EXPIRED');
      expect(result).toBeNull();
    });

    it('should reject inactive voucher', async () => {
      vi.mocked(validateVoucher).mockResolvedValue(null);
      const result = await validateVoucher('INACTIVE');
      expect(result).toBeNull();
    });

    it('should reject maxed-out usage voucher', async () => {
      vi.mocked(validateVoucher).mockResolvedValue(null);
      const result = await validateVoucher('MAXED');
      expect(result).toBeNull();
    });

    it('should reject lowercase codes', async () => {
      vi.mocked(validateVoucher).mockResolvedValue(null);
      const result = await validateVoucher('disc10');
      expect(result).toBeNull();
    });

    it('should reject special character codes', async () => {
      vi.mocked(validateVoucher).mockResolvedValue(null);
      const result = await validateVoucher('DISC-10');
      expect(result).toBeNull();
    });

    it('should validate voucher with available usage', async () => {
      const mock = { id: '2', code: 'LIMITED', usedCount: 5, maxUsage: 10, discountAmount: 50000 };
      vi.mocked(validateVoucher).mockResolvedValue(mock);
      const result = await validateVoucher('LIMITED');
      expect(result?.usedCount).toBeLessThan(result?.maxUsage!);
    });
  });

  describe('validatePromoCode', () => {
    it('should validate unused, non-expired promo code', async () => {
      const mockPromo = { id: '1', code: 'PROMO100', discountAmount: 100000 };
      vi.mocked(validatePromoCode).mockResolvedValue(mockPromo);
      const result = await validatePromoCode('PROMO100');
      expect(result?.discountAmount).toBe(100000);
    });

    it('should reject used promo code', async () => {
      vi.mocked(validatePromoCode).mockResolvedValue(null);
      const result = await validatePromoCode('USED');
      expect(result).toBeNull();
    });

    it('should reject expired promo code', async () => {
      vi.mocked(validatePromoCode).mockResolvedValue(null);
      const result = await validatePromoCode('EXPIRED');
      expect(result).toBeNull();
    });

    it('should reject lowercase codes', async () => {
      vi.mocked(validatePromoCode).mockResolvedValue(null);
      const result = await validatePromoCode('promo100');
      expect(result).toBeNull();
    });
  });

  describe('Enumeration Attack Prevention', () => {
    it('should return null for expired vs non-existent voucher', async () => {
      vi.mocked(validateVoucher)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      const expired = await validateVoucher('EXPIRED_CODE');
      const notExist = await validateVoucher('NOTEXIST_CODE');
      expect(expired).toBeNull();
      expect(notExist).toBeNull();
    });

    it('should return null for used vs non-existent promo', async () => {
      vi.mocked(validatePromoCode)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      const used = await validatePromoCode('USED_PROMO');
      const notExist = await validatePromoCode('NOTEXIST_PROMO');
      expect(used).toBeNull();
      expect(notExist).toBeNull();
    });
  });

  describe('validateDiscountCode', () => {
    it('should validate voucher through unified function', async () => {
      const mock = { id: '5', code: 'UNIFIED', discountAmount: 50000 };
      vi.mocked(validateDiscountCode).mockResolvedValue(mock);
      const result = await validateDiscountCode('UNIFIED', 'voucher');
      expect(result?.discountAmount).toBe(50000);
    });

    it('should validate promo through unified function', async () => {
      const mock = { id: '6', code: 'UNIFIEDPROMO', discountAmount: 100000 };
      vi.mocked(validateDiscountCode).mockResolvedValue(mock);
      const result = await validateDiscountCode('UNIFIEDPROMO', 'promoCode');
      expect(result?.discountAmount).toBe(100000);
    });

    it('should return null for invalid codes', async () => {
      vi.mocked(validateDiscountCode).mockResolvedValue(null);
      const result = await validateDiscountCode('INVALID', 'voucher');
      expect(result).toBeNull();
    });

    it('should handle concurrent validations', async () => {
      const mock = { id: '7', code: 'CONCURRENT', discountAmount: 50000 };
      vi.mocked(validateDiscountCode).mockResolvedValue(mock);
      const promises = [
        validateDiscountCode('CONCURRENT', 'voucher'),
        validateDiscountCode('CONCURRENT', 'voucher'),
        validateDiscountCode('CONCURRENT', 'voucher')
      ];
      const results = await Promise.all(promises);
      expect(results).toHaveLength(3);
      results.forEach((r: typeof mock | null) => {
        expect(r?.discountAmount).toBe(50000);
      });
    });
  });
});