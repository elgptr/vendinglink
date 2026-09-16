"use client";

import { useState, useEffect } from "react";
import { CreditCard, CheckCircle2, ArrowRightLeft, RefreshCw } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import toast from "@/components/ui/Toast";

interface SettingsData {
  gateway: "MIDTRANS" | "DOKU";
  hasMidtrans: boolean;
  hasDoku: boolean;
}

export default function PaymentGatewaySettingsCard() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        toast.error("Gagal memuat pengaturan gateway");
      }
    } catch {
      toast.error("Gagal memuat pengaturan gateway");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleToggleGateway = async (targetGateway: "MIDTRANS" | "DOKU") => {
    if (data?.gateway === targetGateway) return;
    setUpdating(true);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gateway: targetGateway }),
      });

      const result = await res.json();

      if (res.ok) {
        toast.success(`Payment Gateway berhasil diubah ke ${targetGateway}`);
        setData((prev) => (prev ? { ...prev, gateway: targetGateway } : null));
      } else {
        toast.error(result.error || "Gagal mengubah gateway");
      }
    } catch {
      toast.error("Terjadi kesalahan saat menyimpan pengaturan");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="py-8">
          <Spinner label="Memuat pengaturan payment gateway..." />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
            <CreditCard className="text-purple-400" size={20} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Payment Gateway Aktif</h2>
            <p className="text-xs text-slate-400">
              Pilih gateway pembayaran yang digunakan oleh customer saat checkout
            </p>
          </div>
        </div>

        <Badge variant="info" className="text-xs px-3 py-1">
          Aktif: {data?.gateway}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Option 1: Midtrans */}
        <div
          onClick={() => !updating && handleToggleGateway("MIDTRANS")}
          className={`cursor-pointer rounded-2xl border p-5 transition-all relative ${
            data?.gateway === "MIDTRANS"
              ? "bg-purple-500/10 border-purple-500/50 shadow-glow"
              : "bg-surface-card border-surface-border hover:border-slate-600 opacity-70"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="font-bold text-base text-white">Midtrans Snap</span>
            {data?.gateway === "MIDTRANS" && (
              <CheckCircle2 size={18} className="text-purple-400" />
            )}
          </div>
          <p className="text-xs text-slate-400 mb-4 leading-relaxed">
            Metode pembayaran bawaan via Midtrans Snap popup (QRIS, VA Bank, GoPay, dsb).
          </p>
          <div className="flex items-center justify-between text-xs pt-3 border-t border-surface-border/50">
            <span className="text-slate-500">Kredensial .env</span>
            <span className={data?.hasMidtrans ? "text-emerald-400" : "text-amber-400"}>
              {data?.hasMidtrans ? "Terhubung" : "Belum Lengkap"}
            </span>
          </div>
        </div>

        {/* Option 2: DOKU Checkout */}
        <div
          onClick={() => !updating && handleToggleGateway("DOKU")}
          className={`cursor-pointer rounded-2xl border p-5 transition-all relative ${
            data?.gateway === "DOKU"
              ? "bg-emerald-500/10 border-emerald-500/50 shadow-glow"
              : "bg-surface-card border-surface-border hover:border-slate-600 opacity-70"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="font-bold text-base text-white">DOKU Checkout</span>
            {data?.gateway === "DOKU" && (
              <CheckCircle2 size={18} className="text-emerald-400" />
            )}
          </div>
          <p className="text-xs text-slate-400 mb-4 leading-relaxed">
            Integrasi resmi DOKU (Jokul Checkout popup) untuk pembayaran instan via QRIS, E-Wallet, dan VA.
          </p>
          <div className="flex items-center justify-between text-xs pt-3 border-t border-surface-border/50">
            <span className="text-slate-500">Kredensial .env</span>
            <span className={data?.hasDoku ? "text-emerald-400" : "text-amber-400"}>
              {data?.hasDoku ? "Terhubung" : "Belum Lengkap"}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between pt-4 border-t border-surface-border text-xs text-slate-400">
        <span className="flex items-center gap-2">
          <ArrowRightLeft size={14} className="text-purple-400" />
          Perubahan gateway berlaku instan pada setiap checkout baru tanpa perlu restart server.
        </span>
        <Button
          variant="ghost"
          size="sm"
          icon={<RefreshCw size={14} />}
          onClick={fetchSettings}
          disabled={updating}
        >
          Segarkan
        </Button>
      </div>
    </Card>
  );
}