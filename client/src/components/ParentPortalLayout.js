import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import {
  FaBars,
  FaBook,
  FaBullhorn,
  FaCalendarAlt,
  FaChartPie,
  FaChevronRight,
  FaChild,
  FaClipboardList,
  FaHome,
  FaSignOutAlt,
  FaShuttleVan,
  FaTimes,
} from 'react-icons/fa';

const NAV_ITEMS = [
  { label: 'Home', to: '/parent/dashboard', state: { section: 'home' }, icon: FaHome, match: ['/parent/dashboard'], matchSection: 'home' },
  { label: 'My Children', to: '/parent/dashboard', state: { section: 'children' }, icon: FaChild, match: ['/parent/child/'], matchSection: 'children' },
  { label: 'Activity Feed', to: '/parent/dashboard', state: { section: 'activity' }, icon: FaChartPie, match: ['/parent/feed/'], matchSection: 'activity' },
  { label: 'Attendance', to: '/parent/dashboard', state: { section: 'attendance' }, icon: FaClipboardList, match: ['/parent/attendance/'], matchSection: 'attendance' },
  { label: 'Development', to: '/parent/dashboard', state: { section: 'report' }, icon: FaBook, match: ['/parent/report/'], matchSection: 'report' },
  { label: 'Book PTM', to: '/parent/ptm', icon: FaCalendarAlt, match: ['/parent/ptm'] },
  { label: 'Pickup / Drop', to: '/parent/dashboard', state: { section: 'pickup' }, icon: FaShuttleVan, match: [], matchSection: 'pickup' },
  { label: 'Circulars', to: '/parent/dashboard', state: { section: 'circulars' }, icon: FaBullhorn, match: [], matchSection: 'circulars' },
];

const ACCENTS = {
  blue: {
    shell: 'from-blue-600 to-cyan-600',
    soft: 'bg-blue-50 border-blue-100 text-blue-700',
    button: 'bg-blue-600 hover:bg-blue-700 text-white',
    active: 'bg-blue-600 text-white shadow-blue-200',
  },
  emerald: {
    shell: 'from-emerald-600 to-teal-600',
    soft: 'bg-emerald-50 border-emerald-100 text-emerald-700',
    button: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    active: 'bg-emerald-600 text-white shadow-emerald-200',
  },
  violet: {
    shell: 'from-violet-600 to-fuchsia-600',
    soft: 'bg-violet-50 border-violet-100 text-violet-700',
    button: 'bg-violet-600 hover:bg-violet-700 text-white',
    active: 'bg-violet-600 text-white shadow-violet-200',
  },
  amber: {
    shell: 'from-amber-500 to-orange-500',
    soft: 'bg-amber-50 border-amber-100 text-amber-700',
    button: 'bg-amber-500 hover:bg-amber-600 text-white',
    active: 'bg-amber-500 text-white shadow-amber-200',
  },
  rose: {
    shell: 'from-rose-500 to-pink-600',
    soft: 'bg-rose-50 border-rose-100 text-rose-700',
    button: 'bg-rose-600 hover:bg-rose-700 text-white',
    active: 'bg-rose-600 text-white shadow-rose-200',
  },
};

export default function ParentPortalLayout({ title, subtitle, accent = 'blue', rightAction, children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const theme = ACCENTS[accent] || ACCENTS.blue;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const currentDashboardSection = location.pathname === '/parent/dashboard' ? location.state?.section || 'home' : null;

  const isActive = (item) => {
    if (item.match.some((prefix) => location.pathname.startsWith(prefix))) {
      return true;
    }
    if (location.pathname === '/parent/dashboard' && item.matchSection) {
      return currentDashboardSection === item.matchSection;
    }
    return false;
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-slate-950/45 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[280px] bg-white shadow-xl flex flex-col transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:relative lg:translate-x-0 lg:shadow-none lg:border-r lg:border-slate-200`}
      >
        <div className={`px-6 py-5 min-h-[176px] bg-gradient-to-br ${theme.shell} shrink-0 flex flex-col justify-between`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-bold text-lg leading-tight">Kinder Connect</p>
              <p className="text-white/75 text-xs mt-0.5">Parent Portal</p>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white/75 hover:text-white">
              <FaTimes />
            </button>
          </div>

          <div className="rounded-2xl bg-white/14 px-3 py-3 backdrop-blur-sm border border-white/10">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-inner">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              <div className="min-w-0">
                <p className="text-white font-semibold text-sm truncate">{user?.firstName} {user?.lastName}</p>
                <p className="text-white/80 text-xs capitalize mt-1">{user?.role?.replace('_', ' ')}</p>
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV_ITEMS.map(({ label, to, state, icon: Icon, match, matchSection }) => {
            const active = isActive({ match, matchSection });
            return (
              <Link
                key={`${label}-${to}`}
                to={to}
                state={state}
                onClick={() => setSidebarOpen(false)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl mb-1 text-sm font-medium transition-all ${
                  active ? `${theme.active} shadow-md` : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={active ? 'text-white' : 'text-slate-400'} />
                <span className="flex-1">{label}</span>
                {!active && <FaChevronRight className="text-xs text-slate-300" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white/95 backdrop-blur border-b border-slate-200 px-4 py-3 flex items-center gap-3 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-500 hover:text-slate-700 p-1">
            <FaBars size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-slate-900 text-base sm:text-lg truncate">{title}</h1>
            {subtitle && <p className="text-xs sm:text-sm text-slate-500 truncate mt-0.5">{subtitle}</p>}
          </div>
          {rightAction && (
            <button
              onClick={rightAction.onClick}
              className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${theme.button}`}
            >
              {rightAction.label}
            </button>
          )}
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className={`rounded-3xl border px-5 py-5 mb-5 ${theme.soft}`}>
            <p className="text-lg font-bold">{title}</p>
            {subtitle && <p className="text-sm mt-1 opacity-90">{subtitle}</p>}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}