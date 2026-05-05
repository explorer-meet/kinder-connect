import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/api';
import { FaClipboardList } from 'react-icons/fa';
import ParentPortalLayout from '../../components/ParentPortalLayout';

const AttendanceView = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [student, setStudent] = useState(null);
  const [attendance, setAttendance] = useState([]);

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/students/parent/child/${studentId}/attendance`);
        setStudent(res.data?.student || null);
        setAttendance(res.data?.attendance || []);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load attendance');
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, [studentId]);

  const summary = useMemo(() => {
    const total = attendance.length;
    const present = attendance.filter((a) => a.status === 'present').length;
    const absent = attendance.filter((a) => a.status === 'absent').length;
    const late = attendance.filter((a) => a.status === 'late').length;
    const halfDay = attendance.filter((a) => a.status === 'half_day').length;
    return { total, present, absent, late, halfDay };
  }, [attendance]);

  const statusBadgeClass = (status) => {
    if (status === 'present') return 'bg-green-100 text-green-700';
    if (status === 'absent') return 'bg-red-100 text-red-700';
    if (status === 'late') return 'bg-amber-100 text-amber-700';
    if (status === 'half_day') return 'bg-blue-100 text-blue-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <ParentPortalLayout
      title="Attendance"
      subtitle={student ? `${student.firstName} ${student.lastName} attendance summary` : 'Daily attendance records'}
      accent="emerald"
      rightAction={{ label: 'Back to Dashboard', onClick: () => navigate('/parent/dashboard') }}
    >
      {loading ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500" />
          </div>
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-4 text-rose-700">{error}</div>
      ) : (
        <>
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 mb-6">
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <FaClipboardList className="text-emerald-600" /> Attendance for {student?.firstName} {student?.lastName}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {student?.class?.name} {student?.class?.section || ''} · {student?.batch?.shiftName || 'Batch'}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4"><div className="text-sm text-slate-500">Total</div><div className="text-2xl font-bold text-slate-900">{summary.total}</div></div>
            <div className="rounded-3xl border border-emerald-100 bg-emerald-50 shadow-sm p-4"><div className="text-sm text-emerald-600">Present</div><div className="text-2xl font-bold text-emerald-700">{summary.present}</div></div>
            <div className="rounded-3xl border border-rose-100 bg-rose-50 shadow-sm p-4"><div className="text-sm text-rose-600">Absent</div><div className="text-2xl font-bold text-rose-700">{summary.absent}</div></div>
            <div className="rounded-3xl border border-amber-100 bg-amber-50 shadow-sm p-4"><div className="text-sm text-amber-600">Late</div><div className="text-2xl font-bold text-amber-700">{summary.late}</div></div>
            <div className="rounded-3xl border border-blue-100 bg-blue-50 shadow-sm p-4"><div className="text-sm text-blue-600">Half Day</div><div className="text-2xl font-bold text-blue-700">{summary.halfDay}</div></div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
            {attendance.length === 0 ? (
              <p className="text-slate-500">No attendance records found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table w-full">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map((a) => (
                      <tr key={a.id}>
                        <td>{new Date(a.date).toLocaleDateString()}</td>
                        <td>
                          <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${statusBadgeClass(a.status)}`}>
                            {a.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="text-slate-500 text-sm">{a.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </ParentPortalLayout>
  );
};

export default AttendanceView;
