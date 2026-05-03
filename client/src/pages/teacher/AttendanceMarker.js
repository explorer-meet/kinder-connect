import React, { useCallback, useEffect, useMemo, useState } from 'react';
import TeacherPortalLayout from '../../components/TeacherPortalLayout';
import api from '../../api/api';
import { FaClipboardList, FaSave, FaCheckCircle } from 'react-icons/fa';

const STATUS_OPTIONS = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'late', label: 'Late' },
  { value: 'half_day', label: 'Half Day' },
];

const toDateInput = (d) => {
  const date = new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const AttendanceMarker = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const [schoolData, setSchoolData] = useState(null);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [selectedDate, setSelectedDate] = useState(toDateInput(new Date()));

  const [students, setStudents] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});

  const allBatches = useMemo(() => {
    if (!schoolData?.classes) return [];
    const rows = [];
    schoolData.classes.forEach((cls) => {
      (cls.batches || []).forEach((b) => {
        rows.push({
          id: b.id,
          label: `${cls.name}${cls.section ? ` (${cls.section})` : ''} - ${b.shiftName} (${b.startTime}-${b.endTime})`,
        });
      });
    });
    return rows;
  }, [schoolData]);

  const showMsg = useCallback((type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3500);
  }, []);

  const loadSchoolData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/teacher/attendance/data');
      setSchoolData(res.data);

      const firstBatch = (res.data?.classes || []).flatMap((c) => c.batches || [])[0];
      if (firstBatch?.id) {
        setSelectedBatchId(firstBatch.id);
      }
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Failed to load teacher school data');
    } finally {
      setLoading(false);
    }
  }, [showMsg]);

  const loadBatchAttendance = useCallback(async (batchId, date) => {
    if (!batchId || !date) return;
    setLoading(true);
    try {
      const res = await api.get(`/teacher/attendance/batch/${batchId}?date=${date}`);
      const list = res.data?.batch?.students || [];
      const existing = res.data?.attendance || [];

      const map = {};
      list.forEach((s) => {
        map[s.id] = { status: 'present', notes: '' };
      });

      existing.forEach((a) => {
        map[a.studentId] = {
          status: a.status,
          notes: a.notes || '',
        };
      });

      setStudents(list);
      setAttendanceMap(map);
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Failed to load attendance');
      setStudents([]);
      setAttendanceMap({});
    } finally {
      setLoading(false);
    }
  }, [showMsg]);

  useEffect(() => {
    loadSchoolData();
  }, [loadSchoolData]);

  useEffect(() => {
    if (selectedBatchId && selectedDate) {
      loadBatchAttendance(selectedBatchId, selectedDate);
    }
  }, [selectedBatchId, selectedDate, loadBatchAttendance]);

  const setAllStatus = (status) => {
    const next = { ...attendanceMap };
    students.forEach((s) => {
      next[s.id] = {
        ...(next[s.id] || { notes: '' }),
        status,
      };
    });
    setAttendanceMap(next);
  };

  const updateStudentStatus = (studentId, status) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { notes: '' }),
        status,
      },
    }));
  };

  const updateStudentNotes = (studentId, notes) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { status: 'present' }),
        notes,
      },
    }));
  };

  const saveAttendance = async () => {
    if (!selectedBatchId || students.length === 0) return;

    setSaving(true);
    try {
      const records = students.map((s) => ({
        studentId: s.id,
        status: attendanceMap[s.id]?.status || 'present',
        notes: attendanceMap[s.id]?.notes || '',
      }));

      await api.post('/teacher/attendance/mark', {
        batchId: selectedBatchId,
        date: selectedDate,
        records,
      });

      showMsg('success', 'Attendance saved successfully');
      loadBatchAttendance(selectedBatchId, selectedDate);
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  return (
    <TeacherPortalLayout title="Mark Attendance">
      <div>
        <h2 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-3">
          <FaClipboardList /> Mark Attendance
        </h2>
        <p className="text-gray-500 mb-6">Select batch and date, then mark student attendance.</p>

        {message && (
          <div className={`alert mb-5 ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
            {message.text}
          </div>
        )}

        <div className="card mb-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="label">Batch</label>
              <select
                className="input"
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
              >
                <option value="">Select batch</option>
                {allBatches.map((b) => (
                  <option key={b.id} value={b.id}>{b.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Date</label>
              <input
                className="input"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => loadBatchAttendance(selectedBatchId, selectedDate)}
                className="btn btn-outline w-full"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="card">
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Students ({students.length})</h3>
              <div className="flex gap-2">
                <button type="button" className="btn btn-sm btn-outline" onClick={() => setAllStatus('present')}>Mark All Present</button>
                <button type="button" className="btn btn-sm btn-outline" onClick={() => setAllStatus('absent')}>Mark All Absent</button>
              </div>
            </div>

            {students.length === 0 ? (
              <p className="text-gray-500">No students found for selected batch.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table w-full">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Enrollment</th>
                      <th>Status</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s) => (
                      <tr key={s.id}>
                        <td>{s.firstName} {s.lastName}</td>
                        <td>{s.enrollmentNumber || '-'}</td>
                        <td>
                          <select
                            className="input"
                            value={attendanceMap[s.id]?.status || 'present'}
                            onChange={(e) => updateStudentStatus(s.id, e.target.value)}
                          >
                            {STATUS_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            className="input"
                            placeholder="Optional notes"
                            value={attendanceMap[s.id]?.notes || ''}
                            onChange={(e) => updateStudentNotes(s.id, e.target.value)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-5">
              <button
                type="button"
                className="btn btn-primary flex items-center gap-2"
                onClick={saveAttendance}
                disabled={saving || students.length === 0 || !selectedBatchId}
              >
                {saving ? 'Saving...' : (<><FaSave /> Save Attendance <FaCheckCircle /></>)}
              </button>
            </div>
          </div>
        )}
      </div>
    </TeacherPortalLayout>
  );
};

export default AttendanceMarker;
