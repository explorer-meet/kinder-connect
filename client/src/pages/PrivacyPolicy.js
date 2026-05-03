import React from 'react';
import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0f9ff] via-[#f8fafc] to-[#fdf2f8] px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-3xl bg-gradient-to-r from-cyan-600 to-blue-600 p-8 text-white shadow-xl shadow-cyan-200/60 sm:p-10">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-100">Legal</p>
          <h1 className="mt-3 text-4xl font-bold">Privacy Policy</h1>
          <p className="mt-3 max-w-2xl text-cyan-50">Kinder Connect is designed for schools and families. This policy explains what we collect, why we collect it, and how access is controlled.</p>
          <p className="mt-4 text-sm text-cyan-100">Last updated: May 3, 2026</p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {[
            ['1. Information We Collect', 'We collect school profile details, staff and parent account information, and student operational data required to provide kindergarten management services.'],
            ['2. How We Use Data', 'Data is used to manage enrollment, attendance, activities, communication, and reporting. We do not sell user data.'],
            ['3. Data Access', 'Access is role-based. Super admins manage school setup, school admins manage school operations, teachers manage classroom data, and parents see child-specific information.'],
            ['4. Security', 'We use authentication, encrypted credentials, and service-level access controls to protect account and school data.'],
            ['5. Retention', 'School data remains available for operational and reporting needs based on organizational account lifecycle and policy requirements.'],
            ['6. Contact', 'For data correction or account-related help, contact the Kinder Connect support channel through your school admin.'],
          ].map(([title, text]) => (
            <section key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/50">
              <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-700">{text}</p>
            </section>
          ))}
        </div>

        <div className="mt-8">
          <Link to="/" className="inline-flex items-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
