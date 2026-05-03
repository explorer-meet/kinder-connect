import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { FaLock, FaEnvelope, FaArrowRight, FaSchool, FaStar, FaChild, FaHeart } from 'react-icons/fa';

const highlights = [
  { icon: FaSchool, label: 'School-ready workflows' },
  { icon: FaChild, label: 'Parent-friendly visibility' },
  { icon: FaHeart, label: 'Built for kinder care teams' },
];

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
    <div className="min-h-screen bg-gradient-to-br from-[#0f766e] via-[#1d4ed8] to-[#f97316] p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-14 -left-14 h-56 w-56 rounded-full bg-white/20 blur-3xl" />
      <div className="pointer-events-none absolute right-6 top-16 h-44 w-44 rounded-full bg-[#fde68a]/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 left-1/3 h-64 w-64 rounded-full bg-[#93c5fd]/25 blur-3xl" />

      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="hidden rounded-[2rem] border border-white/25 bg-white/10 p-8 text-white backdrop-blur-sm shadow-2xl lg:block">
          <Link to="/" className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-2xl font-bold hover:bg-white/30 transition" aria-label="Go to landing page">
            <span role="img" aria-hidden="true">👶</span>
          </Link>
          <h1 className="mt-6 text-5xl font-bold leading-tight tracking-tight">Welcome Back To Kinder Connect</h1>
          <p className="mt-4 max-w-lg text-white/90 text-lg leading-8">
            Continue managing classes, attendance, parent communication, and school operations from one calm dashboard.
          </p>

          <div className="mt-8 space-y-3">
            {highlights.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center gap-3 rounded-2xl bg-white/15 px-4 py-3 border border-white/20">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#1d4ed8]">
                    <Icon />
                  </span>
                  <span className="font-semibold text-white/95">{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="w-full rounded-[2rem] border border-white/60 bg-white/95 p-5 shadow-2xl backdrop-blur-sm sm:p-8">
          <div className="mb-4 flex justify-center lg:hidden">
            <Link to="/" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              <span role="img" aria-hidden="true">👶</span>
              Back to Home
            </Link>
          </div>

          <div className="text-center">
            <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#dbeafe] to-[#ffedd5] text-[#1d4ed8] shadow-md">
              <FaStar className="text-2xl" />
            </div>
            <h2 className="mt-4 text-3xl font-bold text-slate-900">Sign In</h2>
            <p className="mt-1 text-sm text-slate-500">Access your school workspace</p>
          </div>

          {error && (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label className="label">Email Address</label>
              <div className="relative">
                <FaEnvelope className="absolute left-4 top-3.5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@school.com"
                  required
                  className="input pl-10 rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <FaLock className="absolute left-4 top-3.5 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                  required
                  className="input pl-10 rounded-xl"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3.5 text-base font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Logging in...
                </>
              ) : (
                <>
                  Enter Dashboard <FaArrowRight />
                </>
              )}
            </button>
          </form>

          <div className="relative my-7">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-3 text-slate-500">New school to onboard?</span>
            </div>
          </div>

          <Link to="/register" className="inline-flex w-full items-center justify-center rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50">
            Request School Registration
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
