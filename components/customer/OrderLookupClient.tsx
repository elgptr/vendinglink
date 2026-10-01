"use client";

import { useState } from "react";
import { Search, Phone, ExternalLink, Package, Calendar } from "lucide-react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { formatRupiah, formatDate } from "@/lib/utils";

interface OrderData {
  orderId: string;
  productName: string;
  productType: string;
  redeemUrl: string | null;
  finalAmount: number;
  paidAt: string;
  stockStatus: string;
}

export default function OrderLookupClient() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [orders, setOrders] = useState<OrderData[]>([]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;

    setLoading(true);
    setHasSearched(false);

    try {
      const res = await fetch(`/api/customer/orders?phone=${encodeURIComponent(phone)}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      } else {
        setOrders([]);
      }
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
      setHasSearched(true);
    }
  };

  return (
    <div>
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4 mb-10">
        <div className="flex-1">
          <Input
            id="lookup-phone-input"
            type="tel"
            placeholder="08xxxxxxxxxx"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            leftIcon={<Phone size={18} />}
            required
            className="h-12 text-lg"
          />
        </div>
        <Button
          type="submit"
          size="lg"
          className="h-12 px-8"
          loading={loading}
          icon={<Search size={20} />}
        >
          Cari Pesanan
        </Button>
      </form>

      {hasSearched && orders.length === 0 && (
        <Card className="p-10 text-center bg-surface-card/50">
          <Package size={48} className="text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Tidak Ada Pesanan Ditemukan</h3>
          <p className="text-slate-400 max-w-md mx-auto">
            Kami tidak dapat menemukan riwayat pesanan dengan nomor WhatsApp tersebut. Pastikan nomor yang dimasukkan sama dengan saat checkout.
          </p>
        </Card>
      )}

      {orders.length > 0 && (
        <div className="space-y-6">
          <p className="text-sm font-semibold text-brand-400 uppercase tracking-wider mb-2">
            Ditemukan {orders.length} Pesanan
          </p>
          
          {orders.map((order) => (
            <Card key={order.orderId} className="p-6 transition-all hover:border-brand-500/30">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-surface-border">
                <div>
                  <h3 className="font-bold text-white text-lg">{order.productName}</h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Calendar size={14} />
                      {formatDate(order.paidAt)}
                    </span>
                    <span className="font-mono text-xs bg-surface py-0.5 px-2 rounded border border-surface-border">
                      ID: {order.orderId}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500 mb-0.5">Total Bayar</p>
                  <p className="font-bold text-emerald-400">{formatRupiah(order.finalAmount)}</p>
                </div>
              </div>

              <div className="bg-surface rounded-xl p-4 border border-surface-border">
                {order.stockStatus === "OUT_OF_STOCK" ? (
                  <div className="text-amber-400 text-sm">
                    <strong>Pemberitahuan:</strong> Stok produk habis saat Anda membayar. Silakan cek halaman pesanan untuk klaim voucher refund.
                  </div>
                ) : order.redeemUrl ? (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex-1 overflow-hidden">
                      <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider font-semibold">
                        {order.productType === "KODE" ? "Kode Akses" : "Link Akses"}
                      </p>
                      <p className="text-white font-mono truncate select-all">{order.redeemUrl}</p>
                    </div>
                    <a 
                      href={`/customer/order/${order.orderId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="secondary" size="sm" icon={<ExternalLink size={14} />}>
                        Buka Halaman Detail
                      </Button>
                    </a>
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm">Akses produk sedang disiapkan atau memerlukan bantuan admin.</p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
