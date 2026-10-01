"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

/** Single-line skeleton shimmer */
export function SkeletonLine({ className }: SkeletonProps) {
  return <div className={cn("shimmer-line", className)} />;
}

/** Circle skeleton for avatars/icons */
export function SkeletonCircle({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-full bg-surface-hover/50 bg-shimmer-gradient bg-[length:200%_100%] animate-shimmer",
        "w-10 h-10",
        className
      )}
    />
  );
}

/** Card-shaped skeleton for product cards */
export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "bg-surface-card border border-surface-border rounded-2xl p-6 space-y-4",
        className
      )}
    >
      <SkeletonLine className="h-5 w-3/4" />
      <SkeletonLine className="h-4 w-1/2" />
      <div className="pt-2">
        <SkeletonLine className="h-8 w-1/3" />
      </div>
      <SkeletonLine className="h-10 w-full rounded-lg" />
    </div>
  );
}

/** Multi-card skeleton grid */
export function SkeletonGrid({
  count = 6,
  className,
}: SkeletonProps & { count?: number }) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6",
        className
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
