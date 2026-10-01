"use client";

import { cn } from "@/lib/utils";
import { Shield, Zap, CreditCard, QrCode, Smartphone, type LucideIcon } from "lucide-react";

type BadgeStyle = "default" | "glow" | "outline";

interface TrustBadgeProps {
  icon: LucideIcon;
  label: string;
  style?: BadgeStyle;
  className?: string;
}

const styleClasses: Record<BadgeStyle, string> = {
  default:
    "bg-surface-card/80 border-surface-border text-slate-300",
  glow:
    "bg-brand-500/10 border-brand-500/30 text-brand-400 shadow-glow",
  outline:
    "bg-transparent border-surface-border-light text-slate-400 hover:text-slate-200 hover:border-slate-400",
};

export default function TrustBadge({
  icon: Icon,
  label,
  style = "default",
  className,
}: TrustBadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border",
        "text-xs font-medium transition-all duration-200",
        styleClasses[style],
        className
      )}
    >
      <Icon size={14} className="flex-shrink-0" />
      <span>{label}</span>
    </div>
  );
}

/* ─── Pre-built Trust Badge Sets ───────────────────────────────────────── */

export function PaymentTrustBadges({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <TrustBadge icon={QrCode} label="QRIS" style="glow" />
      <TrustBadge icon={CreditCard} label="Bank Transfer" style="outline" />
      <TrustBadge icon={Smartphone} label="E-Wallet" style="outline" />
    </div>
  );
}

export function SecurityTrustBadges({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <TrustBadge icon={Shield} label="Pembayaran Aman" style="glow" />
      <TrustBadge icon={Zap} label="Instan Delivery" style="glow" />
    </div>
  );
}
