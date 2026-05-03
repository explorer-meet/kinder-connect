import React from 'react';
import TeacherPortalLayout from '../../components/TeacherPortalLayout';

const IncidentReporter = () => {
  return (
    <TeacherPortalLayout title="Incident Report">
      <div className="card">
        <h2 className="text-xl font-bold text-gray-800 mb-3">Report Incident</h2>
        <p className="text-gray-600">Incident reporting form (bump, fall, fever, etc.) coming soon...</p>
      </div>
    </TeacherPortalLayout>
  );
};

export default IncidentReporter;
