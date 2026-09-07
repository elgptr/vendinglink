"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { User, Phone, ChevronRight } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { formatRupiah } from "@/lib/utils";
import toast from "@/components/ui/Toast";

interface CustomerCheckoutFormProps {
  productId: string;
  productName: string;
  productPrice: number;
}

export default function CustomerCheckoutForm({
  productId,
  productPrice,
}: CustomerCheckoutFormProps) {
  const router = useRouter();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);

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
          <div className="border-t border-surface-border pt-3 flex justify-between">
            <span className="font-semibold text-white">Total Tagihan</span>
            <span className="text-xl font-bold text-brand-400">
              {formatRupiah(productPrice)}
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
        Lanjut ke Pembayaran
      </Button>
    </form>
  );
}
