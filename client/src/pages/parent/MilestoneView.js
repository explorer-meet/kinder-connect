import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/api';
import ParentPortalLayout from '../../components/ParentPortalLayout';
import {
  FaGraduationCap, FaHeart, FaBrain, FaRunning, FaComments, FaLightbulb, FaCheck,
} from 'react-icons/fa';

const DOMAINS = [
  { value: 'social',    label: 'Social',    icon: FaHeart,     color: 'pink'   },
  { value: 'emotional', label: 'Emotional', icon: FaBrain,     color: 'purple' },
  { value: 'motor',     label: 'Motor',     icon: FaRunning,   color: 'green'  },
  { value: 'language',  label: 'Language',  icon: FaComments,  color: 'blue'   },
  { value: 'cognitive', label: 'Cognitive', icon: FaLightbulb, color: 'yellow' },
];

const DOMAIN_COLORS = {
  pink:   { bg: 'bg-pink-50',   border: 'border-pink-200',   badge: 'bg-pink-100 text-pink-700',    icon: 'text-pink-500'    },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-700', icon: 'text-purple-500'  },
  green:  { bg: 'bg-emerald-50',border: 'border-emerald-200',badge: 'bg-emerald-100 text-emerald-700',icon: 'text-emerald-500'},
  blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   badge: 'bg-blue-100 text-blue-700',    icon: 'text-blue-500'    },
  yellow: { bg: 'bg-amber-50',  border: 'border-amber-200',  badge: 'bg-amber-100 text-amber-700',  icon: 'text-amber-500'   },
};

const MilestoneView = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [milestones, setMilestones] = useState([]);
  const [filterDomain, setFilterDomain] = useState('');

  const loadMilestones = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/parent/child/${studentId}/milestones`);
      setMilestones(res.data || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load milestones');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { loadMilestones(); }, [loadMilestones]);

  const filtered = useMemo(
    () => filterDomain ? milestones.filter((m) => m.domain === filterDomain) : milestones,
    [milestones, filterDomain]
  );

  const achievedCount = milestones.filter((m) => m.isAchieved).length;
  const inProgress = milestones.filter((m) => !m.isAchieved).length;

  // Group by domain for progress bars
  const domainStats = useMemo(() =>
    DOMAINS.map((d) => {
      const all = milestones.filter((m) => m.domain === d.value);
      const done = all.filter((m) => m.isAchieved).length;
      return { ...d, total: all.length, done };
    }),
  [milestones]);

  return (
    <ParentPortalLayout
      title="Milestone Progress"
      subtitle="Track your child's developmental milestones across all growth areas"
      accent="violet"
      rightAction={{ label: 'Back to Dashboard', onClick: () => navigate('/parent/dashboard') }}
    >
      {loading ? (
        <div className="flex items-center justify-center min-h-64 bg-white rounded-3xl border border-slate-200 shadow-sm">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-500" />
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-rose-700 text-sm">{error}</div>
      ) : (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 text-center">
              <div className="text-3xl font-bold text-slate-800">{milestones.length}</div>
              <div className="text-xs text-slate-500 mt-0.5">Total Milestones</div>
            </div>
            <div className="bg-emerald-50 rounded-2xl border border-emerald-200 shadow-sm p-4 text-center">
              <div className="text-3xl font-bold text-emerald-700">{achievedCount}</div>
              <div className="text-xs text-emerald-600 mt-0.5">Achieved ✓</div>
            </div>
            <div className="bg-amber-50 rounded-2xl border border-amber-200 shadow-sm p-4 text-center">
              <div className="text-3xl font-bold text-amber-700">{inProgress}</div>
              <div className="text-xs text-amber-600 mt-0.5">In Progress</div>
            </div>
          </div>

          {/* Domain progress bars */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FaGraduationCap className="text-violet-500" /> Progress by Domain
            </h3>
            <div className="space-y-3">
              {domainStats.map((d) => {
                const c = DOMAIN_COLORS[d.color];
                const Icon = d.icon;
                const pct = d.total > 0 ? Math.round((d.done / d.total) * 100) : 0;
                return (
                  <div key={d.value}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Icon className={`${c.icon} text-sm`} />
                        <span className="text-sm font-semibold text-slate-700">{d.label}</span>
                      </div>
                      <span className="text-xs text-slate-500">{d.done}/{d.total}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${c.badge.split(' ')[0].replace('bg-', 'bg-').replace('100', '400')}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterDomain('')}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold border transition ${filterDomain === '' ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
            >
              All
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
          {filtered.length === 0 ? (
            <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center">
              <FaGraduationCap className="mx-auto text-4xl text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">No milestones yet</p>
              <p className="text-sm text-slate-400 mt-1">Your child's teacher will add milestones as they progress</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((m) => {
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
                        {m.isAchieved
                          ? <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-700">✓ Achieved</span>
                          : <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700">In Progress</span>
                        }
                      </div>
                      <p className="text-sm font-semibold text-slate-800">{m.milestone}</p>
                      {m.description && <p className="text-xs text-slate-500 mt-0.5">{m.description}</p>}
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-400">
                        {m.teacherName && <span>By {m.teacherName}</span>}
                        {m.achievedDate && <span>Achieved {new Date(m.achievedDate).toLocaleDateString()}</span>}
                        {!m.isAchieved && m.createdAt && <span>Added {new Date(m.createdAt).toLocaleDateString()}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </ParentPortalLayout>
  );
};

export default MilestoneView;
