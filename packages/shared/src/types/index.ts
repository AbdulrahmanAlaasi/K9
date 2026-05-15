// ──────────────────────────────────────────────
// Enums
// ──────────────────────────────────────────────

export const TestType = {
  SMOKE: 'smoke',
  LOAD: 'load',
  STRESS: 'stress',
  SPIKE: 'spike',
  SOAK: 'soak',
} as const;
export type TestType = (typeof TestType)[keyof typeof TestType];

export const ExecutorType = {
  CONSTANT_VUS: 'constant-vus',
  RAMPING_VUS: 'ramping-vus',
  CONSTANT_RATE: 'constant-rate',
} as const;
export type ExecutorType = (typeof ExecutorType)[keyof typeof ExecutorType];

export const HttpMethod = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
} as const;
export type HttpMethod = (typeof HttpMethod)[keyof typeof HttpMethod];

export const BodyType = {
  NONE: 'none',
  JSON: 'json',
  FORM: 'form',
  TEXT: 'text',
} as const;
export type BodyType = (typeof BodyType)[keyof typeof BodyType];

export const RunStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;
export type RunStatus = (typeof RunStatus)[keyof typeof RunStatus];

export const ThresholdMetric = {
  P50: 'p50',
  P90: 'p90',
  P95: 'p95',
  P99: 'p99',
  AVG_RESPONSE_TIME: 'avgResponseTime',
  ERROR_RATE: 'errorRate',
  REQUESTS_PER_SECOND: 'requestsPerSecond',
} as const;
export type ThresholdMetric = (typeof ThresholdMetric)[keyof typeof ThresholdMetric];

export const ThresholdOperator = {
  LESS_THAN: 'lt',
  GREATER_THAN: 'gt',
  LESS_EQUAL: 'lte',
  GREATER_EQUAL: 'gte',
} as const;
export type ThresholdOperator = (typeof ThresholdOperator)[keyof typeof ThresholdOperator];

export const CheckType = {
  STATUS_CODE: 'statusCode',
  BODY_CONTAINS: 'bodyContains',
  JSON_FIELD: 'jsonField',
  RESPONSE_TIME: 'responseTime',
} as const;
export type CheckType = (typeof CheckType)[keyof typeof CheckType];

// ──────────────────────────────────────────────
// Domain Types
// ──────────────────────────────────────────────

export interface Endpoint {
  id: string;
  url: string;
  method: HttpMethod;
  headers: Record<string, string>;
  queryParams: Record<string, string>;
  body: string | null;
  bodyType: BodyType;
  authToken: string | null;
}

export interface Stage {
  duration: number; // seconds
  target: number; // VU count or RPS
}

export interface ThresholdRule {
  id: string;
  metric: ThresholdMetric;
  operator: ThresholdOperator;
  value: number;
}

export interface CheckRule {
  id: string;
  type: CheckType;
  name: string;
  /** Expected value — status code number, substring, JSON path expression, or ms limit */
  expected: string;
  /** For jsonField checks: the JSON path (e.g. "data.id") */
  jsonPath?: string;
}

// ──────────────────────────────────────────────
// Project
// ──────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
}

// ──────────────────────────────────────────────
// Test Config
// ──────────────────────────────────────────────

export interface TestConfig {
  id: string;
  projectId: string;
  name: string;
  testType: TestType;
  executor: ExecutorType;
  virtualUsers: number;
  duration: number; // seconds
  stages: Stage[];
  endpoints: Endpoint[];
  thresholds: ThresholdRule[];
  checks: CheckRule[];
  defaultHeaders: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTestConfigInput {
  projectId: string;
  name: string;
  testType: TestType;
  executor: ExecutorType;
  virtualUsers: number;
  duration: number;
  stages: Stage[];
  endpoints: Endpoint[];
  thresholds: ThresholdRule[];
  checks: CheckRule[];
  defaultHeaders: Record<string, string>;
}

export interface UpdateTestConfigInput {
  name?: string;
  testType?: TestType;
  executor?: ExecutorType;
  virtualUsers?: number;
  duration?: number;
  stages?: Stage[];
  endpoints?: Endpoint[];
  thresholds?: ThresholdRule[];
  checks?: CheckRule[];
  defaultHeaders?: Record<string, string>;
}

// ──────────────────────────────────────────────
// Test Run & Metrics
// ──────────────────────────────────────────────

export interface MetricsSnapshot {
  timestamp: number; // ms since run start
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
  activeVUs: number;
}

export interface EndpointMetrics {
  url: string;
  method: HttpMethod;
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
}

export interface ThresholdResult {
  rule: ThresholdRule;
  actualValue: number;
  passed: boolean;
}

export interface CheckResult {
  rule: CheckRule;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  passRate: number;
}

export interface TestRun {
  id: string;
  testConfigId: string;
  status: RunStatus;
  startedAt: string | null;
  completedAt: string | null;
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
  createdAt: string;
}

// ──────────────────────────────────────────────
// Settings
// ──────────────────────────────────────────────

export interface AppSettings {
  id: number;
  allowLocalTargets: boolean;
  maxVirtualUsers: number;
  maxDurationSeconds: number;
  maxRequestsPerSecond: number;
}

export interface UpdateSettingsInput {
  allowLocalTargets?: boolean;
  maxVirtualUsers?: number;
  maxDurationSeconds?: number;
  maxRequestsPerSecond?: number;
}

// ──────────────────────────────────────────────
// Dashboard
// ──────────────────────────────────────────────

export interface DashboardStats {
  totalProjects: number;
  totalRuns: number;
  latestRunStatus: RunStatus | null;
  avgP95: number;
  errorRateTrend: number[];
  recentRuns: RecentRun[];
}

export interface RecentRun {
  id: string;
  testName: string;
  projectName: string;
  status: RunStatus;
  p95: number;
  errorRate: number;
  totalRequests: number;
  startedAt: string;
  durationMs: number;
}

// ──────────────────────────────────────────────
// SSE Events
// ──────────────────────────────────────────────

export const SSEEventType = {
  METRICS: 'metrics',
  STATUS_CHANGE: 'statusChange',
  LOG: 'log',
  COMPLETE: 'complete',
  ERROR: 'error',
} as const;
export type SSEEventType = (typeof SSEEventType)[keyof typeof SSEEventType];

export interface SSEMetricsEvent {
  type: typeof SSEEventType.METRICS;
  data: MetricsSnapshot;
}

export interface SSEStatusChangeEvent {
  type: typeof SSEEventType.STATUS_CHANGE;
  data: { status: RunStatus };
}

export interface SSELogEvent {
  type: typeof SSEEventType.LOG;
  data: { message: string; level: 'info' | 'warn' | 'error' };
}

export interface SSECompleteEvent {
  type: typeof SSEEventType.COMPLETE;
  data: { runId: string };
}

export interface SSEErrorEvent {
  type: typeof SSEEventType.ERROR;
  data: { message: string };
}

export type SSEEvent =
  | SSEMetricsEvent
  | SSEStatusChangeEvent
  | SSELogEvent
  | SSECompleteEvent
  | SSEErrorEvent;

// ──────────────────────────────────────────────
// API Response Wrappers
// ──────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResult<T> = ApiResponse<T> | ApiError;
