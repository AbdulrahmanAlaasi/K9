import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import {
  ArrowLeft, Loader2, Download, CheckCircle2, XCircle,
  Timer, Gauge, TrendingUp, AlertTriangle, Globe,
  Shield, ListChecks, BarChart3,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useRef, useEffect, useCallback } from 'react';

export function TestReportPage() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();

  const { data: run, isLoading } = useQuery({
    queryKey: ['run', runId],
    queryFn: () => api.getTestRun(runId!),
    enabled: !!runId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
      </div>
    );
  }

  if (!run) {
    return (
      <div className="card text-center py-16">
        <p className="text-red-400 font-semibold">Run not found</p>
        <button className="btn-secondary mt-4" onClick={() => navigate('/')}>Back to Dashboard</button>
      </div>
    );
  }

  const passed = run.status === 'completed';

  return (
    <div className="animate-fade-in space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <button className="btn-ghost p-2.5 rounded-xl" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className={clsx(
                'w-2.5 h-2.5 rounded-full',
                passed ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                  : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]',
              )} />
              <span className="text-xs font-semibold uppercase tracking-widest text-surface-400">Test Report</span>
            </div>
            <h1 className="text-2xl font-extrabold text-white">
              {passed ? 'Test Passed' : `Test ${run.status}`}
            </h1>
            <p className="text-surface-500 text-sm mt-1">
              Run ID: <span className="font-mono text-surface-400">{run.id}</span>
            </p>
          </div>
        </div>
        <a href={`/api/runs/${runId}/export/json`} download className="btn-secondary">
          <Download className="w-4 h-4" /> Export JSON
        </a>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger-children">
        <ReportStat icon={Gauge} label="Total Requests" value={run.totalRequests.toLocaleString()}
          gradient="from-blue-500 to-cyan-400" />
        <ReportStat icon={Timer} label="P95 Response" value={`${Math.round(run.p95)}ms`}
          gradient="from-amber-500 to-orange-400" />
        <ReportStat icon={TrendingUp} label="Avg RPS" value={`${Math.round(run.requestsPerSecond)}`}
          gradient="from-emerald-500 to-teal-400" />
        <ReportStat icon={AlertTriangle} label="Error Rate" value={`${(run.errorRate * 100).toFixed(1)}%`}
          gradient={run.errorRate > 0.05 ? 'from-red-500 to-rose-400' : 'from-emerald-500 to-green-400'} />
      </div>

      {/* Response Time Breakdown */}
      <div className="card-glow">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-5">
            <Timer className="w-5 h-5 text-surface-400" />
            <h2 className="text-base font-bold text-white">Response Time Distribution</h2>
          </div>
          <div className="grid grid-cols-6 gap-3">
            {[
              { label: 'Min', value: run.minResponseTime },
              { label: 'Avg', value: run.avgResponseTime },
              { label: 'P50', value: run.p50 },
              { label: 'P90', value: run.p90 },
              { label: 'P95', value: run.p95 },
              { label: 'P99', value: run.p99 },
            ].map(({ label, value }) => (
              <div key={label} className="text-center bg-surface-800/30 rounded-xl py-4 border border-surface-700/20">
                <p className="text-xl font-extrabold text-white">{Math.round(value)}<span className="text-xs text-surface-500 ml-0.5">ms</span></p>
                <p className="text-[10px] font-bold text-surface-500 uppercase mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Time Series Chart */}
      {run.timeSeriesData && run.timeSeriesData.length > 1 && (
        <div className="card-glow">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <BarChart3 className="w-5 h-5 text-surface-400" />
              <h2 className="text-base font-bold text-white">Performance Over Time</h2>
            </div>
            <TimeSeriesChart data={run.timeSeriesData} />
          </div>
        </div>
      )}

      {/* Endpoint Breakdown */}
      {run.endpointBreakdown && run.endpointBreakdown.length > 0 && (
        <div className="card-glow">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-5">
              <Globe className="w-5 h-5 text-surface-400" />
              <h2 className="text-base font-bold text-white">Endpoint Breakdown</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-800/50">
                    {['Endpoint', 'Requests', 'Errors', 'Avg', 'P95', 'P99'].map((h, i) => (
                      <th key={h} className={clsx(
                        'py-2.5 px-3 text-[10px] font-bold text-surface-500 uppercase tracking-wider',
                        i >= 2 ? 'text-right' : 'text-left',
                      )}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {run.endpointBreakdown.map((ep, i) => (
                    <tr key={i} className="border-b border-surface-800/20 hover:bg-white/[0.02]">
                      <td className="py-3 px-3">
                        <span className="badge-info text-[9px] mr-2">{ep.method}</span>
                        <span className="font-mono text-xs text-surface-300">{ep.url}</span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-surface-300">{ep.totalRequests.toLocaleString()}</td>
                      <td className="py-3 px-3 text-right font-mono">
                        <span className={ep.failedRequests > 0 ? 'text-red-400' : 'text-emerald-400'}>
                          {ep.failedRequests}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-surface-300">{Math.round(ep.avgResponseTime)}ms</td>
                      <td className="py-3 px-3 text-right font-mono text-surface-300">{Math.round(ep.p95)}ms</td>
                      <td className="py-3 px-3 text-right font-mono text-surface-300">{Math.round(ep.p99)}ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Thresholds */}
      {run.thresholdResults && run.thresholdResults.length > 0 && (
        <div className="card-glow">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-5 h-5 text-surface-400" />
              <h2 className="text-base font-bold text-white">Threshold Results</h2>
            </div>
            <div className="space-y-2">
              {run.thresholdResults.map((t, i) => (
                <div key={i} className={clsx(
                  'flex items-center justify-between px-4 py-3 rounded-xl border',
                  t.passed ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20',
                )}>
                  <div className="flex items-center gap-3">
                    {t.passed ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                    <span className="text-sm font-semibold text-surface-200">
                      {t.rule.metric} {t.rule.operator} {t.rule.value}
                    </span>
                  </div>
                  <span className="font-mono text-sm text-surface-400">
                    Actual: <span className={t.passed ? 'text-emerald-400' : 'text-red-400'}>{Math.round(t.actualValue * 100) / 100}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Checks */}
      {run.checkResults && run.checkResults.length > 0 && (
        <div className="card-glow">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <ListChecks className="w-5 h-5 text-surface-400" />
              <h2 className="text-base font-bold text-white">Check Results</h2>
            </div>
            <div className="space-y-2">
              {run.checkResults.map((c, i) => {
                const pct = Math.round(c.passRate * 100);
                return (
                  <div key={i} className="px-4 py-3 rounded-xl bg-surface-800/30 border border-surface-700/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-surface-200">{c.rule.name}</span>
                      <span className={clsx('text-sm font-bold', pct === 100 ? 'text-emerald-400' : 'text-amber-400')}>
                        {pct}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-surface-800 rounded-full overflow-hidden">
                      <div
                        className={clsx('h-full rounded-full transition-all duration-500',
                          pct === 100 ? 'bg-emerald-500' : pct >= 90 ? 'bg-amber-500' : 'bg-red-500',
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-surface-500 mt-1">
                      {c.passedChecks}/{c.totalChecks} passed • {c.failedChecks} failed
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ── */

function ReportStat({ icon: Icon, label, value, gradient }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string; gradient: string;
}) {
  return (
    <div className="card-hover">
      <div className="flex items-center gap-2 mb-3">
        <div className={clsx('w-8 h-8 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg', gradient)}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <span className="text-[10px] font-bold text-surface-500 uppercase">{label}</span>
      </div>
      <p className="metric-value text-2xl">{value}</p>
    </div>
  );
}

function TimeSeriesChart({ data }: { data: { timestamp: number; p95: number; requestsPerSecond: number }[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width;
    const H = rect.height;
    ctx.clearRect(0, 0, W, H);

    const p95s = data.map((d) => d.p95);
    const maxP95 = Math.max(...p95s, 1);
    const step = W / (p95s.length - 1);

    // Fill
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, 'rgba(59,130,246,0.15)');
    grad.addColorStop(1, 'rgba(59,130,246,0)');
    ctx.beginPath();
    ctx.moveTo(0, H);
    p95s.forEach((v, i) => {
      ctx.lineTo(i * step, H - (v / maxP95) * H * 0.85);
    });
    ctx.lineTo(W, H);
    ctx.fillStyle = grad;
    ctx.fill();

    // P95 line
    ctx.beginPath();
    p95s.forEach((v, i) => {
      const x = i * step;
      const y = H - (v / maxP95) * H * 0.85;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [data]);

  useEffect(() => { draw(); }, [draw]);

  return (
    <div className="h-40 bg-surface-900/40 rounded-xl overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
