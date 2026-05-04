import React, { useCallback, useEffect, useMemo, useState } from 'react';
import TeacherPortalLayout from '../../components/TeacherPortalLayout';
import api from '../../api/api';
import {
  FaExclamationTriangle, FaPlus, FaTrash, FaUser, FaChevronDown,
  FaClock, FaCheckCircle, FaBell,
} from 'react-icons/fa';

const INCIDENT_TYPES = [
  'Fall / Tumble', 'Bump / Bruise', 'Fever / Illness', 'Allergic Reaction',
  'Behavioural Incident', 'Injury', 'Choking', 'Other',
];

const SEVERITIES = [
  { value: 'minor',    label: 'Minor',    color: 'amber'  },
  { value: 'moderate', label: 'Moderate', color: 'orange' },
  { value: 'severe',   label: 'Severe',   color: 'red'    },
];

const SEV_COLORS = {
  amber:  { bg: 'bg-amber-50',  border: 'border-amber-200',  badge: 'bg-amber-100 text-amber-700'  },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-700'},
  red:    { bg: 'bg-rose-50',   border: 'border-rose-200',   badge: 'bg-rose-100 text-rose-700'    },
};

const IncidentReporter = () => {
  const [schoolData, setSchoolData] = useState(null);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState('');

  const [form, setForm] = useState({
    incidentType: 'Fall / Tumble',
    severity: 'minor',
    description: '',
    actionTaken: '',
    incidentTime: new Date().toISOString().slice(0, 16),
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
    } catch {
      showMsg('error', 'Failed to load students');
    }
  }, [showMsg]);

  const loadIncidents = useCallback(async (batchId) => {
    if (!batchId) return;
    setLoading(true);
    try {
      const res = await api.get(`/teacher/incidents/batch/${batchId}`);
      setIncidents(res.data || []);
    } catch {
      showMsg('error', 'Failed to load incidents');
    } finally {
      setLoading(false);
    }
  }, [showMsg]);

  useEffect(() => { loadSchoolData(); }, [loadSchoolData]);

  useEffect(() => {
    if (selectedBatchId) {
      loadBatchStudents(selectedBatchId);
      loadIncidents(selectedBatchId);
    }
  }, [selectedBatchId, loadBatchStudents, loadIncidents]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudentId || !selectedBatchId) {
      showMsg('error', 'Select a batch and student first');
      return;
    }
    if (!form.description.trim()) {
      showMsg('error', 'Description is required');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/teacher/incident', {
        studentId: selectedStudentId,
        batchId: selectedBatchId,
        ...form,
      });
      showMsg('success', 'Incident report submitted successfully');
      setForm({
        incidentType: 'Fall / Tumble',
        severity: 'minor',
        description: '',
        actionTaken: '',
        incidentTime: new Date().toISOString().slice(0, 16),
      });
      setShowForm(false);
      loadIncidents(selectedBatchId);
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Failed to submit incident');
    } finally {
      setSubmitting(false);
    }
  };

  const markParentNotified = async (incident) => {
    try {
      await api.patch(`/teacher/incident/${incident.id}`, { parentNotified: !incident.parentNotified });
      setIncidents((prev) =>
        prev.map((i) => i.id === incident.id ? { ...i, parentNotified: !i.parentNotified } : i)
      );
    } catch {
      showMsg('error', 'Failed to update');
    }
  };

  const deleteIncident = async (id) => {
    if (!window.confirm('Delete this incident report?')) return;
    try {
      await api.delete(`/teacher/incident/${id}`);
      setIncidents((prev) => prev.filter((i) => i.id !== id));
      showMsg('success', 'Incident deleted');
    } catch {
      showMsg('error', 'Failed to delete');
    }
  };

  const filteredIncidents = useMemo(() => {
    let list = incidents;
    if (selectedStudentId) list = list.filter((i) => i.studentId === selectedStudentId);
    if (filterSeverity) list = list.filter((i) => i.severity === filterSeverity);
    return list;
  }, [incidents, selectedStudentId, filterSeverity]);

  return (
    <TeacherPortalLayout title="Incident Report">
      {/* Batch & Student selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Batch</label>
          <div className="relative">
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm font-medium text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
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
              className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm font-medium text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
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

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {SEVERITIES.map((s) => {
          const c = SEV_COLORS[s.color];
          const cnt = filteredIncidents.filter((i) => i.severity === s.value).length;
          return (
            <div key={s.value} className={`rounded-2xl border ${c.border} ${c.bg} shadow-sm px-4 py-4 text-center`}>
              <div className={`text-2xl font-bold ${s.color === 'red' ? 'text-rose-700' : s.color === 'orange' ? 'text-orange-700' : 'text-amber-700'}`}>{cnt}</div>
              <div className="text-xs mt-0.5 text-slate-500">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Add Incident button + form */}
      <div className="mb-5">
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 text-sm font-semibold shadow-sm transition"
        >
          <FaPlus /> {showForm ? 'Cancel' : 'Report Incident'}
        </button>

        {showForm && (
          <form onSubmit={handleSubmit} className="mt-4 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-800 mb-2 flex items-center gap-2">
              <FaExclamationTriangle className="text-rose-500" /> New Incident Report
            </h3>

            {/* Student */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Student *</label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
              >
                <option value="">Select student</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Incident type */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Incident Type *</label>
                <select
                  value={form.incidentType}
                  onChange={(e) => setForm((f) => ({ ...f, incidentType: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                >
                  {INCIDENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Date & Time */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Date & Time *</label>
                <input
                  type="datetime-local"
                  value={form.incidentTime}
                  onChange={(e) => setForm((f) => ({ ...f, incidentTime: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                />
              </div>
            </div>

            {/* Severity */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Severity *</label>
              <div className="flex gap-3">
                {SEVERITIES.map((s) => {
                  const c = SEV_COLORS[s.color];
                  return (
                    <button
                      type="button"
                      key={s.value}
                      onClick={() => setForm((f) => ({ ...f, severity: s.value }))}
                      className={`flex-1 rounded-xl border py-2 text-xs font-semibold transition ${form.severity === s.value ? `${c.bg} ${c.border} ${c.badge.split(' ')[1]}` : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Description *</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Describe what happened..."
                required
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none"
              />
            </div>

            {/* Action Taken */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Action Taken</label>
              <textarea
                rows={2}
                value={form.actionTaken}
                onChange={(e) => setForm((f) => ({ ...f, actionTaken: e.target.value }))}
                placeholder="First aid, called parents, etc."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-2xl bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white py-2.5 text-sm font-bold shadow-sm transition"
            >
              {submitting ? 'Submitting…' : 'Submit Incident Report'}
            </button>
          </form>
        )}
      </div>

      {/* Severity filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setFilterSeverity('')}
          className={`rounded-full px-4 py-1.5 text-xs font-semibold border transition ${filterSeverity === '' ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
        >
          All
        </button>
        {SEVERITIES.map((s) => {
          const c = SEV_COLORS[s.color];
          return (
            <button
              key={s.value}
              onClick={() => setFilterSeverity(s.value)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold border transition ${filterSeverity === s.value ? `${c.bg} ${c.border} ${c.badge.split(' ').find((x) => x.startsWith('text-'))}` : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Incidents list */}
      {loading ? (
        <div className="flex items-center justify-center py-16 bg-white rounded-3xl border border-slate-200 shadow-sm">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-500" />
        </div>
      ) : filteredIncidents.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center">
          <FaExclamationTriangle className="mx-auto text-4xl text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No incident reports found</p>
          <p className="text-sm text-slate-400 mt-1">Use the button above to file a report</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredIncidents.map((incident) => {
            const sev = SEVERITIES.find((s) => s.value === incident.severity) || SEVERITIES[0];
            const c = SEV_COLORS[sev.color];
            return (
              <div key={incident.id} className={`bg-white rounded-2xl border ${c.border} shadow-sm p-4`}>
                <div className="flex gap-4 items-start">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${c.bg}`}>
                    <FaExclamationTriangle className={c.badge.split(' ')[1]} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.badge}`}>{sev.label}</span>
                      <span className="text-xs font-semibold text-slate-700">{incident.incidentType}</span>
                      {incident.parentNotified && (
                        <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 flex items-center gap-1">
                          <FaBell size={9} /> Parent Notified
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-700">{incident.description}</p>
                    {incident.actionTaken && (
                      <p className="text-xs text-slate-500 mt-1"><span className="font-medium">Action:</span> {incident.actionTaken}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><FaUser size={10} /> {incident.studentName}</span>
                      <span className="flex items-center gap-1"><FaClock size={10} /> {new Date(incident.incidentTime).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button
                      onClick={() => markParentNotified(incident)}
                      title={incident.parentNotified ? 'Unmark parent notified' : 'Mark parent notified'}
                      className={`rounded-xl px-3 py-1.5 text-xs font-semibold border transition flex items-center gap-1 ${incident.parentNotified ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-blue-50'}`}
                    >
                      {incident.parentNotified ? <FaCheckCircle size={10} /> : <FaBell size={10} />}
                      {incident.parentNotified ? 'Notified' : 'Notify'}
                    </button>
                    <button
                      onClick={() => deleteIncident(incident.id)}
                      className="rounded-xl px-3 py-1.5 text-xs font-semibold border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 transition"
                    >
                      <FaTrash size={10} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </TeacherPortalLayout>
  );
};

export default IncidentReporter;

