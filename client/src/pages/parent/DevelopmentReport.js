import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ParentPortalLayout from '../../components/ParentPortalLayout';
import api from '../../api/api';
import {
  FaBook, FaUsers, FaHeart, FaChild, FaComments, FaBrain,
  FaCalendarAlt, FaSmile, FaMoon, FaUtensils, FaExclamationTriangle,
  FaCheckCircle, FaStar, FaLightbulb, FaArrowRight, FaChevronLeft,
} from 'react-icons/fa';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const DOMAIN_CONFIG = {
  social:    { label: 'Social Skills',  Icon: FaUsers,    grad: 'from-violet-500 to-purple-600', light: 'bg-violet-50',   text: 'text-violet-700',  border: 'border-violet-200' },
  emotional: { label: 'Emotional',      Icon: FaHeart,    grad: 'from-pink-500 to-rose-600',     light: 'bg-pink-50',     text: 'text-pink-700',    border: 'border-pink-200' },
  motor:     { label: 'Motor Skills',   Icon: FaChild,    grad: 'from-blue-500 to-cyan-600',     light: 'bg-blue-50',     text: 'text-blue-700',    border: 'border-blue-200' },
  language:  { label: 'Language',       Icon: FaComments, grad: 'from-emerald-500 to-teal-600',  light: 'bg-emerald-50',  text: 'text-emerald-700', border: 'border-emerald-200' },
  cognitive: { label: 'Cognitive',      Icon: FaBrain,    grad: 'from-amber-500 to-orange-600',  light: 'bg-amber-50',    text: 'text-amber-700',   border: 'border-amber-200' },
};

const RATING_CONFIG = {
  emerging:   { label: 'Emerging',   bar: 'w-1/4',  barCls: 'bg-slate-400',   pill: 'bg-slate-100 text-slate-600' },
  developing: { label: 'Developing', bar: 'w-2/4',  barCls: 'bg-blue-500',    pill: 'bg-blue-100 text-blue-700' },
  proficient: { label: 'Proficient', bar: 'w-3/4',  barCls: 'bg-emerald-500', pill: 'bg-emerald-100 text-emerald-700' },
  advanced:   { label: 'Advanced',   bar: 'w-full', barCls: 'bg-violet-500',  pill: 'bg-violet-100 text-violet-700' },
};

const MOOD_EMOJI  = { happy:'😊', calm:'😌', excited:'🤩', sad:'😢', anxious:'😟', tired:'😴', angry:'😡' };
const INTAKE_LABEL = { full: 'Full plate', half: 'Half plate', refused: 'Refused' };

// ─── Report List Card ─────────────────────────────────────────────────────────
function ReportListItem({ rpt, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 rounded-2xl flex items-center justify-between transition-all ${
        isActive
          ? 'bg-violet-600 text-white shadow-lg shadow-violet-200'
          : 'bg-white border border-slate-100 text-slate-700 hover:bg-slate-50'
      }`}
    >
      <div>
        <p className={`font-semibold text-sm ${isActive ? 'text-white' : 'text-slate-800'}`}>
          {MONTHS[rpt.month - 1]} {rpt.year}
        </p>
        <p className={`text-xs mt-0.5 ${isActive ? 'text-violet-200' : 'text-slate-400'}`}>
          {rpt.teacher ? `${rpt.teacher.firstName} ${rpt.teacher.lastName}` : 'Teacher'}
        </p>
      </div>
      <FaArrowRight size={12} className={isActive ? 'text-violet-200' : 'text-slate-300'} />
    </button>
  );
}

// ─── Stat mini card ───────────────────────────────────────────────────────────
function MiniStat({ icon: Icon, label, value, iconCls }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconCls}`}>
        <Icon size={14} />
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="font-semibold text-slate-800 text-sm">{value}</p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
const DevelopmentReport = () => {
  const { studentId } = useParams();
  const [reportList, setReportList]     = useState([]);
  const [selectedId, setSelectedId]     = useState(null);
  const [detail, setDetail]             = useState(null);
  const [listLoading, setListLoading]   = useState(true);
  const [detailLoading, setDetailLoad]  = useState(false);
  const [showList, setShowList]         = useState(true); // mobile toggle

  // Load report list
  useEffect(() => {
    setListLoading(true);
    api.get(`/reports/student/${studentId}`)
      .then(res => {
        setReportList(res.data || []);
        if (res.data?.length > 0) setSelectedId(res.data[0].id);
      })
      .catch(() => {})
      .finally(() => setListLoading(false));
  }, [studentId]);

  // Load report detail
  const loadDetail = useCallback(async (id) => {
    if (!id) return;
    setDetailLoad(true);
    try {
      const res = await api.get(`/reports/${id}`);
      setDetail(res.data);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoad(false);
    }
  }, []);

  useEffect(() => { loadDetail(selectedId); }, [selectedId, loadDetail]);

  const childName = detail?.student
    ? `${detail.student.firstName} ${detail.student.lastName}`
    : 'Child';

  const rpt   = detail?.report;
  const stats = detail?.stats;
  const domains = Array.isArray(rpt?.domains) ? rpt.domains : [];

  return (
    <ParentPortalLayout
      title="Monthly Reports"
      subtitle={detail ? `${MONTHS[(rpt?.month || 1) - 1]} ${rpt?.year} · ${childName}` : 'Child development reports'}
      accent="violet"
    >
      <div className="flex flex-col lg:flex-row gap-5">

        {/* ══════ LEFT: report list ══════ */}
        <div className="lg:w-64 shrink-0">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 py-4 border-b border-slate-100">
              <p className="font-semibold text-slate-800 text-sm">Report History</p>
              <p className="text-xs text-slate-400 mt-0.5">Published monthly reports</p>
            </div>
            <div className="p-3 space-y-2 max-h-[60vh] overflow-y-auto">
              {listLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : reportList.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <FaBook size={24} className="mx-auto mb-2 opacity-30" />
                  <p className="text-xs">No reports yet</p>
                </div>
              ) : (
                reportList.map(r => (
                  <ReportListItem
                    key={r.id}
                    rpt={r}
                    isActive={r.id === selectedId}
                    onClick={() => setSelectedId(r.id)}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* ══════ RIGHT: report detail ══════ */}
        <div className="flex-1 min-w-0">
          {detailLoading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
              <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-400 text-sm">Loading report…</p>
            </div>
          ) : !detail ? (
            <div className="flex flex-col items-center justify-center py-32 gap-3 text-slate-400">
              <FaBook size={40} className="opacity-20" />
              <p className="font-medium">Select a report from the list</p>
            </div>
          ) : (
            <div className="space-y-5">

              {/* ── Report header card ── */}
              <div className="bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-2xl p-6 text-white">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-violet-200 text-xs font-medium uppercase tracking-wide mb-1">Monthly Development Report</p>
                    <h2 className="text-2xl font-bold">{MONTHS[(rpt?.month || 1) - 1]} {rpt?.year}</h2>
                    <p className="text-violet-200 text-sm mt-1">{childName}</p>
                  </div>
                  {detail.teacher && (
                    <div className="bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/20 text-right">
                      <p className="text-violet-200 text-xs">Class Teacher</p>
                      <p className="font-semibold text-sm">{detail.teacher.firstName} {detail.teacher.lastName}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Attendance card ── */}
              {stats && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                      <FaCalendarAlt size={16} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">Attendance</h3>
                      <p className="text-xs text-slate-500">This month's presence</p>
                    </div>
                    <div className="ml-auto text-right">
                      <span className={`text-3xl font-bold ${stats.attendance.attendancePct >= 85 ? 'text-emerald-600' : stats.attendance.attendancePct >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>
                        {stats.attendance.attendancePct}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-4">
                    <div
                      className={`h-full rounded-full transition-all ${stats.attendance.attendancePct >= 85 ? 'bg-emerald-500' : stats.attendance.attendancePct >= 70 ? 'bg-amber-500' : 'bg-rose-500'}`}
                      style={{ width: `${stats.attendance.attendancePct}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center text-sm">
                    <div className="bg-emerald-50 rounded-2xl py-3">
                      <div className="text-2xl font-bold text-emerald-700">{stats.attendance.presentDays}</div>
                      <div className="text-emerald-600 text-xs mt-0.5">Present</div>
                    </div>
                    <div className="bg-rose-50 rounded-2xl py-3">
                      <div className="text-2xl font-bold text-rose-700">{stats.attendance.absentDays}</div>
                      <div className="text-rose-600 text-xs mt-0.5">Absent</div>
                    </div>
                    <div className="bg-amber-50 rounded-2xl py-3">
                      <div className="text-2xl font-bold text-amber-700">{stats.attendance.lateDays}</div>
                      <div className="text-amber-600 text-xs mt-0.5">Late</div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Developmental Domains ── */}
              {domains.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                  <h3 className="font-semibold text-slate-800 mb-5">Developmental Progress</h3>
                  <div className="space-y-4">
                    {domains.map((d) => {
                      const cfg = DOMAIN_CONFIG[d.domain];
                      const rc  = RATING_CONFIG[d.rating] || RATING_CONFIG.developing;
                      if (!cfg) return null;
                      const { Icon } = cfg;
                      const achievedMs = (d.milestones || []).filter(m => m.isAchieved);
                      return (
                        <div key={d.domain} className={`rounded-2xl border p-4 ${cfg.light} ${cfg.border}`}>
                          <div className="flex items-center gap-3 mb-3">
                            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${cfg.grad} flex items-center justify-center text-white`}>
                              <Icon size={14} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className={`font-semibold text-sm ${cfg.text}`}>{cfg.label}</span>
                                <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${rc.pill}`}>{rc.label}</span>
                              </div>
                              <div className="w-full h-1.5 bg-white/70 rounded-full mt-2 overflow-hidden">
                                <div className={`h-full rounded-full ${rc.barCls} ${rc.bar}`} />
                              </div>
                            </div>
                          </div>
                          {d.notes && (
                            <p className="text-sm text-slate-600 leading-relaxed mb-3 bg-white/60 rounded-xl px-3 py-2">{d.notes}</p>
                          )}
                          {achievedMs.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {achievedMs.map((m, i) => (
                                <span key={i} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
                                  <FaCheckCircle size={9} /> {m.milestone}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Teacher's Message ── */}
              {rpt?.overallSummary && (
                <div className="bg-gradient-to-br from-violet-50 to-fuchsia-50 rounded-2xl border border-violet-200 p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <FaStar className="text-amber-500" size={16} />
                    <h3 className="font-semibold text-slate-800">Teacher's Message</h3>
                  </div>
                  <p className="text-slate-700 text-sm leading-relaxed italic">"{rpt.overallSummary}"</p>
                  {detail.teacher && (
                    <p className="text-xs text-violet-500 mt-3">— {detail.teacher.firstName} {detail.teacher.lastName}</p>
                  )}
                </div>
              )}

              {/* ── Highlights / Areas / Activities ── */}
              {(rpt?.highlights?.length > 0 || rpt?.areasForImprovement?.length > 0 || rpt?.recommendedActivities?.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {rpt?.highlights?.length > 0 && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                      <p className="text-sm font-semibold text-emerald-800 mb-3 flex items-center gap-2"><FaCheckCircle size={13} /> Highlights</p>
                      <ul className="space-y-2">
                        {rpt.highlights.map((h, i) => (
                          <li key={i} className="text-xs text-emerald-700 flex items-start gap-2">
                            <span className="text-emerald-400 mt-0.5">✦</span> {h}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {rpt?.areasForImprovement?.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                      <p className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2"><FaLightbulb size={13} /> Areas for Growth</p>
                      <ul className="space-y-2">
                        {rpt.areasForImprovement.map((a, i) => (
                          <li key={i} className="text-xs text-amber-700 flex items-start gap-2">
                            <span className="text-amber-400 mt-0.5">✦</span> {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {rpt?.recommendedActivities?.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                      <p className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2"><FaChild size={13} /> Try at Home</p>
                      <ul className="space-y-2">
                        {rpt.recommendedActivities.map((a, i) => (
                          <li key={i} className="text-xs text-blue-700 flex items-start gap-2">
                            <span className="text-blue-400 mt-0.5">✦</span> {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* ── Mood / Nap / Meal ── */}
              {stats && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <MiniStat
                    icon={FaSmile} iconCls="bg-yellow-50 text-yellow-500"
                    label="Top arrival mood"
                    value={stats.mood.topArrivalMood
                      ? `${MOOD_EMOJI[stats.mood.topArrivalMood] || ''} ${stats.mood.topArrivalMood}`
                      : 'No data'}
                  />
                  <MiniStat
                    icon={FaMoon} iconCls="bg-indigo-50 text-indigo-500"
                    label="Average nap"
                    value={stats.nap.avgNapMin ? `${stats.nap.avgNapMin} min` : 'No data'}
                  />
                  <MiniStat
                    icon={FaUtensils} iconCls="bg-orange-50 text-orange-500"
                    label="Typical meal intake"
                    value={stats.meal.topMealIntake ? INTAKE_LABEL[stats.meal.topMealIntake] || stats.meal.topMealIntake : 'No data'}
                  />
                </div>
              )}

              {/* ── Milestones ── */}
              {stats && stats.milestones.total > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                  <h3 className="font-semibold text-slate-800 mb-4">Milestones This Month</h3>
                  <div className="flex items-center gap-4 mb-4 pb-4 border-b border-slate-100">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-emerald-600">{stats.milestones.achieved}</div>
                      <div className="text-xs text-slate-500">Achieved</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-slate-400">{stats.milestones.total - stats.milestones.achieved}</div>
                      <div className="text-xs text-slate-500">In progress</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {stats.milestones.list.map((m, i) => (
                      <div key={i} className={`flex items-center gap-2 text-sm rounded-xl px-3 py-2 ${m.isAchieved ? 'bg-emerald-50' : 'bg-slate-50'}`}>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${m.isAchieved ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                          {m.isAchieved ? <FaCheckCircle size={10} /> : <span className="text-[9px]">○</span>}
                        </div>
                        <span className={m.isAchieved ? 'text-slate-700' : 'text-slate-400'}>{m.milestone}</span>
                        <span className={`ml-auto text-xs capitalize ${m.isAchieved ? 'text-emerald-500' : 'text-slate-400'}`}>{m.domain}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Incidents ── */}
              {stats && stats.incidents.count > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5">
                  <div className="flex items-center gap-2 text-rose-700 font-semibold mb-3">
                    <FaExclamationTriangle size={14} /> {stats.incidents.count} Incident{stats.incidents.count > 1 ? 's' : ''} recorded this month
                  </div>
                  <div className="space-y-2">
                    {stats.incidents.list.map(inc => (
                      <div key={inc.id} className="bg-white rounded-xl px-4 py-3 flex items-start justify-between gap-3">
                        <div>
                          <span className="text-sm font-medium text-slate-700 capitalize">{inc.incidentType}</span>
                          {inc.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{inc.description}</p>}
                        </div>
                        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full shrink-0 ${inc.severity === 'severe' ? 'bg-rose-100 text-rose-700' : inc.severity === 'moderate' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                          {inc.severity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </ParentPortalLayout>
  );
};

export default DevelopmentReport;
