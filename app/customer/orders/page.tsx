import { Metadata } from "next";
import OrderLookupClient from "@/components/customer/OrderLookupClient";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Lacak Pesanan",
  description: "Lacak riwayat pembelian Anda menggunakan nomor WhatsApp.",
};

export default function OrderLookupPage() {
  return (
    <div className="max-w-3xl mx-auto py-8 animate-slide-up">
      <Link
        href="/customer"
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-8"
      >
        <ArrowLeft size={16} />
        Kembali ke Katalog
      </Link>

      <div className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold text-white tracking-tight mb-3">
          Lacak Riwayat Pesanan
        </h1>
        <p className="text-slate-400">
          Masukkan nomor WhatsApp yang Anda gunakan saat checkout untuk melihat ulang akses produk.
        </p>
      </div>

      <OrderLookupClient />
    </div>
  );
}
