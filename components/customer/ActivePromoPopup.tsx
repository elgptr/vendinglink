"use client";

import { useEffect, useState } from "react";

type Promo = { id: string; name: string; code: string; validFrom: string; validUntil: string;
  discountType: string; value: number; categoryId: string | null };

export default function ActivePromoPopup() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [now, setNow] = useState(0);
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      setNow(Date.now());
      try {
        const response = await fetch("/api/promos/active", { cache: "no-store" });
        if (response.ok && active) setPromos((await response.json()).promos);
      } catch { /* Promo display is optional; checkout validates independently. */ }
    };
    void refresh();
    const timer = window.setInterval(refresh, 30_000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);
  const promo = promos.find((item) => !dismissed.includes(item.id)
    && new Date(item.validFrom).getTime() <= now && new Date(item.validUntil).getTime() > now);
  if (!promo) return null;
  return <aside role="dialog" aria-label="Promo aktif" className="fixed bottom-4 right-4 z-50 max-w-sm rounded-xl border border-brand-500 bg-surface-card p-5 text-white shadow-xl">
    <button type="button" aria-label="Tutup promo" onClick={() => setDismissed([...dismissed, promo.id])} className="absolute right-3 top-2 text-slate-300">✕</button>
    <h2 className="font-bold">{promo.name}</h2>
    <p className="mt-2 text-sm">Gunakan kode <strong>{promo.code}</strong> saat checkout. {promo.discountType === "PERCENT" ? `${promo.value}%` : `Rp ${promo.value.toLocaleString("id-ID")}`} diskon{promo.categoryId ? " untuk kategori tertentu" : ""}.</p>
    <p className="mt-2 text-xs text-slate-400">Berlaku hingga {new Date(promo.validUntil).toLocaleString("id-ID")}</p>
  </aside>;
}