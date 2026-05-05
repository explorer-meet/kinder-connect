import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../api/api';
import useAuthStore from '../../store/authStore';
import {
  FaCamera, FaBook, FaClipboardList, FaCalendarAlt,
  FaArrowRight, FaShuttleVan, FaPlus, FaTimes, FaCheck, FaBan,
  FaClock, FaUpload, FaBullhorn, FaChild, FaHome, FaSignOutAlt,
  FaChevronRight, FaMapMarkerAlt, FaUser, FaGraduationCap, FaExclamationTriangle, FaSchool, FaStethoscope, FaWhatsapp, FaMoneyBillWave,
} from 'react-icons/fa';

const NAV = [
  { id: 'home',       label: 'Home',            icon: FaHome },
  { id: 'children',   label: 'My Children',     icon: FaChild },
  { id: 'activity',   label: 'Activity Feed',   icon: FaCamera },
  { id: 'attendance', label: 'Attendance',       icon: FaClipboardList },
  { id: 'report',     label: 'Reports',          icon: FaBook },
  { id: 'medical',    label: 'Medical Form',     icon: FaStethoscope },
  { id: 'milestones', label: 'Milestones',       icon: FaGraduationCap },
  { id: 'incidents',  label: 'Incident Reports', icon: FaExclamationTriangle },
  { id: 'ptm',        label: 'PTM Schedule',     icon: FaCalendarAlt },
  { id: 'fees',       label: 'Fee Reminders',    icon: FaMoneyBillWave },
  { id: 'pickup',     label: 'Pickup / Drop',    icon: FaShuttleVan },
  { id: 'circulars',  label: 'Circulars',        icon: FaBullhorn },
];

const NAV_ICON_STYLES = {
  home:       { tone: 'text-blue-500',    soft: 'bg-blue-50'    },
  activity:   { tone: 'text-cyan-500',    soft: 'bg-cyan-50'    },
  attendance: { tone: 'text-indigo-500',  soft: 'bg-indigo-50'  },
  report:     { tone: 'text-violet-500',  soft: 'bg-violet-50'  },
  medical:    { tone: 'text-rose-500',    soft: 'bg-rose-50'    },
  milestones: { tone: 'text-emerald-500', soft: 'bg-emerald-50' },
  incidents:  { tone: 'text-rose-500',    soft: 'bg-rose-50'    },
  ptm:        { tone: 'text-amber-500',   soft: 'bg-amber-50'   },
  fees:       { tone: 'text-rose-500',    soft: 'bg-rose-50'    },
  pickup:     { tone: 'text-orange-500',  soft: 'bg-orange-50'  },
  circulars:  { tone: 'text-fuchsia-500', soft: 'bg-fuchsia-50' },
};

const AVATAR_COLORS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-500',
];

const createEmptyMedicalForm = () => ({
  hasAllergies: false,
  allergyDetails: '',
  asthma: false,
  diabetes: false,
  epilepsy: false,
  heartCondition: false,
  visionConcern: false,
  hearingConcern: false,
  foodRestriction: false,
  foodRestrictionDetails: '',
  onMedication: false,
  medicationDetails: '',
  surgeryHistory: false,
  surgeryDetails: '',
  hospitalizationHistory: false,
  hospitalizationDetails: '',
  specialNeeds: false,
  specialNeedsDetails: '',
  requiresEmergencyMedication: false,
  emergencyMedicationDetails: '',
  immunizationsUpToDate: true,
  bloodGroup: '',
  doctorName: '',
  doctorPhone: '',
  hospitalPreference: '',
  insuranceProvider: '',
  additionalNotes: '',
});

const MEDICAL_TOGGLES = [
  { key: 'hasAllergies', label: 'Allergies', detailKey: 'allergyDetails', detailLabel: 'Allergy details' },
  { key: 'asthma', label: 'Asthma' },
  { key: 'diabetes', label: 'Diabetes' },
  { key: 'epilepsy', label: 'Epilepsy / Seizures' },
  { key: 'heartCondition', label: 'Heart condition' },
  { key: 'visionConcern', label: 'Vision concern' },
  { key: 'hearingConcern', label: 'Hearing concern' },
  { key: 'foodRestriction', label: 'Food restriction', detailKey: 'foodRestrictionDetails', detailLabel: 'Food restriction details' },
  { key: 'onMedication', label: 'Regular medication', detailKey: 'medicationDetails', detailLabel: 'Medication details' },
  { key: 'surgeryHistory', label: 'Surgery history', detailKey: 'surgeryDetails', detailLabel: 'Surgery history details' },
  { key: 'hospitalizationHistory', label: 'Hospitalization history', detailKey: 'hospitalizationDetails', detailLabel: 'Hospitalization details' },
  { key: 'specialNeeds', label: 'Special needs support', detailKey: 'specialNeedsDetails', detailLabel: 'Special support details' },
  { key: 'requiresEmergencyMedication', label: 'Emergency medication required', detailKey: 'emergencyMedicationDetails', detailLabel: 'Emergency medication details' },
  { key: 'immunizationsUpToDate', label: 'Immunizations up to date' },
];

const statusBadge = (status) => {
  if (status === 'approved') return 'bg-emerald-100 text-emerald-700';
  if (status === 'rejected') return 'bg-red-100 text-red-700';
  return 'bg-amber-100 text-amber-700';
};

const circularTypeStyle = (type) => {
  const value = String(type || 'general').toLowerCase();
  if (value === 'event') return 'bg-cyan-50 text-cyan-700 border-cyan-100';
  if (value === 'holiday') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  if (value === 'notice') return 'bg-amber-50 text-amber-700 border-amber-100';
  if (value === 'fee') return 'bg-rose-50 text-rose-700 border-rose-100';
  return 'bg-violet-50 text-violet-700 border-violet-100';
};

export default function ParentDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [activeSection, setActiveSection] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [circulars, setCirculars] = useState([]);
  const [pickupRequests, setPickupRequests] = useState([]);
  const [fees, setFees] = useState([]);
  const [feesLoading, setFeesLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [expandedCircular, setExpandedCircular] = useState(null);

  // School payment details
  const [schoolPaymentDetails, setSchoolPaymentDetails] = useState(null);
  // Pay Now modal
  const [payNowFee, setPayNowFee] = useState(null);
  const [payNowForm, setPayNowForm] = useState({ transactionId: '', paymentNote: '' });
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Child selection for sidebar sections
  const [activityChildId, setActivityChildId] = useState('');
  const [attendanceChildId, setAttendanceChildId] = useState('');
  const [reportChildId, setReportChildId] = useState('');
  const [profileChildId, setProfileChildId] = useState('');
  const [medicalChildId, setMedicalChildId] = useState('');

  // Inline data for Activity section
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityItems, setActivityItems] = useState([]);
  const [activityFilter, setActivityFilter] = useState('all');

  // Inline data for Attendance section
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceItems, setAttendanceItems] = useState([]);

  // Inline data for Reports section
  const [reportLoading, setReportLoading] = useState(false);
  const [reportList, setReportList] = useState([]);
  const [reportDetail, setReportDetail] = useState(null);
  const [reportDetailLoading, setReportDetailLoading] = useState(false);
  const [reportSelMonth, setReportSelMonth] = useState(new Date().getMonth() + 1);
  const [reportSelYear, setReportSelYear] = useState(new Date().getFullYear());

  // Inline data for Profile section
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileStudent, setProfileStudent] = useState(null);
  const [medicalLoading, setMedicalLoading] = useState(false);
  const [medicalSaving, setMedicalSaving] = useState(false);
  const [medicalForm, setMedicalForm] = useState(createEmptyMedicalForm());

  const [showPickupForm, setShowPickupForm] = useState(false);
  const [pickupForm, setPickupForm] = useState({ studentId: '', personName: '', mobileNumber: '', photoUrl: '' });

  // Milestones inline state
  const [msChildId, setMsChildId] = useState('');
  const [milestones, setMilestones] = useState([]);
  const [msLoading, setMsLoading] = useState(false);
  const [msFilter, setMsFilter] = useState('');

  // Incidents inline state
  const [incChildId, setIncChildId] = useState('');
  const [incidents, setIncidents] = useState([]);
  const [incLoading, setIncLoading] = useState(false);
  const [incFilter, setIncFilter] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef(null);
  const childPhotoInputRef = useRef(null);
  const [photoUploadChildId, setPhotoUploadChildId] = useState('');
  const [uploadingChildPhotoId, setUploadingChildPhotoId] = useState('');

  const [ptmSlots, setPtmSlots] = useState([]);
  const [ptmRequests, setPtmRequests] = useState([]);
  const [loadingPtm, setLoadingPtm] = useState(false);
  const [showPtmRequestForm, setShowPtmRequestForm] = useState(false);
  const [submittingPtmRequest, setSubmittingPtmRequest] = useState(false);
  const [ptmRequestForm, setPtmRequestForm] = useState({ studentId: '', preferredDate: '', requestNotes: '' });
  const [digestChildId, setDigestChildId] = useState('');
  const [digestLoading, setDigestLoading] = useState(false);
  const [dailyDigest, setDailyDigest] = useState(null);

  const showToast = useCallback((type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchChildren = async () => {
    try {
      setLoading(true);
      const res = await api.get('/students/parent/my-children');
      setChildren(res.data || []);
    } catch {
      setChildren([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCirculars = async () => {
    try {
      const res = await api.get('/schooladmin/circulars/feed');
      setCirculars(res.data || []);
    } catch {
      setCirculars([]);
    }
  };

  const fetchPickupRequests = async () => {
    try {
      const res = await api.get('/parent/pickup-requests');
      setPickupRequests(res.data || []);
    } catch {
      setPickupRequests([]);
    }
  };

  const fetchFees = async () => {
    try {
      setFeesLoading(true);
      const [feesRes, paymentRes] = await Promise.all([
        api.get('/parent/fees'),
        api.get('/parent/school-payment-details').catch(() => ({ data: null })),
      ]);
      setFees(feesRes.data || []);
      setSchoolPaymentDetails(paymentRes.data || null);
    } catch {
      setFees([]);
    } finally {
      setFeesLoading(false);
    }
  };

  const fetchPtmSlots = useCallback(async () => {
    try {
      const res = await api.get('/parent/ptm/slots');
      setPtmSlots(res.data || []);
    } catch {
      setPtmSlots([]);
    }
  }, []);

  const loadActivityData = useCallback(async (childId) => {
    if (!childId) return;
    setActivityLoading(true);
    try {
      const res = await api.get(`/activities/student/${childId}`);
      setActivityItems(res.data || []);
    } catch {
      setActivityItems([]);
      showToast('error', 'Failed to load activity feed');
    } finally {
      setActivityLoading(false);
    }
  }, [showToast]);

  const loadAttendanceData = useCallback(async (childId) => {
    if (!childId) return;
    setAttendanceLoading(true);
    try {
      const res = await api.get(`/students/parent/child/${childId}/attendance`);
      setAttendanceItems(res.data?.attendance || []);
    } catch {
      setAttendanceItems([]);
      showToast('error', 'Failed to load attendance data');
    } finally {
      setAttendanceLoading(false);
    }
  }, [showToast]);

  const loadReportData = useCallback(async (childId) => {
    if (!childId) return;
    setReportLoading(true);
    setReportDetail(null);
    try {
      const res = await api.get(`/reports/student/${childId}`);
      const list = res.data || [];
      setReportList(list);
      // auto-select most recent
      if (list.length > 0) {
        setReportSelMonth(list[0].month);
        setReportSelYear(list[0].year);
      }
    } catch {
      setReportList([]);
    } finally {
      setReportLoading(false);
    }
  }, []);

  const loadReportDetail = useCallback(async (reportId) => {
    if (!reportId) { setReportDetail(null); return; }
    setReportDetailLoading(true);
    try {
      const res = await api.get(`/reports/${reportId}`);
      setReportDetail(res.data);
    } catch {
      setReportDetail(null);
    } finally {
      setReportDetailLoading(false);
    }
  }, []);

  const loadProfileData = useCallback(async (childId) => {
    if (!childId) return;
    setProfileLoading(true);
    try {
      const res = await api.get(`/students/${childId}`);
      setProfileStudent(res.data || null);
    } catch {
      setProfileStudent(null);
      showToast('error', 'Failed to load child profile');
    } finally {
      setProfileLoading(false);
    }
  }, [showToast]);

  const loadMedicalData = useCallback(async (childId) => {
    if (!childId) return;
    setMedicalLoading(true);
    try {
      const res = await api.get(`/students/parent/child/${childId}/medical-profile`);
      const profile = res.data?.medicalProfile || {};
      const allergies = Array.isArray(res.data?.student?.allergies) ? res.data.student.allergies : [];
      const notes = res.data?.student?.medicalNotes || '';
      setMedicalForm({
        ...createEmptyMedicalForm(),
        ...profile,
        hasAllergies: profile.hasAllergies ?? allergies.length > 0,
        allergyDetails: profile.allergyDetails ?? allergies.join(', '),
        additionalNotes: profile.additionalNotes ?? notes,
      });
    } catch {
      setMedicalForm(createEmptyMedicalForm());
      showToast('error', 'Failed to load medical form');
    } finally {
      setMedicalLoading(false);
    }
  }, [showToast]);

  const saveMedicalData = useCallback(async () => {
    if (!medicalChildId) return;
    setMedicalSaving(true);
    try {
      const allergies = medicalForm.hasAllergies
        ? medicalForm.allergyDetails.split(',').map((item) => item.trim()).filter(Boolean)
        : [];
      await api.put(`/students/parent/child/${medicalChildId}/medical-profile`, {
        medicalProfile: medicalForm,
        allergies,
        medicalNotes: medicalForm.additionalNotes,
      });
      showToast('success', 'Medical form saved successfully');
    } catch (err) {
      showToast('error', err.response?.data?.error || 'Failed to save medical form');
    } finally {
      setMedicalSaving(false);
    }
  }, [medicalChildId, medicalForm, showToast]);

  const fetchPtmRequests = useCallback(async () => {
    try {
      const res = await api.get('/parent/ptm/requests');
      setPtmRequests(res.data || []);
    } catch {
      setPtmRequests([]);
    }
  }, []);

  const loadPtmData = useCallback(async () => {
    setLoadingPtm(true);
    try {
      await Promise.all([fetchPtmSlots(), fetchPtmRequests()]);
    } finally {
      setLoadingPtm(false);
    }
  }, [fetchPtmSlots, fetchPtmRequests]);

  const loadDailyDigest = useCallback(async (childId) => {
    if (!childId) return;
    setDigestLoading(true);
    try {
      const res = await api.get(`/parent/child/${childId}/digest`);
      setDailyDigest(res.data || null);
    } catch {
      setDailyDigest(null);
    } finally {
      setDigestLoading(false);
    }
  }, []);

  const handlePickupPhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('name', file.name);
      const res = await api.post('/upload/document', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setPickupForm((p) => ({ ...p, photoUrl: res.data.url }));
    } catch {
      showToast('error', 'Photo upload failed');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const updateChildFromServer = useCallback((updated) => {
    if (!updated?.id) return;
    setChildren((prev) => prev.map((child) => (child.id === updated.id ? { ...child, ...updated } : child)));
    setProfileStudent((prev) => (prev?.id === updated.id ? { ...prev, ...updated } : prev));
  }, []);

  const startChildPhotoUpload = (childId) => {
    setPhotoUploadChildId(childId);
    childPhotoInputRef.current?.click();
  };

  const handleChildPhotoUpload = async (e) => {
    const file = e.target.files[0];
    const childId = photoUploadChildId;
    if (!file || !childId) return;

    setUploadingChildPhotoId(childId);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('name', file.name);

      const uploadRes = await api.post('/upload/photo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const photo = uploadRes.data?.url;
      if (!photo) throw new Error('Upload failed');

      const saveRes = await api.put(`/students/parent/child/${childId}/photo`, { photo });
      updateChildFromServer(saveRes.data?.student || { id: childId, photo });
      showToast('success', 'Child photo updated');
    } catch (err) {
      showToast('error', err.response?.data?.error || 'Child photo upload failed');
    } finally {
      setUploadingChildPhotoId('');
      setPhotoUploadChildId('');
      e.target.value = '';
    }
  };

  const getChildInitials = (child) => {
    const first = child?.firstName?.[0] || '';
    const last = child?.lastName?.[0] || '';
    const initials = `${first}${last}`.toUpperCase();
    return initials || '?';
  };

  const ChildAvatar = ({ child, i = 0, size = 'sm' }) => {
    const sizeClass = size === 'lg' ? 'w-16 h-16 text-xl' : 'w-6 h-6 text-xs';
    if (child?.photo) {
      return (
        <img
          src={child.photo}
          alt={`${child.firstName || 'Child'} avatar`}
          className={`${sizeClass} rounded-full object-cover border border-white/70 shadow-sm`}
        />
      );
    }
    return (
      <div className={`${sizeClass} rounded-full bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-white font-bold`}>
        {getChildInitials(child)}
      </div>
    );
  };

  const handlePickupSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/parent/pickup-request', pickupForm);
      showToast('success', 'Request submitted — awaiting school approval.');
      setShowPickupForm(false);
      setPickupForm({ studentId: '', personName: '', mobileNumber: '', photoUrl: '' });
      fetchPickupRequests();
    } catch (err) {
      showToast('error', err.response?.data?.error || 'Could not submit request');
    }
  };

  const handleTransportOptToggle = async (studentId, currentOptIn) => {
    const newOptIn = !currentOptIn;
    try {
      await api.put(`/parent/child/${studentId}/transportation`, { transportationOptIn: newOptIn });
      setChildren((prev) => prev.map((c) => c.id === studentId ? { ...c, transportationOptIn: newOptIn ? 1 : 0 } : c));
      showToast('success', newOptIn ? 'Transportation opted in. Your child will use school transport.' : 'Transportation opted out. You will pick up / drop your child.');
    } catch (err) {
      showToast('error', err.response?.data?.error || 'Could not update transportation preference');
    }
  };

  const handlePayNowSubmit = async (e) => {
    e.preventDefault();
    if (!payNowFee) return;
    setSubmittingPayment(true);
    try {
      await api.post(`/parent/fees/${payNowFee.id}/submit-payment`, payNowForm);
      showToast('success', 'Payment submitted! Waiting for school acknowledgement.');
      setPayNowFee(null);
      setPayNowForm({ transactionId: '', paymentNote: '' });
      fetchFees();
    } catch (err) {
      showToast('error', err.response?.data?.error || 'Could not submit payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const go = (section) => {
    if (section === 'ptm') {
      setSidebarOpen(false);
      setActiveSection('ptm');
      loadPtmData();
      return;
    }
    setActiveSection(section);
    setSidebarOpen(false);
  };

  useEffect(() => {
    Promise.all([fetchChildren(), fetchCirculars(), fetchPickupRequests(), fetchFees()]);
  }, []);

  useEffect(() => {
    if (loading || children.length === 0) return;
    if (!digestChildId) setDigestChildId(children[0].id);
  }, [loading, children, digestChildId]);

  useEffect(() => {
    if (!digestChildId) return;
    loadDailyDigest(digestChildId);
  }, [digestChildId, loadDailyDigest]);

  useEffect(() => {
    const requestedSection = location.state?.section;
    if (requestedSection && NAV.some((item) => item.id === requestedSection)) {
      setActiveSection(requestedSection);
      if (requestedSection === 'ptm') {
        loadPtmData();
      }
    }
  }, [location.state, loadPtmData]);

  useEffect(() => {
    if (loading || children.length === 0) return;
    const firstChild = children[0]?.id || '';
    if (!activityChildId) setActivityChildId(firstChild);
    if (!attendanceChildId) setAttendanceChildId(firstChild);
    if (!reportChildId) setReportChildId(firstChild);
    if (!profileChildId) setProfileChildId(firstChild);
    if (!medicalChildId) setMedicalChildId(firstChild);
    if (!msChildId) setMsChildId(firstChild);
    if (!incChildId) setIncChildId(firstChild);
  }, [loading, children, activityChildId, attendanceChildId, reportChildId, profileChildId, medicalChildId, msChildId, incChildId]);

  useEffect(() => {
    if (!activityChildId) return;
    setActivityFilter('all');
    loadActivityData(activityChildId);
  }, [activityChildId, loadActivityData]);

  useEffect(() => {
    if (!attendanceChildId) return;
    loadAttendanceData(attendanceChildId);
  }, [attendanceChildId, loadAttendanceData]);

  useEffect(() => {
    if (!reportChildId) return;
    loadReportData(reportChildId);
  }, [reportChildId, loadReportData]);

  // When month/year selection changes, find the matching report and load detail
  useEffect(() => {
    const match = reportList.find(r => r.month === reportSelMonth && r.year === reportSelYear);
    loadReportDetail(match ? match.id : null);
  }, [reportSelMonth, reportSelYear, reportList, loadReportDetail]);

  useEffect(() => {
    if (!profileChildId) return;
    loadProfileData(profileChildId);
  }, [profileChildId, loadProfileData]);

  useEffect(() => {
    if (!medicalChildId) return;
    loadMedicalData(medicalChildId);
  }, [medicalChildId, loadMedicalData]);

  const handlePtmRequestSubmit = async (e) => {
    e.preventDefault();
    if (!ptmRequestForm.studentId) {
      showToast('error', 'Please select a child for the PTM request.');
      return;
    }

    setSubmittingPtmRequest(true);
    try {
      await api.post('/parent/ptm/request', ptmRequestForm);
      showToast('success', 'PTM request sent to school admin for approval.');
      setPtmRequestForm({ studentId: '', preferredDate: '', requestNotes: '' });
      setShowPtmRequestForm(false);
      loadPtmData();
    } catch (err) {
      showToast('error', err.response?.data?.error || 'Unable to submit PTM request');
    } finally {
      setSubmittingPtmRequest(false);
    }
  };

  const pendingPickups = pickupRequests.filter((r) => r.status === 'pending').length;
  const pendingFees = fees.filter((f) => ['pending', 'overdue'].includes(String(f.status || '').toLowerCase())).length;

  const renderSectionChildPicker = (selectedId, setSelectedId, activeClass, inactiveClass) => {
    if (loading) {
      return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
        </div>
      );
    }

    if (children.length === 0) {
      return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 text-sm text-slate-500">
          No children enrolled yet.
        </div>
      );
    }

    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Select Child</label>
        <div className="flex flex-wrap gap-2">
          {children.map((child, i) => (
            <button
              key={child.id}
              onClick={() => setSelectedId(child.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold border transition ${selectedId === child.id ? activeClass : inactiveClass}`}
            >
              <ChildAvatar child={child} i={i} />
              {child.firstName} {child.lastName}
            </button>
          ))}
        </div>
      </div>
    );
  };

  // ── Sidebar ────────────────────────────────────────────────────────────────
  const Sidebar = () => (
    <aside className={`
      fixed inset-y-0 left-0 z-40 w-[280px] bg-white shadow-xl flex flex-col
      transform transition-transform duration-300
      ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      lg:relative lg:translate-x-0 lg:shadow-none lg:border-r lg:border-gray-100
    `}>
      {/* Brand */}
      <div className="px-6 py-5 min-h-[176px] bg-gradient-to-br from-blue-600 to-cyan-600 shrink-0 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-bold text-lg leading-tight">Kinder Connect</p>
            <p className="text-blue-100 text-xs mt-0.5">Parent Portal</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white/70 hover:text-white">
            <FaTimes />
          </button>
        </div>

        <div className="rounded-2xl bg-white/14 px-3 py-3 backdrop-blur-sm border border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-inner">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-semibold leading-tight truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-blue-100/90 text-xs capitalize mt-1">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {NAV.map(({ id, label, icon: Icon }) => {
          const active = activeSection === id;
          const iconTheme = NAV_ICON_STYLES[id] || { tone: 'text-gray-500', soft: 'bg-gray-100' };
          return (
            <button
              key={id}
              onClick={() => go(id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl mb-1 text-sm font-medium transition-all ${
                active
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${active ? 'bg-white/20' : iconTheme.soft}`}>
                <Icon className={active ? 'text-white' : iconTheme.tone} />
              </span>
              {label}
              {id === 'pickup' && pendingPickups > 0 && (
                <span className="ml-auto bg-amber-400 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">{pendingPickups}</span>
              )}
              {id === 'fees' && pendingFees > 0 && (
                <span className="ml-auto bg-rose-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">{pendingFees}</span>
              )}
              {id === 'circulars' && circulars.length > 0 && (
                <span className="ml-auto bg-blue-200 text-blue-800 text-xs rounded-full px-1.5 py-0.5 font-semibold">{circulars.length}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-100">
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors">
          <FaSignOutAlt /> Logout
        </button>
      </div>
    </aside>
  );

  // ── Section renderers ──────────────────────────────────────────────────────
  const renderHome = () => (
    <div className="space-y-6">
      {/* Hero greeting */}
      <div className="rounded-2xl bg-gradient-to-br from-blue-600 via-blue-500 to-violet-600 p-6 text-white relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/10 rounded-full" />
        <div className="absolute -right-2 bottom-0 w-24 h-24 bg-white/5 rounded-full" />
        <p className="text-blue-100 text-sm mb-1">Good day,</p>
        <h2 className="text-2xl font-bold mb-1">{user?.firstName} {user?.lastName} 👋</h2>
        <p className="text-blue-100 text-sm">Here's your family overview for today.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Children', value: children.length, color: 'bg-blue-50 border-blue-100', text: 'text-blue-700', icon: FaChild, onClick: () => go('children') },
          { label: 'Circulars', value: circulars.length, color: 'bg-violet-50 border-violet-100', text: 'text-violet-700', icon: FaBullhorn, onClick: () => go('circulars') },
          { label: 'Pending Pickups', value: pendingPickups, color: 'bg-amber-50 border-amber-100', text: 'text-amber-700', icon: FaShuttleVan, onClick: () => go('pickup') },
          { label: 'Pending Fees', value: pendingFees, color: 'bg-rose-50 border-rose-100', text: 'text-rose-700', icon: FaMoneyBillWave, onClick: () => go('fees') },
        ].map(({ label, value, color, text, icon: Icon, onClick }) => (
          <button
            key={label}
            type="button"
            onClick={onClick}
            className={`rounded-2xl border p-4 text-left transition-all hover:shadow-sm hover:-translate-y-0.5 ${color}`}
          >
            <div className={`text-2xl font-bold ${text}`}>{value}</div>
            <div className="flex items-center gap-1.5 mt-1">
              <Icon className={`text-xs ${text}`} />
              <span className={`text-xs font-medium ${text}`}>{label}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h3 className="font-semibold text-gray-700 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {[
            { label: 'Activity Feed', icon: FaCamera, section: 'activity', color: 'from-blue-400 to-blue-600' },
            { label: 'Development', icon: FaBook, section: 'report', color: 'from-violet-400 to-violet-600' },
            { label: 'Attendance', icon: FaClipboardList, section: 'attendance', color: 'from-emerald-400 to-emerald-600' },
            { label: 'PTM Schedule', icon: FaCalendarAlt, section: 'ptm', color: 'from-amber-400 to-orange-500' },
            { label: 'Fee Reminders', icon: FaMoneyBillWave, section: 'fees', color: 'from-rose-400 to-red-500' },
          ].map(({ label, icon: Icon, section, color }) => (
            <button key={label} onClick={() => go(section)} className={`rounded-2xl bg-gradient-to-br ${color} text-white p-5 min-h-[120px] flex flex-col items-start justify-between text-left shadow hover:shadow-lg hover:scale-[1.02] transition-all`}>
              <span className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center">
                <Icon className="text-xl" />
              </span>
              <span className="text-sm font-semibold leading-snug">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-gray-800">Today's Parent Digest</h3>
            <p className="text-xs text-slate-500">Attendance, meal, nap, photo and teacher note in one view</p>
          </div>
          {children.length > 0 && (
            <select
              value={digestChildId}
              onChange={(e) => setDigestChildId(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
            >
              {children.map((c) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
            </select>
          )}
        </div>

        {digestLoading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-500" /></div>
        ) : !dailyDigest ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">No digest available for today.</div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="rounded-2xl bg-blue-50 border border-blue-100 p-3">
                <p className="text-[11px] text-blue-600 font-semibold uppercase">Attendance</p>
                <p className="text-sm font-bold text-blue-800 capitalize mt-1">{dailyDigest.attendance?.status || 'Not marked'}</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-3">
                <p className="text-[11px] text-emerald-600 font-semibold uppercase">Meal</p>
                <p className="text-sm font-bold text-emerald-800 mt-1">{dailyDigest.meal?.mealType || 'No update'}</p>
              </div>
              <div className="rounded-2xl bg-violet-50 border border-violet-100 p-3">
                <p className="text-[11px] text-violet-600 font-semibold uppercase">Nap</p>
                <p className="text-sm font-bold text-violet-800 mt-1">{dailyDigest.nap?.duration ? `${dailyDigest.nap.duration} min` : 'No update'}</p>
              </div>
              <div className="rounded-2xl bg-amber-50 border border-amber-100 p-3 col-span-2 lg:col-span-1">
                <p className="text-[11px] text-amber-600 font-semibold uppercase">Teacher Note</p>
                <p className="text-sm font-semibold text-amber-800 mt-1 line-clamp-2">{dailyDigest.teacherNote?.text || 'No note yet'}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3 col-span-2 lg:col-span-1">
                <p className="text-[11px] text-slate-600 font-semibold uppercase">Photo</p>
                {dailyDigest.photo?.mediaUrl ? (
                  <img src={dailyDigest.photo.mediaUrl} alt="Digest" className="mt-2 w-full h-16 rounded-xl object-cover" />
                ) : (
                  <p className="text-sm text-slate-500 mt-1">No photo</p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const childName = `${dailyDigest.student?.firstName || ''} ${dailyDigest.student?.lastName || ''}`.trim();
                const msg = `Daily Update - ${childName}\nAttendance: ${dailyDigest.attendance?.status || 'Not marked'}\nMeal: ${dailyDigest.meal?.mealType || 'No update'}\nNap: ${dailyDigest.nap?.duration ? `${dailyDigest.nap.duration} min` : 'No update'}\nTeacher Note: ${dailyDigest.teacherNote?.text || 'No note yet'}`;
                window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
              }}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 inline-flex items-center gap-2"
            >
              <FaWhatsapp /> Share Digest
            </button>
          </>
        )}
      </div>

      {!loading && children.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center">
          <FaChild className="mx-auto text-4xl text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No children enrolled yet</p>
          <p className="text-xs text-gray-400 mt-1">Ask your school admin to enroll your child to unlock child-specific actions.</p>
        </div>
      )}

      {/* Latest circular preview */}
      {circulars.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2"><FaBullhorn className="text-violet-500" /> Latest Circular</h3>
            <button onClick={() => go('circulars')} className="text-xs text-blue-500 hover:underline flex items-center gap-1">All <FaChevronRight size={10} /></button>
          </div>
          <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4">
            <p className="font-semibold text-gray-800">{circulars[0].title}</p>
            <p className="text-sm text-gray-600 mt-1">{circulars[0].description}</p>
            <p className="text-xs text-gray-400 mt-2">{new Date(circulars[0].publishDate || circulars[0].createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      )}
    </div>
  );

  const renderChildren = () => (
    <div className="space-y-5">
      <div className="rounded-3xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-700 p-5 text-white shadow-lg relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-white/10" />
        <div className="absolute right-16 -bottom-10 w-24 h-24 rounded-full bg-white/10" />
        <p className="text-cyan-100 text-xs uppercase tracking-wide font-semibold">Family Space</p>
        <h2 className="text-2xl font-bold mt-1 flex items-center gap-2"><FaChild /> My Children</h2>
        <p className="text-sm text-blue-100 mt-1">Track activity, attendance, development, milestones, and incidents from one colorful hub.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>
      ) : children.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center bg-white">
          <FaChild className="mx-auto text-5xl text-gray-200 mb-4" />
          <p className="text-gray-500">No children enrolled yet.</p>
          <p className="text-xs text-gray-400 mt-1">Ask your school admin to enroll your child.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {children.map((child, i) => (
            <div key={child.id} className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden hover:shadow-lg transition-shadow">
              <div className={`h-2 bg-gradient-to-r ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`} />
              <div className="p-5 space-y-4 bg-gradient-to-br from-white via-sky-50/60 to-violet-50/60">
                <div className="flex items-center gap-4">
                  <ChildAvatar child={child} i={i} size="lg" />
                  <div className="min-w-0">
                    <p className="text-lg font-bold text-gray-900 truncate">{child.firstName} {child.lastName}</p>
                    <p className="text-sm text-gray-600">{child.class?.name}{child.class?.section ? ` — Section ${child.class.section}` : ''}</p>
                    <p className="text-xs text-gray-500 truncate">{child.school?.name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => startChildPhotoUpload(child.id)}
                    disabled={uploadingChildPhotoId === child.id}
                    className="ml-auto rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-2 flex items-center gap-1.5 disabled:opacity-70"
                  >
                    {uploadingChildPhotoId === child.id ? <span className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-slate-500" /> : <FaUpload />}
                    {child.photo ? 'Change Photo' : 'Upload Photo'}
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-cyan-50 border border-cyan-100 py-2">
                    <p className="text-[10px] font-semibold text-cyan-700 uppercase">Learning</p>
                    <p className="text-sm font-bold text-cyan-800">Active</p>
                  </div>
                  <div className="rounded-xl bg-emerald-50 border border-emerald-100 py-2">
                    <p className="text-[10px] font-semibold text-emerald-700 uppercase">Attendance</p>
                    <p className="text-sm font-bold text-emerald-800">Track</p>
                  </div>
                  <div className="rounded-xl bg-violet-50 border border-violet-100 py-2">
                    <p className="text-[10px] font-semibold text-violet-700 uppercase">Progress</p>
                    <p className="text-sm font-bold text-violet-800">View</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <button onClick={() => { setActivityChildId(child.id); setActiveSection('activity'); }} className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2.5 flex items-center justify-center gap-1.5 transition"><FaCamera /> Activity</button>
                  <button onClick={() => { setAttendanceChildId(child.id); setActiveSection('attendance'); }} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2.5 flex items-center justify-center gap-1.5 transition"><FaClipboardList /> Attendance</button>
                  <button onClick={() => { setReportChildId(child.id); setActiveSection('report'); }} className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold px-3 py-2.5 flex items-center justify-center gap-1.5 transition"><FaBook /> Reports</button>
                  <button onClick={() => { setMedicalChildId(child.id); setActiveSection('medical'); }} className="rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold px-3 py-2.5 flex items-center justify-center gap-1.5 transition"><FaStethoscope /> Medical</button>
                  <button onClick={() => { setMsChildId(child.id); setMsFilter(''); setActiveSection('milestones'); }} className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-3 py-2.5 flex items-center justify-center gap-1.5 transition"><FaGraduationCap /> Milestones</button>
                  <button onClick={() => { setIncChildId(child.id); setIncFilter(''); setActiveSection('incidents'); }} className="rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold px-3 py-2.5 flex items-center justify-center gap-1.5 transition"><FaExclamationTriangle /> Incidents</button>
                  <button onClick={() => { setProfileChildId(child.id); setActiveSection('profile'); }} className="rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-2.5 flex items-center justify-center gap-1.5 transition">Profile <FaArrowRight size={10} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderProfile = () => {
    const selectedChild = children.find((child) => child.id === profileChildId);
    const student = profileStudent || selectedChild;

    const formatDate = (date) => {
      if (!date) return 'N/A';
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };

    const calculateAge = (dob) => {
      if (!dob) return 'N/A';
      const today = new Date();
      const birthDate = new Date(dob);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
      return age;
    };

    return (
      <div className="space-y-5">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><FaUser className="text-sky-500" /> Child Profile</h2>

        {renderSectionChildPicker(
          profileChildId,
          setProfileChildId,
          'bg-sky-600 text-white border-sky-600 shadow',
          'bg-white text-slate-700 border-slate-200 hover:bg-sky-50'
        )}

        {profileLoading ? (
          <div className="flex justify-center py-12 bg-white rounded-3xl border border-slate-200"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" /></div>
        ) : !student ? (
          <div className="rounded-3xl border border-dashed border-slate-200 p-10 text-center bg-white">
            <p className="text-slate-500">Child profile not available.</p>
          </div>
        ) : (
          <>
            <div className="bg-gradient-to-r from-sky-600 to-cyan-600 rounded-3xl p-6 text-white shadow-sm">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-sky-100 text-sm">Student Profile</p>
                  <h3 className="text-3xl font-bold mt-1">{student.firstName} {student.lastName}</h3>
                  <p className="text-sky-100 text-sm mt-1">Enrollment #: {student.enrollmentNumber || 'N/A'}</p>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold">{calculateAge(student.dateOfBirth)}</div>
                  <p className="text-sky-100 text-sm">years old</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 space-y-5">
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Basic Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><p className="text-slate-500">Date of Birth</p><p className="font-semibold text-slate-800">{formatDate(student.dateOfBirth)}</p></div>
                    <div><p className="text-slate-500">Enrollment Date</p><p className="font-semibold text-slate-800">{formatDate(student.enrollmentDate)}</p></div>
                    <div><p className="text-slate-500">Status</p><p className="font-semibold text-slate-800">{student.isActive ? 'Active' : 'Inactive'}</p></div>
                    <div><p className="text-slate-500">Age</p><p className="font-semibold text-slate-800">{calculateAge(student.dateOfBirth)} years</p></div>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><FaSchool className="text-emerald-600" /> School & Class</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><p className="text-slate-500">School</p><p className="font-semibold text-slate-800">{student.school?.name || 'N/A'}</p></div>
                    <div><p className="text-slate-500">Class</p><p className="font-semibold text-slate-800">{student.class?.name || 'N/A'} {student.class?.section || ''}</p></div>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Quick Actions</h3>
                  <div className="space-y-2.5">
                    <button onClick={() => { setActivityChildId(student.id); setActiveSection('activity'); }} className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-3 flex items-center justify-center gap-2 transition"><FaCamera /> Activity Feed</button>
                    <button onClick={() => { setAttendanceChildId(student.id); setActiveSection('attendance'); }} className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-3 flex items-center justify-center gap-2 transition"><FaClipboardList /> Attendance</button>
                    <button onClick={() => { setReportChildId(student.id); setActiveSection('report'); }} className="w-full rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-4 py-3 flex items-center justify-center gap-2 transition"><FaBook /> Reports</button>
                    <button onClick={() => { setMedicalChildId(student.id); setActiveSection('medical'); }} className="w-full rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold px-4 py-3 flex items-center justify-center gap-2 transition"><FaStethoscope /> Medical Form</button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderMedical = () => {
    const selectedChild = children.find((child) => child.id === medicalChildId);

    return (
      <div className="space-y-5">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><FaStethoscope className="text-rose-500" /> Medical Form</h2>

        {renderSectionChildPicker(
          medicalChildId,
          setMedicalChildId,
          'bg-rose-600 text-white border-rose-600 shadow',
          'bg-white text-slate-700 border-slate-200 hover:bg-rose-50'
        )}

        {selectedChild && (
          <div className="bg-gradient-to-r from-rose-500 to-orange-500 rounded-3xl p-5 text-white shadow-sm">
            <p className="text-rose-100 text-sm">Medical history for</p>
            <p className="text-2xl font-bold">{selectedChild.firstName} {selectedChild.lastName}</p>
            <p className="text-sm text-rose-100 mt-1">Use the toggles for quick yes/no answers and add details only where needed.</p>
          </div>
        )}

        {medicalLoading ? (
          <div className="flex justify-center py-12 bg-white rounded-3xl border border-slate-200"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500" /></div>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {MEDICAL_TOGGLES.map((item) => (
                <div key={item.key} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                    <button
                      type="button"
                      onClick={() => setMedicalForm((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${medicalForm[item.key] ? 'bg-rose-500' : 'bg-slate-300'}`}
                    >
                      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${medicalForm[item.key] ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  {item.detailKey && medicalForm[item.key] && (
                    <textarea
                      rows={3}
                      value={medicalForm[item.detailKey]}
                      onChange={(e) => setMedicalForm((prev) => ({ ...prev, [item.detailKey]: e.target.value }))}
                      placeholder={item.detailLabel}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-200 resize-none"
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
                <h3 className="text-sm font-bold text-slate-900">Emergency & Health Details</h3>
                <input value={medicalForm.bloodGroup} onChange={(e) => setMedicalForm((prev) => ({ ...prev, bloodGroup: e.target.value }))} placeholder="Blood Group" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                <input value={medicalForm.doctorName} onChange={(e) => setMedicalForm((prev) => ({ ...prev, doctorName: e.target.value }))} placeholder="Doctor Name" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                <input value={medicalForm.doctorPhone} onChange={(e) => setMedicalForm((prev) => ({ ...prev, doctorPhone: e.target.value }))} placeholder="Doctor Phone" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                <input value={medicalForm.hospitalPreference} onChange={(e) => setMedicalForm((prev) => ({ ...prev, hospitalPreference: e.target.value }))} placeholder="Preferred Hospital" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                <input value={medicalForm.insuranceProvider} onChange={(e) => setMedicalForm((prev) => ({ ...prev, insuranceProvider: e.target.value }))} placeholder="Insurance Provider" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
                <h3 className="text-sm font-bold text-slate-900">Additional Notes</h3>
                <textarea
                  rows={10}
                  value={medicalForm.additionalNotes}
                  onChange={(e) => setMedicalForm((prev) => ({ ...prev, additionalNotes: e.target.value }))}
                  placeholder="Add any important medical history, doctor instructions, triggers, precautions, or other notes..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-200 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={saveMedicalData}
                disabled={medicalSaving || !medicalChildId}
                className="rounded-2xl bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white px-6 py-3 text-sm font-bold shadow-sm transition"
              >
                {medicalSaving ? 'Saving…' : 'Save Medical Form'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderActivity = () => {
    const selectedChild = children.find((c) => c.id === activityChildId);
    const filteredActivities = activityFilter === 'all'
      ? activityItems
      : activityItems.filter((item) => String(item.activityType || '').toLowerCase() === activityFilter);

    return (
      <div className="space-y-5">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><FaCamera className="text-blue-500" /> Activity Feed</h2>

        {renderSectionChildPicker(
          activityChildId,
          setActivityChildId,
          'bg-blue-600 text-white border-blue-600 shadow',
          'bg-white text-slate-700 border-slate-200 hover:bg-blue-50'
        )}

        {selectedChild && (
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-3xl p-5 text-white">
            <p className="text-sm text-blue-100">Showing latest activity for</p>
            <p className="text-2xl font-bold">{selectedChild.firstName} {selectedChild.lastName}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {['all', 'general', 'respective', 'class_note'].map((type) => (
            <button
              key={type}
              onClick={() => setActivityFilter(type)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold border transition ${activityFilter === type ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
            >
              {type === 'all' ? 'All' : type === 'class_note' ? 'Homework' : type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        {activityLoading ? (
          <div className="flex justify-center py-12 bg-white rounded-3xl border border-slate-200"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>
        ) : filteredActivities.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 p-10 text-center bg-white">
            <p className="text-slate-500">No activities available for this child.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredActivities.slice(0, 12).map((activity) => {
              const type = String(activity.activityType || '').toLowerCase();
              const isClassNote = type === 'class_note';
              const detailsText = isClassNote
                ? (activity.notes || activity.description || activity.caption || 'No homework details provided')
                : (activity.description || activity.notes || activity.caption || 'No notes provided');

              return (
              <div key={activity.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-800 capitalize">
                      {isClassNote ? (activity.caption || 'Homework & Notes') : (activity.activityType || 'activity')}
                    </p>
                    <p className={`text-xs mt-0.5 ${isClassNote ? 'text-slate-700 whitespace-pre-wrap leading-5' : 'text-slate-500'}`}>
                      {detailsText}
                    </p>
                  </div>
                  <span className="text-[11px] text-slate-400 whitespace-nowrap">{new Date(activity.createdAt).toLocaleString()}</span>
                </div>

                {activity.mediaUrl && (
                  <div className="mt-3">
                    {String(activity.mediaType || '').toLowerCase().startsWith('video') ? (
                      <video
                        src={activity.mediaUrl}
                        controls
                        className="w-full max-w-md rounded-2xl border border-slate-200 bg-black"
                      />
                    ) : (
                      <img
                        src={activity.mediaUrl}
                        alt={activity.caption || 'Activity media'}
                        className="w-full max-w-md rounded-2xl border border-slate-200 object-cover"
                      />
                    )}
                  </div>
                )}
              </div>
            )})}
          </div>
        )}
      </div>
    );
  };

  const renderAttendance = () => {
    const selectedChild = children.find((c) => c.id === attendanceChildId);
    const total = attendanceItems.length;
    const present = attendanceItems.filter((item) => item.status === 'present').length;
    const absent = attendanceItems.filter((item) => item.status === 'absent').length;
    const late = attendanceItems.filter((item) => item.status === 'late').length;

    return (
      <div className="space-y-5">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><FaClipboardList className="text-indigo-500" /> Attendance</h2>

        {renderSectionChildPicker(
          attendanceChildId,
          setAttendanceChildId,
          'bg-indigo-600 text-white border-indigo-600 shadow',
          'bg-white text-slate-700 border-slate-200 hover:bg-indigo-50'
        )}

        {selectedChild && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl border border-slate-200 p-4"><p className="text-xs text-slate-500">Total</p><p className="text-2xl font-bold text-slate-800">{total}</p></div>
            <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-4"><p className="text-xs text-emerald-600">Present</p><p className="text-2xl font-bold text-emerald-700">{present}</p></div>
            <div className="bg-rose-50 rounded-2xl border border-rose-200 p-4"><p className="text-xs text-rose-600">Absent</p><p className="text-2xl font-bold text-rose-700">{absent}</p></div>
            <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4"><p className="text-xs text-amber-600">Late</p><p className="text-2xl font-bold text-amber-700">{late}</p></div>
          </div>
        )}

        {attendanceLoading ? (
          <div className="flex justify-center py-12 bg-white rounded-3xl border border-slate-200"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" /></div>
        ) : attendanceItems.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 p-10 text-center bg-white">
            <p className="text-slate-500">No attendance records for this child.</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr><th>Date</th><th>Status</th><th>Notes</th></tr>
              </thead>
              <tbody>
                {attendanceItems.slice(0, 20).map((item) => (
                  <tr key={item.id}>
                    <td>{new Date(item.date).toLocaleDateString()}</td>
                    <td className="capitalize">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                        item.status === 'present' ? 'bg-emerald-100 text-emerald-700' :
                        item.status === 'absent' ? 'bg-rose-100 text-rose-700' :
                        item.status === 'late' ? 'bg-amber-100 text-amber-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>{String(item.status || '').replace('_', ' ')}</span>
                    </td>
                    <td className="text-slate-500 text-sm">{item.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderReport = () => {
    const selectedChild = children.find((c) => c.id === reportChildId);
    const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const THIS_YEAR = new Date().getFullYear();
    const YEAR_OPTS = [THIS_YEAR - 1, THIS_YEAR];

    const DOMAIN_CFG = {
      social:    { label: 'Social Skills',  grad: 'from-violet-500 to-purple-600', light: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700' },
      emotional: { label: 'Emotional',      grad: 'from-pink-500 to-rose-600',     light: 'bg-pink-50',   border: 'border-pink-200',   text: 'text-pink-700' },
      motor:     { label: 'Motor Skills',   grad: 'from-blue-500 to-cyan-600',     light: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700' },
      language:  { label: 'Language',       grad: 'from-emerald-500 to-teal-600',  light: 'bg-emerald-50',border: 'border-emerald-200',text: 'text-emerald-700' },
      cognitive: { label: 'Cognitive',      grad: 'from-amber-500 to-orange-600',  light: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-700' },
    };
    const RATING_CFG = {
      emerging:   { label: 'Emerging',   bar: '25%',  barCls: 'bg-slate-400',   pill: 'bg-slate-100 text-slate-600' },
      developing: { label: 'Developing', bar: '50%',  barCls: 'bg-blue-500',    pill: 'bg-blue-100 text-blue-700' },
      proficient: { label: 'Proficient', bar: '75%',  barCls: 'bg-emerald-500', pill: 'bg-emerald-100 text-emerald-700' },
      advanced:   { label: 'Advanced',   bar: '100%', barCls: 'bg-violet-500',  pill: 'bg-violet-100 text-violet-700' },
    };
    const INTAKE_LABEL = { full: 'Full plate', half: 'Half plate', refused: 'Refused' };
    const MOOD_EMOJI   = { happy:'😊', calm:'😌', excited:'🤩', sad:'😢', anxious:'😟', tired:'😴', angry:'😡' };

    const rpt   = reportDetail?.report;
    const stats = reportDetail?.stats;
    const teacher = reportDetail?.teacher;
    const domains = Array.isArray(rpt?.domains) ? rpt.domains : [];

    return (
      <div className="space-y-5">
        {/* Header row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FaBook className="text-violet-500" /> Monthly Reports
          </h2>
          {/* Month / Year pickers */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={reportSelMonth}
              onChange={e => setReportSelMonth(Number(e.target.value))}
              className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-300"
            >
              {MONTHS_FULL.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select
              value={reportSelYear}
              onChange={e => setReportSelYear(Number(e.target.value))}
              className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-300"
            >
              {YEAR_OPTS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* Child picker */}
        {renderSectionChildPicker(
          reportChildId,
          setReportChildId,
          'bg-violet-600 text-white border-violet-600 shadow',
          'bg-white text-slate-700 border-slate-200 hover:bg-violet-50'
        )}

        {reportLoading ? (
          <div className="flex justify-center py-12 bg-white rounded-3xl border border-slate-200">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
          </div>
        ) : reportList.length === 0 ? (
          <div className="bg-white rounded-3xl border-2 border-dashed border-violet-100 p-14 text-center">
            <FaBook className="mx-auto text-4xl text-violet-200 mb-3" />
            <p className="font-semibold text-slate-600">No reports published yet</p>
            <p className="text-sm text-slate-400 mt-1">Reports will appear here once the teacher publishes them</p>
          </div>
        ) : reportDetailLoading ? (
          <div className="flex justify-center py-12 bg-white rounded-3xl border border-slate-200">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
          </div>
        ) : !rpt ? (
          <div className="bg-white rounded-3xl border-2 border-dashed border-slate-100 p-14 text-center">
            <FaBook className="mx-auto text-4xl text-slate-200 mb-3" />
            <p className="font-semibold text-slate-600">No report for {MONTHS_FULL[reportSelMonth - 1]} {reportSelYear}</p>
            <p className="text-sm text-slate-400 mt-1">
              Available months:&nbsp;
              {reportList.map(r => `${MONTHS_FULL[r.month - 1]} ${r.year}`).join(', ')}
            </p>
          </div>
        ) : (
          <div className="space-y-4">

            {/* Report header */}
            <div className="bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-2xl p-5 text-white">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <p className="text-violet-200 text-xs font-medium uppercase tracking-wide">Monthly Development Report</p>
                  <p className="text-2xl font-bold mt-0.5">{MONTHS_FULL[rpt.month - 1]} {rpt.year}</p>
                  {selectedChild && <p className="text-violet-200 text-sm mt-1">{selectedChild.firstName} {selectedChild.lastName}</p>}
                </div>
                {teacher && (
                  <div className="bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/20 text-right">
                    <p className="text-violet-200 text-xs">Class Teacher</p>
                    <p className="font-semibold text-sm">{teacher.firstName} {teacher.lastName}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Attendance */}
            {stats && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-slate-800 text-sm">Attendance</p>
                  <span className={`text-2xl font-bold ${stats.attendance.attendancePct >= 85 ? 'text-emerald-600' : stats.attendance.attendancePct >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>
                    {stats.attendance.attendancePct}%
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-3">
                  <div
                    className={`h-full rounded-full ${stats.attendance.attendancePct >= 85 ? 'bg-emerald-500' : stats.attendance.attendancePct >= 70 ? 'bg-amber-500' : 'bg-rose-500'}`}
                    style={{ width: `${stats.attendance.attendancePct}%` }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-emerald-50 rounded-xl py-2"><div className="font-bold text-emerald-700 text-lg">{stats.attendance.presentDays}</div><div className="text-emerald-600">Present</div></div>
                  <div className="bg-rose-50 rounded-xl py-2"><div className="font-bold text-rose-700 text-lg">{stats.attendance.absentDays}</div><div className="text-rose-600">Absent</div></div>
                  <div className="bg-amber-50 rounded-xl py-2"><div className="font-bold text-amber-700 text-lg">{stats.attendance.lateDays}</div><div className="text-amber-600">Late</div></div>
                </div>
              </div>
            )}

            {/* Developmental Domains */}
            {domains.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <p className="font-semibold text-slate-800 mb-4">Developmental Progress</p>
                <div className="space-y-3">
                  {domains.map((d) => {
                    const cfg = DOMAIN_CFG[d.domain];
                    const rc  = RATING_CFG[d.rating] || RATING_CFG.developing;
                    if (!cfg) return null;
                    const achievedMs = (d.milestones || []).filter(m => m.isAchieved);
                    return (
                      <div key={d.domain} className={`rounded-2xl border p-4 ${cfg.light} ${cfg.border}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`font-semibold text-sm ${cfg.text}`}>{cfg.label}</span>
                          <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${rc.pill}`}>{rc.label}</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/70 rounded-full overflow-hidden mb-2">
                          <div className={`h-full rounded-full ${rc.barCls}`} style={{ width: rc.bar }} />
                        </div>
                        {d.notes && <p className="text-xs text-slate-600 leading-relaxed mb-2 bg-white/60 rounded-xl px-3 py-2">{d.notes}</p>}
                        {achievedMs.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {achievedMs.map((m, i) => (
                              <span key={i} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
                                ✓ {m.milestone}
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

            {/* Teacher's message */}
            {rpt.overallSummary && (
              <div className="bg-gradient-to-br from-violet-50 to-fuchsia-50 rounded-2xl border border-violet-200 p-5">
                <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">⭐ Teacher's Message</p>
                <p className="text-slate-700 text-sm leading-relaxed italic">"{rpt.overallSummary}"</p>
                {teacher && <p className="text-xs text-violet-500 mt-2">— {teacher.firstName} {teacher.lastName}</p>}
              </div>
            )}

            {/* Highlights / Growth / Activities */}
            {(rpt.highlights?.length > 0 || rpt.areasForImprovement?.length > 0 || rpt.recommendedActivities?.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {rpt.highlights?.length > 0 && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                    <p className="text-xs font-semibold text-emerald-800 mb-2">✦ Highlights</p>
                    <ul className="space-y-1.5">
                      {rpt.highlights.map((h, i) => <li key={i} className="text-xs text-emerald-700">• {h}</li>)}
                    </ul>
                  </div>
                )}
                {rpt.areasForImprovement?.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                    <p className="text-xs font-semibold text-amber-800 mb-2">🌱 Areas for Growth</p>
                    <ul className="space-y-1.5">
                      {rpt.areasForImprovement.map((a, i) => <li key={i} className="text-xs text-amber-700">• {a}</li>)}
                    </ul>
                  </div>
                )}
                {rpt.recommendedActivities?.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                    <p className="text-xs font-semibold text-blue-800 mb-2">🏠 Try at Home</p>
                    <ul className="space-y-1.5">
                      {rpt.recommendedActivities.map((a, i) => <li key={i} className="text-xs text-blue-700">• {a}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Mood / Nap / Meal mini stats */}
            {stats && (
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-2xl border border-slate-100 p-3 text-center">
                  <p className="text-lg">{MOOD_EMOJI[stats.mood.topArrivalMood] || '—'}</p>
                  <p className="text-xs text-slate-500 mt-1">Top mood</p>
                  <p className="text-xs font-semibold text-slate-700 capitalize">{stats.mood.topArrivalMood || 'No data'}</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 p-3 text-center">
                  <p className="text-lg">🌙</p>
                  <p className="text-xs text-slate-500 mt-1">Avg nap</p>
                  <p className="text-xs font-semibold text-slate-700">{stats.nap.avgNapMin ? `${stats.nap.avgNapMin} min` : 'No data'}</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 p-3 text-center">
                  <p className="text-lg">🍽️</p>
                  <p className="text-xs text-slate-500 mt-1">Meal intake</p>
                  <p className="text-xs font-semibold text-slate-700">{INTAKE_LABEL[stats.meal.topMealIntake] || 'No data'}</p>
                </div>
              </div>
            )}

            {/* Milestones */}
            {stats && stats.milestones.total > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-slate-800 text-sm">Milestones</p>
                  <span className="text-xs text-slate-500">{stats.milestones.achieved} of {stats.milestones.total} achieved</span>
                </div>
                <div className="space-y-1.5">
                  {stats.milestones.list.map((m, i) => (
                    <div key={i} className={`flex items-center gap-2 text-xs rounded-xl px-3 py-2 ${m.isAchieved ? 'bg-emerald-50' : 'bg-slate-50'}`}>
                      <span className={m.isAchieved ? 'text-emerald-500' : 'text-slate-300'}>●</span>
                      <span className={m.isAchieved ? 'text-slate-700' : 'text-slate-400'}>{m.milestone}</span>
                      <span className={`ml-auto capitalize ${m.isAchieved ? 'text-emerald-500' : 'text-slate-400'}`}>{m.domain}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Incidents */}
            {stats && stats.incidents.count > 0 && (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
                <p className="text-sm font-semibold text-rose-700 mb-2">⚠ {stats.incidents.count} Incident{stats.incidents.count > 1 ? 's' : ''} this month</p>
                <div className="space-y-2">
                  {stats.incidents.list.map(inc => (
                    <div key={inc.id} className="bg-white rounded-xl px-3 py-2 flex items-start justify-between gap-3">
                      <div>
                        <span className="text-xs font-medium text-slate-700 capitalize">{inc.incidentType}</span>
                        {inc.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{inc.description}</p>}
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${inc.severity === 'severe' ? 'bg-rose-100 text-rose-700' : inc.severity === 'moderate' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
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
    );
  };

  const renderPickup = () => {
    const transportChildren = children.filter((c) => c.transportationType && ['van', 'eco'].includes(String(c.transportationType).toLowerCase()));

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><FaShuttleVan className="text-amber-500" /> Pickup / Drop</h2>
          {!showPickupForm && (
            <button onClick={() => setShowPickupForm(true)} className="btn btn-primary btn-sm flex items-center gap-2"><FaPlus /> New Request</button>
          )}
        </div>

        {/* Transportation Opt-in/Out Cards */}
        {transportChildren.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-700">School Transport Preference</p>
            {transportChildren.map((child) => {
              const optedIn = child.transportationOptIn === 1 || child.transportationOptIn === true;
              const transportLabel = String(child.transportationType).toLowerCase() === 'van' ? 'School Van' : 'Eco Vehicle';
              return (
                <div key={child.id} className={`rounded-2xl border p-4 flex items-center justify-between gap-4 ${optedIn ? 'border-orange-200 bg-orange-50' : 'border-slate-200 bg-white'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${optedIn ? 'bg-orange-100' : 'bg-slate-100'}`}>
                      <FaShuttleVan className={optedIn ? 'text-orange-500' : 'text-slate-400'} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{child.firstName} {child.lastName}</p>
                      <p className="text-sm text-gray-600">{transportLabel} · {optedIn ? 'Using School Transport' : 'Parent Pickup / Drop'}</p>
                      {optedIn
                        ? <p className="text-xs text-orange-600 mt-0.5">Your child will come via school transport</p>
                        : <p className="text-xs text-slate-500 mt-0.5">You are responsible for pickup and drop</p>
                      }
                    </div>
                  </div>
                  <button
                    onClick={() => handleTransportOptToggle(child.id, optedIn)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${optedIn ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-orange-500 text-white hover:bg-orange-600'}`}
                  >
                    {optedIn ? 'Opt Out' : 'Opt In'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Alternative Pickup Requests */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-700">Alternative Pickup Requests</p>
          {showPickupForm && (
            <div className="bg-white border border-blue-100 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-gray-800">Request Alternative Pickup / Drop</p>
                <button onClick={() => setShowPickupForm(false)} className="text-gray-400 hover:text-gray-600"><FaTimes /></button>
              </div>
              <div className="bg-blue-50 rounded-xl px-4 py-3 text-xs text-blue-700">
                By default, Father / Mother / Legal Guardian are authorised. Use this only when someone else needs to pick up or drop your child. School admin must approve first.
              </div>
              <form onSubmit={handlePickupSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <select className="input md:col-span-2" value={pickupForm.studentId} onChange={(e) => setPickupForm({ ...pickupForm, studentId: e.target.value })} required>
                  <option value="">Select Child</option>
                  {children.map((c) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
                </select>
                <input className="input" placeholder="Pickup person's full name *" value={pickupForm.personName} onChange={(e) => setPickupForm({ ...pickupForm, personName: e.target.value })} required />
                <input className="input" placeholder="Mobile number *" value={pickupForm.mobileNumber} onChange={(e) => setPickupForm({ ...pickupForm, mobileNumber: e.target.value })} required />
                <div className="md:col-span-2 flex items-center gap-3">
                  <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePickupPhotoUpload} />
                  <button type="button" onClick={() => photoInputRef.current?.click()} disabled={uploadingPhoto} className="btn btn-outline btn-sm flex items-center gap-2">
                    {uploadingPhoto ? <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" /> : <FaUpload />}
                    {pickupForm.photoUrl ? 'Change Photo' : 'Upload Person Photo'}
                  </button>
                  {pickupForm.photoUrl && <a href={pickupForm.photoUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline">Preview Photo</a>}
                </div>
                <div className="md:col-span-2 flex gap-3">
                  <button type="submit" className="btn btn-primary flex items-center gap-2"><FaShuttleVan /> Submit Request</button>
                  <button type="button" onClick={() => setShowPickupForm(false)} className="btn btn-outline">Cancel</button>
                </div>
              </form>
            </div>
          )}

          {pickupRequests.length === 0 && !showPickupForm ? (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center">
              <FaShuttleVan className="mx-auto text-4xl text-gray-200 mb-3" />
              <p className="text-gray-500 font-medium">No alternative pickup requests</p>
              <p className="text-xs text-gray-400 mt-1">Submit a request when someone other than parents needs to pick up your child</p>
              <button onClick={() => setShowPickupForm(true)} className="btn btn-outline btn-sm mt-4 mx-auto flex items-center gap-2"><FaPlus /> Request Pickup</button>
            </div>
          ) : (
            <div className="space-y-3">
              {pickupRequests.map((req) => (
                <div key={req.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                      <FaShuttleVan className="text-amber-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{req.student?.firstName} {req.student?.lastName}</p>
                      <p className="text-sm text-gray-600">→ {req.personName} · {req.mobileNumber}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(req.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap ${statusBadge(req.status)}`}>
                    {req.status === 'approved' ? <FaCheck /> : req.status === 'rejected' ? <FaBan /> : <FaClock />}
                    {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderCirculars = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><FaBullhorn className="text-violet-500" /> School Circulars</h2>
      {circulars.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
          <FaBullhorn className="mx-auto text-4xl text-gray-200 mb-3" />
          <p className="text-gray-500">No circulars yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {circulars.map((c) => {
            const isExpanded = expandedCircular === c.id;
            const publishedOn = new Date(c.publishDate || c.createdAt);
            return (
              <div key={c.id} className="bg-white rounded-2xl border border-violet-100 shadow-sm px-5 py-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shrink-0 mt-0.5 shadow">
                    <FaBullhorn className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[11px] border px-2.5 py-1 rounded-full font-semibold uppercase tracking-wide ${circularTypeStyle(c.circularType)}`}>
                        {c.circularType || 'general'}
                      </span>
                      <span className="text-[11px] text-gray-400">School-wide</span>
                      <span className="text-[11px] text-gray-400 ml-auto">Published: {publishedOn.toLocaleDateString()}</span>
                    </div>

                    <p className="font-semibold text-gray-800 mt-2">{c.title}</p>
                    <p className={`text-sm text-gray-600 mt-1 leading-6 ${isExpanded ? 'whitespace-pre-wrap' : 'line-clamp-3'}`}>
                      {c.description}
                    </p>

                    {c.content && isExpanded && (
                      <div className="mt-3 rounded-xl bg-gray-50 border border-gray-100 p-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Detailed Circular</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-6">{c.content}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <button
                        onClick={() => setExpandedCircular(isExpanded ? null : c.id)}
                        className="text-xs text-indigo-600 hover:underline ml-auto font-semibold"
                      >
                        {isExpanded ? 'Show less' : 'Read more'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderFees = () => {
    const feeBadge = (status) => {
      const s = String(status || 'pending').toLowerCase();
      if (s === 'paid') return 'bg-emerald-100 text-emerald-700';
      if (s === 'overdue') return 'bg-rose-100 text-rose-700';
      if (s === 'cancelled') return 'bg-slate-100 text-slate-700';
      if (s === 'payment_submitted') return 'bg-blue-100 text-blue-700';
      return 'bg-amber-100 text-amber-700';
    };

    const hasPaymentDetails = schoolPaymentDetails && (schoolPaymentDetails.upiId || schoolPaymentDetails.accountNumber);

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><FaMoneyBillWave className="text-rose-500" /> Fee Reminders</h2>
          <button onClick={fetchFees} className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">Refresh</button>
        </div>

        {/* School Payment Details Info */}
        {hasPaymentDetails && (
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 p-4 space-y-3">
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide flex items-center gap-1.5">
              <FaMoneyBillWave /> How to Pay
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {schoolPaymentDetails.upiId && (
                <div className="bg-white rounded-xl p-3 border border-emerald-100">
                  <p className="text-xs text-gray-500 font-medium mb-1">UPI</p>
                  <p className="font-bold text-gray-800 text-sm">{schoolPaymentDetails.upiId}</p>
                  {schoolPaymentDetails.upiName && <p className="text-xs text-gray-500">{schoolPaymentDetails.upiName}</p>}
                </div>
              )}
              {schoolPaymentDetails.accountNumber && (
                <div className="bg-white rounded-xl p-3 border border-emerald-100">
                  <p className="text-xs text-gray-500 font-medium mb-1">Bank Transfer</p>
                  <p className="font-bold text-gray-800 text-sm">{schoolPaymentDetails.bankName}</p>
                  <p className="text-xs text-gray-600">A/C: {schoolPaymentDetails.accountNumber}</p>
                  <p className="text-xs text-gray-600">IFSC: {schoolPaymentDetails.ifscCode}</p>
                </div>
              )}
            </div>
            {schoolPaymentDetails.instructions && (
              <p className="text-xs text-gray-600 bg-white rounded-xl p-3 border border-emerald-100 whitespace-pre-wrap">{schoolPaymentDetails.instructions}</p>
            )}
          </div>
        )}

        {/* Pay Now Modal */}
        {payNowFee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900 text-lg">Submit Payment</h3>
                <button onClick={() => setPayNowFee(null)} className="text-gray-400 hover:text-gray-600 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"><FaTimes /></button>
              </div>
              <div className="bg-slate-50 rounded-2xl p-4 space-y-1">
                <p className="font-semibold text-slate-800">{payNowFee.studentName}</p>
                <p className="text-sm text-slate-600">{payNowFee.description || 'School Fee'}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">₹{Number(payNowFee.amount || 0).toFixed(2)}</p>
              </div>
              {hasPaymentDetails && (
                <div className="bg-emerald-50 rounded-xl p-3 text-xs text-emerald-700 space-y-1">
                  <p className="font-semibold">Pay to:</p>
                  {schoolPaymentDetails.upiId && <p>UPI: <span className="font-mono font-bold">{schoolPaymentDetails.upiId}</span></p>}
                  {schoolPaymentDetails.accountNumber && <p>Bank: {schoolPaymentDetails.bankName} · A/C: {schoolPaymentDetails.accountNumber} · IFSC: {schoolPaymentDetails.ifscCode}</p>}
                </div>
              )}
              <form onSubmit={handlePayNowSubmit} className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">Transaction ID / UTR Number *</label>
                  <input className="input w-full font-mono" placeholder="e.g. UTR1234567890" value={payNowForm.transactionId} onChange={(e) => setPayNowForm({ ...payNowForm, transactionId: e.target.value })} required />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">Note (optional)</label>
                  <input className="input w-full" placeholder="e.g. Paid via PhonePe" value={payNowForm.paymentNote} onChange={(e) => setPayNowForm({ ...payNowForm, paymentNote: e.target.value })} />
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="submit" disabled={submittingPayment} className="flex-1 btn btn-primary flex items-center justify-center gap-2">
                    {submittingPayment ? <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <FaCheck />}
                    {submittingPayment ? 'Submitting…' : 'Submit Payment'}
                  </button>
                  <button type="button" onClick={() => setPayNowFee(null)} className="btn btn-outline">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {feesLoading ? (
          <div className="flex justify-center py-12 bg-white rounded-3xl border border-slate-200"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500" /></div>
        ) : fees.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 p-10 text-center bg-white">
            <FaMoneyBillWave className="mx-auto text-4xl text-slate-300 mb-3" />
            <p className="text-slate-500">No fee reminders yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {fees.map((fee) => {
              const status = String(fee.status || 'pending').toLowerCase();
              const isPayable = ['pending', 'overdue'].includes(status);
              const isAwaitingAck = status === 'payment_submitted';
              return (
                <div key={fee.id} className={`bg-white rounded-2xl border shadow-sm p-4 ${isAwaitingAck ? 'border-blue-200' : 'border-slate-200'}`}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-semibold text-slate-900">{fee.studentName || 'Student'}</p>
                      <p className="text-sm text-slate-600 mt-0.5">{fee.description || 'School Fee'}</p>
                      <p className="text-xs text-slate-400 mt-1">Due: {fee.dueDate ? new Date(fee.dueDate).toLocaleDateString() : 'N/A'}</p>
                      {isAwaitingAck && fee.transactionId && (
                        <p className="text-xs text-blue-600 mt-1">Transaction: <span className="font-mono">{fee.transactionId}</span></p>
                      )}
                    </div>
                    <div className="text-right space-y-2">
                      <p className="text-lg font-bold text-slate-900">₹{Number(fee.amount || 0).toFixed(2)}</p>
                      <span className={`inline-flex mt-1 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${feeBadge(fee.status)}`}>
                        {isAwaitingAck ? '⏳ Awaiting School ACK' : (fee.status || 'pending').replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  {isPayable && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => { setPayNowFee(fee); setPayNowForm({ transactionId: '', paymentNote: '' }); }}
                        className="w-full sm:w-auto btn btn-primary flex items-center justify-center gap-2 text-sm"
                      >
                        <FaMoneyBillWave /> Pay Now
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const ptmStatusColors = {
    scheduled: 'bg-blue-100 text-blue-700',
    completed: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  const renderPtm = () => {
    const approvedRequests = ptmRequests
      .filter((request) => request.status === 'approved' && request.meetingDate)
      .map((request) => ({
        slotId: request.id,
        sessionDate: request.meetingDate,
        startTime: request.startTime,
        endTime: request.endTime,
        status: request.status,
        studentName: request.studentName,
        teacherName: request.teacherName,
        location: request.location,
        notes: request.adminNotes || request.requestNotes,
      }));
    const pendingRequests = ptmRequests.filter((request) => request.status === 'pending');
    const rejectedRequests = ptmRequests.filter((request) => request.status === 'rejected');
    const scheduledMeetings = [...ptmSlots, ...approvedRequests];
    const now = new Date();
    const upcoming = scheduledMeetings.filter((s) => s.status !== 'cancelled' && new Date(s.sessionDate) >= now);
    const past = scheduledMeetings.filter((s) => s.status === 'completed' || new Date(s.sessionDate) < now);

    const SlotCard = ({ slot }) => (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex gap-4 items-start">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
          <FaCalendarAlt className="text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="font-semibold text-gray-800">
              {new Date(slot.sessionDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${ptmStatusColors[slot.status] || 'bg-gray-100 text-gray-600'}`}>
              {slot.status}
            </span>
          </div>
          <div className="flex items-center gap-1 text-sm text-amber-600 mt-1">
            <FaClock size={11} />
            <span>{slot.startTime} - {slot.endTime}</span>
          </div>
          <div className="flex flex-wrap gap-3 mt-2">
            {slot.studentName && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <FaChild size={10} /> {slot.studentName}
              </span>
            )}
            {slot.teacherName && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <FaUser size={10} /> {slot.teacherName}
              </span>
            )}
            {slot.location && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <FaMapMarkerAlt size={10} /> {slot.location}
              </span>
            )}
          </div>
          {slot.notes && <p className="text-xs text-gray-400 italic mt-1">{slot.notes}</p>}
        </div>
      </div>
    );

    return (
      <div className="space-y-6 w-full">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FaCalendarAlt className="text-amber-500" /> PTM Schedule
          </h2>
          <button onClick={() => setShowPtmRequestForm((value) => !value)} className="btn btn-primary btn-sm flex items-center gap-2">
            {showPtmRequestForm ? <FaTimes size={12} /> : <FaPlus size={12} />}
            {showPtmRequestForm ? 'Cancel' : 'Request PTM'}
          </button>
        </div>

        {showPtmRequestForm && (
          <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5 space-y-4">
            <p className="font-semibold text-gray-800">Request a PTM</p>
            <form onSubmit={handlePtmRequestSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <select className="input" value={ptmRequestForm.studentId} onChange={(e) => setPtmRequestForm((prev) => ({ ...prev, studentId: e.target.value }))} required>
                <option value="">Select Child</option>
                {children.map((child) => (
                  <option key={child.id} value={child.id}>{child.firstName} {child.lastName}</option>
                ))}
              </select>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Preferred Date (optional)</label>
                <input className="input w-full" type="date" value={ptmRequestForm.preferredDate} onChange={(e) => setPtmRequestForm((prev) => ({ ...prev, preferredDate: e.target.value }))} />
              </div>
              <textarea className="input md:col-span-2 resize-none" rows={3} placeholder="Tell the school what you want to discuss or your preferred timing" value={ptmRequestForm.requestNotes} onChange={(e) => setPtmRequestForm((prev) => ({ ...prev, requestNotes: e.target.value }))} />
              <button type="submit" disabled={submittingPtmRequest} className="btn btn-primary w-full md:w-auto flex items-center gap-2">
                {submittingPtmRequest ? <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <FaCalendarAlt />}
                {submittingPtmRequest ? 'Sending…' : 'Send Request'}
              </button>
            </form>
          </div>
        )}

        {loadingPtm ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400" /></div>
        ) : scheduledMeetings.length === 0 && ptmRequests.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
            <FaCalendarAlt className="mx-auto text-4xl text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm">No PTM meetings scheduled yet.</p>
            <p className="text-gray-300 text-xs mt-1">Request a PTM or wait for the school to approve and schedule one here.</p>
          </div>
        ) : (
          <>
            {pendingRequests.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Pending Requests ({pendingRequests.length})
                </p>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  {pendingRequests.map((request) => (
                    <div key={request.id} className="bg-white rounded-2xl border border-amber-100 shadow-sm p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-gray-800">{request.studentName}</p>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">pending</span>
                      </div>
                      {request.preferredDate && <p className="text-sm text-gray-500 mt-1">Preferred Date: {new Date(request.preferredDate).toLocaleDateString('en-IN')}</p>}
                      {request.requestNotes && <p className="text-sm text-gray-600 mt-2">{request.requestNotes}</p>}
                      <p className="text-xs text-gray-400 mt-2">Requested on {new Date(request.createdAt).toLocaleDateString('en-IN')}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {upcoming.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Upcoming ({upcoming.length})
                </p>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  {upcoming.map((s) => <SlotCard key={s.slotId} slot={s} />)}
                </div>
              </div>
            )}
            {past.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Past / Completed ({past.length})
                </p>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 opacity-70">
                  {past.map((s) => <SlotCard key={s.slotId} slot={s} />)}
                </div>
              </div>
            )}

            {rejectedRequests.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Rejected Requests ({rejectedRequests.length})
                </p>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  {rejectedRequests.map((request) => (
                    <div key={request.id} className="bg-white rounded-2xl border border-red-100 shadow-sm p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-gray-800">{request.studentName}</p>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">rejected</span>
                      </div>
                      {request.adminNotes && <p className="text-sm text-gray-600 mt-2">{request.adminNotes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const MS_DOMAINS = [
    { value: 'social',    label: 'Social',    color: 'pink',   iconColor: 'text-pink-500',    bg: 'bg-pink-50',   border: 'border-pink-200',   badge: 'bg-pink-100 text-pink-700'    },
    { value: 'emotional', label: 'Emotional', color: 'purple', iconColor: 'text-purple-500',  bg: 'bg-purple-50', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-700' },
    { value: 'motor',     label: 'Motor',     color: 'green',  iconColor: 'text-emerald-500', bg: 'bg-emerald-50',border: 'border-emerald-200',badge: 'bg-emerald-100 text-emerald-700'},
    { value: 'language',  label: 'Language',  color: 'blue',   iconColor: 'text-blue-500',    bg: 'bg-blue-50',   border: 'border-blue-200',   badge: 'bg-blue-100 text-blue-700'    },
    { value: 'cognitive', label: 'Cognitive', color: 'yellow', iconColor: 'text-amber-500',   bg: 'bg-amber-50',  border: 'border-amber-200',  badge: 'bg-amber-100 text-amber-700'  },
  ];

  const loadMilestones = useCallback(async (childId) => {
    if (!childId) return;
    setMsLoading(true);
    setMilestones([]);
    try {
      const res = await api.get(`/parent/child/${childId}/milestones`);
      setMilestones(res.data || []);
    } catch {
      showToast('error', 'Failed to load milestones');
    } finally {
      setMsLoading(false);
    }
  }, [showToast]);

  const loadIncidents = useCallback(async (childId) => {
    if (!childId) return;
    setIncLoading(true);
    setIncidents([]);
    try {
      const res = await api.get(`/parent/child/${childId}/incidents`);
      setIncidents(res.data || []);
    } catch {
      showToast('error', 'Failed to load incident reports');
    } finally {
      setIncLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (msChildId) {
      loadMilestones(msChildId);
    }
  }, [msChildId, loadMilestones]);

  useEffect(() => {
    if (incChildId) {
      loadIncidents(incChildId);
    }
  }, [incChildId, loadIncidents]);

  const renderMilestones = () => {
    const filteredMs = msFilter ? milestones.filter((m) => m.domain === msFilter) : milestones;
    const achieved = milestones.filter((m) => m.isAchieved).length;
    const inProgress = milestones.filter((m) => !m.isAchieved).length;
    return (
      <div className="space-y-5">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <FaGraduationCap className="text-emerald-500" /> Milestone Progress
        </h2>

        {/* Child selector */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Select Child</label>
          {loading ? (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500" />
          ) : children.length === 0 ? (
            <p className="text-sm text-slate-500">No children enrolled yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {children.map((child, i) => (
                <button
                  key={child.id}
                  onClick={() => { setMsChildId(child.id); setMsFilter(''); loadMilestones(child.id); }}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold border transition ${msChildId === child.id ? 'bg-emerald-600 text-white border-emerald-600 shadow' : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50'}`}
                >
                  <ChildAvatar child={child} i={i} />
                  {child.firstName} {child.lastName}
                </button>
              ))}
            </div>
          )}
        </div>

        {msChildId && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 text-center">
                <div className="text-2xl font-bold text-slate-800">{milestones.length}</div>
                <div className="text-xs text-slate-500 mt-0.5">Total</div>
              </div>
              <div className="bg-emerald-50 rounded-2xl border border-emerald-200 shadow-sm p-4 text-center">
                <div className="text-2xl font-bold text-emerald-700">{achieved}</div>
                <div className="text-xs text-emerald-600 mt-0.5">Achieved ✓</div>
              </div>
              <div className="bg-amber-50 rounded-2xl border border-amber-200 shadow-sm p-4 text-center">
                <div className="text-2xl font-bold text-amber-700">{inProgress}</div>
                <div className="text-xs text-amber-600 mt-0.5">In Progress</div>
              </div>
            </div>

            {/* Domain filter */}
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setMsFilter('')} className={`rounded-full px-4 py-1.5 text-xs font-semibold border transition ${msFilter === '' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>All</button>
              {MS_DOMAINS.map((d) => (
                <button key={d.value} onClick={() => setMsFilter(d.value)} className={`rounded-full px-4 py-1.5 text-xs font-semibold border transition ${msFilter === d.value ? `${d.bg} ${d.border} ${d.iconColor}` : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{d.label}</button>
              ))}
            </div>

            {/* List */}
            {msLoading ? (
              <div className="flex items-center justify-center py-14 bg-white rounded-3xl border border-slate-200 shadow-sm">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
              </div>
            ) : filteredMs.length === 0 ? (
              <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-10 text-center">
                <FaGraduationCap className="mx-auto text-4xl text-slate-300 mb-3" />
                <p className="text-slate-500 font-medium">No milestones yet</p>
                <p className="text-sm text-slate-400 mt-1">Your child's teacher will add milestones as they progress</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredMs.map((m) => {
                  const dom = MS_DOMAINS.find((d) => d.value === m.domain) || MS_DOMAINS[0];
                  return (
                    <div key={m.id} className={`bg-white rounded-2xl border ${m.isAchieved ? 'border-emerald-200' : dom.border} shadow-sm p-4 flex gap-4 items-start`}>
                      <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${m.isAchieved ? 'bg-emerald-100' : dom.bg}`}>
                        <FaGraduationCap className={m.isAchieved ? 'text-emerald-600' : dom.iconColor} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-0.5">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${dom.badge}`}>{dom.label}</span>
                          {m.isAchieved
                            ? <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-700">✓ Achieved</span>
                            : <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700">In Progress</span>}
                        </div>
                        <p className="text-sm font-semibold text-slate-800">{m.milestone}</p>
                        {m.description && <p className="text-xs text-slate-500 mt-0.5">{m.description}</p>}
                        <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-400">
                          {m.teacherName && <span>By {m.teacherName}</span>}
                          {m.achievedDate && <span>Achieved {new Date(m.achievedDate).toLocaleDateString()}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {!msChildId && children.length > 0 && (
          <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-10 text-center">
            <FaGraduationCap className="mx-auto text-4xl text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">Select a child above to view milestones</p>
          </div>
        )}
      </div>
    );
  };

  const INC_SEVERITIES = [
    { value: 'minor',    label: 'Minor',    bg: 'bg-amber-50',  border: 'border-amber-200',  badge: 'bg-amber-100 text-amber-700',   icon: 'text-amber-500'  },
    { value: 'moderate', label: 'Moderate', bg: 'bg-orange-50', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-700', icon: 'text-orange-500' },
    { value: 'severe',   label: 'Severe',   bg: 'bg-rose-50',   border: 'border-rose-200',   badge: 'bg-rose-100 text-rose-700',     icon: 'text-rose-500'   },
  ];

  const renderIncidents = () => {
    const filteredInc = incFilter ? incidents.filter((i) => i.severity === incFilter) : incidents;
    return (
      <div className="space-y-5">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <FaExclamationTriangle className="text-rose-500" /> Incident Reports
        </h2>

        {/* Child selector */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Select Child</label>
          {loading ? (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-rose-500" />
          ) : children.length === 0 ? (
            <p className="text-sm text-slate-500">No children enrolled yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {children.map((child, i) => (
                <button
                  key={child.id}
                  onClick={() => { setIncChildId(child.id); setIncFilter(''); loadIncidents(child.id); }}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold border transition ${incChildId === child.id ? 'bg-rose-600 text-white border-rose-600 shadow' : 'bg-white text-slate-700 border-slate-200 hover:bg-rose-50'}`}
                >
                  <ChildAvatar child={child} i={i} />
                  {child.firstName} {child.lastName}
                </button>
              ))}
            </div>
          )}
        </div>

        {incChildId && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {INC_SEVERITIES.map((s) => {
                const cnt = incidents.filter((i) => i.severity === s.value).length;
                return (
                  <div key={s.value} className={`rounded-2xl border ${s.border} ${s.bg} shadow-sm p-4 text-center`}>
                    <div className={`text-2xl font-bold ${s.icon}`}>{cnt}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
                  </div>
                );
              })}
            </div>

            {/* Severity filter */}
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setIncFilter('')} className={`rounded-full px-4 py-1.5 text-xs font-semibold border transition ${incFilter === '' ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>All</button>
              {INC_SEVERITIES.map((s) => (
                <button key={s.value} onClick={() => setIncFilter(s.value)} className={`rounded-full px-4 py-1.5 text-xs font-semibold border transition ${incFilter === s.value ? `${s.bg} ${s.border} ${s.icon}` : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{s.label}</button>
              ))}
            </div>

            {/* List */}
            {incLoading ? (
              <div className="flex items-center justify-center py-14 bg-white rounded-3xl border border-slate-200 shadow-sm">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500" />
              </div>
            ) : filteredInc.length === 0 ? (
              <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-10 text-center">
                <FaExclamationTriangle className="mx-auto text-4xl text-slate-300 mb-3" />
                <p className="text-slate-500 font-medium">No incident reports</p>
                <p className="text-sm text-slate-400 mt-1">No incidents have been recorded for this child</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredInc.map((incident) => {
                  const sev = INC_SEVERITIES.find((s) => s.value === incident.severity) || INC_SEVERITIES[0];
                  return (
                    <div key={incident.id} className={`bg-white rounded-2xl border ${sev.border} shadow-sm p-4`}>
                      <div className="flex gap-4 items-start">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${sev.bg}`}>
                          <FaExclamationTriangle className={sev.icon} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${sev.badge}`}>{sev.label}</span>
                            <span className="text-sm font-bold text-slate-800">{incident.incidentType}</span>
                            {incident.parentNotified && (
                              <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 flex items-center gap-1">
                                <FaBullhorn size={9} /> School Notified You
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-700">{incident.description}</p>
                          {incident.actionTaken && (
                            <div className="mt-1.5 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2 text-xs text-slate-600">
                              <span className="font-semibold text-slate-700">Action taken: </span>{incident.actionTaken}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-slate-400">
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
          </>
        )}

        {!incChildId && children.length > 0 && (
          <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-10 text-center">
            <FaExclamationTriangle className="mx-auto text-4xl text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">Select a child above to view incident reports</p>
          </div>
        )}
      </div>
    );
  };

  const renderSection = () => {
    if (activeSection === 'home') return renderHome();
    if (activeSection === 'children') return renderChildren();
    if (activeSection === 'profile') return renderProfile();
    if (activeSection === 'activity') return renderActivity();
    if (activeSection === 'attendance') return renderAttendance();
    if (activeSection === 'report') return renderReport();
    if (activeSection === 'medical') return renderMedical();
    if (activeSection === 'fees') return renderFees();
    if (activeSection === 'pickup') return renderPickup();
    if (activeSection === 'circulars') return renderCirculars();
    if (activeSection === 'ptm') return renderPtm();
    if (activeSection === 'milestones') return renderMilestones();
    if (activeSection === 'incidents') return renderIncidents();
    return null;
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <input ref={childPhotoInputRef} type="file" accept="image/*" className="hidden" onChange={handleChildPhotoUpload} />
      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <Sidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Toast */}
        {toast && (
          <div className={`mx-4 mt-3 px-4 py-3 rounded-xl text-sm font-medium flex items-center justify-between gap-3 shrink-0 ${toast.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}>
            {toast.text}
            <button onClick={() => setToast(null)}><FaTimes size={12} /></button>
          </div>
        )}

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {renderSection()}
        </main>
      </div>
    </div>
  );
}
