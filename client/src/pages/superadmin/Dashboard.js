import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaBuilding,
  FaPlus,
  FaEdit,
  FaTrash,
  FaToggleOn,
  FaToggleOff,
  FaUsers,
  FaSchool,
  FaCheckCircle,
  FaEye,
  FaInbox,
  FaTimes,
  FaBan,
} from 'react-icons/fa';
import api from '../../api/api';
import SuperAdminPortalLayout from '../../components/SuperAdminPortalLayout';

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [schools, setSchools] = useState([]);
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({});
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [activeSection, setActiveSection] = useState('schools');
  const [schoolFilter, setSchoolFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState(null);

  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [approvalForm, setApprovalForm] = useState({
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
    adminPassword: '',
    reviewNotes: '',
  });

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    city: '',
    phone: '',
    email: '',
    website: '',
    schoolAdminFirstName: '',
    schoolAdminLastName: '',
    schoolAdminEmail: '',
    schoolAdminPassword: '',
  });

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const fetchSchools = useCallback(async () => {
    try {
      setLoadingSchools(true);
      const res = await api.get('/superadmin/schools');
      setSchools(res.data || []);
    } catch (err) {
      showMessage('error', err.response?.data?.error || 'Failed to load schools');
    } finally {
      setLoadingSchools(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/superadmin/stats');
      setStats(res.data || {});
    } catch {
      setStats({});
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    try {
      setLoadingRequests(true);
      const res = await api.get('/superadmin/school-requests?status=pending');
      setRequests(res.data || []);
    } catch (err) {
      showMessage('error', err.response?.data?.error || 'Failed to load registration requests');
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    fetchSchools();
    fetchStats();
    fetchRequests();
  }, [fetchSchools, fetchStats, fetchRequests]);

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      name: '',
      description: '',
      address: '',
      city: '',
      phone: '',
      email: '',
      website: '',
      schoolAdminFirstName: '',
      schoolAdminLastName: '',
      schoolAdminEmail: '',
      schoolAdminPassword: '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return showMessage('error', 'School name is required');

    try {
      if (editingId) {
        await api.put(`/superadmin/school/${editingId}`, formData);
        showMessage('success', 'School updated successfully');
      } else {
        await api.post('/superadmin/school', formData);
        showMessage('success', 'School and admin account created successfully');
      }
      resetForm();
      fetchSchools();
      fetchStats();
    } catch (err) {
      showMessage('error', err.response?.data?.error || 'Operation failed');
    }
  };

  const handleEdit = (school) => {
    setEditingId(school.id);
    setFormData({
      name: school.name || '',
      description: school.description || '',
      address: school.address || '',
      city: school.city || '',
      phone: school.phone || '',
      email: school.email || '',
      website: school.website || '',
      schoolAdminFirstName: '',
      schoolAdminLastName: '',
      schoolAdminEmail: '',
      schoolAdminPassword: '',
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleActive = async (school) => {
    try {
      if (school.isActive) {
        await api.patch(`/superadmin/school/${school.id}/deactivate`);
        showMessage('success', `${school.name} deactivated`);
      } else {
        await api.patch(`/superadmin/school/${school.id}/activate`);
        showMessage('success', `${school.name} activated`);
      }
      fetchSchools();
      fetchStats();
    } catch (err) {
      showMessage('error', err.response?.data?.error || 'Operation failed');
    }
  };

  const handleDelete = async (school) => {
    if (!window.confirm(`Delete "${school.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/superadmin/school/${school.id}`);
      showMessage('success', 'School deleted successfully');
      fetchSchools();
      fetchStats();
    } catch (err) {
      showMessage('error', err.response?.data?.error || 'Delete failed');
    }
  };

  const openApproveModal = (request) => {
    setSelectedRequest(request);
    setApprovalForm({
      adminFirstName: request.contactFirstName || '',
      adminLastName: request.contactLastName || '',
      adminEmail: request.contactEmail || '',
      adminPassword: '',
      reviewNotes: '',
    });
    setShowApprovalModal(true);
  };

  const closeApproveModal = () => {
    setShowApprovalModal(false);
    setSelectedRequest(null);
    setApprovalForm({
      adminFirstName: '',
      adminLastName: '',
      adminEmail: '',
      adminPassword: '',
      reviewNotes: '',
    });
  };

  const handleApproveRequest = async (e) => {
    e.preventDefault();
    if (!selectedRequest) return;
    try {
      const res = await api.post(`/superadmin/school-request/${selectedRequest.id}/approve`, approvalForm);
      const creds = res.data?.adminCredentials;
      showMessage('success', `Request approved. School admin: ${creds?.email} / ${creds?.password}`);
      closeApproveModal();
      fetchRequests();
      fetchSchools();
      fetchStats();
    } catch (err) {
      showMessage('error', err.response?.data?.error || 'Could not approve request');
    }
  };

  const handleRejectRequest = async (request) => {
    const reason = window.prompt('Optional rejection note for this request:') || '';
    try {
      await api.patch(`/superadmin/school-request/${request.id}/reject`, { reviewNotes: reason });
      showMessage('success', 'Request rejected successfully');
      fetchRequests();
      fetchStats();
    } catch (err) {
      showMessage('error', err.response?.data?.error || 'Could not reject request');
    }
  };

  const filteredSchools = useMemo(() => {
    if (schoolFilter === 'active') return schools.filter((s) => s.isActive);
    if (schoolFilter === 'inactive') return schools.filter((s) => !s.isActive);
    if (schoolFilter === 'hasClasses') return schools.filter((s) => (s._count?.classes || 0) > 0);
    if (schoolFilter === 'hasStudents') return schools.filter((s) => (s._count?.students || 0) > 0);
    return schools;
  }, [schools, schoolFilter]);

  const statCards = [
    {
      key: 'totalSchools',
      label: 'Total Schools',
      value: stats.totalSchools || 0,
      icon: FaSchool,
      color: 'from-blue-500 to-blue-700',
      action: () => {
        setActiveSection('schools');
        setSchoolFilter('all');
      },
    },
    {
      key: 'activeSchools',
      label: 'Active Schools',
      value: stats.activeSchools || 0,
      icon: FaCheckCircle,
      color: 'from-emerald-500 to-emerald-700',
      action: () => {
        setActiveSection('schools');
        setSchoolFilter('active');
      },
    },
    {
      key: 'pendingRequests',
      label: 'Pending Requests',
      value: stats.pendingRequests || 0,
      icon: FaInbox,
      color: 'from-amber-500 to-orange-600',
      action: () => {
        setActiveSection('requests');
      },
    },
    {
      key: 'totalClasses',
      label: 'Schools With Classes',
      value: stats.totalClasses || 0,
      icon: FaBuilding,
      color: 'from-violet-500 to-violet-700',
      action: () => {
        setActiveSection('schools');
        setSchoolFilter('hasClasses');
      },
    },
    {
      key: 'totalStudents',
      label: 'Schools With Students',
      value: stats.totalStudents || 0,
      icon: FaUsers,
      color: 'from-rose-500 to-pink-600',
      action: () => {
        setActiveSection('schools');
        setSchoolFilter('hasStudents');
      },
    },
  ];

  return (
    <SuperAdminPortalLayout
      title="Platform Management"
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      badges={{ requests: requests.length }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-800 to-slate-700 p-6 text-white relative overflow-hidden mb-6">
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/10 rounded-full" />
          <div className="absolute -left-4 bottom-0 w-24 h-24 bg-white/10 rounded-full" />
          <p className="text-indigo-100 text-sm mb-1">Command center</p>
          <h2 className="text-2xl font-bold mb-1">Super Admin Control Panel</h2>
          <p className="text-indigo-100 text-sm">Review school requests, onboard new schools, and monitor platform growth from one dashboard.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          {statCards.map((s) => (
            <button key={s.key} onClick={s.action} className={`rounded-2xl bg-gradient-to-br ${s.color} p-4 text-white text-left shadow-lg hover:shadow-xl transition-all`}>
              <s.icon className="text-xl mb-3 opacity-90" />
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs font-semibold mt-1 opacity-90">{s.label}</p>
            </button>
          ))}
        </div>

        {message && (
          <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'} mb-6`}>
            {message.text}
          </div>
        )}

        {activeSection === 'schools' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900">Schools {schoolFilter !== 'all' ? `(${schoolFilter})` : ''}</h3>
              {!showForm && (
                <button onClick={() => setShowForm(true)} className="btn btn-primary flex items-center gap-2">
                  <FaPlus /> Add School Account
                </button>
              )}
            </div>

            {showForm && (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 mb-8 shadow-xl shadow-slate-200/70 md:p-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">{editingId ? 'Edit School Account' : 'Create New School Account'}</h2>
                <p className="text-sm text-slate-500 mb-6">Set up the school profile and optionally provision a school admin login.</p>
                <form onSubmit={handleSubmit}>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 mb-5">
                    <h3 className="text-slate-900 font-semibold mb-4">School / Brand Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="label text-slate-700">School / Brand Name *</label>
                        <input className="input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                      </div>
                      <div>
                        <label className="label text-slate-700">City</label>
                        <input className="input" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
                      </div>
                      <div>
                        <label className="label text-slate-700">Phone</label>
                        <input className="input" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                      </div>
                      <div>
                        <label className="label text-slate-700">Email</label>
                        <input className="input" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                      </div>
                      <div className="md:col-span-2">
                        <label className="label text-slate-700">Address</label>
                        <input className="input" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                      </div>
                    </div>
                  </div>

                  {!editingId && (
                    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 mb-5">
                      <h3 className="text-slate-900 font-semibold mb-2">School Admin Account (Optional)</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input className="input" placeholder="Admin first name" value={formData.schoolAdminFirstName} onChange={(e) => setFormData({ ...formData, schoolAdminFirstName: e.target.value })} />
                        <input className="input" placeholder="Admin last name" value={formData.schoolAdminLastName} onChange={(e) => setFormData({ ...formData, schoolAdminLastName: e.target.value })} />
                        <input className="input" type="email" placeholder="Admin email" value={formData.schoolAdminEmail} onChange={(e) => setFormData({ ...formData, schoolAdminEmail: e.target.value })} />
                        <input className="input" type="password" placeholder="Admin password" value={formData.schoolAdminPassword} onChange={(e) => setFormData({ ...formData, schoolAdminPassword: e.target.value })} />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button type="submit" className="btn btn-primary">{editingId ? 'Update School' : 'Create School Account'}</button>
                    <button type="button" onClick={resetForm} className="btn btn-outline">Cancel</button>
                  </div>
                </form>
              </div>
            )}

            {loadingSchools ? (
              <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div></div>
            ) : filteredSchools.length === 0 && !showForm ? (
              <div className="card mx-auto max-w-2xl text-center py-20">
                <FaSchool className="text-5xl text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600">No Schools Found</h3>
                <p className="text-gray-400 mt-2 mb-6">Try a different tile filter or add a new school account.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredSchools.map((school) => (
                  <div key={school.id} className={`card hover:shadow-lg transition-all ${!school.isActive ? 'opacity-60' : ''}`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                          {school.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-800">{school.name}</h3>
                          <p className="text-sm text-gray-500">{school.city || 'No city'}</p>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${school.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {school.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      {school.phone && <div>Phone: {school.phone}</div>}
                      {school.email && <div>Email: {school.email}</div>}
                      <div className="flex gap-4 pt-2 border-t">
                        <span className="font-medium text-blue-600">{school._count?.classes || school.classes?.length || 0} Classes</span>
                        <span className="font-medium text-pink-600">{school._count?.students || 0} Students</span>
                        <span className="font-medium text-violet-600">{school._count?.admins || school.admins?.length || 0} Admins</span>
                      </div>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => navigate(`/super-admin/school/${school.id}`)} className="btn btn-sm btn-outline flex items-center gap-1"><FaEye /> View</button>
                      <button onClick={() => handleEdit(school)} className="btn btn-sm btn-outline flex items-center gap-1 text-blue-600 border-blue-300"><FaEdit /> Edit</button>
                      <button onClick={() => handleToggleActive(school)} className={`btn btn-sm flex items-center gap-1 ${school.isActive ? 'btn-outline text-orange-600 border-orange-300' : 'btn-success'}`}>
                        {school.isActive ? <><FaToggleOff /> Deactivate</> : <><FaToggleOn /> Activate</>}
                      </button>
                      <button onClick={() => handleDelete(school)} className="btn btn-sm btn-danger flex items-center gap-1"><FaTrash /> Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeSection === 'requests' && (
          <>
            <h3 className="text-xl font-bold text-slate-900 mb-4">Pending School Registration Requests</h3>
            {loadingRequests ? (
              <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500"></div></div>
            ) : requests.length === 0 ? (
              <div className="card mx-auto max-w-2xl text-center py-16">
                <FaInbox className="text-5xl text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700">No Pending Requests</h3>
                <p className="text-gray-400 mt-2">All school registration requests have been processed.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {requests.map((request) => (
                  <div key={request.id} className="card border border-amber-100">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{request.schoolName}</h3>
                        <p className="text-sm text-gray-500 mt-1">Requested {new Date(request.createdAt).toLocaleString()}</p>
                      </div>
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">Pending</span>
                    </div>

                    <div className="mt-4 space-y-2 text-sm text-gray-700">
                      <p><span className="font-semibold">Contact:</span> {request.contactFirstName} {request.contactLastName}</p>
                      <p><span className="font-semibold">Email:</span> {request.contactEmail}</p>
                      <p><span className="font-semibold">Phone:</span> {request.contactPhone || '-'}</p>
                      <p><span className="font-semibold">City:</span> {request.city || '-'}</p>
                      <p><span className="font-semibold">Address:</span> {request.address || '-'}</p>
                    </div>

                    <div className="mt-5 flex gap-2 flex-wrap">
                      <button className="btn btn-success btn-sm" onClick={() => openApproveModal(request)}><FaCheckCircle /> Approve</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleRejectRequest(request)}><FaBan /> Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {showApprovalModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900">Approve Registration Request</h3>
              <button onClick={closeApproveModal} className="text-slate-400 hover:text-slate-700"><FaTimes /></button>
            </div>

            <p className="text-sm text-slate-600 mb-4">School: <span className="font-semibold text-slate-900">{selectedRequest.schoolName}</span></p>

            <form onSubmit={handleApproveRequest} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input className="input" placeholder="Admin first name" value={approvalForm.adminFirstName} onChange={(e) => setApprovalForm({ ...approvalForm, adminFirstName: e.target.value })} required />
                <input className="input" placeholder="Admin last name" value={approvalForm.adminLastName} onChange={(e) => setApprovalForm({ ...approvalForm, adminLastName: e.target.value })} required />
              </div>
              <input className="input" type="email" placeholder="Admin email" value={approvalForm.adminEmail} onChange={(e) => setApprovalForm({ ...approvalForm, adminEmail: e.target.value })} required />
              <input className="input" type="text" placeholder="Optional password (auto-generated if empty)" value={approvalForm.adminPassword} onChange={(e) => setApprovalForm({ ...approvalForm, adminPassword: e.target.value })} />
              <textarea className="input" rows={3} placeholder="Review notes (optional)" value={approvalForm.reviewNotes} onChange={(e) => setApprovalForm({ ...approvalForm, reviewNotes: e.target.value })} />
              <div className="flex gap-3 pt-2">
                <button className="btn btn-primary" type="submit">Create School And Approve</button>
                <button className="btn btn-outline" type="button" onClick={closeApproveModal}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SuperAdminPortalLayout>
  );
}
