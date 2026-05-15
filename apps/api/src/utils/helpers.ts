import { PRIVATE_IP_RANGES } from '@k9/shared';

/**
 * Checks if a hostname resolves to a private/local IP address.
 * Used for SSRF protection — blocks requests to internal network by default.
 */
export function isPrivateHost(hostname: string): boolean {
  return PRIVATE_IP_RANGES.some((pattern) => pattern.test(hostname));
}

/**
 * Validates a URL for safety.
 * Returns an error message if invalid, null if safe.
 */
export function validateTargetUrl(
  url: string,
  allowLocal: boolean,
): { valid: true } | { valid: false; reason: string } {
  try {
    const parsed = new URL(url);

    // Only allow http and https
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, reason: `Unsupported protocol: ${parsed.protocol}` };
    }

    // Check for private IPs unless explicitly allowed
    if (!allowLocal && isPrivateHost(parsed.hostname)) {
      return {
        valid: false,
        reason: `Private/local targets are blocked by default. Enable "Allow Local Targets" in settings to test ${parsed.hostname}.`,
      };
    }

    return { valid: true };
  } catch {
    return { valid: false, reason: 'Invalid URL format' };
  }
}

/**
 * Formats a duration in milliseconds to a human-readable string.
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}

/**
 * Calculates a percentile value from a sorted array of numbers.
 */
export function percentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return 0;
  const index = Math.ceil((p / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, index)];
}

/**
 * Safely parses JSON from a SQLite text column, returning a default on failure.
 */
export function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}
