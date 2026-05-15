import { prisma } from '../db/client.js';
import { safeJsonParse } from '../utils/helpers.js';
import type {
  TestRun,
  RunStatus,
  ThresholdResult,
  CheckResult,
  MetricsSnapshot,
  EndpointMetrics,
} from '@k9/shared';

/**
 * Creates a new test run in pending state.
 */
export async function createTestRun(testConfigId: string): Promise<TestRun> {
  const run = await prisma.testRun.create({
    data: { testConfigId, status: 'pending' },
  });
  return mapTestRun(run);
}

/**
 * Retrieves a single test run by ID.
 */
export async function getTestRunById(id: string): Promise<TestRun | null> {
  const run = await prisma.testRun.findUnique({ where: { id } });
  return run ? mapTestRun(run) : null;
}

/**
 * Lists all test runs for a given test config, most recent first.
 */
export async function getRunsByTestConfig(testConfigId: string): Promise<TestRun[]> {
  const runs = await prisma.testRun.findMany({
    where: { testConfigId },
    orderBy: { createdAt: 'desc' },
  });
  return runs.map(mapTestRun);
}

/**
 * Lists all runs across a project (joins through test configs).
 */
export async function getRunsByProject(projectId: string): Promise<TestRun[]> {
  const runs = await prisma.testRun.findMany({
    where: { testConfig: { projectId } },
    orderBy: { createdAt: 'desc' },
  });
  return runs.map(mapTestRun);
}

/**
 * Updates the status of a test run.
 */
export async function updateRunStatus(id: string, status: RunStatus): Promise<void> {
  const data: Record<string, unknown> = { status };
  if (status === 'running') {
    data.startedAt = new Date();
  }
  if (status === 'completed' || status === 'failed' || status === 'cancelled') {
    data.completedAt = new Date();
  }
  await prisma.testRun.update({ where: { id }, data });
}

/**
 * Saves the final results of a completed test run.
 */
export async function saveRunResults(
  id: string,
  results: {
    status: RunStatus;
    durationMs: number;
    totalRequests: number;
    failedRequests: number;
    errorRate: number;
    avgResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
    p50: number;
    p90: number;
    p95: number;
    p99: number;
    requestsPerSecond: number;
    thresholdResults: ThresholdResult[];
    checkResults: CheckResult[];
    timeSeriesData: MetricsSnapshot[];
    endpointBreakdown: EndpointMetrics[];
  },
): Promise<void> {
  await prisma.testRun.update({
    where: { id },
    data: {
      status: results.status,
      completedAt: new Date(),
      durationMs: results.durationMs,
      totalRequests: results.totalRequests,
      failedRequests: results.failedRequests,
      errorRate: results.errorRate,
      avgResponseTime: results.avgResponseTime,
      minResponseTime: results.minResponseTime,
      maxResponseTime: results.maxResponseTime,
      p50: results.p50,
      p90: results.p90,
      p95: results.p95,
      p99: results.p99,
      requestsPerSecond: results.requestsPerSecond,
      thresholdResults: JSON.stringify(results.thresholdResults),
      checkResults: JSON.stringify(results.checkResults),
      timeSeriesData: JSON.stringify(results.timeSeriesData),
      endpointBreakdown: JSON.stringify(results.endpointBreakdown),
    },
  });
}

/**
 * Returns whether any test is currently running.
 */
export async function hasActiveRun(): Promise<boolean> {
  const count = await prisma.testRun.count({
    where: { status: { in: ['pending', 'running'] } },
  });
  return count > 0;
}

// ── Mapper ──

interface TestRunRow {
  id: string;
  testConfigId: string;
  status: string;
  startedAt: Date | null;
  completedAt: Date | null;
  durationMs: number;
  totalRequests: number;
  failedRequests: number;
  errorRate: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  requestsPerSecond: number;
  thresholdResults: string;
  checkResults: string;
  timeSeriesData: string;
  endpointBreakdown: string;
  createdAt: Date;
}

function mapTestRun(row: TestRunRow): TestRun {
  return {
    id: row.id,
    testConfigId: row.testConfigId,
    status: row.status as RunStatus,
    startedAt: row.startedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    durationMs: row.durationMs,
    totalRequests: row.totalRequests,
    failedRequests: row.failedRequests,
    errorRate: row.errorRate,
    avgResponseTime: row.avgResponseTime,
    minResponseTime: row.minResponseTime,
    maxResponseTime: row.maxResponseTime,
    p50: row.p50,
    p90: row.p90,
    p95: row.p95,
    p99: row.p99,
    requestsPerSecond: row.requestsPerSecond,
    thresholdResults: safeJsonParse<ThresholdResult[]>(row.thresholdResults, []),
    checkResults: safeJsonParse<CheckResult[]>(row.checkResults, []),
    timeSeriesData: safeJsonParse<MetricsSnapshot[]>(row.timeSeriesData, []),
    endpointBreakdown: safeJsonParse<EndpointMetrics[]>(row.endpointBreakdown, []),
    createdAt: row.createdAt.toISOString(),
  };
}
