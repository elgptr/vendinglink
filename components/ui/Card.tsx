"use client";

import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  hoverable?: boolean;
}

export default function Card({ children, className, glow, hoverable }: CardProps) {
  return (
    <div
      className={cn(
        "bg-surface-card border border-surface-border rounded-2xl",
        "transition-all duration-300",
        glow && "shadow-glow border-brand-500/30",
        hoverable && "hover:border-surface-border-light hover:shadow-card hover:-translate-y-0.5 cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  color?: "green" | "blue" | "purple" | "amber";
}

const colorMap = {
  green: { icon: "text-emerald-400 bg-emerald-400/10", border: "border-emerald-500/20" },
  blue: { icon: "text-blue-400 bg-blue-400/10", border: "border-blue-500/20" },
  purple: { icon: "text-purple-400 bg-purple-400/10", border: "border-purple-500/20" },
  amber: { icon: "text-amber-400 bg-amber-400/10", border: "border-amber-500/20" },
};

export function StatCard({ title, value, icon, subtitle, color = "green" }: StatCardProps) {
  const colors = colorMap[color];
  return (
    <Card className={cn("p-6", colors.border)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-slate-400 mb-1">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={cn("p-3 rounded-xl", colors.icon)}>{icon}</div>
      </div>
    </Card>
  );
}
