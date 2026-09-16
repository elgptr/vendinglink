import crypto from "crypto";

const isProduction = process.env.DOKU_IS_PRODUCTION === "true";
const DOKU_BASE_URL = isProduction
  ? "https://api.doku.com"
  : "https://api-sandbox.doku.com";

const clientId = process.env.DOKU_CLIENT_ID || "";
const secretKey = process.env.DOKU_SECRET_KEY || "";

/**
 * Generate DOKU Checkout (Jokul) Request Signature:
 * Digest = Base64(SHA256(MinifiedJSONBody))
 * Signature = Base64(HMAC-SHA256(SecretKey, "Client-Id:" + clientId + "\nRequest-Id:" + requestId + "\nRequest-Timestamp:" + timestamp + "\nRequest-Target:" + requestTarget + "\nDigest:" + digest))
 */
export function generateDokuSignature(params: {
  clientId: string;
  requestId: string;
  timestamp: string;
  requestTarget: string;
  body: string;
  secretKey: string;
}): { digest: string; signature: string } {
  // 1. Digest
  const digest = crypto
    .createHash("sha256")
    .update(params.body, "utf8")
    .digest("base64");

  // 2. Component signature string
  const componentString =
    `Client-Id:${params.clientId}\n` +
    `Request-Id:${params.requestId}\n` +
    `Request-Timestamp:${params.timestamp}\n` +
    `Request-Target:${params.requestTarget}\n` +
    `Digest:${digest}`;

  // 3. HMAC-SHA256 with SecretKey
  const signature =
    "HMACSHA256=" +
    crypto
      .createHmac("sha256", params.secretKey)
      .update(componentString, "utf8")
      .digest("base64");

  return { digest, signature };
}

/**
 * Verify incoming DOKU notification signature:
 * Signature is computed over:
 * "Client-Id:" + clientId + "\nRequest-Id:" + requestId + "\nRequest-Timestamp:" + timestamp + "\nRequest-Target:" + requestTarget + "\nDigest:" + digest
 */
/**
 * Sanitize strings to adhere strictly to DOKU's regex:
 * allowed: a-z A-Z 0-9 . - / + , = _ : ' @ % ( ) and space
 */
export function sanitizeDokuString(str: string): string {
  return str.replace(/[^a-zA-Z0-9.\-\/+,\=_:'@%() ]/g, " ").trim();
}

export function verifyDokuNotificationSignature(params: {
  clientId: string;
  requestId: string;
  timestamp: string;
  requestTarget: string;
  rawBody: string;
  incomingSignature: string;
  secretKey: string;
}): boolean {
  try {
    const { signature } = generateDokuSignature({
      clientId: params.clientId,
      requestId: params.requestId,
      timestamp: params.timestamp,
      requestTarget: params.requestTarget,
      body: params.rawBody,
      secretKey: params.secretKey,
    });

    return signature === params.incomingSignature;
  } catch (err) {
    console.error("DOKU signature verification error:", err);
    return false;
  }
}

/**
 * Create DOKU Checkout Invoice
 * Endpoint: /checkout/v1/payment
 */
export async function createDokuCheckout(params: {
  orderId: string;
  amount: number;
  productName: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  callbackUrl?: string;
}): Promise<{
  paymentUrl: string;
  paymentToken?: string;
  invoiceNumber: string;
}> {
  if (!clientId || !secretKey) {
    throw new Error("DOKU configuration missing. Please check DOKU_CLIENT_ID and DOKU_SECRET_KEY.");
  }

  const requestId = `REQ-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const requestTarget = "/checkout/v1/payment";

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://toko.txsiber.online";
  const callbackUrl = params.callbackUrl || `${appUrl}/customer/order/${params.orderId}`;

  const cleanProductName = sanitizeDokuString(params.productName).substring(0, 50) || "Produk Digital";
  const cleanCustomerName = sanitizeDokuString(params.customerName || "Customer").substring(0, 50) || "Customer";
  const cleanInvoiceNumber = sanitizeDokuString(params.orderId);
  const cleanPhone = (params.customerPhone || "08123456789").replace(/[^0-9+]/g, "").substring(0, 16);

  const payload = {
    order: {
      invoice_number: cleanInvoiceNumber,
      amount: params.amount,
      callback_url: callbackUrl,
      auto_redirect: true,
      line_items: [
        {
          name: cleanProductName,
          price: params.amount,
          quantity: 1,
        },
      ],
    },
    payment: {
      payment_due_date: 1440, // 24 hours
    },
    customer: {
      id: cleanInvoiceNumber,
      name: cleanCustomerName,
      email: params.customerEmail || "customer@txsiber.online",
      phone: cleanPhone || "08123456789",
    },
  };

  const bodyString = JSON.stringify(payload);
  const { digest, signature } = generateDokuSignature({
    clientId,
    requestId,
    timestamp,
    requestTarget,
    body: bodyString,
    secretKey,
  });

  const response = await fetch(`${DOKU_BASE_URL}${requestTarget}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Client-Id": clientId,
      "Request-Id": requestId,
      "Request-Timestamp": timestamp,
      Signature: signature,
      Digest: digest,
    },
    body: bodyString,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.response?.payment?.url) {
    console.error("DOKU Checkout API error response:", data);
    const errMessage =
      data.error?.message ||
      data.response?.message ||
      data.message ||
      "Failed to create DOKU Checkout session";
    throw new Error(`DOKU Error: ${errMessage}`);
  }

  return {
    paymentUrl: data.response.payment.url,
    paymentToken: data.response.payment.token || "",
    invoiceNumber: params.orderId,
  };
}