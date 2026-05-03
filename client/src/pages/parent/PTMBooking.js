import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCalendarAlt, FaClock, FaUserFriends } from 'react-icons/fa';
import ParentPortalLayout from '../../components/ParentPortalLayout';

const PTMBooking = () => {
  const navigate = useNavigate();

  return (
    <ParentPortalLayout
      title="PTM Booking"
      subtitle="Book and manage parent-teacher meetings with a cleaner flow."
      accent="amber"
      rightAction={{ label: 'Back to Dashboard', onClick: () => navigate('/parent/dashboard') }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600">
              <FaCalendarAlt size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Book Parent-Teacher Meeting</h2>
              <p className="text-sm text-slate-500">Soon you will be able to select a teacher, slot, and agenda here.</p>
            </div>
          </div>
          <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50 p-10 text-center">
            <p className="text-slate-800 font-semibold">PTM slot booking coming soon</p>
            <p className="text-sm text-slate-500 mt-2">The booking flow will show available slots, confirmations, and reminders in this section.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 text-amber-600 font-semibold mb-3"><FaClock /> Planned Features</div>
            <div className="space-y-3 text-sm text-slate-600">
              <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4">Choose available time slots without calling the school.</div>
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">Track your upcoming and past PTM meetings in one view.</div>
            </div>
          </div>
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 text-slate-700 font-semibold mb-3"><FaUserFriends /> Meeting Tips</div>
            <p className="text-sm text-slate-600">Prepare questions around attendance, development, behaviour, and any pickup concerns before your meeting.</p>
          </div>
        </div>
      </div>
    </ParentPortalLayout>
  );
};

export default PTMBooking;
