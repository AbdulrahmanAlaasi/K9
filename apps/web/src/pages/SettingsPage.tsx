import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { Loader2, Shield, AlertTriangle, Cpu, Globe, Save, Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { AppSettings } from '@k9/shared';

export function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: api.getSettings,
  });

  const [form, setForm] = useState<Partial<AppSettings>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const mutation = useMutation({
    mutationFn: (data: Partial<AppSettings>) => api.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-12 h-12 rounded-2xl bg-brand-500/20 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8 max-w-2xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
          <span className="text-xs font-semibold text-amber-400/70 uppercase tracking-widest">Settings</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white">Configuration</h1>
        <p className="text-surface-500 mt-1.5 text-sm">Manage safety limits and test engine behavior</p>
      </div>

      <div className="space-y-6 stagger-children">
        {/* Safety Limits */}
        <div className="card-glow">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg">
                <Cpu className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Resource Limits</h2>
                <p className="text-xs text-surface-500">Prevent your machine from being overwhelmed</p>
              </div>
            </div>
            <div className="space-y-5">
              <SettingField
                label="Max Virtual Users"
                description="Maximum concurrent VUs per test run"
                value={form.maxVirtualUsers ?? 100}
                onChange={(v) => setForm({ ...form, maxVirtualUsers: v })}
                max={500}
                unit="VUs"
              />
              <SettingField
                label="Max Duration"
                description="Maximum test duration allowed"
                value={form.maxDurationSeconds ?? 600}
                onChange={(v) => setForm({ ...form, maxDurationSeconds: v })}
                max={3600}
                unit="seconds"
              />
              <SettingField
                label="Max Requests/Second"
                description="Maximum RPS for constant-rate executor"
                value={form.maxRequestsPerSecond ?? 500}
                onChange={(v) => setForm({ ...form, maxRequestsPerSecond: v })}
                max={2000}
                unit="RPS"
              />
            </div>
          </div>
        </div>

        {/* Network Safety */}
        <div className="card-glow">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-400 flex items-center justify-center shadow-lg">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Network Safety</h2>
                <p className="text-xs text-surface-500">SSRF protection for local networks</p>
              </div>
            </div>
            <label className="flex items-start gap-4 cursor-pointer group">
              <div className="relative mt-0.5">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={form.allowLocalTargets ?? false}
                  onChange={(e) => setForm({ ...form, allowLocalTargets: e.target.checked })}
                />
                <div className="w-11 h-6 rounded-full bg-surface-700 peer-checked:bg-brand-500 transition-colors duration-200">
                  <div className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 peer-checked:translate-x-5" />
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-surface-200 group-hover:text-white transition-colors">
                  Allow local/private network targets
                </p>
                <p className="text-xs text-surface-500 mt-1 leading-relaxed">
                  Enable testing localhost (127.x.x.x), private IPs (10.x.x.x, 192.168.x.x), and other internal addresses.
                  Keep disabled to prevent accidental SSRF-style requests to your local network.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Machine Warning */}
        <div className="card border-amber-500/15 bg-amber-500/[0.03]">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="font-bold text-amber-400 text-sm">Machine Impact Warning</p>
              <p className="text-surface-400 text-xs mt-1.5 leading-relaxed">
                All tests execute locally on your machine. High VU counts and long durations will consume significant
                CPU, memory, and network bandwidth. Test results are directly affected by your machine's current
                performance and network connection speed.
              </p>
            </div>
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center gap-4">
          <button
            className="btn-primary"
            onClick={() => mutation.mutate(form)}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <Check className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saved ? 'Saved!' : 'Save Settings'}
          </button>
          {saved && (
            <span className="text-emerald-400 text-sm font-medium animate-slide-in">
              ✓ Settings updated successfully
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingField({ label, description, value, onChange, max, unit }: {
  label: string;
  description: string;
  value: number;
  onChange: (v: number) => void;
  max: number;
  unit: string;
}) {
  return (
    <div className="flex items-center gap-6">
      <div className="flex-1">
        <label className="text-sm font-semibold text-surface-200">{label}</label>
        <p className="text-[11px] text-surface-500 mt-0.5">{description} (max: {max.toLocaleString()})</p>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          className="input w-28 text-center text-sm font-mono"
          value={value}
          min={1}
          max={max}
          onChange={(e) => onChange(Math.min(Number(e.target.value) || 0, max))}
        />
        <span className="text-[10px] text-surface-600 font-semibold uppercase w-12">{unit}</span>
      </div>
    </div>
  );
}
