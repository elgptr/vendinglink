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
 * Create a QRIS charge using Midtrans Core API
 */
export async function createQrisCharge(params: {
  orderId: string;
  amount: number;
  customerName?: string;
  productName: string;
}) {
  const response = await midtransCoreApi.charge({
    payment_type: "qris",
    transaction_details: {
      order_id: params.orderId,
      gross_amount: params.amount,
    },
    qris: {
      acquirer: "gopay",
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
    },
  });

  return response as {
    status_code: string;
    transaction_id: string;
    order_id: string;
    gross_amount: string;
    payment_type: string;
    transaction_status: string;
    transaction_time: string;
    qr_string?: string;
    actions?: Array<{ name: string; method: string; url: string }>;
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
