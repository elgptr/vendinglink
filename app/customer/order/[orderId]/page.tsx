import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import CustomerOrderPageClient from "@/components/customer/CustomerOrderPageClient";

export const metadata = {
  title: "Pembayaran",
};

interface OrderPageProps {
  params: { orderId: string };
}

export default async function CustomerOrderPage({ params }: OrderPageProps) {
  const p = await params;
  const transaction = await prisma.transaction.findUnique({
    where: { orderId: p.orderId },
    include: { product: true },
  });

  // Not found, or belongs to the agent credit flow — never expose those here
  if (!transaction || transaction.paymentType !== "MIDTRANS") notFound();

  return (
    <div className="py-4">
      <CustomerOrderPageClient
        orderId={transaction.orderId}
        initialAmount={transaction.finalAmount}
        productName={transaction.product.name}
        isPaid={transaction.status === "PAID"}
      />
    </div>
  );
}
