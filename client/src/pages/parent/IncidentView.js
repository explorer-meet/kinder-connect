import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/api';
import ParentPortalLayout from '../../components/ParentPortalLayout';
import { FaExclamationTriangle, FaClock, FaBell, FaCheckCircle } from 'react-icons/fa';

const SEVERITIES = [
  { value: 'minor',    label: 'Minor',    color: 'amber'  },
  { value: 'moderate', label: 'Moderate', color: 'orange' },
  { value: 'severe',   label: 'Severe',   color: 'red'    },
];

const SEV_COLORS = {
  amber:  { bg: 'bg-amber-50',  border: 'border-amber-200',  badge: 'bg-amber-100 text-amber-700',   icon: 'text-amber-500'  },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-700', icon: 'text-orange-500' },
  red:    { bg: 'bg-rose-50',   border: 'border-rose-200',   badge: 'bg-rose-100 text-rose-700',     icon: 'text-rose-500'   },
};

const IncidentView = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [incidents, setIncidents] = useState([]);
  const [filterSeverity, setFilterSeverity] = useState('');

  const loadIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/parent/child/${studentId}/incidents`);
      setIncidents(res.data || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load incident reports');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { loadIncidents(); }, [loadIncidents]);

  const filtered = useMemo(
    () => filterSeverity ? incidents.filter((i) => i.severity === filterSeverity) : incidents,
    [incidents, filterSeverity]
  );

  const sevCount = (v) => incidents.filter((i) => i.severity === v).length;

  return (
    <ParentPortalLayout
      title="Incident Reports"
      subtitle="View all reported incidents for your child"
      accent="rose"
      rightAction={{ label: 'Back to Dashboard', onClick: () => navigate('/parent/dashboard') }}
    >
      {loading ? (
        <div className="flex items-center justify-center min-h-64 bg-white rounded-3xl border border-slate-200 shadow-sm">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-500" />
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-rose-700 text-sm">{error}</div>
      ) : (
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            {SEVERITIES.map((s) => {
              const c = SEV_COLORS[s.color];
              const cnt = sevCount(s.value);
              return (
                <div key={s.value} className={`rounded-2xl border ${c.border} ${c.bg} shadow-sm p-4 text-center`}>
                  <div className={`text-3xl font-bold ${c.icon}`}>{cnt}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
                </div>
              );
            })}
          </div>

          {/* Parent notification banner */}
          {incidents.some((i) => i.parentNotified) && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 flex items-center gap-3 text-blue-700 text-sm">
              <FaBell />
              <span>The school has notified you about one or more incidents. Please review below.</span>
            </div>
          )}

          {/* Severity filter */}
          <div className="flex flex-wrap gap-2">
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
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold border transition ${filterSeverity === s.value ? `${c.bg} ${c.border} ${c.icon}` : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>

          {/* Incidents list */}
          {filtered.length === 0 ? (
            <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center">
              <FaExclamationTriangle className="mx-auto text-4xl text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">No incident reports</p>
              <p className="text-sm text-slate-400 mt-1">No incidents have been recorded for your child</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((incident) => {
                const sev = SEVERITIES.find((s) => s.value === incident.severity) || SEVERITIES[0];
                const c = SEV_COLORS[sev.color];
                return (
                  <div key={incident.id} className={`bg-white rounded-2xl border ${c.border} shadow-sm p-5`}>
                    <div className="flex gap-4 items-start">
                      <div className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${c.bg}`}>
                        <FaExclamationTriangle className={c.icon} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span className={`rounded-full px-3 py-0.5 text-xs font-bold ${c.badge}`}>{sev.label}</span>
                          <span className="text-sm font-bold text-slate-800">{incident.incidentType}</span>
                          {incident.escalationLevel && incident.escalationLevel !== 'none' && (
                            <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700">
                              Escalated: {incident.escalationLevel}
                            </span>
                          )}
                          {incident.escalationStatus && incident.escalationLevel && incident.escalationLevel !== 'none' && (
                            <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-violet-100 text-violet-700">
                              {incident.escalationStatus.replace('_', ' ')}
                            </span>
                          )}
                          {incident.parentNotified && (
                            <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 flex items-center gap-1">
                              <FaCheckCircle size={9} /> School Notified You
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed">{incident.description}</p>
                        {incident.actionTaken && (
                          <div className="mt-2 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2 text-xs text-slate-600">
                            <span className="font-semibold text-slate-700">Action taken: </span>{incident.actionTaken}
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-400">
                          <span className="flex items-center gap-1"><FaClock size={10} /> {new Date(incident.incidentTime).toLocaleString()}</span>
                          {incident.teacherName && <span>Reported by {incident.teacherName}</span>}
                        </div>
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

export default IncidentView;
