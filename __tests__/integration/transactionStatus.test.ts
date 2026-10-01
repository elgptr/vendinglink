import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyMidtransStatusUpdate } from '@/lib/transactionStatus';
import { prisma } from '@/lib/prisma';
import { claimAvailableStock } from '@/lib/stock';
import { generatePromoCode } from '@/lib/utils';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: vi.fn((callback) => callback(prisma)),
    transaction: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: { update: vi.fn() },
    promoCode: { create: vi.fn(), update: vi.fn() },
    voucher: { update: vi.fn() },
  }
}));

vi.mock('@/lib/stock', () => ({
  claimAvailableStock: vi.fn(),
}));

vi.mock('@/lib/utils', () => ({
  generatePromoCode: vi.fn(() => 'TEST-PROMO-123'),
}));

vi.mock('@/lib/whatsapp', () => ({
  sendPaymentNotification: vi.fn(),
}));

describe('transactionStatus - applyMidtransStatusUpdate idempotency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return ALREADY_PROCESSED if transaction is already PAID', async () => {
    vi.mocked(prisma.transaction.findUnique).mockResolvedValueOnce({
      id: 'tx-1',
      orderId: 'ORDER-123',
      status: 'PAID',
    } as any);

    const result = await applyMidtransStatusUpdate('ORDER-123', 'settlement');
    
    expect(result.updated).toBe(false);
    if (!result.updated) {
      expect(result.reason).toBe('ALREADY_PROCESSED');
    }
    expect(claimAvailableStock).not.toHaveBeenCalled();
  });

  it('should return ALREADY_PROCESSED if transaction is already CANCELLED', async () => {
    vi.mocked(prisma.transaction.findUnique).mockResolvedValueOnce({
      id: 'tx-1',
      status: 'CANCELLED',
    } as any);

    const result = await applyMidtransStatusUpdate('ORDER-123', 'expire');
    
    expect(result.updated).toBe(false);
    if (!result.updated) {
      expect(result.reason).toBe('ALREADY_PROCESSED');
    }
    expect(prisma.transaction.update).not.toHaveBeenCalled();
  });

  it('should process successfully on first callback and claim stock', async () => {
    vi.mocked(prisma.transaction.findUnique).mockResolvedValueOnce({
      id: 'tx-1',
      orderId: 'ORDER-456',
      status: 'PENDING',
      productId: 'prod-1',
    } as any);

    vi.mocked(claimAvailableStock).mockResolvedValueOnce({
      id: 'stock-1',
      redeemUrl: 'https://redeem.me',
    } as any);

    vi.mocked(prisma.transaction.update).mockResolvedValueOnce({
      status: 'PAID',
      stockStatus: 'FULFILLED',
      redeemUrl: 'https://redeem.me',
    } as any);

    const result = await applyMidtransStatusUpdate('ORDER-456', 'settlement');
    
    expect(result.updated).toBe(true);
    expect(claimAvailableStock).toHaveBeenCalled();
    expect(prisma.transaction.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { orderId: 'ORDER-456' },
      data: expect.objectContaining({ status: 'PAID', stockStatus: 'FULFILLED' })
    }));
  });

  it('should handle race condition (out of stock during atomic settlement) by issuing a promo code refund', async () => {
    vi.mocked(prisma.transaction.findUnique).mockResolvedValueOnce({
      id: 'tx-2',
      orderId: 'ORDER-999',
      status: 'PENDING',
      productId: 'prod-2',
      paymentType: 'MIDTRANS',
      finalAmount: 150000,
    } as any);

    // Simulate stock ran out during the atomic transaction
    vi.mocked(claimAvailableStock).mockResolvedValueOnce(null);

    vi.mocked(prisma.promoCode.create).mockResolvedValueOnce({
      id: 'promo-id',
    } as any);

    vi.mocked(prisma.transaction.update).mockResolvedValueOnce({
      status: 'PAID',
      stockStatus: 'OUT_OF_STOCK',
    } as any);

    const result = await applyMidtransStatusUpdate('ORDER-999', 'capture', 'accept');
    
    expect(result.updated).toBe(true);
    expect(prisma.promoCode.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        discount: 150000,
        type: 'STOCKOUT_REFUND'
      })
    }));
    expect(prisma.transaction.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: 'PAID',
        stockStatus: 'OUT_OF_STOCK',
        promoCodeId: 'promo-id'
      })
    }));
  });
});
