import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { FaBars, FaTimes, FaSignOutAlt, FaSchool, FaInbox } from 'react-icons/fa';

const NAV_ITEMS = [
  { id: 'schools', label: 'Schools', icon: FaSchool },
  { id: 'requests', label: 'Registration Requests', icon: FaInbox },
];

const ICON_STYLES = {
  schools: { tone: 'text-emerald-500', soft: 'bg-emerald-50' },
  requests: { tone: 'text-amber-500', soft: 'bg-amber-50' },
};

export default function SuperAdminPortalLayout({ title, activeSection, onSectionChange, badges = {}, children }) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarItemRefs = useRef({});

  const navRef = useRef(null);

  useEffect(() => {
    const nav = navRef.current;
    const activeItem = sidebarItemRefs.current[activeSection];
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
  }, [activeSection]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`
        fixed inset-y-0 left-0 z-40 w-[280px] bg-white shadow-xl flex flex-col
        transform transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0 lg:shadow-none lg:border-r lg:border-gray-100
      `}
      >
        <div className="px-6 py-5 min-h-[176px] bg-gradient-to-br from-slate-900 to-indigo-700 shrink-0 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-bold text-lg leading-tight">Kinder Connect</p>
              <p className="text-indigo-100 text-xs mt-0.5">Super Admin Portal</p>
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
                <p className="text-indigo-100/90 text-xs capitalize mt-1">Super Admin</p>
              </div>
            </div>
          </div>
        </div>

        <nav ref={navRef} className="flex-1 overflow-y-auto py-4 px-3">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const active = activeSection === id;
            const count = badges[id] || 0;
            const iconTheme = ICON_STYLES[id] || { tone: 'text-gray-500', soft: 'bg-gray-100' };
            return (
              <button
                key={id}
                ref={(element) => {
                  if (element) sidebarItemRefs.current[id] = element;
                }}
                onClick={() => {
                  onSectionChange(id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl mb-1 text-sm font-medium transition-all ${
                  active
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${active ? 'bg-white/20' : iconTheme.soft}`}>
                  <Icon className={active ? 'text-white' : iconTheme.tone} />
                </span>
                <span className="text-left">{label}</span>
                {count > 0 && (
                  <span className={`ml-auto text-xs rounded-full px-2 py-0.5 font-bold ${active ? 'bg-indigo-100 text-indigo-700' : 'bg-indigo-100 text-indigo-700'}`}>
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors">
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-gray-700 p-1">
            <FaBars size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-gray-800 text-base truncate">{title}</h1>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
