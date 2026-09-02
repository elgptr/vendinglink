"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { ShoppingBag, LogOut, Zap, User, Menu, X, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface AgentSidebarProps {
  username: string;
}

const navItems = [
  {
    href: "/agent/catalog",
    icon: ShoppingBag,
    label: "Katalog Produk",
  },
  {
    href: "/agent/chat",
    icon: MessageCircle,
    label: "AI Chat Assistant",
  },
];

export default function AgentSidebar({ username }: AgentSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="px-6 py-5 border-b border-surface-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center shadow-glow flex-shrink-0">
            <Zap size={18} className="text-brand-400" />
          </div>
          <div>
            <p className="font-bold text-white text-sm">VendingLink</p>
            <p className="text-xs text-brand-400">Agen Panel</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-brand-500/15 text-brand-400 border border-brand-500/20"
                  : "text-slate-400 hover:text-slate-100 hover:bg-surface-hover"
              )}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User info & logout */}
      <div className="px-3 py-4 border-t border-surface-border">
        <div className="flex items-center gap-3 px-3 py-2.5 mb-2 bg-surface rounded-xl">
          <div className="w-8 h-8 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center flex-shrink-0">
            <User size={14} className="text-brand-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{username}</p>
            <p className="text-xs text-slate-500">Agen</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          id="agent-logout-btn"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut size={16} />
          Keluar
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 bg-surface-card border border-surface-border rounded-lg text-slate-300"
        aria-label="Toggle sidebar"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-surface-card border-r border-surface-border flex-col z-30">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-screen w-72 bg-surface-card border-r border-surface-border flex flex-col z-50",
          "md:hidden transition-transform duration-300",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
