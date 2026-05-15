import { prisma } from '../db/client.js';
import type { DashboardStats, RecentRun, RunStatus } from '@k9/shared';

/**
 * Retrieves aggregated dashboard statistics.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const [totalProjects, totalRuns, latestRun, recentRunRows] = await Promise.all([
    prisma.project.count(),
    prisma.testRun.count(),
    prisma.testRun.findFirst({ orderBy: { createdAt: 'desc' } }),
    prisma.testRun.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { testConfig: { include: { project: true } } },
    }),
  ]);

  // Calculate average p95 from completed runs
  const completedRuns = await prisma.testRun.findMany({
    where: { status: 'completed' },
    select: { p95: true, errorRate: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const avgP95 =
    completedRuns.length > 0
      ? completedRuns.reduce((sum, r) => sum + r.p95, 0) / completedRuns.length
      : 0;

  // Error rate trend (last 10 completed runs)
  const errorRateTrend = completedRuns.slice(0, 10).map((r) => r.errorRate).reverse();

  const recentRuns: RecentRun[] = recentRunRows.map((r) => ({
    id: r.id,
    testName: r.testConfig.name,
    projectName: r.testConfig.project.name,
    status: r.status as RunStatus,
    p95: r.p95,
    errorRate: r.errorRate,
    totalRequests: r.totalRequests,
    startedAt: r.startedAt?.toISOString() ?? r.createdAt.toISOString(),
    durationMs: r.durationMs,
  }));

  return {
    totalProjects,
    totalRuns,
    latestRunStatus: (latestRun?.status as RunStatus) ?? null,
    avgP95: Math.round(avgP95 * 100) / 100,
    errorRateTrend,
    recentRuns,
  };
}
