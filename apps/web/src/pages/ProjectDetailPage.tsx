import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import {
  ArrowLeft, Loader2, FlaskConical, Trash2, Calendar, Play,
  Layers, Clock, Target, Gauge, Plus,
} from 'lucide-react';
import { TEST_TYPE_LABELS, EXECUTOR_LABELS } from '@k9/shared';
import { clsx } from 'clsx';

const typeColors: Record<string, string> = {
  smoke: 'from-emerald-500 to-teal-400',
  load: 'from-blue-500 to-cyan-400',
  stress: 'from-amber-500 to-orange-400',
  spike: 'from-red-500 to-rose-400',
  soak: 'from-violet-500 to-purple-400',
};

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: project, isLoading, error } = useQuery({
    queryKey: ['project', id],
    queryFn: () => api.getProject(id!),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteProject(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      navigate('/projects');
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

  if (error || !project) {
    return (
      <div className="card text-center py-16">
        <p className="text-red-400 font-semibold">Project not found</p>
        <button className="btn-secondary mt-4" onClick={() => navigate('/projects')}>Back to Projects</button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button className="btn-ghost p-2.5 rounded-xl mt-1" onClick={() => navigate('/projects')}>
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]" />
            <span className="text-xs font-semibold text-cyan-400/70 uppercase tracking-widest">Project</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white">{project.name}</h1>
          {project.description && (
            <p className="text-surface-400 mt-2 text-sm max-w-2xl">{project.description}</p>
          )}
        </div>
        <button
          className="btn-danger"
          onClick={() => {
            if (confirm('Delete this project and all its tests? This cannot be undone.')) {
              deleteMutation.mutate();
            }
          }}
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
      </div>

      {/* Test Configs */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-surface-800/60 flex items-center justify-center">
              <Layers className="w-4 h-4 text-surface-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Test Configurations</h2>
              <p className="text-xs text-surface-500">{project.tests?.length ?? 0} test{(project.tests?.length ?? 0) !== 1 ? 's' : ''} configured</p>
            </div>
          </div>
          <Link to={`/projects/${id}/tests/new`} className="btn-primary text-sm">
            <Plus className="w-4 h-4" /> New Test
          </Link>
        </div>

        {!project.tests?.length ? (
          <div className="card text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-surface-800/40 flex items-center justify-center mx-auto mb-4">
              <FlaskConical className="w-7 h-7 text-surface-600" />
            </div>
            <p className="text-surface-400 font-medium">No test configurations yet</p>
            <p className="text-surface-600 text-sm mt-1 mb-6">Create your first test to start performance testing</p>
            <Link to={`/projects/${id}/tests/new`} className="btn-primary">
              <Plus className="w-4 h-4" /> Create Test
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 stagger-children">
            {project.tests.map((test) => (
              <div key={test.id} className="card-hover group">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-white group-hover:text-brand-300 transition-colors">
                      {test.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={clsx(
                        'badge text-[9px]',
                        `bg-gradient-to-r ${typeColors[test.testType] ?? 'from-surface-500 to-surface-400'}`,
                        'text-white border-0',
                      )}>
                        {TEST_TYPE_LABELS[test.testType] ?? test.testType}
                      </span>
                      <span className="badge-neutral text-[9px]">
                        {EXECUTOR_LABELS[test.executor] ?? test.executor}
                      </span>
                    </div>
                  </div>
                  <RunTestButton testId={test.id} />
                </div>

                <div className="grid grid-cols-3 gap-3 mt-4">
                  <MiniStat icon={Gauge} label="VUs" value={test.virtualUsers} />
                  <MiniStat icon={Clock} label="Duration" value={`${test.duration}s`} />
                  <MiniStat icon={Target} label="Endpoints" value={test.endpoints.length} />
                </div>

                <div className="flex items-center gap-2 text-[10px] text-surface-600 font-medium mt-4 pt-3 border-t border-surface-800/30">
                  <Calendar className="w-3 h-3" />
                  {new Date(test.createdAt).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-surface-800/30 rounded-xl px-3 py-2.5 text-center">
      <Icon className="w-3.5 h-3.5 text-surface-500 mx-auto mb-1" />
      <p className="text-sm font-bold text-white">{value}</p>
      <p className="text-[9px] text-surface-600 uppercase tracking-wider">{label}</p>
    </div>
  );
}

function RunTestButton({ testId }: { testId: string }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleRun = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const result = await api.startTestRun(testId);
      navigate(`/runs/${result.runId}/live`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to start test');
      setLoading(false);
    }
  };

  return (
    <button
      className="btn-success text-xs px-3 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
      onClick={handleRun}
      disabled={loading}
    >
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
      {loading ? 'Starting...' : 'Run'}
    </button>
  );
}
