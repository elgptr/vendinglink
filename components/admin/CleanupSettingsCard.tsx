"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import toast from "@/components/ui/Toast";
import { Trash2 } from "lucide-react";

export default function CleanupSettingsCard() {
  const [loading, setLoading] = useState(false);

  const handleCleanup = async () => {
    if (
      !confirm(
        "⚠️ PERINGATAN: Apakah Anda yakin ingin menghapus semua stok yang sudah terjual dan riwayat transaksi (PAID/CANCELLED/EXPIRED)? Pastikan Anda sudah mengunduh Laporan Penjualan (CSV) atau memindahkannya ke Google Drive sebelum melakukan aksi ini karena data tidak dapat dikembalikan!"
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/cleanup", { method: "DELETE" });
      const data = await res.json();
      
      if (res.ok) {
        toast.success(`Berhasil menghapus ${data.deletedStocks} stok dan ${data.deletedTransactions} transaksi.`);
      } else {
        toast.error(data.error || "Gagal melakukan cleanup");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface-card border border-surface-border rounded-xl p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white mb-1">Manajemen Memori (Cleanup)</h2>
        <p className="text-sm text-slate-400">
          Hapus stok yang sudah terjual dan riwayat penjualan yang sudah selesai agar kapasitas database tidak penuh. <strong>Pastikan Anda sudah mem-backup atau export data ke Google Drive terlebih dahulu.</strong>
        </p>
      </div>
      
      <Button 
        variant="danger" 
        icon={<Trash2 size={16} />} 
        onClick={handleCleanup} 
        loading={loading}
      >
        Hapus Stok & Penjualan Lama
      </Button>
    </div>
  );
}
