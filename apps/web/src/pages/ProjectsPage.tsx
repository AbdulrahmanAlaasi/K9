import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Plus, FolderKanban, Loader2, Calendar, X, ArrowRight, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';

export function ProjectsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: api.getProjects,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl bg-brand-500/20 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
            <span className="text-xs font-semibold text-violet-400/70 uppercase tracking-widest">Projects</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white">Your Projects</h1>
          <p className="text-surface-500 mt-1.5 text-sm">Organize and manage your performance test suites</p>
        </div>
        <button id="create-project-btn" className="btn-primary" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {/* Content */}
      {!projects?.length ? (
        <div className="card text-center py-20">
          <div className="relative inline-block mb-6">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-500/10 to-violet-500/10 flex items-center justify-center border border-brand-500/10">
              <FolderKanban className="w-9 h-9 text-brand-500/60" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg animate-float">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Create your first project</h3>
          <p className="text-surface-500 mb-8 text-sm max-w-sm mx-auto">
            Projects help you organize tests for different APIs, services, or applications.
          </p>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" />
            Create Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 stagger-children">
          {projects.map((project, idx) => (
            <div
              key={project.id}
              className="card-hover cursor-pointer group"
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={clsx(
                  'w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center',
                  'shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-3',
                  cardGradients[idx % cardGradients.length],
                )}>
                  <FolderKanban className="w-5 h-5 text-white" />
                </div>
                <ArrowRight className="w-4 h-4 text-surface-600 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
              </div>
              <h3 className="text-base font-bold text-white mb-1 group-hover:text-brand-300 transition-colors">{project.name}</h3>
              <p className="text-sm text-surface-500 line-clamp-2 mb-4 min-h-[2.5rem]">
                {project.description || 'No description'}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-surface-600 font-medium">
                <Calendar className="w-3 h-3" />
                {new Date(project.createdAt).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && <CreateProjectModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}

const cardGradients = [
  'from-blue-500 to-cyan-400',
  'from-violet-500 to-purple-400',
  'from-emerald-500 to-teal-400',
  'from-amber-500 to-orange-400',
  'from-rose-500 to-pink-400',
  'from-indigo-500 to-blue-400',
];

/* ── Create Project Modal ── */

function CreateProjectModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: () => api.createProject({ name: name.trim(), description: description.trim() || undefined }),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      navigate(`/projects/${project.id}`);
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

      {/* Modal */}
      <div
        className="relative card w-full max-w-md mx-4 animate-scale-in border-surface-700/40"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header gradient line */}
        <div className="absolute top-0 left-6 right-6 h-[2px] bg-gradient-to-r from-transparent via-brand-500 to-transparent opacity-60" />

        <div className="flex items-center justify-between mb-6 pt-2">
          <div>
            <h2 className="text-lg font-bold text-white">New Project</h2>
            <p className="text-xs text-surface-500">Create a new test project</p>
          </div>
          <button className="btn-ghost p-2 rounded-xl" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return setError('Name is required');
          mutation.mutate();
        }}>
          <div className="space-y-5">
            <div>
              <label htmlFor="project-name" className="label">Project Name</label>
              <input
                id="project-name"
                className="input"
                placeholder="e.g. Payment API Tests"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(null); }}
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="project-desc" className="label">Description <span className="text-surface-600 font-normal">(optional)</span></label>
              <textarea
                id="project-desc"
                className="input resize-none"
                rows={3}
                placeholder="Performance tests for..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="mt-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={mutation.isPending || !name.trim()}>
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
