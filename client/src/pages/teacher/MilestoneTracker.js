import React, { useCallback, useEffect, useMemo, useState } from 'react';
import TeacherPortalLayout from '../../components/TeacherPortalLayout';
import api from '../../api/api';
import {
  FaGraduationCap, FaPlus, FaCheck, FaTrash, FaUser, FaChevronDown,
  FaBrain, FaHeart, FaRunning, FaComments, FaLightbulb,
} from 'react-icons/fa';

const DOMAINS = [
  { value: 'social',    label: 'Social',    icon: FaHeart,    color: 'pink' },
  { value: 'emotional', label: 'Emotional', icon: FaBrain,    color: 'purple' },
  { value: 'motor',     label: 'Motor',     icon: FaRunning,  color: 'green' },
  { value: 'language',  label: 'Language',  icon: FaComments, color: 'blue' },
  { value: 'cognitive', label: 'Cognitive', icon: FaLightbulb,color: 'yellow' },
];

const DOMAIN_COLORS = {
  pink:   { bg: 'bg-pink-50',   border: 'border-pink-200',   badge: 'bg-pink-100 text-pink-700',   icon: 'text-pink-500'   },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-700',icon: 'text-purple-500' },
  green:  { bg: 'bg-emerald-50',border: 'border-emerald-200',badge: 'bg-emerald-100 text-emerald-700',icon: 'text-emerald-500' },
  blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   badge: 'bg-blue-100 text-blue-700',   icon: 'text-blue-500'   },
  yellow: { bg: 'bg-amber-50',  border: 'border-amber-200',  badge: 'bg-amber-100 text-amber-700', icon: 'text-amber-500'  },
};

const MilestoneTracker = () => {
  const [schoolData, setSchoolData] = useState(null);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [filterDomain, setFilterDomain] = useState('');

  const [form, setForm] = useState({
    domain: 'social',
    milestone: '',
    description: '',
    isAchieved: false,
  });

  const showMsg = useCallback((type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }, []);

  const allBatches = useMemo(() => {
    if (!schoolData?.classes) return [];
    return schoolData.classes.flatMap((cls) =>
      (cls.batches || []).map((b) => ({
        id: b.id,
        label: `${cls.name}${cls.section ? ` (${cls.section})` : ''} – ${b.shiftName}`,
      }))
    );
  }, [schoolData]);

  const loadSchoolData = useCallback(async () => {
    try {
      const res = await api.get('/teacher/attendance/data');
      setSchoolData(res.data);
      const firstBatch = (res.data?.classes || []).flatMap((c) => c.batches || [])[0];
      if (firstBatch?.id) setSelectedBatchId(firstBatch.id);
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Failed to load school data');
    }
  }, [showMsg]);

  const loadBatchStudents = useCallback(async (batchId) => {
    if (!batchId) return;
    try {
      const res = await api.get(`/teacher/attendance/batch/${batchId}?date=${new Date().toISOString().slice(0, 10)}`);
      const activeStudents = (res.data?.batch?.students || []).filter((s) => s.isActive);
      setStudents(activeStudents);
      setSelectedStudentId(activeStudents[0]?.id || '');
    } catch (err) {
      showMsg('error', 'Failed to load students');
    }
  }, [showMsg]);

  const loadMilestones = useCallback(async (batchId) => {
    if (!batchId) return;
    setLoading(true);
    try {
      const res = await api.get(`/teacher/milestones/batch/${batchId}`);
      setMilestones(res.data || []);
    } catch (err) {
      showMsg('error', 'Failed to load milestones');
    } finally {
      setLoading(false);
    }
  }, [showMsg]);

  useEffect(() => { loadSchoolData(); }, [loadSchoolData]);

  useEffect(() => {
    if (selectedBatchId) {
      loadBatchStudents(selectedBatchId);
      loadMilestones(selectedBatchId);
    }
  }, [selectedBatchId, loadBatchStudents, loadMilestones]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudentId || !selectedBatchId) {
      showMsg('error', 'Select a batch and student first');
      return;
    }
    if (!form.milestone.trim()) {
      showMsg('error', 'Milestone title is required');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/teacher/milestone', {
        studentId: selectedStudentId,
        batchId: selectedBatchId,
        ...form,
      });
      showMsg('success', 'Milestone recorded successfully');
      setForm({ domain: 'social', milestone: '', description: '', isAchieved: false });
      setShowForm(false);
      loadMilestones(selectedBatchId);
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Failed to save milestone');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleAchieved = async (m) => {
    try {
      await api.patch(`/teacher/milestone/${m.id}`, { isAchieved: !m.isAchieved });
      setMilestones((prev) =>
        prev.map((x) =>
          x.id === m.id ? { ...x, isAchieved: !x.isAchieved, achievedDate: !m.isAchieved ? new Date().toISOString() : null } : x
        )
      );
    } catch {
      showMsg('error', 'Failed to update milestone');
    }
  };

  const deleteMilestone = async (id) => {
    if (!window.confirm('Delete this milestone?')) return;
    try {
      await api.delete(`/teacher/milestone/${id}`);
      setMilestones((prev) => prev.filter((m) => m.id !== id));
      showMsg('success', 'Milestone deleted');
    } catch {
      showMsg('error', 'Failed to delete');
    }
  };

  const filteredMilestones = useMemo(() => {
    let list = milestones;
    if (selectedStudentId) list = list.filter((m) => m.studentId === selectedStudentId);
    if (filterDomain) list = list.filter((m) => m.domain === filterDomain);
    return list;
  }, [milestones, selectedStudentId, filterDomain]);

  const achievedCount = filteredMilestones.filter((m) => m.isAchieved).length;
  const inProgressCount = filteredMilestones.filter((m) => !m.isAchieved).length;

  return (
    <TeacherPortalLayout title="Track Milestones">
      {/* Batch & Student selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Batch</label>
          <div className="relative">
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm font-medium text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              {allBatches.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
            </select>
            <FaChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Student</label>
          <div className="relative">
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm font-medium text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="">— All Students —</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
              ))}
            </select>
            <FaChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-4 rounded-2xl px-4 py-3 text-sm font-medium ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
          {message.text}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-4 text-center">
          <div className="text-2xl font-bold text-slate-800">{filteredMilestones.length}</div>
          <div className="text-xs text-slate-500 mt-0.5">Total</div>
        </div>
        <div className="bg-emerald-50 rounded-2xl border border-emerald-200 shadow-sm px-4 py-4 text-center">
          <div className="text-2xl font-bold text-emerald-700">{achievedCount}</div>
          <div className="text-xs text-emerald-600 mt-0.5">Achieved</div>
        </div>
        <div className="bg-amber-50 rounded-2xl border border-amber-200 shadow-sm px-4 py-4 text-center">
          <div className="text-2xl font-bold text-amber-700">{inProgressCount}</div>
          <div className="text-xs text-amber-600 mt-0.5">In Progress</div>
        </div>
      </div>

      {/* Add Milestone button + form */}
      <div className="mb-5">
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 text-sm font-semibold shadow-sm transition"
        >
          <FaPlus /> {showForm ? 'Cancel' : 'Add Milestone'}
        </button>

        {showForm && (
          <form onSubmit={handleSubmit} className="mt-4 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-800 mb-2 flex items-center gap-2">
              <FaGraduationCap className="text-indigo-500" /> New Milestone
            </h3>

            {/* Student override */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Student</label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="">Select student</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
                ))}
              </select>
            </div>

            {/* Domain */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Development Domain</label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {DOMAINS.map((d) => {
                  const c = DOMAIN_COLORS[d.color];
                  const Icon = d.icon;
                  return (
                    <button
                      type="button"
                      key={d.value}
                      onClick={() => setForm((f) => ({ ...f, domain: d.value }))}
                      className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2 text-xs font-semibold transition ${form.domain === d.value ? `${c.bg} ${c.border} ${c.icon}` : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                    >
                      <Icon size={16} /> {d.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Milestone Title *</label>
              <input
                type="text"
                value={form.milestone}
                onChange={(e) => setForm((f) => ({ ...f, milestone: e.target.value }))}
                placeholder="e.g., Recognises own name in writing"
                required
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Description / Notes</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Observations or context..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
              />
            </div>

            {/* Achieved toggle */}
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div
                onClick={() => setForm((f) => ({ ...f, isAchieved: !f.isAchieved }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.isAchieved ? 'bg-emerald-500' : 'bg-slate-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.isAchieved ? 'translate-x-6' : 'translate-x-1'}`} />
              </div>
              <span className="text-sm font-medium text-slate-700">Mark as Achieved</span>
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white py-2.5 text-sm font-bold shadow-sm transition"
            >
              {submitting ? 'Saving…' : 'Save Milestone'}
            </button>
          </form>
        )}
      </div>

      {/* Domain filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setFilterDomain('')}
          className={`rounded-full px-4 py-1.5 text-xs font-semibold border transition ${filterDomain === '' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
        >
          All Domains
        </button>
        {DOMAINS.map((d) => {
          const c = DOMAIN_COLORS[d.color];
          return (
            <button
              key={d.value}
              onClick={() => setFilterDomain(d.value)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold border transition ${filterDomain === d.value ? `${c.bg} ${c.border} ${c.icon}` : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
            >
              {d.label}
            </button>
          );
        })}
      </div>

      {/* Milestones list */}
      {loading ? (
        <div className="flex items-center justify-center py-16 bg-white rounded-3xl border border-slate-200 shadow-sm">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500" />
        </div>
      ) : filteredMilestones.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center">
          <FaGraduationCap className="mx-auto text-4xl text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No milestones found</p>
          <p className="text-sm text-slate-400 mt-1">Add a milestone using the button above</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMilestones.map((m) => {
            const dom = DOMAINS.find((d) => d.value === m.domain) || DOMAINS[0];
            const c = DOMAIN_COLORS[dom.color];
            const Icon = dom.icon;
            return (
              <div key={m.id} className={`bg-white rounded-2xl border ${m.isAchieved ? 'border-emerald-200' : c.border} shadow-sm p-4 flex gap-4 items-start`}>
                <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${m.isAchieved ? 'bg-emerald-100' : c.bg}`}>
                  {m.isAchieved ? <FaCheck className="text-emerald-600" /> : <Icon className={c.icon} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.badge}`}>{dom.label}</span>
                    {m.isAchieved && <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-700">✓ Achieved</span>}
                    {!m.isAchieved && <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700">In Progress</span>}
                  </div>
                  <p className="text-sm font-semibold text-slate-800">{m.milestone}</p>
                  {m.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{m.description}</p>}
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><FaUser size={10} /> {m.studentName}</span>
                    {m.achievedDate && <span>Achieved {new Date(m.achievedDate).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button
                    onClick={() => toggleAchieved(m)}
                    title={m.isAchieved ? 'Mark In Progress' : 'Mark Achieved'}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold border transition ${m.isAchieved ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'}`}
                  >
                    {m.isAchieved ? 'Undo' : '✓ Achieve'}
                  </button>
                  <button
                    onClick={() => deleteMilestone(m.id)}
                    className="rounded-xl px-3 py-1.5 text-xs font-semibold border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 transition"
                  >
                    <FaTrash size={10} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </TeacherPortalLayout>
  );
};

export default MilestoneTracker;

