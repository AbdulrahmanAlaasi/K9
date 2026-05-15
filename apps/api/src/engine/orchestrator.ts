import http from 'node:http';
import https from 'node:https';
import { EventEmitter } from 'node:events';
import type { TestConfig, RunStatus, MetricsSnapshot, Endpoint } from '@k9/shared';
import { RunStatus as RS } from '@k9/shared';
import { MetricsCollector } from './metrics-collector.js';
import type { RequestResult } from './metrics-collector.js';
import { CheckEvaluator } from './check-evaluator.js';
import { evaluateThresholds } from './threshold-evaluator.js';
import * as runService from '../services/run.service.js';

const METRICS_INTERVAL = 1000; // 1 second

const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 50 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 50 });

export interface EngineEvents {
  metrics: (snapshot: MetricsSnapshot) => void;
  status: (status: RunStatus) => void;
  log: (message: string, level: 'info' | 'warn' | 'error') => void;
  complete: (runId: string) => void;
  error: (message: string) => void;
}

/**
 * Test engine orchestrator — manages virtual users in-process using
 * async concurrency, collects metrics, evaluates thresholds/checks,
 * and reports results via SSE events.
 */
export class TestOrchestrator extends EventEmitter {
  private metricsCollector = new MetricsCollector();
  private checkEvaluator: CheckEvaluator;
  private metricsInterval: ReturnType<typeof setInterval> | null = null;
  private cancelled = false;
  private vuPromises: Promise<void>[] = [];
  private activeVUs = 0;
  private testConfig: TestConfig;
  private runId: string;

  constructor(testConfig: TestConfig, runId: string) {
    super();
    this.testConfig = testConfig;
    this.runId = runId;
    this.checkEvaluator = new CheckEvaluator(testConfig.checks);
  }

  /**
   * Starts the test execution using async VU coroutines.
   */
  async start(): Promise<void> {
    const { testConfig, runId } = this;
    const vuCount = this.getVUCount();
    const durationMs = testConfig.duration * 1000;

    this.log(`Starting test: ${testConfig.name}`, 'info');
    this.log(`VUs: ${vuCount}, Duration: ${testConfig.duration}s, Endpoints: ${testConfig.endpoints.length}`, 'info');

    // Update run status
    await runService.updateRunStatus(runId, RS.RUNNING);
    this.emit('status', RS.RUNNING);

    // Start metrics collection interval
    this.metricsCollector.start();
    this.metricsInterval = setInterval(() => {
      if (!this.cancelled) {
        this.metricsCollector.setActiveVUs(this.activeVUs);
        const snapshot = this.metricsCollector.takeSnapshot();
        this.emit('metrics', snapshot);
      }
    }, METRICS_INTERVAL);

    // Launch VU coroutines concurrently
    const endTime = Date.now() + durationMs;
    this.activeVUs = vuCount;
    this.log('All VUs started. Generating load...', 'info');

    for (let i = 0; i < vuCount; i++) {
      this.vuPromises.push(this.runVU(i, testConfig.endpoints, endTime));
    }

    // Wait for all VUs to complete (non-blocking from caller perspective)
    Promise.all(this.vuPromises)
      .then(() => {
        if (!this.cancelled) {
          this.log('All VUs completed', 'info');
          this.finalize(RS.COMPLETED);
        }
      })
      .catch((err) => {
        this.log(`Engine error: ${err.message}`, 'error');
        this.emit('error', err.message);
        this.finalize(RS.FAILED);
      });
  }

  /**
   * Runs a single VU — loops through endpoints until time expires.
   */
  private async runVU(vuId: number, endpoints: Endpoint[], endTime: number): Promise<void> {
    let idx = 0;
    while (Date.now() < endTime && !this.cancelled) {
      const ep = endpoints[idx % endpoints.length];
      idx++;

      try {
        const result = await this.executeRequest(ep);
        this.metricsCollector.record(result);
        this.checkEvaluator.evaluate(result, '');
      } catch (err) {
        // Record failed request
        this.metricsCollector.record({
          url: ep.url,
          method: ep.method as RequestResult['method'],
          statusCode: 0,
          responseTimeMs: 0,
          success: false,
          error: err instanceof Error ? err.message : String(err),
          timestamp: Date.now(),
        });
      }
    }
    this.activeVUs--;
  }

  /**
   * Executes a single HTTP request.
   */
  private executeRequest(ep: Endpoint): Promise<RequestResult> {
    return new Promise((resolve) => {
      const start = performance.now();
      const fullUrl = this.buildUrl(ep.url, ep.queryParams);
      const parsed = new URL(fullUrl);
      const isHttps = parsed.protocol === 'https:';

      const headers: Record<string, string> = { ...ep.headers };
      if (ep.authToken) headers['Authorization'] = `Bearer ${ep.authToken}`;
      if (ep.body && ep.bodyType === 'json') headers['Content-Type'] = 'application/json';
      else if (ep.body && ep.bodyType === 'form') headers['Content-Type'] = 'application/x-www-form-urlencoded';
      else if (ep.body && ep.bodyType === 'text') headers['Content-Type'] = 'text/plain';

      const options: http.RequestOptions = {
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: ep.method,
        headers,
        agent: isHttps ? httpsAgent : httpAgent,
        timeout: 30000,
      };

      const proto = isHttps ? https : http;
      const req = proto.request(options, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          const ms = performance.now() - start;
          const code = res.statusCode ?? 0;
          resolve({
            url: ep.url,
            method: ep.method as RequestResult['method'],
            statusCode: code,
            responseTimeMs: Math.round(ms * 100) / 100,
            success: code >= 200 && code < 400,
            timestamp: Date.now(),
          });
        });
      });

      req.on('error', (err) => {
        resolve({
          url: ep.url,
          method: ep.method as RequestResult['method'],
          statusCode: 0,
          responseTimeMs: Math.round((performance.now() - start) * 100) / 100,
          success: false,
          error: err.message,
          timestamp: Date.now(),
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          url: ep.url,
          method: ep.method as RequestResult['method'],
          statusCode: 0,
          responseTimeMs: Math.round((performance.now() - start) * 100) / 100,
          success: false,
          error: 'Timeout (30s)',
          timestamp: Date.now(),
        });
      });

      if (ep.body && ep.bodyType !== 'none') req.write(ep.body);
      req.end();
    });
  }

  private buildUrl(base: string, params: Record<string, string>): string {
    const url = new URL(base);
    for (const [key, val] of Object.entries(params || {})) {
      url.searchParams.set(key, val);
    }
    return url.toString();
  }

  /**
   * Cancels the running test.
   */
  async cancel(): Promise<void> {
    this.cancelled = true;
    this.log('Test cancelled by user', 'warn');
    await this.finalize(RS.CANCELLED);
  }

  private async finalize(status: RunStatus): Promise<void> {
    // Stop metrics interval
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }

    const { snapshot, timeSeries, endpointBreakdown } = this.metricsCollector.getFinalMetrics();
    const thresholdResults = evaluateThresholds(this.testConfig.thresholds, snapshot);
    const checkResults = this.checkEvaluator.getResults();

    const allThresholdsPassed = thresholdResults.every((t) => t.passed);
    const finalStatus = status === RS.COMPLETED && !allThresholdsPassed ? RS.FAILED : status;

    // Save results to database
    await runService.saveRunResults(this.runId, {
      status: finalStatus,
      durationMs: snapshot.timestamp,
      totalRequests: snapshot.totalRequests,
      failedRequests: snapshot.failedRequests,
      errorRate: snapshot.errorRate,
      avgResponseTime: Math.round(snapshot.avgResponseTime * 100) / 100,
      minResponseTime: Math.round(snapshot.minResponseTime * 100) / 100,
      maxResponseTime: Math.round(snapshot.maxResponseTime * 100) / 100,
      p50: Math.round(snapshot.p50 * 100) / 100,
      p90: Math.round(snapshot.p90 * 100) / 100,
      p95: Math.round(snapshot.p95 * 100) / 100,
      p99: Math.round(snapshot.p99 * 100) / 100,
      requestsPerSecond: Math.round(snapshot.requestsPerSecond * 100) / 100,
      thresholdResults,
      checkResults,
      timeSeriesData: timeSeries,
      endpointBreakdown,
    });

    this.emit('status', finalStatus);
    this.emit('complete', this.runId);

    const passedThresholds = thresholdResults.filter((t) => t.passed).length;
    this.log(
      `Test ${finalStatus}. Requests: ${snapshot.totalRequests}, P95: ${Math.round(snapshot.p95)}ms, ` +
      `Error rate: ${(snapshot.errorRate * 100).toFixed(1)}%, ` +
      `Thresholds: ${passedThresholds}/${thresholdResults.length} passed`,
      finalStatus === RS.COMPLETED ? 'info' : 'warn',
    );
  }

  private getVUCount(): number {
    return this.testConfig.virtualUsers;
  }

  private log(message: string, level: 'info' | 'warn' | 'error'): void {
    this.emit('log', message, level);
  }
}

/** Global registry of active test runs */
const activeEngines = new Map<string, TestOrchestrator>();

export function getActiveEngine(runId: string): TestOrchestrator | undefined {
  return activeEngines.get(runId);
}

export function registerEngine(runId: string, engine: TestOrchestrator): void {
  activeEngines.set(runId, engine);
  engine.on('complete', () => activeEngines.delete(runId));
}
