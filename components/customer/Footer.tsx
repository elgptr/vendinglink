"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";

interface FooterProps {
  className?: string;
}

export default function Footer({ className }: FooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className={cn("border-t border-surface-border bg-surface mt-16", className)}>
      <div className="customer-container py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white tracking-tight">
              Vending<span className="text-brand-400">Link</span>
            </h3>
            <p className="text-sm text-slate-400 text-balance">
              Platform pembelian otomatis voucher dan produk digital 24/7. 
              Aman, cepat, dan terpercaya.
            </p>
          </div>
          
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Layanan</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link href="/customer" className="hover:text-brand-400 transition-colors">Katalog Produk</Link></li>
              <li><Link href="/customer/orders" className="hover:text-brand-400 transition-colors">Lacak Pesanan</Link></li>
              <li><a href="#" className="hover:text-brand-400 transition-colors">Bantuan & FAQ</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><a href="#" className="hover:text-brand-400 transition-colors">Syarat & Ketentuan</a></li>
              <li><a href="#" className="hover:text-brand-400 transition-colors">Kebijakan Privasi</a></li>
              <li><a href="#" className="hover:text-brand-400 transition-colors">Kebijakan Pengembalian Dana</a></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-surface-border text-center flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            &copy; {year} VendingLink. All rights reserved.
          </p>
          <div className="text-xs text-slate-500">
            Dikelola dengan aman melalui <span className="font-semibold text-slate-400">QRIS Kasera</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
