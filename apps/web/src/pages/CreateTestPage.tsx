import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import {
  ArrowLeft, ArrowRight, Check, Loader2, Plus, Trash2,
  Zap, Globe, Shield, ListChecks,
} from 'lucide-react';
import { clsx } from 'clsx';
import { nanoid } from 'nanoid';

const STEPS = ['Basics', 'Endpoints', 'Thresholds & Checks', 'Review'];
const TEST_TYPES = [
  { value: 'smoke', label: 'Smoke', desc: 'Minimal load to verify system works', color: 'from-emerald-500 to-teal-400' },
  { value: 'load', label: 'Load', desc: 'Simulate expected user traffic', color: 'from-blue-500 to-cyan-400' },
  { value: 'stress', label: 'Stress', desc: 'Find breaking points', color: 'from-amber-500 to-orange-400' },
  { value: 'spike', label: 'Spike', desc: 'Sudden traffic surges', color: 'from-red-500 to-rose-400' },
  { value: 'soak', label: 'Soak', desc: 'Sustained load over time', color: 'from-violet-500 to-purple-400' },
];
const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

interface FormEndpoint {
  id: string; url: string; method: string;
  headers: string; body: string; bodyType: string;
}

interface FormThreshold {
  id: string; metric: string; operator: string; value: number;
}

interface FormCheck {
  id: string; type: string; name: string; expected: string; jsonPath: string;
}

export function CreateTestPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [testType, setTestType] = useState('load');
  const [executor, setExecutor] = useState('constant-vus');
  const [vus, setVus] = useState(10);
  const [duration, setDuration] = useState(30);
  const [endpoints, setEndpoints] = useState<FormEndpoint[]>([
    { id: nanoid(6), url: '', method: 'GET', headers: '{}', body: '', bodyType: 'none' },
  ]);
  const [thresholds, setThresholds] = useState<FormThreshold[]>([]);
  const [checks, setChecks] = useState<FormCheck[]>([]);

  const mutation = useMutation({
    mutationFn: () => {
      const parsedEndpoints = endpoints.map((ep) => ({
        id: ep.id,
        url: ep.url,
        method: ep.method,
        headers: safeParseJson(ep.headers),
        queryParams: {},
        body: ep.body || null,
        bodyType: ep.bodyType,
        authToken: null,
      }));
      return api.createTestConfig(projectId!, {
        name,
        testType: testType as any,
        executor: executor as any,
        virtualUsers: vus,
        duration,
        stages: [],
        endpoints: parsedEndpoints,
        thresholds: thresholds.map((t) => ({
          id: t.id, metric: t.metric as any,
          operator: t.operator as any, value: t.value,
        })),
        checks: checks.map((c) => ({
          id: c.id, type: c.type as any,
          name: c.name, expected: c.expected,
          ...(c.jsonPath ? { jsonPath: c.jsonPath } : {}),
        })),
        defaultHeaders: {},
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      navigate(`/projects/${projectId}`);
    },
    onError: (err: Error) => setError(err.message),
  });

  const canProceed = () => {
    if (step === 0) return name.trim().length > 0;
    if (step === 1) return endpoints.some((ep) => ep.url.trim().length > 0);
    return true;
  };

  return (
    <div className="animate-fade-in max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button className="btn-ghost p-2.5 rounded-xl" onClick={() => navigate(`/projects/${projectId}`)}>
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span className="text-xs font-semibold text-emerald-400/70 uppercase tracking-widest">New Test</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white">Create Test Configuration</h1>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={clsx(
              'w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all duration-300',
              i < step ? 'bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                : i === step ? 'bg-brand-500 text-white shadow-[0_0_12px_rgba(59,130,246,0.3)]'
                : 'bg-surface-800 text-surface-500',
            )}>
              {i < step ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span className={clsx(
              'text-xs font-semibold hidden sm:block',
              i <= step ? 'text-surface-300' : 'text-surface-600',
            )}>{s}</span>
            {i < STEPS.length - 1 && (
              <div className={clsx(
                'flex-1 h-[2px] rounded-full mx-2',
                i < step ? 'bg-emerald-500/40' : 'bg-surface-800',
              )} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="card mb-6 min-h-[350px]">
        {step === 0 && (
          <StepBasics {...{ name, setName, testType, setTestType, executor, setExecutor, vus, setVus, duration, setDuration }} />
        )}
        {step === 1 && (
          <StepEndpoints endpoints={endpoints} setEndpoints={setEndpoints} />
        )}
        {step === 2 && (
          <StepThresholdsChecks
            thresholds={thresholds} setThresholds={setThresholds}
            checks={checks} setChecks={setChecks}
          />
        )}
        {step === 3 && (
          <StepReview {...{ name, testType, executor, vus, duration, endpoints, thresholds, checks }} />
        )}
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <button className="btn-secondary" onClick={() => step > 0 ? setStep(step - 1) : navigate(`/projects/${projectId}`)}>
          <ArrowLeft className="w-4 h-4" />
          {step === 0 ? 'Cancel' : 'Back'}
        </button>
        {step < STEPS.length - 1 ? (
          <button className="btn-primary" onClick={() => setStep(step + 1)} disabled={!canProceed()}>
            Next <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button className="btn-success" onClick={() => mutation.mutate()} disabled={mutation.isPending || !canProceed()}>
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Create Test
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Step 1: Basics ── */
function StepBasics({ name, setName, testType, setTestType, executor, setExecutor, vus, setVus, duration, setDuration }: any) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <label className="label">Test Name</label>
        <input className="input" placeholder="e.g. Homepage Load Test" value={name}
          onChange={(e) => setName(e.target.value)} autoFocus />
      </div>
      <div>
        <label className="label">Test Type</label>
        <div className="grid grid-cols-5 gap-2">
          {TEST_TYPES.map((tt) => (
            <button key={tt.value} type="button"
              className={clsx(
                'p-3 rounded-xl border text-center transition-all duration-200',
                testType === tt.value
                  ? 'border-brand-500/40 bg-brand-500/10 shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                  : 'border-surface-700/30 bg-surface-800/30 hover:border-surface-600/50',
              )}
              onClick={() => setTestType(tt.value)}
            >
              <div className={clsx('w-6 h-6 rounded-lg bg-gradient-to-br mx-auto mb-2', tt.color)} />
              <p className="text-xs font-bold text-surface-200">{tt.label}</p>
              <p className="text-[9px] text-surface-500 mt-0.5">{tt.desc}</p>
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="label">Executor</label>
          <select className="select" value={executor} onChange={(e) => setExecutor(e.target.value)}>
            <option value="constant-vus">Constant VUs</option>
            <option value="ramping-vus">Ramping VUs</option>
            <option value="constant-rate">Constant Rate</option>
          </select>
        </div>
        <div>
          <label className="label">Virtual Users</label>
          <input type="number" className="input text-center font-mono" min={1} max={500}
            value={vus} onChange={(e) => setVus(Number(e.target.value))} />
        </div>
        <div>
          <label className="label">Duration (seconds)</label>
          <input type="number" className="input text-center font-mono" min={1} max={3600}
            value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
        </div>
      </div>
    </div>
  );
}

/* ── Step 2: Endpoints ── */
function StepEndpoints({ endpoints, setEndpoints }: {
  endpoints: FormEndpoint[]; setEndpoints: (e: FormEndpoint[]) => void;
}) {
  const add = () => setEndpoints([...endpoints, { id: nanoid(6), url: '', method: 'GET', headers: '{}', body: '', bodyType: 'none' }]);
  const remove = (id: string) => setEndpoints(endpoints.filter((e) => e.id !== id));
  const update = (id: string, field: string, value: string) =>
    setEndpoints(endpoints.map((e) => e.id === id ? { ...e, [field]: value } : e));

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-brand-400" />
          <h3 className="text-sm font-bold text-white">Target Endpoints</h3>
        </div>
        <button type="button" className="btn-ghost text-xs" onClick={add}>
          <Plus className="w-3.5 h-3.5" /> Add Endpoint
        </button>
      </div>
      {endpoints.map((ep, idx) => (
        <div key={ep.id} className="p-4 rounded-xl bg-surface-800/30 border border-surface-700/20 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-surface-500 uppercase">Endpoint {idx + 1}</span>
            {endpoints.length > 1 && (
              <button type="button" className="text-surface-600 hover:text-red-400 transition-colors" onClick={() => remove(ep.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <select className="select w-28" value={ep.method} onChange={(e) => update(ep.id, 'method', e.target.value)}>
              {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <input className="input flex-1 font-mono text-xs" placeholder="https://api.example.com/endpoint"
              value={ep.url} onChange={(e) => update(ep.id, 'url', e.target.value)} />
          </div>
          {ep.method !== 'GET' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-surface-500 uppercase mb-1 block">Body Type</label>
                <select className="select text-xs" value={ep.bodyType} onChange={(e) => update(ep.id, 'bodyType', e.target.value)}>
                  <option value="none">None</option>
                  <option value="json">JSON</option>
                  <option value="form">Form</option>
                  <option value="text">Text</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-surface-500 uppercase mb-1 block">Body</label>
                <input className="input text-xs font-mono" placeholder='{"key": "value"}'
                  value={ep.body} onChange={(e) => update(ep.id, 'body', e.target.value)} />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Step 3: Thresholds & Checks ── */
function StepThresholdsChecks({ thresholds, setThresholds, checks, setChecks }: {
  thresholds: FormThreshold[]; setThresholds: (t: FormThreshold[]) => void;
  checks: FormCheck[]; setChecks: (c: FormCheck[]) => void;
}) {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Thresholds */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Thresholds <span className="font-normal text-surface-500">(optional)</span></h3>
          </div>
          <button type="button" className="btn-ghost text-xs" onClick={() =>
            setThresholds([...thresholds, { id: nanoid(6), metric: 'p95', operator: 'lt', value: 500 }])
          }>
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
        {thresholds.length === 0 ? (
          <p className="text-xs text-surface-600 italic">No thresholds configured. Test will always pass.</p>
        ) : (
          <div className="space-y-2">
            {thresholds.map((t) => (
              <div key={t.id} className="flex items-center gap-2 p-3 rounded-xl bg-surface-800/30 border border-surface-700/20">
                <select className="select text-xs flex-1" value={t.metric}
                  onChange={(e) => setThresholds(thresholds.map((x) => x.id === t.id ? { ...x, metric: e.target.value } : x))}>
                  <option value="p95">P95</option><option value="p90">P90</option>
                  <option value="p99">P99</option><option value="avgResponseTime">Avg Response</option>
                  <option value="errorRate">Error Rate</option><option value="requestsPerSecond">RPS</option>
                </select>
                <select className="select text-xs w-20" value={t.operator}
                  onChange={(e) => setThresholds(thresholds.map((x) => x.id === t.id ? { ...x, operator: e.target.value } : x))}>
                  <option value="lt">&lt;</option><option value="lte">≤</option>
                  <option value="gt">&gt;</option><option value="gte">≥</option>
                </select>
                <input type="number" className="input text-xs w-24 text-center font-mono" value={t.value}
                  onChange={(e) => setThresholds(thresholds.map((x) => x.id === t.id ? { ...x, value: Number(e.target.value) } : x))} />
                <button type="button" className="text-surface-600 hover:text-red-400" onClick={() => setThresholds(thresholds.filter((x) => x.id !== t.id))}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Checks */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Checks <span className="font-normal text-surface-500">(optional)</span></h3>
          </div>
          <button type="button" className="btn-ghost text-xs" onClick={() =>
            setChecks([...checks, { id: nanoid(6), type: 'statusCode', name: 'Status is 200', expected: '200', jsonPath: '' }])
          }>
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
        {checks.length === 0 ? (
          <p className="text-xs text-surface-600 italic">No checks configured.</p>
        ) : (
          <div className="space-y-2">
            {checks.map((c) => (
              <div key={c.id} className="p-3 rounded-xl bg-surface-800/30 border border-surface-700/20 space-y-2">
                <div className="flex items-center gap-2">
                  <input className="input text-xs flex-1" placeholder="Check name" value={c.name}
                    onChange={(e) => setChecks(checks.map((x) => x.id === c.id ? { ...x, name: e.target.value } : x))} />
                  <select className="select text-xs w-32" value={c.type}
                    onChange={(e) => setChecks(checks.map((x) => x.id === c.id ? { ...x, type: e.target.value } : x))}>
                    <option value="statusCode">Status Code</option>
                    <option value="bodyContains">Body Contains</option>
                    <option value="jsonField">JSON Field</option>
                    <option value="responseTime">Response Time</option>
                  </select>
                  <button type="button" className="text-surface-600 hover:text-red-400" onClick={() => setChecks(checks.filter((x) => x.id !== c.id))}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <input className="input text-xs font-mono flex-1" placeholder="Expected value" value={c.expected}
                    onChange={(e) => setChecks(checks.map((x) => x.id === c.id ? { ...x, expected: e.target.value } : x))} />
                  {c.type === 'jsonField' && (
                    <input className="input text-xs font-mono w-40" placeholder="JSON path (e.g. data.id)" value={c.jsonPath}
                      onChange={(e) => setChecks(checks.map((x) => x.id === c.id ? { ...x, jsonPath: e.target.value } : x))} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Step 4: Review ── */
function StepReview({ name, testType, executor, vus, duration, endpoints, thresholds, checks }: any) {
  const validEndpoints = endpoints.filter((e: any) => e.url.trim());
  return (
    <div className="space-y-4 animate-fade-in">
      <h3 className="text-sm font-bold text-white flex items-center gap-2">
        <Zap className="w-4 h-4 text-brand-400" /> Review Configuration
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <ReviewItem label="Name" value={name} />
        <ReviewItem label="Test Type" value={testType} />
        <ReviewItem label="Executor" value={executor} />
        <ReviewItem label="Virtual Users" value={vus} />
        <ReviewItem label="Duration" value={`${duration}s`} />
        <ReviewItem label="Endpoints" value={validEndpoints.length} />
        <ReviewItem label="Thresholds" value={thresholds.length} />
        <ReviewItem label="Checks" value={checks.length} />
      </div>
      <div className="mt-4 pt-4 border-t border-surface-800/30">
        <p className="text-[10px] text-surface-500 uppercase font-bold mb-2">Endpoints</p>
        {validEndpoints.map((ep: any) => (
          <div key={ep.id} className="flex items-center gap-2 py-1">
            <span className="badge-info text-[9px] w-14 justify-center">{ep.method}</span>
            <span className="text-xs font-mono text-surface-300 truncate">{ep.url}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewItem({ label, value }: { label: string; value: any }) {
  return (
    <div className="bg-surface-800/30 rounded-xl px-4 py-3">
      <p className="text-[10px] text-surface-500 uppercase font-bold">{label}</p>
      <p className="text-sm font-semibold text-white mt-0.5">{String(value)}</p>
    </div>
  );
}

function safeParseJson(s: string): Record<string, string> {
  try { return JSON.parse(s); } catch { return {}; }
}
