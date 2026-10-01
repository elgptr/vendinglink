import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/kasera/webhook/route';
import { applyMidtransStatusUpdate } from '@/lib/transactionStatus';
import { verifyKaseraWebhookSignature } from '@/lib/kasera';
import { NextRequest } from 'next/server';

// Mock the dependencies
vi.mock('@/lib/transactionStatus', () => ({
  applyMidtransStatusUpdate: vi.fn(),
}));

vi.mock('@/lib/kasera', () => ({
  verifyKaseraWebhookSignature: vi.fn(),
}));

// Set environment variable for test
process.env.KASERA_WEBHOOK_SECRET = 'test-secret';

describe('Kasera Webhook Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createRequest = (body: any, headers: Record<string, string>) => {
    return new NextRequest('http://localhost:3000/api/kasera/webhook', {
      method: 'POST',
      headers: new Headers(headers),
      body: JSON.stringify(body),
    });
  };

  it('should reject requests without a signature when secret is set', async () => {
    const req = createRequest({ type: 'payment.paid' }, {});
    
    const response = await POST(req);
    const json = await response.json();
    
    expect(response.status).toBe(401);
    expect(json.error).toBe('Missing signature header');
  });

  it('should reject requests with an invalid signature', async () => {
    vi.mocked(verifyKaseraWebhookSignature).mockReturnValue(false);
    
    const req = createRequest(
      { type: 'payment.paid' },
      { 'kasera-signature-v1': 'invalid-sig' }
    );
    
    const response = await POST(req);
    const json = await response.json();
    
    expect(response.status).toBe(403);
    expect(json.error).toBe('Invalid signature');
  });

  it('should map payment.paid to settlement and call applyMidtransStatusUpdate idempotently', async () => {
    vi.mocked(verifyKaseraWebhookSignature).mockReturnValue(true);
    
    // First call updates successfully
    vi.mocked(applyMidtransStatusUpdate).mockResolvedValueOnce({
      updated: true,
      transaction: {} as any,
    });
    
    const body = { type: 'payment.paid', data: { external_id: 'order-123' } };
    const req1 = createRequest(body, { 'kasera-signature-v1': 'valid-sig' });
    
    const response1 = await POST(req1);
    const json1 = await response1.json();
    
    expect(response1.status).toBe(200);
    expect(json1.status).toBe('UPDATED');
    expect(applyMidtransStatusUpdate).toHaveBeenCalledWith('order-123', 'settlement');
    
    // Second call simulates duplicate webhook callback (already processed)
    vi.mocked(applyMidtransStatusUpdate).mockResolvedValueOnce({
      updated: false,
      reason: 'ALREADY_PROCESSED',
    });
    
    const req2 = createRequest(body, { 'kasera-signature-v1': 'valid-sig' });
    const response2 = await POST(req2);
    const json2 = await response2.json();
    
    expect(response2.status).toBe(200);
    expect(json2.status).toBe('PROCESSED');
    expect(applyMidtransStatusUpdate).toHaveBeenCalledTimes(2);
  });

  it('should map payment.failed to expire', async () => {
    vi.mocked(verifyKaseraWebhookSignature).mockReturnValue(true);
    vi.mocked(applyMidtransStatusUpdate).mockResolvedValueOnce({
      updated: true,
      transaction: {} as any,
    });
    
    const req = createRequest(
      { type: 'payment.failed', data: { external_id: 'order-456' } },
      { 'kasera-signature-v1': 'valid-sig' }
    );
    
    const response = await POST(req);
    expect(response.status).toBe(200);
    expect(applyMidtransStatusUpdate).toHaveBeenCalledWith('order-456', 'expire');
  });
});
