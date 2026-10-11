"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, HandCoins } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import toast from "@/components/ui/Toast";
import { formatDate, formatRupiah } from "@/lib/utils";

interface PayoutLine {
  customerId: string;
  phone: string;
  name: string | null;
  amount: number;
  creditCount: number;
}

interface GenerateResponse {
  batch: {
    id: string;
    period: string;
    channel: string;
    totalAmount: number;
    status: string;
  } | null;
  lines: PayoutLine[];
  skippedBelowThreshold: number;
  message?: string;
  error?: string;
}

interface PayoutBatchRow {
  id: string;
  period: string;
  channel: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  creditCount: number;
}

const CHANNEL_LABELS: Record<string, string> = {
  GOPAY: "GoPay",
  OVO: "OVO",
};

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * ST-2f/2f-2: Generate referral payout batches and list historical batches.
 * Admin confirms the manual transfer before marking a batch paid (ST-2g).
 */
export default function PayoutBatchPanel() {
  const [period, setPeriod] = useState(currentPeriod());
  const [channel, setChannel] = useState("GOPAY");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [batches, setBatches] = useState<PayoutBatchRow[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);

  const fetchBatches = useCallback(async () => {
    setLoadingBatches(true);
    try {
      const res = await fetch("/api/admin/payout-batches", { cache: "no-store" });
      if (!res.ok) throw new Error("Gagal memuat riwayat payout batch");
      setBatches((await res.json()) as PayoutBatchRow[]);
    } catch {
      toast.error("Gagal memuat riwayat payout batch");
    } finally {
      setLoadingBatches(false);
    }
  }, []);

  useEffect(() => {
    void fetchBatches();
  }, [fetchBatches]);

  async function handleGenerate() {
    setGenerating(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/payout-batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period, channel }),
      });
      const data: GenerateResponse = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Gagal membuat payout batch");
        return;
      }
      setResult(data);
      if (data.batch) {
        void fetchBatches();
        toast.success(
          `Batch ${data.batch.period} dibuat: ${data.lines.length} referrer, ${formatRupiah(data.batch.totalAmount)}`
        );
      } else {
        toast.info(data.message ?? "Tidak ada credit yang memenuhi ambang payout");
      }
    } catch {
      toast.error("Gagal membuat payout batch");
    } finally {
      setGenerating(false);
    }
  }

  async function handleMarkPaid(batch: PayoutBatchRow) {
    if (!window.confirm(`Konfirmasi transfer manual ${formatRupiah(batch.totalAmount)} untuk batch ${batch.period} (${batch.channel}) sudah selesai? Tindakan ini tidak dapat dibatalkan.`)) return;
    setPayingId(batch.id);
    try {
      const res = await fetch(`/api/admin/payout-batches/${encodeURIComponent(batch.id)}/paid`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Gagal menandai batch dibayar");
      }
      toast.success("Batch dan credit sudah ditandai PAID");
      await fetchBatches();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menandai batch dibayar");
    } finally {
      setPayingId(null);
    }
  }


  return (
    <div className="space-y-6">
    <Card className="p-5 border-brand-500/10">
      <div className="flex items-center gap-2 mb-1">
        <HandCoins className="w-5 h-5 text-brand-400" />
        <h2 className="text-lg font-semibold text-white">Payout Referral</h2>
      </div>
      <p className="text-sm text-slate-400 mb-4">
        Generate batch payout komisi referral (credit PAYABLE di atas ambang
        minimum). Tujuan transfer = nomor HP referrer; unduh CSV untuk proses
        manual. Setelah transfer berhasil, konfirmasi lewat tombol di riwayat.
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Periode</label>
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="bg-surface-card border border-surface-border rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500/50"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Channel</label>
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className="bg-surface-card border border-surface-border rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500/50"
          >
            {Object.entries(CHANNEL_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <Button
          onClick={handleGenerate}
          loading={generating}
          disabled={!period}
          icon={<HandCoins className="w-4 h-4" />}
        >
          Generate Batch
        </Button>
        {result?.batch && (
          <Button
            variant="outline"
            icon={<Download className="w-4 h-4" />}
            onClick={() =>
              window.open(
                `/api/admin/payout-batches/${result.batch!.id}/csv`,
                "_blank"
              )
            }
          >
            Unduh CSV
          </Button>
        )}
      </div>

      {result?.batch && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 border-b border-surface-border">
                <th className="py-2 pr-4 font-medium">No. HP Referrer</th>
                <th className="py-2 pr-4 font-medium">Nama</th>
                <th className="py-2 pr-4 font-medium text-right">Jumlah</th>
                <th className="py-2 font-medium text-right">Credit</th>
              </tr>
            </thead>
            <tbody>
              {result.lines.map((line) => (
                <tr
                  key={line.customerId}
                  className="border-b border-surface-border/50 text-slate-300"
                >
                  <td className="py-2 pr-4 font-mono">{line.phone}</td>
                  <td className="py-2 pr-4">{line.name ?? "—"}</td>
                  <td className="py-2 pr-4 text-right">
                    {formatRupiah(line.amount)}
                  </td>
                  <td className="py-2 text-right">{line.creditCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {result.skippedBelowThreshold > 0 && (
            <p className="mt-2 text-xs text-slate-500">
              {result.skippedBelowThreshold} referrer di bawah ambang minimum
              payout — credit mereka tetap PAYABLE dan ikut batch berikutnya.
            </p>
          )}
        </div>
      )}
    </Card>
    <Card className="p-5 border-brand-500/10">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold text-white">Riwayat Payout Batch</h2>
        <Button variant="outline" size="sm" onClick={fetchBatches} disabled={loadingBatches}>
          Muat ulang
        </Button>
      </div>
      {loadingBatches ? (
        <p className="text-sm text-slate-400" role="status">Memuat payout batch...</p>
      ) : batches.length === 0 ? (
        <p className="text-sm text-slate-400">Belum ada payout batch.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 border-b border-surface-border">
                <th className="py-2 pr-4 font-medium">Dibuat</th>
                <th className="py-2 pr-4 font-medium">Periode</th>
                <th className="py-2 pr-4 font-medium">Channel</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium text-right">Credit</th>
                <th className="py-2 pr-4 font-medium text-right">Total</th>
                <th className="py-2 font-medium text-right">CSV</th>
                <th className="py-2 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((batch) => (
                <tr key={batch.id} className="border-b border-surface-border/50 text-slate-300">
                  <td className="py-2 pr-4 whitespace-nowrap">{formatDate(batch.createdAt)}</td>
                  <td className="py-2 pr-4">{batch.period}</td>
                  <td className="py-2 pr-4">{CHANNEL_LABELS[batch.channel] ?? batch.channel}</td>
                  <td className="py-2 pr-4">{batch.status}</td>
                  <td className="py-2 pr-4 text-right">{batch.creditCount}</td>
                  <td className="py-2 pr-4 text-right whitespace-nowrap">{formatRupiah(batch.totalAmount)}</td>
                  <td className="py-2 text-right">
                    <a
                      href={`/api/admin/payout-batches/${encodeURIComponent(batch.id)}/csv`}
                      className="text-brand-400 hover:text-brand-300 underline"
                      aria-label={`Unduh CSV payout ${batch.period} ${batch.channel}`}
                    >
                      Unduh
                    </a>
                  </td>
                  <td className="py-2 text-right">
                    {batch.status === "DRAFT" && (
                      <Button size="sm" variant="success" loading={payingId === batch.id}
                        disabled={payingId !== null} onClick={() => handleMarkPaid(batch)}>
                        Sudah Ditransfer
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
    </div>
  );
}
