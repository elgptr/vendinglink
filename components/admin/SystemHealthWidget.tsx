"use client";

import { useState, useEffect } from "react";
import { Activity, Database, HardDrive, Clock, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptimeSeconds: number;
  version: string;
  checks: {
    database: { status: string; latencyMs?: number; error?: string };
    memory: { status: string; heapUsedMB?: number; heapTotalMB?: number };
  };
}

function StatusIcon({ status }: { status: string }) {
  if (status === "healthy") return <CheckCircle size={18} className="text-brand-400" />;
  if (status === "degraded") return <AlertTriangle size={18} className="text-amber-400" />;
  return <XCircle size={18} className="text-red-400" />;
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function SystemHealthWidget() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchHealth() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/health");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setHealth(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 300000); // 5 minutes
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-surface-card border border-surface-border rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity size={20} className="text-purple-400" />
          <h2 className="text-lg font-semibold text-white">System Health</h2>
        </div>
        <button
          onClick={fetchHealth}
          disabled={loading}
          className="text-xs text-slate-400 hover:text-white transition-colors disabled:opacity-50"
        >
          {loading ? "Checking..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-4">
          <p className="text-sm text-red-400">Failed to fetch health: {error}</p>
        </div>
      )}

      {health && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-surface-hover rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Database size={16} className="text-slate-400" />
              <span className="text-sm font-medium text-slate-300">Database</span>
              <StatusIcon status={health.checks.database.status} />
            </div>
            <p className="text-2xl font-bold text-white">
              {health.checks.database.latencyMs ?? "-"}
              <span className="text-sm text-slate-400 ml-1">ms</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">Query latency</p>
          </div>

          <div className="bg-surface-hover rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <HardDrive size={16} className="text-slate-400" />
              <span className="text-sm font-medium text-slate-300">Memory</span>
              <StatusIcon status={health.checks.memory.status} />
            </div>
            <p className="text-2xl font-bold text-white">
              {health.checks.memory.heapUsedMB ?? "-"}
              <span className="text-sm text-slate-400 ml-1">/ {health.checks.memory.heapTotalMB ?? "-"} MB</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">Heap usage</p>
          </div>

          <div className="bg-surface-hover rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={16} className="text-slate-400" />
              <span className="text-sm font-medium text-slate-300">Uptime</span>
            </div>
            <p className="text-2xl font-bold text-white">{formatUptime(health.uptimeSeconds)}</p>
            <p className="text-xs text-slate-500 mt-1">v{health.version}</p>
          </div>
        </div>
      )}

      {loading && !health && (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
