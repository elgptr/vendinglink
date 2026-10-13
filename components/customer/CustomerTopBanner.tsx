"use client";

import { useEffect, useState } from "react";
import { ChevronRight, Copy, Check, X } from "lucide-react";

type ActivePromo = {
  id: string;
  name: string;
  code: string;
  discountType: "FIXED_IDR" | "PERCENT";
  value: number;
  maxDiscount: number | null;
  minSpend: number;
  categoryId: string | null;
  validFrom: string;
  validUntil: string;
  bannerImageUrl?: string | null;
  bannerText?: string | null;
  bannerCtaText?: string | null;
  bannerCtaUrl?: string | null;
};

export default function CustomerTopBanner() {
  const [promos, setPromos] = useState<ActivePromo[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(0);

  useEffect(() => {
    let active = true;
    const fetchPromos = async () => {
      setNow(Date.now());
      try {
        const response = await fetch("/api/promos/active", { cache: "no-store" });
        if (response.ok && active) {
          const data = await response.json();
          setPromos(Array.isArray(data.promos) ? data.promos : []);
        }
      } catch {
        // Banner display is optional; fail gracefully
      }
    };

    void fetchPromos();
    const interval = window.setInterval(fetchPromos, 30_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  // Find first active promo that has not been dismissed in this browser session
  const promo = promos.find((item) => {
    if (dismissed.includes(item.id)) return false;
    if (typeof window !== "undefined") {
      const isSessionDismissed = window.sessionStorage.getItem(`vl_banner_dismissed_${item.id}`);
      if (isSessionDismissed === "1") return false;
    }
    const from = new Date(item.validFrom).getTime();
    const until = new Date(item.validUntil).getTime();
    return from <= now && until > now;
  });

  if (!promo) return null;

  const handleDismiss = () => {
    setDismissed((prev) => [...prev, promo.id]);
    try {
      window.sessionStorage.setItem(`vl_banner_dismissed_${promo.id}`, "1");
    } catch {
      // sessionStorage might not be available in strict privacy modes
    }
  };

  const handleCopyCode = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await navigator.clipboard.writeText(promo.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard write failed
    }
  };

  const handleCtaClick = async () => {
    await handleCopyCode();
    const targetUrl = promo.bannerCtaUrl?.trim() || "/customer#catalog";
    if (targetUrl.startsWith("#")) {
      const el = document.querySelector(targetUrl);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    } else if (targetUrl.includes("#")) {
      window.location.href = targetUrl;
    } else {
      window.location.href = targetUrl;
    }
  };

  const discountBadgeText =
    promo.discountType === "PERCENT"
      ? `${promo.value}% OFF`
      : `DISKON Rp ${promo.value.toLocaleString("id-ID")}`;

  return (
    <div
      role="banner"
      aria-label="Promosi Berjalan"
      className="relative z-40 w-full overflow-hidden border-b border-purple-500/30 bg-gradient-to-r from-[#140432] via-[#240a50] to-[#3e0f6f] text-white shadow-lg transition-all duration-300"
    >
      {/* Subtle background glow effect */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-500/15 via-transparent to-transparent pointer-events-none" />

      <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-2.5 px-3 py-2 sm:gap-4 sm:px-6 sm:py-2.5">
        {/* Left Section: Close button + Visual Graphic / Badge */}
        <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Tutup banner promo"
            className="flex h-6 w-6 items-center justify-center rounded-md text-purple-300/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={15} />
          </button>

          {promo.bannerImageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={promo.bannerImageUrl}
              alt="Promo Banner"
              className="h-7 sm:h-9 max-w-[120px] sm:max-w-[200px] object-contain drop-shadow"
            />
          ) : (
            <div className="flex items-center gap-1.5 rounded-lg border border-purple-400/30 bg-purple-950/80 px-2 py-0.5 text-[11px] font-extrabold tracking-wide text-purple-200 shadow-sm sm:px-2.5 sm:py-1 sm:text-xs">
              <span className="text-emerald-400">⚡</span>
              <span>{discountBadgeText}</span>
            </div>
          )}
        </div>

        {/* Center Section: Promo text message */}
        <div className="min-w-0 flex-1 text-center text-xs sm:text-sm font-medium text-slate-100">
          {promo.bannerText ? (
            <span className="line-clamp-1">{promo.bannerText}</span>
          ) : (
            <span className="line-clamp-1">
              <span className="font-semibold text-white">{promo.name}</span>
              <span className="hidden md:inline"> — Gunakan kode </span>
              <span className="md:hidden"> · </span>
              <button
                type="button"
                onClick={handleCopyCode}
                title="Klik untuk salin kode"
                className="inline-flex items-center gap-1 font-bold text-emerald-300 underline underline-offset-2 hover:text-emerald-200"
              >
                <span>{promo.code}</span>
                {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              </button>
              <span className="hidden sm:inline"> saat checkout.</span>
            </span>
          )}
        </div>

        {/* Right Section: DataCamp-style vibrant CTA button */}
        <div className="flex flex-shrink-0 items-center gap-2">
          {copied && (
            <span className="hidden lg:inline-block text-[11px] font-semibold text-emerald-400 animate-fade-in">
              Kode disalin!
            </span>
          )}
          <button
            type="button"
            onClick={handleCtaClick}
            className="flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-slate-950 shadow-md shadow-emerald-500/20 transition-all hover:scale-105 hover:bg-emerald-400 active:scale-95 sm:px-4 sm:py-1.5"
          >
            <span>{promo.bannerCtaText || "Gunakan Kode"}</span>
            <ChevronRight size={14} className="stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
}
