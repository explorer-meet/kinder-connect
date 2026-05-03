import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaBuilding, FaPlus, FaEdit, FaTrash, FaToggleOn, FaToggleOff,
  FaUsers, FaChartBar, FaSchool, FaCheckCircle, FaTimesCircle, FaEye
} from 'react-icons/fa';
import Header from '../../components/Header';
import api from '../../api/api';

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [schools, setSchools] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState(null);
  const [formData, setFormData] = useState({
    name: '', description: '', address: '', city: '', phone: '', email: '', website: '',
    schoolAdminFirstName: '', schoolAdminLastName: '', schoolAdminEmail: '', schoolAdminPassword: ''
  });

  useEffect(() => {
    fetchSchools();
    fetchStats();
  }, []);

  const fetchSchools = async () => {
    try {
      setLoading(true);
      const res = await api.get('/superadmin/schools');
      setSchools(res.data);
    } catch (err) {
      showMessage('error', err.response?.data?.error || 'Failed to load schools');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/superadmin/stats');
      setStats(res.data);
    } catch (err) {}
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
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
      schoolAdminFirstName: '', schoolAdminLastName: '', schoolAdminEmail: '', schoolAdminPassword: ''
    });
    setShowForm(true);
    window.scrollTo(0, 0);
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

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      name: '', description: '', address: '', city: '', phone: '', email: '', website: '',
      schoolAdminFirstName: '', schoolAdminLastName: '', schoolAdminEmail: '', schoolAdminPassword: ''
    });
  };

  const statCards = [
    { label: 'Total Schools', value: stats.totalSchools || 0, icon: FaSchool, color: 'from-blue-500 to-blue-600' },
    { label: 'Active Schools', value: stats.activeSchools || 0, icon: FaCheckCircle, color: 'from-green-500 to-green-600' },
    { label: 'Total Classes', value: stats.totalClasses || 0, icon: FaBuilding, color: 'from-purple-500 to-purple-600' },
    { label: 'Total Students', value: stats.totalStudents || 0, icon: FaUsers, color: 'from-pink-500 to-pink-600' },
  ];
  const hasSchools = schools.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Platform Management</h1>
            <p className="text-gray-500 mt-1">Manage all school accounts across the platform</p>
          </div>
          {hasSchools && !showForm && (
            <button onClick={() => setShowForm(true)} className="btn btn-primary flex items-center gap-2">
              <FaPlus /> Add School Account
            </button>
          )}
        </div>

        {/* Message */}
        {message && (
          <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'} mb-6`}>
            {message.text}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {statCards.map((s, i) => (
            <div key={i} className={`bg-gradient-to-br ${s.color} rounded-2xl p-5 text-white`}>
              <s.icon className="text-2xl mb-2 opacity-80" />
              <div className="text-3xl font-bold">{s.value}</div>
              <div className="text-sm opacity-80 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 mb-8 shadow-xl shadow-slate-200/70 md:p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              {editingId ? 'Edit School Account' : 'Create New School Account'}
            </h2>
            <p className="text-sm text-slate-500 mb-6">Set up the school profile and optionally provision a school admin login.</p>
            <form onSubmit={handleSubmit}>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 mb-5">
                <h3 className="text-slate-900 font-semibold mb-4">School / Brand Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label text-slate-700">School / Brand Name *</label>
                    <input className="input" placeholder="e.g., Shanit Juniors" value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                  </div>
                  <div>
                    <label className="label text-slate-700">City</label>
                    <input className="input" placeholder="City" value={formData.city}
                      onChange={e => setFormData({ ...formData, city: e.target.value })} />
                  </div>
                  <div>
                    <label className="label text-slate-700">Phone</label>
                    <input className="input" placeholder="Phone" value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                  </div>
                  <div>
                    <label className="label text-slate-700">Email</label>
                    <input className="input" placeholder="Email" type="email" value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="label text-slate-700">Address</label>
                    <input className="input" placeholder="Address" value={formData.address}
                      onChange={e => setFormData({ ...formData, address: e.target.value })} />
                  </div>
                </div>
              </div>

              {!editingId && (
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 mb-5">
                  <h3 className="text-slate-900 font-semibold mb-2">School Admin Account (Optional)</h3>
                  <p className="text-slate-600 text-sm mb-4">Create a school admin login for this school account.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label text-slate-700">First Name</label>
                      <input className="input" placeholder="Admin First Name" value={formData.schoolAdminFirstName}
                        onChange={e => setFormData({ ...formData, schoolAdminFirstName: e.target.value })} />
                    </div>
                    <div>
                      <label className="label text-slate-700">Last Name</label>
                      <input className="input" placeholder="Admin Last Name" value={formData.schoolAdminLastName}
                        onChange={e => setFormData({ ...formData, schoolAdminLastName: e.target.value })} />
                    </div>
                    <div>
                      <label className="label text-slate-700">Admin Email</label>
                      <input className="input" placeholder="admin@school.com" type="email" value={formData.schoolAdminEmail}
                        onChange={e => setFormData({ ...formData, schoolAdminEmail: e.target.value })} />
                    </div>
                    <div>
                      <label className="label text-slate-700">Admin Password</label>
                      <input className="input" placeholder="Min 6 characters" type="password" value={formData.schoolAdminPassword}
                        onChange={e => setFormData({ ...formData, schoolAdminPassword: e.target.value })} />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Update School' : 'Create School Account'}
                </button>
                <button type="button" onClick={resetForm} className="btn btn-outline text-slate-700 border-slate-300 hover:bg-slate-100">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Schools List */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          </div>
        ) : schools.length === 0 && !showForm ? (
          <div className="card mx-auto max-w-2xl text-center py-20">
            <FaSchool className="text-5xl text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600">No Schools Yet</h3>
            <p className="text-gray-400 mt-2 mb-6">Create the first school account to get started</p>
            <button onClick={() => setShowForm(true)} className="btn btn-primary mx-auto">
              <FaPlus className="mr-2" /> Add School Account
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {schools.map(school => (
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
                  {school.phone && <div>📞 {school.phone}</div>}
                  {school.email && <div>✉️ {school.email}</div>}
                  <div className="flex gap-4 pt-2 border-t">
                    <span className="font-medium text-blue-600">{school.classes?.length || 0} Classes</span>
                    <span className="font-medium text-purple-600">{school.admins?.length || 0} Admins</span>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => navigate(`/super-admin/school/${school.id}`)}
                    className="btn btn-sm btn-outline flex items-center gap-1">
                    <FaEye /> View
                  </button>
                  <button onClick={() => handleEdit(school)}
                    className="btn btn-sm btn-outline flex items-center gap-1 text-blue-600 border-blue-300">
                    <FaEdit /> Edit
                  </button>
                  <button onClick={() => handleToggleActive(school)}
                    className={`btn btn-sm flex items-center gap-1 ${school.isActive ? 'btn-outline text-orange-600 border-orange-300' : 'btn-success'}`}>
                    {school.isActive ? <><FaToggleOff /> Deactivate</> : <><FaToggleOn /> Activate</>}
                  </button>
                  <button onClick={() => handleDelete(school)}
                    className="btn btn-sm btn-danger flex items-center gap-1">
                    <FaTrash /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
