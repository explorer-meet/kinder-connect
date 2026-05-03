import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaCheckCircle,
  FaBuilding,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaArrowRight,
  FaUserTie,
  FaGlobe,
  FaRocket,
  FaStar,
} from 'react-icons/fa';
import api from '../api/api';

const onboardingPoints = [
  'Submit your school details in 2 minutes',
  'Super admin reviews and approves your request',
  'Start onboarding staff and classes immediately',
];

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    schoolName: '',
    contactFirstName: '',
    contactLastName: '',
    contactEmail: '',
    contactPhone: '',
    city: '',
    address: '',
    website: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    setLoading(true);

    try {
      const response = await api.post('/auth/school-registration-request', formData);
      setSuccess(`${response.data.message} Request ID: ${response.data.requestId}`);
      setFormData({
        schoolName: '',
        contactFirstName: '',
        contactLastName: '',
        contactEmail: '',
        contactPhone: '',
        city: '',
        address: '',
        website: '',
        notes: '',
      });
      setTimeout(() => navigate('/'), 1800);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not submit request');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f766e] via-[#1d4ed8] to-[#f97316] p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-20 right-10 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 left-12 h-72 w-72 rounded-full bg-[#93c5fd]/30 blur-3xl" />

      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl items-stretch gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="hidden h-full rounded-[2rem] border border-white/25 bg-white/10 p-8 text-white backdrop-blur-sm shadow-2xl lg:flex lg:flex-col">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-2xl"><FaRocket /></div>
          <h1 className="mt-6 text-5xl font-bold leading-tight tracking-tight">Launch Your School Workspace</h1>
          <p className="mt-4 max-w-lg text-lg leading-8 text-white/90">
            Share your school details and we will help you start a polished digital experience for your staff and parents.
          </p>

          <div className="mt-8 space-y-3">
            {onboardingPoints.map((point) => (
              <div key={point} className="flex items-start gap-3 rounded-2xl border border-white/20 bg-white/15 px-4 py-3">
                <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white text-[#0f766e]">
                  <FaCheckCircle size={13} />
                </span>
                <span className="text-white/95 font-medium">{point}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full h-full rounded-[2rem] border border-white/60 bg-white/95 p-5 shadow-2xl backdrop-blur-sm sm:p-8">
          <div className="mb-4 flex justify-center lg:hidden">
            <Link to="/" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              <span role="img" aria-hidden="true">👶</span>
              Back to Home
            </Link>
          </div>

          <div className="text-center mb-8">
            <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#dbeafe] to-[#ffedd5] text-[#1d4ed8] shadow-md">
              <FaStar className="text-2xl" />
            </div>
            <h2 className="mt-4 text-3xl font-bold text-slate-900">School Registration</h2>
            <p className="text-sm text-slate-500 mt-1">Create your onboarding request</p>
          </div>

          {error && (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">School Name</label>
              <div className="relative">
                <FaBuilding className="absolute left-4 top-3.5 text-slate-400" />
                <input
                  type="text"
                  name="schoolName"
                  value={formData.schoolName}
                  onChange={handleChange}
                  placeholder="Sunrise Kids Preschool"
                  required
                  className="input pl-10 rounded-xl"
                />
              </div>
            </div>

            {/* Contact Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="label">Contact First Name</label>
                <div className="relative">
                  <FaUserTie className="absolute left-4 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    name="contactFirstName"
                    value={formData.contactFirstName}
                    onChange={handleChange}
                    placeholder="John"
                    required
                    className="input pl-10 rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="label">Contact Last Name</label>
                <div className="relative">
                  <FaUserTie className="absolute left-4 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    name="contactLastName"
                    value={formData.contactLastName}
                    onChange={handleChange}
                    placeholder="Doe"
                    required
                    className="input pl-10 rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label className="label">Contact Email Address</label>
              <div className="relative">
                <FaEnvelope className="absolute left-4 top-3.5 text-slate-400" />
                <input
                  type="email"
                  name="contactEmail"
                  value={formData.contactEmail}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  required
                  className="input pl-10 rounded-xl"
                />
              </div>
            </div>

            {/* Phone Field */}
            <div>
              <label className="label">Contact Phone Number</label>
              <div className="relative">
                <FaPhone className="absolute left-4 top-3.5 text-slate-400" />
                <input
                  type="tel"
                  name="contactPhone"
                  value={formData.contactPhone}
                  onChange={handleChange}
                  placeholder="+1 (555) 123-4567"
                  className="input pl-10 rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="label">City</label>
                <div className="relative">
                  <FaMapMarkerAlt className="absolute left-4 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="City"
                    className="input pl-10 rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="label">Website</label>
                <div className="relative">
                  <FaGlobe className="absolute left-4 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    placeholder="https://yourschool.com"
                    className="input pl-10 rounded-xl"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="label">Address</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="School address"
                className="input rounded-xl"
              />
            </div>

            <div>
              <label className="label">Notes (Optional)</label>
              <textarea
                rows={3}
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Tell us a little about your school and onboarding timeline"
                className="input rounded-xl"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3.5 text-base font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Submitting Request...
                </>
              ) : (
                <>
                  Submit Registration Request <FaArrowRight />
                </>
              )}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Already have an account?</span>
            </div>
          </div>

          <Link to="/login" className="inline-flex w-full items-center justify-center rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50">
            Sign In
          </Link>

          <p className="text-xs text-gray-500 text-center mt-6">
            By submitting, you agree to our Terms and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
