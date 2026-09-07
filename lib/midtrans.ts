import midtransClient from "midtrans-client";

const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";

export const midtransCoreApi = new midtransClient.CoreApi({
  isProduction,
  serverKey: process.env.MIDTRANS_SERVER_KEY!,
  clientKey: process.env.MIDTRANS_CLIENT_KEY!,
});

export const midtransSnap = new midtransClient.Snap({
  isProduction,
  serverKey: process.env.MIDTRANS_SERVER_KEY!,
  clientKey: process.env.MIDTRANS_CLIENT_KEY!,
});

/**
 * Create a Snap transaction that lets the customer pick from every payment
 * method enabled on the Midtrans dashboard (QRIS, GoPay, ShopeePay, bank
 * transfer/VA of all supported banks, credit card, Indomaret/Alfamart,
 * PayLater, etc). We intentionally do NOT set `enabled_payments`, so Snap
 * shows the full set of channels active on the merchant account instead of
 * being locked to a single method.
 */
export async function createSnapTransaction(params: {
  orderId: string;
  amount: number;
  customerName?: string;
  customerPhone?: string;
  productName: string;
}) {
  const response = await midtransSnap.createTransaction({
    transaction_details: {
      order_id: params.orderId,
      gross_amount: params.amount,
    },
    // Some channels (bank transfer/VA, over-the-counter) need more than the
    // 15 minutes QRIS used to allow — give every method a full day to settle.
    expiry: {
      unit: "hours",
      duration: 24,
    },
    item_details: [
      {
        id: params.orderId,
        name: params.productName,
        price: params.amount,
        quantity: 1,
      },
    ],
    customer_details: {
      first_name: params.customerName || "Pelanggan",
      phone: params.customerPhone || undefined,
    },
  });

  return response as {
    token: string;
    redirect_url: string;
  };
}


/**
 * Get transaction status from Midtrans
 */
export async function getMidtransStatus(orderId: string) {
  const response = await midtransCoreApi.transaction.status(orderId);
  return response as {
    status_code: string;
    transaction_status: string;
    fraud_status?: string;
    order_id: string;
    gross_amount: string;
    payment_type: string;
    transaction_time: string;
  };
}
