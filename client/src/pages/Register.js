import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { FaUser, FaEnvelope, FaPhone, FaLock, FaArrowRight } from 'react-icons/fa';

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'parent',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { register } = useAuthStore();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    const result = await register({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      password: formData.password,
      role: formData.role,
    });

    if (result.success) {
      navigate(`/${result.user.role}/dashboard`);
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 via-primary-600 to-accent-500 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-10 right-10 w-40 h-40 bg-white opacity-10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-10 left-10 w-64 h-64 bg-accent-300 opacity-10 rounded-full blur-3xl"></div>

      <div className="w-full max-w-2xl z-10">
        {/* Card */}
        <div className="card-premium shadow-2xl backdrop-blur-sm">
          {/* Logo */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-100 to-accent-100 rounded-2xl mb-4">
              <span className="text-4xl">👶</span>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Kinder Connect</h1>
            <p className="text-gray-500 text-sm">Create Your Account</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="alert alert-error mb-6 flex items-center gap-3">
              <span className="text-lg">⚠️</span>
              <p>{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="label">First Name</label>
                <div className="relative">
                  <FaUser className="absolute left-4 top-3.5 text-gray-400" />
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="John"
                    required
                    className="input pl-10"
                  />
                </div>
              </div>
              <div>
                <label className="label">Last Name</label>
                <div className="relative">
                  <FaUser className="absolute left-4 top-3.5 text-gray-400" />
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Doe"
                    required
                    className="input pl-10"
                  />
                </div>
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label className="label">Email Address</label>
              <div className="relative">
                <FaEnvelope className="absolute left-4 top-3.5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  required
                  className="input pl-10"
                />
              </div>
            </div>

            {/* Phone Field */}
            <div>
              <label className="label">Phone Number</label>
              <div className="relative">
                <FaPhone className="absolute left-4 top-3.5 text-gray-400" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+1 (555) 123-4567"
                  required
                  className="input pl-10"
                />
              </div>
            </div>

            {/* Role Selection */}
            <div>
              <label className="label">Account Type</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="input"
              >
                <option value="parent">👨‍👩‍👧 Parent</option>
                <option value="teacher">👩‍🏫 Teacher</option>
                <option value="admin">👨‍💼 Administrator</option>
              </select>
            </div>

            {/* Password Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <FaLock className="absolute left-4 top-3.5 text-gray-400" />
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                    className="input pl-10"
                  />
                </div>
              </div>
              <div>
                <label className="label">Confirm Password</label>
                <div className="relative">
                  <FaLock className="absolute left-4 top-3.5 text-gray-400" />
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                    className="input pl-10"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full py-3 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed mt-7"
            >
              {loading ? (
                <>
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                  Creating Account...
                </>
              ) : (
                <>
                  Create Account <FaArrowRight />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Already registered?</span>
            </div>
          </div>

          {/* Login Link */}
          <Link
            to="/login"
            className="btn btn-outline w-full justify-center"
          >
            Login to Account
          </Link>

          {/* Terms */}
          <p className="text-xs text-gray-500 text-center mt-6">
            By registering, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-white text-sm mt-8 opacity-80">
          © 2024 Kinder Connect. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Register;
