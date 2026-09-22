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
  X,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
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
  const [isModalOpen, setIsModalOpen] = useState(false);
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
      // For Kasera, open the modal overlay containing the QRIS
      setIsModalOpen(true);
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
        /* ─── KASERA MAIN VIEW ───────────────────────────────────────── */
        <>
          <Card className="p-6 text-center" glow>
            <div className="mb-5 flex flex-col items-center gap-3">
              <div className="w-20 h-20 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                <QrCode size={32} className="text-orange-400" />
              </div>
              <p className="text-sm text-slate-400 max-w-xs">
                Scan QRIS langsung dengan aplikasi e-wallet atau mobile banking Anda.
              </p>
            </div>

            <div className="mb-5 p-4 bg-surface rounded-xl border border-surface-border">
              <p className="text-sm text-slate-400 mb-1">Total Pembayaran</p>
              <p className="text-3xl font-bold text-orange-400">
                {formatRupiah(amount)}
              </p>
            </div>

            <Button
              id="customer-open-kasera-btn"
              size="lg"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
              disabled={timeLeft <= 0}
              onClick={openPayment}
              icon={<QrCode size={18} />}
            >
              Buka Pembayaran QRIS
            </Button>

            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
              <RefreshCw size={12} className="animate-spin" />
              Memeriksa status pembayaran otomatis...
            </div>
            <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-slate-600">
              <ShieldCheck size={12} />
              Transaksi diproses aman melalui Kasera Pay
            </div>
          </Card>

          {/* KASERA MODAL POPUP */}
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-4">
              <div className="bg-surface border border-surface-border rounded-2xl w-full max-w-sm overflow-hidden flex flex-col animate-scale-up shadow-2xl relative">
                
                {/* Modal Header */}
                <div className="flex items-center justify-between p-4 border-b border-surface-border bg-surface-light">
                  <div className="font-semibold text-white">Pembayaran QRIS</div>
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surface-border transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 text-center bg-white">
                  {/* Expiry Warning */}
                  <div
                    className={`mb-5 p-3 rounded-lg border flex items-center justify-between text-left ${
                      timeLeft <= 180
                        ? "bg-red-50 border-red-200 text-red-600"
                        : "bg-orange-50 border-orange-200 text-orange-600"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {timeLeft <= 180 ? (
                        <AlertTriangle size={16} className="shrink-0" />
                      ) : (
                        <Clock size={16} className="shrink-0" />
                      )}
                      <div className="text-xs font-medium">
                        {timeLeft > 0 ? "Batas Waktu" : "Waktu Habis"}
                      </div>
                    </div>
                    <div className="font-mono font-bold text-sm">
                      {formattedTime}
                    </div>
                  </div>

                  {/* QR Code Canvas */}
                  <div className="mb-4 flex flex-col items-center">
                    {qrString ? (
                      <div className="p-3 bg-white rounded-xl inline-block border-2 border-slate-100 shadow-sm">
                        <QRCodeSVG 
                          value={qrString} 
                          size={200}
                          level="M"
                          includeMargin={false}
                        />
                      </div>
                    ) : (
                      <div className="w-[200px] h-[200px] bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 text-sm p-4 text-center border-2 border-slate-200 border-dashed">
                        QRIS tidak tersedia. Silakan gunakan link web Kasera di bawah ini.
                      </div>
                    )}
                  </div>
                  
                  <div className="text-slate-800 font-bold text-3xl mb-1">
                    {formatRupiah(amount)}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed mb-6">
                    Buka aplikasi e-wallet (GoPay, OVO, DANA) atau mobile banking Anda, lalu scan QRIS di atas.
                  </p>

                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full text-slate-600 border-slate-300 hover:bg-slate-50"
                    disabled={!snapToken}
                    onClick={() => window.open(snapToken, "_blank", "noopener,noreferrer")}
                    icon={<ExternalLink size={14} />}
                  >
                    Buka di Web Kasera
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
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
