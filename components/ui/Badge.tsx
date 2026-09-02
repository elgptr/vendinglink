"use client";

import { cn } from "@/lib/utils";

type BadgeVariant =
  | "success"
  | "danger"
  | "warning"
  | "info"
  | "neutral"
  | "purple";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  dot?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  danger: "bg-red-500/15 text-red-400 border-red-500/30",
  warning: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  info: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  neutral: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  purple: "bg-purple-500/15 text-purple-400 border-purple-500/30",
};

const dotColors: Record<BadgeVariant, string> = {
  success: "bg-emerald-400",
  danger: "bg-red-400",
  warning: "bg-amber-400",
  info: "bg-blue-400",
  neutral: "bg-slate-400",
  purple: "bg-purple-400",
};

export default function Badge({
  children,
  variant = "neutral",
  className,
  dot = false,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full",
        "text-xs font-medium border",
        variantClasses[variant],
        className
      )}
    >
      {dot && (
        <span
          className={cn("w-1.5 h-1.5 rounded-full animate-pulse", dotColors[variant])}
        />
      )}
      {children}
    </span>
  );
}
