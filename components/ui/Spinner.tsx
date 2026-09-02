"use client";

import { cn } from "@/lib/utils";

interface SpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  label?: string;
}

const sizeMap = {
  sm: "w-4 h-4 border-2",
  md: "w-8 h-8 border-2",
  lg: "w-12 h-12 border-3",
  xl: "w-16 h-16 border-4",
};

export default function Spinner({ size = "md", className, label }: SpinnerProps) {
  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <div
        className={cn(
          "rounded-full border-surface-border border-t-brand-500 animate-spin",
          sizeMap[size]
        )}
        role="status"
        aria-label={label || "Memuat..."}
      />
      {label && (
        <p className="text-sm text-slate-400 animate-pulse">{label}</p>
      )}
    </div>
  );
}

export function FullPageSpinner({ label }: { label?: string }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-surface/80 backdrop-blur-sm z-50">
      <Spinner size="lg" label={label} />
    </div>
  );
}
