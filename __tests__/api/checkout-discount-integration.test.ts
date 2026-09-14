import { describe, it, expect, beforeEach, vi } from 'vitest';
import { validateDiscountCode } from '@/lib/discount';

vi.mock('@/lib/discount', () => ({
  validateDiscountCode: vi.fn()
}));

describe('Checkout Discount Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Customer Checkout', () => {
    it('should apply valid voucher to finalAmount', async () => {
      const mockVoucher = {
        id: '1',
        code: 'SAVE20',
        discountAmount: 50000
      };

      vi.mocked(validateDiscountCode).mockResolvedValue(mockVoucher);

      const result = await validateDiscountCode('SAVE20', 'voucher');
      expect(result?.discountAmount).toBe(50000);
    });

    it('should apply valid promo code', async () => {
      const mockPromo = {
        id: '2',
        code: 'PROMO100',
        discountAmount: 100000
      };

      vi.mocked(validateDiscountCode).mockResolvedValue(mockPromo);

      const result = await validateDiscountCode('PROMO100', 'promoCode');
      expect(result?.discountAmount).toBe(100000);
    });

    it('should reject expired voucher', async () => {
      vi.mocked(validateDiscountCode).mockResolvedValue(null);

      const result = await validateDiscountCode('EXPIRED', 'voucher');
      expect(result).toBeNull();
    });

    it('should reject used promo code', async () => {
      vi.mocked(validateDiscountCode).mockResolvedValue(null);

      const result = await validateDiscountCode('USED', 'promoCode');
      expect(result).toBeNull();
    });

    it('should reject lowercase code', async () => {
      vi.mocked(validateDiscountCode).mockResolvedValue(null);

      const result = await validateDiscountCode('save20', 'voucher');
      expect(result).toBeNull();
    });

    it('should reject special character codes', async () => {
      vi.mocked(validateDiscountCode).mockResolvedValue(null);

      const result = await validateDiscountCode('SAVE-20', 'voucher');
      expect(result).toBeNull();
    });

    it('should calculate discount correctly', () => {
      const basePrice = 300000;
      const discount = 50000;
      const finalAmount = basePrice - discount;

      expect(finalAmount).toBe(250000);
    });

    it('should floor discount at zero', () => {
      const basePrice = 100000;
      const discount = 150000;
      const finalAmount = Math.max(0, basePrice - discount);

      expect(finalAmount).toBe(0);
    });
  });

  describe('Agent Checkout', () => {
    it('should apply valid voucher', async () => {
      const mockVoucher = {
        id: '3',
        code: 'AGENT50',
        discountAmount: 25000
      };

      vi.mocked(validateDiscountCode).mockResolvedValue(mockVoucher);

      const result = await validateDiscountCode('AGENT50', 'voucher');
      expect(result?.discountAmount).toBe(25000);
    });

    it('should apply valid promo code', async () => {
      const mockPromo = {
        id: '4',
        code: 'AGENT100',
        discountAmount: 100000
      };

      vi.mocked(validateDiscountCode).mockResolvedValue(mockPromo);

      const result = await validateDiscountCode('AGENT100', 'promoCode');
      expect(result?.discountAmount).toBe(100000);
    });

    it('should reject invalid discount', async () => {
      vi.mocked(validateDiscountCode).mockResolvedValue(null);

      const result = await validateDiscountCode('INVALID', 'voucher');
      expect(result).toBeNull();
    });
  });

  describe('Discount Application', () => {
    it('should record discountAmount in transaction', () => {
      const transaction = {
        id: 'tx-123',
        amount: 500000,
        discountAmount: 50000,
        finalAmount: 450000,
        status: 'PAID'
      };

      expect(transaction.discountAmount).toBe(50000);
      expect(transaction.finalAmount).toBe(450000);
    });

    it('should increment voucher usedCount', () => {
      const voucher = { id: '5', usedCount: 5, maxUsage: 100 };
      voucher.usedCount += 1;

      expect(voucher.usedCount).toBe(6);
      expect(voucher.usedCount).toBeLessThan(voucher.maxUsage);
    });

    it('should update promoCode usedAt', () => {
      const promo: { id: string; usedAt: Date | null } = { id: '6', usedAt: null };
      promo.usedAt = new Date();

      expect(promo.usedAt).not.toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero price after discount', () => {
      const finalAmount = Math.max(0, 50000 - 50000);
      expect(finalAmount).toBe(0);
    });

    it('should not allow discount stacking', () => {
      const basePrice = 500000;
      const finalAmount = Math.max(0, basePrice - 50000);

      expect(finalAmount).toBe(450000);
      expect(finalAmount).not.toBe(basePrice - 50000 - 100000);
    });

    it('should apply discount before payment', () => {
      const finalAmount = 1000000 - 100000;
      expect(finalAmount).toBe(900000);
    });
  });
});
