"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Tag, User, CheckCircle2, XCircle, ChevronRight } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { formatRupiah } from "@/lib/utils";
import toast from "@/components/ui/Toast";

interface CheckoutFormProps {
  productId: string;
  productName: string;
  productPrice: number;
}

type VoucherState = {
  id: string;
  code: string;
  discountAmount: number;
} | null;

export default function CheckoutForm({
  productId,
  productName,
  productPrice,
}: CheckoutFormProps) {
  const router = useRouter();
  const [customerName, setCustomerName] = useState("");
  const [voucherCode, setVoucherCode] = useState("");
  const [voucher, setVoucher] = useState<VoucherState>(null);
  const [voucherError, setVoucherError] = useState("");
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const discountAmount = voucher?.discountAmount || 0;
  const finalAmount = Math.max(0, productPrice - discountAmount);

  const handleValidateVoucher = async () => {
    if (!voucherCode.trim()) return;
    setVoucherError("");
    setVoucherLoading(true);

    try {
      const res = await fetch("/api/voucher/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: voucherCode.trim().toUpperCase(), productId }),
      });

      const data = await res.json();

      if (data.valid) {
        setVoucher({
          id: data.voucherId,
          code: data.code,
          discountAmount: data.discountAmount,
        });
        toast.success(data.message);
      } else {
        setVoucher(null);
        setVoucherError(data.error || "Kode promo tidak valid");
      }
    } catch {
      setVoucherError("Gagal memvalidasi kode promo");
    } finally {
      setVoucherLoading(false);
    }
  };

  const handleRemoveVoucher = () => {
    setVoucher(null);
    setVoucherCode("");
    setVoucherError("");
  };

  const handleCheckout = async (e: FormEvent) => {
    e.preventDefault();
    setCheckoutLoading(true);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          voucherId: voucher?.id,
          customerName: customerName.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Gagal membuat order");
        return;
      }

      // Navigate to order/payment page
      router.push(`/agent/order/${data.orderId}`);
    } catch {
      toast.error("Terjadi kesalahan. Coba lagi.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <form
      id="checkout-form"
      onSubmit={handleCheckout}
      className="bg-surface-card border border-surface-border rounded-2xl p-6 space-y-5"
    >
      <h3 className="font-semibold text-white text-lg">Detail Pembelian</h3>

      {/* Customer name */}
      <Input
        id="customer-name-input"
        label="Nama Pembeli"
        type="text"
        placeholder="Opsional — untuk catatan Anda"
        value={customerName}
        onChange={(e) => setCustomerName(e.target.value)}
        leftIcon={<User size={15} />}
        hint="Nama pembeli tidak wajib diisi"
        maxLength={100}
      />

      {/* Voucher */}
      {!voucher ? (
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-300">Kode Promo</label>
          <div className="flex gap-2">
            <div className="flex-1 relative flex items-center">
              <Tag size={15} className="absolute left-3 text-slate-400 pointer-events-none" />
              <input
                id="voucher-code-input"
                type="text"
                placeholder="Masukkan kode promo"
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-surface border border-surface-border text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all"
              />
            </div>
            <Button
              id="apply-voucher-btn"
              type="button"
              variant="secondary"
              onClick={handleValidateVoucher}
              loading={voucherLoading}
              disabled={!voucherCode.trim()}
            >
              Terapkan
            </Button>
          </div>
          {voucherError && (
            <p className="text-xs text-red-400 flex items-center gap-1">
              <XCircle size={12} /> {voucherError}
            </p>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-emerald-300">
              Promo <span className="font-bold">{voucher.code}</span> aktif
            </p>
            <p className="text-xs text-emerald-400">
              Hemat {formatRupiah(voucher.discountAmount)}
            </p>
          </div>
          <button
            type="button"
            id="remove-voucher-btn"
            onClick={handleRemoveVoucher}
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
              <span className="text-emerald-400">Diskon Promo</span>
              <span className="text-emerald-400 font-medium">
                - {formatRupiah(discountAmount)}
              </span>
            </div>
          )}
          <div className="border-t border-surface-border pt-3 flex justify-between">
            <span className="font-semibold text-white">Total Tagihan QRIS</span>
            <span className="text-xl font-bold text-brand-400">
              {formatRupiah(finalAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* Submit */}
      <Button
        id="proceed-payment-btn"
        type="submit"
        size="lg"
        className="w-full"
        loading={checkoutLoading}
        icon={<ChevronRight size={18} />}
      >
        Lanjut Bayar QRIS
      </Button>
    </form>
  );
}
