"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { CreditCard, RefreshCw, ShieldCheck } from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import toast from "@/components/ui/Toast";

interface SnapResult {
  order_id?: string;
  transaction_status?: string;
  [key: string]: unknown;
}

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        options?: {
          onSuccess?: (result: SnapResult) => void;
          onPending?: (result: SnapResult) => void;
          onError?: (result: SnapResult) => void;
          onClose?: () => void;
        }
      ) => void;
    };
  }
}

interface CustomerSnapPaymentProps {
  orderId: string;
  snapToken: string;
  amount: number;
  productName: string;
  isProduction: boolean;
  onPaymentEvent?: () => void;
}

export default function CustomerSnapPayment({
  orderId,
  snapToken,
  amount,
  productName,
  isProduction,
  onPaymentEvent,
}: CustomerSnapPaymentProps) {
  const [scriptReady, setScriptReady] = useState(false);
  const autoOpenedRef = useRef(false);

  const snapSrc = isProduction
    ? "https://app.midtrans.com/snap/snap.js"
    : "https://app.sandbox.midtrans.com/snap/snap.js";

  const openSnap = () => {
    if (!snapToken || !window.snap) return;
    window.snap.pay(snapToken, {
      onSuccess: () => {
        toast.success("Pembayaran berhasil! Menyiapkan link redeem...");
        onPaymentEvent?.();
      },
      onPending: () => {
        toast.info("Pembayaran sedang diproses. Kami akan konfirmasi otomatis.");
        onPaymentEvent?.();
      },
      onError: () => {
        toast.error("Pembayaran gagal. Silakan coba metode lain.");
      },
      onClose: () => {
        toast.info(
          "Jendela pembayaran ditutup. Klik tombol di bawah untuk membayar lagi."
        );
      },
    });
  };

  useEffect(() => {
    if (scriptReady && snapToken && !autoOpenedRef.current) {
      autoOpenedRef.current = true;
      openSnap();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptReady, snapToken]);

  return (
    <div className="max-w-md mx-auto animate-slide-up">
      <Script
        src={snapSrc}
        data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />

      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-sm text-blue-400 mb-4">
          <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          Menunggu Pembayaran
        </div>
        <h1 className="text-2xl font-bold text-white">{productName}</h1>
        <p className="text-slate-400 text-sm mt-1">Order ID: {orderId}</p>
      </div>

      <Card className="p-6 text-center" glow>
        <div className="mb-5 flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-full bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
            <CreditCard size={32} className="text-brand-400" />
          </div>
          <p className="text-sm text-slate-400 max-w-xs">
            Pilih metode pembayaran apa pun yang tersedia — QRIS, transfer
            bank/VA, e-wallet, kartu kredit, dan lainnya.
          </p>
        </div>

        <div className="mb-5 p-4 bg-surface rounded-xl border border-surface-border">
          <p className="text-sm text-slate-400 mb-1">Total Pembayaran</p>
          <p className="text-3xl font-bold text-brand-400">
            {formatRupiah(amount)}
          </p>
        </div>

        <Button
          id="customer-open-snap-btn"
          size="lg"
          className="w-full"
          disabled={!scriptReady || !snapToken}
          onClick={openSnap}
          icon={<CreditCard size={18} />}
        >
          Pilih Metode Pembayaran
        </Button>

        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
          <RefreshCw size={12} className="animate-spin" />
          Memeriksa status pembayaran otomatis...
        </div>
        <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-slate-600">
          <ShieldCheck size={12} />
          Transaksi diproses aman melalui Midtrans
        </div>
      </Card>

      <p className="text-center text-xs text-slate-600 mt-4">
        Jangan tutup halaman ini sampai pembayaran dikonfirmasi
      </p>
    </div>
  );
}
