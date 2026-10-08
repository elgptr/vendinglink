import { Activity, Package, ArrowRight, DollarSign, ShoppingCart, TrendingUp, AlertCircle } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import SystemHealthWidget from "@/components/admin/SystemHealthWidget";
import { formatRupiah, formatDate } from "@/lib/utils";

// Make it a Server Component
export default async function AdminDashboardPage() {
  // 1. Fetch Key Business Metrics
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalRevenueAgg,
    todayRevenueAgg,
    totalOrders,
    recentTransactions,
  ] = await Promise.all([
    prisma.transaction.aggregate({
      where: { status: "PAID" },
      _sum: { finalAmount: true },
    }),
    prisma.transaction.aggregate({
      where: { status: "PAID", paidAt: { gte: today } },
      _sum: { finalAmount: true },
    }),
    prisma.transaction.count({
      where: { status: "PAID" },
    }),
    prisma.transaction.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { product: { select: { name: true } }, agent: { select: { username: true } } },
    }),
  ]);

  const totalRevenue = totalRevenueAgg._sum.finalAmount || 0;
  const todayRevenue = todayRevenueAgg._sum.finalAmount || 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Admin Dashboard</h1>
        <p className="text-slate-400 mt-2 text-sm">Ringkasan performa bisnis dan status sistem VendingLink.</p>
      </div>

      {/* Business Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Revenue Today */}
        <div className="bg-surface-card border border-surface-border rounded-2xl p-6 relative overflow-hidden group hover:border-brand-500/50 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp size={64} className="text-brand-400" />
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center">
              <DollarSign size={20} className="text-brand-400" />
            </div>
            <p className="font-medium text-slate-300">Pendapatan Hari Ini</p>
          </div>
          <h2 className="text-3xl font-bold text-white">{formatRupiah(todayRevenue)}</h2>
          <p className="text-xs text-brand-400 mt-2 font-medium flex items-center gap-1">
            <Activity size={12} /> Real-time
          </p>
        </div>

        {/* Total Revenue */}
        <div className="bg-surface-card border border-surface-border rounded-2xl p-6 relative overflow-hidden group hover:border-purple-500/50 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <DollarSign size={64} className="text-purple-400" />
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
              <Activity size={20} className="text-purple-400" />
            </div>
            <p className="font-medium text-slate-300">Total Pendapatan</p>
          </div>
          <h2 className="text-3xl font-bold text-white">{formatRupiah(totalRevenue)}</h2>
          <p className="text-xs text-slate-500 mt-2">Sepanjang waktu (All time)</p>
        </div>

        {/* Total Orders */}
        <div className="bg-surface-card border border-surface-border rounded-2xl p-6 relative overflow-hidden group hover:border-blue-500/50 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <ShoppingCart size={64} className="text-blue-400" />
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
              <ShoppingCart size={20} className="text-blue-400" />
            </div>
            <p className="font-medium text-slate-300">Total Pesanan Sukses</p>
          </div>
          <h2 className="text-3xl font-bold text-white">{totalOrders} <span className="text-lg text-slate-400 font-normal">pesanan</span></h2>
          <p className="text-xs text-slate-500 mt-2">Status: PAID</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Transactions & Quick Links */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Transactions */}
          <div className="bg-surface-card border border-surface-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Clock size={18} className="text-brand-400" />
                Transaksi Terakhir
              </h2>
              <Link href="/admin/reports" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors">
                Lihat Semua <ArrowRight size={12} />
              </Link>
            </div>
            
            <div className="space-y-4">
              {recentTransactions.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">Belum ada transaksi.</div>
              ) : (
                recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-4 rounded-xl bg-surface-hover border border-surface-border/50">
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-2 ${tx.status === 'PAID' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : tx.status === 'PENDING' ? 'bg-amber-400' : 'bg-red-400'}`} />
                      <div>
                        <p className="font-medium text-white text-sm">{tx.product.name}</p>
                        <p className="text-xs text-slate-400 mt-1">{tx.customerName || tx.agent?.username || 'Unknown'} • {formatDate(tx.createdAt)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-white text-sm">{formatRupiah(tx.finalAmount)}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 inline-block ${tx.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-400' : tx.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>
                        {tx.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Action Links */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/admin/inventory" className="bg-surface-card border border-surface-border rounded-2xl p-5 hover:border-brand-500/50 transition-colors group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center group-hover:bg-brand-500/20 group-hover:border-brand-500/40 transition-colors">
                    <Package size={20} className="text-slate-300 group-hover:text-brand-400 transition-colors" />
                  </div>
                  <div>
                    <p className="font-medium text-white group-hover:text-brand-400 transition-colors">Kelola Inventori</p>
                    <p className="text-xs text-slate-400">Tambah & edit produk</p>
                  </div>
                </div>
                <ArrowRight size={16} className="text-slate-600 group-hover:text-brand-400 transition-colors" />
              </div>
            </Link>

            <Link href="/admin/settings" className="bg-surface-card border border-surface-border rounded-2xl p-5 hover:border-brand-500/50 transition-colors group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center group-hover:bg-brand-500/20 group-hover:border-brand-500/40 transition-colors">
                    <AlertCircle size={20} className="text-slate-300 group-hover:text-brand-400 transition-colors" />
                  </div>
                  <div>
                    <p className="font-medium text-white group-hover:text-brand-400 transition-colors">Pengaturan Sistem</p>
                    <p className="text-xs text-slate-400">Konfigurasi AI & Webhook</p>
                  </div>
                </div>
                <ArrowRight size={16} className="text-slate-600 group-hover:text-brand-400 transition-colors" />
              </div>
            </Link>
          </div>
        </div>

        {/* Right Column: System Health */}
        <div className="lg:col-span-1">
          <SystemHealthWidget />
        </div>
      </div>
    </div>
  );
}
