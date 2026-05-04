import React, { useCallback, useEffect, useMemo, useState } from 'react';
import TeacherPortalLayout from '../../components/TeacherPortalLayout';
import api from '../../api/api';
import {
  FaArrowLeft, FaPlus, FaTimes, FaSave, FaPaperPlane, FaChartBar,
  FaUsers, FaHeart, FaChild, FaComments, FaBrain,
  FaSmile, FaMoon, FaUtensils, FaExclamationTriangle,
  FaCheckCircle, FaCalendarAlt, FaStar, FaSync,
} from 'react-icons/fa';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const THIS_YEAR = new Date().getFullYear();
const YEARS = [THIS_YEAR - 1, THIS_YEAR];

const DOMAIN_CONFIG = {
  social:    { label: 'Social Skills',  Icon: FaUsers,            gradient: 'from-violet-500 to-purple-600',  light: 'bg-violet-50 border-violet-200',  text: 'text-violet-700' },
  emotional: { label: 'Emotional',      Icon: FaHeart,            gradient: 'from-pink-500 to-rose-600',      light: 'bg-pink-50 border-pink-200',      text: 'text-pink-700' },
  motor:     { label: 'Motor Skills',   Icon: FaChild,            gradient: 'from-blue-500 to-cyan-600',      light: 'bg-blue-50 border-blue-200',      text: 'text-blue-700' },
  language:  { label: 'Language',       Icon: FaComments,         gradient: 'from-emerald-500 to-teal-600',   light: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
  cognitive: { label: 'Cognitive',      Icon: FaBrain,            gradient: 'from-amber-500 to-orange-600',   light: 'bg-amber-50 border-amber-200',    text: 'text-amber-700' },
};

const RATINGS = [
  { value: 'emerging',   label: 'Emerging',   pill: 'bg-slate-600 text-white',   inactive: 'bg-slate-100 text-slate-600 hover:bg-slate-200' },
  { value: 'developing', label: 'Developing', pill: 'bg-blue-600 text-white',    inactive: 'bg-blue-50 text-blue-600 hover:bg-blue-100' },
  { value: 'proficient', label: 'Proficient', pill: 'bg-emerald-600 text-white', inactive: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' },
  { value: 'advanced',   label: 'Advanced',   pill: 'bg-violet-600 text-white',  inactive: 'bg-violet-50 text-violet-600 hover:bg-violet-100' },
];

const STATUS_CONFIG = {
  null:           { label: 'No Report',      cls: 'bg-slate-100 text-slate-500' },
  draft:          { label: 'Draft',           cls: 'bg-amber-100 text-amber-700' },
  completed:      { label: 'Completed',       cls: 'bg-blue-100 text-blue-700' },
  sent_to_parent: { label: 'Sent to Parent',  cls: 'bg-emerald-100 text-emerald-700' },
};

const MOOD_EMOJI = { happy:'😊', calm:'😌', excited:'🤩', sad:'😢', anxious:'😟', tired:'😴', angry:'😡' };
const INTAKE_LABEL = { full: 'Full plate', half: 'Half plate', refused: 'Refused' };

// ─── Chip-input component ─────────────────────────────────────────────────────
function ChipInput({ label, placeholder, items, onAdd, onRemove, chipCls, btnCls }) {
  const [val, setVal] = useState('');
  const add = () => {
    const t = val.trim();
    if (t) { onAdd(t); setVal(''); }
  };
  return (
    <div>
      <p className="text-sm font-semibold text-slate-700 mb-2">{label}</p>
      <div className="flex gap-2 mb-3">
        <input
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder={placeholder}
          className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
        <button onClick={add} className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-1.5 ${btnCls}`}>
          <FaPlus size={10} /> Add
        </button>
      </div>
      <div className="flex flex-wrap gap-2 min-h-[28px]">
        {items.map((item, i) => (
          <span key={i} className={`inline-flex items-center gap-1.5 text-sm px-3 py-1 rounded-full border ${chipCls}`}>
            {item}
            <button onClick={() => onRemove(i)} className="opacity-60 hover:opacity-100 ml-0.5">
              <FaTimes size={9} />
            </button>
          </span>
        ))}
        {items.length === 0 && <span className="text-xs text-slate-400 italic">None added yet</span>}
      </div>
    </div>
  );
}

// ─── Stat mini-card ───────────────────────────────────────────────────────────
function StatCard({ icon: Icon, iconCls, label, value, sub }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-start gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconCls}`}>
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className="text-lg font-bold text-slate-800 leading-tight">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
const ReportBuilder = () => {
  const now = new Date();
  const [schoolData, setSchoolData]       = useState(null);
  const [selectedBatchId, setBatchId]     = useState('');
  const [month, setMonth]                 = useState(now.getMonth() + 1);
  const [year, setYear]                   = useState(now.getFullYear());
  const [batchStudents, setBatchStudents] = useState([]);
  const [overviewLoading, setOvLoading]   = useState(false);
  const [view, setView]                   = useState('overview'); // 'overview' | 'editor'

  // Editor state
  const [activeStudent, setActiveStudent] = useState(null);
  const [report, setReport]               = useState(null);
  const [stats, setStats]                 = useState(null);
  const [domains, setDomains]             = useState([]);
  const [summary, setSummary]             = useState('');
  const [highlights, setHighlights]       = useState([]);
  const [areas, setAreas]                 = useState([]);
  const [activities, setActivities]       = useState([]);
  const [generating, setGenerating]       = useState(false);
  const [saving, setSaving]               = useState(false);
  const [sending, setSending]             = useState(false);
  const [msg, setMsg]                     = useState(null);

  const showMsg = useCallback((type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  }, []);

  const allBatches = useMemo(() => {
    if (!schoolData?.classes) return [];
    return schoolData.classes.flatMap(cls =>
      (cls.batches || []).map(batch => ({
        id:    batch.id,
        label: `${cls.name}${cls.section ? ` (${cls.section})` : ''} — ${batch.shiftName}`,
      }))
    );
  }, [schoolData]);

  // Load school/batch data
  useEffect(() => {
    api.get('/teacher/attendance/data').then(res => {
      setSchoolData(res.data);
      const first = (res.data?.classes || []).flatMap(c => c.batches || [])[0];
      if (first?.id) setBatchId(first.id);
    }).catch(() => {});
  }, []);

  // Load batch overview
  const loadOverview = useCallback(async () => {
    if (!selectedBatchId) return;
    setOvLoading(true);
    try {
      const res = await api.get(`/reports/batch/${selectedBatchId}?month=${month}&year=${year}`);
      setBatchStudents(res.data || []);
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Failed to load batch reports');
    } finally {
      setOvLoading(false);
    }
  }, [selectedBatchId, month, year, showMsg]);

  useEffect(() => { loadOverview(); }, [loadOverview]);

  // Open editor for a student
  const openEditor = useCallback(async (student) => {
    setGenerating(true);
    setActiveStudent(student);
    setView('editor');
    try {
      const res = await api.post('/reports/generate', {
        studentId: student.id,
        batchId:   selectedBatchId,
        month,
        year,
      });
      const r = res.data.report;
      setReport(r);
      setStats(res.data.stats);
      setDomains(Array.isArray(r.domains) ? r.domains : []);
      setSummary(r.overallSummary || '');
      setHighlights(Array.isArray(r.highlights) ? r.highlights : []);
      setAreas(Array.isArray(r.areasForImprovement) ? r.areasForImprovement : []);
      setActivities(Array.isArray(r.recommendedActivities) ? r.recommendedActivities : []);
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Failed to generate report');
      setView('overview');
    } finally {
      setGenerating(false);
    }
  }, [selectedBatchId, month, year, showMsg]);

  const updateDomainRating = (idx, rating) => {
    setDomains(prev => prev.map((d, i) => i === idx ? { ...d, rating } : d));
  };
  const updateDomainNotes = (idx, notes) => {
    setDomains(prev => prev.map((d, i) => i === idx ? { ...d, notes } : d));
  };

  const saveReport = useCallback(async (newStatus) => {
    if (!report?.id) return;
    setSaving(true);
    try {
      const payload = {
        domains,
        overallSummary:        summary,
        highlights,
        areasForImprovement:   areas,
        recommendedActivities: activities,
      };
      if (newStatus) payload.reportStatus = newStatus;
      const res = await api.patch(`/reports/${report.id}`, payload);
      setReport(res.data.report);
      showMsg('success', newStatus === 'completed' ? 'Report marked as complete!' : 'Draft saved!');
      loadOverview();
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [report, domains, summary, highlights, areas, activities, showMsg, loadOverview]);

  const sendReport = useCallback(async () => {
    if (!report?.id) return;
    setSending(true);
    try {
      await saveReport(); // save latest edits first
      await api.post(`/reports/${report.id}/send`);
      setReport(prev => ({ ...prev, reportStatus: 'sent_to_parent' }));
      showMsg('success', 'Report sent to parent!');
      loadOverview();
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Failed to send');
    } finally {
      setSending(false);
    }
  }, [report, saveReport, showMsg, loadOverview]);

  const backToOverview = () => {
    setView('overview');
    setActiveStudent(null);
    setReport(null);
    setStats(null);
  };

  const statusKey = report?.reportStatus || null;
  const statusCfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG[null];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <TeacherPortalLayout title="Monthly Reports">
      {/* Toast */}
      {msg && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl shadow-lg text-sm font-medium flex items-center gap-2 ${
          msg.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
        }`}>
          {msg.type === 'success' ? <FaCheckCircle /> : <FaExclamationTriangle />}
          {msg.text}
        </div>
      )}

      {view === 'overview' ? (
        /* ══════ OVERVIEW ══════ */
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-800">Monthly Reports</h1>
              <p className="text-sm text-slate-500 mt-0.5">Build and publish development reports for each child</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Batch */}
              <select
                value={selectedBatchId}
                onChange={e => setBatchId(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                {allBatches.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
              </select>
              {/* Month */}
              <select
                value={month}
                onChange={e => setMonth(Number(e.target.value))}
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
              {/* Year */}
              <select
                value={year}
                onChange={e => setYear(Number(e.target.value))}
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <button onClick={loadOverview} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 flex items-center gap-2">
                <FaSync size={11} /> Refresh
              </button>
            </div>
          </div>

          {/* Student table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-800">Batch Overview</h2>
                <p className="text-xs text-slate-500 mt-0.5">{MONTHS[month - 1]} {year}</p>
              </div>
              <span className="text-sm text-slate-500">{batchStudents.length} students</span>
            </div>

            {overviewLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
              </div>
            ) : batchStudents.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <FaChartBar size={32} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">No students in this batch</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                      <th className="text-left px-6 py-3 font-medium">#</th>
                      <th className="text-left px-4 py-3 font-medium">Student</th>
                      <th className="text-left px-4 py-3 font-medium">Report Status</th>
                      <th className="text-left px-4 py-3 font-medium">Last Updated</th>
                      <th className="text-left px-4 py-3 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {batchStudents.map((s, idx) => {
                      const rpt = s.report;
                      const sk  = rpt?.reportStatus || null;
                      const sc  = STATUS_CONFIG[sk] || STATUS_CONFIG[null];
                      return (
                        <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-6 py-4 text-slate-400 font-medium">{idx + 1}</td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm shrink-0">
                                {s.photo
                                  ? <img src={s.photo} alt="" className="w-9 h-9 rounded-full object-cover" />
                                  : `${s.firstName[0]}${s.lastName[0]}`
                                }
                              </div>
                              <span className="font-medium text-slate-800">{s.firstName} {s.lastName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${sc.cls}`}>
                              {sc.label}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-slate-500">
                            {rpt?.updatedAt ? new Date(rpt.updatedAt).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-4 py-4">
                            <button
                              onClick={() => openEditor(s)}
                              className="px-4 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-medium hover:bg-indigo-700 transition-colors"
                            >
                              {rpt ? 'Edit Report' : 'Create Report'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ══════ EDITOR ══════ */
        <div className="space-y-6">
          {/* Top bar */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <button onClick={backToOverview} className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors">
                <FaArrowLeft size={14} />
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-800">
                  {activeStudent ? `${activeStudent.firstName} ${activeStudent.lastName}` : 'Report'}
                </h1>
                <p className="text-xs text-slate-500">{MONTHS[month - 1]} {year} • Monthly Report</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusCfg.cls}`}>
                {statusCfg.label}
              </span>
              {report?.reportStatus !== 'sent_to_parent' && (
                <>
                  <button
                    onClick={() => saveReport(report?.reportStatus === 'draft' ? undefined : undefined)}
                    disabled={saving}
                    className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 flex items-center gap-2 disabled:opacity-50"
                  >
                    {saving ? <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> : <FaSave size={13} />}
                    Save Draft
                  </button>
                  {report?.reportStatus !== 'completed' && (
                    <button
                      onClick={() => saveReport('completed')}
                      disabled={saving}
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                    >
                      <FaCheckCircle size={13} /> Mark Complete
                    </button>
                  )}
                  <button
                    onClick={sendReport}
                    disabled={sending || saving}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50"
                  >
                    {sending ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FaPaperPlane size={13} />}
                    Send to Parent
                  </button>
                </>
              )}
            </div>
          </div>

          {generating ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-500 text-sm">Generating report from monthly data…</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* ─── LEFT: Stats ─── */}
              <div className="space-y-4">
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Auto-Computed Stats</h2>

                {/* Attendance */}
                {stats && (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                        <FaCalendarAlt size={13} />
                      </div>
                      <span className="font-semibold text-slate-700 text-sm">Attendance</span>
                    </div>
                    <div className="text-center mb-4">
                      <span className="text-4xl font-bold text-slate-800">{stats.attendance.attendancePct}%</span>
                      <p className="text-xs text-slate-500 mt-1">{stats.attendance.presentDays} present of {stats.attendance.totalDays} days</p>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${stats.attendance.attendancePct >= 85 ? 'bg-emerald-500' : stats.attendance.attendancePct >= 70 ? 'bg-amber-500' : 'bg-rose-500'}`}
                        style={{ width: `${stats.attendance.attendancePct}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-4 text-center text-xs">
                      <div className="bg-emerald-50 rounded-xl p-2">
                        <div className="font-bold text-emerald-700">{stats.attendance.presentDays}</div>
                        <div className="text-emerald-600">Present</div>
                      </div>
                      <div className="bg-rose-50 rounded-xl p-2">
                        <div className="font-bold text-rose-700">{stats.attendance.absentDays}</div>
                        <div className="text-rose-600">Absent</div>
                      </div>
                      <div className="bg-amber-50 rounded-xl p-2">
                        <div className="font-bold text-amber-700">{stats.attendance.lateDays}</div>
                        <div className="text-amber-600">Late</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Mood / Nap / Meal */}
                {stats && (
                  <div className="grid grid-cols-1 gap-3">
                    <StatCard
                      icon={FaSmile} iconCls="bg-yellow-50 text-yellow-500"
                      label="Top arrival mood"
                      value={stats.mood.topArrivalMood
                        ? `${MOOD_EMOJI[stats.mood.topArrivalMood] || ''} ${stats.mood.topArrivalMood}`
                        : 'No data'}
                    />
                    <StatCard
                      icon={FaMoon} iconCls="bg-indigo-50 text-indigo-500"
                      label="Avg nap duration"
                      value={stats.nap.avgNapMin ? `${stats.nap.avgNapMin} min` : 'No data'}
                      sub={stats.nap.napDays > 0 ? `Logged ${stats.nap.napDays} days` : undefined}
                    />
                    <StatCard
                      icon={FaUtensils} iconCls="bg-orange-50 text-orange-500"
                      label="Top meal intake"
                      value={stats.meal.topMealIntake ? INTAKE_LABEL[stats.meal.topMealIntake] || stats.meal.topMealIntake : 'No data'}
                    />
                  </div>
                )}

                {/* Milestones */}
                {stats && stats.milestones.total > 0 && (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <p className="text-sm font-semibold text-slate-700 mb-3">Milestones this month</p>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl font-bold text-emerald-600">{stats.milestones.achieved}</span>
                      <span className="text-slate-400 text-sm">of {stats.milestones.total} achieved</span>
                    </div>
                    <div className="space-y-2">
                      {stats.milestones.list.slice(0, 6).map((m, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${m.isAchieved ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                            {m.isAchieved ? <FaCheckCircle size={10} /> : '○'}
                          </div>
                          <span className={m.isAchieved ? 'text-slate-700' : 'text-slate-400'}>{m.milestone}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Incidents */}
                {stats && stats.incidents.count > 0 && (
                  <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
                    <div className="flex items-center gap-2 text-rose-700 font-semibold text-sm mb-1">
                      <FaExclamationTriangle size={13} /> {stats.incidents.count} Incident{stats.incidents.count > 1 ? 's' : ''} this month
                    </div>
                    <p className="text-xs text-rose-600">Review in Incident Reports section</p>
                  </div>
                )}
              </div>

              {/* ─── RIGHT: Editor ─── */}
              <div className="xl:col-span-2 space-y-5">

                {/* Developmental Domains */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                  <h2 className="font-semibold text-slate-800 mb-5">Developmental Domains</h2>
                  <div className="space-y-6">
                    {domains.map((d, idx) => {
                      const cfg = DOMAIN_CONFIG[d.domain];
                      if (!cfg) return null;
                      const { Icon } = cfg;
                      return (
                        <div key={d.domain} className={`rounded-2xl border p-4 ${cfg.light}`}>
                          <div className="flex items-center gap-3 mb-3">
                            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center text-white`}>
                              <Icon size={14} />
                            </div>
                            <span className={`font-semibold text-sm ${cfg.text}`}>{cfg.label}</span>
                          </div>
                          {/* Rating buttons */}
                          <div className="flex flex-wrap gap-2 mb-3">
                            {RATINGS.map(r => (
                              <button
                                key={r.value}
                                onClick={() => updateDomainRating(idx, r.value)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${d.rating === r.value ? r.pill : r.inactive}`}
                              >
                                {r.label}
                              </button>
                            ))}
                          </div>
                          {/* Milestones for this domain */}
                          {d.milestones && d.milestones.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                              {d.milestones.map((m, mi) => (
                                <span key={mi} className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border ${m.isAchieved ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-500'}`}>
                                  {m.isAchieved && <FaCheckCircle size={9} />} {m.milestone}
                                </span>
                              ))}
                            </div>
                          )}
                          {/* Notes */}
                          <textarea
                            value={d.notes}
                            onChange={e => updateDomainNotes(idx, e.target.value)}
                            placeholder={`Observations for ${cfg.label}…`}
                            rows={2}
                            className="w-full border border-slate-200 bg-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Overall Summary */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <FaStar className="text-amber-500" size={15} />
                    <h2 className="font-semibold text-slate-800">Teacher's Message to Parent</h2>
                  </div>
                  <textarea
                    value={summary}
                    onChange={e => setSummary(e.target.value)}
                    placeholder="Write a personal message about this child's month — what stood out, their energy, their progress…"
                    rows={4}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                  />
                </div>

                {/* Chips */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
                  <ChipInput
                    label="✨ Highlights this month"
                    placeholder="e.g. Helped a friend without being asked…"
                    items={highlights}
                    onAdd={t => setHighlights(p => [...p, t])}
                    onRemove={i => setHighlights(p => p.filter((_, j) => j !== i))}
                    chipCls="bg-emerald-50 border-emerald-200 text-emerald-700"
                    btnCls="bg-emerald-600 text-white hover:bg-emerald-700"
                  />
                  <div className="border-t border-slate-100" />
                  <ChipInput
                    label="🌱 Areas for growth"
                    placeholder="e.g. Working on sharing during group play…"
                    items={areas}
                    onAdd={t => setAreas(p => [...p, t])}
                    onRemove={i => setAreas(p => p.filter((_, j) => j !== i))}
                    chipCls="bg-amber-50 border-amber-200 text-amber-700"
                    btnCls="bg-amber-500 text-white hover:bg-amber-600"
                  />
                  <div className="border-t border-slate-100" />
                  <ChipInput
                    label="🏠 Recommended home activities"
                    placeholder="e.g. Practise counting objects at home…"
                    items={activities}
                    onAdd={t => setActivities(p => [...p, t])}
                    onRemove={i => setActivities(p => p.filter((_, j) => j !== i))}
                    chipCls="bg-blue-50 border-blue-200 text-blue-700"
                    btnCls="bg-blue-600 text-white hover:bg-blue-700"
                  />
                </div>

                {/* Bottom action bar */}
                {report?.reportStatus !== 'sent_to_parent' && (
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => saveReport()}
                      disabled={saving}
                      className="px-6 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 flex items-center gap-2 disabled:opacity-50"
                    >
                      <FaSave size={13} /> Save Draft
                    </button>
                    {report?.reportStatus !== 'completed' && (
                      <button
                        onClick={() => saveReport('completed')}
                        disabled={saving}
                        className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                      >
                        <FaCheckCircle size={13} /> Mark Complete
                      </button>
                    )}
                    <button
                      onClick={sendReport}
                      disabled={sending || saving}
                      className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50"
                    >
                      <FaPaperPlane size={13} /> Send to Parent
                    </button>
                  </div>
                )}
                {report?.reportStatus === 'sent_to_parent' && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center text-emerald-700 text-sm font-medium flex items-center justify-center gap-2">
                    <FaCheckCircle /> This report has been sent to the parent
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </TeacherPortalLayout>
  );
};

export default ReportBuilder;
