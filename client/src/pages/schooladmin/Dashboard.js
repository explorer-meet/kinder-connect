import React, { useEffect, useMemo, useRef, useState } from 'react';
import Header from '../../components/Header';
import api from '../../api/api';
import useAuthStore from '../../store/authStore';
import { FaUsers, FaUserPlus, FaGraduationCap, FaPlus, FaLayerGroup, FaChild, FaTrash, FaBullhorn, FaTimes, FaUpload, FaFilePdf, FaImage, FaCheck, FaClock, FaBan } from 'react-icons/fa';

const TABS = ['staff', 'classes', 'enrollment', 'circulars', 'pickups'];

const emptyEnrollmentForm = {
  classId: '',
  batchId: '',
  studentId: '',
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  enrollmentNumber: '',
  // Father
  fatherFirstName: '',
  fatherLastName: '',
  parentEmail: '',        // father login email
  parentPhone: '',
  // Mother
  motherFirstName: '',
  motherLastName: '',
  secondParentEmail: '',  // mother login email
  secondParentPhone: '',
  // Guardian
  guardianFirstName: '',
  guardianLastName: '',
  // Documents stored as [{name, url}]
  documents: [],
};

export default function SchoolAdminDashboard() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('staff');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const [school, setSchool] = useState(null);
  const [classes, setClasses] = useState([]);
  const [staff, setStaff] = useState([]);
  const [students, setStudents] = useState([]);
  const [circulars, setCirculars] = useState([]);
  const [pickupRequests, setPickupRequests] = useState([]);

  const [showStaffForm, setShowStaffForm] = useState(false);
  const [showClassForm, setShowClassForm] = useState(false);
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [showEnrollmentForm, setShowEnrollmentForm] = useState(false);
  const [showCircularForm, setShowCircularForm] = useState(false);
  const [isEditingEnrollment, setIsEditingEnrollment] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const docInputRef = useRef(null);

  const [staffForm, setStaffForm] = useState({ firstName: '', lastName: '', email: '', phone: '', role: 'teacher', password: '' });
  const [classForm, setClassForm] = useState({ name: '', section: '', capacity: '' });
  const [batchForm, setBatchForm] = useState({ classId: '', shiftName: '', startTime: '09:00 AM', endTime: '12:00 PM', capacity: '' });
  const [enrollForm, setEnrollForm] = useState(emptyEnrollmentForm);
  const [circularForm, setCircularForm] = useState({ title: '', description: '', content: '', circularType: 'general', expiryDate: '' });

  const totalBatches = useMemo(() => classes.reduce((sum, cls) => sum + ((cls.batches || []).length), 0), [classes]);
  const selectedClassForEnroll = useMemo(() => classes.find((cls) => cls.id === enrollForm.classId) || null, [classes, enrollForm.classId]);

  const showMsg = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3500);
  };

  const loadSchool = async () => {
    const res = await api.get('/schooladmin/school');
    setSchool(res.data || null);
  };

  const loadClasses = async () => {
    const res = await api.get('/schooladmin/classes');
    setClasses(res.data || []);
  };

  const loadStaff = async () => {
    const res = await api.get('/schooladmin/staff');
    setStaff(res.data || []);
  };

  const loadStudents = async () => {
    const res = await api.get('/schooladmin/students');
    setStudents(res.data || []);
  };

  const loadCirculars = async () => {
    const res = await api.get('/schooladmin/circulars');
    setCirculars(res.data || []);
  };

  const loadPickupRequests = async () => {
    const res = await api.get('/schooladmin/pickup-requests');
    setPickupRequests(res.data || []);
  };

  const fetchData = async (tab) => {
    setLoading(true);
    try {
      if (tab === 'staff') await Promise.all([loadSchool(), loadStaff()]);
      if (tab === 'classes') await Promise.all([loadSchool(), loadClasses()]);
      if (tab === 'enrollment') await Promise.all([loadSchool(), loadClasses(), loadStudents()]);
      if (tab === 'circulars') await Promise.all([loadSchool(), loadCirculars()]);
      if (tab === 'pickups') await Promise.all([loadSchool(), loadPickupRequests()]);
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role !== 'school_admin') return;
    fetchData(activeTab);
  }, [activeTab, user?.role]);

  const handleAddStaff = async (e) => {
    e.preventDefault();
    try {
      await api.post('/schooladmin/staff', staffForm);
      showMsg('success', 'Staff added successfully');
      setShowStaffForm(false);
      setStaffForm({ firstName: '', lastName: '', email: '', phone: '', role: 'teacher', password: '' });
      loadStaff();
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Unable to add staff');
    }
  };

  const handleDeleteStaff = async (staffId) => {
    if (!window.confirm('Remove this staff member?')) return;
    try {
      await api.delete('/schooladmin/staff/' + staffId);
      showMsg('success', 'Staff removed');
      loadStaff();
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Unable to remove staff');
    }
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    try {
      await api.post('/schooladmin/class', classForm);
      showMsg('success', 'Class created');
      setShowClassForm(false);
      setClassForm({ name: '', section: '', capacity: '' });
      loadClasses();
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Unable to create class');
    }
  };

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    try {
      await api.post('/schooladmin/batch', batchForm);
      showMsg('success', 'Batch created');
      setShowBatchForm(false);
      setBatchForm({ classId: batchForm.classId, shiftName: '', startTime: '09:00 AM', endTime: '12:00 PM', capacity: '' });
      loadClasses();
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Unable to create batch');
    }
  };

  const handleEnrollStudent = async (e) => {
    e.preventDefault();
    if (!enrollForm.batchId || !enrollForm.firstName || !enrollForm.lastName) {
      return showMsg('error', 'Batch and student name are required');
    }

    try {
      const payload = {
        firstName: enrollForm.firstName,
        lastName: enrollForm.lastName,
        dateOfBirth: enrollForm.dateOfBirth || null,
        enrollmentNumber: enrollForm.enrollmentNumber || undefined,
        fatherFirstName: enrollForm.fatherFirstName || undefined,
        fatherLastName: enrollForm.fatherLastName || undefined,
        motherFirstName: enrollForm.motherFirstName || undefined,
        motherLastName: enrollForm.motherLastName || undefined,
        guardianFirstName: enrollForm.guardianFirstName || undefined,
        guardianLastName: enrollForm.guardianLastName || undefined,
        parentEmail: enrollForm.parentEmail || undefined,
        parentFirstName: enrollForm.fatherFirstName || undefined,
        parentLastName: enrollForm.fatherLastName || undefined,
        parentPhone: enrollForm.parentPhone || undefined,
        secondParentEmail: enrollForm.secondParentEmail || undefined,
        secondParentFirstName: enrollForm.motherFirstName || undefined,
        secondParentLastName: enrollForm.motherLastName || undefined,
        secondParentPhone: enrollForm.secondParentPhone || undefined,
        documents: enrollForm.documents,
      };

      const response = isEditingEnrollment
        ? await api.put('/schooladmin/student/' + enrollForm.studentId, payload)
        : await api.post('/schooladmin/batch/' + enrollForm.batchId + '/student', payload);

      const parentAccounts = response?.data?.parentAccounts || [];
      const newAccounts = parentAccounts.filter((p) => p?.isNewAccount);
      if (newAccounts.length > 0) {
        showMsg('success', `${isEditingEnrollment ? 'Student updated.' : 'Student enrolled.'} Parent login(s): ${newAccounts.map((a) => `${a.email} / ${a.password}`).join(' | ')}`);
      } else {
        showMsg('success', isEditingEnrollment ? 'Student updated successfully' : 'Student enrolled successfully');
      }

      setIsEditingEnrollment(false);
      setShowEnrollmentForm(false);
      setEnrollForm(emptyEnrollmentForm);
      loadStudents();
      loadClasses();
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Unable to enroll student');
    }
  };

  const handleDocumentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', file.name);
      const res = await api.post('/upload/document', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const doc = { name: res.data.name, url: res.data.url, uploadedAt: new Date().toISOString() };
      setEnrollForm((prev) => ({ ...prev, documents: [...prev.documents, doc] }));
      showMsg('success', `${file.name} uploaded`);
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Document upload failed');
    } finally {
      setUploadingDoc(false);
      if (docInputRef.current) docInputRef.current.value = '';
    }
  };

  const removeDocument = (idx) => {
    setEnrollForm((prev) => ({ ...prev, documents: prev.documents.filter((_, i) => i !== idx) }));
  };

  const startEditEnrollment = (student) => {
    setIsEditingEnrollment(true);
    setShowEnrollmentForm(true);
    setActiveTab('enrollment');
    setEnrollForm({
      classId: student.class?.id || '',
      batchId: student.batch?.id || '',
      studentId: student.id,
      firstName: student.firstName || '',
      lastName: student.lastName || '',
      dateOfBirth: student.dateOfBirth ? new Date(student.dateOfBirth).toISOString().slice(0, 10) : '',
      enrollmentNumber: student.enrollmentNumber || '',
      fatherFirstName: student.fatherFirstName || '',
      fatherLastName: student.fatherLastName || '',
      parentEmail: '',
      parentPhone: '',
      motherFirstName: student.motherFirstName || '',
      motherLastName: student.motherLastName || '',
      secondParentEmail: '',
      secondParentPhone: '',
      guardianFirstName: student.guardianFirstName || '',
      guardianLastName: student.guardianLastName || '',
      documents: Array.isArray(student.documents) ? student.documents : [],
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePickupAction = async (requestId, status) => {
    try {
      await api.put('/schooladmin/pickup-request/' + requestId, { status });
      showMsg('success', `Request ${status}`);
      loadPickupRequests();
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Action failed');
    }
  };

  const handleCircularSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/schooladmin/circular', circularForm);
      showMsg('success', 'Circular published successfully');
      setShowCircularForm(false);
      setCircularForm({ title: '', description: '', content: '', circularType: 'general', expiryDate: '' });
      loadCirculars();
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Unable to publish circular');
    }
  };

  const handleDeleteCircular = async (id) => {
    if (!window.confirm('Delete this circular?')) return;
    try {
      await api.delete('/schooladmin/circular/' + id);
      showMsg('success', 'Circular deleted');
      loadCirculars();
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Unable to delete circular');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-gray-900">{school?.name || 'School Admin Dashboard'}</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your school staff, classes, batches, students, and circulars.</p>
        </div>

        {message && <div className={'alert mb-5 ' + (message.type === 'success' ? 'alert-success' : 'alert-error')}>{message.text}</div>}

        <div className="flex gap-1 mb-6 border-b border-gray-200 overflow-x-auto">
          {TABS.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={'px-5 py-2.5 font-medium capitalize whitespace-nowrap text-sm transition-colors rounded-t-lg ' + (activeTab === tab ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100')}>
              {tab}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" /></div>
        ) : (
          <>
            {activeTab === 'staff' && (
              <div>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2"><FaUsers /> Staff ({staff.length})</h2>
                  {staff.length > 0 && !showStaffForm && (
                    <button onClick={() => setShowStaffForm(true)} className="btn btn-primary btn-sm flex items-center gap-2"><FaUserPlus /> Add Staff</button>
                  )}
                </div>
                {showStaffForm && (
                  <div className="card mb-6">
                    <form onSubmit={handleAddStaff} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input className="input" placeholder="First name" value={staffForm.firstName} onChange={(e) => setStaffForm({ ...staffForm, firstName: e.target.value })} required />
                      <input className="input" placeholder="Last name" value={staffForm.lastName} onChange={(e) => setStaffForm({ ...staffForm, lastName: e.target.value })} required />
                      <input className="input" type="email" placeholder="Email" value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} required />
                      <input className="input" placeholder="Phone" value={staffForm.phone} onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })} />
                      <select className="input" value={staffForm.role} onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}><option value="teacher">Teacher</option></select>
                      <div className="input flex items-center text-gray-500 bg-gray-50">School: {school?.name || '-'}</div>
                      <input className="input md:col-span-2" type="password" placeholder="Temporary password" value={staffForm.password} onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })} required />
                      <div className="md:col-span-2 flex gap-3"><button type="submit" className="btn btn-primary">Save Staff</button><button type="button" onClick={() => setShowStaffForm(false)} className="btn btn-outline">Cancel</button></div>
                    </form>
                  </div>
                )}
                {!showStaffForm && (
                  <>
                    {staff.length === 0 ? (
                      <div className="card text-center py-12">
                        <p className="text-gray-600 mb-4">No staff added yet.</p>
                        <button type="button" onClick={() => setShowStaffForm(true)} className="btn btn-primary mx-auto flex items-center gap-2"><FaUserPlus /> Add First Staff</button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {staff.map((s) => (
                          <div key={s.id} className="card">
                            <div className="font-semibold text-gray-800">{s.firstName} {s.lastName}</div>
                            <div className="text-sm text-gray-500">{s.email}</div>
                            <div className="text-xs mt-2 inline-block px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 capitalize">{s.role}</div>
                            <div className="mt-3"><button onClick={() => handleDeleteStaff(s.id)} className="btn btn-sm btn-danger flex items-center gap-2"><FaTrash /> Remove</button></div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {activeTab === 'classes' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800">Classes and Batches</h3>
                  {classes.length > 0 && (
                    <div className="flex gap-2">
                      <button type="button" onClick={() => { setShowBatchForm(false); setShowClassForm((v) => !v); }} className="btn btn-outline btn-sm flex items-center gap-2"><FaPlus /> Add Class</button>
                      <button type="button" onClick={() => { setShowClassForm(false); setShowBatchForm((v) => !v); }} className="btn btn-primary btn-sm flex items-center gap-2"><FaPlus /> Add Batch</button>
                    </div>
                  )}
                </div>

                {showClassForm && (
                  <div className="card">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><FaGraduationCap /> Create Class</h3>
                    <form onSubmit={handleCreateClass} className="space-y-3">
                      <div className="text-sm text-gray-500">School: {school?.name || '-'}</div>
                      <input className="input" placeholder="Class name (e.g. JR.KG)" value={classForm.name} onChange={(e) => setClassForm({ ...classForm, name: e.target.value })} required />
                      <input className="input" placeholder="Section (optional)" value={classForm.section} onChange={(e) => setClassForm({ ...classForm, section: e.target.value })} />
                      <input className="input" type="number" placeholder="Capacity (optional)" value={classForm.capacity} onChange={(e) => setClassForm({ ...classForm, capacity: e.target.value })} />
                      <div className="flex gap-2"><button type="submit" className="btn btn-primary flex items-center gap-2"><FaPlus /> Create Class</button><button type="button" className="btn btn-outline" onClick={() => setShowClassForm(false)}>Cancel</button></div>
                    </form>
                  </div>
                )}

                {showBatchForm && (
                  <div className="card">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><FaLayerGroup /> Create Batch</h3>
                    <form onSubmit={handleCreateBatch} className="space-y-3">
                      <div className="text-sm text-gray-500">School: {school?.name || '-'}</div>
                      <select className="input" value={batchForm.classId} onChange={(e) => setBatchForm({ ...batchForm, classId: e.target.value })} required>
                        <option value="">Select Class</option>
                        {classes.map((c) => <option key={c.id} value={c.id}>{c.name} {c.section || ''}</option>)}
                      </select>
                      <input className="input" placeholder="Shift name (Morning/Evening)" value={batchForm.shiftName} onChange={(e) => setBatchForm({ ...batchForm, shiftName: e.target.value })} required />
                      <div className="grid grid-cols-2 gap-2"><input className="input" placeholder="Start time" value={batchForm.startTime} onChange={(e) => setBatchForm({ ...batchForm, startTime: e.target.value })} /><input className="input" placeholder="End time" value={batchForm.endTime} onChange={(e) => setBatchForm({ ...batchForm, endTime: e.target.value })} /></div>
                      <input className="input" type="number" placeholder="Capacity (optional)" value={batchForm.capacity} onChange={(e) => setBatchForm({ ...batchForm, capacity: e.target.value })} />
                      <div className="flex gap-2"><button type="submit" className="btn btn-primary flex items-center gap-2"><FaPlus /> Create Batch</button><button type="button" className="btn btn-outline" onClick={() => setShowBatchForm(false)}>Cancel</button></div>
                    </form>
                  </div>
                )}

                {!showClassForm && !showBatchForm && classes.length === 0 && (
                  <div className="card text-center py-12">
                    <p className="text-gray-600 mb-4">No classes yet.</p>
                    <button type="button" onClick={() => setShowClassForm(true)} className="btn btn-primary mx-auto flex items-center gap-2"><FaPlus /> Start First Class</button>
                  </div>
                )}

                {!showClassForm && !showBatchForm && classes.length > 0 && (
                  <div className="space-y-4">
                    {classes.map((c) => (
                      <div key={c.id} className="card">
                        <div className="font-semibold text-gray-800">{c.name} {c.section || ''}</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {(c.batches || []).map((bt) => <span key={bt.id} className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{bt.shiftName} ({bt.startTime}-{bt.endTime})</span>)}
                          {(c.batches || []).length === 0 && <span className="text-xs text-gray-400">No batches</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'enrollment' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800">Enrolled Students ({students.length})</h3>
                  {students.length > 0 && !isEditingEnrollment && !showEnrollmentForm && (
                    <button type="button" onClick={() => setShowEnrollmentForm(true)} className="btn btn-primary btn-sm flex items-center gap-2"><FaPlus /> Enroll Student</button>
                  )}
                </div>

                {(showEnrollmentForm || isEditingEnrollment) && (
                  <div className="card space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-800 flex items-center gap-2"><FaChild /> {isEditingEnrollment ? 'Edit Enrollment' : 'Enroll New Student'}</h3>
                      <button type="button" className="text-gray-400 hover:text-gray-600" onClick={() => { setIsEditingEnrollment(false); setShowEnrollmentForm(false); setEnrollForm(emptyEnrollmentForm); }}><FaTimes /></button>
                    </div>

                    <form onSubmit={handleEnrollStudent} className="space-y-6">
                      {/* ── Class & Batch ── */}
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Class & Batch</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="input bg-gray-50 text-gray-500 flex items-center">School: {school?.name || '-'}</div>
                          <input className="input" placeholder="Enrollment number (optional)" value={enrollForm.enrollmentNumber} onChange={(e) => setEnrollForm({ ...enrollForm, enrollmentNumber: e.target.value })} />
                          <select className="input" value={enrollForm.classId} onChange={(e) => setEnrollForm({ ...enrollForm, classId: e.target.value, batchId: '' })} required>
                            <option value="">Select Class</option>
                            {classes.map((c) => <option key={c.id} value={c.id}>{c.name} {c.section || ''}</option>)}
                          </select>
                          <select className="input" value={enrollForm.batchId} onChange={(e) => setEnrollForm({ ...enrollForm, batchId: e.target.value })} required>
                            <option value="">Select Batch</option>
                            {(selectedClassForEnroll?.batches || []).map((bt) => <option key={bt.id} value={bt.id}>{bt.shiftName} ({bt.startTime}-{bt.endTime})</option>)}
                          </select>
                        </div>
                      </div>

                      {/* ── Child Info ── */}
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Child Information</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input className="input" placeholder="First name *" value={enrollForm.firstName} onChange={(e) => setEnrollForm({ ...enrollForm, firstName: e.target.value })} required />
                          <input className="input" placeholder="Last name *" value={enrollForm.lastName} onChange={(e) => setEnrollForm({ ...enrollForm, lastName: e.target.value })} required />
                          <div className="md:col-span-2">
                            <label className="block text-xs text-gray-500 mb-1">Date of Birth</label>
                            <input className="input" type="date" value={enrollForm.dateOfBirth} onChange={(e) => setEnrollForm({ ...enrollForm, dateOfBirth: e.target.value })} />
                          </div>
                        </div>
                      </div>

                      {/* ── Father ── */}
                      <div className="bg-blue-50 rounded-xl p-4 space-y-3">
                        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Father's Details</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input className="input" placeholder="Father's first name" value={enrollForm.fatherFirstName} onChange={(e) => setEnrollForm({ ...enrollForm, fatherFirstName: e.target.value })} />
                          <input className="input" placeholder="Father's last name" value={enrollForm.fatherLastName} onChange={(e) => setEnrollForm({ ...enrollForm, fatherLastName: e.target.value })} />
                          <input className="input" type="email" placeholder="Father's email (login)" value={enrollForm.parentEmail} onChange={(e) => setEnrollForm({ ...enrollForm, parentEmail: e.target.value })} />
                          <input className="input" placeholder="Father's phone" value={enrollForm.parentPhone} onChange={(e) => setEnrollForm({ ...enrollForm, parentPhone: e.target.value })} />
                        </div>
                        <p className="text-xs text-blue-500">A parent account will be created with this email if it does not already exist.</p>
                      </div>

                      {/* ── Mother ── */}
                      <div className="bg-pink-50 rounded-xl p-4 space-y-3">
                        <p className="text-xs font-semibold text-pink-700 uppercase tracking-wide">Mother's Details</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input className="input" placeholder="Mother's first name" value={enrollForm.motherFirstName} onChange={(e) => setEnrollForm({ ...enrollForm, motherFirstName: e.target.value })} />
                          <input className="input" placeholder="Mother's last name" value={enrollForm.motherLastName} onChange={(e) => setEnrollForm({ ...enrollForm, motherLastName: e.target.value })} />
                          <input className="input" type="email" placeholder="Mother's email (login)" value={enrollForm.secondParentEmail} onChange={(e) => setEnrollForm({ ...enrollForm, secondParentEmail: e.target.value })} />
                          <input className="input" placeholder="Mother's phone" value={enrollForm.secondParentPhone} onChange={(e) => setEnrollForm({ ...enrollForm, secondParentPhone: e.target.value })} />
                        </div>
                        <p className="text-xs text-pink-500">A parent account will be created with this email if it does not already exist.</p>
                      </div>

                      {/* ── Legal Guardian ── */}
                      <div className="bg-amber-50 rounded-xl p-4 space-y-3">
                        <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Legal Guardian (if applicable)</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input className="input" placeholder="Guardian's first name" value={enrollForm.guardianFirstName} onChange={(e) => setEnrollForm({ ...enrollForm, guardianFirstName: e.target.value })} />
                          <input className="input" placeholder="Guardian's last name" value={enrollForm.guardianLastName} onChange={(e) => setEnrollForm({ ...enrollForm, guardianLastName: e.target.value })} />
                        </div>
                        <p className="text-xs text-amber-600">By default, father, mother, or legal guardian are authorized to pick up and drop the child.</p>
                      </div>

                      {/* ── Documents ── */}
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Documents</p>
                        <p className="text-xs text-gray-500 mb-3">Upload Birth Certificate, Aadhar Card, or any other supporting documents (JPEG, PNG, PDF — max 10 MB each).</p>
                        <div className="flex flex-wrap gap-3 mb-3">
                          {enrollForm.documents.map((doc, idx) => (
                            <div key={idx} className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 text-sm">
                              {doc.url?.endsWith('.pdf') ? <FaFilePdf className="text-red-500" /> : <FaImage className="text-blue-500" />}
                              <a href={doc.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline max-w-[160px] truncate">{doc.name}</a>
                              <button type="button" onClick={() => removeDocument(idx)} className="text-gray-400 hover:text-red-500 ml-1"><FaTimes size={12} /></button>
                            </div>
                          ))}
                        </div>
                        <input ref={docInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleDocumentUpload} />
                        <button type="button" onClick={() => docInputRef.current?.click()} disabled={uploadingDoc} className="btn btn-outline btn-sm flex items-center gap-2">
                          {uploadingDoc ? <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" /> : <FaUpload />}
                          {uploadingDoc ? 'Uploading…' : 'Upload Document'}
                        </button>
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button type="submit" className="btn btn-primary">{isEditingEnrollment ? 'Update Student' : 'Enroll Student'}</button>
                        <button type="button" className="btn btn-outline" onClick={() => { setIsEditingEnrollment(false); setShowEnrollmentForm(false); setEnrollForm(emptyEnrollmentForm); }}>Cancel</button>
                      </div>
                    </form>
                  </div>
                )}

                {!showEnrollmentForm && !isEditingEnrollment && students.length === 0 && (
                  <div className="card text-center py-12">
                    <p className="text-gray-600 mb-4">No students enrolled yet.</p>
                    <button type="button" onClick={() => setShowEnrollmentForm(true)} className="btn btn-primary mx-auto flex items-center gap-2"><FaPlus /> Enroll First Student</button>
                  </div>
                )}

                {!showEnrollmentForm && !isEditingEnrollment && students.length > 0 && (
                  <div className="card overflow-x-auto">
                    <table className="table w-full">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Father</th>
                          <th>Mother</th>
                          <th>Class</th>
                          <th>Batch</th>
                          <th>Docs</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((s) => (
                          <tr key={s.id}>
                            <td className="font-medium">{s.firstName} {s.lastName}</td>
                            <td>{s.fatherFirstName ? `${s.fatherFirstName} ${s.fatherLastName || ''}` : <span className="text-gray-400">—</span>}</td>
                            <td>{s.motherFirstName ? `${s.motherFirstName} ${s.motherLastName || ''}` : <span className="text-gray-400">—</span>}</td>
                            <td>{s.class?.name} {s.class?.section || ''}</td>
                            <td>{s.batch?.shiftName || '-'}</td>
                            <td>{Array.isArray(s.documents) && s.documents.length > 0 ? <span className="text-xs text-green-600 font-medium">{s.documents.length} file(s)</span> : <span className="text-xs text-gray-400">None</span>}</td>
                            <td><button className="btn btn-sm btn-outline" onClick={() => startEditEnrollment(s)}>Edit</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'pickups' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-800">Pickup / Drop Requests</h2>
                  <button type="button" onClick={loadPickupRequests} className="btn btn-outline btn-sm">Refresh</button>
                </div>

                {pickupRequests.length === 0 ? (
                  <div className="card text-center py-12">
                    <p className="text-gray-600">No pickup requests yet.</p>
                    <p className="text-sm text-gray-400 mt-1">When a parent requests someone else to pick up their child, it will appear here for your approval.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pickupRequests.map((req) => (
                      <div key={req.id} className="card flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex-1 space-y-1">
                          <div className="font-semibold text-gray-800">{req.student?.firstName} {req.student?.lastName}</div>
                          <div className="text-sm text-gray-600">Pickup Person: <span className="font-medium">{req.personName}</span></div>
                          <div className="text-sm text-gray-600">Mobile: <span className="font-medium">{req.mobileNumber}</span></div>
                          {req.photoUrl && <a href={req.photoUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline">View Photo</a>}
                          <div className="text-xs text-gray-400">{new Date(req.createdAt).toLocaleString()}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {req.status === 'pending' ? (
                            <>
                              <button onClick={() => handlePickupAction(req.id, 'approved')} className="btn btn-sm bg-green-500 hover:bg-green-600 text-white flex items-center gap-1"><FaCheck /> Approve</button>
                              <button onClick={() => handlePickupAction(req.id, 'rejected')} className="btn btn-sm btn-danger flex items-center gap-1"><FaBan /> Reject</button>
                            </>
                          ) : (
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${req.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {req.status === 'approved' ? <FaCheck /> : <FaBan />}
                              {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'circulars' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center"><h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2"><FaBullhorn /> Circulars ({circulars.length})</h2>{circulars.length > 0 && !showCircularForm && <button onClick={() => setShowCircularForm(true)} className="btn btn-primary btn-sm flex items-center gap-2"><FaPlus /> New Circular</button>}</div>
                {showCircularForm && (
                  <div className="card border-2 border-purple-100">
                    <div className="flex justify-between items-center mb-3"><h3 className="font-semibold text-gray-800">Publish Circular</h3><button onClick={() => setShowCircularForm(false)} className="text-gray-400 hover:text-gray-600"><FaTimes /></button></div>
                    <form onSubmit={handleCircularSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input className="input md:col-span-2" placeholder="Title" value={circularForm.title} onChange={(e) => setCircularForm({ ...circularForm, title: e.target.value })} required />
                      <textarea className="input md:col-span-2" rows={3} placeholder="Description" value={circularForm.description} onChange={(e) => setCircularForm({ ...circularForm, description: e.target.value })} required />
                      <textarea className="input md:col-span-2" rows={3} placeholder="Detailed content (optional)" value={circularForm.content} onChange={(e) => setCircularForm({ ...circularForm, content: e.target.value })} />
                      <select className="input" value={circularForm.circularType} onChange={(e) => setCircularForm({ ...circularForm, circularType: e.target.value })}><option value="general">General</option><option value="event">Event</option><option value="holiday">Holiday</option><option value="fee">Fee</option><option value="notice">Notice</option></select>
                      <input className="input" type="date" value={circularForm.expiryDate} onChange={(e) => setCircularForm({ ...circularForm, expiryDate: e.target.value })} />
                      <div className="md:col-span-2 flex gap-2"><button type="submit" className="btn btn-primary">Publish</button><button type="button" className="btn btn-outline" onClick={() => setShowCircularForm(false)}>Cancel</button></div>
                    </form>
                  </div>
                )}
                {!showCircularForm && (
                  <>
                    {circulars.length === 0 ? (
                      <div className="card text-center py-12"><p className="text-gray-600 mb-4">No circulars yet.</p><button type="button" onClick={() => setShowCircularForm(true)} className="btn btn-primary mx-auto flex items-center gap-2"><FaPlus /> Publish First Circular</button></div>
                    ) : (
                      <div className="space-y-3">
                        {circulars.map((c) => (
                          <div key={c.id} className="card flex items-start justify-between gap-3"><div><div className="font-semibold text-gray-800">{c.title}</div><div className="text-sm text-gray-600 mt-1">{c.description}</div><div className="text-xs text-gray-400 mt-1">{c.circularType || 'general'} · School-wide · {new Date(c.publishDate || c.createdAt).toLocaleDateString()}</div></div><button className="btn btn-sm btn-danger" onClick={() => handleDeleteCircular(c.id)}><FaTrash /></button></div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
