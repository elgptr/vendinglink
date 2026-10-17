import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPreOrderDisplayPrices } from "@/lib/utils";
import PreOrderTrackingClient from "./PreOrderTrackingClient";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ trackingToken: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { trackingToken } = await params;
  return {
    title: `Live Tracking Pre-Order #${trackingToken.slice(-6).toUpperCase()} | VendingLink`,
    description: "Pantau status pengadaan on-demand pre-order Anda oleh bagian Purchasing kami secara real-time.",
  };
}

export default async function PreOrderTrackingPage({ params }: Props) {
  const { trackingToken } = await params;

  const requestRecord = await prisma.customerProductRequest.findFirst({
    where: {
      OR: [{ trackingToken }, { id: trackingToken }],
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          price: true,
          originalPrice: true,
          showOriginalPrice: true,
          guideImageUrl: true,
          description: true,
        },
      },
    },
  });

  if (!requestRecord) {
    notFound();
  }

  const isExpired = requestRecord.expiresAt ? new Date() > requestRecord.expiresAt : false;
  const displayPrices = requestRecord.product
    ? getPreOrderDisplayPrices(requestRecord.product)
    : null;

  return (
    <div className="min-h-screen bg-surface-ground text-white flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-brand-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-10 left-10 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-xl z-10 my-8">
        <PreOrderTrackingClient
          initialData={{
            id: requestRecord.id,
            trackingToken: requestRecord.trackingToken || requestRecord.id,
            productName: requestRecord.productName,
            productId: requestRecord.productId,
            status: isExpired ? "EXPIRED" : requestRecord.status,
            maxBudget: requestRecord.maxBudget,
            customerPhone: requestRecord.customerPhone,
            transactionId: requestRecord.transactionId,
            rejectionReason: requestRecord.rejectionReason,
            createdAt: requestRecord.createdAt.toISOString(),
            expiresAt: requestRecord.expiresAt?.toISOString() || null,
            product: requestRecord.product
              ? {
                  id: requestRecord.product.id,
                  name: requestRecord.product.name,
                  price: requestRecord.product.price,
                  originalPrice: displayPrices?.originalPrice ?? null,
                  discountPercent: displayPrices?.discountPercent ?? null,
                  guideImageUrl: requestRecord.product.guideImageUrl,
                  description: requestRecord.product.description,
                }
              : null,
          }}
        />
      </div>
    </div>
  );
}
