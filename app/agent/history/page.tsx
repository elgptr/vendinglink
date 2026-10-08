import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { History, ShoppingBag, ArrowRight, CheckCircle, Clock } from "lucide-react";
import { formatRupiah, formatDate } from "@/lib/utils";

export const metadata = { title: "Riwayat Transaksi" };

export default async function AgentHistoryPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const transactions = await prisma.transaction.findMany({
    where: { agentId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { product: true }
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <History className="text-brand-400" /> Riwayat Transaksi
        </h1>
        <p className="text-slate-400 mt-2 text-sm">Lihat semua daftar kode dan produk yang pernah Anda beli.</p>
      </div>

      {/* List */}
      <div className="bg-surface-card border border-surface-border rounded-2xl overflow-hidden">
        {transactions.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <ShoppingBag size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-lg">Belum ada riwayat transaksi</p>
            <Link href="/agent/catalog" className="text-brand-400 text-sm mt-2 inline-block hover:underline">
              Beli produk pertama Anda
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-surface-border">
            {transactions.map((tx: any) => (
              <div key={tx.id} className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-surface-hover/30 transition-colors">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl border flex-shrink-0 ${tx.status === 'PAID' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                    {tx.status === 'PAID' ? <CheckCircle size={24} /> : <Clock size={24} />}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">{tx.product.name}</h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-slate-400">
                      <span>{formatDate(tx.createdAt)}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                      <span>ID: <span className="font-mono text-slate-300">{tx.orderId}</span></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:flex-col md:items-end gap-2 border-t md:border-none border-surface-border pt-4 md:pt-0">
                  <span className="text-xl font-bold text-white">{formatRupiah(tx.finalAmount)}</span>
                  
                  <div className="flex gap-2">
                    {/* 1-Click Reorder Button */}
                    <Link 
                      href={`/agent/catalog/${tx.productId}/checkout`}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold border border-surface-border bg-surface text-slate-300 hover:text-white hover:border-slate-500 transition-all flex items-center gap-1"
                    >
                      <ShoppingBag size={12} /> BELI LAGI
                    </Link>

                    {/* View Code Button */}
                    {tx.status === 'PAID' && (
                      <Link 
                        href={`/agent/order/${tx.orderId}`}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold border border-brand-500/30 bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 hover:text-brand-300 transition-all flex items-center gap-1"
                      >
                        LIHAT KODE <ArrowRight size={12} />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
