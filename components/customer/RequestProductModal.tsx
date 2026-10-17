"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Sparkles, Send, CheckCircle2, AlertCircle, ArrowRight, ExternalLink } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

interface RequestProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    id: string;
    name: string;
    price: number;
    categorySlug?: string | null;
  };
}

export default function RequestProductModal({
  isOpen,
  onClose,
  product,
}: RequestProductModalProps) {
  const router = useRouter();
  const [customerPhone, setCustomerPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trackingUrl, setTrackingUrl] = useState<string | null>(null);
  const [guardCheckoutUrl, setGuardCheckoutUrl] = useState<string | null>(null);
  const [guardTrackingUrl, setGuardTrackingUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setGuardCheckoutUrl(null);
    setGuardTrackingUrl(null);

    try {
      const res = await fetch("/api/customer/product-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerPhone,
          productName: product.name,
          productId: product.id,
          categorySlug: product.categorySlug || undefined,
          maxBudget: product.price,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409 && data.trackingUrl) {
          setGuardTrackingUrl(data.trackingUrl);
        } else if (res.status === 400 && data.checkoutUrl) {
          setGuardCheckoutUrl(data.checkoutUrl);
        }
        throw new Error(data.message || data.error || "Gagal mengirim permintaan.");
      }

      const generatedTrackingUrl =
        data.trackingUrl || `/pre-order/track/${data.trackingToken || data.id}`;
      setTrackingUrl(generatedTrackingUrl);
      setIsSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTracking = () => {
    if (trackingUrl) {
      router.push(trackingUrl);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-surface-card border border-surface-border rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-brand-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-full hover:bg-surface-hover transition-colors"
        >
          <X size={20} />
        </button>

        {!isSuccess ? (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-brand-500/10 border border-brand-500/20 rounded-2xl text-brand-400">
                <Sparkles size={22} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white leading-tight">Request Produk Ini</h3>
                <p className="text-xs text-slate-400">Pengadaan instan otomatis multi-supplier</p>
              </div>
            </div>

            <div className="p-4 bg-surface-ground rounded-2xl border border-surface-border mb-5">
              <span className="text-xs text-slate-400 block mb-1 font-semibold uppercase tracking-wider">
                Target Produk (Stok Habis)
              </span>
              <p className="font-bold text-white text-base">{product.name}</p>
              <p className="text-xs text-brand-400 mt-1">
                Estimasi Harga: Rp {product.price.toLocaleString("id-ID")}
              </p>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl space-y-2 text-red-400 text-xs mb-4">
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{error}</span>
                </div>
                {guardTrackingUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2 text-xs border-red-400/40 text-red-300 hover:text-white flex items-center justify-center gap-1.5"
                    onClick={() => {
                      router.push(guardTrackingUrl);
                      onClose();
                    }}
                  >
                    Buka Tracking Pre-Order Aktif <ArrowRight size={14} />
                  </Button>
                )}
                {guardCheckoutUrl && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full mt-2 text-xs text-black font-bold flex items-center justify-center gap-1.5"
                    onClick={() => {
                      router.push(guardCheckoutUrl);
                      onClose();
                    }}
                  >
                    Beli Sekarang di Checkout <ArrowRight size={14} />
                  </Button>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Nomor WhatsApp Anda <span className="text-red-400">*</span>
                </label>
                <Input
                  id="input-request-phone"
                  type="tel"
                  placeholder="Contoh: 081234567890"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  required
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Link live tracking pengadaan akan langsung dikirimkan ke WhatsApp Anda.
                </span>
              </div>

              <div className="pt-2">
                <Button
                  id="btn-submit-request-product"
                  type="submit"
                  variant="primary"
                  className="w-full text-black font-bold flex items-center justify-center gap-2"
                  loading={loading}
                >
                  <Send size={16} />
                  Kirim Permintaan Stok
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <div className="text-center py-6 space-y-4 animate-scale-up">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 size={36} />
            </div>
            <h4 className="text-xl font-bold text-white">Permintaan Terkirim!</h4>
            <p className="text-sm text-slate-300 leading-relaxed">
              Bagian Purchasing kami sedang mencari alokasi stok untuk produk{" "}
              <strong>{product.name}</strong> (~3–5 menit).
            </p>
            <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl">
              📲 Link live tracking unik telah dikirim ke nomor WhatsApp Anda.
            </p>

            <div className="pt-2">
              <Button
                id="btn-open-live-tracking"
                variant="primary"
                className="w-full text-black font-bold flex items-center justify-center gap-2 shadow-glow"
                onClick={handleOpenTracking}
              >
                Pantau Live Tracking Sekarang
                <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
