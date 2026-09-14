import { describe, it, expect, beforeEach } from 'vitest';
import { createRateLimiter } from '@/lib/rateLimit';

describe('Discount Rate Limiting', () => {
  let limiter: ReturnType<typeof createRateLimiter>;

  beforeEach(() => {
    limiter = createRateLimiter(10, 600000);
  });

  describe('Voucher Endpoint', () => {
    it('should allow first request', () => {
      const result = limiter.check('192.168.1.1:voucher');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });

    it('should allow 10 requests total', () => {
      for (let i = 0; i < 10; i++) {
        const result = limiter.check('192.168.1.2:voucher');
        expect(result.allowed).toBe(true);
      }
    });

    it('should reject 11th request', () => {
      for (let i = 0; i < 10; i++) {
        limiter.check('192.168.1.3:voucher');
      }
      const result = limiter.check('192.168.1.3:voucher');
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should have independent limits per IP', () => {
      for (let i = 0; i < 10; i++) {
        limiter.check('192.168.1.5:voucher');
      }
      const result = limiter.check('192.168.1.6:voucher');
      expect(result.allowed).toBe(true);
    });
  });

  describe('PromoCode Endpoint', () => {
    it('should allow first request', () => {
      const result = limiter.check('192.168.1.7:promo');
      expect(result.allowed).toBe(true);
    });

    it('should reject 11th request', () => {
      for (let i = 0; i < 10; i++) {
        limiter.check('192.168.1.8:promo');
      }
      const result = limiter.check('192.168.1.8:promo');
      expect(result.allowed).toBe(false);
    });
  });

  describe('Security - Bypass Prevention', () => {
    it('should reject X-Forwarded-For spoofing', () => {
      for (let i = 0; i < 10; i++) {
        limiter.check('192.168.1.9:voucher');
      }
      const result = limiter.check('192.168.1.9:voucher');
      expect(result.allowed).toBe(false);
    });

    it('should reject User-Agent rotation', () => {
      for (let i = 0; i < 10; i++) {
        limiter.check('192.168.1.10:voucher');
      }
      const result = limiter.check('192.168.1.10:voucher');
      expect(result.allowed).toBe(false);
    });

    it('should handle concurrent requests atomically', async () => {
      const key = '192.168.1.11:voucher';
      const promises = [];

      for (let i = 0; i < 10; i++) {
        promises.push(Promise.resolve(limiter.check(key)));
      }

      const results = await Promise.all(promises);
      const succeededCount = results.filter(r => r.allowed).length;

      expect(succeededCount).toBe(10);

      const result = limiter.check(key);
      expect(result.allowed).toBe(false);
    });
  });
});
