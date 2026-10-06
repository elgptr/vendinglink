import { z } from "zod";

export const stockTopupSchema = z.object({
  transaction_id: z.string().min(1),
  product_id: z.string().min(1),
  supplier_code: z.string().min(1),
  supplier_product_id: z.string().min(1),
  added_qty: z.number().int().min(1).max(100),
  items: z.array(z.string()).min(1),
  source: z.literal("BRIDGE_BOT"),
}).refine(
  (data) => data.items.length === data.added_qty,
  {
    message: "Number of items must match added_qty",
    path: ["items"],
  }
).refine(
  (data) => data.product_id === `${data.supplier_code}-${data.supplier_product_id}`,
  {
    message: "product_id must be in the format {supplier_code}-{supplier_product_id}",
    path: ["product_id"],
  }
);
