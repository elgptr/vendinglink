"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import CustomerSnapPayment from "@/components/customer/CustomerSnapPayment";
import CustomerSuccessScreen from "@/components/customer/CustomerSuccessScreen";
import Spinner from "@/components/ui/Spinner";

interface CustomerOrderPageClientProps {
  orderId: string;
  initialAmount: number;
  productName: string;
  isPaid: boolean;
}

type OrderStatus = "PENDING" | "PAID" | "EXPIRED";

interface OrderData {
  status: OrderStatus;
  finalAmount: number;
  productName: string;
  customerName?: string | null;
  redeemUrl?: string | null;
  guideImageUrl?: string | null;
  paidAt?: string | null;
}

interface SnapTokenData {
  snapToken: string;
}

export default function CustomerOrderPageClient({
  orderId,
  initialAmount,
  productName,
  isPaid,
}: CustomerOrderPageClientProps) {
  const router = useRouter();
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [snapData, setSnapData] = useState<SnapTokenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pollingActive, setPollingActive] = useState(!isPaid);
  const consecutiveErrors = useRef(0);
  const [pollInterval, setPollInterval] = useState(2000);

  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/customer/order/status?orderId=${orderId}`);
      if (!res.ok) {
        consecutiveErrors.current += 1;
        if (consecutiveErrors.current >= 5) setPollInterval(10000);
        if (consecutiveErrors.current >= 20) {
          console.warn("[CustomerOrderPageClient] Too many errors, stopping poll.");
          setPollingActive(false);
        }
        return;
      }

      consecutiveErrors.current = 0;
      if (pollInterval !== 2000) setPollInterval(2000);

      const data = await res.json();
      setOrderData(data);
      setLoading(false);

      if (data.status !== "PENDING") {
        setPollingActive(false);
      }

      if (data.status === "EXPIRED") {
        setTimeout(() => router.push("/customer"), 4000);
      }
    } catch {
      consecutiveErrors.current += 1;
    }
  }, [orderId, router, pollInterval]);

  const fetchSnapToken = useCallback(async () => {
    try {
      const res = await fetch(`/api/customer/order/snap-token?orderId=${orderId}`);
      if (res.ok) {
        const data = await res.json();
        setSnapData(data);
      }
    } catch {
      // Payment button will show as disabled until retried
    }
  }, [orderId]);

  useEffect(() => {
    fetchSnapToken();
    pollStatus();
  }, [fetchSnapToken, pollStatus]);

  useEffect(() => {
    if (!pollingActive) return;

    const timer = setInterval(async () => {
      await pollStatus();
    }, pollInterval);

    return () => clearInterval(timer);
  }, [pollingActive, pollStatus, pollInterval]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" label="Memuat data pembayaran..." />
      </div>
    );
  }

  if (orderData?.status === "PAID" && orderData.redeemUrl) {
    return (
      <CustomerSuccessScreen
        redeemUrl={orderData.redeemUrl}
        guideImageUrl={orderData.guideImageUrl}
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
    <CustomerSnapPayment
      orderId={orderId}
      snapToken={snapData?.snapToken || ""}
      amount={initialAmount}
      productName={productName}
      isProduction={process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true"}
      onPaymentEvent={pollStatus}
    />
  );
}
