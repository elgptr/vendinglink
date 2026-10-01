"use client";

import { cn } from "@/lib/utils";
import Button from "@/components/ui/Button";
import { ArrowRight, Sparkles } from "lucide-react";

interface HeroBannerProps {
  className?: string;
}

export default function HeroBanner({ className }: HeroBannerProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl bg-surface-card border border-surface-border",
        "p-8 sm:p-12 lg:p-16 text-center shadow-lg",
        className
      )}
    >
      {/* Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-3/4 bg-brand-500/20 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-blue-500/10 blur-[80px] rounded-full pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 max-w-2xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-sm font-medium animate-fade-in">
          <Sparkles size={16} />
          <span>Layanan Instant Otomatis 24/7</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight text-balance animate-slide-up stagger-1">
          Beli Kode Promo &amp; Voucher Digital{" "}
          <span className="gradient-text">Tanpa Ribet</span>
        </h1>

        <p className="text-lg text-slate-400 text-balance animate-slide-up stagger-2">
          Pilih produk, bayar dengan QRIS, dan dapatkan link klaim Anda dalam hitungan detik. Garansi uang kembali jika stok habis.
        </p>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up stagger-3">
          <Button
            size="xl"
            onClick={() => {
              document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
            }}
            icon={<ArrowRight size={20} />}
            className="w-full sm:w-auto"
          >
            Pilih Produk
          </Button>
        </div>
      </div>
    </div>
  );
}
