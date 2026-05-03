import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaComments, FaInfoCircle } from 'react-icons/fa';
import ParentPortalLayout from '../../components/ParentPortalLayout';

const Chat = () => {
  const navigate = useNavigate();

  return (
    <ParentPortalLayout
      title="Parent Chat"
      subtitle="Start conversations with teachers from one place."
      accent="rose"
      rightAction={{ label: 'Back to Dashboard', onClick: () => navigate('/parent/dashboard') }}
    >
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600">
              <FaComments size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Chat with Teachers</h2>
              <p className="text-sm text-slate-500">Secure school communication without switching to WhatsApp.</p>
            </div>
          </div>
          <div className="rounded-2xl border border-dashed border-rose-200 bg-rose-50 p-10 text-center">
            <p className="text-slate-800 font-semibold">Chat interface coming soon</p>
            <p className="text-sm text-slate-500 mt-2">This area will show your teacher conversations, unread messages, and quick reply actions.</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-2 text-rose-600 font-semibold mb-3">
            <FaInfoCircle /> Communication Notes
          </div>
          <div className="space-y-3 text-sm text-slate-600">
            <div className="rounded-2xl bg-rose-50 border border-rose-100 p-4">Use chat for classroom updates, questions, and follow-ups with the school.</div>
            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">Important school-wide announcements will continue to appear in Circulars.</div>
          </div>
        </div>
      </div>
    </ParentPortalLayout>
  );
};

export default Chat;
