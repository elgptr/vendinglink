"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "@/components/ui/Toast";

export default function SyncStockButton() {
  const [syncing, setSyncing] = useState(false);
  const router = useRouter();

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const res = await fetch("/api/public/sync-stock", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Stok berhasil disinkronkan (${data.updated || 0} produk)`);
        router.refresh();
      } else {
        toast.error(data.error || "Gagal sinkronisasi stok");
      }
    } catch {
      toast.error("Gagal menghubungi server");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <button
      id="customer-sync-stock-btn"
      onClick={handleSync}
      disabled={syncing}
      title="Perbarui stok real-time dari supplier"
      className="inline-flex items-center gap-1.5 px-3 py-2 sm:px-3 sm:py-1.5 rounded-full text-xs font-medium bg-surface-card hover:bg-surface-hover text-slate-300 hover:text-white border border-surface-border transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm ml-2"
    >
      <RefreshCw size={12} className={syncing ? "animate-spin text-brand-400" : ""} />
      <span>{syncing ? "Syncing..." : "Sync Stok"}</span>
    </button>
  );
}