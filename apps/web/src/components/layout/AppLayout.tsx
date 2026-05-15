import { Outlet, NavLink, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, Settings, Dog, Zap, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { useEffect, useState } from 'react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, description: 'Overview & metrics' },
  { to: '/projects', label: 'Projects', icon: FolderKanban, description: 'Test projects' },
  { to: '/settings', label: 'Settings', icon: Settings, description: 'Configuration' },
];

export function AppLayout() {
  const location = useLocation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-ambient bg-grid">
      {/* Sidebar */}
      <aside
        className={clsx(
          'w-72 flex-shrink-0 flex flex-col relative z-10',
          'bg-surface-950/80 backdrop-blur-2xl border-r border-surface-800/40',
          mounted ? 'animate-slide-in' : 'opacity-0',
        )}
      >
        {/* Logo area */}
        <Link to="/" className="group flex items-center gap-4 px-6 py-6 border-b border-surface-800/30">
          <div className="relative">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-500 via-brand-600 to-violet-600 flex items-center justify-center shadow-[0_0_25px_-5px_rgba(59,130,246,0.5)] group-hover:shadow-[0_0_35px_-5px_rgba(59,130,246,0.7)] transition-shadow duration-300">
              <Dog className="w-6 h-6 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-surface-950 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">K9</h1>
            <p className="text-[10px] font-semibold text-brand-400/70 uppercase tracking-[0.2em]">
              Performance Testing
            </p>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1.5">
          {navItems.map(({ to, label, icon: Icon, description }) => {
            const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);
            return (
              <NavLink key={to} to={to} end={to === '/'}>
                <div
                  className={clsx(
                    'group relative flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-200',
                    isActive
                      ? 'bg-gradient-to-r from-brand-600/15 to-brand-500/5 text-white'
                      : 'text-surface-500 hover:bg-white/[0.03] hover:text-surface-300',
                  )}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-8 rounded-r-full bg-brand-500 shadow-[0_0_12px_rgba(59,130,246,0.5)]" />
                  )}
                  <div
                    className={clsx(
                      'w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200',
                      isActive
                        ? 'bg-brand-500/20 text-brand-400'
                        : 'bg-surface-800/40 text-surface-500 group-hover:bg-surface-800/60 group-hover:text-surface-400',
                    )}
                  >
                    <Icon className="w-[18px] h-[18px]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={clsx('text-sm font-semibold', isActive ? 'text-white' : '')}>{label}</p>
                    <p className="text-[10px] text-surface-600 truncate">{description}</p>
                  </div>
                  {isActive && <ChevronRight className="w-4 h-4 text-brand-500/50" />}
                </div>
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom Status */}
        <div className="px-5 py-4 border-t border-surface-800/30">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface-900/40">
            <div className="relative">
              <Zap className="w-4 h-4 text-emerald-400" />
              <div className="absolute inset-0 animate-ping">
                <Zap className="w-4 h-4 text-emerald-400 opacity-30" />
              </div>
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-semibold text-surface-300">Local Engine</p>
              <p className="text-[10px] text-emerald-400/70">Running on this machine</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto relative z-10">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
