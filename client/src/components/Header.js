import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { FaSignOutAlt, FaBars, FaTimes, FaChartBar, FaBook, FaGraduationCap, FaComments, FaCalendarAlt, FaClipboardList, FaExclamationTriangle } from 'react-icons/fa';

const Header = ({ title }) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const roleLinks = {
    super_admin: [
      { path: '/super-admin/dashboard', label: 'Dashboard', icon: <FaChartBar /> },
    ],
    school_admin: [
      { path: '/school-admin/dashboard', label: 'Dashboard', icon: <FaBook /> },
    ],
    teacher: [
      { path: '/teacher/dashboard', label: 'Dashboard', icon: <FaChartBar /> },
      { path: '/teacher/attendance', label: 'Attendance', icon: <FaClipboardList /> },
      { path: '/teacher/activity', label: 'Activity Log', icon: <FaBook /> },
      { path: '/teacher/milestones', label: 'Milestones', icon: <FaGraduationCap /> },
      { path: '/teacher/incident', label: 'Incident Report', icon: <FaExclamationTriangle /> },
      { path: '/teacher/reports', label: 'Reports', icon: <FaChartBar /> },
      { path: '/teacher/ptm', label: 'PTM', icon: <FaCalendarAlt /> },
    ],
    parent: [
      { path: '/parent/dashboard', label: 'Dashboard', icon: <FaChartBar /> },
      { path: '/parent/chat', label: 'Chat', icon: <FaComments /> },
      { path: '/parent/ptm', label: 'Book PTM', icon: <FaCalendarAlt /> },
    ],
  };

  const links = roleLinks[user?.role] || [];
  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <>
      {/* Top Header */}
      <header className="header-main sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <div className="text-3xl font-bold text-white">👶</div>
              <div>
                <h1 className="text-2xl font-bold text-white">Kinder Connect</h1>
                {title && <p className="text-xs text-primary-100">{title}</p>}
              </div>
            </div>

            {/* Desktop User Info */}
            <div className="hidden md:flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-white">
                  {user?.firstName} {user?.lastName}
                </p>
                <span className="text-xs bg-white bg-opacity-20 text-white px-3 py-1 rounded-full capitalize">
                  {user?.role}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="btn btn-secondary text-sm hover:bg-opacity-90"
              >
                <FaSignOutAlt size={16} /> Logout
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden text-white text-2xl"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <FaTimes /> : <FaBars />}
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4">
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {links.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200 border-b-2 ${
                  isActive(link.path)
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-600 hover:text-primary-600'
                }`}
              >
                {link.icon}
                {link.label}
              </Link>
            ))}
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200 py-2 space-y-1">
              {links.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive(link.path)
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {link.icon}
                  {link.label}
                </Link>
              ))}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 mt-2"
              >
                <FaSignOutAlt /> Logout
              </button>
            </div>
          )}
        </div>
      </nav>
    </>
  );
};

export default Header;
