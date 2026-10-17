"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bot,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ShoppingBag,
  ArrowRight,
  Share2,
  Copy,
  Check,
  ShieldCheck,
  MessageCircle,
  Package,
  Layers,
  ArrowLeft,
} from "lucide-react";
import Button from "@/components/ui/Button";

export interface TrackingData {
  id: string;
  trackingToken: string;
  productName: string;
  productId?: string | null;
  status: string;
  maxBudget?: number | null;
  customerPhone: string;
  transactionId?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  expiresAt?: string | null;
  product?: {
    id: string;
    name: string;
    price: number;
    originalPrice?: number | null;
    discountPercent?: number | null;
    guideImageUrl?: string | null;
    description?: string | null;
  } | null;
}

export default function PreOrderTrackingClient({ initialData }: { initialData: TrackingData }) {
  const router = useRouter();
  const [data, setData] = useState<TrackingData>(initialData);
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Auto-polling when SEARCHING
  useEffect(() => {
    if (data.status !== "SEARCHING") return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/customer/product-requests/track/${data.trackingToken}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.request) {
            setData((prev) => ({
              ...prev,
              ...json.request,
            }));
          }
        }
      } catch (e) {
        // Silent background poll error
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [data.status, data.trackingToken]);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleInstantConfirm = async () => {
    setConfirming(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/customer/product-requests/${data.id}/confirm`, {
        method: "POST",
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Gagal mengonfirmasi pesanan.");
      }
      setData((prev) => ({
        ...prev,
        status: "CONFIRMED",
        transactionId: result.transactionId,
      }));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setConfirming(false);
    }
  };

  const handleGoToCheckout = () => {
    if (data.productId) {
      router.push(`/customer/checkout/${data.productId}?requestId=${data.id}`);
    } else {
      handleInstantConfirm();
    }
  };

  const adminWaUrl = `https://wa.me/6282254203272?text=${encodeURIComponent(
    `Halo Admin VendingLink, saya ingin menanyakan status pre-order produk "${data.productName}" (ID: ${data.id}).`
  )}`;

  const productPrice = data.product?.price ?? (typeof data.maxBudget === "number" ? data.maxBudget : 0);
  let displayOriginalPrice = data.product?.originalPrice;
  if (!displayOriginalPrice || displayOriginalPrice <= productPrice) {
    if (productPrice >= 100) {
      displayOriginalPrice = Math.round((productPrice / 0.6) / 100) * 100;
    } else {
      displayOriginalPrice = Math.round(productPrice / 0.6);
    }
  }
  const discountPercent =
    data.product?.discountPercent ??
    (displayOriginalPrice && productPrice
      ? Math.min(
          99,
          Math.max(1, Math.round(((displayOriginalPrice - productPrice) / displayOriginalPrice) * 100))
        )
      : 40);

  const formattedBudget = data.maxBudget
    ? `Rp ${data.maxBudget.toLocaleString("id-ID")}`
    : "Sesuai harga terbaik";

  // Step computation
  const getStepState = (stepIndex: number) => {
    // Steps: 1: Permintaan Masuk, 2: Agent Searching, 3: Verifikasi & Penawaran, 4: Ready
    if (data.status === "SEARCHING") {
      if (stepIndex === 1) return "completed";
      if (stepIndex === 2) return "active";
      return "pending";
    }
    if (data.status === "FOUND") {
      if (stepIndex <= 3) return "completed";
      if (stepIndex === 4) return "highlight";
      return "pending";
    }
    if (data.status === "CONFIRMED" || data.status === "PURCHASED") {
      return "completed";
    }
    if (data.status === "NOT_FOUND" || data.status === "REJECTED" || data.status === "EXPIRED") {
      if (stepIndex === 1) return "completed";
      if (stepIndex === 2) return "failed";
      return "pending";
    }
    return "pending";
  };

  return (
    <div className="bg-surface-card border border-surface-border rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl">
      {/* Background Accent Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar: Navigation & Share */}
      <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-surface-border/60">
        <Link
          href="/customer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} />
          Kembali ke Etalase
        </Link>
        <button
          onClick={handleCopyLink}
          id="btn-copy-tracking-link"
          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-surface-ground hover:bg-surface-hover border border-surface-border rounded-xl text-slate-300 transition-all"
        >
          {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          <span>{copied ? "Link Tersalin!" : "Salin Link Tracking"}</span>
        </button>
      </div>

      {/* Header Info */}
      <div className="flex items-start gap-3.5 mb-6">
        <div className="p-3.5 bg-brand-500/15 border border-brand-500/30 rounded-2xl text-brand-400 shadow-glow">
          <Bot size={26} className="animate-pulse" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-white tracking-tight">Bagian Purchasing Live</h1>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-brand-500/20 border border-brand-500/40 text-brand-300 font-semibold">
              Sistem Terverifikasi
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Token ID: <span className="font-mono text-slate-300">{data.trackingToken.slice(0, 14)}...</span>
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {actionError && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-400 text-sm">
          <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Product Summary Card */}
      <div className="bg-surface-ground/90 border border-surface-border rounded-2xl p-5 mb-6 space-y-3">
        <div className="flex justify-between items-start gap-4">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block mb-0.5">
              Target Pre-Order
            </span>
            <h2 className="text-lg font-bold text-white leading-snug">{data.productName}</h2>
          </div>
          <span
            className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wide border ${
              data.status === "FOUND"
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                : data.status === "SEARCHING"
                ? "bg-amber-500/15 text-amber-400 border-amber-500/30 animate-pulse"
                : data.status === "CONFIRMED" || data.status === "PURCHASED"
                ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                : "bg-red-500/15 text-red-400 border-red-500/30"
            }`}
          >
            {data.status === "SEARCHING" ? "MENCARI..." : data.status}
          </span>
        </div>

        <div className="border-t border-surface-border/50 pt-3 flex flex-wrap justify-between items-center gap-2 text-xs">
          <span className="text-slate-400">Target Anggaran:</span>
          <span className="text-slate-200 font-medium">{formattedBudget}</span>
        </div>

        {productPrice > 0 && (
          <div className="border-t border-surface-border/50 pt-3 flex flex-wrap justify-between items-center gap-2 text-sm">
            <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
              <ShieldCheck size={16} /> Harga Spesial Pre-Order:
            </span>
            <div className="flex items-center gap-2">
              {displayOriginalPrice && displayOriginalPrice > productPrice && (
                <span className="text-xs text-slate-400 line-through">
                  Rp {displayOriginalPrice.toLocaleString("id-ID")}
                </span>
              )}
              <span className="text-2xl font-extrabold text-brand-400 tracking-tight">
                Rp {productPrice.toLocaleString("id-ID")}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                Diskon {discountPercent}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Stepper Timeline (Customer-Centric) */}
      <div className="mb-8 p-5 bg-surface-ground/60 border border-surface-border/80 rounded-2xl">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
          <Layers size={14} /> Tahapan Pengadaan
        </h3>

        <div className="space-y-4">
          {/* Step 1 */}
          <div className="flex items-start gap-3">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5 ${
                getStepState(1) === "completed"
                  ? "bg-emerald-500 text-black shadow-glow-sm"
                  : "bg-surface-border text-slate-400"
              }`}
            >
              ✓
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Permintaan Diterima</p>
              <p className="text-xs text-slate-400">
                Nomor WhatsApp dan kriteria anggaran telah terdaftar di sistem.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-3">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5 ${
                getStepState(2) === "completed"
                  ? "bg-emerald-500 text-black"
                  : getStepState(2) === "active"
                  ? "bg-amber-500 text-black animate-pulse"
                  : getStepState(2) === "failed"
                  ? "bg-red-500 text-white"
                  : "bg-surface-border text-slate-400"
              }`}
            >
              {getStepState(2) === "completed" ? "✓" : "2"}
            </div>
            <div>
              <p className="text-sm font-semibold text-white flex items-center gap-1.5">
                Bagian Purchasing Kami
                {getStepState(2) === "active" && (
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                )}
              </p>
              <p className="text-xs text-slate-400">
                {getStepState(2) === "active"
                  ? "Memindai jaringan distribusi rekanan kami untuk harga dan ketersediaan terbaik."
                  : getStepState(2) === "completed"
                  ? "Pencarian selesai dan kuota berhasil diamankan."
                  : "Pencarian terhenti atau kuota belum tersedia saat ini."}
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-3">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5 ${
                getStepState(3) === "completed"
                  ? "bg-emerald-500 text-black"
                  : "bg-surface-border text-slate-400"
              }`}
            >
              {getStepState(3) === "completed" ? "✓" : "3"}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Verifikasi Stok & Penawaran</p>
              <p className="text-xs text-slate-400">
                Stok diverifikasi real-time dan dipetakan ke etalase VendingLink.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex items-start gap-3">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5 ${
                getStepState(4) === "completed"
                  ? "bg-emerald-500 text-black"
                  : getStepState(4) === "highlight"
                  ? "bg-brand-500 text-black animate-bounce shadow-glow"
                  : "bg-surface-border text-slate-400"
              }`}
            >
              {getStepState(4) === "completed" ? "✓" : "4"}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Stok Siap / Beli Sekarang</p>
              <p className="text-xs text-slate-400">
                Pelanggan melakukan checkout dan transaksi diterbitkan otomatis.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Status Action Areas */}
      {data.status === "SEARCHING" && (
        <div className="space-y-5 text-center">
          <div className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex flex-col items-center gap-3">
            <div className="relative">
              <Clock size={40} className="text-amber-400 animate-pulse" />
              <div className="absolute inset-0 rounded-full bg-amber-400/20 animate-ping" />
            </div>
            <h4 className="font-bold text-white text-base">Bagian Purchasing Kami Sedang Berburu Stok...</h4>
            <p className="text-xs text-slate-300 leading-relaxed max-w-sm">
              Estimasi proses: <strong>sekitar 3–5 menit</strong>. Halaman ini akan otomatis
              diperbarui saat stok terkonfirmasi!
            </p>
            <p className="text-[11px] text-slate-400">
              Update juga dikirimkan ke WhatsApp Anda di <strong>{data.customerPhone}</strong>.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href={adminWaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-surface-ground hover:bg-surface-hover border border-surface-border text-xs text-slate-300 hover:text-white transition-colors"
            >
              <MessageCircle size={16} className="text-emerald-400" />
              Tanya Admin via WhatsApp
            </a>
            <Button
              variant="secondary"
              className="flex-1 text-xs"
              onClick={handleCopyLink}
            >
              {copied ? "Link Tersimpan" : "Simpan Link Tracking"}
            </Button>
          </div>
        </div>
      )}

      {data.status === "FOUND" && (
        <div className="space-y-5 animate-scale-up">
          <div className="p-5 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl text-center space-y-2">
            <Sparkles size={32} className="text-emerald-400 mx-auto animate-pulse" />
            <h4 className="font-bold text-white text-lg">Stok Ditemukan! Siap Di-Checkout</h4>
            <p className="text-xs text-emerald-200/90 leading-relaxed max-w-sm mx-auto">
              Bagian Purchasing kami berhasil mengamankan kuota produk ini dari jaringan distribusi resmi. Penawaran promo telah aktif
              dan siap Anda beli.
            </p>
          </div>

          {/* MAIN CTA: KLIK BELI SEKARANG */}
          <Button
            id="btn-buy-now-preorder"
            variant="primary"
            size="lg"
            className="w-full text-black font-extrabold text-base py-4 flex items-center justify-center gap-2 shadow-glow hover:shadow-glow-lg transition-all"
            onClick={handleGoToCheckout}
            loading={confirming}
          >
            <ShoppingBag size={20} />
            KLIK BELI SEKARANG {productPrice > 0 ? `(Rp ${productPrice.toLocaleString("id-ID")})` : ""}
          </Button>

          <p className="text-[11px] text-center text-slate-400">
            Klik tombol di atas untuk menuju pembayaran checkout dengan harga promo pre-order.
          </p>
        </div>
      )}

      {(data.status === "CONFIRMED" || data.status === "PURCHASED") && (
        <div className="space-y-6 text-center animate-fade-in">
          <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex flex-col items-center gap-2.5">
            <CheckCircle2 size={44} className="text-emerald-400" />
            <h4 className="font-bold text-white text-lg">Pre-Order Selesai Dikonfirmasi!</h4>
            <p className="text-xs text-slate-300 max-w-sm">
              Pesanan telah diterbitkan ke sistem pembayaran dan supplier terkait.
            </p>
            {data.transactionId && (
              <span className="mt-2 font-mono text-xs px-3 py-1 bg-surface-card rounded-lg border border-surface-border text-brand-400 font-semibold">
                Ref ID: {data.transactionId}
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/customer" className="flex-1">
              <Button variant="secondary" className="w-full text-xs">
                Katalog Produk
              </Button>
            </Link>
            <Link href="/customer/orders" className="flex-1">
              <Button variant="outline" className="w-full text-xs flex items-center justify-center gap-1.5">
                Daftar Pesanan Saya <ArrowRight size={14} />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {(data.status === "NOT_FOUND" || data.status === "REJECTED" || data.status === "EXPIRED") && (
        <div className="space-y-6 text-center animate-fade-in">
          <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl flex flex-col items-center gap-3">
            <AlertTriangle size={40} className="text-red-400" />
            <h4 className="font-bold text-white text-base">
              {data.status === "EXPIRED"
                ? "Sesi Pre-Order Telah Kedaluwarsa"
                : data.status === "NOT_FOUND"
                ? "Stok Belum Ditemukan di Supplier"
                : "Permintaan Dibatalkan"}
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed max-w-sm">
              {data.rejectionReason ||
                "Mohon maaf, stok produk ini sedang kosong di seluruh supplier jaringan kami saat ini."}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/customer" className="flex-1">
              <Button variant="primary" className="w-full text-xs text-black font-bold">
                Cari Produk Lain
              </Button>
            </Link>
            <a
              href={adminWaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-surface-ground hover:bg-surface-hover border border-surface-border text-xs text-slate-300 hover:text-white transition-colors"
            >
              <MessageCircle size={16} className="text-emerald-400" />
              Konsultasi via WA
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
