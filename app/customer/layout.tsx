import Link from "next/link";
import { Zap, LogIn } from "lucide-react";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      {/* Public top bar (no sidebar — no login required) */}
      <header className="border-b border-surface-border bg-surface-card/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <Link href="/customer" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center shadow-glow flex-shrink-0">
              <Zap size={18} className="text-brand-400" />
            </div>
            <div>
              <p className="font-bold text-white text-sm leading-tight">VendingLink</p>
              <p className="text-xs text-brand-400 leading-tight">Toko Digital</p>
            </div>
          </Link>

          <Link
            href="/login"
            id="agent-login-link"
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            <LogIn size={16} />
            <span className="hidden sm:inline">Masuk sebagai Agen</span>
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-8 py-8">{children}</main>
    </div>
  );
}
