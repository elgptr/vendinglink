import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import SuccessScreen from "@/components/agent/SuccessScreen";

export const metadata = {
  title: "Detail Order",
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

  // Agent checkout (credit flow) is always created as PAID instantly — there
  // is no PENDING/Midtrans step, so the redeem URL is guaranteed to exist.
  if (transaction.status !== "PAID" || !transaction.redeemUrl) {
    redirect("/agent/catalog");
  }

  return (
    <div className="py-4">
      <SuccessScreen
        redeemUrl={transaction.redeemUrl}
        guideImageUrl={transaction.product.guideImageUrl}
        guideText={transaction.product.guideText}
        productType={transaction.product.type}
        productName={transaction.product.name}
        amount={transaction.finalAmount}
        customerName={transaction.customerName}
        paidAt={transaction.paidAt?.toISOString() ?? null}
      />
    </div>
  );
}


