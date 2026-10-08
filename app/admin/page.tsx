import { Activity, Package, ArrowRight, DollarSign, ShoppingCart, TrendingUp, AlertCircle, AlertTriangle, CheckCircle, Crown, Clock, CreditCard } from "lucide-react";
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
    pendingOrders,
    totalDebtAgg,
    recentTransactions,
    activeProducts
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
    prisma.transaction.count({
      where: { status: "PENDING" },
    }),
    prisma.user.aggregate({
      where: { role: "AGENT" },
      _sum: { outstandingDebt: true }
    }),
    prisma.transaction.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { product: { select: { name: true } }, agent: { select: { username: true } } },
    }),
    prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        supplierMode: true,
        supplierStock: true,
        _count: {
          select: { stocks: { where: { status: "AVAILABLE" } } }
        }
      }
    }),
  ]);

  const totalRevenue = totalRevenueAgg._sum.finalAmount || 0;
  const todayRevenue = todayRevenueAgg._sum.finalAmount || 0;
  const totalAgentDebt = totalDebtAgg._sum.outstandingDebt || 0;

  // Process low stock products (<= 5 items left)
  const lowStockAlerts = activeProducts
    .map((p: any) => {
      const isExternal = p.supplierMode === 'REZEKI' || p.supplierMode === 'DIGITALCORE';
      const effectiveStock = isExternal ? p.supplierStock : p._count.stocks;
      return { ...p, effectiveStock };
    })
    .filter((p: any) => p.effectiveStock <= 5)
    .sort((a: any, b: any) => a.effectiveStock - b.effectiveStock)
    .slice(0, 5); // Take top 5 most critical

  // Process top sellers
  const allProductsForTopSellers = await prisma.product.findMany({
    include: {
      _count: { select: { transactions: { where: { status: "PAID" } } } }
    }
  });
  
  const topSellers = allProductsForTopSellers
    .sort((a: any, b: any) => b._count.transactions - a._count.transactions)
    .slice(0, 3);
  const maxSales = topSellers[0]?._count.transactions || 1;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Admin Dashboard</h1>
        <p className="text-slate-400 mt-2 text-sm">Ringkasan performa bisnis dan status sistem VendingLink.</p>
      </div>

      {/* Business Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {/* Revenue Today */}
        <div className="bg-surface-card border border-surface-border rounded-2xl p-6 relative overflow-hidden group hover:border-brand-500/50 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp size={64} className="text-brand-400" />
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center">
              <DollarSign size={20} className="text-brand-400" />
            </div>
            <p className="font-medium text-slate-300 text-sm">Pendapatan Hari Ini</p>
          </div>
          <h2 className="text-2xl lg:text-3xl font-bold text-white">{formatRupiah(todayRevenue)}</h2>
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
            <p className="font-medium text-slate-300 text-sm">Total Pendapatan</p>
          </div>
          <h2 className="text-2xl lg:text-3xl font-bold text-white">{formatRupiah(totalRevenue)}</h2>
          <p className="text-xs text-slate-500 mt-2">Sepanjang waktu</p>
        </div>

        {/* Total Orders & Pending */}
        <div className="bg-surface-card border border-surface-border rounded-2xl p-6 relative overflow-hidden group hover:border-blue-500/50 transition-colors flex flex-col justify-between">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <ShoppingCart size={64} className="text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
                <ShoppingCart size={20} className="text-blue-400" />
              </div>
              <p className="font-medium text-slate-300 text-sm">Pesanan Sukses</p>
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-white">{totalOrders} <span className="text-sm text-slate-400 font-normal">sukses</span></h2>
          </div>
          <p className="text-xs text-amber-400 mt-2 font-medium flex items-center gap-1">
            <Clock size={12} /> {pendingOrders} pesanan tertunda
          </p>
        </div>

        {/* Total Agent Debt */}
        <div className="bg-surface-card border border-surface-border rounded-2xl p-6 relative overflow-hidden group hover:border-red-500/50 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <CreditCard size={64} className="text-red-400" />
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center">
              <AlertCircle size={20} className="text-red-400" />
            </div>
            <p className="font-medium text-slate-300 text-sm">Total Piutang Agen</p>
          </div>
          <h2 className="text-2xl lg:text-3xl font-bold text-white">{formatRupiah(totalAgentDebt)}</h2>
          <p className="text-xs text-slate-500 mt-2">Menunggu pelunasan</p>
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
                recentTransactions.map((tx: any) => (
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

          {/* Top Sellers Widget */}
          <div className="bg-surface-card border border-surface-border rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30">
                <Crown size={18} className="text-amber-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">Produk Terlaris</h2>
            </div>
            
            <div className="space-y-4">
              {topSellers.length === 0 || topSellers[0]._count.transactions === 0 ? (
                <div className="text-center py-6 text-slate-500 text-sm">Belum ada data penjualan.</div>
              ) : (
                topSellers.map((product: any, index: number) => (
                  <div key={product.id} className="relative">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-white flex items-center gap-2">
                        <span className="text-slate-500 text-xs">#{index + 1}</span> {product.name}
                      </span>
                      <span className="text-brand-400 font-bold">{product._count.transactions} terjual</span>
                    </div>
                    <div className="w-full bg-surface-hover rounded-full h-2 overflow-hidden border border-surface-border/50">
                      <div 
                        className="bg-gradient-to-r from-brand-600 to-brand-400 h-2 rounded-full transition-all duration-1000 ease-out" 
                        style={{ width: `${Math.max(5, (product._count.transactions / maxSales) * 100)}%` }}
                      ></div>
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

        {/* Right Column: System Health & Alerts */}
        <div className="lg:col-span-1 space-y-6">
          {/* Low Stock Alerts */}
          <div className="bg-surface-card border border-surface-border rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <AlertTriangle size={80} className="text-amber-500" />
            </div>
            <div className="flex items-center justify-between mb-5 relative z-10">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-400" />
                Peringatan Stok
              </h2>
            </div>
            
            <div className="space-y-3 relative z-10">
              {lowStockAlerts.length === 0 ? (
                <div className="text-center py-6 text-emerald-400/80 text-sm bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                  <CheckCircle size={24} className="mx-auto mb-2 opacity-50" />
                  Semua stok produk aman!
                </div>
              ) : (
                lowStockAlerts.map((product: any) => (
                  <div key={product.id} className="flex items-center justify-between p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                    <div>
                      <p className="font-medium text-white text-sm">{product.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Mode: {product.supplierMode}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${product.effectiveStock === 0 ? 'text-red-400' : 'text-amber-400'}`}>
                        {product.effectiveStock}
                      </p>
                      <p className="text-[10px] text-slate-500">Tersisa</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {lowStockAlerts.length > 0 && (
              <Link href="/admin/inventory" className="mt-4 block w-full text-center text-xs font-medium text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 py-2 rounded-lg transition-colors">
                Tambah Stok Sekarang
              </Link>
            )}
          </div>

          <SystemHealthWidget />
        </div>
      </div>
    </div>
  );
}
