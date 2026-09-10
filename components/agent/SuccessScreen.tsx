"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle, Copy, Check, ShoppingBag, ExternalLink, ImageIcon } from "lucide-react";
import { formatRupiah, formatDate } from "@/lib/utils";
import Button from "@/components/ui/Button";
import toast from "@/components/ui/Toast";
import Card from "@/components/ui/Card";

interface SuccessScreenProps {
  redeemUrl: string;
  guideImageUrl?: string | null;
  guideText?: string | null;
  productType?: string | null;
  productName: string;
  amount: number;
  customerName?: string | null;
  paidAt?: string | null;
}

export default function SuccessScreen({
  redeemUrl,
  guideImageUrl,
  guideText,
  productType,
  productName,
  amount,
  customerName,
  paidAt,
}: SuccessScreenProps) {
  const [copied, setCopied] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const isKode = productType === "KODE";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(redeemUrl);
      setCopied(true);
      toast.success(isKode ? "Kode berhasil disalin ke clipboard!" : "Link berhasil disalin ke clipboard!");
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
      toast.success(isKode ? "Kode berhasil disalin!" : "Link berhasil disalin!");
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
          {isKode ? "Kode redeem Anda telah siap" : "Link redeem Anda telah siap"}
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
      <Card className="p-5 border-emerald-500/30 mb-4" glow>
        <p className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
          <ExternalLink size={14} />
          {isKode ? "Kode Redeem Anda" : "Link Redeem Anda"}
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
            {copied ? "Tersalin!" : (isKode ? "Salin Kode" : "Salin Link")}
          </Button>

          {!isKode && (
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
          )}
        </div>

        {(guideText || guideImageUrl) && (
          <div className="mt-4 pt-4 border-t border-surface-border">
            <Button
              id="show-guide-btn"
              variant="ghost"
              size="sm"
              className="w-full text-brand-300 hover:text-brand-200"
              icon={<ImageIcon size={16} />}
              onClick={() => setShowGuide(true)}
            >
              Cara Penggunaan
            </Button>
          </div>
        )}
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

      {/* Guide Modal */}
      {(guideText || guideImageUrl) && showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <Card className="w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-surface-border flex justify-between items-center bg-surface-hover">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <ImageIcon size={18} className="text-brand-400" />
                Cara Penggunaan
              </h3>
              <button 
                onClick={() => setShowGuide(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto space-y-5">
              {guideText && (
                <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {guideText}
                </div>
              )}
              
              {guideImageUrl && (
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={guideImageUrl}
                    alt="Panduan Penggunaan"
                    className="w-full rounded-xl border border-surface-border"
                  />
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-surface-border bg-surface-hover text-right">
              <Button onClick={() => setShowGuide(false)} size="sm">
                Tutup Panduan
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
