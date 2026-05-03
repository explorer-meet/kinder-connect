import React, { useState, useEffect } from 'react';
import Header from '../../components/Header';
import api from '../../api/api';
import { FaPlus, FaTrash } from 'react-icons/fa';

const StudentEnrollment = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    enrollmentNumber: '',
    classId: '',
    schoolId: '',
    parentIds: [],
    allergies: [],
    medicalNotes: '',
    authorizedPickup: [],
  });

  const [classes, setClasses] = useState([]);
  const [schools, setSchools] = useState([]);
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [newParentEmail, setNewParentEmail] = useState('');
  const [newAllergy, setNewAllergy] = useState('');
  const [newAuthorizedPickup, setNewAuthorizedPickup] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch schools and classes
      const schoolsRes = await api.get('/admin/schools');
      setSchools(schoolsRes.data || []);

      const classesRes = await api.get('/admin/classes');
      setClasses(classesRes.data || []);

      // Fetch parents (users with role 'parent')
      const parentsRes = await api.get('/admin/parents');
      setParents(parentsRes.data || []);
    } catch (err) {
      console.error('Fetch error:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddParent = () => {
    if (newParentEmail.trim()) {
      const parentExists = parents.find(p => p.email === newParentEmail);
      if (parentExists && !formData.parentIds.includes(parentExists.id)) {
        setFormData(prev => ({
          ...prev,
          parentIds: [...prev.parentIds, parentExists.id],
        }));
        setNewParentEmail('');
      } else if (!parentExists) {
        setMessage({ type: 'error', text: 'Parent not found. Please create parent account first.' });
      } else {
        setMessage({ type: 'warning', text: 'Parent already added.' });
      }
    }
  };

  const handleRemoveParent = (parentId) => {
    setFormData(prev => ({
      ...prev,
      parentIds: prev.parentIds.filter(id => id !== parentId),
    }));
  };

  const handleAddAllergy = () => {
    if (newAllergy.trim()) {
      setFormData(prev => ({
        ...prev,
        allergies: [...prev.allergies, newAllergy],
      }));
      setNewAllergy('');
    }
  };

  const handleRemoveAllergy = (index) => {
    setFormData(prev => ({
      ...prev,
      allergies: prev.allergies.filter((_, i) => i !== index),
    }));
  };

  const handleAddAuthorizedPickup = () => {
    if (newAuthorizedPickup.trim()) {
      setFormData(prev => ({
        ...prev,
        authorizedPickup: [...prev.authorizedPickup, newAuthorizedPickup],
      }));
      setNewAuthorizedPickup('');
    }
  };

  const handleRemoveAuthorizedPickup = (index) => {
    setFormData(prev => ({
      ...prev,
      authorizedPickup: prev.authorizedPickup.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Validate required fields
      if (!formData.firstName || !formData.lastName || !formData.classId || !formData.schoolId) {
        setMessage({ type: 'error', text: 'Please fill all required fields' });
        setLoading(false);
        return;
      }

      const response = await api.post('/students', {
        ...formData,
      });

      setMessage({ type: 'success', text: `Student ${response.data.student.firstName} enrolled successfully!` });
      
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        enrollmentNumber: '',
        classId: '',
        schoolId: '',
        parentIds: [],
        allergies: [],
        medicalNotes: '',
        authorizedPickup: [],
      });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to enroll student' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Student Enrollment" />
      <div className="container mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-8">Enroll New Student</h2>

        {message.text && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-100 text-green-800' :
            message.type === 'error' ? 'bg-red-100 text-red-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="card max-w-2xl">
          {/* Basic Information */}
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Basic Information</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <input
                type="text"
                name="firstName"
                placeholder="First Name *"
                value={formData.firstName}
                onChange={handleInputChange}
                className="input"
                required
              />
              <input
                type="text"
                name="lastName"
                placeholder="Last Name *"
                value={formData.lastName}
                onChange={handleInputChange}
                className="input"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <input
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleInputChange}
                className="input"
              />
              <input
                type="text"
                name="enrollmentNumber"
                placeholder="Enrollment Number (auto-generated if empty)"
                value={formData.enrollmentNumber}
                onChange={handleInputChange}
                className="input"
              />
            </div>
          </div>

          {/* Class & School Selection */}
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Class & School</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <select
                name="schoolId"
                value={formData.schoolId}
                onChange={handleInputChange}
                className="input"
                required
              >
                <option value="">Select School *</option>
                {schools.map(school => (
                  <option key={school.id} value={school.id}>{school.name}</option>
                ))}
              </select>

              <select
                name="classId"
                value={formData.classId}
                onChange={handleInputChange}
                className="input"
                required
              >
                <option value="">Select Class *</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.name} {cls.section}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Link Parents */}
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Link Parents</h3>
            
            <div className="flex gap-2 mb-4">
              <input
                type="email"
                placeholder="Parent Email"
                value={newParentEmail}
                onChange={(e) => setNewParentEmail(e.target.value)}
                className="input flex-1"
              />
              <button
                type="button"
                onClick={handleAddParent}
                className="btn btn-primary flex items-center gap-2"
              >
                <FaPlus /> Add
              </button>
            </div>

            {formData.parentIds.length > 0 && (
              <div className="space-y-2">
                {formData.parentIds.map(parentId => {
                  const parent = parents.find(p => p.id === parentId);
                  return (
                    <div key={parentId} className="flex justify-between items-center bg-blue-50 p-3 rounded">
                      <span>{parent?.firstName} {parent?.lastName} ({parent?.email})</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveParent(parentId)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Medical Information */}
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Medical Information</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Allergies</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Add allergy (e.g., Peanuts)"
                  value={newAllergy}
                  onChange={(e) => setNewAllergy(e.target.value)}
                  className="input flex-1"
                />
                <button
                  type="button"
                  onClick={handleAddAllergy}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <FaPlus />
                </button>
              </div>

              {formData.allergies.length > 0 && (
                <div className="space-y-1">
                  {formData.allergies.map((allergy, index) => (
                    <div key={index} className="flex justify-between items-center bg-red-50 p-2 rounded text-sm">
                      <span>{allergy}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAllergy(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <FaTrash size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Medical Notes</label>
              <textarea
                name="medicalNotes"
                placeholder="Any medical notes or special requirements"
                value={formData.medicalNotes}
                onChange={handleInputChange}
                className="input"
                rows="3"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Authorized Pickup Persons</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Name of authorized person"
                  value={newAuthorizedPickup}
                  onChange={(e) => setNewAuthorizedPickup(e.target.value)}
                  className="input flex-1"
                />
                <button
                  type="button"
                  onClick={handleAddAuthorizedPickup}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <FaPlus />
                </button>
              </div>

              {formData.authorizedPickup.length > 0 && (
                <div className="space-y-1">
                  {formData.authorizedPickup.map((person, index) => (
                    <div key={index} className="flex justify-between items-center bg-green-50 p-2 rounded text-sm">
                      <span>{person}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAuthorizedPickup(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <FaTrash size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full btn btn-primary text-lg font-semibold"
          >
            {loading ? 'Enrolling...' : 'Enroll Student'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default StudentEnrollment;
