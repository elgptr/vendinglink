"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Package,
  ShoppingBag,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import Button from "@/components/ui/Button";

interface RequestData {
  id: string;
  productName: string;
  status: string;
  quotedPrice: number | null;
  customerPhone: string;
  transactionId: string | null;
  foundSupplierCode: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

export default function RequestConfirmClient({ request }: { request: RequestData }) {
  const [status, setStatus] = useState(request.status);
  const [transactionId, setTransactionId] = useState(request.transactionId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/customer/product-requests/${request.id}/confirm`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal mengonfirmasi pesanan.");
      }

      setStatus("CONFIRMED");
      setTransactionId(data.transactionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const formattedPrice = request.quotedPrice
    ? `Rp ${request.quotedPrice.toLocaleString("id-ID")}`
    : "Menunggu penawaran";

  return (
    <div className="bg-surface-card border border-surface-border rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-brand-500/10 border border-brand-500/20 rounded-2xl text-brand-400">
          <Package size={24} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white leading-tight">Pengadaan Produk Khusus</h1>
          <p className="text-xs text-slate-400">VendingLink Autonomous Procurement Engine</p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-400 text-sm">
          <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Product Card Info */}
      <div className="bg-surface-ground/70 border border-surface-border rounded-2xl p-5 mb-6 space-y-3">
        <div className="flex justify-between items-start gap-3">
          <div>
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Produk</span>
            <h2 className="text-lg font-bold text-white">{request.productName}</h2>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-surface-card border border-surface-border font-medium text-slate-300">
            {status}
          </span>
        </div>

        <div className="border-t border-surface-border/50 pt-3 flex justify-between items-center">
          <span className="text-sm text-slate-400">Penawaran Harga:</span>
          <span className="text-xl font-extrabold text-brand-400">{formattedPrice}</span>
        </div>
      </div>

      {/* Status Specific UI */}
      {status === "FOUND" && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl">
            <ShieldCheck size={16} />
            <span>Stok terverifikasi tersedia dari supplier resmi. Penawaran aktif.</span>
          </div>

          <Button
            id="btn-confirm-product-request"
            variant="primary"
            size="lg"
            className="w-full text-black font-bold flex items-center justify-center gap-2"
            onClick={handleConfirm}
            loading={loading}
          >
            <ShoppingBag size={18} />
            Konfirmasi & Beli Sekarang
          </Button>

          <p className="text-xs text-center text-slate-500">
            Dengan mengonfirmasi, sistem akan langsung menerbitkan transaksi pembelian ke supplier rekanan.
          </p>
        </div>
      )}

      {(status === "CONFIRMED" || status === "PURCHASED") && (
        <div className="space-y-6 text-center">
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex flex-col items-center gap-2">
            <CheckCircle2 size={36} className="text-emerald-400" />
            <h3 className="font-bold text-white text-base">Pesanan Berhasil Dikonfirmasi!</h3>
            <p className="text-xs text-slate-300">
              Transaksi sedang diproses oleh mesin VendingLink Bridge.
            </p>
            {transactionId && (
              <span className="mt-2 font-mono text-xs px-3 py-1 bg-surface-card rounded-lg border border-surface-border text-brand-400">
                ID: {transactionId}
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/" className="flex-1">
              <Button variant="secondary" className="w-full">
                Kembali ke Katalog
              </Button>
            </Link>
            <Link href="/customer/orders" className="flex-1">
              <Button variant="outline" className="w-full flex items-center justify-center gap-1">
                Cek Pesanan <ArrowRight size={16} />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {status === "SEARCHING" && (
        <div className="space-y-6 text-center">
          <div className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex flex-col items-center gap-3">
            <Clock size={36} className="text-amber-400 animate-pulse" />
            <h3 className="font-bold text-white text-base">Sedang Mencari Supplier...</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Worker pencarian kami sedang menghubungi jaringan supplier multi-provider (RZK, PDA, DAI) untuk mendapatkan harga terbaik.
            </p>
            <span className="text-xs text-slate-400">
              Kami akan mengirimkan notifikasi via WhatsApp ke <strong>{request.customerPhone}</strong> segera setelah penawaran ditemukan.
            </span>
          </div>

          <Link href="/">
            <Button variant="secondary" className="w-full">
              Kembali ke Katalog
            </Button>
          </Link>
        </div>
      )}

      {(status === "NOT_FOUND" || status === "REJECTED") && (
        <div className="space-y-6 text-center">
          <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl flex flex-col items-center gap-3">
            <AlertTriangle size={36} className="text-red-400" />
            <h3 className="font-bold text-white text-base">
              {status === "NOT_FOUND" ? "Produk Belum Ditemukan" : "Permintaan Ditolak"}
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {request.rejectionReason ||
                "Mohon maaf, stok produk ini saat ini belum tersedia di seluruh supplier rekanan kami."}
            </p>
          </div>

          <Link href="/">
            <Button variant="primary" className="w-full">
              Cari Produk Lain di Katalog
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
