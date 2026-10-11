"use client";

import { useCallback, useEffect, useState } from "react";
import { Users } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import toast from "@/components/ui/Toast";
import { formatDate, formatRupiah } from "@/lib/utils";

interface CustomerRow {
  id: string;
  name: string | null;
  phone: string;
  consentPromoAt: string | null;
  referralCode: string | null;
  createdAt: string;
  orderCount: number;
  totalSpent: number;
}

interface CustomerList {
  customers: CustomerRow[];
  total: number;
  page: number;
  totalPages: number;
}

export default function CustomersPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<CustomerList | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/customers?page=${page}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Gagal memuat pelanggan");
      setData(await res.json());
    } catch {
      toast.error("Gagal memuat pelanggan");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Users className="text-brand-400" size={24} />
        <div>
          <h1 className="text-2xl font-bold text-white">Pelanggan</h1>
          <p className="text-sm text-slate-400">Daftar pelanggan, persetujuan promo, dan riwayat pembelian.</p>
        </div>
      </div>
      <Card className="p-5">
        {loading ? <Spinner label="Memuat pelanggan..." /> : !data || data.customers.length === 0 ? (
          <p className="text-sm text-slate-400">Belum ada pelanggan di halaman ini.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-surface-border">
                  <th className="py-2 pr-4">Nama</th>
                  <th className="py-2 pr-4">Nomor HP</th>
                  <th className="py-2 pr-4">Consent promo</th>
                  <th className="py-2 pr-4">Kode referral</th>
                  <th className="py-2 pr-4 text-right">Order</th>
                  <th className="py-2 text-right">Total belanja</th>
                </tr>
              </thead>
              <tbody>
                {data.customers.map((customer) => (
                  <tr key={customer.id} className="border-b border-surface-border/50 text-slate-300">
                    <td className="py-2 pr-4">{customer.name ?? "—"}</td>
                    <td className="py-2 pr-4 font-mono">{customer.phone}</td>
                    <td className="py-2 pr-4">{customer.consentPromoAt ? `Setuju: ${formatDate(customer.consentPromoAt)}` : "Tidak setuju"}</td>
                    <td className="py-2 pr-4 font-mono">{customer.referralCode ?? "—"}</td>
                    <td className="py-2 pr-4 text-right">{customer.orderCount}</td>
                    <td className="py-2 text-right whitespace-nowrap">{formatRupiah(customer.totalSpent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && data.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-end gap-3">
            <span className="text-xs text-slate-400">{data.total} pelanggan · Halaman {data.page} / {data.totalPages}</span>
            <Button size="sm" variant="secondary" disabled={page <= 1 || loading} onClick={() => setPage((n) => n - 1)}>Sebelumnya</Button>
            <Button size="sm" variant="secondary" disabled={page >= data.totalPages || loading} onClick={() => setPage((n) => n + 1)}>Berikutnya</Button>
          </div>
        )}
      </Card>
    </div>
  );
}