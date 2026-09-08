"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { User, Phone, Tag, CheckCircle2, XCircle, ChevronRight } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { formatRupiah } from "@/lib/utils";
import toast from "@/components/ui/Toast";

interface CustomerCheckoutFormProps {
  productId: string;
  productName: string;
  productPrice: number;
}

type PromoState = {
  id: string;
  code: string;
  discountAmount: number;
} | null;

export default function CustomerCheckoutForm({
  productId,
  productPrice,
}: CustomerCheckoutFormProps) {
  const router = useRouter();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [promo, setPromo] = useState<PromoState>(null);
  const [promoError, setPromoError] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const discountAmount = promo?.discountAmount || 0;
  const finalAmount = Math.max(0, productPrice - discountAmount);

  const handleValidatePromo = async () => {
    if (!promoCodeInput.trim()) return;
    setPromoError("");
    setPromoLoading(true);

    try {
      const res = await fetch("/api/promo-codes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoCodeInput.trim().toUpperCase() }),
      });

      const data = await res.json();

      if (data.valid) {
        setPromo({
          id: data.promoCodeId,
          code: data.code,
          discountAmount: data.discountAmount,
        });
        toast.success(data.message);
      } else {
        setPromo(null);
        setPromoError(data.error || "Kode promo tidak valid");
      }
    } catch {
      setPromoError("Gagal memvalidasi kode promo");
    } finally {
      setPromoLoading(false);
    }
  };

  const handleRemovePromo = () => {
    setPromo(null);
    setPromoCodeInput("");
    setPromoError("");
  };

  const handleCheckout = async (e: FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      toast.error("Nama pembeli wajib diisi");
      return;
    }

    setCheckoutLoading(true);

    try {
      const res = await fetch("/api/checkout/customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          promoCodeId: promo?.id,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Gagal membuat order");
        return;
      }

      router.push(`/customer/order/${data.orderId}`);
    } catch {
      toast.error("Terjadi kesalahan. Coba lagi.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <form
      id="customer-checkout-form"
      onSubmit={handleCheckout}
      className="bg-surface-card border border-surface-border rounded-2xl p-6 space-y-5"
    >
      <h3 className="font-semibold text-white text-lg">Detail Pembelian</h3>

      <Input
        id="customer-name-input"
        label="Nama Pembeli"
        placeholder="Masukkan nama Anda"
        value={customerName}
        onChange={(e) => setCustomerName(e.target.value)}
        required
        leftIcon={<User size={16} />}
      />

      <Input
        id="customer-phone-input"
        label="Nomor WhatsApp / Telepon"
        placeholder="08xxxxxxxxxx (opsional)"
        value={customerPhone}
        onChange={(e) => setCustomerPhone(e.target.value)}
        type="tel"
        leftIcon={<Phone size={16} />}
        hint="Opsional — untuk konfirmasi pesanan jika diperlukan"
      />

      {/* Promo code (auto-issued when a previous order ran out of stock) */}
      {!promo ? (
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-300">
            Kode Promo (opsional)
          </label>
          <div className="flex gap-2">
            <div className="flex-1 relative flex items-center">
              <Tag size={15} className="absolute left-3 text-slate-400 pointer-events-none" />
              <input
                id="customer-promo-code-input"
                type="text"
                placeholder="Contoh: RESTOCK-XXXXXXXX"
                value={promoCodeInput}
                onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-surface border border-surface-border text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all"
              />
            </div>
            <Button
              id="customer-apply-promo-btn"
              type="button"
              variant="secondary"
              onClick={handleValidatePromo}
              loading={promoLoading}
              disabled={!promoCodeInput.trim()}
            >
              Terapkan
            </Button>
          </div>
          {promoError && (
            <p className="text-xs text-red-400 flex items-center gap-1">
              <XCircle size={12} /> {promoError}
            </p>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-emerald-300">
              Promo <span className="font-bold">{promo.code}</span> aktif
            </p>
            <p className="text-xs text-emerald-400">
              Hemat {formatRupiah(promo.discountAmount)}
            </p>
          </div>
          <button
            type="button"
            id="customer-remove-promo-btn"
            onClick={handleRemovePromo}
            className="text-slate-400 hover:text-red-400 transition-colors p-1"
          >
            <XCircle size={16} />
          </button>
        </div>
      )}

      {/* Price summary */}
      <div className="border border-surface-border rounded-xl overflow-hidden">
        <div className="bg-surface px-4 py-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Ringkasan Pembayaran
          </p>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Harga Produk</span>
            <span className="text-slate-200">{formatRupiah(productPrice)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-emerald-400">Potongan Promo</span>
              <span className="text-emerald-400 font-medium">
                - {formatRupiah(discountAmount)}
              </span>
            </div>
          )}
          <div className="border-t border-surface-border pt-3 flex justify-between">
            <span className="font-semibold text-white">Total Tagihan</span>
            <span className="text-xl font-bold text-brand-400">
              {formatRupiah(finalAmount)}
            </span>
          </div>
        </div>
      </div>

      <Button
        id="customer-proceed-payment-btn"
        type="submit"
        size="lg"
        className="w-full"
        loading={checkoutLoading}
        icon={<ChevronRight size={18} />}
      >
        {finalAmount === 0 ? "Ambil Produk (Gratis)" : "Lanjut ke Pembayaran"}
      </Button>
    </form>
  );
}

