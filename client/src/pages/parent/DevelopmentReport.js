import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FaBook, FaChartLine, FaPalette } from 'react-icons/fa';
import ParentPortalLayout from '../../components/ParentPortalLayout';

const DevelopmentReport = () => {
  const navigate = useNavigate();
  const { studentId } = useParams();

  return (
    <ParentPortalLayout
      title="Development Report"
      subtitle={`Viewing progress for child ID ${studentId}.`}
      accent="violet"
      rightAction={{ label: 'Back to Dashboard', onClick: () => navigate('/parent/dashboard') }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-violet-100 flex items-center justify-center text-violet-600">
              <FaBook size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Monthly Development Report</h2>
              <p className="text-sm text-slate-500">Milestones, growth notes, and teacher observations will appear here.</p>
            </div>
          </div>
          <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50 p-10 text-center">
            <p className="text-slate-800 font-semibold">Development reports are coming soon</p>
            <p className="text-sm text-slate-500 mt-2">This section will include milestone summaries, strengths, support areas, and teacher comments.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 text-violet-600 font-semibold mb-3"><FaChartLine /> What You Will See</div>
            <div className="space-y-3 text-sm text-slate-600">
              <div className="rounded-2xl bg-violet-50 border border-violet-100 p-4">Learning progress across class activities and milestones.</div>
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">Teacher comments with next-step recommendations for home support.</div>
            </div>
          </div>
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 text-slate-700 font-semibold mb-3"><FaPalette /> Colour Legend</div>
            <p className="text-sm text-slate-600">Purple cards indicate development insights and learning milestones across the portal.</p>
          </div>
        </div>
      </div>
    </ParentPortalLayout>
  );
};

export default DevelopmentReport;
