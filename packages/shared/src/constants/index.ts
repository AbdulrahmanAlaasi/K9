/** Safety limits enforced by the test engine */
export const ENGINE_LIMITS = {
  /** Absolute maximum VUs regardless of settings */
  ABSOLUTE_MAX_VUS: 500,
  /** Absolute maximum test duration in seconds */
  ABSOLUTE_MAX_DURATION: 3600,
  /** Absolute maximum requests per second */
  ABSOLUTE_MAX_RPS: 2000,
  /** Metrics sampling interval in milliseconds */
  METRICS_INTERVAL_MS: 1000,
  /** Worker thread heartbeat timeout in milliseconds */
  WORKER_HEARTBEAT_TIMEOUT_MS: 10000,
} as const;

/** Default app settings for first run */
export const DEFAULT_SETTINGS = {
  allowLocalTargets: false,
  maxVirtualUsers: 100,
  maxDurationSeconds: 600,
  maxRequestsPerSecond: 500,
} as const;

/** Private IP ranges for SSRF protection */
export const PRIVATE_IP_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^0\.0\.0\.0/,
  /^localhost$/i,
  /^\[?::1\]?$/,
  /^\[?fe80:/i,
  /^\[?fc00:/i,
  /^\[?fd00:/i,
] as const;

/** HTTP status code categories */
export const HTTP_STATUS = {
  isSuccess: (code: number): boolean => code >= 200 && code < 300,
  isClientError: (code: number): boolean => code >= 400 && code < 500,
  isServerError: (code: number): boolean => code >= 500,
} as const;

/** Test type display labels */
export const TEST_TYPE_LABELS: Record<string, string> = {
  smoke: 'Smoke Test',
  load: 'Load Test',
  stress: 'Stress Test',
  spike: 'Spike Test',
  soak: 'Soak Test',
};

/** Executor type display labels */
export const EXECUTOR_LABELS: Record<string, string> = {
  'constant-vus': 'Constant VUs',
  'ramping-vus': 'Ramping VUs',
  'constant-rate': 'Constant Rate',
};

/** Test type default configurations */
export const TEST_TYPE_DEFAULTS = {
  smoke: { virtualUsers: 1, duration: 60 },
  load: { virtualUsers: 50, duration: 300 },
  stress: { virtualUsers: 200, duration: 600 },
  spike: { virtualUsers: 300, duration: 120 },
  soak: { virtualUsers: 50, duration: 1800 },
} as const;

/** API server defaults */
export const API_DEFAULTS = {
  PORT: 3001,
  HOST: '0.0.0.0',
} as const;
