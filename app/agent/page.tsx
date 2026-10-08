import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Activity, Clock, ShoppingBag, DollarSign, ArrowRight, Zap, History, CreditCard } from "lucide-react";
import { formatRupiah, formatDate } from "@/lib/utils";

export const metadata = { title: "Dashboard Agen" };

export default async function AgentDashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const agentId = session.user.id;
  const user = await prisma.user.findUnique({ where: { id: agentId } });
  
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [monthTxs, recentTxs] = await Promise.all([
    prisma.transaction.findMany({
      where: { agentId, createdAt: { gte: startOfMonth }, status: "PAID" },
    }),
    prisma.transaction.findMany({
      where: { agentId },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { product: true }
    })
  ]);

  const monthTotal = monthTxs.reduce((sum, tx) => sum + tx.finalAmount, 0);
  const outstandingDebt = user?.outstandingDebt || 0;
  
  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Halo, {session.user.name || "Agen"}! 👋</h1>
        <p className="text-slate-400 mt-2 text-sm">Selamat datang di Dashboard Kemitraan VendingLink.</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface-card border border-surface-border rounded-2xl p-6 relative overflow-hidden group hover:border-brand-500/50 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <ShoppingBag size={64} className="text-brand-400" />
          </div>
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center">
              <ShoppingBag size={20} className="text-brand-400" />
            </div>
            <p className="font-medium text-slate-300">Total Belanja (Bulan Ini)</p>
          </div>
          <h2 className="text-3xl font-bold text-white relative z-10">{formatRupiah(monthTotal)}</h2>
          <p className="text-xs text-brand-400 mt-2 font-medium flex items-center gap-1 relative z-10">
            <Activity size={12} /> Terus tingkatkan penjualan!
          </p>
        </div>

        <div className="bg-surface-card border border-surface-border rounded-2xl p-6 relative overflow-hidden group hover:border-red-500/50 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <CreditCard size={64} className="text-red-400" />
          </div>
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center">
              <DollarSign size={20} className="text-red-400" />
            </div>
            <p className="font-medium text-slate-300">Tagihan Paylater / Hutang</p>
          </div>
          <h2 className="text-3xl font-bold text-white relative z-10">{formatRupiah(outstandingDebt)}</h2>
          <p className="text-xs text-slate-500 mt-2 relative z-10">Segera lunasi tagihan untuk menjaga limit</p>
        </div>
      </div>

      {/* Recent & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface-card border border-surface-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Clock size={18} className="text-brand-400" />
                5 Transaksi Terakhir
              </h2>
              <Link href="/agent/history" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors">
                Lihat Semua <ArrowRight size={12} />
              </Link>
            </div>
            
            <div className="space-y-4">
              {recentTxs.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">Belum ada transaksi.</div>
              ) : (
                recentTxs.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-4 rounded-xl bg-surface-hover border border-surface-border/50">
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-2 ${tx.status === 'PAID' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-red-400'}`} />
                      <div>
                        <p className="font-medium text-white text-sm">{tx.product.name}</p>
                        <p className="text-xs text-slate-400 mt-1">{formatDate(tx.createdAt)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-white text-sm">{formatRupiah(tx.finalAmount)}</p>
                      {tx.status === 'PAID' && (
                         <Link href={`/agent/order/${tx.orderId}`} className="text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 inline-block bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                           LIHAT KODE &rarr;
                         </Link>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-1 space-y-4">
          <Link href="/agent/catalog" className="bg-brand-500/10 border border-brand-500/30 rounded-2xl p-6 flex flex-col items-center justify-center text-center hover:bg-brand-500/20 transition-colors group h-32">
            <ShoppingBag size={32} className="text-brand-400 mb-3 group-hover:scale-110 transition-transform" />
            <p className="font-bold text-white">Beli Produk Baru</p>
          </Link>
          <Link href="/agent/history" className="bg-surface-card border border-surface-border rounded-2xl p-6 flex flex-col items-center justify-center text-center hover:border-slate-500/50 transition-colors group h-32">
            <History size={32} className="text-slate-400 mb-3 group-hover:text-white transition-colors" />
            <p className="font-bold text-white">Cek Riwayat Belanja</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
