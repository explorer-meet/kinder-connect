import React, { useEffect, useState } from 'react';
import TeacherPortalLayout from '../../components/TeacherPortalLayout';
import api from '../../api/api';
import {
  FaCalendarAlt, FaPlus, FaTimes, FaClock, FaTrash, FaUsers,
  FaMapMarkerAlt, FaCheckCircle, FaBan, FaChevronDown, FaChevronUp, FaStickyNote, FaSave,
} from 'react-icons/fa';

const statusColors = {
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function PTMManagement() {
  const [batches, setBatches] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [expandedSession, setExpandedSession] = useState(null);
  const [toast, setToast] = useState(null);

  const [form, setForm] = useState({
    batchId: '', sessionDate: '', startTime: '09:00 AM', location: '', notes: '',
    selectedStudentIds: [],
  });
  const [submitting, setSubmitting] = useState(false);
  // slotNotes: { [slotId]: string } — draft notes per slot
  const [slotNotes, setSlotNotes] = useState({});
  const [savingNote, setSavingNote] = useState({});

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    loadBatches();
    loadSessions();
  }, []);

  const loadBatches = async () => {
    try {
      const res = await api.get('/teacher/attendance/data');
      const all = (res.data?.classes || []).flatMap((cls) =>
        (cls.batches || []).map((b) => ({
          ...b,
          displayName: `${cls.name}${cls.section ? ` (${cls.section})` : ''} — ${b.shiftName || 'Batch'}`,
          classStudents: cls.batches.flatMap((bb) => bb.students || []),
        }))
      );
      setBatches(all);
    } catch { setBatches([]); }
  };

  const loadSessions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/teacher/ptm/sessions');
      setSessions(res.data || []);
    } catch { setSessions([]); }
    finally { setLoading(false); }
  };

  const handleBatchChange = async (batchId) => {
    setForm((f) => ({ ...f, batchId, selectedStudentIds: [] }));
    if (!batchId) { setStudents([]); return; }
    try {
      const res = await api.get(`/teacher/attendance/batch/${batchId}`);
      setStudents(res.data?.batch?.students || []);
    } catch { setStudents([]); }
  };

  const toggleStudent = (id) => {
    setForm((f) => ({
      ...f,
      selectedStudentIds: f.selectedStudentIds.includes(id)
        ? f.selectedStudentIds.filter((s) => s !== id)
        : [...f.selectedStudentIds, id],
    }));
  };

  const selectAll = () => setForm((f) => ({ ...f, selectedStudentIds: students.map((s) => s.id) }));
  const clearAll = () => setForm((f) => ({ ...f, selectedStudentIds: [] }));

  // Preview the 15-min slots
  const previewSlots = () => {
    if (!form.startTime || form.selectedStudentIds.length === 0) return [];
    const parseTime = (t) => {
      const [time, period] = t.trim().split(' ');
      let [h, m] = time.split(':').map(Number);
      if (period === 'PM' && h !== 12) h += 12;
      if (period === 'AM' && h === 12) h = 0;
      return h * 60 + m;
    };
    const fmt = (mins) => {
      const h24 = Math.floor(mins / 60) % 24;
      const m = mins % 60;
      const p = h24 >= 12 ? 'PM' : 'AM';
      const h12 = h24 % 12 || 12;
      return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${p}`;
    };
    let cur = parseTime(form.startTime);
    return form.selectedStudentIds.map((id) => {
      const s = students.find((st) => st.id === id);
      const slot = { studentId: id, name: s ? `${s.firstName} ${s.lastName}` : id, start: fmt(cur), end: fmt(cur + 15) };
      cur += 15;
      return slot;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.batchId || !form.sessionDate || !form.startTime || form.selectedStudentIds.length === 0) {
      showToast('error', 'Please fill all required fields and select at least one student.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/teacher/ptm/session', {
        batchId: form.batchId,
        sessionDate: form.sessionDate,
        startTime: form.startTime,
        location: form.location,
        notes: form.notes,
        studentIds: form.selectedStudentIds,
      });
      showToast('success', 'PTM session created! Slots assigned to students.');
      setForm({ batchId: '', sessionDate: '', startTime: '09:00 AM', location: '', notes: '', selectedStudentIds: [] });
      setStudents([]);
      setShowForm(false);
      loadSessions();
    } catch (err) {
      showToast('error', err.response?.data?.error || 'Failed to create session');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSlotStatus = async (slotId, status) => {
    try {
      await api.patch(`/teacher/ptm/slot/${slotId}`, { status });
      loadSessions();
    } catch { showToast('error', 'Failed to update slot'); }
  };

  const handleSaveNote = async (slotId) => {
    const note = slotNotes[slotId];
    if (note === undefined) return;
    setSavingNote((prev) => ({ ...prev, [slotId]: true }));
    try {
      await api.patch(`/teacher/ptm/slot/${slotId}`, { teacherNotes: note });
      showToast('success', 'Note saved');
      loadSessions();
    } catch {
      showToast('error', 'Failed to save note');
    } finally {
      setSavingNote((prev) => ({ ...prev, [slotId]: false }));
    }
  };

  const handleDeleteSession = async (sessionId) => {
    if (!window.confirm('Delete this PTM session and all its slots?')) return;
    try {
      await api.delete(`/teacher/ptm/session/${sessionId}`);
      showToast('success', 'Session deleted');
      loadSessions();
    } catch { showToast('error', 'Failed to delete session'); }
  };

  const slots = previewSlots();

  return (
    <TeacherPortalLayout title="PTM Management">
      <div className="space-y-5 w-full">
        {/* Toast */}
        {toast && (
          <div className={`px-4 py-3 rounded-xl text-sm font-medium flex items-center justify-between gap-3 ${toast.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}>
            {toast.text}
            <button onClick={() => setToast(null)}><FaTimes size={12} /></button>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FaCalendarAlt className="text-amber-500" /> PTM Management
          </h2>
          <button onClick={() => setShowForm((v) => !v)} className="btn btn-primary btn-sm flex items-center gap-2">
            {showForm ? <FaTimes size={12} /> : <FaPlus size={12} />}
            {showForm ? 'Cancel' : 'New PTM Session'}
          </button>
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5 space-y-5">
            <p className="font-semibold text-gray-800">Schedule a PTM Session</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs text-gray-500 mb-1 block">Class / Batch *</label>
                  <select className="input w-full" value={form.batchId} onChange={(e) => handleBatchChange(e.target.value)} required>
                    <option value="">Select class</option>
                    {batches.map((b) => <option key={b.id} value={b.id}>{b.displayName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Date of PTM *</label>
                  <input className="input w-full" type="date" value={form.sessionDate} onChange={(e) => setForm((f) => ({ ...f, sessionDate: e.target.value }))} required />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Starting Time (first slot) *</label>
                  <input className="input w-full" placeholder="e.g. 09:00 AM" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} required />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-gray-500 mb-1 block">Location / Room</label>
                  <input className="input w-full" placeholder="e.g. Classroom 3A, Room 101" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-gray-500 mb-1 block">Session Notes (optional)</label>
                  <textarea className="input w-full resize-none" rows={2} placeholder="Topics to discuss, agenda..." value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>

              {/* Student selection */}
              {students.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Select Students for Slots ({form.selectedStudentIds.length}/{students.length})
                    </label>
                    <div className="flex gap-2">
                      <button type="button" onClick={selectAll} className="text-xs text-indigo-500 hover:underline">All</button>
                      <button type="button" onClick={clearAll} className="text-xs text-gray-400 hover:underline">Clear</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {students.map((s) => {
                      const sel = form.selectedStudentIds.includes(s.id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => toggleStudent(s.id)}
                          className={`rounded-xl border px-3 py-2 text-sm text-left flex items-center gap-2 transition-all ${sel ? 'border-indigo-400 bg-indigo-50 text-indigo-800' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'}`}
                        >
                          <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${sel ? 'bg-indigo-500' : 'border border-gray-300'}`}>
                            {sel && <FaCheckCircle className="text-white text-xs" />}
                          </div>
                          <span className="truncate">{s.firstName} {s.lastName}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Slot preview */}
              {slots.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Slot Preview ({slots.length} × 15 min)
                  </p>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {slots.map((sl, i) => (
                      <div key={i} className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-sm">
                        <FaClock className="text-amber-400 shrink-0" />
                        <span className="font-medium text-amber-800">{sl.start} – {sl.end}</span>
                        <span className="text-gray-600 truncate">{sl.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button type="submit" disabled={submitting} className="btn btn-primary flex items-center gap-2 w-full sm:w-auto">
                {submitting ? <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <FaCalendarAlt />}
                {submitting ? 'Creating…' : 'Create PTM Session'}
              </button>
            </form>
          </div>
        )}

        {/* Sessions list */}
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" /></div>
        ) : sessions.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
            <FaCalendarAlt className="mx-auto text-4xl text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm">No PTM sessions created yet.</p>
            {!showForm && (
              <button onClick={() => setShowForm(true)} className="btn btn-outline btn-sm mt-4 flex items-center gap-2 mx-auto">
                <FaPlus size={11} /> Create First Session
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((sess) => {
              const isOpen = expandedSession === sess.id;
              const date = new Date(sess.sessionDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
              return (
                <div key={sess.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div
                    className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedSession(isOpen ? null : sess.id)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                        <FaCalendarAlt className="text-amber-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800">{date}</p>
                        <div className="flex items-center gap-3 flex-wrap mt-0.5">
                          <span className="text-xs text-gray-500 flex items-center gap-1"><FaUsers size={10} /> {sess.slots.length} students</span>
                          {sess.location && <span className="text-xs text-gray-400 flex items-center gap-1"><FaMapMarkerAlt size={10} /> {sess.location}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteSession(sess.id); }} className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                        <FaTrash size={13} />
                      </button>
                      {isOpen ? <FaChevronUp className="text-gray-400" /> : <FaChevronDown className="text-gray-400" />}
                    </div>
                  </div>

                  {isOpen && (
                    <div className="border-t border-gray-100 px-5 py-4 space-y-3">
                      {sess.notes && <p className="text-sm text-gray-600 italic">{sess.notes}</p>}
                      <div className="space-y-2">
                        {sess.slots.map((slot) => (
                          <div key={slot.id} className={`rounded-xl border ${slot.status === 'completed' ? 'border-emerald-200 bg-emerald-50' : 'border-gray-100 bg-gray-50'} px-4 py-3 space-y-3`}>
                            <div className="flex items-center gap-3">
                              <FaClock className="text-gray-400 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium text-gray-800">{slot.startTime} – {slot.endTime}</span>
                                <span className="text-xs text-gray-500 ml-2">{slot.studentName || 'Unknown Student'}</span>
                              </div>
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${statusColors[slot.status] || 'bg-gray-100 text-gray-600'}`}>
                                {slot.status}
                              </span>
                              <div className="flex gap-1">
                                {slot.status !== 'completed' && (
                                  <button onClick={() => handleSlotStatus(slot.id, 'completed')} className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-500 hover:text-emerald-700 transition-colors" title="Mark completed">
                                    <FaCheckCircle size={14} />
                                  </button>
                                )}
                                {slot.status !== 'cancelled' && (
                                  <button onClick={() => handleSlotStatus(slot.id, 'cancelled')} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors" title="Cancel slot">
                                    <FaBan size={14} />
                                  </button>
                                )}
                                {slot.status === 'cancelled' && (
                                  <button onClick={() => handleSlotStatus(slot.id, 'scheduled')} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-400 hover:text-blue-600 transition-colors" title="Reset to scheduled">
                                    <FaCalendarAlt size={14} />
                                  </button>
                                )}
                              </div>
                            </div>

                            {slot.status === 'completed' && (
                              <div className="space-y-2 pl-6">
                                <label className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                                  <FaStickyNote size={11} /> Teacher Notes (private)
                                </label>
                                <textarea
                                  rows={2}
                                  placeholder="Add your notes for this child's PTM discussion..."
                                  className="w-full text-sm rounded-xl border border-emerald-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none"
                                  value={slotNotes[slot.id] !== undefined ? slotNotes[slot.id] : (slot.teacherNotes || '')}
                                  onChange={(e) => setSlotNotes((prev) => ({ ...prev, [slot.id]: e.target.value }))}
                                />
                                <button
                                  onClick={() => handleSaveNote(slot.id)}
                                  disabled={savingNote[slot.id]}
                                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-60"
                                >
                                  {savingNote[slot.id] ? <span className="animate-spin rounded-full h-3 w-3 border-b border-white" /> : <FaSave size={11} />}
                                  {savingNote[slot.id] ? 'Saving…' : 'Save Note'}
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </TeacherPortalLayout>
  );
}
