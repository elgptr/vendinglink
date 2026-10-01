"use client";

import { cn } from "@/lib/utils";
import { PaymentTrustBadges, SecurityTrustBadges } from "@/components/ui/TrustBadge";
import Divider from "@/components/ui/Divider";

interface TrustStripProps {
  className?: string;
}

export default function TrustStrip({ className }: TrustStripProps) {
  return (
    <div className={cn("py-8", className)}>
      <Divider label="Didukung Oleh" className="mb-6" />
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12 animate-fade-in-slow">
        <PaymentTrustBadges />
        <div className="hidden sm:block w-px h-8 bg-surface-border" />
        <SecurityTrustBadges />
      </div>
    </div>
  );
}
