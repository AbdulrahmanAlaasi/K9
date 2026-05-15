import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../api/client';
import type { MetricsSnapshot, RunStatus } from '@k9/shared';
import {
  Activity, Loader2, StopCircle, Timer, Gauge, AlertTriangle,
  TrendingUp, BarChart3, Zap, FileText,
} from 'lucide-react';
import { clsx } from 'clsx';

export function LiveRunnerPage() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<MetricsSnapshot[]>([]);
  const [logs, setLogs] = useState<{ message: string; level: string; time: number }[]>([]);
  const [status, setStatus] = useState<RunStatus>('running');
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const chartRef = useRef<HTMLCanvasElement>(null);

  const { data: run } = useQuery({
    queryKey: ['run', runId],
    queryFn: () => api.getTestRun(runId!),
    enabled: !!runId,
    refetchInterval: status === 'running' ? 5000 : false,
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.cancelTestRun(runId!),
    onSuccess: () => setStatus('cancelled'),
  });

  // SSE connection
  useEffect(() => {
    if (!runId) return;
    const es = new EventSource(`/api/runs/${runId}/stream`);
    esRef.current = es;

    es.addEventListener('connected', () => setConnected(true));
    es.addEventListener('metrics', (e) => {
      const data = JSON.parse(e.data) as MetricsSnapshot;
      setMetrics((prev) => [...prev.slice(-120), data]);
    });
    es.addEventListener('statusChange', (e) => {
      const data = JSON.parse(e.data);
      setStatus(data.status);
    });
    es.addEventListener('log', (e) => {
      const data = JSON.parse(e.data);
      setLogs((prev) => [...prev.slice(-50), { ...data, time: Date.now() }]);
    });
    es.addEventListener('complete', () => {
      setStatus('completed');
      es.close();
    });
    es.addEventListener('error', () => setConnected(false));

    return () => { es.close(); };
  }, [runId]);

  // Draw mini chart
  const drawChart = useCallback(() => {
    const canvas = chartRef.current;
    if (!canvas || metrics.length < 2) return;
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

    // Response time line
    const times = metrics.map((m) => m.p95);
    const maxTime = Math.max(...times, 1);
    const step = W / (times.length - 1);

    // Gradient fill
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, 'rgba(59,130,246,0.2)');
    grad.addColorStop(1, 'rgba(59,130,246,0)');

    ctx.beginPath();
    ctx.moveTo(0, H);
    times.forEach((t, i) => {
      const x = i * step;
      const y = H - (t / maxTime) * H * 0.85;
      if (i === 0) ctx.lineTo(x, y);
      else {
        const px = (i - 1) * step;
        const py = H - (times[i - 1] / maxTime) * H * 0.85;
        const cpx = (px + x) / 2;
        ctx.bezierCurveTo(cpx, py, cpx, y, x, y);
      }
    });
    ctx.lineTo(W, H);
    ctx.fillStyle = grad;
    ctx.fill();

    // Line stroke
    ctx.beginPath();
    times.forEach((t, i) => {
      const x = i * step;
      const y = H - (t / maxTime) * H * 0.85;
      if (i === 0) ctx.moveTo(x, y);
      else {
        const px = (i - 1) * step;
        const py = H - (times[i - 1] / maxTime) * H * 0.85;
        const cpx = (px + x) / 2;
        ctx.bezierCurveTo(cpx, py, cpx, y, x, y);
      }
    });
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.stroke();

    // RPS line (green)
    const rps = metrics.map((m) => m.requestsPerSecond);
    const maxRps = Math.max(...rps, 1);
    ctx.beginPath();
    rps.forEach((r, i) => {
      const x = i * step;
      const y = H - (r / maxRps) * H * 0.85;
      if (i === 0) ctx.moveTo(x, y);
      else {
        const px = (i - 1) * step;
        const py = H - (rps[i - 1] / maxRps) * H * 0.85;
        const cpx = (px + x) / 2;
        ctx.bezierCurveTo(cpx, py, cpx, y, x, y);
      }
    });
    ctx.strokeStyle = 'rgba(16,185,129,0.6)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [metrics]);

  useEffect(() => { drawChart(); }, [drawChart]);

  const latest = metrics[metrics.length - 1];
  const isRunning = status === 'running';
  const isDone = status === 'completed' || status === 'failed' || status === 'cancelled';

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className={clsx(
              'w-2.5 h-2.5 rounded-full',
              isRunning ? 'bg-brand-500 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.5)]'
                : isDone && status === 'completed' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]',
            )} />
            <span className="text-xs font-semibold uppercase tracking-widest text-surface-400">
              {isRunning ? 'Live Test' : `Test ${status}`}
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-white">
            {isRunning ? 'Running...' : status === 'completed' ? 'Test Complete' : `Test ${status}`}
          </h1>
        </div>
        <div className="flex gap-3">
          {isRunning && (
            <button className="btn-danger" onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending}>
              <StopCircle className="w-4 h-4" />
              {cancelMutation.isPending ? 'Stopping...' : 'Stop Test'}
            </button>
          )}
          {isDone && (
            <Link to={`/runs/${runId}/report`} className="btn-primary">
              <FileText className="w-4 h-4" /> View Report
            </Link>
          )}
        </div>
      </div>

      {/* Live Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger-children">
        <LiveMetric icon={Gauge} label="Requests" value={latest?.totalRequests.toLocaleString() ?? '0'} color="brand" />
        <LiveMetric icon={Timer} label="P95 Response" value={latest ? `${Math.round(latest.p95)}ms` : '—'} color="amber" />
        <LiveMetric icon={TrendingUp} label="RPS" value={latest ? `${Math.round(latest.requestsPerSecond)}` : '0'} color="emerald" />
        <LiveMetric icon={AlertTriangle} label="Error Rate"
          value={latest ? `${(latest.errorRate * 100).toFixed(1)}%` : '0%'}
          color={latest && latest.errorRate > 0.05 ? 'red' : 'emerald'} />
      </div>

      {/* Real-time Chart */}
      <div className="card-glow">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-4 h-4 text-surface-400" />
              <h2 className="text-sm font-bold text-white">Response Time & RPS</h2>
            </div>
            <div className="flex items-center gap-4 text-[10px]">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-brand-500 rounded-full" /> P95 (ms)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-emerald-500/60 rounded-full border-dashed" /> RPS
              </span>
            </div>
          </div>
          <div className="relative h-48 bg-surface-900/40 rounded-xl overflow-hidden">
            <canvas ref={chartRef} className="w-full h-full" />
            {metrics.length < 2 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="w-5 h-5 text-brand-500 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-surface-500">Waiting for data...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      {latest && (
        <div className="grid grid-cols-4 gap-3 stagger-children">
          <MiniStat label="Avg" value={`${Math.round(latest.avgResponseTime)}ms`} />
          <MiniStat label="P50" value={`${Math.round(latest.p50)}ms`} />
          <MiniStat label="P90" value={`${Math.round(latest.p90)}ms`} />
          <MiniStat label="P99" value={`${Math.round(latest.p99)}ms`} />
        </div>
      )}

      {/* Logs */}
      <div className="card">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-surface-400" /> Engine Log
        </h3>
        <div className="bg-surface-950/60 rounded-xl p-4 max-h-40 overflow-y-auto font-mono text-xs space-y-1">
          {logs.length === 0 ? (
            <p className="text-surface-600 italic">Waiting for engine logs...</p>
          ) : (
            logs.map((log, i) => (
              <div key={i} className={clsx(
                log.level === 'error' ? 'text-red-400' : log.level === 'warn' ? 'text-amber-400' : 'text-surface-400',
              )}>
                <span className="text-surface-600">[{new Date(log.time).toLocaleTimeString()}]</span>{' '}
                {log.message}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function LiveMetric({ icon: Icon, label, value, color }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string; color: string;
}) {
  const colors: Record<string, string> = {
    brand: 'from-blue-500/20 to-blue-600/5 text-blue-400',
    amber: 'from-amber-500/20 to-amber-600/5 text-amber-400',
    emerald: 'from-emerald-500/20 to-emerald-600/5 text-emerald-400',
    red: 'from-red-500/20 to-red-600/5 text-red-400',
  };
  return (
    <div className="card-hover">
      <div className="flex items-center gap-2 mb-2">
        <div className={clsx('w-7 h-7 rounded-lg bg-gradient-to-br flex items-center justify-center', colors[color] ?? colors.brand)}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <span className="text-[10px] font-bold text-surface-500 uppercase">{label}</span>
      </div>
      <p className="text-xl font-extrabold text-white">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-800/30 rounded-xl px-4 py-3 text-center border border-surface-700/20">
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-[9px] text-surface-500 font-bold uppercase">{label}</p>
    </div>
  );
}
