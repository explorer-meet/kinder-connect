import React, { useState, useEffect } from 'react';
import Header from '../../components/Header';
import api from '../../api/api';
import { FaPlus, FaEdit, FaTrash, FaMapMarkerAlt, FaPhone, FaEnvelope, FaUsers, FaBook, FaArrowRight } from 'react-icons/fa';

const SchoolManagement = () => {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    phone: '',
    email: '',
  });
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/schools');
      setSchools(response.data || []);
      setError('');
    } catch (err) {
      console.error('Fetch schools error:', err);
      setError('Failed to load schools');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.address || !formData.city) {
      setMessage({ type: 'error', text: 'Please fill in required fields (Name, Address, City)' });
      return;
    }

    try {
      if (editingId) {
        await api.put(`/admin/school/${editingId}`, formData);
        setMessage({ type: 'success', text: 'School updated successfully!' });
      } else {
        await api.post('/admin/school', formData);
        setMessage({ type: 'success', text: 'School created successfully!' });
      }
      
      setFormData({ name: '', address: '', city: '', phone: '', email: '' });
      setEditingId(null);
      setShowForm(false);
      await fetchSchools();
      
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      console.error('Submit error:', err);
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to save school' });
    }
  };

  const handleEdit = (school) => {
    setFormData({
      name: school.name,
      address: school.address || '',
      city: school.city || '',
      phone: school.phone || '',
      email: school.email || '',
    });
    setEditingId(school.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this school? This action cannot be undone.')) {
      try {
        await api.delete(`/admin/school/${id}`);
        setMessage({ type: 'success', text: 'School deleted successfully!' });
        await fetchSchools();
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      } catch (err) {
        console.error('Delete error:', err);
        setMessage({ type: 'error', text: 'Failed to delete school' });
      }
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', address: '', city: '', phone: '', email: '' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="School Management" />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-4xl font-bold text-gray-900 mb-2">📚 Schools</h2>
            <p className="text-gray-600">Manage all schools in the system</p>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="btn btn-primary"
            >
              <FaPlus /> Add School
            </button>
          )}
        </div>

        {/* Messages */}
        {message.text && (
          <div className={`mb-6 alert alert-${message.type}`}>
            {message.text}
          </div>
        )}

        {/* Add/Edit Form */}
        {showForm && (
          <div className="card-gradient mb-8 fade-in">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">
                {editingId ? '✏️ Edit School' : '➕ Add New School'}
              </h3>
              <button
                onClick={handleCancel}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* School Name */}
                <div>
                  <label className="label">School Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., Sunshine Kindergarten"
                    className="input"
                    required
                  />
                </div>

                {/* City */}
                <div>
                  <label className="label">City *</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="e.g., New York"
                    className="input"
                    required
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="label">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+1 (555) 123-4567"
                    className="input"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="school@example.com"
                    className="input"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="label">Address *</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="123 Main Street, Building A"
                  rows="3"
                  className="input"
                  required
                ></textarea>
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                >
                  {editingId ? 'Update School' : 'Create School'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-2 border-primary-500 mb-4"></div>
              <p className="text-gray-600">Loading schools...</p>
            </div>
          </div>
        )}

        {/* Schools Grid */}
        {!loading && schools.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {schools.map((school) => (
              <div key={school.id} className="card-premium group hover:scale-105 transition-transform duration-300">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900">{school.name}</h3>
                    <p className="text-sm text-primary-600 font-medium">{school.city}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(school)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <FaEdit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(school.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <FaTrash size={18} />
                    </button>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-3 mb-5 pb-5 border-b border-gray-200">
                  {school.address && (
                    <div className="flex items-start gap-3">
                      <FaMapMarkerAlt className="text-red-500 mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Address</p>
                        <p className="text-sm text-gray-700">{school.address}</p>
                      </div>
                    </div>
                  )}

                  {school.phone && (
                    <div className="flex items-center gap-3">
                      <FaPhone className="text-green-500 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Phone</p>
                        <p className="text-sm text-gray-700">{school.phone}</p>
                      </div>
                    </div>
                  )}

                  {school.email && (
                    <div className="flex items-center gap-3">
                      <FaEnvelope className="text-blue-500 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Email</p>
                        <p className="text-sm text-gray-700">{school.email}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-primary-600">
                      {school.classes?.length || 0}
                    </p>
                    <p className="text-xs text-gray-600 flex items-center justify-center gap-1 mt-1">
                      <FaBook size={12} /> Classes
                    </p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {school.users?.length || 0}
                    </p>
                    <p className="text-xs text-gray-600 flex items-center justify-center gap-1 mt-1">
                      <FaUsers size={12} /> Staff
                    </p>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => handleEdit(school)}
                  className="w-full btn btn-outline text-center flex items-center justify-center gap-2"
                >
                  View Details <FaArrowRight size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && schools.length === 0 && (
          <div className="card text-center py-16">
            <div className="text-6xl mb-4">🏫</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No Schools Yet</h3>
            <p className="text-gray-600 mb-6">Get started by creating your first school</p>
            <button
              onClick={() => setShowForm(true)}
              className="btn btn-primary"
            >
              <FaPlus /> Create First School
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SchoolManagement;
