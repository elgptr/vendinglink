"use client";

import { cn } from "@/lib/utils";

interface DividerProps {
  className?: string;
  label?: string;
  orientation?: "horizontal" | "vertical";
}

export default function Divider({
  className,
  label,
  orientation = "horizontal",
}: DividerProps) {
  if (orientation === "vertical") {
    return (
      <div
        className={cn("w-px bg-surface-border self-stretch", className)}
        role="separator"
        aria-orientation="vertical"
      />
    );
  }

  if (label) {
    return (
      <div className={cn("flex items-center gap-3", className)} role="separator">
        <div className="flex-1 h-px bg-surface-border" />
        <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">
          {label}
        </span>
        <div className="flex-1 h-px bg-surface-border" />
      </div>
    );
  }

  return (
    <div
      className={cn("h-px bg-surface-border", className)}
      role="separator"
      aria-orientation="horizontal"
    />
  );
}
