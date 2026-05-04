import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';

// Pages
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsAndConditions from './pages/TermsAndConditions';

// Super Admin Pages
import SuperAdminDashboard from './pages/superadmin/Dashboard';

// School Admin Pages
import SchoolAdminDashboard from './pages/schooladmin/Dashboard';

// Teacher Pages
import TeacherDashboard from './pages/teacher/Dashboard';
import ActivityLogger from './pages/teacher/ActivityLogger';
import AttendanceMarker from './pages/teacher/AttendanceMarker';
import MilestoneTracker from './pages/teacher/MilestoneTracker';
import IncidentReporter from './pages/teacher/IncidentReporter';
import MedicalRecords from './pages/teacher/MedicalRecords';
import ReportBuilder from './pages/teacher/ReportBuilder';
import TeacherChat from './pages/teacher/Chat';
import PTMManagement from './pages/teacher/PTMManagement';

// Parent Pages
import ParentDashboard from './pages/parent/Dashboard';
import ChildProfile from './pages/parent/ChildProfile';
import ActivityFeed from './pages/parent/ActivityFeed';
import DevelopmentReport from './pages/parent/DevelopmentReport';
import AttendanceView from './pages/parent/AttendanceView';
import ParentChat from './pages/parent/Chat';
import PTMBooking from './pages/parent/PTMBooking';
import MilestoneView from './pages/parent/MilestoneView';
import IncidentView from './pages/parent/IncidentView';

// Components
import ProtectedRoute from './components/ProtectedRoute';

const getDashboardPath = (role) => {
  const paths = {
    super_admin: '/super-admin/dashboard',
    school_admin: '/school-admin/dashboard',
    teacher: '/teacher/dashboard',
    parent: '/parent/dashboard',
    admin: '/school-admin/dashboard',
  };
  return paths[role] || '/';
};

function App() {
  const { user, getUser, token } = useAuthStore();
  const [checking, setChecking] = React.useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (token && !user) {
        // Token exists but user data is missing, try to fetch it
        await getUser();
      }
      setChecking(false);
    };

    checkAuth();
  }, [token, user, getUser]);

  // Don't render routes while checking authentication
  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={user ? <Navigate to={getDashboardPath(user.role)} /> : <LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsAndConditions />} />

        {/* Super Admin Routes */}
        <Route path="/super-admin/dashboard" element={
          <ProtectedRoute requiredRole="super_admin"><SuperAdminDashboard /></ProtectedRoute>
        } />

        {/* School Admin Routes */}
        <Route path="/school-admin/dashboard" element={
          <ProtectedRoute requiredRole="school_admin"><SchoolAdminDashboard /></ProtectedRoute>
        } />

        {/* Teacher Routes */}
        <Route path="/teacher/dashboard" element={
          <ProtectedRoute requiredRole="teacher"><TeacherDashboard /></ProtectedRoute>
        } />
        <Route path="/teacher/activity" element={
          <ProtectedRoute requiredRole="teacher"><ActivityLogger /></ProtectedRoute>
        } />
        <Route path="/teacher/attendance" element={
          <ProtectedRoute requiredRole="teacher"><AttendanceMarker /></ProtectedRoute>
        } />
        <Route path="/teacher/milestones" element={
          <ProtectedRoute requiredRole="teacher"><MilestoneTracker /></ProtectedRoute>
        } />
        <Route path="/teacher/incident" element={
          <ProtectedRoute requiredRole="teacher"><IncidentReporter /></ProtectedRoute>
        } />
        <Route path="/teacher/medical" element={
          <ProtectedRoute requiredRole="teacher"><MedicalRecords /></ProtectedRoute>
        } />
        <Route path="/teacher/reports" element={
          <ProtectedRoute requiredRole="teacher"><ReportBuilder /></ProtectedRoute>
        } />
        <Route path="/teacher/chat" element={
          <ProtectedRoute requiredRole="teacher"><TeacherChat /></ProtectedRoute>
        } />
        <Route path="/teacher/ptm" element={
          <ProtectedRoute requiredRole="teacher"><PTMManagement /></ProtectedRoute>
        } />

        {/* Parent Routes */}
        <Route path="/parent/dashboard" element={
          <ProtectedRoute requiredRole="parent"><ParentDashboard /></ProtectedRoute>
        } />
        <Route path="/parent/child/:studentId" element={
          <ProtectedRoute requiredRole="parent"><ChildProfile /></ProtectedRoute>
        } />
        <Route path="/parent/feed/:studentId" element={
          <ProtectedRoute requiredRole="parent"><ActivityFeed /></ProtectedRoute>
        } />
        <Route path="/parent/report/:studentId" element={
          <ProtectedRoute requiredRole="parent"><DevelopmentReport /></ProtectedRoute>
        } />
        <Route path="/parent/attendance/:studentId" element={
          <ProtectedRoute requiredRole="parent"><AttendanceView /></ProtectedRoute>
        } />
        <Route path="/parent/chat" element={
          <ProtectedRoute requiredRole="parent"><ParentChat /></ProtectedRoute>
        } />
        <Route path="/parent/ptm" element={
          <ProtectedRoute requiredRole="parent"><PTMBooking /></ProtectedRoute>
        } />
        <Route path="/parent/milestones/:studentId" element={
          <ProtectedRoute requiredRole="parent"><MilestoneView /></ProtectedRoute>
        } />
        <Route path="/parent/incidents/:studentId" element={
          <ProtectedRoute requiredRole="parent"><IncidentView /></ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to={user ? getDashboardPath(user.role) : '/'} />} />
      </Routes>
    </Router>
  );
}

export default App;
