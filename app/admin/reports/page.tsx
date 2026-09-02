"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart3,
  TrendingUp,
  Package,
  Wallet,
  Download,
  Filter,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Card, { StatCard } from "@/components/ui/Card";
import Spinner from "@/components/ui/Spinner";
import Modal from "@/components/ui/Modal";
import toast from "@/components/ui/Toast";
import { formatRupiah, formatDate } from "@/lib/utils";

interface Transaction {
  id: string;
  orderId: string;
  status: string;
  finalAmount: number;
  originalPrice: number;
  discountAmount: number;
  customerName: string | null;
  paidAt: string | null;
  createdAt: string;
  product: { name: string };
  agent: { username: string };
  voucher: { code: string } | null;
}

interface Metrics {
  totalGross: number;
  totalNet: number;
  totalSold: number;
}

interface Agent {
  id: string;
  username: string;
}

interface ReportData {
  metrics: Metrics;
  agents: Agent[];
  transactions: Transaction[];
  total: number;
  page: number;
  totalPages: number;
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [agentId, setAgentId] = useState("");
  const [page, setPage] = useState(1);

  // AI Insight
  const [insightOpen, setInsightOpen] = useState(false);
  const [insightText, setInsightText] = useState("");
  const [insightLoading, setInsightLoading] = useState(false);

  const buildUrl = useCallback(
    (exportCsv?: boolean) => {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (agentId) params.set("agentId", agentId);
      params.set("page", page.toString());
      if (exportCsv) params.set("export", "csv");
      return `/api/admin/reports?${params.toString()}`;
    },
    [startDate, endDate, agentId, page]
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(buildUrl());
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Gagal memuat laporan");
    }
    setLoading(false);
  }, [buildUrl]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const res = await fetch(buildUrl(true));
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `laporan-penjualan-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("CSV berhasil diunduh!");
    } catch {
      toast.error("Gagal mengekspor CSV");
    }
    setExporting(false);
  };

  const handleAiInsight = async () => {
    setInsightOpen(true);
    setInsightText("");
    setInsightLoading(true);
    try {
      const res = await fetch("/api/admin/reports/insight", { method: "POST" });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "Gagal memuat analisis AI");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      while (!done) {
        const result = await reader.read();
        done = result.done;
        if (result.value) {
          setInsightText((prev) => prev + decoder.decode(result.value, { stream: true }));
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memuat analisis AI");
      setInsightOpen(false);
    }
    setInsightLoading(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-purple-500/10 rounded-xl border border-purple-500/20">
              <BarChart3 size={20} className="text-purple-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Laporan Penjualan</h1>
          </div>
          <p className="text-slate-400 ml-14">Pantau performa penjualan dan omset</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            id="ai-insight-btn"
            variant="primary"
            icon={<Sparkles size={16} />}
            onClick={handleAiInsight}
          >
            AI Insight
          </Button>
          <Button
            id="export-csv-btn"
            variant="secondary"
            icon={<Download size={16} />}
            onClick={handleExportCSV}
            loading={exporting}
          >
            Download CSV
          </Button>
        </div>
      </div>

      {/* Metrics */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Total Omset Kotor"
            value={formatRupiah(data.metrics.totalGross)}
            icon={<TrendingUp size={20} />}
            subtitle="Sebelum diskon"
            color="green"
          />
          <StatCard
            title="Total Omset Bersih"
            value={formatRupiah(data.metrics.totalNet)}
            icon={<Wallet size={20} />}
            subtitle="Setelah diskon"
            color="blue"
          />
          <StatCard
            title="Link Terjual"
            value={data.metrics.totalSold.toString()}
            icon={<Package size={20} />}
            subtitle="Transaksi berhasil"
            color="purple"
          />
        </div>
      )}

      {/* Filters */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={16} className="text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-300">Filter Laporan</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Dari Tanggal</label>
            <input
              id="filter-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-surface border border-surface-border text-slate-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Sampai Tanggal</label>
            <input
              id="filter-end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-surface border border-surface-border text-slate-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Filter Agen</label>
            <select
              id="filter-agent"
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              className="w-full bg-surface border border-surface-border text-slate-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            >
              <option value="">Semua Agen</option>
              {data?.agents.map((a) => (
                <option key={a.id} value={a.id}>{a.username}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button
              id="apply-filter-btn"
              onClick={() => { setPage(1); fetchData(); }}
              className="w-full"
              icon={<RefreshCw size={14} />}
            >
              Terapkan
            </Button>
          </div>
        </div>
      </Card>

      {/* Transactions Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="py-12"><Spinner label="Memuat laporan..." /></div>
        ) : !data || data.transactions.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <BarChart3 size={40} className="mx-auto mb-3 opacity-40" />
            <p>Belum ada transaksi selesai</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Produk</th>
                    <th>Agen</th>
                    <th>Pembeli</th>
                    <th>Voucher</th>
                    <th>Total Bayar</th>
                    <th>Waktu Bayar</th>
                  </tr>
                </thead>
                <tbody>
                  {data.transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td>
                        <span className="font-mono text-xs text-slate-400 bg-surface px-2 py-0.5 rounded">
                          {tx.orderId}
                        </span>
                      </td>
                      <td className="font-medium text-slate-200">{tx.product.name}</td>
                      <td className="text-slate-300">{tx.agent.username}</td>
                      <td className="text-slate-400">{tx.customerName || "—"}</td>
                      <td>
                        {tx.voucher ? (
                          <span className="font-mono text-xs text-brand-400">
                            {tx.voucher.code}
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="font-semibold text-emerald-400">
                        {formatRupiah(tx.finalAmount)}
                      </td>
                      <td className="text-slate-400 text-xs">
                        {tx.paidAt ? formatDate(tx.paidAt) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-surface-border">
                <span className="text-sm text-slate-400">
                  Total {data.total} transaksi
                </span>
                <div className="flex gap-2">
                  <Button
                    id="prev-page-btn"
                    variant="secondary"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    ← Sebelumnya
                  </Button>
                  <span className="flex items-center px-3 text-sm text-slate-400">
                    {page} / {data.totalPages}
                  </span>
                  <Button
                    id="next-page-btn"
                    variant="secondary"
                    size="sm"
                    disabled={page === data.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Berikutnya →
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* AI Insight Modal */}
      <Modal
        isOpen={insightOpen}
        onClose={() => setInsightOpen(false)}
        title="✨ AI Insight — Analisis Penjualan"
        size="xl"
      >
        {insightLoading && !insightText ? (
          <div className="py-10">
            <Spinner label="Menganalisis data penjualan 30 hari terakhir..." />
          </div>
        ) : (
          <div className="space-y-1">
            <InsightMarkdown text={insightText} />
            {insightLoading && (
              <span className="inline-block w-1.5 h-4 bg-brand-400 animate-pulse ml-0.5 align-middle" />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

/**
 * Minimal renderer for the subset of Markdown used by the AI insight prompt:
 * "### " headings, "- " bullet lists, "**bold**", and plain paragraphs.
 */
function InsightMarkdown({ text }: { text: string }) {
  const lines = text.split("\n");

  const renderInline = (line: string) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={i} className="text-white font-semibold">
          {part.slice(2, -2)}
        </strong>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  return (
    <div className="text-sm text-slate-300 leading-relaxed space-y-2">
      {lines.map((line, idx) => {
        if (line.startsWith("### ")) {
          return (
            <h3
              key={idx}
              className="text-base font-semibold text-white mt-4 mb-1 first:mt-0"
            >
              {line.slice(4)}
            </h3>
          );
        }
        if (line.trim().startsWith("- ")) {
          return (
            <div key={idx} className="flex gap-2 pl-1">
              <span className="text-brand-400">•</span>
              <span>{renderInline(line.trim().slice(2))}</span>
            </div>
          );
        }
        if (line.trim() === "") {
          return null;
        }
        return <p key={idx}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

