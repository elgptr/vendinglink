"use client";

import { useState, useEffect, FormEvent } from "react";
import { Ticket, Plus, ToggleLeft, ToggleRight } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import toast from "@/components/ui/Toast";
import { formatRupiah, formatDate } from "@/lib/utils";

interface Voucher {
  id: string;
  code: string;
  discountAmount: number;
  quota: number;
  usedCount: number;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
}

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  // Form
  const [code, setCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  const [quota, setQuota] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const fetchVouchers = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/vouchers");
    const data = await res.json();
    setVouchers(data);
    setLoading(false);
  };

  useEffect(() => { fetchVouchers(); }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const res = await fetch("/api/admin/vouchers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: code.toUpperCase().trim(),
        discountAmount: parseInt(discountAmount),
        quota: parseInt(quota),
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      }),
    });

    const data = await res.json();
    if (res.ok) {
      toast.success("Voucher berhasil dibuat!");
      fetchVouchers();
      setShowModal(false);
      setCode(""); setDiscountAmount(""); setQuota(""); setExpiresAt("");
    } else {
      toast.error(data.error || "Gagal membuat voucher");
    }
    setSubmitting(false);
  };

  const handleToggle = async (voucher: Voucher) => {
    setToggling(voucher.id);
    const res = await fetch("/api/admin/vouchers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: voucher.id, isActive: !voucher.isActive }),
    });

    if (res.ok) {
      toast.success(`Voucher ${voucher.isActive ? "dinonaktifkan" : "diaktifkan"}`);
      fetchVouchers();
    } else {
      toast.error("Gagal mengubah status voucher");
    }
    setToggling(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-purple-500/10 rounded-xl border border-purple-500/20">
              <Ticket size={20} className="text-purple-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Kelola Voucher</h1>
          </div>
          <p className="text-slate-400 ml-14">Buat dan kelola kode promo</p>
        </div>
        <Button
          id="create-voucher-btn"
          icon={<Plus size={16} />}
          onClick={() => setShowModal(true)}
        >
          Voucher Baru
        </Button>
      </div>

      {/* Voucher Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="py-12"><Spinner label="Memuat voucher..." /></div>
        ) : vouchers.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <Ticket size={40} className="mx-auto mb-3 opacity-40" />
            <p>Belum ada voucher</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Kode</th>
                  <th>Nilai Diskon</th>
                  <th>Progres Kuota</th>
                  <th>Berlaku Hingga</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {vouchers.map((v) => {
                  const quotaPercent = Math.min(
                    100,
                    Math.round((v.usedCount / v.quota) * 100)
                  );
                  const isExpired =
                    v.expiresAt && new Date(v.expiresAt) < new Date();

                  return (
                    <tr key={v.id}>
                      <td>
                        <span className="font-mono font-bold text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded text-sm">
                          {v.code}
                        </span>
                      </td>
                      <td className="font-semibold text-emerald-400">
                        {formatRupiah(v.discountAmount)}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-surface rounded-full h-1.5">
                            <div
                              className="bg-brand-500 h-1.5 rounded-full transition-all"
                              style={{ width: `${quotaPercent}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-400">
                            {v.usedCount} / {v.quota}
                          </span>
                        </div>
                      </td>
                      <td className="text-slate-400 text-xs">
                        {v.expiresAt
                          ? isExpired
                            ? <span className="text-red-400">Kadaluarsa</span>
                            : formatDate(v.expiresAt)
                          : "Tidak ada batas"
                        }
                      </td>
                      <td>
                        <Badge variant={v.isActive && !isExpired ? "success" : "danger"} dot>
                          {v.isActive && !isExpired ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </td>
                      <td>
                        <button
                          id={`toggle-voucher-${v.id}`}
                          onClick={() => handleToggle(v)}
                          disabled={toggling === v.id}
                          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                        >
                          {v.isActive ? (
                            <ToggleRight size={20} className="text-brand-400" />
                          ) : (
                            <ToggleLeft size={20} />
                          )}
                          {v.isActive ? "Nonaktifkan" : "Aktifkan"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create Voucher Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Buat Voucher Baru"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowModal(false)}>Batal</Button>
            <Button
              id="submit-voucher-btn"
              onClick={handleCreate as () => void}
              loading={submitting}
            >
              Simpan Voucher
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            id="voucher-code-field"
            label="Kode Voucher"
            placeholder="HEMAT100K"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            required
            maxLength={30}
            hint="Huruf kapital, tanpa spasi"
          />
          <Input
            id="voucher-discount-field"
            label="Nilai Diskon (Rp)"
            type="number"
            min="1"
            placeholder="100000"
            value={discountAmount}
            onChange={(e) => setDiscountAmount(e.target.value)}
            required
          />
          <Input
            id="voucher-quota-field"
            label="Kuota Pemakaian"
            type="number"
            min="1"
            placeholder="10"
            value={quota}
            onChange={(e) => setQuota(e.target.value)}
            required
          />
          <Input
            id="voucher-expiry-field"
            label="Berlaku Hingga (Opsional)"
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            hint="Kosongkan jika tidak ada batas waktu"
          />
        </form>
      </Modal>
    </div>
  );
}
