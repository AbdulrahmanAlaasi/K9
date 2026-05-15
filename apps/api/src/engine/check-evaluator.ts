import type { CheckRule, CheckResult } from '@k9/shared';
import { CheckType } from '@k9/shared';
import type { RequestResult } from './metrics-collector.js';

/** Mutable accumulator for check results during test execution */
interface CheckAccumulator {
  rule: CheckRule;
  total: number;
  passed: number;
}

/**
 * Manages check evaluation across all requests during a test run.
 */
export class CheckEvaluator {
  private accumulators = new Map<string, CheckAccumulator>();

  constructor(checks: CheckRule[]) {
    for (const rule of checks) {
      this.accumulators.set(rule.id, { rule, total: 0, passed: 0 });
    }
  }

  /**
   * Evaluates all checks against a single request result.
   */
  evaluate(result: RequestResult, responseBody: string): void {
    for (const acc of this.accumulators.values()) {
      acc.total++;
      if (runCheck(acc.rule, result, responseBody)) {
        acc.passed++;
      }
    }
  }

  /**
   * Returns the final check results summary.
   */
  getResults(): CheckResult[] {
    return Array.from(this.accumulators.values()).map((acc) => ({
      rule: acc.rule,
      totalChecks: acc.total,
      passedChecks: acc.passed,
      failedChecks: acc.total - acc.passed,
      passRate: acc.total > 0 ? acc.passed / acc.total : 0,
    }));
  }
}

function runCheck(rule: CheckRule, result: RequestResult, body: string): boolean {
  switch (rule.type) {
    case CheckType.STATUS_CODE:
      return result.statusCode === Number(rule.expected);

    case CheckType.BODY_CONTAINS:
      return body.includes(rule.expected);

    case CheckType.JSON_FIELD: {
      try {
        const json = JSON.parse(body);
        const value = getNestedValue(json, rule.jsonPath ?? '');
        return String(value) === rule.expected;
      } catch {
        return false;
      }
    }

    case CheckType.RESPONSE_TIME:
      return result.responseTimeMs <= Number(rule.expected);

    default:
      return false;
  }
}

/**
 * Accesses a nested value in an object using dot-notation path.
 * e.g., "data.user.name" → obj.data.user.name
 */
function getNestedValue(obj: unknown, path: string): unknown {
  if (!path) return obj;
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}
