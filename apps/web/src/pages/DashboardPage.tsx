import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import {
  Activity, FolderKanban, FlaskConical, Timer, CheckCircle2, XCircle,
  Clock, Loader2, AlertTriangle, TrendingUp, Zap, ArrowUpRight,
} from 'lucide-react';
import { clsx } from 'clsx';
import type { RunStatus } from '@k9/shared';
import { Link } from 'react-router-dom';

export function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: api.getDashboardStats,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl bg-brand-500/20 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
          </div>
          <div className="absolute inset-0 rounded-2xl bg-brand-500/10 animate-ping" />
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 rounded-full bg-brand-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
            <span className="text-xs font-semibold text-brand-400/70 uppercase tracking-widest">Dashboard</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white">Performance Overview</h1>
          <p className="text-surface-500 mt-1.5 text-sm">Monitor your testing activity and key metrics</p>
        </div>
        <Link to="/projects" className="btn-primary">
          <Zap className="w-4 h-4" />
          New Test
          <ArrowUpRight className="w-3.5 h-3.5 opacity-50" />
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 stagger-children">
        <StatCard
          label="Total Projects"
          value={stats?.totalProjects ?? 0}
          icon={FolderKanban}
          gradient="from-blue-500 to-cyan-400"
          bgGlow="rgba(59,130,246,0.08)"
        />
        <StatCard
          label="Total Runs"
          value={stats?.totalRuns ?? 0}
          icon={FlaskConical}
          gradient="from-violet-500 to-purple-400"
          bgGlow="rgba(139,92,246,0.08)"
        />
        <StatCard
          label="Avg P95 Response"
          value={stats?.avgP95 ? `${Math.round(stats.avgP95)}ms` : '—'}
          icon={Timer}
          gradient="from-amber-500 to-orange-400"
          bgGlow="rgba(245,158,11,0.08)"
        />
        <StatCard
          label="Latest Status"
          value={formatStatus(stats?.latestRunStatus ?? null)}
          icon={Activity}
          gradient={statusGradient(stats?.latestRunStatus ?? null)}
          bgGlow={statusGlow(stats?.latestRunStatus ?? null)}
        />
      </div>

      {/* Recent Runs */}
      <div className="card-glow">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-surface-800/60 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-surface-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Recent Test Runs</h2>
                <p className="text-xs text-surface-500">Latest test execution results</p>
              </div>
            </div>
          </div>

          {!stats?.recentRuns?.length ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-surface-800/40 mb-4">
                <FlaskConical className="w-7 h-7 text-surface-600" />
              </div>
              <p className="text-surface-500 text-sm font-medium">No test runs yet</p>
              <p className="text-surface-600 text-xs mt-1">Create a project and run your first performance test</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-800/50">
                    {['Test', 'Project', 'Status', 'P95', 'Error %', 'Requests', 'Duration'].map((h, i) => (
                      <th key={h} className={clsx(
                        'py-3 px-4 font-semibold text-surface-500 text-xs uppercase tracking-wider',
                        i >= 3 ? 'text-right' : 'text-left',
                      )}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.recentRuns.map((run, idx) => (
                    <tr
                      key={run.id}
                      className="border-b border-surface-800/20 hover:bg-white/[0.02] transition-colors duration-150 group"
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-surface-200 group-hover:text-white transition-colors">
                          {run.testName}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-surface-500">{run.projectName}</td>
                      <td className="py-3.5 px-4"><StatusBadge status={run.status} /></td>
                      <td className="py-3.5 px-4 text-right font-mono text-surface-300">
                        {run.p95 > 0 ? `${Math.round(run.p95)}ms` : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono">
                        <span className={clsx(
                          run.errorRate > 0.05 ? 'text-red-400' : run.errorRate > 0 ? 'text-amber-400' : 'text-emerald-400',
                        )}>
                          {(run.errorRate * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-surface-300">
                        {run.totalRequests.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-surface-500 text-xs">
                        {formatMs(run.durationMs)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function StatCard({ label, value, icon: Icon, gradient, bgGlow }: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  bgGlow: string;
}) {
  return (
    <div className="card-hover group relative overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: bgGlow }}
      />
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <p className="text-[11px] font-bold text-surface-500 uppercase tracking-wider">{label}</p>
          <div className={clsx(
            'w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center',
            gradient,
            'shadow-lg opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300',
          )}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
        <p className="metric-value">{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: RunStatus }) {
  const config: Record<string, { cls: string; icon: React.ComponentType<{ className?: string }> }> = {
    completed: { cls: 'badge-success', icon: CheckCircle2 },
    failed: { cls: 'badge-danger', icon: XCircle },
    running: { cls: 'badge-info', icon: Loader2 },
    pending: { cls: 'badge-neutral', icon: Clock },
    cancelled: { cls: 'badge-warning', icon: AlertTriangle },
  };
  const cfg = config[status] ?? config.pending;
  const Icon = cfg.icon;
  return (
    <span className={cfg.cls}>
      <Icon className={clsx('w-3 h-3', status === 'running' && 'animate-spin')} />
      {status}
    </span>
  );
}

function formatStatus(status: RunStatus | null): string {
  if (!status) return 'No runs';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function statusGradient(s: RunStatus | null): string {
  if (!s) return 'from-surface-500 to-surface-600';
  const m: Record<string, string> = {
    completed: 'from-emerald-500 to-green-400',
    failed: 'from-red-500 to-rose-400',
    running: 'from-blue-500 to-cyan-400',
    cancelled: 'from-amber-500 to-orange-400',
    pending: 'from-surface-500 to-surface-400',
  };
  return m[s] ?? m.pending;
}

function statusGlow(s: RunStatus | null): string {
  if (!s) return 'rgba(100,116,139,0.08)';
  const m: Record<string, string> = {
    completed: 'rgba(16,185,129,0.08)',
    failed: 'rgba(239,68,68,0.08)',
    running: 'rgba(59,130,246,0.08)',
    cancelled: 'rgba(245,158,11,0.08)',
    pending: 'rgba(100,116,139,0.08)',
  };
  return m[s] ?? m.pending;
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  return `${Math.floor(sec / 60)}m ${sec % 60}s`;
}
