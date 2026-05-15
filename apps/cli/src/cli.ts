#!/usr/bin/env node
/**
 * K9 CLI — Run performance tests from the terminal.
 *
 * Usage:
 *   k9 run config.json          Run a test from a JSON config file
 *   k9 run config.json --vus 50 Override virtual users
 *   k9 run config.json --duration 60  Override duration
 *   k9 --help                   Show help
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import http from 'node:http';
import https from 'node:https';
import type { HttpMethod } from '@k9/shared';

// ── Colors for terminal output ──
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  bgGreen: '\x1b[42m',
  bgRed: '\x1b[41m',
  bgBlue: '\x1b[44m',
};

interface CliConfig {
  name?: string;
  testType?: string;
  virtualUsers: number;
  duration: number;
  endpoints: {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    bodyType?: string;
  }[];
  thresholds?: { metric: string; operator: string; value: number }[];
}

interface RequestResult {
  url: string;
  method: string;
  statusCode: number;
  responseTimeMs: number;
  success: boolean;
  error?: string;
}

// ── Parse CLI arguments ──
const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  printHelp();
  process.exit(0);
}

if (args[0] !== 'run') {
  console.error(`${C.red}Unknown command: ${args[0]}${C.reset}`);
  console.error(`Run ${C.cyan}k9 --help${C.reset} for usage information.`);
  process.exit(1);
}

const configPath = args[1];
if (!configPath) {
  console.error(`${C.red}Error: No config file specified.${C.reset}`);
  console.error(`Usage: ${C.cyan}k9 run config.json${C.reset}`);
  process.exit(1);
}

const fullPath = resolve(process.cwd(), configPath);
if (!existsSync(fullPath)) {
  console.error(`${C.red}Error: File not found: ${fullPath}${C.reset}`);
  process.exit(1);
}

// Parse config
let config: CliConfig;
try {
  const raw = readFileSync(fullPath, 'utf-8');
  config = JSON.parse(raw);
} catch (err) {
  console.error(`${C.red}Error: Failed to parse config file.${C.reset}`);
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}

// CLI overrides
const vusOverride = getArg('--vus');
const durOverride = getArg('--duration');
if (vusOverride) config.virtualUsers = parseInt(vusOverride, 10);
if (durOverride) config.duration = parseInt(durOverride, 10);

if (!config.endpoints || config.endpoints.length === 0) {
  console.error(`${C.red}Error: No endpoints defined in config.${C.reset}`);
  process.exit(1);
}

// ── Run the test ──
runTest(config).catch((err) => {
  console.error(`${C.red}Fatal error: ${err.message}${C.reset}`);
  process.exit(1);
});

async function runTest(cfg: CliConfig) {
  const vus = cfg.virtualUsers || 10;
  const durationMs = (cfg.duration || 30) * 1000;
  const testName = cfg.name || configPath;

  printBanner();
  console.log(`  ${C.dim}Test:${C.reset}      ${C.white}${testName}${C.reset}`);
  console.log(`  ${C.dim}Type:${C.reset}      ${C.cyan}${cfg.testType || 'load'}${C.reset}`);
  console.log(`  ${C.dim}VUs:${C.reset}       ${C.yellow}${vus}${C.reset}`);
  console.log(`  ${C.dim}Duration:${C.reset}  ${C.yellow}${cfg.duration}s${C.reset}`);
  console.log(`  ${C.dim}Endpoints:${C.reset} ${C.yellow}${cfg.endpoints.length}${C.reset}`);
  console.log();
  console.log(`  ${C.blue}▶ Starting test...${C.reset}`);
  console.log();

  const responseTimes: number[] = [];
  let totalRequests = 0;
  let failedRequests = 0;
  const startTime = Date.now();
  const endTime = startTime + durationMs;

  // Progress ticker
  const progressInterval = setInterval(() => {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    const rps = totalRequests / Math.max((Date.now() - startTime) / 1000, 0.001);
    const sorted = [...responseTimes].sort((a, b) => a - b);
    const p95 = sorted.length > 0 ? sorted[Math.ceil(0.95 * sorted.length) - 1] : 0;
    process.stdout.write(
      `\r  ${C.gray}[${elapsed}s]${C.reset} ` +
      `${C.white}${totalRequests}${C.reset} reqs  ` +
      `${C.cyan}${Math.round(rps)} rps${C.reset}  ` +
      `${C.yellow}p95: ${Math.round(p95)}ms${C.reset}  ` +
      `${failedRequests > 0 ? C.red : C.green}errors: ${failedRequests}${C.reset}  ` +
      `${C.dim}VUs: ${vus}${C.reset}   `
    );
  }, 500);

  // VU tasks
  const vuTasks = Array.from({ length: vus }, (_, vuId) =>
    runVU(vuId, cfg.endpoints, endTime, (result) => {
      totalRequests++;
      responseTimes.push(result.responseTimeMs);
      if (!result.success) failedRequests++;
    })
  );

  await Promise.all(vuTasks);
  clearInterval(progressInterval);

  // Final metrics
  const durationSec = (Date.now() - startTime) / 1000;
  const sorted = [...responseTimes].sort((a, b) => a - b);

  console.log('\n');
  printResults({
    testName,
    totalRequests,
    failedRequests,
    durationSec,
    sorted,
    vus,
    thresholds: cfg.thresholds,
  });
}

async function runVU(
  _vuId: number,
  endpoints: CliConfig['endpoints'],
  endTime: number,
  onResult: (r: RequestResult) => void,
) {
  let idx = 0;
  while (Date.now() < endTime) {
    const ep = endpoints[idx % endpoints.length];
    idx++;
    const result = await executeRequest(ep);
    onResult(result);
  }
}

function executeRequest(ep: CliConfig['endpoints'][0]): Promise<RequestResult> {
  return new Promise((resolve) => {
    const start = performance.now();
    const parsed = new URL(ep.url);
    const isHttps = parsed.protocol === 'https:';
    const method = (ep.method || 'GET').toUpperCase();

    const headers: Record<string, string> = { ...ep.headers };
    if (ep.body && ep.bodyType === 'json') headers['Content-Type'] = 'application/json';

    const options: http.RequestOptions = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method,
      headers,
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
          url: ep.url, method, statusCode: code,
          responseTimeMs: Math.round(ms * 100) / 100,
          success: code >= 200 && code < 400,
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        url: ep.url, method, statusCode: 0,
        responseTimeMs: Math.round((performance.now() - start) * 100) / 100,
        success: false, error: err.message,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        url: ep.url, method, statusCode: 0,
        responseTimeMs: Math.round((performance.now() - start) * 100) / 100,
        success: false, error: 'Timeout',
      });
    });

    if (ep.body) req.write(ep.body);
    req.end();
  });
}

function printResults(opts: {
  testName: string; totalRequests: number; failedRequests: number;
  durationSec: number; sorted: number[]; vus: number;
  thresholds?: { metric: string; operator: string; value: number }[];
}) {
  const { totalRequests, failedRequests, durationSec, sorted, vus, thresholds } = opts;
  const rps = totalRequests / Math.max(durationSec, 0.001);
  const errorRate = totalRequests > 0 ? failedRequests / totalRequests : 0;
  const avg = sorted.length > 0 ? sorted.reduce((a, b) => a + b, 0) / sorted.length : 0;
  const p = (pct: number) => sorted.length > 0 ? sorted[Math.max(0, Math.ceil((pct / 100) * sorted.length) - 1)] : 0;

  console.log(`  ${C.bold}${C.white}═══════════════════════════════════════════${C.reset}`);
  console.log(`  ${C.bold}${C.white}  K9 Test Results${C.reset}`);
  console.log(`  ${C.bold}${C.white}═══════════════════════════════════════════${C.reset}`);
  console.log();
  console.log(`  ${C.dim}Total Requests:${C.reset}    ${C.white}${C.bold}${totalRequests.toLocaleString()}${C.reset}`);
  console.log(`  ${C.dim}Failed Requests:${C.reset}   ${failedRequests > 0 ? C.red : C.green}${failedRequests}${C.reset}`);
  console.log(`  ${C.dim}Error Rate:${C.reset}        ${errorRate > 0.05 ? C.red : C.green}${(errorRate * 100).toFixed(2)}%${C.reset}`);
  console.log(`  ${C.dim}Duration:${C.reset}          ${C.white}${durationSec.toFixed(1)}s${C.reset}`);
  console.log(`  ${C.dim}Virtual Users:${C.reset}     ${C.white}${vus}${C.reset}`);
  console.log(`  ${C.dim}Avg RPS:${C.reset}           ${C.cyan}${Math.round(rps)}${C.reset}`);
  console.log();
  console.log(`  ${C.bold}${C.white}Response Times:${C.reset}`);
  console.log(`    ${C.dim}Avg:${C.reset}  ${C.white}${Math.round(avg)}ms${C.reset}`);
  console.log(`    ${C.dim}Min:${C.reset}  ${C.green}${Math.round(sorted[0] || 0)}ms${C.reset}`);
  console.log(`    ${C.dim}P50:${C.reset}  ${C.white}${Math.round(p(50))}ms${C.reset}`);
  console.log(`    ${C.dim}P90:${C.reset}  ${C.yellow}${Math.round(p(90))}ms${C.reset}`);
  console.log(`    ${C.dim}P95:${C.reset}  ${C.yellow}${C.bold}${Math.round(p(95))}ms${C.reset}`);
  console.log(`    ${C.dim}P99:${C.reset}  ${C.red}${Math.round(p(99))}ms${C.reset}`);
  console.log(`    ${C.dim}Max:${C.reset}  ${C.red}${Math.round(sorted[sorted.length - 1] || 0)}ms${C.reset}`);

  // Evaluate thresholds
  if (thresholds && thresholds.length > 0) {
    console.log();
    console.log(`  ${C.bold}${C.white}Thresholds:${C.reset}`);
    const metricValues: Record<string, number> = {
      p50: p(50), p90: p(90), p95: p(95), p99: p(99),
      avgResponseTime: avg, errorRate, requestsPerSecond: rps,
    };
    let allPassed = true;
    for (const t of thresholds) {
      const actual = metricValues[t.metric] ?? 0;
      const passed = compareThreshold(actual, t.operator, t.value);
      if (!passed) allPassed = false;
      const icon = passed ? `${C.green}✓${C.reset}` : `${C.red}✗${C.reset}`;
      const color = passed ? C.green : C.red;
      console.log(`    ${icon} ${t.metric} ${t.operator} ${t.value} ${C.dim}(actual: ${color}${Math.round(actual * 100) / 100}${C.reset}${C.dim})${C.reset}`);
    }
    console.log();
    if (allPassed) {
      console.log(`  ${C.bgGreen}${C.white}${C.bold}  ALL THRESHOLDS PASSED  ${C.reset}`);
    } else {
      console.log(`  ${C.bgRed}${C.white}${C.bold}  THRESHOLDS FAILED  ${C.reset}`);
    }
  }

  console.log();
  console.log(`  ${C.dim}─────────────────────────────────────────────${C.reset}`);
  console.log();
}

function compareThreshold(actual: number, op: string, expected: number): boolean {
  switch (op) {
    case 'lt': return actual < expected;
    case 'gt': return actual > expected;
    case 'lte': return actual <= expected;
    case 'gte': return actual >= expected;
    default: return false;
  }
}

function printBanner() {
  console.log();
  console.log(`  ${C.blue}${C.bold}  ╔═══╗${C.reset}`);
  console.log(`  ${C.blue}${C.bold}  ║ K9 ║${C.reset}  ${C.dim}Performance Testing CLI${C.reset}`);
  console.log(`  ${C.blue}${C.bold}  ╚═══╝${C.reset}  ${C.dim}v0.1.0${C.reset}`);
  console.log();
  console.log(`  ${C.dim}─────────────────────────────────────────────${C.reset}`);
  console.log();
}

function printHelp() {
  printBanner();
  console.log(`  ${C.bold}${C.white}Usage:${C.reset}`);
  console.log(`    ${C.cyan}k9 run${C.reset} ${C.yellow}<config.json>${C.reset}  [options]`);
  console.log();
  console.log(`  ${C.bold}${C.white}Options:${C.reset}`);
  console.log(`    ${C.yellow}--vus <number>${C.reset}       Override virtual users`);
  console.log(`    ${C.yellow}--duration <number>${C.reset}  Override duration (seconds)`);
  console.log(`    ${C.yellow}--help${C.reset}              Show this help`);
  console.log();
  console.log(`  ${C.bold}${C.white}Config File Format:${C.reset}`);
  console.log(`    ${C.dim}{`);
  console.log(`      "name": "My API Test",`);
  console.log(`      "testType": "load",`);
  console.log(`      "virtualUsers": 10,`);
  console.log(`      "duration": 30,`);
  console.log(`      "endpoints": [`);
  console.log(`        { "url": "https://api.example.com/health", "method": "GET" }`);
  console.log(`      ],`);
  console.log(`      "thresholds": [`);
  console.log(`        { "metric": "p95", "operator": "lt", "value": 500 }`);
  console.log(`      ]`);
  console.log(`    }${C.reset}`);
  console.log();
}

function getArg(flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : undefined;
}
