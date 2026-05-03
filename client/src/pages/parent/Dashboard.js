import React, { useRef, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../api/api';
import useAuthStore from '../../store/authStore';
import {
  FaCamera, FaBook, FaClipboardList, FaCalendarAlt,
  FaArrowRight, FaShuttleVan, FaPlus, FaTimes, FaCheck, FaBan,
  FaClock, FaUpload, FaBullhorn, FaChild, FaHome, FaBars, FaSignOutAlt,
  FaChevronRight,
} from 'react-icons/fa';

const NAV = [
  { id: 'home',      label: 'Home',            icon: FaHome },
  { id: 'children',  label: 'My Children',     icon: FaChild },
  { id: 'activity',  label: 'Activity Feed',   icon: FaCamera },
  { id: 'attendance',label: 'Attendance',       icon: FaClipboardList },
  { id: 'report',    label: 'Development',      icon: FaBook },
  { id: 'ptm',       label: 'Book PTM',         icon: FaCalendarAlt },
  { id: 'pickup',    label: 'Pickup / Drop',    icon: FaShuttleVan },
  { id: 'circulars', label: 'Circulars',        icon: FaBullhorn },
];

const AVATAR_COLORS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-500',
];

const statusBadge = (status) => {
  if (status === 'approved') return 'bg-emerald-100 text-emerald-700';
  if (status === 'rejected') return 'bg-red-100 text-red-700';
  return 'bg-amber-100 text-amber-700';
};

const CHILD_ACTIONS = {
  activity: {
    label: 'Activity Feed',
    getPath: (childId) => `/parent/feed/${childId}`,
  },
  attendance: {
    label: 'Attendance',
    getPath: (childId) => `/parent/attendance/${childId}`,
  },
  report: {
    label: 'Development Report',
    getPath: (childId) => `/parent/report/${childId}`,
  },
};

export default function ParentDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [activeSection, setActiveSection] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [circulars, setCirculars] = useState([]);
  const [pickupRequests, setPickupRequests] = useState([]);
  const [toast, setToast] = useState(null);
  const [childPickerAction, setChildPickerAction] = useState(null);
  const [expandedCircular, setExpandedCircular] = useState(null);

  const [showPickupForm, setShowPickupForm] = useState(false);
  const [pickupForm, setPickupForm] = useState({ studentId: '', personName: '', mobileNumber: '', photoUrl: '' });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef(null);

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    Promise.all([fetchChildren(), fetchCirculars(), fetchPickupRequests()]);
  }, []);

  useEffect(() => {
    const requestedSection = location.state?.section;
    if (requestedSection && NAV.some((item) => item.id === requestedSection)) {
      setActiveSection(requestedSection);
    }
  }, [location.state]);

  const fetchChildren = async () => {
    try {
      setLoading(true);
      const res = await api.get('/students/parent/my-children');
      setChildren(res.data || []);
    } catch {
      setChildren([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCirculars = async () => {
    try {
      const res = await api.get('/schooladmin/circulars/feed');
      setCirculars(res.data || []);
    } catch {
      setCirculars([]);
    }
  };

  const fetchPickupRequests = async () => {
    try {
      const res = await api.get('/parent/pickup-requests');
      setPickupRequests(res.data || []);
    } catch {
      setPickupRequests([]);
    }
  };

  const handlePickupPhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('name', file.name);
      const res = await api.post('/upload/document', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setPickupForm((p) => ({ ...p, photoUrl: res.data.url }));
    } catch {
      showToast('error', 'Photo upload failed');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePickupSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/parent/pickup-request', pickupForm);
      showToast('success', 'Request submitted — awaiting school approval.');
      setShowPickupForm(false);
      setPickupForm({ studentId: '', personName: '', mobileNumber: '', photoUrl: '' });
      fetchPickupRequests();
    } catch (err) {
      showToast('error', err.response?.data?.error || 'Could not submit request');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const go = (section) => {
    if (CHILD_ACTIONS[section]) {
      handleChildAction(section);
      return;
    }
    if (section === 'ptm') {
      setSidebarOpen(false);
      navigate('/parent/ptm');
      return;
    }
    setActiveSection(section);
    setSidebarOpen(false);
  };

  const handleChildAction = (actionKey) => {
    const action = CHILD_ACTIONS[actionKey];
    if (!action) return;
    if (loading) {
      showToast('error', 'Children are still loading. Please try again.');
      return;
    }
    if (children.length === 0) {
      showToast('error', 'No child enrolled yet.');
      return;
    }
    if (children.length === 1) {
      navigate(action.getPath(children[0].id));
      setSidebarOpen(false);
      return;
    }
    setChildPickerAction(actionKey);
    setSidebarOpen(false);
  };

  const handleChildPick = (childId) => {
    const action = childPickerAction ? CHILD_ACTIONS[childPickerAction] : null;
    if (!action) return;
    setChildPickerAction(null);
    navigate(action.getPath(childId));
  };

  const pendingPickups = pickupRequests.filter((r) => r.status === 'pending').length;

  // ── Sidebar ────────────────────────────────────────────────────────────────
  const Sidebar = () => (
    <aside className={`
      fixed inset-y-0 left-0 z-40 w-[280px] bg-white shadow-xl flex flex-col
      transform transition-transform duration-300
      ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      lg:relative lg:translate-x-0 lg:shadow-none lg:border-r lg:border-gray-100
    `}>
      {/* Brand */}
      <div className="px-6 py-5 min-h-[176px] bg-gradient-to-br from-blue-600 to-cyan-600 shrink-0 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-bold text-lg leading-tight">Kinder Connect</p>
            <p className="text-blue-100 text-xs mt-0.5">Parent Portal</p>
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
              <p className="text-blue-100/90 text-xs capitalize mt-1">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {NAV.map(({ id, label, icon: Icon }) => {
          const active = activeSection === id;
          return (
            <button
              key={id}
              onClick={() => go(id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl mb-1 text-sm font-medium transition-all ${
                active
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon className={active ? 'text-white' : 'text-gray-400'} />
              {label}
              {id === 'pickup' && pendingPickups > 0 && (
                <span className="ml-auto bg-amber-400 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">{pendingPickups}</span>
              )}
              {id === 'circulars' && circulars.length > 0 && (
                <span className="ml-auto bg-blue-200 text-blue-800 text-xs rounded-full px-1.5 py-0.5 font-semibold">{circulars.length}</span>
              )}
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
  );

  // ── Section renderers ──────────────────────────────────────────────────────
  const renderHome = () => (
    <div className="space-y-6">
      {/* Hero greeting */}
      <div className="rounded-2xl bg-gradient-to-br from-blue-600 via-blue-500 to-violet-600 p-6 text-white relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/10 rounded-full" />
        <div className="absolute -right-2 bottom-0 w-24 h-24 bg-white/5 rounded-full" />
        <p className="text-blue-100 text-sm mb-1">Good day,</p>
        <h2 className="text-2xl font-bold mb-1">{user?.firstName} {user?.lastName} 👋</h2>
        <p className="text-blue-100 text-sm">Here's your family overview for today.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Children', value: children.length, color: 'bg-blue-50 border-blue-100', text: 'text-blue-700', icon: FaChild },
          { label: 'Circulars', value: circulars.length, color: 'bg-violet-50 border-violet-100', text: 'text-violet-700', icon: FaBullhorn },
          { label: 'Pending Pickups', value: pendingPickups, color: 'bg-amber-50 border-amber-100', text: 'text-amber-700', icon: FaShuttleVan },
          { label: 'Total Requests', value: pickupRequests.length, color: 'bg-emerald-50 border-emerald-100', text: 'text-emerald-700', icon: FaCalendarAlt },
        ].map(({ label, value, color, text, icon: Icon }) => (
          <div key={label} className={`rounded-2xl border p-4 ${color}`}>
            <div className={`text-2xl font-bold ${text}`}>{value}</div>
            <div className="flex items-center gap-1.5 mt-1">
              <Icon className={`text-xs ${text}`} />
              <span className={`text-xs font-medium ${text}`}>{label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h3 className="font-semibold text-gray-700 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
          {[
            { label: 'Activity Feed', icon: FaCamera, section: 'activity', color: 'from-blue-400 to-blue-600' },
            { label: 'Development', icon: FaBook, section: 'report', color: 'from-violet-400 to-violet-600' },
            { label: 'Attendance', icon: FaClipboardList, section: 'attendance', color: 'from-emerald-400 to-emerald-600' },
            { label: 'Book PTM', icon: FaCalendarAlt, section: 'ptm', color: 'from-amber-400 to-orange-500' },
          ].map(({ label, icon: Icon, section, color }) => (
            <button key={label} onClick={() => go(section)} className={`rounded-2xl bg-gradient-to-br ${color} text-white p-4 flex flex-col items-center gap-2 shadow hover:shadow-lg hover:scale-105 transition-all`}>
              <Icon className="text-2xl" />
              <span className="text-xs font-semibold text-center">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {!loading && children.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center">
          <FaChild className="mx-auto text-4xl text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No children enrolled yet</p>
          <p className="text-xs text-gray-400 mt-1">Ask your school admin to enroll your child to unlock child-specific actions.</p>
        </div>
      )}

      {/* Latest circular preview */}
      {circulars.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2"><FaBullhorn className="text-violet-500" /> Latest Circular</h3>
            <button onClick={() => go('circulars')} className="text-xs text-blue-500 hover:underline flex items-center gap-1">All <FaChevronRight size={10} /></button>
          </div>
          <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4">
            <p className="font-semibold text-gray-800">{circulars[0].title}</p>
            <p className="text-sm text-gray-600 mt-1">{circulars[0].description}</p>
            <p className="text-xs text-gray-400 mt-2">{new Date(circulars[0].publishDate || circulars[0].createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      )}
    </div>
  );

  const renderChildren = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><FaChild className="text-blue-500" /> My Children</h2>
      {loading ? (
        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>
      ) : children.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
          <FaChild className="mx-auto text-5xl text-gray-200 mb-4" />
          <p className="text-gray-500">No children enrolled yet.</p>
          <p className="text-xs text-gray-400 mt-1">Ask your school admin to enroll your child.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {children.map((child, i) => (
            <div key={child.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-white text-xl font-bold shadow-md`}>
                  {child.firstName[0]}{child.lastName[0]}
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-800">{child.firstName} {child.lastName}</p>
                  <p className="text-sm text-gray-500">{child.class?.name}{child.class?.section ? ` — Section ${child.class.section}` : ''}</p>
                  <p className="text-xs text-gray-400">{child.school?.name}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => navigate(`/parent/feed/${child.id}`)} className="btn btn-primary btn-sm flex items-center justify-center gap-2"><FaCamera /> Activity Feed</button>
                <button onClick={() => navigate(`/parent/attendance/${child.id}`)} className="btn btn-outline btn-sm flex items-center justify-center gap-2"><FaClipboardList /> Attendance</button>
                <button onClick={() => navigate(`/parent/report/${child.id}`)} className="btn btn-outline btn-sm flex items-center justify-center gap-2"><FaBook /> Report</button>
                <button onClick={() => navigate(`/parent/child/${child.id}`)} className="btn btn-outline btn-sm flex items-center justify-center gap-2">Profile <FaArrowRight size={10} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderPickup = () => (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><FaShuttleVan className="text-amber-500" /> Pickup / Drop Requests</h2>
        {!showPickupForm && (
          <button onClick={() => setShowPickupForm(true)} className="btn btn-primary btn-sm flex items-center gap-2"><FaPlus /> New Request</button>
        )}
      </div>

      {showPickupForm && (
        <div className="bg-white border border-blue-100 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-gray-800">Request Alternative Pickup / Drop</p>
            <button onClick={() => setShowPickupForm(false)} className="text-gray-400 hover:text-gray-600"><FaTimes /></button>
          </div>
          <div className="bg-blue-50 rounded-xl px-4 py-3 text-xs text-blue-700">
            By default, Father / Mother / Legal Guardian are authorised. Use this only when someone else needs to pick up or drop your child. School admin must approve first.
          </div>
          <form onSubmit={handlePickupSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <select className="input md:col-span-2" value={pickupForm.studentId} onChange={(e) => setPickupForm({ ...pickupForm, studentId: e.target.value })} required>
              <option value="">Select Child</option>
              {children.map((c) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
            </select>
            <input className="input" placeholder="Pickup person's full name *" value={pickupForm.personName} onChange={(e) => setPickupForm({ ...pickupForm, personName: e.target.value })} required />
            <input className="input" placeholder="Mobile number *" value={pickupForm.mobileNumber} onChange={(e) => setPickupForm({ ...pickupForm, mobileNumber: e.target.value })} required />
            <div className="md:col-span-2 flex items-center gap-3">
              <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePickupPhotoUpload} />
              <button type="button" onClick={() => photoInputRef.current?.click()} disabled={uploadingPhoto} className="btn btn-outline btn-sm flex items-center gap-2">
                {uploadingPhoto ? <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" /> : <FaUpload />}
                {pickupForm.photoUrl ? 'Change Photo' : 'Upload Person Photo'}
              </button>
              {pickupForm.photoUrl && <a href={pickupForm.photoUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline">Preview Photo</a>}
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" className="btn btn-primary flex items-center gap-2"><FaShuttleVan /> Submit Request</button>
              <button type="button" onClick={() => setShowPickupForm(false)} className="btn btn-outline">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {pickupRequests.length === 0 && !showPickupForm ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
          <FaShuttleVan className="mx-auto text-4xl text-gray-200 mb-3" />
          <p className="text-gray-500 font-medium">No pickup requests yet</p>
          <button onClick={() => setShowPickupForm(true)} className="btn btn-outline btn-sm mt-4 mx-auto flex items-center gap-2"><FaPlus /> Request Pickup</button>
        </div>
      ) : (
        <div className="space-y-3">
          {pickupRequests.map((req) => (
            <div key={req.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <FaShuttleVan className="text-amber-500" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{req.student?.firstName} {req.student?.lastName}</p>
                  <p className="text-sm text-gray-600">→ {req.personName} · {req.mobileNumber}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(req.createdAt).toLocaleString()}</p>
                </div>
              </div>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap ${statusBadge(req.status)}`}>
                {req.status === 'approved' ? <FaCheck /> : req.status === 'rejected' ? <FaBan /> : <FaClock />}
                {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderCirculars = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><FaBullhorn className="text-violet-500" /> School Circulars</h2>
      {circulars.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
          <FaBullhorn className="mx-auto text-4xl text-gray-200 mb-3" />
          <p className="text-gray-500">No circulars yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {circulars.map((c) => {
            const isExpanded = expandedCircular === c.id;
            return (
              <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0 mt-0.5">
                    <FaBullhorn className="text-violet-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800">{c.title}</p>
                    <p className={`text-sm text-gray-600 mt-1 ${isExpanded ? 'whitespace-pre-wrap' : 'line-clamp-3'}`}>
                      {c.description}
                    </p>
                    {c.content && isExpanded && (
                      <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap border-t border-gray-100 pt-2">{c.content}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="text-xs bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full font-medium capitalize">{c.circularType || 'general'}</span>
                      <span className="text-xs text-gray-400">{new Date(c.publishDate || c.createdAt).toLocaleDateString()}</span>
                      <button
                        onClick={() => setExpandedCircular(isExpanded ? null : c.id)}
                        className="text-xs text-blue-500 hover:underline ml-auto"
                      >
                        {isExpanded ? 'Show less' : 'Read more'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderSection = () => {
    if (activeSection === 'home') return renderHome();
    if (activeSection === 'children') return renderChildren();
    if (activeSection === 'pickup') return renderPickup();
    if (activeSection === 'circulars') return renderCirculars();
    return null;
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {childPickerAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4">
          <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-gray-100">
              <div>
                <p className="text-lg font-bold text-gray-900">Select a Child</p>
                <p className="text-sm text-gray-500 mt-1">Choose which child you want to open for {CHILD_ACTIONS[childPickerAction]?.label.toLowerCase()}.</p>
              </div>
              <button onClick={() => setChildPickerAction(null)} className="text-gray-400 hover:text-gray-600">
                <FaTimes />
              </button>
            </div>
            <div className="p-4 sm:p-6 space-y-3 max-h-[70vh] overflow-y-auto">
              {children.map((child, index) => (
                <button
                  key={child.id}
                  onClick={() => handleChildPick(child.id)}
                  className="w-full rounded-2xl border border-gray-100 px-4 py-4 flex items-center gap-4 text-left hover:border-blue-200 hover:bg-blue-50 transition"
                >
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${AVATAR_COLORS[index % AVATAR_COLORS.length]} flex items-center justify-center text-white text-lg font-bold shadow-md`}>
                    {child.firstName[0]}{child.lastName[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-800 truncate">{child.firstName} {child.lastName}</p>
                    <p className="text-sm text-gray-500 truncate">{child.class?.name}{child.class?.section ? ` · ${child.class.section}` : ''}</p>
                    <p className="text-xs text-gray-400 truncate">{child.school?.name}</p>
                  </div>
                  <FaChevronRight className="text-gray-300" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <Sidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-gray-700 p-1">
            <FaBars size={18} />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-gray-800 text-base capitalize">{NAV.find((n) => n.id === activeSection)?.label || 'Dashboard'}</h1>
          </div>
          <div className="flex items-center gap-3">
            {pendingPickups > 0 && (
              <button onClick={() => go('pickup')} className="relative text-amber-500 hover:text-amber-600">
                <FaShuttleVan size={18} />
                <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">{pendingPickups}</span>
              </button>
            )}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
          </div>
        </header>

        {/* Toast */}
        {toast && (
          <div className={`mx-4 mt-3 px-4 py-3 rounded-xl text-sm font-medium flex items-center justify-between gap-3 shrink-0 ${toast.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}>
            {toast.text}
            <button onClick={() => setToast(null)}><FaTimes size={12} /></button>
          </div>
        )}

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {renderSection()}
        </main>
      </div>
    </div>
  );
}
