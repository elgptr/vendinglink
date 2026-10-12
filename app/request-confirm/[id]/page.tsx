import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import RequestConfirmClient from "./RequestConfirmClient";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function RequestConfirmPage({ params }: Props) {
  const { id } = await params;

  const requestRecord = await prisma.customerProductRequest.findUnique({
    where: { id },
    include: {
      product: {
        select: {
          name: true,
          description: true,
          guideImageUrl: true,
        },
      },
    },
  });

  if (!requestRecord) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-surface-ground text-white flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-lg">
        <RequestConfirmClient
          request={{
            id: requestRecord.id,
            productName: requestRecord.productName,
            status: requestRecord.status,
            quotedPrice: requestRecord.quotedPrice,
            customerPhone: requestRecord.customerPhone,
            transactionId: requestRecord.transactionId,
            foundSupplierCode: requestRecord.foundSupplierCode,
            rejectionReason: requestRecord.rejectionReason,
            createdAt: requestRecord.createdAt.toISOString(),
          }}
        />
      </div>
    </div>
  );
}
