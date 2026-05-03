import React from 'react';
import { Link } from 'react-router-dom';

export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fff7ed] via-[#f8fafc] to-[#eef2ff] px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-3xl bg-gradient-to-r from-orange-500 to-amber-500 p-8 text-white shadow-xl shadow-orange-200/60 sm:p-10">
          <p className="text-xs uppercase tracking-[0.24em] text-amber-100">Legal</p>
          <h1 className="mt-3 text-4xl font-bold">Terms and Conditions</h1>
          <p className="mt-3 max-w-2xl text-amber-50">These terms govern your use of Kinder Connect for school administration, classroom workflows, and parent communication.</p>
          <p className="mt-4 text-sm text-amber-100">Last updated: May 3, 2026</p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {[
            ['1. Use of Service', 'Kinder Connect is provided for school administration, classroom operations, and parent communication in early childhood institutions.'],
            ['2. Account Responsibility', 'Schools are responsible for maintaining accurate account data and controlling access granted to staff and parents.'],
            ['3. Data Accuracy', 'Users must ensure attendance logs, incident reports, and student records entered in the platform are accurate and timely.'],
            ['4. Acceptable Conduct', 'Users must not misuse the platform for unauthorized access, data manipulation, or disruptive activity.'],
            ['5. Service Availability', 'We continuously improve stability and usability, but temporary downtime may occur during maintenance and upgrades.'],
            ['6. Service Changes', 'Features and workflows may evolve over time to improve reliability, security, and compliance needs.'],
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
