// The published `@types/midtrans-client` package only declares `CoreApi.charge()`.
// At runtime, `midtrans-client`'s CoreApi also exposes a `transaction` sub-client
// (see node_modules/midtrans-client/lib/coreApi.js and lib/transaction.js) used to
// check transaction status. This augmentation fills that gap so we don't need to
// fall back to `any`.
//
// A leading `import type` is required here so this file is treated as a module
// (not a global script) — otherwise `declare module` below would shadow/replace
// the real module declaration instead of augmenting it.
import type {} from "midtrans-client";

declare module "midtrans-client" {
  interface TransactionStatusResponse {
    status_code: string;
    transaction_status: string;
    fraud_status?: string;
    order_id: string;
    gross_amount: string;
    payment_type: string;
    transaction_time: string;
  }

  interface CoreApi {
    transaction: {
      status(orderId: string): Promise<TransactionStatusResponse>;
    };
  }
}
