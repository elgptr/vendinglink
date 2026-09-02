"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import QRDisplay from "@/components/agent/QRDisplay";
import SuccessScreen from "@/components/agent/SuccessScreen";
import Spinner from "@/components/ui/Spinner";

interface OrderPageClientProps {
  orderId: string;
  initialAmount: number;
  productName: string;
  createdAt: string;
  isPaid: boolean;
}

type OrderStatus = "PENDING" | "PAID" | "EXPIRED";

interface OrderData {
  status: OrderStatus;
  finalAmount: number;
  productName: string;
  customerName?: string | null;
  redeemUrl?: string | null;
  paidAt?: string | null;
}

interface QRData {
  qrString: string;
  qrCodeUrl: string;
}

export default function OrderPageClient({
  orderId,
  initialAmount,
  productName,
  createdAt,
  isPaid,
}: OrderPageClientProps) {
  const router = useRouter();
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [qrData, setQrData] = useState<QRData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pollingActive, setPollingActive] = useState(!isPaid);

  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/order/status?orderId=${orderId}`);
      if (!res.ok) return;

      const data = await res.json();
      setOrderData(data);
      setLoading(false);

      if (data.status !== "PENDING") {
        setPollingActive(false);
      }

      if (data.status === "EXPIRED") {
        setTimeout(() => router.push("/agent/catalog"), 4000);
      }
    } catch {
      // Retry on next cycle
    }
  }, [orderId, router]);

  // Fetch QR code from Midtrans via our API
  const fetchQR = useCallback(async () => {
    try {
      const res = await fetch(`/api/order/qr?orderId=${orderId}`);
      if (res.ok) {
        const data = await res.json();
        setQrData(data);
      }
    } catch {
      // QR will show placeholder
    }
  }, [orderId]);

  useEffect(() => {
    // Fetch QR data
    fetchQR();
    // Initial status poll
    pollStatus();
  }, [fetchQR, pollStatus]);

  useEffect(() => {
    if (!pollingActive) return;

    const interval = setInterval(async () => {
      await pollStatus();
    }, 2000);

    return () => clearInterval(interval);
  }, [pollingActive, pollStatus]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" label="Memuat data pembayaran..." />
      </div>
    );
  }

  if (orderData?.status === "PAID" && orderData.redeemUrl) {
    return (
      <SuccessScreen
        redeemUrl={orderData.redeemUrl}
        productName={orderData.productName || productName}
        amount={orderData.finalAmount}
        customerName={orderData.customerName}
        paidAt={orderData.paidAt}
      />
    );
  }

  if (orderData?.status === "EXPIRED") {
    return (
      <div className="max-w-md mx-auto text-center py-20 animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">⏱</span>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Pembayaran Kedaluwarsa</h2>
        <p className="text-slate-400 mb-6">
          Waktu pembayaran telah habis. Anda akan diarahkan ke katalog...
        </p>
      </div>
    );
  }

  return (
    <QRDisplay
      orderId={orderId}
      qrString={qrData?.qrString || ""}
      qrCodeUrl={qrData?.qrCodeUrl || ""}
      amount={initialAmount}
      productName={productName}
      createdAt={createdAt}
    />
  );
}
