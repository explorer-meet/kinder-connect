import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { FaLock, FaEnvelope, FaArrowRight } from 'react-icons/fa';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(email, password);

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

      <div className="w-full max-w-md z-10">
        {/* Card */}
        <div className="card-premium shadow-2xl backdrop-blur-sm">
          {/* Logo */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-100 to-accent-100 rounded-2xl mb-4">
              <span className="text-4xl">👶</span>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Kinder Connect</h1>
            <p className="text-gray-500 text-sm">Kindergarten Care Management System</p>
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
            {/* Email Field */}
            <div>
              <label className="label">Email Address</label>
              <div className="relative">
                <FaEnvelope className="absolute left-4 top-3.5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="input pl-10"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <FaLock className="absolute left-4 top-3.5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="input pl-10"
                />
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
                  Logging in...
                </>
              ) : (
                <>
                  Login <FaArrowRight />
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
              <span className="px-2 bg-white text-gray-500">New to Kinder Connect?</span>
            </div>
          </div>

          {/* Register Link */}
          <Link
            to="/register"
            className="btn btn-outline w-full justify-center"
          >
            Create Account
          </Link>

          {/* Demo Credentials */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Demo Credentials</p>
            <div className="space-y-2 text-xs text-gray-600 bg-gray-50 rounded-lg p-4">
              <div><span className="font-semibold text-blue-600">Super Admin:</span> superadmin@kinderconnect.com / SuperAdmin@123</div>
              <div><span className="font-semibold text-purple-600">School Admin:</span> Created when Super Admin adds a school</div>
              <div><span className="font-semibold text-green-600">Teacher/Parent:</span> Added by School Admin</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-white text-sm mt-8 opacity-80">
          © 2024 Kinder Connect. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Login;
