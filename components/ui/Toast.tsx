"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastProps extends Toast {
  onRemove: (id: string) => void;
}

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={18} className="text-emerald-400" />,
  error: <XCircle size={18} className="text-red-400" />,
  warning: <AlertTriangle size={18} className="text-amber-400" />,
  info: <Info size={18} className="text-blue-400" />,
};

const styles: Record<ToastType, string> = {
  success: "border-emerald-500/30 bg-emerald-950/80",
  error: "border-red-500/30 bg-red-950/80",
  warning: "border-amber-500/30 bg-amber-950/80",
  info: "border-blue-500/30 bg-blue-950/80",
};

function ToastItem({ id, type, message, duration = 4000, onRemove }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), duration - 300);
    const removeTimer = setTimeout(() => onRemove(id), duration);
    return () => {
      clearTimeout(timer);
      clearTimeout(removeTimer);
    };
  }, [id, duration, onRemove]);

  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-lg",
        "transition-all duration-300",
        styles[type],
        visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
      )}
    >
      <div className="flex-shrink-0 mt-0.5">{icons[type]}</div>
      <p className="flex-1 text-sm text-slate-200">{message}</p>
      <button
        onClick={() => onRemove(id)}
        className="flex-shrink-0 text-slate-400 hover:text-white transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Toast Store (global singleton) ─────────────────────────────────────────
type ToastListener = (toasts: Toast[]) => void;
let toasts: Toast[] = [];
const listeners: ToastListener[] = [];

function notify() {
  listeners.forEach((l) => l([...toasts]));
}

export const toast = {
  success: (message: string, duration?: number) => addToast("success", message, duration),
  error: (message: string, duration?: number) => addToast("error", message, duration),
  warning: (message: string, duration?: number) => addToast("warning", message, duration),
  info: (message: string, duration?: number) => addToast("info", message, duration),
};

function addToast(type: ToastType, message: string, duration?: number) {
  const id = Math.random().toString(36).slice(2);
  toasts = [...toasts, { id, type, message, duration }];
  notify();
}

function removeToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  notify();
}

// ─── ToastContainer ──────────────────────────────────────────────────────────
export function ToastContainer() {
  const [currentToasts, setCurrentToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const listener: ToastListener = (updated) => setCurrentToasts(updated);
    listeners.push(listener);
    return () => {
      const idx = listeners.indexOf(listener);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }, []);

  const handleRemove = useCallback((id: string) => {
    removeToast(id);
  }, []);

  if (currentToasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-80">
      {currentToasts.map((t) => (
        <ToastItem key={t.id} {...t} onRemove={handleRemove} />
      ))}
    </div>
  );
}

export default toast;
