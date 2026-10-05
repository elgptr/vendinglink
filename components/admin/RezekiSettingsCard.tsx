"use client";

/**
 * RezekiSettingsCard
 *
 * Admin Settings component that:
 * 1. Shows current Rezeki Shop account balance (with refresh button)
 * 2. Shows global enabled/disabled status (controlled via REZEKI_ENABLED env)
 *
 * Placed in: app/admin/settings/page.tsx
 */

import { useState, useEffect, useCallback } from "react";
import { Zap, RefreshCw, AlertTriangle, CheckCircle, XCircle, DollarSign } from "lucide-react";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";

interface BalanceData {
  balance: number;
}

type Status = "idle" | "loading" | "success" | "error";

export default function RezekiSettingsCard() {
  const [balance, setBalance] = useState<number | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const isEnabled = process.env.NEXT_PUBLIC_REZEKI_ENABLED !== "false";

  const fetchBalance = useCallback(async () => {
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/admin/supplier?action=balance&provider=rezeki");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const typed = data as BalanceData;
      setBalance(typed.balance);
      setStatus("success");
      setLastFetched(new Date());
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Gagal mengambil balance");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  const balanceColor =
    balance === null
      ? "text-slate-400"
      : balance < 5000
      ? "text-red-400"
      : balance < 20000
      ? "text-amber-400"
      : "text-emerald-400";

  return (
    <div className="bg-surface-card border border-surface-border rounded-xl p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
            <Zap size={20} className="text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Rezeki Shop Supplier</h2>
            <p className="text-sm text-slate-400">
              Supplier otomatis via Rezeki Shop
            </p>
          </div>
        </div>

        {/* Status badge */}
        {isEnabled ? (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-3 py-1 rounded-full">
            <CheckCircle size={12} />
            Aktif
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-red-400 bg-red-400/10 border border-red-400/20 px-3 py-1 rounded-full">
            <XCircle size={12} />
            Nonaktif (REZEKI_ENABLED=false)
          </span>
        )}
      </div>

      {/* Balance card */}
      <div className="bg-black/20 border border-surface-border rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-slate-400 flex items-center gap-1.5">
            <DollarSign size={14} />
            Saldo Deposit
          </span>
          <Button
            id="refresh-rezeki-balance-btn"
            variant="ghost"
            size="sm"
            icon={<RefreshCw size={13} className={status === "loading" ? "animate-spin" : ""} />}
            onClick={fetchBalance}
            disabled={status === "loading"}
          >
            Refresh
          </Button>
        </div>

        {status === "loading" && balance === null ? (
          <div className="py-2">
            <Spinner label="Mengambil saldo..." />
          </div>
        ) : status === "error" ? (
          <div className="flex items-start gap-2 text-red-400 mt-1">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Gagal terhubung ke Rezeki Shop</p>
              <p className="text-xs text-slate-500 mt-0.5">{errorMsg}</p>
              <p className="text-xs text-slate-500">
                Pastikan <code className="text-slate-400">REZEKI_API_KEY</code> sudah diisi di .env
              </p>
            </div>
          </div>
        ) : (
          <div>
            <p className={`text-3xl font-bold ${balanceColor}`}>
              Rp {balance?.toLocaleString("id-ID") ?? "—"}
            </p>
            {balance !== null && balance < 20000 && (
              <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                <AlertTriangle size={12} />
                Saldo rendah — segera top up via bot Telegram
              </p>
            )}
            {lastFetched && (
              <p className="text-xs text-slate-600 mt-1">
                Diperbarui: {lastFetched.toLocaleTimeString("id-ID")}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="text-xs text-slate-500 space-y-1">
        <p>
          • Untuk menonaktifkan Rezeki Shop, set{" "}
          <code className="text-slate-400">REZEKI_ENABLED=false</code> di .env
        </p>
        <p>
          • Top up saldo via Bot Telegram Rezeki Shop → Menu Deposit
        </p>
        <p>
          • Koneksikan produk ke Rezeki Shop di halaman{" "}
          <strong className="text-slate-400">Inventori → Edit Produk</strong>
        </p>
      </div>
    </div>
  );
}
