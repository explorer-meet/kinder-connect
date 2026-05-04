import React, { useCallback, useEffect, useMemo, useState } from 'react';
import TeacherPortalLayout from '../../components/TeacherPortalLayout';
import api from '../../api/api';
import { FaStethoscope, FaChevronDown, FaEye, FaHeartbeat, FaNotesMedical, FaTimes } from 'react-icons/fa';

const MEDICAL_FLAGS = [
  { key: 'hasAllergies', label: 'Allergies' },
  { key: 'asthma', label: 'Asthma' },
  { key: 'diabetes', label: 'Diabetes' },
  { key: 'epilepsy', label: 'Epilepsy / Seizures' },
  { key: 'heartCondition', label: 'Heart condition' },
  { key: 'visionConcern', label: 'Vision concern' },
  { key: 'hearingConcern', label: 'Hearing concern' },
  { key: 'foodRestriction', label: 'Food restriction' },
  { key: 'onMedication', label: 'Regular medication' },
  { key: 'surgeryHistory', label: 'Surgery history' },
  { key: 'hospitalizationHistory', label: 'Hospitalization history' },
  { key: 'specialNeeds', label: 'Special needs support' },
  { key: 'requiresEmergencyMedication', label: 'Emergency medication required' },
  { key: 'immunizationsUpToDate', label: 'Immunizations up to date' },
];

const MedicalRecords = () => {
  const [schoolData, setSchoolData] = useState(null);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const showMsg = useCallback((type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }, []);

  const allBatches = useMemo(() => {
    if (!schoolData?.classes) return [];
    return schoolData.classes.flatMap((cls) =>
      (cls.batches || []).map((batch) => ({
        id: batch.id,
        label: `${cls.name}${cls.section ? ` (${cls.section})` : ''} - ${batch.shiftName}`,
      }))
    );
  }, [schoolData]);

  const loadSchoolData = useCallback(async () => {
    try {
      const res = await api.get('/teacher/attendance/data');
      setSchoolData(res.data);
      const firstBatch = (res.data?.classes || []).flatMap((cls) => cls.batches || [])[0];
      if (firstBatch?.id) setSelectedBatchId(firstBatch.id);
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Failed to load school data');
    }
  }, [showMsg]);

  const loadBatchMedical = useCallback(async (batchId) => {
    if (!batchId) return;
    setLoading(true);
    setSelectedStudent(null);
    setIsDetailOpen(false);
    try {
      const res = await api.get(`/teacher/medical/batch/${batchId}`);
      setStudents(res.data?.students || []);
    } catch (err) {
      setStudents([]);
      showMsg('error', err.response?.data?.error || 'Failed to load medical records');
    } finally {
      setLoading(false);
    }
  }, [showMsg]);

  const loadStudentMedical = useCallback(async (studentId) => {
    if (!studentId) return;
    setDetailLoading(true);
    setIsDetailOpen(true);
    try {
      const res = await api.get(`/teacher/medical/student/${studentId}`);
      setSelectedStudent(res.data);
    } catch (err) {
      setSelectedStudent(null);
      setIsDetailOpen(false);
      showMsg('error', err.response?.data?.error || 'Failed to load student medical details');
    } finally {
      setDetailLoading(false);
    }
  }, [showMsg]);

  useEffect(() => { loadSchoolData(); }, [loadSchoolData]);

  useEffect(() => {
    if (selectedBatchId) loadBatchMedical(selectedBatchId);
  }, [selectedBatchId, loadBatchMedical]);

  const getAge = (dob) => {
    if (!dob) return 'N/A';
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age -= 1;
    return age;
  };

  const activeFlags = selectedStudent?.medicalProfile
    ? MEDICAL_FLAGS.filter((flag) => selectedStudent.medicalProfile?.[flag.key])
    : [];

  return (
    <TeacherPortalLayout title="Medical Records">
      <div className="space-y-5">
        {message && (
          <div className={`rounded-2xl px-4 py-3 text-sm font-medium ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
            {message.text}
          </div>
        )}

        <div className="bg-gradient-to-r from-rose-500 to-orange-500 rounded-3xl p-6 text-white shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center"><FaStethoscope size={22} /></div>
            <div>
              <h2 className="text-2xl font-bold">Medical Records</h2>
              <p className="text-rose-100 text-sm">Review student medical history submitted by parents, batch by batch.</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Batch</label>
          <div className="relative max-w-md">
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm font-medium text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
            >
              {allBatches.map((batch) => (
                <option key={batch.id} value={batch.id}>{batch.label}</option>
              ))}
            </select>
            <FaChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 overflow-x-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">Students</h3>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-100">{students.length} records</span>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500" /></div>
          ) : students.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-slate-500">No students found for this batch.</div>
          ) : (
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Enrollment</th>
                  <th>Age</th>
                  <th>Medical</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id}>
                    <td>
                      <div>
                        <p className="font-semibold text-slate-800">{student.firstName} {student.lastName}</p>
                        <p className="text-xs text-slate-500">{student.isActive ? 'Active' : 'Inactive'}</p>
                      </div>
                    </td>
                    <td>{student.enrollmentNumber || '-'}</td>
                    <td>{getAge(student.dateOfBirth)}</td>
                    <td>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${student.hasMedicalData ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {student.hasMedicalData ? 'Available' : 'Empty'}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => loadStudentMedical(student.id)}
                        className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-3 py-2 flex items-center gap-1.5 transition"
                      >
                        <FaEye size={11} /> View Medical
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {isDetailOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
            <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl border border-slate-200">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur">
                <h3 className="text-lg font-bold text-slate-900">Medical Detail</h3>
                <button
                  onClick={() => {
                    setIsDetailOpen(false);
                    setSelectedStudent(null);
                  }}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition hover:bg-slate-200"
                >
                  <FaTimes size={14} />
                </button>
              </div>

              <div className="p-5">
                {detailLoading ? (
                  <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500" /></div>
                ) : !selectedStudent ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-slate-500">Medical details are not available.</div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-2xl bg-gradient-to-r from-rose-50 to-orange-50 border border-rose-100 p-4">
                      <p className="text-lg font-bold text-slate-900">{selectedStudent.firstName} {selectedStudent.lastName}</p>
                      <p className="text-sm text-slate-600 mt-1">{selectedStudent.class?.name || ''} {selectedStudent.class?.section || ''} · {selectedStudent.batch?.shiftName || ''}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Allergies</p>
                        <p className="text-sm font-medium text-slate-800 mt-1">{selectedStudent.allergies?.length ? selectedStudent.allergies.join(', ') : 'None listed'}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Doctor</p>
                        <p className="text-sm font-medium text-slate-800 mt-1">{selectedStudent.medicalProfile?.doctorName || 'Not provided'}</p>
                        <p className="text-xs text-slate-500 mt-1">{selectedStudent.medicalProfile?.doctorPhone || ''}</p>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-3 text-slate-800 font-semibold"><FaHeartbeat className="text-rose-500" /> Active Medical Flags</div>
                      {activeFlags.length === 0 ? (
                        <p className="text-sm text-slate-500">No active medical flags submitted.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {activeFlags.map((flag) => (
                            <span key={flag.key} className="rounded-full px-3 py-1 text-xs font-semibold bg-rose-100 text-rose-700 border border-rose-200">{flag.label}</span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-center gap-2 mb-2 text-slate-800 font-semibold"><FaNotesMedical className="text-orange-500" /> Additional Notes</div>
                      <p className="text-sm text-slate-600 whitespace-pre-wrap">{selectedStudent.medicalProfile?.additionalNotes || selectedStudent.medicalNotes || 'No additional notes provided.'}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </TeacherPortalLayout>
  );
};

export default MedicalRecords;