import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../api/api';
import useAuthStore from '../../store/authStore';
import {
  FaHome, FaClipboardList, FaUsers, FaBullhorn, FaCalendarAlt,
  FaExclamationTriangle, FaChartBar, FaTimes, FaSignOutAlt,
  FaChevronRight, FaCamera, FaGraduationCap, FaPlus, FaPaperPlane,
  FaLightbulb, FaCheckCircle, FaUser, FaSave, FaKey, FaUpload, FaStethoscope,
} from 'react-icons/fa';

const NAV = [
  { id: 'home',      label: 'Home',            icon: FaHome,      inline: true },
  { id: 'homework',  label: 'Homework & Notes', icon: FaLightbulb, inline: true },
  { id: 'circulars', label: 'School Circulars', icon: FaBullhorn,  inline: true },
  { id: 'profile',   label: 'My Profile',       icon: FaUser,      inline: true },
];

const PAGE_LINKS = [
  { label: 'Mark Attendance',  icon: FaClipboardList,      path: '/teacher/attendance', color: 'from-blue-400 to-blue-600' },
  { label: 'Log Activities',   icon: FaCamera,              path: '/teacher/activity',   color: 'from-violet-400 to-violet-600' },
  { label: 'Track Milestones', icon: FaGraduationCap,       path: '/teacher/milestones', color: 'from-emerald-400 to-emerald-600' },
  { label: 'Incident Report',  icon: FaExclamationTriangle, path: '/teacher/incident',   color: 'from-rose-400 to-rose-600' },
  { label: 'Medical Records',  icon: FaStethoscope,         path: '/teacher/medical',    color: 'from-pink-400 to-rose-500' },
  { label: 'PTM Management',   icon: FaCalendarAlt,         path: '/teacher/ptm',        color: 'from-amber-400 to-orange-500' },
  { label: 'Reports',          icon: FaChartBar,            path: '/teacher/reports',    color: 'from-indigo-400 to-indigo-600' },
];

const NAV_PAGE_ITEMS = [
  { id: 'attendance', label: 'Mark Attendance',  icon: FaClipboardList,      path: '/teacher/attendance' },
  { id: 'activity',   label: 'Log Activities',   icon: FaCamera,              path: '/teacher/activity' },
  { id: 'milestones', label: 'Track Milestones', icon: FaGraduationCap,       path: '/teacher/milestones' },
  { id: 'incident',   label: 'Incident Report',  icon: FaExclamationTriangle, path: '/teacher/incident' },
  { id: 'medical',    label: 'Medical Records',  icon: FaStethoscope,         path: '/teacher/medical' },
  { id: 'ptm',        label: 'PTM Management',   icon: FaCalendarAlt,         path: '/teacher/ptm' },
  { id: 'reports',    label: 'Reports',          icon: FaChartBar,            path: '/teacher/reports' },
];

const NAV_ICON_STYLES = {
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

const circularTypeStyle = (type) => {
  const value = String(type || 'general').toLowerCase();
  if (value === 'event') return 'bg-cyan-50 text-cyan-700 border-cyan-100';
  if (value === 'holiday') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  if (value === 'notice') return 'bg-amber-50 text-amber-700 border-amber-100';
  if (value === 'fee') return 'bg-rose-50 text-rose-700 border-rose-100';
  return 'bg-violet-50 text-violet-700 border-violet-100';
};

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, updateUser } = useAuthStore();

  const [activeSection, setActiveSection] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [circulars, setCirculars] = useState([]);
  const [batches, setBatches] = useState([]);
  const [classNotes, setClassNotes] = useState([]);
  const [toast, setToast] = useState(null);
  const [expandedCircular, setExpandedCircular] = useState(null);

  const [noteForm, setNoteForm] = useState({ batchId: '', title: '', content: '' });
  const [submittingNote, setSubmittingNote] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [showPostForm, setShowPostForm] = useState(false);
  const [filterBatchId, setFilterBatchId] = useState('');

  // Profile state
  const [profileForm, setProfileForm] = useState({
    firstName: '', lastName: '', phone: '', address: '', qualification: '',
    dateOfJoining: '', emergencyContactName: '', emergencyContactPhone: '', photo: '',
  });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingProfilePhoto, setUploadingProfilePhoto] = useState(false);
  const [showPwSection, setShowPwSection] = useState(false);
  const profilePhotoRef = useRef(null);

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const requestedSection = location.state?.section;
    if (requestedSection && NAV.some((item) => item.id === requestedSection)) {
      setActiveSection(requestedSection);
    }
  }, [location.state]);

  const loadCirculars = useCallback(async () => {
    try {
      const res = await api.get('/schooladmin/circulars/feed');
      setCirculars(res.data || []);
    } catch {
      setCirculars([]);
    }
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      const res = await api.get('/teacher/profile');
      const p = res.data;
      setProfileForm({
        firstName: p.firstName || '',
        lastName: p.lastName || '',
        phone: p.phone || '',
        address: p.address || '',
        qualification: p.qualification || '',
        dateOfJoining: p.dateOfJoining ? p.dateOfJoining.slice(0, 10) : '',
        emergencyContactName: p.emergencyContactName || '',
        emergencyContactPhone: p.emergencyContactPhone || '',
        photo: p.photo || '',
      });
      updateUser({
        firstName: p.firstName || '',
        lastName: p.lastName || '',
        phone: p.phone || '',
        photo: p.photo || '',
      });
    } catch {
      // silently ignore
    }
  }, [updateUser]);

  const handleProfilePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingProfilePhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', file.name);
      const res = await api.post('/upload/photo', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const uploadedPhotoUrl = res.data?.url || '';
      if (!uploadedPhotoUrl) {
        showToast('error', 'Photo upload returned an invalid URL');
        return;
      }

      // Persist photo immediately so it remains visible after page refresh.
      const saveRes = await api.put('/teacher/profile', { photo: uploadedPhotoUrl });
      const persistedPhoto = saveRes.data?.user?.photo || uploadedPhotoUrl;
      setProfileForm((p) => ({ ...p, photo: persistedPhoto }));
      updateUser({ photo: persistedPhoto });
      showToast('success', 'Profile photo uploaded and saved');
    } catch {
      showToast('error', 'Photo upload failed');
    } finally {
      setUploadingProfilePhoto(false);
      if (profilePhotoRef.current) profilePhotoRef.current.value = '';
    }
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (showPwSection) {
      if (!pwForm.currentPassword || !pwForm.newPassword) {
        showToast('error', 'Fill in current and new password');
        return;
      }
      if (pwForm.newPassword !== pwForm.confirmPassword) {
        showToast('error', 'New passwords do not match');
        return;
      }
    }
    setSavingProfile(true);
    try {
      const payload = { ...profileForm };
      if (showPwSection && pwForm.newPassword) {
        payload.currentPassword = pwForm.currentPassword;
        payload.newPassword = pwForm.newPassword;
      }
      const res = await api.put('/teacher/profile', payload);
      updateUser({
        firstName: res.data?.user?.firstName ?? profileForm.firstName,
        lastName: res.data?.user?.lastName ?? profileForm.lastName,
        phone: res.data?.user?.phone ?? profileForm.phone,
        photo: res.data?.user?.photo ?? profileForm.photo,
      });
      showToast('success', 'Profile saved successfully!');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPwSection(false);
    } catch (err) {
      showToast('error', err.response?.data?.error || 'Could not save profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const loadClassNotes = useCallback(async (batchId, sourceBatches = []) => {
    setLoadingNotes(true);
    try {
      let notes = [];

      if (batchId) {
        const res = await api.get(`/activities/batch/${batchId}/recent?take=20`);
        notes = (res.data || []).filter((activity) => activity.activityType === 'class_note');
      } else {
        const uniqueBatchIds = [...new Set((sourceBatches || []).map((batch) => batch.id).filter(Boolean))];
        if (uniqueBatchIds.length === 0) {
          setClassNotes([]);
          return;
        }

        const results = await Promise.all(
          uniqueBatchIds.map((id) => api.get(`/activities/batch/${id}/recent?take=20`).catch(() => ({ data: [] })))
        );

        notes = results
          .flatMap((response) => response.data || [])
          .filter((activity) => activity.activityType === 'class_note')
          .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
          .slice(0, 20);
      }

      setClassNotes(notes);
    } catch {
      setClassNotes([]);
    } finally {
      setLoadingNotes(false);
    }
  }, []);

  const loadBatches = useCallback(async () => {
    try {
      const res = await api.get('/teacher/attendance/data');
      const allBatches = (res.data?.classes || []).flatMap((cls) =>
        (cls.batches || []).map((b) => ({
          ...b,
          displayName: `${cls.name}${cls.section ? ` (${cls.section})` : ''} — ${b.shiftName || 'Batch'}`,
        }))
      );
      setBatches(allBatches);
      loadClassNotes('', allBatches);
    } catch {
      setBatches([]);
      setClassNotes([]);
    }
  }, [loadClassNotes]);

  useEffect(() => {
    loadCirculars();
    loadBatches();
    loadProfile();
  }, [loadCirculars, loadBatches, loadProfile]);

  const handleNoteFormChange = (field, value) => {
    setNoteForm((p) => ({ ...p, [field]: value }));
  };

  const handleFilterBatchChange = (batchId) => {
    setFilterBatchId(batchId);
    loadClassNotes(batchId);
  };

  const handleNoteSubmit = async (e) => {
    e.preventDefault();
    if (!noteForm.batchId || !noteForm.title || !noteForm.content) {
      showToast('error', 'Please fill in all fields.');
      return;
    }
    setSubmittingNote(true);
    try {
      await api.post('/activities', {
        batchId: noteForm.batchId,
        activityType: 'class_note',
        caption: noteForm.title,
        notes: noteForm.content,
      });
      showToast('success', 'Class note posted! Parents can see it in the activity feed.');
      setNoteForm((p) => ({ ...p, title: '', content: '' }));
      setShowPostForm(false);
      if (filterBatchId) loadClassNotes(filterBatchId);
      else loadClassNotes('', batches);
    } catch (err) {
      showToast('error', err.response?.data?.error || 'Could not post note.');
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const go = (item) => {
    if (item.inline) {
      setActiveSection(item.id);
      setSidebarOpen(false);
    } else if (item.path) {
      navigate(item.path);
    }
  };

  // ── Sidebar ────────────────────────────────────────────────────────────────
  const Sidebar = () => (
    <aside className={`
      fixed inset-y-0 left-0 z-40 w-[280px] bg-white shadow-xl flex flex-col
      transform transition-transform duration-300
      ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      lg:relative lg:translate-x-0 lg:shadow-none lg:border-r lg:border-gray-100
    `}>
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
            {profileForm.photo ? (
              <img src={profileForm.photo} alt="Teacher profile" className="w-11 h-11 rounded-2xl object-cover border border-white/20 shrink-0 shadow-inner" />
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

      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {NAV.map(({ id, label, icon: Icon, inline }) => {
          const active = activeSection === id;
          const iconTheme = NAV_ICON_STYLES[id] || { tone: 'text-gray-500', soft: 'bg-gray-100' };
          return (
            <button
              key={id}
              onClick={() => go({ id, label, icon: Icon, inline })}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl mb-1 text-sm font-medium transition-all ${
                active
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${active ? 'bg-white/20' : iconTheme.soft}`}>
                <Icon className={active ? 'text-white' : iconTheme.tone} />
              </span>
              {label}
              {id === 'circulars' && circulars.length > 0 && (
                <span className="ml-auto bg-indigo-200 text-indigo-800 text-xs rounded-full px-1.5 py-0.5 font-semibold">{circulars.length}</span>
              )}
            </button>
          );
        })}

        <div className="my-3 border-t border-gray-100" />
        <p className="text-[10px] uppercase font-semibold text-gray-400 px-4 mb-2 tracking-wider">Tools</p>

        {NAV_PAGE_ITEMS.map(({ id, label, icon: Icon, path }) => (
          <button
            key={id}
            onClick={() => navigate(path)}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl mb-1 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all"
          >
            <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${(NAV_ICON_STYLES[id] || { soft: 'bg-gray-100' }).soft}`}>
              <Icon className={(NAV_ICON_STYLES[id] || { tone: 'text-gray-500' }).tone} />
            </span>
            {label}
            <FaChevronRight className="ml-auto text-gray-300 text-xs" />
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors">
          <FaSignOutAlt /> Logout
        </button>
      </div>
    </aside>
  );

  // ── Home ───────────────────────────────────────────────────────────────────
  const renderHome = () => (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600 p-6 text-white relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/10 rounded-full" />
        <div className="absolute -right-2 bottom-0 w-24 h-24 bg-white/5 rounded-full" />
        <p className="text-indigo-100 text-sm mb-1">Good day,</p>
        <h2 className="text-2xl font-bold mb-1">{user?.firstName} {user?.lastName} 👋</h2>
        <p className="text-indigo-100 text-sm">Here's your teaching overview for today.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'Circulars',     value: circulars.length, color: 'bg-violet-50 border-violet-100', text: 'text-violet-700',  icon: FaBullhorn, onClick: () => setActiveSection('circulars') },
          { label: 'Classes',       value: batches.length,   color: 'bg-blue-50 border-blue-100',     text: 'text-blue-700',    icon: FaUsers, onClick: () => navigate('/teacher/attendance') },
          { label: 'Notes Today',   value: '—',              color: 'bg-amber-50 border-amber-100',   text: 'text-amber-700',   icon: FaLightbulb, onClick: null },
        ].map(({ label, value, color, text, icon: Icon, onClick }) => {
          const isClickable = typeof onClick === 'function' && typeof value === 'number';
          return (
            <button
              key={label}
              type="button"
              onClick={isClickable ? onClick : undefined}
              disabled={!isClickable}
              className={`rounded-2xl border p-4 text-left transition-all ${isClickable ? 'hover:shadow-sm hover:-translate-y-0.5 cursor-pointer' : 'cursor-default'} ${color}`}
            >
            <div className={`text-2xl font-bold ${text}`}>{value}</div>
            <div className="flex items-center gap-1.5 mt-1">
              <Icon className={`text-xs ${text}`} />
              <span className={`text-xs font-medium ${text}`}>{label}</span>
            </div>
            </button>
          );
        })}
      </div>

      <div>
        <h3 className="font-semibold text-gray-700 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {PAGE_LINKS.map(({ label, icon: Icon, path, color }) => (
            <button
              key={label}
              onClick={() => navigate(path)}
              className={`rounded-2xl bg-gradient-to-br ${color} text-white p-4 flex flex-col items-center gap-2 shadow hover:shadow-lg hover:scale-105 transition-all`}
            >
              <Icon className="text-2xl" />
              <span className="text-xs font-semibold text-center">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {circulars.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
              <FaBullhorn className="text-violet-500" /> Latest Circular
            </h3>
            <button onClick={() => setActiveSection('circulars')} className="text-xs text-indigo-500 hover:underline flex items-center gap-1">
              All <FaChevronRight size={10} />
            </button>
          </div>
          <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4">
            <p className="font-semibold text-gray-800">{circulars[0].title}</p>
            <p className="text-sm text-gray-600 mt-1">{circulars[0].description}</p>
            <p className="text-xs text-gray-400 mt-2">{new Date(circulars[0].publishDate || circulars[0].createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-700 flex items-center gap-2">
            <FaLightbulb className="text-amber-500" /> Homework & Class Notes
          </h3>
          <button onClick={() => setActiveSection('homework')} className="text-xs text-indigo-500 hover:underline flex items-center gap-1">
            Open <FaChevronRight size={10} />
          </button>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-sm text-amber-800">
          Post today's homework or lesson summary so parents can see what their child learned.
        </div>
      </div>
    </div>
  );

  // ── Homework & Class Notes ─────────────────────────────────────────────────
  const renderHomework = () => (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <FaLightbulb className="text-amber-500" /> Homework & Class Notes
        </h2>
        <button
          onClick={() => setShowPostForm((v) => !v)}
          className="btn btn-primary btn-sm flex items-center gap-2 shrink-0"
        >
          {showPostForm ? <FaTimes size={12} /> : <FaPlus size={12} />}
          {showPostForm ? 'Cancel' : 'Post New Note'}
        </button>
      </div>

      {/* Post form (toggle) */}
      {showPostForm && (
        <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5 space-y-3">
          <p className="text-sm text-gray-500 mb-1">
            Post today's homework or lesson summary. Parents will see it in their child's activity feed.
          </p>
          <form onSubmit={handleNoteSubmit} className="space-y-3">
            <select
              className="input w-full"
              value={noteForm.batchId}
              onChange={(e) => handleNoteFormChange('batchId', e.target.value)}
              required
            >
              <option value="">Select Class / Batch *</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>{b.displayName}</option>
              ))}
            </select>

            <input
              className="input w-full"
              placeholder="Title — e.g. Homework: Chapter 3 Exercise *"
              value={noteForm.title}
              onChange={(e) => handleNoteFormChange('title', e.target.value)}
              required
            />

            <textarea
              className="input w-full resize-none"
              rows={4}
              placeholder="Write the homework instructions or lesson summary here... *"
              value={noteForm.content}
              onChange={(e) => handleNoteFormChange('content', e.target.value)}
              required
            />

            <button
              type="submit"
              disabled={submittingNote}
              className="btn btn-primary flex items-center gap-2"
            >
              {submittingNote
                ? <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                : <FaPaperPlane />
              }
              Post to Parents
            </button>
          </form>
        </div>
      )}

      {/* Class filter */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-600 shrink-0">Filter by class:</label>
        <select
          className="input flex-1 max-w-xs"
          value={filterBatchId}
          onChange={(e) => handleFilterBatchChange(e.target.value)}
        >
          <option value="">All Classes</option>
          {batches.map((b) => (
            <option key={b.id} value={b.id}>{b.displayName}</option>
          ))}
        </select>
      </div>

      {/* Notes list */}
      {loadingNotes ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
        </div>
      ) : classNotes.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
          <FaLightbulb className="mx-auto text-3xl text-gray-200 mb-2" />
          <p className="text-gray-400 text-sm">
            {filterBatchId ? 'No notes posted for this class yet.' : 'No notes posted for any class yet.'}
          </p>
          {!showPostForm && (
            <button onClick={() => setShowPostForm(true)} className="btn btn-outline btn-sm mt-4 flex items-center gap-2 mx-auto">
              <FaPlus size={11} /> Post First Note
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filterBatchId && (
            <p className="text-sm font-medium text-gray-500">
              {classNotes.length} note{classNotes.length !== 1 ? 's' : ''} — {batches.find((b) => b.id === filterBatchId)?.displayName}
            </p>
          )}
          {classNotes.map((note) => (
            <div key={note.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                  <FaCheckCircle className="text-amber-500 text-sm" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-800">{note.caption || 'Class Note'}</p>
                  <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{note.notes}</p>
                  <p className="text-xs text-gray-400 mt-2">{new Date(note.createdAt).toLocaleString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ── Circulars ──────────────────────────────────────────────────────────────
  const renderCirculars = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
        <FaBullhorn className="text-violet-500" /> School Circulars
      </h2>
      {circulars.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
          <FaBullhorn className="mx-auto text-4xl text-gray-200 mb-3" />
          <p className="text-gray-500">No circulars available.</p>
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
                    <p className={`text-sm text-gray-600 mt-1 leading-6 ${isExpanded ? 'whitespace-pre-wrap' : 'line-clamp-2'}`}>
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

  // ── My Profile ────────────────────────────────────────────────────────────
  const renderProfile = () => (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
        <FaUser className="text-indigo-500" /> My Profile
      </h2>

      <form onSubmit={handleProfileSave} className="space-y-5">
        {/* Photo */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Profile Photo</p>
          <div className="flex items-center gap-4">
            {profileForm.photo ? (
              <img src={profileForm.photo} alt="Profile" className="w-20 h-20 rounded-full object-cover border-2 border-indigo-100 shadow" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-2xl font-bold shadow">
                {profileForm.firstName?.[0]}{profileForm.lastName?.[0]}
              </div>
            )}
            <div>
              <input ref={profilePhotoRef} type="file" accept="image/*" className="hidden" onChange={handleProfilePhotoUpload} />
              <button type="button" onClick={() => profilePhotoRef.current?.click()} disabled={uploadingProfilePhoto}
                className="btn btn-outline btn-sm flex items-center gap-2">
                {uploadingProfilePhoto ? <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-500" /> : <FaUpload />}
                {uploadingProfilePhoto ? 'Uploading…' : 'Upload Photo'}
              </button>
              <p className="text-xs text-gray-400 mt-1">JPG, PNG recommended</p>
            </div>
          </div>
        </div>

        {/* Basic Info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Basic Information</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input className="input" placeholder="First Name *" value={profileForm.firstName}
              onChange={(e) => setProfileForm((p) => ({ ...p, firstName: e.target.value }))} required />
            <input className="input" placeholder="Last Name *" value={profileForm.lastName}
              onChange={(e) => setProfileForm((p) => ({ ...p, lastName: e.target.value }))} required />
            <input className="input" placeholder="Phone" value={profileForm.phone}
              onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))} />
            <input className="input" placeholder="Qualification (e.g. B.Ed)" value={profileForm.qualification}
              onChange={(e) => setProfileForm((p) => ({ ...p, qualification: e.target.value }))} />
            <input className="input sm:col-span-2" placeholder="Address" value={profileForm.address}
              onChange={(e) => setProfileForm((p) => ({ ...p, address: e.target.value }))} />
            <div className="sm:col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Date of Joining</label>
              <input className="input w-full" type="date" value={profileForm.dateOfJoining}
                onChange={(e) => setProfileForm((p) => ({ ...p, dateOfJoining: e.target.value }))} />
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Emergency Contact</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input className="input" placeholder="Contact Name" value={profileForm.emergencyContactName}
              onChange={(e) => setProfileForm((p) => ({ ...p, emergencyContactName: e.target.value }))} />
            <input className="input" placeholder="Contact Phone" value={profileForm.emergencyContactPhone}
              onChange={(e) => setProfileForm((p) => ({ ...p, emergencyContactPhone: e.target.value }))} />
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
              <FaKey className="text-gray-400" /> Change Password
            </p>
            <button type="button" onClick={() => setShowPwSection((v) => !v)}
              className="text-xs text-indigo-500 hover:underline">
              {showPwSection ? 'Cancel' : 'Change'}
            </button>
          </div>
          {showPwSection && (
            <div className="space-y-3">
              <input className="input" type="password" placeholder="Current password" value={pwForm.currentPassword}
                onChange={(e) => setPwForm((p) => ({ ...p, currentPassword: e.target.value }))} />
              <input className="input" type="password" placeholder="New password" value={pwForm.newPassword}
                onChange={(e) => setPwForm((p) => ({ ...p, newPassword: e.target.value }))} />
              <input className="input" type="password" placeholder="Confirm new password" value={pwForm.confirmPassword}
                onChange={(e) => setPwForm((p) => ({ ...p, confirmPassword: e.target.value }))} />
            </div>
          )}
          {!showPwSection && (
            <p className="text-sm text-gray-400">Click "Change" to update your password.</p>
          )}
        </div>

        <button type="submit" disabled={savingProfile} className="btn btn-primary flex items-center gap-2 w-full sm:w-auto">
          {savingProfile ? <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <FaSave />}
          {savingProfile ? 'Saving…' : 'Save Profile'}
        </button>
      </form>
    </div>
  );

  const renderSection = () => {
    if (activeSection === 'home') return renderHome();
    if (activeSection === 'homework') return renderHomework();
    if (activeSection === 'circulars') return renderCirculars();
    if (activeSection === 'profile') return renderProfile();
    return null;
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {toast && (
          <div className={`mx-4 mt-3 px-4 py-3 rounded-xl text-sm font-medium flex items-center justify-between gap-3 shrink-0 ${toast.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}>
            {toast.text}
            <button onClick={() => setToast(null)}><FaTimes size={12} /></button>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {renderSection()}
        </main>
      </div>
    </div>
  );
}
