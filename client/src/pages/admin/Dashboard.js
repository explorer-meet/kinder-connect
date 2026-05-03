import React, { useState, useEffect } from 'react';
import Header from '../../components/Header';
import api from '../../api/api';
import { FaUsers, FaChalkboard, FaGraduationCap, FaBuilding } from 'react-icons/fa';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalSchools: 0,
    totalClasses: 0,
    totalTeachers: 0,
    totalStudents: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // In production, these would be actual API calls
        // For now, we'll use placeholder data
        setStats({
          totalSchools: 1,
          totalClasses: 4,
          totalTeachers: 8,
          totalStudents: 120,
        });
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      icon: <FaBuilding className="text-2xl" />,
      label: 'Total Schools',
      value: stats.totalSchools,
      color: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      icon: <FaChalkboard className="text-2xl" />,
      label: 'Total Classes',
      value: stats.totalClasses,
      color: 'bg-green-100',
      iconColor: 'text-green-600',
    },
    {
      icon: <FaUsers className="text-2xl" />,
      label: 'Total Teachers',
      value: stats.totalTeachers,
      color: 'bg-purple-100',
      iconColor: 'text-purple-600',
    },
    {
      icon: <FaGraduationCap className="text-2xl" />,
      label: 'Total Students',
      value: stats.totalStudents,
      color: 'bg-pink-100',
      iconColor: 'text-pink-600',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Admin Dashboard" />

      <div className="container mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-8">Dashboard Overview</h2>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, idx) => (
            <div key={idx} className="card hover:shadow-lg transition">
              <div className={`${stat.color} p-4 rounded-lg mb-4 inline-block`}>
                <div className={stat.iconColor}>{stat.icon}</div>
              </div>
              <p className="text-gray-600 text-sm">{stat.label}</p>
              <p className="text-3xl font-bold text-gray-800">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Quick Actions</h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="/admin/enroll"
                  className="text-primary-600 hover:text-primary-700 font-medium flex items-center space-x-2"
                >
                  <span>+ Enroll New Student</span>
                </a>
              </li>
              <li>
                <a
                  href="/admin/classes"
                  className="text-primary-600 hover:text-primary-700 font-medium flex items-center space-x-2"
                >
                  <span>+ Create New Class</span>
                </a>
              </li>
              <li>
                <a
                  href="/admin/circulars"
                  className="text-primary-600 hover:text-primary-700 font-medium flex items-center space-x-2"
                >
                  <span>+ Send Circular</span>
                </a>
              </li>
            </ul>
          </div>

          <div className="card">
            <h3 className="text-xl font-bold text-gray-800 mb-4">System Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Platform:</span>
                <span className="font-medium">Kinder Connect v1.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className="font-medium text-green-600">● Online</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Last Updated:</span>
                <span className="font-medium">{new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
