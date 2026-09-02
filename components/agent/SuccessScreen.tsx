"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle, Copy, Check, ShoppingBag, ExternalLink } from "lucide-react";
import { formatRupiah, formatDate } from "@/lib/utils";
import Button from "@/components/ui/Button";
import toast from "@/components/ui/Toast";
import Card from "@/components/ui/Card";

interface SuccessScreenProps {
  redeemUrl: string;
  productName: string;
  amount: number;
  customerName?: string | null;
  paidAt?: string | null;
}

export default function SuccessScreen({
  redeemUrl,
  productName,
  amount,
  customerName,
  paidAt,
}: SuccessScreenProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(redeemUrl);
      setCopied(true);
      toast.success("Link berhasil disalin ke clipboard!");
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = redeemUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      toast.success("Link berhasil disalin!");
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div className="max-w-md mx-auto animate-slide-up">
      {/* Success banner */}
      <div className="text-center mb-6">
        <div className="relative inline-flex items-center justify-center w-20 h-20 mb-4">
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
          <div className="relative w-20 h-20 rounded-full bg-emerald-500/15 border-2 border-emerald-500/40 flex items-center justify-center shadow-glow">
            <CheckCircle size={36} className="text-emerald-400" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white mb-1">Pembayaran Sukses!</h1>
        <p className="text-slate-400">
          Link redeem Anda telah siap
        </p>
      </div>

      {/* Transaction summary */}
      <Card className="p-5 mb-4">
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Produk</span>
            <span className="text-slate-200 font-medium">{productName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Jumlah Bayar</span>
            <span className="text-emerald-400 font-semibold">{formatRupiah(amount)}</span>
          </div>
          {customerName && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Pembeli</span>
              <span className="text-slate-200">{customerName}</span>
            </div>
          )}
          {paidAt && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Waktu Bayar</span>
              <span className="text-slate-200">{formatDate(paidAt)}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Redeem link box */}
      <Card className="p-5 border-emerald-500/30" glow>
        <p className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
          <ExternalLink size={14} />
          Link Redeem Anda
        </p>

        <div className="bg-surface rounded-xl p-4 mb-4 border border-surface-border overflow-hidden">
          <p
            id="redeem-url-text"
            className="text-sm text-brand-300 font-mono break-all leading-relaxed"
          >
            {redeemUrl}
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            id="copy-link-btn"
            variant={copied ? "success" : "primary"}
            size="md"
            className="flex-1"
            onClick={handleCopy}
            icon={copied ? <Check size={16} /> : <Copy size={16} />}
          >
            {copied ? "Tersalin!" : "Salin Link"}
          </Button>

          <a
            href={redeemUrl}
            target="_blank"
            rel="noopener noreferrer"
            id="open-link-btn"
          >
            <Button variant="secondary" size="md" icon={<ExternalLink size={16} />}>
              Buka
            </Button>
          </a>
        </div>
      </Card>

      {/* Order again */}
      <div className="mt-5 text-center">
        <Link href="/agent/catalog">
          <Button
            id="order-again-btn"
            variant="ghost"
            size="lg"
            icon={<ShoppingBag size={16} />}
          >
            Order Lagi
          </Button>
        </Link>
      </div>
    </div>
  );
}
