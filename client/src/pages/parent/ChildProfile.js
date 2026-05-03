import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/api';
import ParentPortalLayout from '../../components/ParentPortalLayout';
import { FaCalendarAlt, FaSchool, FaBookmark, FaExclamationCircle, FaStethoscope } from 'react-icons/fa';

const ChildProfile = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStudentDetails = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/students/${studentId}`);
        setStudent(response.data);
        setError('');
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load student details');
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentDetails();
  }, [studentId]);

  if (loading) {
    return (
      <ParentPortalLayout
        title="Child Profile"
        subtitle="Child details, class information, and quick links"
        accent="blue"
        rightAction={{ label: 'Back to Dashboard', onClick: () => navigate('/parent/dashboard') }}
      >
        <div className="flex items-center justify-center min-h-96 bg-white rounded-3xl border border-slate-200 shadow-sm">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-600">Loading child profile...</p>
          </div>
        </div>
      </ParentPortalLayout>
    );
  }

  if (error) {
    return (
      <ParentPortalLayout
        title="Child Profile"
        subtitle="Child details, class information, and quick links"
        accent="blue"
        rightAction={{ label: 'Back to Dashboard', onClick: () => navigate('/parent/dashboard') }}
      >
        <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-4 text-rose-700">{error}</div>
      </ParentPortalLayout>
    );
  }

  if (!student) {
    return (
      <ParentPortalLayout
        title="Child Profile"
        subtitle="Child details, class information, and quick links"
        accent="blue"
        rightAction={{ label: 'Back to Dashboard', onClick: () => navigate('/parent/dashboard') }}
      >
        <div className="rounded-3xl border border-slate-200 bg-white px-4 py-4 text-slate-600 shadow-sm">Student not found.</div>
      </ParentPortalLayout>
    );
  }

  const calculateAge = (dob) => {
    if (!dob) return 'N/A';
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <ParentPortalLayout
      title={`${student.firstName} ${student.lastName}`}
      subtitle="Profile, class details, and parent quick links"
      accent="blue"
      rightAction={{ label: 'Back to Dashboard', onClick: () => navigate('/parent/dashboard') }}
    >
      <div className="bg-gradient-to-r from-blue-500 to-cyan-600 rounded-3xl p-6 text-white shadow-sm mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">{student.firstName} {student.lastName}</h1>
              <p className="text-blue-100">Enrollment #: {student.enrollmentNumber}</p>
            </div>
            <div className="text-right">
              <div className="text-5xl font-bold">{calculateAge(student.dateOfBirth)}</div>
              <p className="text-blue-100">years old</p>
            </div>
          </div>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Basic Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FaCalendarAlt className="text-blue-600" /> Basic Information
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Date of Birth</p>
                  <p className="font-semibold text-gray-800">{formatDate(student.dateOfBirth)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Age</p>
                  <p className="font-semibold text-gray-800">{calculateAge(student.dateOfBirth)} years</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Enrollment Date</p>
                  <p className="font-semibold text-gray-800">{formatDate(student.enrollmentDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="font-semibold">
                    <span className={`px-3 py-1 rounded-full text-sm ${student.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {student.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* School & Class Information */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FaSchool className="text-green-600" /> School & Class
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">School</p>
                  <p className="font-semibold text-gray-800">{student.school?.name || 'N/A'}</p>
                  {student.school?.city && <p className="text-sm text-gray-600">{student.school.city}</p>}
                </div>
                <div>
                  <p className="text-sm text-gray-600">Class</p>
                  <p className="font-semibold text-gray-800">{student.class?.name} {student.class?.section}</p>
                  {student.class?.capacity && <p className="text-sm text-gray-600">Capacity: {student.class.capacity}</p>}
                </div>
              </div>
            </div>

            {/* Medical Information */}
            <div className="bg-white rounded-3xl border border-red-200 shadow-sm p-6 border-l-4 border-l-red-500">
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FaStethoscope className="text-red-600" /> Medical Information
              </h2>

              {student.allergies && student.allergies.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <FaExclamationCircle className="text-orange-500" /> Allergies
                  </h3>
                  <div className="bg-orange-50 border border-orange-200 rounded p-4">
                    <ul className="space-y-2">
                      {student.allergies.map((allergy, index) => (
                        <li key={index} className="flex items-center gap-2 text-orange-900">
                          <span className="w-2 h-2 bg-orange-600 rounded-full"></span>
                          {allergy}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {student.medicalNotes && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Medical Notes</h3>
                  <div className="bg-gray-50 border border-gray-200 rounded p-4">
                    <p className="text-gray-700">{student.medicalNotes}</p>
                  </div>
                </div>
              )}

              {(!student.allergies || student.allergies.length === 0) && !student.medicalNotes && (
                <p className="text-gray-600">No medical information on file.</p>
              )}
            </div>

            {/* Authorized Pickup Persons */}
            {student.authorizedPickup && student.authorizedPickup.length > 0 && (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Authorized Pickup Persons</h2>
                <div className="space-y-2">
                  {student.authorizedPickup.map((person, index) => (
                    <div key={index} className="bg-blue-50 p-3 rounded flex items-center gap-2">
                      <span className="text-blue-600">✓</span>
                      <span className="font-semibold text-gray-800">{person}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Quick Links */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => navigate(`/parent/feed/${studentId}`)}
                  className="w-full btn btn-primary flex items-center gap-2 justify-center"
                >
                  <FaBookmark /> View Activity Feed
                </button>
                <button
                  onClick={() => navigate(`/parent/attendance/${studentId}`)}
                  className="w-full btn btn-secondary flex items-center gap-2 justify-center"
                >
                  📅 View Attendance
                </button>
                <button
                  onClick={() => navigate(`/parent/report/${studentId}`)}
                  className="w-full btn btn-secondary flex items-center gap-2 justify-center"
                >
                  📊 View Report
                </button>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Student Info</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-600">Enrollment Number</p>
                  <p className="font-semibold text-gray-800 break-all">{student.enrollmentNumber}</p>
                </div>
                <div>
                  <p className="text-gray-600">Class</p>
                  <p className="font-semibold text-gray-800">
                    {student.class?.name ? `${student.class.name}${student.class?.section ? ` (${student.class.section})` : ''}` : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
    </ParentPortalLayout>
  );
};

export default ChildProfile;
