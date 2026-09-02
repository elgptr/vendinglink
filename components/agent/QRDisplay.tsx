"use client";

import { useEffect, useRef, useState } from "react";
import { QrCode, Clock, RefreshCw } from "lucide-react";
import { formatRupiah, getExpirySeconds } from "@/lib/utils";
import Card from "@/components/ui/Card";

interface QRDisplayProps {
  orderId: string;
  qrString: string;
  qrCodeUrl: string;
  amount: number;
  productName: string;
  createdAt: string;
}

export default function QRDisplay({
  orderId,
  qrString,
  qrCodeUrl,
  amount,
  productName,
  createdAt,
}: QRDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [timeLeft, setTimeLeft] = useState(() =>
    getExpirySeconds(new Date(createdAt))
  );
  const [qrGenerated, setQrGenerated] = useState(false);

  // Generate QR code on canvas
  useEffect(() => {
    if (!qrString || qrString.startsWith("MOCK-QR-")) {
      setQrGenerated(false);
      return;
    }

    const generateQR = async () => {
      try {
        const QRCode = (await import("qrcode")).default;
        if (canvasRef.current) {
          await QRCode.toCanvas(canvasRef.current, qrString, {
            width: 280,
            margin: 2,
            color: {
              dark: "#0f172a",
              light: "#ffffff",
            },
          });
          setQrGenerated(true);
        }
      } catch (err) {
        console.error("QR generation failed:", err);
        setQrGenerated(false);
      }
    };

    generateQR();
  }, [qrString]);

  // Countdown
  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isExpiringSoon = timeLeft <= 60;

  return (
    <div className="max-w-md mx-auto animate-slide-up">
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-sm text-blue-400 mb-4">
          <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          Menunggu Pembayaran
        </div>
        <h1 className="text-2xl font-bold text-white">{productName}</h1>
        <p className="text-slate-400 text-sm mt-1">Order ID: {orderId}</p>
      </div>

      <Card className="p-6 text-center" glow>
        {/* QR Code area */}
        <div className="mb-5">
          <div className="inline-flex flex-col items-center gap-3">
            {qrGenerated ? (
              <div className="p-3 bg-white rounded-2xl shadow-lg">
                <canvas ref={canvasRef} className="block rounded-xl" />
              </div>
            ) : qrCodeUrl ? (
              // Fallback: use image URL from Midtrans
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrCodeUrl}
                alt="QRIS Payment Code"
                className="w-64 h-64 rounded-xl bg-white p-2"
              />
            ) : (
              // Mock/dev placeholder
              <div className="w-64 h-64 bg-white rounded-2xl flex flex-col items-center justify-center gap-3 p-4">
                <QrCode size={80} className="text-slate-700" />
                <p className="text-xs text-slate-500 text-center font-mono">
                  QR akan muncul di sini<br />
                  (konfigurasikan Midtrans Key)
                </p>
                <canvas ref={canvasRef} className="hidden" />
              </div>
            )}

            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Scan dengan aplikasi apapun yang support QRIS
            </div>
          </div>
        </div>

        {/* Amount */}
        <div className="mb-4 p-4 bg-surface rounded-xl border border-surface-border">
          <p className="text-sm text-slate-400 mb-1">Total Pembayaran</p>
          <p className="text-3xl font-bold text-brand-400">{formatRupiah(amount)}</p>
        </div>

        {/* Countdown */}
        <div
          className={`flex items-center justify-center gap-2 p-3 rounded-xl border ${
            isExpiringSoon
              ? "bg-red-500/10 border-red-500/20 text-red-400"
              : "bg-amber-500/10 border-amber-500/20 text-amber-400"
          }`}
        >
          <Clock size={16} />
          <span className="text-sm font-medium">
            {timeLeft > 0
              ? `Kedaluwarsa dalam ${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
              : "QRIS telah kedaluwarsa"}
          </span>
        </div>

        {/* Polling indicator */}
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
          <RefreshCw size={12} className="animate-spin" />
          Memeriksa status pembayaran otomatis...
        </div>
      </Card>

      <p className="text-center text-xs text-slate-600 mt-4">
        Jangan tutup halaman ini sampai pembayaran dikonfirmasi
      </p>
    </div>
  );
}
