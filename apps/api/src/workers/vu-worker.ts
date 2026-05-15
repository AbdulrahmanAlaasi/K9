/**
 * VU Worker Thread — executes HTTP requests in a loop.
 * Communicates with master via parentPort messages.
 */
import { parentPort, workerData } from 'node:worker_threads';
import http from 'node:http';
import https from 'node:https';

interface WorkerConfig {
  vuId: number;
  endpoints: EndpointDef[];
  durationMs: number;
  defaultHeaders: Record<string, string>;
}

interface EndpointDef {
  url: string;
  method: string;
  headers: Record<string, string>;
  queryParams: Record<string, string>;
  body: string | null;
  bodyType: string;
  authToken: string | null;
}

interface RequestResultMsg {
  type: 'result';
  vuId: number;
  url: string;
  method: string;
  statusCode: number;
  responseTimeMs: number;
  success: boolean;
  error?: string;
  body: string;
  timestamp: number;
}

const config = workerData as WorkerConfig;

const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 10 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 10 });

/**
 * Builds URL with query params attached.
 */
function buildUrl(base: string, params: Record<string, string>): string {
  const url = new URL(base);
  for (const [key, val] of Object.entries(params)) {
    url.searchParams.set(key, val);
  }
  return url.toString();
}

/**
 * Executes a single HTTP request and returns the result.
 */
function executeRequest(endpoint: EndpointDef): Promise<RequestResultMsg> {
  return new Promise((resolve) => {
    const startTime = performance.now();
    const fullUrl = buildUrl(endpoint.url, endpoint.queryParams);
    const parsed = new URL(fullUrl);
    const isHttps = parsed.protocol === 'https:';

    const headers: Record<string, string> = {
      ...config.defaultHeaders,
      ...endpoint.headers,
    };

    if (endpoint.authToken) {
      headers['Authorization'] = `Bearer ${endpoint.authToken}`;
    }

    if (endpoint.body && endpoint.bodyType === 'json') {
      headers['Content-Type'] = 'application/json';
    } else if (endpoint.body && endpoint.bodyType === 'form') {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
    } else if (endpoint.body && endpoint.bodyType === 'text') {
      headers['Content-Type'] = 'text/plain';
    }

    const options: http.RequestOptions = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: endpoint.method,
      headers,
      agent: isHttps ? httpsAgent : httpAgent,
      timeout: 30000,
    };

    const proto = isHttps ? https : http;

    const req = proto.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        const responseTimeMs = performance.now() - startTime;
        const body = Buffer.concat(chunks).toString('utf-8');
        const statusCode = res.statusCode ?? 0;
        const success = statusCode >= 200 && statusCode < 400;

        resolve({
          type: 'result',
          vuId: config.vuId,
          url: endpoint.url,
          method: endpoint.method,
          statusCode,
          responseTimeMs: Math.round(responseTimeMs * 100) / 100,
          success,
          body,
          timestamp: Date.now(),
        });
      });
    });

    req.on('error', (err) => {
      const responseTimeMs = performance.now() - startTime;
      resolve({
        type: 'result',
        vuId: config.vuId,
        url: endpoint.url,
        method: endpoint.method,
        statusCode: 0,
        responseTimeMs: Math.round(responseTimeMs * 100) / 100,
        success: false,
        error: err.message,
        body: '',
        timestamp: Date.now(),
      });
    });

    req.on('timeout', () => {
      req.destroy();
      const responseTimeMs = performance.now() - startTime;
      resolve({
        type: 'result',
        vuId: config.vuId,
        url: endpoint.url,
        method: endpoint.method,
        statusCode: 0,
        responseTimeMs: Math.round(responseTimeMs * 100) / 100,
        success: false,
        error: 'Request timeout (30s)',
        body: '',
        timestamp: Date.now(),
      });
    });

    if (endpoint.body && endpoint.bodyType !== 'none') {
      req.write(endpoint.body);
    }

    req.end();
  });
}

/**
 * Main VU loop — cycles through endpoints until duration expires.
 */
async function runVU(): Promise<void> {
  const endTime = Date.now() + config.durationMs;
  let endpointIndex = 0;

  // Notify master that this VU is ready
  parentPort?.postMessage({ type: 'ready', vuId: config.vuId });

  // Wait for start signal
  await new Promise<void>((resolve) => {
    parentPort?.on('message', (msg: { type: string }) => {
      if (msg.type === 'start') resolve();
      if (msg.type === 'stop') {
        parentPort?.postMessage({ type: 'done', vuId: config.vuId });
        process.exit(0);
      }
    });
  });

  while (Date.now() < endTime) {
    const endpoint = config.endpoints[endpointIndex % config.endpoints.length];
    endpointIndex++;

    const result = await executeRequest(endpoint);
    parentPort?.postMessage(result);
  }

  parentPort?.postMessage({ type: 'done', vuId: config.vuId });
}

runVU().catch((err) => {
  parentPort?.postMessage({ type: 'error', vuId: config.vuId, error: String(err) });
});
