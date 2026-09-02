import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import OrderPageClient from "@/components/agent/OrderPageClient";

export const metadata = {
  title: "Pembayaran QRIS",
};

interface OrderPageProps {
  params: { orderId: string };
}

export default async function OrderPage({ params }: OrderPageProps) {
  const session = await auth();
  if (!session) redirect("/login");

  const transaction = await prisma.transaction.findUnique({
    where: { orderId: params.orderId },
    include: { product: true },
  });

  if (!transaction) notFound();

  // Security: only the agent who created the transaction can view it
  if (
    transaction.agentId !== session.user.id &&
    session.user.role !== "ADMIN"
  ) {
    redirect("/agent/catalog");
  }

  // If already PAID, client will detect and show success screen on first poll
  // Pass order data to client for immediate display
  return (
    <div className="py-4">
      <OrderPageClient
        orderId={transaction.orderId}
        initialAmount={transaction.finalAmount}
        productName={transaction.product.name}
        createdAt={transaction.createdAt.toISOString()}
        isPaid={transaction.status === "PAID"}
      />
    </div>
  );
}
