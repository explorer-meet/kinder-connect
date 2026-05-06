import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../api/api';
import useAuthStore from '../../store/authStore';
import SchoolAdminPortalLayout from '../../components/SchoolAdminPortalLayout';
import { FaUsers, FaUserPlus, FaGraduationCap, FaPlus, FaLayerGroup, FaChild, FaTrash, FaBullhorn, FaTimes, FaUpload, FaFilePdf, FaImage, FaCheck, FaBan, FaCamera, FaCalendarAlt, FaClock, FaFileCsv, FaWhatsapp, FaMoneyBillWave, FaPalette, FaShieldAlt, FaHistory, FaBell } from 'react-icons/fa';

const TABS = ['staff', 'classes', 'enrollment', 'circulars', 'feeStructure', 'fees', 'ptmRequests', 'pickups', 'branding', 'compliance'];

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
  photo: '',
  // Documents stored as [{name, url}]
  documents: [],
  // Transportation
  transportationType: null,
};

export default function SchoolAdminDashboard() {
  const location = useLocation();
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
  const [ptmRequests, setPtmRequests] = useState([]);
  const [selectedPtmRequestId, setSelectedPtmRequestId] = useState(null);
  const [ptmApprovalForm, setPtmApprovalForm] = useState({ meetingDate: '', startTime: '', endTime: '', location: '', adminNotes: '' });

  const [showStaffForm, setShowStaffForm] = useState(false);
  const [showClassForm, setShowClassForm] = useState(false);
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [showEnrollmentForm, setShowEnrollmentForm] = useState(false);
  const [showCircularForm, setShowCircularForm] = useState(false);
  const [isEditingEnrollment, setIsEditingEnrollment] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadingStaffPhoto, setUploadingStaffPhoto] = useState(false);
  const [uploadingStudentPhoto, setUploadingStudentPhoto] = useState(false);
  const [uploadingStaffDoc, setUploadingStaffDoc] = useState(false);
  const [csvBatchId, setCsvBatchId] = useState('');
  const [csvText, setCsvText] = useState('');
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvSummary, setCsvSummary] = useState(null);
  const [showCsvWizard, setShowCsvWizard] = useState(false);

  // Fee reminders
  const [fees, setFees] = useState([]);
  const [feeStructures, setFeeStructures] = useState([]);
  const [showFeeForm, setShowFeeForm] = useState(false);
  const [showFeeStructureForm, setShowFeeStructureForm] = useState(false);
  const [isEditingFeeStructure, setIsEditingFeeStructure] = useState(false);
  const [editingFeeStructureId, setEditingFeeStructureId] = useState(null);
  const [feeForm, setFeeForm] = useState({ studentId: '', amount: '', dueDate: '', description: '' });
  const [feeStructureForm, setFeeStructureForm] = useState({
    classId: '',
    batchId: '',
    title: '',
    description: '',
    part1Amount: '',
    part1DueDate: '',
    part2Amount: '',
    part2DueDate: '',
    part3Amount: '',
    part3DueDate: '',
  });
  const [sendingReminder, setSendingReminder] = useState(null);
  const [ackingPayment, setAckingPayment] = useState(null);
  
  // Student fee structures
  const [studentFeeStructures, setStudentFeeStructures] = useState([]);
  const [showStudentFeeStructuresModal, setShowStudentFeeStructuresModal] = useState(false);
  const [selectedStudentForFees, setSelectedStudentForFees] = useState(null);
  const [sendingStudentFeeReminder, setSendingStudentFeeReminder] = useState(null);

  // Payment details
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [showPaymentSettingsForm, setShowPaymentSettingsForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ upiId: '', upiName: '', bankName: '', accountNumber: '', ifscCode: '', accountName: '', qrCodeUrl: '', instructions: '' });
  const [savingPaymentDetails, setSavingPaymentDetails] = useState(false);

  // Branding
  const [branding, setBranding] = useState({ logoUrl: '', primaryColor: '#059669', secondaryColor: '#0d9488', tagline: '' });
  const [brandingForm, setBrandingForm] = useState({ logoUrl: '', primaryColor: '#059669', secondaryColor: '#0d9488', tagline: '' });
  const [savingBranding, setSavingBranding] = useState(false);
  const [uploadingBrandingLogo, setUploadingBrandingLogo] = useState(false);
  const brandingLogoInputRef = useRef(null);

  // Compliance
  const [auditLog, setAuditLog] = useState([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditOffset, setAuditOffset] = useState(0);
  const [consents, setConsents] = useState([]);
  const [showConsentForm, setShowConsentForm] = useState(false);
  const [consentForm, setConsentForm] = useState({ parentId: '', studentId: '', consentType: '', consentText: '', accepted: false });
  const [complianceView, setComplianceView] = useState('audit');
  const docInputRef = useRef(null);
  const staffPhotoInputRef = useRef(null);
  const studentPhotoInputRef = useRef(null);
  const staffDocInputRef = useRef(null);

  const [staffForm, setStaffForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', role: 'teacher', password: '', photo: '',
    address: '', qualification: '', dateOfJoining: '',
    emergencyContactName: '', emergencyContactPhone: '',
    staffDocuments: [],
  });
  const [classForm, setClassForm] = useState({ name: '', section: '', capacity: '' });
  const [batchForm, setBatchForm] = useState({ classId: '', shiftName: '', startTime: '09:00 AM', endTime: '12:00 PM', capacity: '' });
  const [enrollForm, setEnrollForm] = useState(emptyEnrollmentForm);
  const [circularForm, setCircularForm] = useState({ title: '', description: '', content: '', circularType: 'general', expiryDate: '' });

  const selectedClassForEnroll = useMemo(() => classes.find((cls) => cls.id === enrollForm.classId) || null, [classes, enrollForm.classId]);
  const selectedClassForFeeStructure = useMemo(() => classes.find((cls) => cls.id === feeStructureForm.classId) || null, [classes, feeStructureForm.classId]);
  const selectedStudentForConsent = useMemo(() => students.find((student) => student.id === consentForm.studentId) || null, [students, consentForm.studentId]);
  const consentParentOptions = useMemo(() => {
    if (!selectedStudentForConsent || !Array.isArray(selectedStudentForConsent.parentIds)) return [];
    return selectedStudentForConsent.parentIds.map((parentId, idx) => ({
      id: parentId,
      label: idx === 0
        ? `${selectedStudentForConsent.fatherFirstName || 'Parent'} ${selectedStudentForConsent.fatherLastName || ''}`.trim()
        : idx === 1
          ? `${selectedStudentForConsent.motherFirstName || 'Parent'} ${selectedStudentForConsent.motherLastName || ''}`.trim()
          : `Parent ${idx + 1}`,
    }));
  }, [selectedStudentForConsent]);

  const showMsg = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3500);
  };

  const openWhatsApp = (phone, text) => {
    const normalized = String(phone || '').replace(/[^0-9]/g, '');
    if (!normalized) {
      showMsg('error', 'Parent phone not available for WhatsApp');
      return;
    }
    window.open(`https://wa.me/${normalized}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  const parseCsv = (text) => {
    const lines = String(text || '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length < 2) return [];

    const split = (line) => line.split(',').map((cell) => cell.trim().replace(/^"|"$/g, ''));
    const headers = split(lines[0]);
    return lines.slice(1).map((line) => {
      const values = split(line);
      const row = {};
      headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
      return row;
    });
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

  const loadPtmRequests = async () => {
    const res = await api.get('/schooladmin/ptm-requests');
    setPtmRequests(res.data || []);
  };

  const loadFees = async () => {
    const res = await api.get('/fees');
    setFees(res.data || []);
  };

  const loadFeeStructures = async () => {
    const res = await api.get('/fees/structures');
    setFeeStructures(res.data || []);
  };

  const loadPaymentDetails = async () => {
    try {
      const res = await api.get('/fees/payment-details');
      setPaymentDetails(res.data || null);
      if (res.data) {
        setPaymentForm({
          upiId: res.data.upiId || '',
          upiName: res.data.upiName || '',
          bankName: res.data.bankName || '',
          accountNumber: res.data.accountNumber || '',
          ifscCode: res.data.ifscCode || '',
          accountName: res.data.accountName || '',
          qrCodeUrl: res.data.qrCodeUrl || '',
          instructions: res.data.instructions || '',
        });
      }
    } catch (_) {}
  };

  const loadBranding = async () => {
    const res = await api.get('/schooladmin/school/branding');
    const b = res.data || {};
    setBranding(b);
    setBrandingForm({ logoUrl: b.logoUrl || '', primaryColor: b.primaryColor || '#059669', secondaryColor: b.secondaryColor || '#0d9488', tagline: b.tagline || '' });
  };

  const loadAuditLog = async (offset = 0) => {
    const res = await api.get('/compliance/audit?limit=50&offset=' + offset);
    if (offset === 0) {
      setAuditLog(res.data.rows || []);
    } else {
      setAuditLog((prev) => [...prev, ...(res.data.rows || [])]);
    }
    setAuditTotal(res.data.total || 0);
    setAuditOffset(offset);
  };

  const loadConsents = async () => {
    const res = await api.get('/compliance/consents');
    setConsents(res.data || []);
  };

  useEffect(() => {
    if (user?.role !== 'school_admin') return;
    const fetchData = async () => {
      setLoading(true);
      try {
        await loadBranding();
        if (activeTab === 'staff') await Promise.all([loadSchool(), loadStaff()]);
        if (activeTab === 'classes') await Promise.all([loadSchool(), loadClasses()]);
        if (activeTab === 'enrollment') await Promise.all([loadSchool(), loadClasses(), loadStudents()]);
        if (activeTab === 'circulars') await Promise.all([loadSchool(), loadCirculars()]);
        if (activeTab === 'ptmRequests') await Promise.all([loadSchool(), loadPtmRequests()]);
        if (activeTab === 'pickups') await Promise.all([loadSchool(), loadPickupRequests()]);
        if (activeTab === 'feeStructure') await Promise.all([loadSchool(), loadClasses(), loadFeeStructures()]);
        if (activeTab === 'fees') await Promise.all([loadSchool(), loadStudents(), loadFees(), loadPaymentDetails()]);
        if (activeTab === 'branding') await Promise.all([loadSchool()]);
        if (activeTab === 'compliance') await Promise.all([loadSchool(), loadStudents(), loadAuditLog(0), loadConsents()]);
      } catch (err) {
        showMsg('error', err.response?.data?.error || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab, user?.role]);

  useEffect(() => {
    setShowStaffForm(false);
    setShowClassForm(false);
    setShowBatchForm(false);
    setShowEnrollmentForm(false);
    setShowCircularForm(false);
    setIsEditingEnrollment(false);
    setEnrollForm(emptyEnrollmentForm);
    setSelectedPtmRequestId(null);
    setPtmApprovalForm({ meetingDate: '', startTime: '', endTime: '', location: '', adminNotes: '' });
    setShowFeeForm(false);
    setFeeForm({ studentId: '', amount: '', dueDate: '', description: '' });
    setShowFeeStructureForm(false);
    setIsEditingFeeStructure(false);
    setEditingFeeStructureId(null);
    setFeeStructureForm({
      classId: '',
      batchId: '',
      title: '',
      description: '',
      part1Amount: '',
      part1DueDate: '',
      part2Amount: '',
      part2DueDate: '',
      part3Amount: '',
      part3DueDate: '',
    });
    setShowConsentForm(false);
    setConsentForm({ parentId: '', studentId: '', consentType: '', consentText: '', accepted: false });
    setAuditOffset(0);
  }, [activeTab]);

  useEffect(() => {
    const requestedSection = location.state?.section;
    if (requestedSection && TABS.includes(requestedSection)) {
      setActiveTab(requestedSection);
    }
  }, [location.state]);

  const handleAddStaff = async (e) => {
    e.preventDefault();
    try {
      await api.post('/schooladmin/staff', staffForm);
      showMsg('success', 'Staff added successfully');
      setShowStaffForm(false);
      setStaffForm({
        firstName: '', lastName: '', email: '', phone: '', role: 'teacher', password: '', photo: '',
        address: '', qualification: '', dateOfJoining: '',
        emergencyContactName: '', emergencyContactPhone: '',
        staffDocuments: [],
      });
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
        photo: enrollForm.photo || undefined,
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
        transportationType: enrollForm.transportationType || null,
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

  const handleCsvImport = async (e) => {
    e.preventDefault();
    if (!csvBatchId) return showMsg('error', 'Select a batch for CSV import');

    const rows = parseCsv(csvText);
    if (!rows.length) return showMsg('error', 'CSV is empty or invalid');

    setCsvImporting(true);
    const summary = { total: rows.length, success: 0, failed: 0, errors: [] };

    for (let i = 0; i < rows.length; i += 1) {
      const r = rows[i];
      try {
        await api.post('/schooladmin/batch/' + csvBatchId + '/student', {
          firstName: r.firstName,
          lastName: r.lastName,
          dateOfBirth: r.dateOfBirth || undefined,
          enrollmentNumber: r.enrollmentNumber || undefined,
          fatherFirstName: r.fatherFirstName || undefined,
          fatherLastName: r.fatherLastName || undefined,
          motherFirstName: r.motherFirstName || undefined,
          motherLastName: r.motherLastName || undefined,
          guardianFirstName: r.guardianFirstName || undefined,
          guardianLastName: r.guardianLastName || undefined,
          parentEmail: r.parentEmail || undefined,
          parentPhone: r.parentPhone || undefined,
          secondParentEmail: r.secondParentEmail || undefined,
          secondParentPhone: r.secondParentPhone || undefined,
        });
        summary.success += 1;
      } catch (err) {
        summary.failed += 1;
        summary.errors.push(`Row ${i + 2}: ${err.response?.data?.error || 'Import failed'}`);
      }
    }

    setCsvImporting(false);
    setCsvSummary(summary);
    if (summary.failed === 0) showMsg('success', `CSV import complete: ${summary.success}/${summary.total} students added`);
    else showMsg('error', `CSV import finished with errors: ${summary.success} success, ${summary.failed} failed`);
    loadStudents();
    loadClasses();
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

  const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', file.name);
    const res = await api.post('/upload/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data?.url || '';
  };

  const handleStaffPhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingStaffPhoto(true);
    try {
      const url = await uploadImage(file);
      setStaffForm((prev) => ({ ...prev, photo: url }));
      showMsg('success', 'Staff photo uploaded');
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Staff photo upload failed');
    } finally {
      setUploadingStaffPhoto(false);
      if (staffPhotoInputRef.current) staffPhotoInputRef.current.value = '';
    }
  };

  const handleStudentPhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingStudentPhoto(true);
    try {
      const url = await uploadImage(file);
      setEnrollForm((prev) => ({ ...prev, photo: url }));
      showMsg('success', 'Child photo uploaded');
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Child photo upload failed');
    } finally {
      setUploadingStudentPhoto(false);
      if (studentPhotoInputRef.current) studentPhotoInputRef.current.value = '';
    }
  };

  const removeDocument = (idx) => {
    setEnrollForm((prev) => ({ ...prev, documents: prev.documents.filter((_, i) => i !== idx) }));
  };

  const handleStaffDocUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingStaffDoc(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', file.name);
      const res = await api.post('/upload/document', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const doc = { name: res.data.name || file.name, url: res.data.url, uploadedAt: new Date().toISOString() };
      setStaffForm((prev) => ({ ...prev, staffDocuments: [...prev.staffDocuments, doc] }));
      showMsg('success', `${file.name} uploaded`);
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Document upload failed');
    } finally {
      setUploadingStaffDoc(false);
      if (staffDocInputRef.current) staffDocInputRef.current.value = '';
    }
  };

  const removeStaffDocument = (idx) => {
    setStaffForm((prev) => ({ ...prev, staffDocuments: prev.staffDocuments.filter((_, i) => i !== idx) }));
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
      photo: student.photo || '',
      documents: Array.isArray(student.documents) ? student.documents : [],
      transportationType: student.transportationType || null,
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

  const openPtmApproval = (request) => {
    setSelectedPtmRequestId(request.id);
    setPtmApprovalForm({
      meetingDate: request.meetingDate ? new Date(request.meetingDate).toISOString().slice(0, 10) : '',
      startTime: request.startTime || '',
      endTime: request.endTime || '',
      location: request.location || '',
      adminNotes: request.adminNotes || '',
    });
  };

  const handlePtmRequestAction = async (requestId, status) => {
    try {
      const payload = status === 'approved'
        ? { status, ...ptmApprovalForm }
        : { status, adminNotes: ptmApprovalForm.adminNotes };

      await api.patch('/schooladmin/ptm-request/' + requestId, payload);
      showMsg('success', `PTM request ${status}`);
      setSelectedPtmRequestId(null);
      setPtmApprovalForm({ meetingDate: '', startTime: '', endTime: '', location: '', adminNotes: '' });
      loadPtmRequests();
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Unable to update PTM request');
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

  const handleCreateFee = async (e) => {
    e.preventDefault();
    try {
      await api.post('/fees', feeForm);
      showMsg('success', 'Fee reminder created');
      setShowFeeForm(false);
      setFeeForm({ studentId: '', amount: '', dueDate: '', description: '' });
      loadFees();
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Unable to create fee reminder');
    }
  };

  const startEditFeeStructure = (feeStructure) => {
    setIsEditingFeeStructure(true);
    setEditingFeeStructureId(feeStructure.id);
    setShowFeeStructureForm(true);
    
    const installments = Array.isArray(feeStructure.installments) ? feeStructure.installments : [];
    setFeeStructureForm({
      classId: feeStructure.classId || '',
      batchId: feeStructure.batchId || '',
      title: feeStructure.title || '',
      description: feeStructure.description || '',
      part1Amount: installments[0]?.amount ? String(installments[0].amount) : '',
      part1DueDate: installments[0]?.dueDate || '',
      part2Amount: installments[1]?.amount ? String(installments[1].amount) : '',
      part2DueDate: installments[1]?.dueDate || '',
      part3Amount: installments[2]?.amount ? String(installments[2].amount) : '',
      part3DueDate: installments[2]?.dueDate || '',
    });
  };

  const handleCreateFeeStructure = async (e) => {
    e.preventDefault();
    try {
      const installmentParts = [
        { partLabel: 'Part 1', amount: feeStructureForm.part1Amount, dueDate: feeStructureForm.part1DueDate },
        { partLabel: 'Part 2', amount: feeStructureForm.part2Amount, dueDate: feeStructureForm.part2DueDate },
        { partLabel: 'Part 3', amount: feeStructureForm.part3Amount, dueDate: feeStructureForm.part3DueDate },
      ].filter((p) => p.amount && p.dueDate);

      if (!installmentParts.length) {
        showMsg('error', 'Add at least one valid part amount and due date');
        return;
      }

      const payload = {
        classId: feeStructureForm.classId,
        batchId: feeStructureForm.batchId || null,
        title: feeStructureForm.title,
        description: feeStructureForm.description,
        installmentParts,
      };

      let res;
      if (isEditingFeeStructure && editingFeeStructureId) {
        res = await api.put(`/fees/structures/${editingFeeStructureId}`, payload);
        showMsg('success', res.data?.message || 'Fee structure updated');
      } else {
        res = await api.post('/fees/structures', payload);
        showMsg('success', res.data?.message || 'Fee structure created');
      }

      setShowFeeStructureForm(false);
      setIsEditingFeeStructure(false);
      setEditingFeeStructureId(null);
      setFeeStructureForm({
        classId: '',
        batchId: '',
        title: '',
        description: '',
        part1Amount: '',
        part1DueDate: '',
        part2Amount: '',
        part2DueDate: '',
        part3Amount: '',
        part3DueDate: '',
      });
      loadFeeStructures();
      loadFees();
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Unable to save fee structure');
    }
  };

  const handleDeleteFeeStructure = async (feeStructureId, title) => {
    if (!window.confirm(`Delete fee structure "${title}"? This will not remove existing reminders.`)) return;
    try {
      await api.delete(`/fees/structures/${feeStructureId}`);
      showMsg('success', 'Fee structure deleted');
      loadFeeStructures();
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Unable to delete fee structure');
    }
  };

  const loadStudentFeeStructures = async (studentId) => {
    try {
      const res = await api.get(`/schooladmin/student/${studentId}/fee-structures`);
      setStudentFeeStructures(res.data || []);
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Unable to load fee structures');
    }
  };

  const handleShowStudentFeeStructures = (student) => {
    setSelectedStudentForFees(student);
    setShowStudentFeeStructuresModal(true);
    loadStudentFeeStructures(student.id);
  };

  const handleSendStudentFeeReminder = async (feeStructureId, partLabel) => {
    if (!selectedStudentForFees) return;
    const childName = `${selectedStudentForFees.firstName || ''} ${selectedStudentForFees.lastName || ''}`.trim() || 'the child';
    const key = `${selectedStudentForFees.id}-${feeStructureId}-${partLabel}`;
    setSendingStudentFeeReminder(key);
    try {
      await api.post(`/schooladmin/student/${selectedStudentForFees.id}/send-fee-reminder`, { feeStructureId, partLabel });
      showMsg('success', `Reminder sent for ${childName} - ${partLabel}`);
      setShowStudentFeeStructuresModal(false);
      setSelectedStudentForFees(null);
      setStudentFeeStructures([]);
      loadFees();
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Unable to send reminder');
    } finally {
      setSendingStudentFeeReminder(null);
    }
  };

  const handleUpdateFeeStatus = async (feeId, status) => {
    try {
      await api.put('/fees/' + feeId, { status });
      showMsg('success', 'Status updated');
      loadFees();
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Unable to update status');
    }
  };

  const handleDeleteFee = async (feeId) => {
    if (!window.confirm('Delete this fee reminder?')) return;
    try {
      await api.delete('/fees/' + feeId);
      showMsg('success', 'Fee reminder deleted');
      loadFees();
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Unable to delete');
    }
  };

  const handleSendReminder = async (feeId) => {
    setSendingReminder(feeId);
    try {
      const res = await api.post('/fees/' + feeId + '/send-reminder');
      if (res.data.waUrl) window.open(res.data.waUrl, '_blank', 'noopener,noreferrer');
      showMsg('success', res.data.emailSent ? 'Email sent + WhatsApp opened' : 'WhatsApp opened (no parent email on file)');
      loadFees();
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Unable to send reminder');
    } finally {
      setSendingReminder(null);
    }
  };

  const handleAckPayment = async (feeId, action) => {
    setAckingPayment(feeId);
    try {
      await api.post('/fees/' + feeId + '/ack-payment', { action });
      showMsg('success', action === 'approve' ? 'Payment approved and marked as paid!' : 'Payment rejected — fee returned to pending.');
      loadFees();
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Unable to acknowledge payment');
    } finally {
      setAckingPayment(null);
    }
  };

  const handleSavePaymentDetails = async (e) => {
    e.preventDefault();
    setSavingPaymentDetails(true);
    try {
      const res = await api.put('/fees/payment-details', paymentForm);
      setPaymentDetails(res.data);
      showMsg('success', 'Payment details saved!');
      setShowPaymentSettingsForm(false);
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Unable to save payment details');
    } finally {
      setSavingPaymentDetails(false);
    }
  };

  const handleSaveBranding = async (e) => {
    e.preventDefault();
    setSavingBranding(true);
    try {
      const res = await api.put('/schooladmin/school/branding', brandingForm);
      setBranding(res.data);
      setBrandingForm({ logoUrl: res.data.logoUrl || '', primaryColor: res.data.primaryColor || '#059669', secondaryColor: res.data.secondaryColor || '#0d9488', tagline: res.data.tagline || '' });
      showMsg('success', 'Branding saved!');
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Unable to save branding');
    } finally {
      setSavingBranding(false);
    }
  };

  const handleBrandingLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingBrandingLogo(true);
    try {
      const url = await uploadImage(file);
      setBrandingForm((prev) => ({ ...prev, logoUrl: url }));
      showMsg('success', 'Logo uploaded');
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Logo upload failed');
    } finally {
      setUploadingBrandingLogo(false);
      if (brandingLogoInputRef.current) brandingLogoInputRef.current.value = '';
    }
  };

  const handleCreateConsent = async (e) => {
    e.preventDefault();
    try {
      await api.post('/compliance/consent', consentForm);
      showMsg('success', 'Consent record saved');
      setShowConsentForm(false);
      setConsentForm({ parentId: '', studentId: '', consentType: '', consentText: '', accepted: false });
      loadConsents();
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Unable to save consent record');
    }
  };

  const handleConsentStudentChange = (studentId) => {
    const student = students.find((entry) => entry.id === studentId) || null;
    const parentIds = Array.isArray(student?.parentIds) ? student.parentIds : [];
    setConsentForm((prev) => ({
      ...prev,
      studentId,
      parentId: parentIds[0] || '',
    }));
  };

  const handleDeleteConsent = async (id) => {
    if (!window.confirm('Delete this consent record?')) return;
    try {
      await api.delete('/compliance/consent/' + id);
      showMsg('success', 'Consent record deleted');
      loadConsents();
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Unable to delete consent');
    }
  };

  const pendingPickups = pickupRequests.filter((req) => req.status === 'pending').length;
  const pendingPtmRequests = ptmRequests.filter((req) => req.status === 'pending').length;
  const approvedPickups = pickupRequests.filter((req) => req.status === 'approved').length;
  const approvedPtmRequests = ptmRequests.filter((req) => req.status === 'approved').length;
  const ptmCompletion = ptmRequests.length ? Math.round((approvedPtmRequests / ptmRequests.length) * 100) : 0;
  const parentEngagementScore = Math.round(((approvedPickups * 0.4) + (approvedPtmRequests * 0.6)) / Math.max((pickupRequests.length + ptmRequests.length), 1) * 100);

  return (
    <SchoolAdminPortalLayout
      title={school?.name || 'School Admin Portal'}
      activeSection={activeTab}
      onSectionChange={setActiveTab}
      branding={branding}
      badges={{
        staff: staff.length,
        classes: classes.length,
        enrollment: students.length,
        circulars: circulars.length,
        feeStructure: feeStructures.length,
        fees: fees.filter((f) => f.status === 'pending' || f.status === 'overdue').length,
        ptmRequests: pendingPtmRequests,
        pickups: pendingPickups,
      }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-500 to-cyan-600 p-6 text-white relative overflow-hidden mb-6">
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/10 rounded-full" />
          <div className="absolute -right-2 bottom-0 w-24 h-24 bg-white/5 rounded-full" />
          <p className="text-emerald-100 text-sm mb-1">Welcome back,</p>
          <h2 className="text-2xl font-bold mb-1">{user?.firstName} {user?.lastName}</h2>
          <p className="text-emerald-100 text-sm">Run staffing, classes, enrollment, circulars, and pickup approvals from one place.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
          {[
            { id: 'staff', label: 'Staff', value: staff.length, style: 'bg-teal-50 border-teal-100 text-teal-700' },
            { id: 'classes', label: 'Classes', value: classes.length, style: 'bg-blue-50 border-blue-100 text-blue-700' },
            { id: 'enrollment', label: 'Students', value: students.length, style: 'bg-indigo-50 border-indigo-100 text-indigo-700' },
            { id: 'circulars', label: 'Circulars', value: circulars.length, style: 'bg-violet-50 border-violet-100 text-violet-700' },
            { id: 'ptmRequests', label: 'PTM Requests', value: pendingPtmRequests, style: 'bg-amber-50 border-amber-100 text-amber-700' },
            { id: 'pickups', label: 'Pending Pickups', value: pendingPickups, style: 'bg-amber-50 border-amber-100 text-amber-700' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`rounded-2xl border p-4 text-left transition-all hover:shadow ${item.style}`}
            >
              <p className="text-2xl font-bold">{item.value}</p>
              <p className="text-xs font-medium mt-1">{item.label}</p>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Parent Engagement Score</p>
            <p className="text-3xl font-bold text-emerald-800 mt-1">{parentEngagementScore}%</p>
            <p className="text-xs text-emerald-700 mt-1">Based on pickup approvals and PTM approvals</p>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">PTM Completion</p>
            <p className="text-3xl font-bold text-blue-800 mt-1">{ptmCompletion}%</p>
            <p className="text-xs text-blue-700 mt-1">Approved PTM requests out of all requests</p>
          </div>
        </div>

        {message && <div className={'alert mb-5 ' + (message.type === 'success' ? 'alert-success' : 'alert-error')}>{message.text}</div>}

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
                      <div className="md:col-span-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Profile Photo</p>
                        <div className="flex items-center gap-3">
                          {staffForm.photo ? (
                            <img src={staffForm.photo} alt="Staff" className="w-14 h-14 rounded-full object-cover border border-gray-200" />
                          ) : (
                            <div className="w-14 h-14 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400">
                              <FaCamera />
                            </div>
                          )}
                          <input ref={staffPhotoInputRef} type="file" accept="image/*" className="hidden" onChange={handleStaffPhotoUpload} />
                          <button type="button" onClick={() => staffPhotoInputRef.current?.click()} disabled={uploadingStaffPhoto} className="btn btn-outline btn-sm flex items-center gap-2">
                            {uploadingStaffPhoto ? <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" /> : <FaUpload />}
                            {uploadingStaffPhoto ? 'Uploading…' : 'Upload Photo'}
                          </button>
                        </div>
                      </div>

                      <p className="md:col-span-2 text-xs font-semibold text-gray-500 uppercase tracking-wide pt-1">Basic Details</p>
                      <input className="input" placeholder="First name *" value={staffForm.firstName} onChange={(e) => setStaffForm({ ...staffForm, firstName: e.target.value })} required />
                      <input className="input" placeholder="Last name *" value={staffForm.lastName} onChange={(e) => setStaffForm({ ...staffForm, lastName: e.target.value })} required />
                      <input className="input" type="email" placeholder="Email *" value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} required />
                      <input className="input" placeholder="Phone" value={staffForm.phone} onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })} />
                      <input className="input" placeholder="Qualification (e.g. B.Ed)" value={staffForm.qualification} onChange={(e) => setStaffForm({ ...staffForm, qualification: e.target.value })} />
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Date of Joining</label>
                        <input className="input w-full" type="date" value={staffForm.dateOfJoining} onChange={(e) => setStaffForm({ ...staffForm, dateOfJoining: e.target.value })} />
                      </div>
                      <input className="input md:col-span-2" placeholder="Address" value={staffForm.address} onChange={(e) => setStaffForm({ ...staffForm, address: e.target.value })} />
                      <select className="input" value={staffForm.role} onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}><option value="teacher">Teacher</option></select>
                      <div className="input flex items-center text-gray-500 bg-gray-50">School: {school?.name || '-'}</div>
                      <input className="input md:col-span-2" type="password" placeholder="Temporary password *" value={staffForm.password} onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })} required />

                      <p className="md:col-span-2 text-xs font-semibold text-gray-500 uppercase tracking-wide pt-1">Emergency Contact</p>
                      <input className="input" placeholder="Emergency Contact Name" value={staffForm.emergencyContactName} onChange={(e) => setStaffForm({ ...staffForm, emergencyContactName: e.target.value })} />
                      <input className="input" placeholder="Emergency Contact Phone" value={staffForm.emergencyContactPhone} onChange={(e) => setStaffForm({ ...staffForm, emergencyContactPhone: e.target.value })} />

                      <div className="md:col-span-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Documents (ID, Certificates, etc.)</p>
                        <div className="flex items-center gap-3 mb-2">
                          <input ref={staffDocInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden" onChange={handleStaffDocUpload} />
                          <button type="button" onClick={() => staffDocInputRef.current?.click()} disabled={uploadingStaffDoc} className="btn btn-outline btn-sm flex items-center gap-2">
                            {uploadingStaffDoc ? <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" /> : <FaUpload />}
                            {uploadingStaffDoc ? 'Uploading…' : 'Upload Document'}
                          </button>
                        </div>
                        {staffForm.staffDocuments.length > 0 && (
                          <div className="space-y-1">
                            {staffForm.staffDocuments.map((doc, idx) => (
                              <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 text-sm">
                                <FaFilePdf className="text-red-400 shrink-0" />
                                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline flex-1 truncate">{doc.name}</a>
                                <button type="button" onClick={() => removeStaffDocument(idx)} className="text-red-400 hover:text-red-600"><FaTimes size={12} /></button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

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
                            <div className="mb-3">
                              {s.photo ? (
                                <img src={s.photo} alt={s.firstName} className="w-14 h-14 rounded-full object-cover border border-gray-200" />
                              ) : (
                                <div className="w-14 h-14 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500 font-semibold">
                                  {s.firstName?.[0]}{s.lastName?.[0]}
                                </div>
                              )}
                            </div>
                            <div className="font-semibold text-gray-800">{s.firstName} {s.lastName}</div>
                            <div className="text-sm text-gray-500">{s.email}</div>
                            {s.phone && <div className="text-xs text-gray-400 mt-0.5">{s.phone}</div>}
                            {s.qualification && <div className="text-xs text-gray-400 mt-0.5">{s.qualification}</div>}
                            {s.address && <div className="text-xs text-gray-400 mt-0.5 truncate">{s.address}</div>}
                            {(s.emergencyContactName || s.emergencyContactPhone) && (
                              <div className="text-xs text-amber-600 mt-1 bg-amber-50 rounded px-2 py-0.5">
                                Emergency: {s.emergencyContactName} {s.emergencyContactPhone}
                              </div>
                            )}
                            {Array.isArray(s.staffDocuments) && s.staffDocuments.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {s.staffDocuments.map((doc, i) => (
                                  <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer"
                                    className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded hover:underline flex items-center gap-1">
                                    <FaFilePdf size={10} /> {doc.name}
                                  </a>
                                ))}
                              </div>
                            )}
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
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setShowCsvWizard(v => !v)} className="btn btn-sm flex items-center gap-2 border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100">
                      <FaFileCsv /> {showCsvWizard ? 'Close CSV Import' : 'CSV Import'}
                    </button>
                    {students.length > 0 && !isEditingEnrollment && !showEnrollmentForm && (
                      <button type="button" onClick={() => setShowEnrollmentForm(true)} className="btn btn-primary btn-sm flex items-center gap-2"><FaPlus /> Enroll Student</button>
                    )}
                  </div>
                </div>

                {showCsvWizard && (
                <div className="card space-y-3 border border-blue-100 bg-blue-50/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-blue-700 font-semibold"><FaFileCsv /> 30-Minute Onboarding Wizard (CSV Import)</div>
                    <button type="button" onClick={() => setShowCsvWizard(false)} className="text-blue-400 hover:text-blue-600 text-lg leading-none">&times;</button>
                  </div>
                  <p className="text-xs text-blue-700">Headers: firstName,lastName,dateOfBirth,enrollmentNumber,fatherFirstName,fatherLastName,parentEmail,parentPhone,motherFirstName,motherLastName,secondParentEmail,secondParentPhone,guardianFirstName,guardianLastName</p>
                  <form onSubmit={handleCsvImport} className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <select className="input" value={csvBatchId} onChange={(e) => setCsvBatchId(e.target.value)} required>
                        <option value="">Select Batch for Import</option>
                        {classes.flatMap((c) => (c.batches || []).map((b) => (
                          <option key={b.id} value={b.id}>{c.name} {c.section || ''} - {b.shiftName}</option>
                        )))}
                      </select>
                      <button type="submit" disabled={csvImporting} className="btn btn-primary flex items-center gap-2">
                        {csvImporting ? <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <FaUpload />}
                        {csvImporting ? 'Importing...' : 'Import CSV'}
                      </button>
                    </div>
                    <textarea
                      rows={6}
                      value={csvText}
                      onChange={(e) => setCsvText(e.target.value)}
                      className="input resize-none"
                      placeholder="Paste CSV rows here"
                    />
                  </form>
                  {csvSummary && (
                    <div className="rounded-xl bg-white border border-slate-200 p-3 text-sm text-slate-700">
                      <p className="font-semibold">Import Result: {csvSummary.success}/{csvSummary.total} success</p>
                      {csvSummary.errors.slice(0, 5).map((err, idx) => <p key={idx} className="text-xs text-rose-600">{err}</p>)}
                    </div>
                  )}
                </div>
                )}

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
                        <div className="mb-3 flex items-center gap-3">
                          {enrollForm.photo ? (
                            <img src={enrollForm.photo} alt="Child" className="w-16 h-16 rounded-2xl object-cover border border-gray-200" />
                          ) : (
                            <div className="w-16 h-16 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400">
                              <FaCamera />
                            </div>
                          )}
                          <input ref={studentPhotoInputRef} type="file" accept="image/*" className="hidden" onChange={handleStudentPhotoUpload} />
                          <button type="button" onClick={() => studentPhotoInputRef.current?.click()} disabled={uploadingStudentPhoto} className="btn btn-outline btn-sm flex items-center gap-2">
                            {uploadingStudentPhoto ? <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" /> : <FaUpload />}
                            {uploadingStudentPhoto ? 'Uploading…' : 'Upload Child Photo'}
                          </button>
                        </div>
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

                      {/* ── Transportation ── */}
                      <div className="bg-orange-50 rounded-xl p-4 space-y-2">
                        <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Transportation</p>
                        <div>
                          <label className="text-xs text-gray-600 mb-1 block">Transportation Mode</label>
                          <select className="input" value={enrollForm.transportationType || ''} onChange={(e) => setEnrollForm({ ...enrollForm, transportationType: e.target.value || null })}>
                            <option value="">None (Parent Pickup/Drop)</option>
                            <option value="van">School Van</option>
                            <option value="eco">Eco Vehicle</option>
                          </select>
                        </div>
                        <p className="text-xs text-orange-600">Parents can opt in/out of school transportation from their portal.</p>
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
                            <td className="font-medium">
                              <div className="flex items-center gap-3">
                                {s.photo ? (
                                  <img src={s.photo} alt={s.firstName} className="w-10 h-10 rounded-xl object-cover border border-gray-200" />
                                ) : (
                                  <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200" />
                                )}
                                <span>{s.firstName} {s.lastName}</span>
                              </div>
                            </td>
                            <td>{s.fatherFirstName ? `${s.fatherFirstName} ${s.fatherLastName || ''}` : <span className="text-gray-400">—</span>}</td>
                            <td>{s.motherFirstName ? `${s.motherFirstName} ${s.motherLastName || ''}` : <span className="text-gray-400">—</span>}</td>
                            <td>{s.class?.name} {s.class?.section || ''}</td>
                            <td>{s.batch?.shiftName || '-'}</td>
                            <td>{Array.isArray(s.documents) && s.documents.length > 0 ? <span className="text-xs text-green-600 font-medium">{s.documents.length} file(s)</span> : <span className="text-xs text-gray-400">None</span>}</td>
                            <td><div className="flex gap-1"><button className="btn btn-sm btn-outline" onClick={() => startEditEnrollment(s)}>Edit</button><button className="btn btn-sm btn-outline" onClick={() => handleShowStudentFeeStructures(s)}>Fees</button></div></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {showStudentFeeStructuresModal && selectedStudentForFees && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl max-w-2xl w-full max-h-96 overflow-y-auto shadow-2xl">
                  <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
                    <h3 className="font-semibold text-lg text-gray-800">Fee Structures - {selectedStudentForFees.firstName} {selectedStudentForFees.lastName}</h3>
                    <button type="button" onClick={() => { setShowStudentFeeStructuresModal(false); setSelectedStudentForFees(null); }} className="text-gray-400 hover:text-gray-600"><FaTimes className="text-xl" /></button>
                  </div>
                  <div className="p-4 space-y-4">
                    {studentFeeStructures.length === 0 ? (
                      <p className="text-center text-gray-500 py-6">No fee structures assigned to this student.</p>
                    ) : (
                      studentFeeStructures.map((fs) => {
                        const parts = Array.isArray(fs.installments) ? fs.installments : [];
                        return (
                          <div key={fs.id} className="border border-slate-200 rounded-xl p-3 space-y-3">
                            <div>
                              <p className="font-semibold text-gray-800">{fs.title}</p>
                              <p className="text-xs text-gray-600">Total: ₹{parseFloat(fs.totalAmount || 0).toFixed(2)}</p>
                            </div>
                            {parts.length > 0 && (
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                {parts.map((p, idx) => {
                                  const key = `${selectedStudentForFees.id}-${fs.id}-${p.partLabel || `Part ${idx + 1}`}`;
                                  const isSending = sendingStudentFeeReminder === key;
                                  return (
                                    <div key={`${fs.id}-${idx}`} className="rounded-lg border border-slate-200 bg-slate-50 p-2 space-y-2">
                                      <p className="text-xs font-semibold text-slate-600">{p.partLabel || `Part ${idx + 1}`}</p>
                                      <p className="font-bold text-slate-800 text-sm">₹{parseFloat(p.amount || 0).toFixed(2)}</p>
                                      <p className="text-xs text-slate-500">Due: {p.dueDate ? new Date(p.dueDate).toLocaleDateString() : '-'}</p>
                                      <button 
                                        type="button" 
                                        onClick={() => handleSendStudentFeeReminder(fs.id, p.partLabel || `Part ${idx + 1}`)}
                                        disabled={isSending}
                                        className="btn btn-xs btn-outline w-full"
                                      >
                                        {isSending ? 'Sending...' : 'Send Reminder'}
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'ptmRequests' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-800">PTM Requests</h2>
                  <button type="button" onClick={loadPtmRequests} className="btn btn-outline btn-sm">Refresh</button>
                </div>

                {ptmRequests.length === 0 ? (
                  <div className="card text-center py-12">
                    <p className="text-gray-600">No PTM requests yet.</p>
                    <p className="text-sm text-gray-400 mt-1">Parent PTM requests will appear here for approval and scheduling.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {ptmRequests.map((request) => {
                      const isEditing = selectedPtmRequestId === request.id;
                      return (
                        <div key={request.id} className="card space-y-4">
                          <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                            <div className="flex-1 space-y-1">
                              <div className="font-semibold text-gray-800">{request.student?.firstName} {request.student?.lastName}</div>
                              <div className="text-sm text-gray-600">Parent: <span className="font-medium">{request.parent?.firstName} {request.parent?.lastName}</span></div>
                              {request.parent?.email && <div className="text-sm text-gray-600">Email: <span className="font-medium">{request.parent.email}</span></div>}
                              {request.parent?.phone && <div className="text-sm text-gray-600">Phone: <span className="font-medium">{request.parent.phone}</span></div>}
                              {request.preferredDate && <div className="text-sm text-gray-600">Preferred Date: <span className="font-medium">{new Date(request.preferredDate).toLocaleDateString()}</span></div>}
                              {request.requestNotes && <div className="text-sm text-gray-600">Notes: <span className="font-medium">{request.requestNotes}</span></div>}
                              <div className="text-xs text-gray-400">Requested on {new Date(request.createdAt).toLocaleString()}</div>
                            </div>
                            <div>
                              {request.status === 'pending' ? (
                                <button type="button" onClick={() => openPtmApproval(request)} className="btn btn-sm btn-primary flex items-center gap-2"><FaCalendarAlt /> Schedule</button>
                              ) : (
                                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${request.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {request.status === 'approved' ? <FaCheck /> : <FaBan />}
                                  {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                </span>
                              )}
                              {request.parent?.phone && (
                                <button
                                  type="button"
                                  onClick={() => openWhatsApp(request.parent.phone, `Hi ${request.parent.firstName || 'Parent'}, regarding PTM request for ${request.student?.firstName || 'your child'}, status: ${request.status}.`)}
                                  className="btn btn-sm btn-outline mt-2 flex items-center gap-2"
                                >
                                  <FaWhatsapp className="text-emerald-600" /> WhatsApp Parent
                                </button>
                              )}
                            </div>
                          </div>

                          {request.status === 'approved' && request.meetingDate && (
                            <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm text-emerald-800 flex flex-wrap gap-4">
                              <span className="flex items-center gap-1"><FaCalendarAlt size={12} /> {new Date(request.meetingDate).toLocaleDateString()}</span>
                              <span className="flex items-center gap-1"><FaClock size={12} /> {request.startTime} - {request.endTime}</span>
                              {request.location && <span>{request.location}</span>}
                            </div>
                          )}

                          {isEditing && request.status === 'pending' && (
                            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 space-y-3">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <label className="text-xs text-gray-500 mb-1 block">Meeting Date *</label>
                                  <input className="input w-full" type="date" value={ptmApprovalForm.meetingDate} onChange={(e) => setPtmApprovalForm({ ...ptmApprovalForm, meetingDate: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Start Time *</label>
                                    <input className="input w-full" placeholder="09:00 AM" value={ptmApprovalForm.startTime} onChange={(e) => setPtmApprovalForm({ ...ptmApprovalForm, startTime: e.target.value })} />
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-500 mb-1 block">End Time *</label>
                                    <input className="input w-full" placeholder="09:15 AM" value={ptmApprovalForm.endTime} onChange={(e) => setPtmApprovalForm({ ...ptmApprovalForm, endTime: e.target.value })} />
                                  </div>
                                </div>
                                <input className="input md:col-span-2" placeholder="Location / Room" value={ptmApprovalForm.location} onChange={(e) => setPtmApprovalForm({ ...ptmApprovalForm, location: e.target.value })} />
                                <textarea className="input md:col-span-2 resize-none" rows={3} placeholder="Admin notes (optional)" value={ptmApprovalForm.adminNotes} onChange={(e) => setPtmApprovalForm({ ...ptmApprovalForm, adminNotes: e.target.value })} />
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <button type="button" onClick={() => handlePtmRequestAction(request.id, 'approved')} className="btn btn-sm bg-green-500 hover:bg-green-600 text-white flex items-center gap-1"><FaCheck /> Approve & Schedule</button>
                                <button type="button" onClick={() => handlePtmRequestAction(request.id, 'rejected')} className="btn btn-sm btn-danger flex items-center gap-1"><FaBan /> Reject</button>
                                <button type="button" onClick={() => setSelectedPtmRequestId(null)} className="btn btn-sm btn-outline">Cancel</button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
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
                              <button onClick={() => openWhatsApp(req.parentPhone || req.parent?.phone, `Hi, your pickup request for ${req.student?.firstName || 'your child'} is currently ${req.status}.`)} className="btn btn-sm btn-outline flex items-center gap-1"><FaWhatsapp className="text-emerald-600" /> WhatsApp</button>
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

            {activeTab === 'feeStructure' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2"><FaMoneyBillWave className="text-indigo-600" /> Fee Structure</h2>
                  <div className="flex gap-2">
                    {!showFeeStructureForm && (
                      <button type="button" onClick={() => setShowFeeStructureForm(true)} className="btn btn-primary btn-sm flex items-center gap-2"><FaPlus /> Add Fee Structure</button>
                    )}
                  </div>
                </div>

                {showFeeStructureForm && (
                  <div className="card border border-indigo-100 bg-indigo-50/30 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-800">{isEditingFeeStructure ? 'Edit Fee Structure' : 'Create Batch-wise Fee Structure'}</h3>
                      <button type="button" onClick={() => { setShowFeeStructureForm(false); setIsEditingFeeStructure(false); setEditingFeeStructureId(null); }} className="text-gray-400 hover:text-gray-600"><FaTimes /></button>
                    </div>
                    <form onSubmit={handleCreateFeeStructure} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <select className="input" value={feeStructureForm.classId} onChange={(e) => setFeeStructureForm({ ...feeStructureForm, classId: e.target.value, batchId: '' })} required>
                        <option value="">Select Class</option>
                        {classes.map((c) => <option key={c.id} value={c.id}>{c.name} {c.section || ''}</option>)}
                      </select>
                      <select className="input" value={feeStructureForm.batchId} onChange={(e) => setFeeStructureForm({ ...feeStructureForm, batchId: e.target.value })}>
                        <option value="">All Batches in Class</option>
                        {(selectedClassForFeeStructure?.batches || []).map((b) => (
                          <option key={b.id} value={b.id}>{b.shiftName} ({b.startTime}-{b.endTime})</option>
                        ))}
                      </select>

                      <input className="input md:col-span-2" placeholder="Fee Structure Name (e.g. Academic Year 2026-27)" value={feeStructureForm.title} onChange={(e) => setFeeStructureForm({ ...feeStructureForm, title: e.target.value })} required />
                      <input className="input md:col-span-2" placeholder="Description (optional)" value={feeStructureForm.description} onChange={(e) => setFeeStructureForm({ ...feeStructureForm, description: e.target.value })} />

                      <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="bg-white rounded-xl border border-indigo-100 p-3 space-y-2">
                          <p className="text-xs font-semibold text-indigo-700">Part 1</p>
                          <input className="input" type="number" step="0.01" min="0" placeholder="Amount" value={feeStructureForm.part1Amount} onChange={(e) => setFeeStructureForm({ ...feeStructureForm, part1Amount: e.target.value })} />
                          <input className="input" type="date" value={feeStructureForm.part1DueDate} onChange={(e) => setFeeStructureForm({ ...feeStructureForm, part1DueDate: e.target.value })} />
                        </div>
                        <div className="bg-white rounded-xl border border-indigo-100 p-3 space-y-2">
                          <p className="text-xs font-semibold text-indigo-700">Part 2</p>
                          <input className="input" type="number" step="0.01" min="0" placeholder="Amount" value={feeStructureForm.part2Amount} onChange={(e) => setFeeStructureForm({ ...feeStructureForm, part2Amount: e.target.value })} />
                          <input className="input" type="date" value={feeStructureForm.part2DueDate} onChange={(e) => setFeeStructureForm({ ...feeStructureForm, part2DueDate: e.target.value })} />
                        </div>
                        <div className="bg-white rounded-xl border border-indigo-100 p-3 space-y-2">
                          <p className="text-xs font-semibold text-indigo-700">Part 3</p>
                          <input className="input" type="number" step="0.01" min="0" placeholder="Amount" value={feeStructureForm.part3Amount} onChange={(e) => setFeeStructureForm({ ...feeStructureForm, part3Amount: e.target.value })} />
                          <input className="input" type="date" value={feeStructureForm.part3DueDate} onChange={(e) => setFeeStructureForm({ ...feeStructureForm, part3DueDate: e.target.value })} />
                        </div>
                      </div>

                      <div className="md:col-span-2 rounded-xl bg-emerald-50 border border-emerald-100 p-3">
                        <p className="text-xs text-emerald-700">Total Amount</p>
                        <p className="text-xl font-bold text-emerald-800">
                          ₹{(
                            (parseFloat(feeStructureForm.part1Amount || 0) || 0) +
                            (parseFloat(feeStructureForm.part2Amount || 0) || 0) +
                            (parseFloat(feeStructureForm.part3Amount || 0) || 0)
                          ).toFixed(2)}
                        </p>
                      </div>

                      <div className="md:col-span-2 flex gap-2">
                        <button type="submit" className="btn btn-primary">{isEditingFeeStructure ? 'Update Structure' : 'Save Structure & Apply to Children'}</button>
                        <button type="button" className="btn btn-outline" onClick={() => { setShowFeeStructureForm(false); setIsEditingFeeStructure(false); setEditingFeeStructureId(null); }}>Cancel</button>
                      </div>
                    </form>
                  </div>
                )}

                {feeStructures.length === 0 && !showFeeStructureForm ? (
                  <div className="card text-center py-10 text-gray-500">No fee structures yet. Create Part 1 / Part 2 / Part 3 with due dates.</div>
                ) : (
                  <div className="space-y-3">
                    {feeStructures.map((fs) => {
                      const parts = Array.isArray(fs.installments) ? fs.installments : [];
                      return (
                        <div key={fs.id} className="card space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="flex-1">
                              <p className="font-semibold text-gray-800">{fs.title}</p>
                              <p className="text-sm text-gray-600">{fs.scopeLabel}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-500">Total Amount</p>
                              <p className="font-bold text-gray-900">₹{parseFloat(fs.totalAmount || fs.amount || 0).toFixed(2)}</p>
                            </div>
                          </div>

                          {parts.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                              {parts.map((p, idx) => (
                                <div key={`${fs.id}-${idx}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                  <p className="text-xs font-semibold text-slate-600">{p.partLabel || `Part ${idx + 1}`}</p>
                                  <p className="font-bold text-slate-800">₹{parseFloat(p.amount || 0).toFixed(2)}</p>
                                  <p className="text-xs text-slate-500">Due: {p.dueDate ? new Date(p.dueDate).toLocaleDateString() : '-'}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <p className="text-xs text-gray-500">Assigned to students: {fs.reminderCount || 0}</p>
                            <div className="flex gap-2">
                              <button type="button" onClick={() => startEditFeeStructure(fs)} className="btn btn-xs btn-outline">Edit</button>
                              <button type="button" onClick={() => handleDeleteFeeStructure(fs.id, fs.title)} className="btn btn-xs btn-outline btn-error">Delete</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'fees' && (
              <div className="space-y-6">
                {/* Payment Settings Card */}
                <div className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50 p-5">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <h3 className="font-semibold text-gray-800 flex items-center gap-2"><FaMoneyBillWave className="text-emerald-600" /> Payment Collection Details</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Share these details with parents so they can pay fees</p>
                    </div>
                    <button type="button" onClick={() => setShowPaymentSettingsForm((v) => !v)} className="btn btn-sm btn-outline flex items-center gap-2">
                      {showPaymentSettingsForm ? <FaTimes /> : <FaPlus />}
                      {showPaymentSettingsForm ? 'Cancel' : (paymentDetails?.upiId || paymentDetails?.accountNumber ? 'Edit Details' : 'Add Payment Details')}
                    </button>
                  </div>

                  {!showPaymentSettingsForm && paymentDetails && (paymentDetails.upiId || paymentDetails.accountNumber) && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {paymentDetails.upiId && (
                        <div className="bg-white rounded-xl p-4 border border-emerald-100">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">UPI Details</p>
                          <p className="font-bold text-gray-800">{paymentDetails.upiId}</p>
                          {paymentDetails.upiName && <p className="text-sm text-gray-600">{paymentDetails.upiName}</p>}
                        </div>
                      )}
                      {paymentDetails.accountNumber && (
                        <div className="bg-white rounded-xl p-4 border border-emerald-100">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Bank Account</p>
                          <p className="font-bold text-gray-800">{paymentDetails.bankName}</p>
                          <p className="text-sm text-gray-600">A/C: {paymentDetails.accountNumber}</p>
                          <p className="text-sm text-gray-600">IFSC: {paymentDetails.ifscCode}</p>
                          {paymentDetails.accountName && <p className="text-sm text-gray-500">{paymentDetails.accountName}</p>}
                        </div>
                      )}
                      {paymentDetails.instructions && (
                        <div className="md:col-span-2 bg-white rounded-xl p-4 border border-emerald-100">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Payment Instructions</p>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{paymentDetails.instructions}</p>
                        </div>
                      )}
                    </div>
                  )}
                  {!showPaymentSettingsForm && (!paymentDetails || (!paymentDetails.upiId && !paymentDetails.accountNumber)) && (
                    <p className="text-sm text-amber-600 mt-3 font-medium">⚠ No payment details added yet. Parents won't see payment information.</p>
                  )}

                  {showPaymentSettingsForm && (
                    <form onSubmit={handleSavePaymentDetails} className="mt-4 bg-white rounded-xl border border-emerald-100 p-5 space-y-4">
                      <p className="font-semibold text-gray-700 text-sm">UPI Details</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input className="input" placeholder="UPI ID (e.g. school@upi)" value={paymentForm.upiId} onChange={(e) => setPaymentForm({ ...paymentForm, upiId: e.target.value })} />
                        <input className="input" placeholder="UPI Name / Display Name" value={paymentForm.upiName} onChange={(e) => setPaymentForm({ ...paymentForm, upiName: e.target.value })} />
                      </div>
                      <p className="font-semibold text-gray-700 text-sm pt-2">Bank Account Details</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input className="input" placeholder="Bank Name" value={paymentForm.bankName} onChange={(e) => setPaymentForm({ ...paymentForm, bankName: e.target.value })} />
                        <input className="input" placeholder="Account Number" value={paymentForm.accountNumber} onChange={(e) => setPaymentForm({ ...paymentForm, accountNumber: e.target.value })} />
                        <input className="input" placeholder="IFSC Code" value={paymentForm.ifscCode} onChange={(e) => setPaymentForm({ ...paymentForm, ifscCode: e.target.value })} />
                        <input className="input" placeholder="Account Holder Name" value={paymentForm.accountName} onChange={(e) => setPaymentForm({ ...paymentForm, accountName: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Payment Instructions (optional)</label>
                        <textarea className="input resize-none w-full" rows={2} placeholder="e.g. Please add student name in remarks. Contact office for queries." value={paymentForm.instructions} onChange={(e) => setPaymentForm({ ...paymentForm, instructions: e.target.value })} />
                      </div>
                      <div className="flex gap-2">
                        <button type="submit" disabled={savingPaymentDetails} className="btn btn-primary flex items-center gap-2">
                          {savingPaymentDetails ? <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <FaCheck />}
                          {savingPaymentDetails ? 'Saving…' : 'Save Payment Details'}
                        </button>
                        <button type="button" className="btn btn-outline" onClick={() => setShowPaymentSettingsForm(false)}>Cancel</button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Pending Payment Acknowledgements */}
                {fees.filter((f) => f.status === 'payment_submitted').length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse inline-block" />
                      Payment Acknowledgements Pending ({fees.filter((f) => f.status === 'payment_submitted').length})
                    </h3>
                    {fees.filter((f) => f.status === 'payment_submitted').map((fee) => (
                      <div key={fee.id} className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div>
                            <p className="font-semibold text-gray-800">{fee.studentFirst} {fee.studentLast}</p>
                            <p className="text-sm text-gray-600">{fee.description || 'School Fee'} · <span className="font-bold text-gray-800">₹{parseFloat(fee.amount).toFixed(2)}</span></p>
                            <p className="text-xs text-gray-400 mt-0.5">Submitted: {fee.paymentSubmittedAt ? new Date(fee.paymentSubmittedAt).toLocaleString() : 'N/A'}</p>
                          </div>
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">⏳ Awaiting ACK</span>
                        </div>
                        {fee.transactionId && (
                          <div className="bg-white rounded-xl px-4 py-3 border border-amber-100 text-sm">
                            <span className="font-semibold text-gray-700">Transaction ID: </span>
                            <span className="text-gray-600 font-mono">{fee.transactionId}</span>
                            {fee.paymentNote && <p className="text-xs text-gray-500 mt-1">{fee.paymentNote}</p>}
                            {fee.paymentProof && (
                              <a href={fee.paymentProof} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline block mt-1">View Payment Proof</a>
                            )}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button type="button" disabled={ackingPayment === fee.id} onClick={() => handleAckPayment(fee.id, 'approve')} className="btn btn-sm bg-emerald-500 hover:bg-emerald-600 text-white flex items-center gap-1">
                            {ackingPayment === fee.id ? <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" /> : <FaCheck />}
                            Approve & Mark Paid
                          </button>
                          <button type="button" disabled={ackingPayment === fee.id} onClick={() => handleAckPayment(fee.id, 'reject')} className="btn btn-sm btn-outline text-red-500 border-red-200 flex items-center gap-1">
                            <FaBan /> Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Fee Reminders List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2"><FaMoneyBillWave className="text-green-600" /> Fee Reminders ({fees.filter((f) => f.status !== 'payment_submitted').length})</h2>
                    {!showFeeForm && <button type="button" onClick={() => setShowFeeForm(true)} className="btn btn-primary btn-sm flex items-center gap-2"><FaPlus /> Add Fee Reminder</button>}
                  </div>

                  {showFeeForm && (
                    <div className="card border border-green-100 bg-green-50/30 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-800">New Fee Reminder</h3>
                        <button type="button" onClick={() => setShowFeeForm(false)} className="text-gray-400 hover:text-gray-600"><FaTimes /></button>
                      </div>
                      <form onSubmit={handleCreateFee} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <select className="input" value={feeForm.studentId} onChange={(e) => setFeeForm({ ...feeForm, studentId: e.target.value })} required>
                          <option value="">Select Student</option>
                          {students.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                        </select>
                        <input className="input" type="number" step="0.01" min="0" placeholder="Amount (₹)" value={feeForm.amount} onChange={(e) => setFeeForm({ ...feeForm, amount: e.target.value })} required />
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Due Date</label>
                          <input className="input w-full" type="date" value={feeForm.dueDate} onChange={(e) => setFeeForm({ ...feeForm, dueDate: e.target.value })} required />
                        </div>
                        <input className="input" placeholder="Description (e.g. Tuition Fee, Term 1)" value={feeForm.description} onChange={(e) => setFeeForm({ ...feeForm, description: e.target.value })} />
                        <div className="md:col-span-2 flex gap-2">
                          <button type="submit" className="btn btn-primary">Create Reminder</button>
                          <button type="button" className="btn btn-outline" onClick={() => setShowFeeForm(false)}>Cancel</button>
                        </div>
                      </form>
                    </div>
                  )}

                  {fees.filter((f) => f.status !== 'payment_submitted').length === 0 && !showFeeForm ? (
                    <div className="card text-center py-12">
                      <FaMoneyBillWave className="mx-auto text-4xl text-gray-300 mb-3" />
                      <p className="text-gray-600 mb-4">No fee reminders yet.</p>
                      <button type="button" onClick={() => setShowFeeForm(true)} className="btn btn-primary mx-auto flex items-center gap-2"><FaPlus /> Add First Fee Reminder</button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {fees.filter((f) => f.status !== 'payment_submitted').map((fee) => {
                        const statusColors = { pending: 'bg-amber-100 text-amber-700', paid: 'bg-green-100 text-green-700', overdue: 'bg-red-100 text-red-700', cancelled: 'bg-gray-100 text-gray-500' };
                        const isPastDue = fee.status === 'pending' && new Date(fee.dueDate) < new Date();
                        return (
                          <div key={fee.id} className="card flex flex-col sm:flex-row sm:items-center gap-4">
                            <div className="flex-1 space-y-1">
                              <div className="font-semibold text-gray-800">{fee.studentFirst} {fee.studentLast}</div>
                              <div className="text-sm text-gray-600">{fee.description || 'School Fee'}</div>
                              <div className="flex items-center gap-3 flex-wrap">
                                <span className="font-bold text-gray-800">₹{parseFloat(fee.amount).toFixed(2)}</span>
                                <span className="text-xs text-gray-500">Due: {new Date(fee.dueDate).toLocaleDateString()}</span>
                                {isPastDue && <span className="text-xs text-red-500 font-semibold">Overdue</span>}
                              </div>
                              {fee.reminderSentAt && <div className="text-xs text-gray-400">Last reminded: {new Date(fee.reminderSentAt).toLocaleString()}</div>}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[fee.status] || statusColors.pending}`}>{(fee.status || 'pending').charAt(0).toUpperCase() + (fee.status || 'pending').slice(1)}</span>
                              {fee.status !== 'paid' && fee.status !== 'cancelled' && (
                                <>
                                  <button type="button" onClick={() => handleUpdateFeeStatus(fee.id, 'paid')} className="btn btn-sm bg-green-500 hover:bg-green-600 text-white flex items-center gap-1"><FaCheck /> Mark Paid</button>
                                  <button type="button" disabled={sendingReminder === fee.id} onClick={() => handleSendReminder(fee.id)} className="btn btn-sm btn-outline flex items-center gap-1">
                                    {sendingReminder === fee.id ? <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-500" /> : <FaBell className="text-emerald-600" />}
                                    Remind
                                  </button>
                                  <button type="button" onClick={() => handleUpdateFeeStatus(fee.id, 'cancelled')} className="btn btn-sm btn-outline text-gray-500 flex items-center gap-1"><FaBan /> Cancel</button>
                                </>
                              )}
                              <button type="button" onClick={() => handleDeleteFee(fee.id)} className="btn btn-sm btn-danger flex items-center gap-1"><FaTrash /></button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'branding' && (
              <div className="space-y-6 max-w-2xl">
                <div className="flex items-center gap-2">
                  <FaPalette className="text-pink-500 text-xl" />
                  <h2 className="text-lg font-semibold text-gray-800">School Branding</h2>
                </div>
                <div className="card space-y-5">
                  <form onSubmit={handleSaveBranding} className="space-y-5">
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">School Logo</label>
                      <div className="flex items-center gap-4">
                        {brandingForm.logoUrl ? (
                          <img src={brandingForm.logoUrl} alt="Logo" className="w-16 h-16 rounded-xl object-contain border border-gray-200 bg-gray-50" />
                        ) : (
                          <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400">
                            <FaImage />
                          </div>
                        )}
                        <div className="flex flex-col gap-2">
                          <input
                            ref={brandingLogoInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleBrandingLogoUpload}
                          />
                          <button
                            type="button"
                            disabled={uploadingBrandingLogo}
                            onClick={() => brandingLogoInputRef.current?.click()}
                            className="btn btn-outline btn-sm flex items-center gap-2"
                          >
                            {uploadingBrandingLogo ? <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500" /> : <FaUpload />}
                            {uploadingBrandingLogo ? 'Uploading…' : 'Upload Logo'}
                          </button>
                          {brandingForm.logoUrl && (
                            <button type="button" onClick={() => setBrandingForm({ ...brandingForm, logoUrl: '' })} className="text-xs text-red-400 hover:text-red-600 text-left">Remove logo</button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">School Tagline</label>
                      <input className="input" placeholder="e.g. Nurturing Young Minds" value={brandingForm.tagline} onChange={(e) => setBrandingForm({ ...brandingForm, tagline: e.target.value })} />
                    </div>
                    <div className="rounded-xl overflow-hidden border border-gray-200">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 pt-3 pb-2 bg-gray-50">Live Preview</p>
                      <div className="p-4 text-white flex items-center justify-between bg-gradient-to-r from-emerald-600 to-teal-600">
                        <div className="flex items-center gap-3">
                          {brandingForm.logoUrl && <img src={brandingForm.logoUrl} alt="Logo" className="w-9 h-9 rounded-lg object-contain bg-white/20" />}
                          <div>
                            <p className="font-bold text-base">{school?.name || 'School Name'}</p>
                            {brandingForm.tagline && <p className="text-xs opacity-80">{brandingForm.tagline}</p>}
                          </div>
                        </div>
                        <p className="text-xs opacity-70">School Admin Portal</p>
                      </div>
                    </div>
                    <button type="submit" disabled={savingBranding} className="btn btn-primary flex items-center gap-2">
                      {savingBranding ? <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <FaCheck />}
                      {savingBranding ? 'Saving…' : 'Save Branding'}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {activeTab === 'compliance' && (
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <FaShieldAlt className="text-slate-500 text-xl" />
                  <h2 className="text-lg font-semibold text-gray-800">Compliance & Audit</h2>
                </div>
                <div className="flex gap-2 border-b border-gray-200 pb-3">
                  <button type="button" onClick={() => setComplianceView('audit')} className={`btn btn-sm flex items-center gap-1 ${complianceView === 'audit' ? 'btn-primary' : 'btn-outline'}`}>
                    <FaHistory /> Audit Log
                  </button>
                  <button type="button" onClick={() => setComplianceView('consents')} className={`btn btn-sm flex items-center gap-1 ${complianceView === 'consents' ? 'btn-primary' : 'btn-outline'}`}>
                    <FaShieldAlt /> Consent Records
                  </button>
                </div>

                {complianceView === 'audit' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-500">{auditTotal} total events</p>
                      <button type="button" onClick={() => loadAuditLog(0)} className="btn btn-outline btn-sm">Refresh</button>
                    </div>
                    {auditLog.length === 0 ? (
                      <div className="card text-center py-12 text-gray-400">No audit events yet. Key actions in this portal are automatically logged here.</div>
                    ) : (
                      <div className="space-y-2">
                        {auditLog.map((entry) => (
                          <div key={entry.id} className="card flex items-start gap-4 py-3">
                            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0 text-sm font-bold uppercase">
                              {(entry.actorName || '?')[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-gray-800 text-sm">{entry.actorName}</span>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{entry.actorRole}</span>
                              </div>
                              <p className="text-sm text-gray-600 mt-0.5 capitalize">{(entry.action || '').replace(/_/g, ' ')}</p>
                              {entry.targetType && <p className="text-xs text-gray-400 mt-0.5">{entry.targetType} · {String(entry.targetId || '').slice(0, 14)}</p>}
                            </div>
                            <p className="text-xs text-gray-400 shrink-0 whitespace-nowrap">{new Date(entry.createdAt).toLocaleString()}</p>
                          </div>
                        ))}
                        {auditOffset + 50 < auditTotal && (
                          <button type="button" onClick={() => loadAuditLog(auditOffset + 50)} className="btn btn-outline btn-sm w-full">Load More</button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {complianceView === 'consents' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-500">{consents.length} consent records</p>
                      <button type="button" onClick={() => setShowConsentForm((v) => !v)} className="btn btn-primary btn-sm flex items-center gap-1"><FaPlus /> Add Consent</button>
                    </div>

                    {showConsentForm && (
                      <div className="card border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-gray-800">New Consent Record</h3>
                          <button type="button" onClick={() => setShowConsentForm(false)} className="text-gray-400 hover:text-gray-600"><FaTimes /></button>
                        </div>
                        <form onSubmit={handleCreateConsent} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <select className="input" value={consentForm.studentId} onChange={(e) => handleConsentStudentChange(e.target.value)} required>
                            <option value="">Select Student</option>
                            {students.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                          </select>
                          <select className="input" value={consentForm.parentId} onChange={(e) => setConsentForm({ ...consentForm, parentId: e.target.value })} required disabled={!consentForm.studentId || consentParentOptions.length === 0}>
                            <option value="">{consentForm.studentId ? 'Select Parent' : 'Select Student First'}</option>
                            {consentParentOptions.map((parent) => <option key={parent.id} value={parent.id}>{parent.label} ({parent.id.slice(0, 8)}...)</option>)}
                          </select>
                          <input className="input" placeholder="Consent type (e.g. photo_sharing, field_trip)" value={consentForm.consentType} onChange={(e) => setConsentForm({ ...consentForm, consentType: e.target.value })} required />
                          <label className="flex items-center gap-2 text-sm text-gray-700 px-3 border border-gray-200 rounded-xl bg-gray-50">
                            <input type="checkbox" checked={consentForm.accepted} onChange={(e) => setConsentForm({ ...consentForm, accepted: e.target.checked })} />
                            Parent Accepted
                          </label>
                          <textarea className="input md:col-span-2 resize-none" rows={2} placeholder="Consent text / description" value={consentForm.consentText} onChange={(e) => setConsentForm({ ...consentForm, consentText: e.target.value })} />
                          <div className="md:col-span-2 flex gap-2">
                            <button type="submit" className="btn btn-primary">Save Record</button>
                            <button type="button" className="btn btn-outline" onClick={() => setShowConsentForm(false)}>Cancel</button>
                          </div>
                        </form>
                      </div>
                    )}

                    {consents.length === 0 ? (
                      <div className="card text-center py-12 text-gray-400">No consent records. Track parent consents for photo sharing, field trips, medical procedures, etc.</div>
                    ) : (
                      <div className="space-y-3">
                        {consents.map((c) => (
                          <div key={c.id} className="card flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="font-medium text-gray-800">{c.studentFirst} {c.studentLast}</div>
                              <div className="text-sm text-gray-600">Parent: {`${c.parentFirst || ''} ${c.parentLast || ''}`.trim() || c.parentId || 'Unknown Parent'} · <span className="text-gray-400">{c.parentEmail || 'No email linked'}</span></div>
                              <div className="flex items-center gap-2 flex-wrap text-xs">
                                <span className="font-medium text-gray-700 capitalize">{(c.consentType || '').replace(/_/g, ' ')}</span>
                                <span className={`px-2 py-0.5 rounded-full font-semibold ${c.accepted ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                  {c.accepted ? 'Accepted' : 'Not Accepted'}
                                </span>
                                {c.acceptedAt && <span className="text-gray-400">{new Date(c.acceptedAt).toLocaleDateString()}</span>}
                              </div>
                              {c.consentText && <p className="text-xs text-gray-400 mt-1">{c.consentText}</p>}
                            </div>
                            <button type="button" onClick={() => handleDeleteConsent(c.id)} className="btn btn-sm btn-danger shrink-0"><FaTrash /></button>
                          </div>
                        ))}
                      </div>
                    )}
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
    </SchoolAdminPortalLayout>
  );
}
