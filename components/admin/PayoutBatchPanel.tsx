"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, HandCoins, Info, Users, Clock, CheckCircle2, AlertCircle } from "lucide-react";
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

interface ReferrerSummaryItem {
  customerId: string;
  phone: string;
  name: string | null;
  referralCode: string | null;
  payableAmount: number;
  accruedAmount: number;
  paidAmount: number;
  earliestPayableAt: string | null;
  daysUntilMaturity: number | null;
  eligibilityStatus: "READY" | "BELOW_THRESHOLD" | "WAITING_ACCRUAL" | "ZERO_CREDIT";
}

interface SummaryResponse {
  config: {
    minPayoutAmount: number;
    accrualWindowDays: number;
  };
  metrics: {
    totalPayable: number;
    totalAccrued: number;
    totalPaid: number;
    eligibleCount: number;
    waitingAccrualCount: number;
    totalReferrers: number;
  };
  referrers: ReferrerSummaryItem[];
}

const CHANNEL_LABELS: Record<string, string> = {
  GOPAY: "GoPay",
  OVO: "OVO",
};

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function PayoutBatchPanel() {
  const [period, setPeriod] = useState(currentPeriod());
  const [channel, setChannel] = useState("GOPAY");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [batches, setBatches] = useState<PayoutBatchRow[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);

  // Referrer Credits Summary State
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

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

  const fetchSummary = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const res = await fetch("/api/admin/payout-batches/summary", { cache: "no-store" });
      if (!res.ok) throw new Error("Gagal memuat ringkasan kredit referrer");
      setSummary((await res.json()) as SummaryResponse);
    } catch {
      toast.error("Gagal memuat ringkasan kredit referrer");
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  useEffect(() => {
    void fetchBatches();
    void fetchSummary();
  }, [fetchBatches, fetchSummary]);

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
        void fetchSummary();
        toast.success(
          `Batch ${data.batch.period} dibuat: ${data.lines.length} referrer, ${formatRupiah(data.batch.totalAmount)}`
        );
      } else {
        const thresholdText = summary?.config.minPayoutAmount
          ? formatRupiah(summary.config.minPayoutAmount)
          : "Rp 20.000";
        toast.info(
          data.message ??
            `Belum ada kredit PAYABLE di atas ambang ${thresholdText}. Periksa tabel kredit referrer di bawah.`
        );
      }
    } catch {
      toast.error("Gagal membuat payout batch");
    } finally {
      setGenerating(false);
    }
  }

  async function handleMarkPaid(batch: PayoutBatchRow) {
    if (
      !window.confirm(
        `Konfirmasi transfer manual ${formatRupiah(batch.totalAmount)} untuk batch ${batch.period} (${batch.channel}) sudah selesai? Tindakan ini tidak dapat dibatalkan.`
      )
    )
      return;
    setPayingId(batch.id);
    try {
      const res = await fetch(
        `/api/admin/payout-batches/${encodeURIComponent(batch.id)}/paid`,
        { method: "POST" }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Gagal menandai batch dibayar");
      }
      toast.success("Batch dan credit sudah ditandai PAID");
      await fetchBatches();
      await fetchSummary();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menandai batch dibayar");
    } finally {
      setPayingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* ── 1. Edukasi & Informasi Aturan Payout ── */}
      <Card className="p-5 border-blue-500/20 bg-blue-950/10">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 mt-0.5">
            <Info size={18} />
          </div>
          <div className="space-y-1 text-sm">
            <h3 className="font-semibold text-blue-300">
              Ketentuan & Mekanisme Payout Referral
            </h3>
            <p className="text-slate-300 leading-relaxed text-xs sm:text-sm">
              • <strong>Masa Tunggu 15 Hari:</strong> Setiap komisi referral memiliki masa tunggu{" "}
              <span className="text-blue-400 font-medium">15 hari</span> (status{" "}
              <code className="text-amber-400 bg-surface px-1 py-0.5 rounded">ACCRUED</code>) sejak pesanan selesai
              sebelum otomatis matang menjadi{" "}
              <code className="text-emerald-400 bg-surface px-1 py-0.5 rounded">PAYABLE</code>.
              <br />
              • <strong>Ambang Minimum Payout:</strong> Penarikan batch hanya memproses saldo{" "}
              <span className="text-emerald-400 font-medium">
                ≥ {summary?.config.minPayoutAmount ? formatRupiah(summary.config.minPayoutAmount) : "Rp 20.000"}
              </span>
              . Saldo di bawah ambang akan di-rollover ke periode berikutnya hingga mencukupi.
            </p>
          </div>
        </div>
      </Card>

      {/* ── 2. Ringkasan Saldo Kredit Referrer ── */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-950/10 space-y-1">
            <span className="text-xs text-slate-400">Total Saldo Siap Tarik (PAYABLE)</span>
            <div className="text-xl font-bold text-emerald-400">
              {formatRupiah(summary.metrics.totalPayable)}
            </div>
            <div className="text-xs text-emerald-300 flex items-center gap-1">
              <CheckCircle2 size={13} />
              {summary.metrics.eligibleCount} referrer memenuhi syarat payout
            </div>
          </div>
          <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-950/10 space-y-1">
            <span className="text-xs text-slate-400">Total Saldo Masa Tunggu (ACCRUED)</span>
            <div className="text-xl font-bold text-amber-400">
              {formatRupiah(summary.metrics.totalAccrued)}
            </div>
            <div className="text-xs text-amber-300 flex items-center gap-1">
              <Clock size={13} />
              {summary.metrics.waitingAccrualCount} referrer sedang dalam masa tunggu 15 hari
            </div>
          </div>
          <div className="p-4 rounded-xl border border-brand-500/20 bg-surface-card space-y-1">
            <span className="text-xs text-slate-400">Total Riwayat Dicairkan (PAID)</span>
            <div className="text-xl font-bold text-brand-400">
              {formatRupiah(summary.metrics.totalPaid)}
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-1">
              <Users size={13} />
              Total {summary.metrics.totalReferrers} referrer terdaftar
            </div>
          </div>
        </div>
      )}

      {/* ── 3. Tabel Data Saldo & Status Referrer ── */}
      <Card className="p-5 border-brand-500/10">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-400" />
            <h2 className="text-lg font-semibold text-white">Status Kredit Customers Referrer</h2>
          </div>
          <Button variant="outline" size="sm" onClick={fetchSummary} disabled={loadingSummary}>
            Muat Ulang Data
          </Button>
        </div>

        {loadingSummary ? (
          <p className="text-sm text-slate-400 py-6 text-center" role="status">
            Memuat data kredit referrer...
          </p>
        ) : !summary || summary.referrers.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">
            Belum ada data customer referrer atau komisi referral tercatat.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 border-b border-surface-border">
                  <th className="py-2.5 pr-4 font-medium">Referrer</th>
                  <th className="py-2.5 pr-4 font-medium">Kode Referral</th>
                  <th className="py-2.5 pr-4 font-medium text-right">Siap Tarik (PAYABLE)</th>
                  <th className="py-2.5 pr-4 font-medium text-right">Masa Tunggu (ACCRUED)</th>
                  <th className="py-2.5 pr-4 font-medium text-right">Sudah Dibayar (PAID)</th>
                  <th className="py-2.5 font-medium text-center">Status Kelayakan</th>
                </tr>
              </thead>
              <tbody>
                {summary.referrers.map((ref) => (
                  <tr key={ref.customerId} className="border-b border-surface-border/50 text-slate-300">
                    <td className="py-2.5 pr-4">
                      <div className="font-medium text-slate-200">{ref.name || "Customer"}</div>
                      <div className="font-mono text-xs text-slate-400">{ref.phone}</div>
                    </td>
                    <td className="py-2.5 pr-4">
                      {ref.referralCode ? (
                        <span className="font-mono text-xs text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">
                          {ref.referralCode}
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 text-right">
                      <span className={ref.payableAmount > 0 ? "font-semibold text-emerald-400" : "text-slate-500"}>
                        {formatRupiah(ref.payableAmount)}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-right">
                      <div>
                        <span className={ref.accruedAmount > 0 ? "font-semibold text-amber-400" : "text-slate-500"}>
                          {formatRupiah(ref.accruedAmount)}
                        </span>
                        {ref.daysUntilMaturity !== null && ref.daysUntilMaturity > 0 && (
                          <div className="text-[10px] text-amber-300/80 flex items-center justify-end gap-1 mt-0.5">
                            <Clock size={10} />
                            <span>Matang ~{ref.daysUntilMaturity} hari lagi</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 text-right text-slate-400">
                      {formatRupiah(ref.paidAmount)}
                    </td>
                    <td className="py-2.5 text-center">
                      {ref.eligibilityStatus === "READY" && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          <CheckCircle2 size={12} />
                          Siap Payout
                        </span>
                      )}
                      {ref.eligibilityStatus === "BELOW_THRESHOLD" && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                          <AlertCircle size={12} />
                          &lt; Ambang (Rollover)
                        </span>
                      )}
                      {ref.eligibilityStatus === "WAITING_ACCRUAL" && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          <Clock size={12} />
                          Masa Tunggu 15 Hari
                        </span>
                      )}
                      {ref.eligibilityStatus === "ZERO_CREDIT" && (
                        <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full text-slate-500 bg-surface border border-surface-border">
                          Rp 0 (Belum Ada Transaksi)
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── 4. Panel Form Generate Payout Batch ── */}
      <Card className="p-5 border-brand-500/10">
        <div className="flex items-center gap-2 mb-1">
          <HandCoins className="w-5 h-5 text-brand-400" />
          <h2 className="text-lg font-semibold text-white">Generate Payout Referral</h2>
        </div>
        <p className="text-sm text-slate-400 mb-4">
          Generate batch payout untuk kredit <strong>PAYABLE</strong> yang telah mencapai ambang minimum{" "}
          <span className="text-brand-300 font-semibold">
            {summary?.config.minPayoutAmount ? formatRupiah(summary.config.minPayoutAmount) : "Rp 20.000"}
          </span>
          . Transfer manual ditujukan ke nomor HP/e-wallet referrer, lalu unduh CSV untuk transfer.
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

      {/* ── 5. Riwayat Payout Batch ── */}
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
                        <Button
                          size="sm"
                          variant="success"
                          loading={payingId === batch.id}
                          disabled={payingId !== null}
                          onClick={() => handleMarkPaid(batch)}
                        >
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
