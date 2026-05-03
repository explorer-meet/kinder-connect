import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import {
  FaBars, FaTimes, FaSignOutAlt, FaChevronRight,
  FaHome, FaLightbulb, FaBullhorn, FaClipboardList, FaCamera,
  FaGraduationCap, FaExclamationTriangle, FaCalendarAlt, FaChartBar,
} from 'react-icons/fa';

const NAV_INLINE = [
  { id: 'home',      label: 'Home',            icon: FaHome,      path: '/teacher/dashboard' },
  { id: 'homework',  label: 'Homework & Notes', icon: FaLightbulb, path: '/teacher/dashboard', state: { section: 'homework' } },
  { id: 'circulars', label: 'School Circulars', icon: FaBullhorn,  path: '/teacher/dashboard', state: { section: 'circulars' } },
];

const NAV_TOOLS = [
  { id: 'attendance', label: 'Mark Attendance',  icon: FaClipboardList,      path: '/teacher/attendance' },
  { id: 'activity',   label: 'Log Activities',   icon: FaCamera,              path: '/teacher/activity' },
  { id: 'milestones', label: 'Track Milestones', icon: FaGraduationCap,       path: '/teacher/milestones' },
  { id: 'incident',   label: 'Incident Report',  icon: FaExclamationTriangle, path: '/teacher/incident' },
  { id: 'ptm',        label: 'PTM Management',   icon: FaCalendarAlt,         path: '/teacher/ptm' },
  { id: 'reports',    label: 'Reports',          icon: FaChartBar,            path: '/teacher/reports' },
];

export default function TeacherPortalLayout({ title, children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const currentPath = location.pathname;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-[280px] bg-white shadow-xl flex flex-col
        transform transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0 lg:shadow-none lg:border-r lg:border-gray-100
      `}>
        {/* Brand */}
        <div className="px-6 py-5 min-h-[176px] bg-gradient-to-br from-indigo-600 to-violet-600 shrink-0 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-bold text-lg leading-tight">Kinder Connect</p>
              <p className="text-indigo-100 text-xs mt-0.5">Teacher Portal</p>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white/70 hover:text-white">
              <FaTimes />
            </button>
          </div>
          <div className="rounded-2xl bg-white/14 px-3 py-3 backdrop-blur-sm border border-white/10">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-inner">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-semibold leading-tight truncate">{user?.firstName} {user?.lastName}</p>
                <p className="text-indigo-100/90 text-xs capitalize mt-1">Teacher</p>
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {NAV_INLINE.map(({ id, label, icon: Icon, path, state }) => {
            const active = currentPath === '/teacher/dashboard' && !state ? true : false;
            // highlight Home when on /teacher/dashboard
            const isHome = id === 'home' && currentPath === '/teacher/dashboard';
            return (
              <button
                key={id}
                onClick={() => { navigate(path, state ? { state } : undefined); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl mb-1 text-sm font-medium transition-all ${
                  isHome
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className={isHome ? 'text-white' : 'text-gray-400'} />
                {label}
              </button>
            );
          })}

          <div className="my-3 border-t border-gray-100" />
          <p className="text-[10px] uppercase font-semibold text-gray-400 px-4 mb-2 tracking-wider">Tools</p>

          {NAV_TOOLS.map(({ id, label, icon: Icon, path }) => {
            const active = currentPath === path || currentPath.startsWith(path + '/');
            return (
              <button
                key={id}
                onClick={() => { navigate(path); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl mb-1 text-sm font-medium transition-all ${
                  active
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className={active ? 'text-white' : 'text-gray-400'} />
                {label}
                {!active && <FaChevronRight className="ml-auto text-gray-300 text-xs" />}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-gray-100">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors">
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-gray-700 p-1">
            <FaBars size={18} />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-gray-800 text-base">{title}</h1>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
