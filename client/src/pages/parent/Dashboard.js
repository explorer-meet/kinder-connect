import React, { useRef, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../api/api';
import useAuthStore from '../../store/authStore';
import {
  FaCamera, FaBook, FaClipboardList, FaCalendarAlt,
  FaArrowRight, FaShuttleVan, FaPlus, FaTimes, FaCheck, FaBan,
  FaClock, FaUpload, FaBullhorn, FaChild, FaHome, FaBars, FaSignOutAlt,
  FaChevronRight, FaMapMarkerAlt, FaUser,
} from 'react-icons/fa';

const NAV = [
  { id: 'home',      label: 'Home',            icon: FaHome },
  { id: 'children',  label: 'My Children',     icon: FaChild },
  { id: 'activity',  label: 'Activity Feed',   icon: FaCamera },
  { id: 'attendance',label: 'Attendance',       icon: FaClipboardList },
  { id: 'report',    label: 'Development',      icon: FaBook },
  { id: 'ptm',       label: 'PTM Schedule',     icon: FaCalendarAlt },
  { id: 'pickup',    label: 'Pickup / Drop',    icon: FaShuttleVan },
  { id: 'circulars', label: 'Circulars',        icon: FaBullhorn },
];

const NAV_ICON_STYLES = {
  home: { tone: 'text-blue-500', soft: 'bg-blue-50' },
  activity: { tone: 'text-cyan-500', soft: 'bg-cyan-50' },
  attendance: { tone: 'text-indigo-500', soft: 'bg-indigo-50' },
  report: { tone: 'text-violet-500', soft: 'bg-violet-50' },
  ptm: { tone: 'text-amber-500', soft: 'bg-amber-50' },
  pickup: { tone: 'text-orange-500', soft: 'bg-orange-50' },
  circulars: { tone: 'text-fuchsia-500', soft: 'bg-fuchsia-50' },
};

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

const circularTypeStyle = (type) => {
  const value = String(type || 'general').toLowerCase();
  if (value === 'event') return 'bg-cyan-50 text-cyan-700 border-cyan-100';
  if (value === 'holiday') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  if (value === 'notice') return 'bg-amber-50 text-amber-700 border-amber-100';
  if (value === 'fee') return 'bg-rose-50 text-rose-700 border-rose-100';
  return 'bg-violet-50 text-violet-700 border-violet-100';
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
  const [pendingChildAction, setPendingChildAction] = useState(null);
  const [expandedCircular, setExpandedCircular] = useState(null);

  const [showPickupForm, setShowPickupForm] = useState(false);
  const [pickupForm, setPickupForm] = useState({ studentId: '', personName: '', mobileNumber: '', photoUrl: '' });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef(null);

  const [ptmSlots, setPtmSlots] = useState([]);
  const [ptmRequests, setPtmRequests] = useState([]);
  const [loadingPtm, setLoadingPtm] = useState(false);
  const [showPtmRequestForm, setShowPtmRequestForm] = useState(false);
  const [submittingPtmRequest, setSubmittingPtmRequest] = useState(false);
  const [ptmRequestForm, setPtmRequestForm] = useState({ studentId: '', preferredDate: '', requestNotes: '' });

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
      if (CHILD_ACTIONS[requestedSection]) {
        setPendingChildAction(requestedSection);
        return;
      }
      setActiveSection(requestedSection);
      if (requestedSection === 'ptm') {
        loadPtmData();
      }
    }
  }, [location.state]);

  useEffect(() => {
    if (!pendingChildAction || loading) return;
    handleChildAction(pendingChildAction);
    setPendingChildAction(null);
  }, [pendingChildAction, loading]);

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

  const fetchPtmSlots = async () => {
    try {
      const res = await api.get('/parent/ptm/slots');
      setPtmSlots(res.data || []);
    } catch {
      setPtmSlots([]);
    }
  };

  const fetchPtmRequests = async () => {
    try {
      const res = await api.get('/parent/ptm/requests');
      setPtmRequests(res.data || []);
    } catch {
      setPtmRequests([]);
    }
  };

  const loadPtmData = async () => {
    setLoadingPtm(true);
    try {
      await Promise.all([fetchPtmSlots(), fetchPtmRequests()]);
    } finally {
      setLoadingPtm(false);
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
      setActiveSection('ptm');
      loadPtmData();
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

  const handlePtmRequestSubmit = async (e) => {
    e.preventDefault();
    if (!ptmRequestForm.studentId) {
      showToast('error', 'Please select a child for the PTM request.');
      return;
    }

    setSubmittingPtmRequest(true);
    try {
      await api.post('/parent/ptm/request', ptmRequestForm);
      showToast('success', 'PTM request sent to school admin for approval.');
      setPtmRequestForm({ studentId: '', preferredDate: '', requestNotes: '' });
      setShowPtmRequestForm(false);
      loadPtmData();
    } catch (err) {
      showToast('error', err.response?.data?.error || 'Unable to submit PTM request');
    } finally {
      setSubmittingPtmRequest(false);
    }
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
          const iconTheme = NAV_ICON_STYLES[id] || { tone: 'text-gray-500', soft: 'bg-gray-100' };
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
              <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${active ? 'bg-white/20' : iconTheme.soft}`}>
                <Icon className={active ? 'text-white' : iconTheme.tone} />
              </span>
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
          { label: 'Children', value: children.length, color: 'bg-blue-50 border-blue-100', text: 'text-blue-700', icon: FaChild, onClick: () => go('children') },
          { label: 'Circulars', value: circulars.length, color: 'bg-violet-50 border-violet-100', text: 'text-violet-700', icon: FaBullhorn, onClick: () => go('circulars') },
          { label: 'Pending Pickups', value: pendingPickups, color: 'bg-amber-50 border-amber-100', text: 'text-amber-700', icon: FaShuttleVan, onClick: () => go('pickup') },
          { label: 'Total Requests', value: pickupRequests.length, color: 'bg-emerald-50 border-emerald-100', text: 'text-emerald-700', icon: FaCalendarAlt, onClick: () => go('pickup') },
        ].map(({ label, value, color, text, icon: Icon, onClick }) => (
          <button
            key={label}
            type="button"
            onClick={onClick}
            className={`rounded-2xl border p-4 text-left transition-all hover:shadow-sm hover:-translate-y-0.5 ${color}`}
          >
            <div className={`text-2xl font-bold ${text}`}>{value}</div>
            <div className="flex items-center gap-1.5 mt-1">
              <Icon className={`text-xs ${text}`} />
              <span className={`text-xs font-medium ${text}`}>{label}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h3 className="font-semibold text-gray-700 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {[
            { label: 'Activity Feed', icon: FaCamera, section: 'activity', color: 'from-blue-400 to-blue-600' },
            { label: 'Development', icon: FaBook, section: 'report', color: 'from-violet-400 to-violet-600' },
            { label: 'Attendance', icon: FaClipboardList, section: 'attendance', color: 'from-emerald-400 to-emerald-600' },
            { label: 'PTM Schedule', icon: FaCalendarAlt, section: 'ptm', color: 'from-amber-400 to-orange-500' },
          ].map(({ label, icon: Icon, section, color }) => (
            <button key={label} onClick={() => go(section)} className={`rounded-2xl bg-gradient-to-br ${color} text-white p-5 min-h-[120px] flex flex-col items-start justify-between text-left shadow hover:shadow-lg hover:scale-[1.02] transition-all`}>
              <span className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center">
                <Icon className="text-xl" />
              </span>
              <span className="text-sm font-semibold leading-snug">{label}</span>
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
            const publishedOn = new Date(c.publishDate || c.createdAt);
            return (
              <div key={c.id} className="bg-white rounded-2xl border border-violet-100 shadow-sm px-5 py-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shrink-0 mt-0.5 shadow">
                    <FaBullhorn className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[11px] border px-2.5 py-1 rounded-full font-semibold uppercase tracking-wide ${circularTypeStyle(c.circularType)}`}>
                        {c.circularType || 'general'}
                      </span>
                      <span className="text-[11px] text-gray-400">School-wide</span>
                      <span className="text-[11px] text-gray-400 ml-auto">Published: {publishedOn.toLocaleDateString()}</span>
                    </div>

                    <p className="font-semibold text-gray-800 mt-2">{c.title}</p>
                    <p className={`text-sm text-gray-600 mt-1 leading-6 ${isExpanded ? 'whitespace-pre-wrap' : 'line-clamp-3'}`}>
                      {c.description}
                    </p>

                    {c.content && isExpanded && (
                      <div className="mt-3 rounded-xl bg-gray-50 border border-gray-100 p-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Detailed Circular</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-6">{c.content}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <button
                        onClick={() => setExpandedCircular(isExpanded ? null : c.id)}
                        className="text-xs text-indigo-600 hover:underline ml-auto font-semibold"
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

  const ptmStatusColors = {
    scheduled: 'bg-blue-100 text-blue-700',
    completed: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  const renderPtm = () => {
    const approvedRequests = ptmRequests
      .filter((request) => request.status === 'approved' && request.meetingDate)
      .map((request) => ({
        slotId: request.id,
        sessionDate: request.meetingDate,
        startTime: request.startTime,
        endTime: request.endTime,
        status: request.status,
        studentName: request.studentName,
        teacherName: request.teacherName,
        location: request.location,
        notes: request.adminNotes || request.requestNotes,
      }));
    const pendingRequests = ptmRequests.filter((request) => request.status === 'pending');
    const rejectedRequests = ptmRequests.filter((request) => request.status === 'rejected');
    const scheduledMeetings = [...ptmSlots, ...approvedRequests];
    const now = new Date();
    const upcoming = scheduledMeetings.filter((s) => s.status !== 'cancelled' && new Date(s.sessionDate) >= now);
    const past = scheduledMeetings.filter((s) => s.status === 'completed' || new Date(s.sessionDate) < now);

    const SlotCard = ({ slot }) => (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex gap-4 items-start">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
          <FaCalendarAlt className="text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="font-semibold text-gray-800">
              {new Date(slot.sessionDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${ptmStatusColors[slot.status] || 'bg-gray-100 text-gray-600'}`}>
              {slot.status}
            </span>
          </div>
          <div className="flex items-center gap-1 text-sm text-amber-600 mt-1">
            <FaClock size={11} />
            <span>{slot.startTime} - {slot.endTime}</span>
          </div>
          <div className="flex flex-wrap gap-3 mt-2">
            {slot.studentName && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <FaChild size={10} /> {slot.studentName}
              </span>
            )}
            {slot.teacherName && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <FaUser size={10} /> {slot.teacherName}
              </span>
            )}
            {slot.location && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <FaMapMarkerAlt size={10} /> {slot.location}
              </span>
            )}
          </div>
          {slot.notes && <p className="text-xs text-gray-400 italic mt-1">{slot.notes}</p>}
        </div>
      </div>
    );

    return (
      <div className="space-y-6 w-full">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FaCalendarAlt className="text-amber-500" /> PTM Schedule
          </h2>
          <button onClick={() => setShowPtmRequestForm((value) => !value)} className="btn btn-primary btn-sm flex items-center gap-2">
            {showPtmRequestForm ? <FaTimes size={12} /> : <FaPlus size={12} />}
            {showPtmRequestForm ? 'Cancel' : 'Request PTM'}
          </button>
        </div>

        {showPtmRequestForm && (
          <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5 space-y-4">
            <p className="font-semibold text-gray-800">Request a PTM</p>
            <form onSubmit={handlePtmRequestSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <select className="input" value={ptmRequestForm.studentId} onChange={(e) => setPtmRequestForm((prev) => ({ ...prev, studentId: e.target.value }))} required>
                <option value="">Select Child</option>
                {children.map((child) => (
                  <option key={child.id} value={child.id}>{child.firstName} {child.lastName}</option>
                ))}
              </select>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Preferred Date (optional)</label>
                <input className="input w-full" type="date" value={ptmRequestForm.preferredDate} onChange={(e) => setPtmRequestForm((prev) => ({ ...prev, preferredDate: e.target.value }))} />
              </div>
              <textarea className="input md:col-span-2 resize-none" rows={3} placeholder="Tell the school what you want to discuss or your preferred timing" value={ptmRequestForm.requestNotes} onChange={(e) => setPtmRequestForm((prev) => ({ ...prev, requestNotes: e.target.value }))} />
              <button type="submit" disabled={submittingPtmRequest} className="btn btn-primary w-full md:w-auto flex items-center gap-2">
                {submittingPtmRequest ? <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <FaCalendarAlt />}
                {submittingPtmRequest ? 'Sending…' : 'Send Request'}
              </button>
            </form>
          </div>
        )}

        {loadingPtm ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400" /></div>
        ) : scheduledMeetings.length === 0 && ptmRequests.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
            <FaCalendarAlt className="mx-auto text-4xl text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm">No PTM meetings scheduled yet.</p>
            <p className="text-gray-300 text-xs mt-1">Request a PTM or wait for the school to approve and schedule one here.</p>
          </div>
        ) : (
          <>
            {pendingRequests.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Pending Requests ({pendingRequests.length})
                </p>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  {pendingRequests.map((request) => (
                    <div key={request.id} className="bg-white rounded-2xl border border-amber-100 shadow-sm p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-gray-800">{request.studentName}</p>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">pending</span>
                      </div>
                      {request.preferredDate && <p className="text-sm text-gray-500 mt-1">Preferred Date: {new Date(request.preferredDate).toLocaleDateString('en-IN')}</p>}
                      {request.requestNotes && <p className="text-sm text-gray-600 mt-2">{request.requestNotes}</p>}
                      <p className="text-xs text-gray-400 mt-2">Requested on {new Date(request.createdAt).toLocaleDateString('en-IN')}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {upcoming.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Upcoming ({upcoming.length})
                </p>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  {upcoming.map((s) => <SlotCard key={s.slotId} slot={s} />)}
                </div>
              </div>
            )}
            {past.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Past / Completed ({past.length})
                </p>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 opacity-70">
                  {past.map((s) => <SlotCard key={s.slotId} slot={s} />)}
                </div>
              </div>
            )}

            {rejectedRequests.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Rejected Requests ({rejectedRequests.length})
                </p>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  {rejectedRequests.map((request) => (
                    <div key={request.id} className="bg-white rounded-2xl border border-red-100 shadow-sm p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-gray-800">{request.studentName}</p>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">rejected</span>
                      </div>
                      {request.adminNotes && <p className="text-sm text-gray-600 mt-2">{request.adminNotes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const renderSection = () => {
    if (activeSection === 'home') return renderHome();
    if (activeSection === 'children') return renderChildren();
    if (activeSection === 'pickup') return renderPickup();
    if (activeSection === 'circulars') return renderCirculars();
    if (activeSection === 'ptm') return renderPtm();
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
