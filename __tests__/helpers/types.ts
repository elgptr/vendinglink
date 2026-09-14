/**
 * Shared test type definitions for Phase 1 testing suite
 */

export interface TestTransaction {
  orderId: string;
  productId: string;
  agentId?: string;
  status: string;
  paymentType: "MIDTRANS" | "AGENT_CREDIT";
  finalAmount: number;
}

export interface MockMidtransNotification {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  transaction_status: string;
  fraud_status?: string;
}

export interface TestUser {
  id: string;
  username: string;
  passwordHash: string;
  role: "ADMIN" | "AGENT";
  isApproved: boolean;
  isActive: boolean;
  outstandingDebt: number;
  createdAt: Date;
}

export interface TestProduct {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  showOriginalPrice: boolean;
  type: "LINK" | "KODE";
  description?: string;
  guideImageUrl?: string;
  guideText?: string;
  isActive: boolean;
  updatedAt: Date;
}

export interface TestRedeemStock {
  id: string;
  productId: string;
  redeemUrl: string;
  status: "AVAILABLE" | "SOLD" | "RESERVED";
  claimedByAgentId?: string;
  customerName?: string;
  customerPhone?: string;
  claimedAt?: Date;
  createdAt: Date;
}
