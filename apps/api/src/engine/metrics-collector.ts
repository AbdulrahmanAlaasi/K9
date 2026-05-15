import type { MetricsSnapshot, EndpointMetrics, HttpMethod } from '@k9/shared';

/** Single request result from a VU worker */
export interface RequestResult {
  url: string;
  method: HttpMethod;
  statusCode: number;
  responseTimeMs: number;
  success: boolean;
  error?: string;
  timestamp: number;
}

/** Collects and aggregates metrics from all VU workers */
export class MetricsCollector {
  private responseTimes: number[] = [];
  private endpointData = new Map<string, {
    url: string;
    method: HttpMethod;
    times: number[];
    total: number;
    failed: number;
  }>();
  private totalRequests = 0;
  private failedRequests = 0;
  private startTime = 0;
  private snapshots: MetricsSnapshot[] = [];
  private activeVUs = 0;

  start(): void {
    this.startTime = Date.now();
  }

  setActiveVUs(count: number): void {
    this.activeVUs = count;
  }

  record(result: RequestResult): void {
    this.totalRequests++;
    this.responseTimes.push(result.responseTimeMs);

    if (!result.success) {
      this.failedRequests++;
    }

    const key = `${result.method}:${result.url}`;
    let ep = this.endpointData.get(key);
    if (!ep) {
      ep = { url: result.url, method: result.method, times: [], total: 0, failed: 0 };
      this.endpointData.set(key, ep);
    }
    ep.total++;
    ep.times.push(result.responseTimeMs);
    if (!result.success) ep.failed++;
  }

  takeSnapshot(): MetricsSnapshot {
    const elapsed = Date.now() - this.startTime;
    const sorted = [...this.responseTimes].sort((a, b) => a - b);
    const durationSec = Math.max(elapsed / 1000, 0.001);

    const snapshot: MetricsSnapshot = {
      timestamp: elapsed,
      totalRequests: this.totalRequests,
      failedRequests: this.failedRequests,
      errorRate: this.totalRequests > 0 ? this.failedRequests / this.totalRequests : 0,
      avgResponseTime: sorted.length > 0 ? sorted.reduce((a, b) => a + b, 0) / sorted.length : 0,
      minResponseTime: sorted.length > 0 ? sorted[0] : 0,
      maxResponseTime: sorted.length > 0 ? sorted[sorted.length - 1] : 0,
      p50: percentile(sorted, 50),
      p90: percentile(sorted, 90),
      p95: percentile(sorted, 95),
      p99: percentile(sorted, 99),
      requestsPerSecond: this.totalRequests / durationSec,
      activeVUs: this.activeVUs,
    };

    this.snapshots.push(snapshot);
    return snapshot;
  }

  getFinalMetrics(): {
    snapshot: MetricsSnapshot;
    timeSeries: MetricsSnapshot[];
    endpointBreakdown: EndpointMetrics[];
  } {
    const snapshot = this.takeSnapshot();
    const endpointBreakdown: EndpointMetrics[] = [];

    for (const ep of this.endpointData.values()) {
      const sorted = [...ep.times].sort((a, b) => a - b);
      endpointBreakdown.push({
        url: ep.url,
        method: ep.method,
        totalRequests: ep.total,
        failedRequests: ep.failed,
        errorRate: ep.total > 0 ? ep.failed / ep.total : 0,
        avgResponseTime: sorted.length > 0 ? sorted.reduce((a, b) => a + b, 0) / sorted.length : 0,
        minResponseTime: sorted.length > 0 ? sorted[0] : 0,
        maxResponseTime: sorted.length > 0 ? sorted[sorted.length - 1] : 0,
        p50: percentile(sorted, 50),
        p90: percentile(sorted, 90),
        p95: percentile(sorted, 95),
        p99: percentile(sorted, 99),
      });
    }

    return { snapshot, timeSeries: this.snapshots, endpointBreakdown };
  }
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}
