import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api';
import useAuthStore from '../../store/authStore';
import {
  FaHome, FaClipboardList, FaBook, FaUsers, FaBullhorn, FaCalendarAlt,
  FaExclamationTriangle, FaChartBar, FaTimes, FaBars, FaSignOutAlt,
  FaChevronRight, FaCamera, FaGraduationCap, FaPlus, FaPaperPlane,
  FaLightbulb, FaCheckCircle,
} from 'react-icons/fa';

const NAV = [
  { id: 'home',      label: 'Home',            icon: FaHome,      inline: true },
  { id: 'homework',  label: 'Homework & Notes', icon: FaLightbulb, inline: true },
  { id: 'circulars', label: 'School Circulars', icon: FaBullhorn,  inline: true },
];

const PAGE_LINKS = [
  { label: 'Mark Attendance',  icon: FaClipboardList,      path: '/teacher/attendance', color: 'from-blue-400 to-blue-600' },
  { label: 'Log Activities',   icon: FaCamera,              path: '/teacher/activity',   color: 'from-violet-400 to-violet-600' },
  { label: 'Track Milestones', icon: FaGraduationCap,       path: '/teacher/milestones', color: 'from-emerald-400 to-emerald-600' },
  { label: 'Incident Report',  icon: FaExclamationTriangle, path: '/teacher/incident',   color: 'from-rose-400 to-rose-600' },
  { label: 'PTM Management',   icon: FaCalendarAlt,         path: '/teacher/ptm',        color: 'from-amber-400 to-orange-500' },
  { label: 'Reports',          icon: FaChartBar,            path: '/teacher/reports',    color: 'from-indigo-400 to-indigo-600' },
];

const NAV_PAGE_ITEMS = [
  { id: 'attendance', label: 'Mark Attendance',  icon: FaClipboardList,      path: '/teacher/attendance' },
  { id: 'activity',   label: 'Log Activities',   icon: FaCamera,              path: '/teacher/activity' },
  { id: 'milestones', label: 'Track Milestones', icon: FaGraduationCap,       path: '/teacher/milestones' },
  { id: 'incident',   label: 'Incident Report',  icon: FaExclamationTriangle, path: '/teacher/incident' },
  { id: 'ptm',        label: 'PTM Management',   icon: FaCalendarAlt,         path: '/teacher/ptm' },
  { id: 'reports',    label: 'Reports',          icon: FaChartBar,            path: '/teacher/reports' },
];

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

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

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    loadCirculars();
    loadBatches();
  }, []);

  const loadCirculars = async () => {
    try {
      const res = await api.get('/schooladmin/circulars/feed');
      setCirculars(res.data || []);
    } catch {
      setCirculars([]);
    }
  };

  const loadBatches = async () => {
    try {
      const res = await api.get('/teacher/attendance/data');
      const allBatches = (res.data?.classes || []).flatMap((cls) =>
        (cls.batches || []).map((b) => ({
          ...b,
          displayName: `${cls.name}${cls.section ? ` (${cls.section})` : ''} — ${b.shiftName || 'Batch'}`,
        }))
      );
      setBatches(allBatches);
    } catch {
      setBatches([]);
    }
  };

  const loadClassNotes = async (batchId) => {
    if (!batchId) { setClassNotes([]); return; }
    setLoadingNotes(true);
    try {
      const res = await api.get(`/activities/batch/${batchId}/recent?take=20`);
      const notes = (res.data || []).filter((a) => a.activityType === 'class_note');
      setClassNotes(notes);
    } catch {
      setClassNotes([]);
    } finally {
      setLoadingNotes(false);
    }
  };

  const handleNoteFormChange = (field, value) => {
    setNoteForm((p) => ({ ...p, [field]: value }));
    if (field === 'batchId') loadClassNotes(value);
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
      loadClassNotes(noteForm.batchId);
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

      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {NAV.map(({ id, label, icon: Icon, inline }) => {
          const active = activeSection === id;
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
              <Icon className={active ? 'text-white' : 'text-gray-400'} />
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
            <Icon className="text-gray-400" />
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
          { label: 'Circulars',     value: circulars.length, color: 'bg-violet-50 border-violet-100', text: 'text-violet-700',  icon: FaBullhorn },
          { label: 'Classes',       value: batches.length,   color: 'bg-blue-50 border-blue-100',     text: 'text-blue-700',    icon: FaUsers },
          { label: 'Notes Today',   value: '—',              color: 'bg-amber-50 border-amber-100',   text: 'text-amber-700',   icon: FaLightbulb },
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
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
        <FaLightbulb className="text-amber-500" /> Homework & Class Notes
      </h2>
      <p className="text-sm text-gray-500 -mt-3">
        Post today's homework or lesson summaries. Parents will see these in their child's activity feed.
      </p>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <p className="font-semibold text-gray-800 flex items-center gap-2">
          <FaPlus className="text-indigo-500 text-sm" /> Post New Note
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

      {noteForm.batchId ? (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-700">
            Recent Notes — {batches.find((b) => b.id === noteForm.batchId)?.displayName}
          </h3>
          {loadingNotes ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
            </div>
          ) : classNotes.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center">
              <FaLightbulb className="mx-auto text-3xl text-gray-200 mb-2" />
              <p className="text-gray-400 text-sm">No notes posted for this class yet.</p>
            </div>
          ) : (
            classNotes.map((note) => (
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
            ))
          )}
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center">
          <FaUsers className="mx-auto text-3xl text-gray-200 mb-2" />
          <p className="text-gray-400 text-sm">Select a class above to view previous notes.</p>
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
            return (
              <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0 mt-0.5">
                    <FaBullhorn className="text-violet-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800">{c.title}</p>
                    <p className={`text-sm text-gray-600 mt-1 ${isExpanded ? 'whitespace-pre-wrap' : 'line-clamp-2'}`}>
                      {c.description}
                    </p>
                    {c.content && isExpanded && (
                      <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap border-t border-gray-100 pt-2">{c.content}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="text-xs bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full font-medium capitalize">
                        {c.circularType || 'general'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(c.publishDate || c.createdAt).toLocaleDateString()}
                      </span>
                      <button
                        onClick={() => setExpandedCircular(isExpanded ? null : c.id)}
                        className="text-xs text-indigo-500 hover:underline ml-auto"
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
    if (activeSection === 'homework') return renderHomework();
    if (activeSection === 'circulars') return renderCirculars();
    return null;
  };

  const activeLabel = NAV.find((n) => n.id === activeSection)?.label || 'Dashboard';

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-gray-700 p-1">
            <FaBars size={18} />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-gray-800 text-base">{activeLabel}</h1>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
        </header>

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
