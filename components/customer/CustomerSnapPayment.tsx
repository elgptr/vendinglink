"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import {
  CreditCard,
  RefreshCw,
  ShieldCheck,
  QrCode,
  ExternalLink,
  Clock,
  AlertTriangle,
} from "lucide-react";
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
    loadJokulCheckout?: (paymentUrl: string) => void;
  }
}

interface CustomerSnapPaymentProps {
  orderId: string;
  snapToken: string;
  amount: number;
  productName: string;
  isProduction: boolean;
  paymentType?: string;
  qrString?: string | null;
  onPaymentEvent?: () => void;
}

export default function CustomerSnapPayment({
  orderId,
  snapToken,
  amount,
  productName,
  isProduction,
  paymentType = "MIDTRANS",
  qrString,
  onPaymentEvent,
}: CustomerSnapPaymentProps) {
  const [scriptReady, setScriptReady] = useState(false);
  const autoOpenedRef = useRef(false);

  const isKasera = paymentType === "KASERA";
  const isDoku =
    !isKasera && (paymentType === "DOKU" || snapToken.startsWith("http"));

  // 15-minute countdown timer for Kasera QRIS
  const [timeLeft, setTimeLeft] = useState(15 * 60);

  useEffect(() => {
    if (!isKasera) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isKasera]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(
    seconds
  ).padStart(2, "0")}`;

  const scriptSrc = isDoku
    ? isProduction
      ? "https://jokul.doku.com/jokul-checkout-js/v1/jokul-checkout-1.0.0.js"
      : "https://sandbox.doku.com/jokul-checkout-js/v1/jokul-checkout-1.0.0.js"
    : isProduction
    ? "https://app.midtrans.com/snap/snap.js"
    : "https://app.sandbox.midtrans.com/snap/snap.js";

  const openPayment = () => {
    if (!snapToken) return;

    if (isKasera) {
      // For Kasera, open the hosted checkout page in a new window/tab
      window.open(snapToken, "_blank", "noopener,noreferrer");
      return;
    }

    if (isDoku) {
      if (typeof window.loadJokulCheckout === "function") {
        window.loadJokulCheckout(snapToken);
      } else {
        window.location.href = snapToken;
      }
      return;
    }

    if (!window.snap) return;
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
    if (!isKasera && scriptReady && snapToken && !autoOpenedRef.current) {
      autoOpenedRef.current = true;
      openPayment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptReady, snapToken, isKasera]);

  return (
    <div className="max-w-md mx-auto animate-slide-up">
      {!isKasera && (
        <Script
          src={scriptSrc}
          data-client-key={
            !isDoku ? process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY : undefined
          }
          strategy="afterInteractive"
          onLoad={() => setScriptReady(true)}
        />
      )}

      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-sm text-blue-400 mb-4">
          <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          Menunggu Pembayaran
        </div>
        <h1 className="text-2xl font-bold text-white">{productName}</h1>
        <p className="text-slate-400 text-sm mt-1">Order ID: {orderId}</p>
      </div>

      {isKasera ? (
        /* ─── KASERA QRIS VIEW ───────────────────────────────────────── */
        <Card className="p-6 text-center" glow>
          {/* Expiry Warning Alert & Countdown */}
          <div
            className={`mb-5 p-3.5 rounded-xl border flex items-center justify-between text-left ${
              timeLeft <= 180
                ? "bg-red-500/15 border-red-500/40 text-red-300"
                : "bg-amber-500/10 border-amber-500/30 text-amber-300"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {timeLeft <= 180 ? (
                <AlertTriangle size={18} className="text-red-400 shrink-0" />
              ) : (
                <Clock size={18} className="text-amber-400 shrink-0" />
              )}
              <div className="text-xs">
                <span className="font-semibold block">
                  {timeLeft > 0
                    ? "Batas Pembayaran: 15 Menit"
                    : "Waktu Pembayaran Habis"}
                </span>
                <span className="text-[11px] opacity-85">
                  {timeLeft > 0
                    ? "Selesaikan scan sebelum QRIS kedaluwarsa"
                    : "Silakan ulangi checkout dari katalog"}
                </span>
              </div>
            </div>
            <div
              className={`font-mono font-bold text-base px-2.5 py-1 rounded-lg ${
                timeLeft <= 180
                  ? "bg-red-500/20 text-red-300"
                  : "bg-amber-500/20 text-amber-300"
              }`}
            >
              {formattedTime}
            </div>
          </div>

          {/* QR Code Container */}
          {qrString ? (
            <div className="mb-5 flex flex-col items-center">
              <div className="p-3 bg-white rounded-2xl shadow-lg inline-block border-4 border-slate-700/50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(
                    qrString
                  )}`}
                  alt="QRIS Kasera Pay"
                  className="w-56 h-56 rounded-lg"
                />
              </div>
              <p className="text-xs text-slate-400 mt-2.5 flex items-center gap-1.5">
                <QrCode size={14} className="text-orange-400" />
                Scan via GoPay, OVO, DANA, BCA, Mandiri, dsb.
              </p>
            </div>
          ) : (
            <div className="mb-5 flex flex-col items-center gap-3">
              <div className="w-20 h-20 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                <QrCode size={32} className="text-orange-400" />
              </div>
              <p className="text-sm text-slate-400 max-w-xs">
                Scan QRIS langsung dengan aplikasi e-wallet atau mobile banking Anda.
              </p>
            </div>
          )}

          {/* Amount Box */}
          <div className="mb-5 p-4 bg-surface rounded-xl border border-surface-border">
            <p className="text-sm text-slate-400 mb-1">Total Pembayaran</p>
            <p className="text-3xl font-bold text-orange-400">
              {formatRupiah(amount)}
            </p>
          </div>

          {/* Action Buttons */}
          {snapToken && (
            <Button
              id="customer-open-kasera-btn"
              size="lg"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
              disabled={timeLeft <= 0}
              onClick={openPayment}
              icon={<ExternalLink size={18} />}
            >
              Buka Halaman Pembayaran Kasera
            </Button>
          )}

          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
            <RefreshCw size={12} className="animate-spin" />
            Memeriksa status pembayaran otomatis...
          </div>
          <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-slate-600">
            <ShieldCheck size={12} />
            Transaksi diproses aman melalui Kasera Pay (QRIS Direct)
          </div>
        </Card>
      ) : (
        /* ─── MIDTRANS & DOKU VIEW ─────────────────────────────────────── */
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
            disabled={isDoku ? !snapToken : !scriptReady || !snapToken}
            onClick={openPayment}
            icon={<CreditCard size={18} />}
          >
            {isDoku ? "Buka Pembayaran DOKU" : "Pilih Metode Pembayaran"}
          </Button>

          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
            <RefreshCw size={12} className="animate-spin" />
            Memeriksa status pembayaran otomatis...
          </div>
          <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-slate-600">
            <ShieldCheck size={12} />
            Transaksi diproses aman melalui{" "}
            {isDoku ? "DOKU Payment" : "Midtrans"}
          </div>
        </Card>
      )}

      <p className="text-center text-xs text-slate-600 mt-4">
        Jangan tutup halaman ini sampai pembayaran dikonfirmasi
      </p>
    </div>
  );
}
