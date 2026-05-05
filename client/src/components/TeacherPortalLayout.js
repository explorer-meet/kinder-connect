import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import api from '../api/api';
import {
  FaTimes, FaSignOutAlt, FaChevronRight,
  FaHome, FaLightbulb, FaBullhorn, FaClipboardList, FaCamera,
  FaGraduationCap, FaExclamationTriangle, FaCalendarAlt, FaChartBar, FaUser, FaStethoscope,
} from 'react-icons/fa';

const NAV_INLINE = [
  { id: 'home',      label: 'Home',            icon: FaHome,      path: '/teacher/dashboard' },
  { id: 'homework',  label: 'Homework & Notes', icon: FaLightbulb, path: '/teacher/dashboard', state: { section: 'homework' } },
  { id: 'circulars', label: 'School Circulars', icon: FaBullhorn,  path: '/teacher/dashboard', state: { section: 'circulars' } },
  { id: 'profile',   label: 'My Profile',       icon: FaUser,      path: '/teacher/dashboard', state: { section: 'profile' } },
];

const NAV_TOOLS = [
  { id: 'attendance', label: 'Mark Attendance',  icon: FaClipboardList,      path: '/teacher/attendance' },
  { id: 'activity',   label: 'Log Activities',   icon: FaCamera,              path: '/teacher/activity' },
  { id: 'milestones', label: 'Track Milestones', icon: FaGraduationCap,       path: '/teacher/milestones' },
  { id: 'incident',   label: 'Incident Report',  icon: FaExclamationTriangle, path: '/teacher/incident' },
  { id: 'medical',    label: 'Medical Records',  icon: FaStethoscope,         path: '/teacher/medical' },
  { id: 'ptm',        label: 'PTM Management',   icon: FaCalendarAlt,         path: '/teacher/ptm' },
  { id: 'reports',    label: 'Reports',          icon: FaChartBar,            path: '/teacher/reports' },
];

const ICON_STYLES = {
  home: { tone: 'text-blue-500', soft: 'bg-blue-50' },
  homework: { tone: 'text-amber-500', soft: 'bg-amber-50' },
  circulars: { tone: 'text-violet-500', soft: 'bg-violet-50' },
  profile: { tone: 'text-fuchsia-500', soft: 'bg-fuchsia-50' },
  attendance: { tone: 'text-cyan-500', soft: 'bg-cyan-50' },
  activity: { tone: 'text-sky-500', soft: 'bg-sky-50' },
  milestones: { tone: 'text-emerald-500', soft: 'bg-emerald-50' },
  incident: { tone: 'text-rose-500', soft: 'bg-rose-50' },
  medical: { tone: 'text-pink-500', soft: 'bg-pink-50' },
  ptm: { tone: 'text-orange-500', soft: 'bg-orange-50' },
  reports: { tone: 'text-indigo-500', soft: 'bg-indigo-50' },
};

export default function TeacherPortalLayout({ title, children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [branding, setBranding] = useState({ logoUrl: '', primaryColor: '', secondaryColor: '', tagline: '' });
  const navRef = useRef(null);
  const sidebarItemRefs = useRef({});
  const primary = branding?.primaryColor || '#4f46e5';
  const secondary = branding?.secondaryColor || '#7c3aed';
  const logoUrl = branding?.logoUrl || '';
  const tagline = branding?.tagline || 'Teacher Portal';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const currentPath = location.pathname;
  const requestedSection = location.state?.section;
  const activeSidebarId = currentPath === '/teacher/dashboard'
    ? (requestedSection || 'home')
    : NAV_TOOLS.find((item) => currentPath === item.path || currentPath.startsWith(`${item.path}/`))?.id;

  useEffect(() => {
    const nav = navRef.current;
    const activeItem = sidebarItemRefs.current[activeSidebarId];
    if (!nav || !activeItem) return;
    const itemTop = activeItem.offsetTop;
    const itemBottom = itemTop + activeItem.offsetHeight;
    const navTop = nav.scrollTop;
    const navBottom = navTop + nav.clientHeight;
    if (itemTop < navTop) {
      nav.scrollTop = itemTop - 8;
    } else if (itemBottom > navBottom) {
      nav.scrollTop = itemBottom - nav.clientHeight + 8;
    }
  }, [activeSidebarId]);

  useEffect(() => {
    let mounted = true;
    const loadBranding = async () => {
      try {
        const res = await api.get('/branding/me');
        if (mounted) setBranding(res.data || {});
      } catch {
        if (mounted) setBranding({});
      }
    };

    loadBranding();
    return () => {
      mounted = false;
    };
  }, []);

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
        <div className="px-6 py-5 min-h-[176px] shrink-0 flex flex-col justify-between" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              {logoUrl ? (
                <img src={logoUrl} alt="School logo" className="w-9 h-9 rounded-xl object-contain bg-white/90 p-1 border border-white/70" />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white text-xs font-bold border border-white/30">KC</div>
              )}
              <div className="min-w-0">
                <p className="text-white font-bold text-lg leading-tight truncate">Kinder Connect</p>
                <p className="text-indigo-100 text-xs mt-0.5 truncate">{tagline}</p>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white/70 hover:text-white">
              <FaTimes />
            </button>
          </div>
          <div className="rounded-2xl bg-white/14 px-3 py-3 backdrop-blur-sm border border-white/10">
            <div className="flex items-center gap-3 min-w-0">
              {user?.photo ? (
                <img src={user.photo} alt="Teacher profile" className="w-11 h-11 rounded-2xl object-cover border border-white/20 shrink-0 shadow-inner" />
              ) : (
                <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-inner">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-white text-sm font-semibold leading-tight truncate">{user?.firstName} {user?.lastName}</p>
                <p className="text-indigo-100/90 text-xs capitalize mt-1">Teacher</p>
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav ref={navRef} className="flex-1 overflow-y-auto py-4 px-3">
          {NAV_INLINE.map(({ id, label, icon: Icon, path, state }) => {
            const isDashboard = currentPath === '/teacher/dashboard';
            const active = state?.section
              ? isDashboard && requestedSection === state.section
              : isDashboard && !requestedSection && id === 'home';
            const iconTheme = ICON_STYLES[id] || { tone: 'text-gray-500', soft: 'bg-gray-100' };
            return (
              <button
                key={id}
                ref={(element) => {
                  if (element) sidebarItemRefs.current[id] = element;
                }}
                onClick={() => { navigate(path, state ? { state } : undefined); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl mb-1 text-sm font-medium transition-all ${
                  active
                    ? 'text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
                style={active ? { backgroundColor: primary } : {}}
              >
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${active ? 'bg-white/20' : iconTheme.soft}`}>
                  <Icon className={active ? 'text-white' : iconTheme.tone} />
                </span>
                {label}
              </button>
            );
          })}

          <div className="my-3 border-t border-gray-100" />
          <p className="text-[10px] uppercase font-semibold text-gray-400 px-4 mb-2 tracking-wider">Tools</p>

          {NAV_TOOLS.map(({ id, label, icon: Icon, path }) => {
            const active = currentPath === path || currentPath.startsWith(path + '/');
            const iconTheme = ICON_STYLES[id] || { tone: 'text-gray-500', soft: 'bg-gray-100' };
            return (
              <button
                key={id}
                ref={(element) => {
                  if (element) sidebarItemRefs.current[id] = element;
                }}
                onClick={() => { navigate(path); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl mb-1 text-sm font-medium transition-all ${
                  active
                    ? 'text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
                style={active ? { backgroundColor: primary } : {}}
              >
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${active ? 'bg-white/20' : iconTheme.soft}`}>
                  <Icon className={active ? 'text-white' : iconTheme.tone} />
                </span>
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
        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
