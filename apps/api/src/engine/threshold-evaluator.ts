import type { ThresholdRule, ThresholdResult, MetricsSnapshot } from '@k9/shared';
import { ThresholdOperator } from '@k9/shared';

/**
 * Evaluates threshold rules against final metrics.
 */
export function evaluateThresholds(
  thresholds: ThresholdRule[],
  metrics: MetricsSnapshot,
): ThresholdResult[] {
  return thresholds.map((rule) => {
    const actualValue = getMetricValue(rule.metric, metrics);
    const passed = compare(actualValue, rule.operator, rule.value);
    return { rule, actualValue, passed };
  });
}

function getMetricValue(metric: string, m: MetricsSnapshot): number {
  const map: Record<string, number> = {
    p50: m.p50,
    p90: m.p90,
    p95: m.p95,
    p99: m.p99,
    avgResponseTime: m.avgResponseTime,
    errorRate: m.errorRate,
    requestsPerSecond: m.requestsPerSecond,
  };
  return map[metric] ?? 0;
}

function compare(actual: number, op: string, expected: number): boolean {
  switch (op) {
    case ThresholdOperator.LESS_THAN: return actual < expected;
    case ThresholdOperator.GREATER_THAN: return actual > expected;
    case ThresholdOperator.LESS_EQUAL: return actual <= expected;
    case ThresholdOperator.GREATER_EQUAL: return actual >= expected;
    default: return false;
  }
}
