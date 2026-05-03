import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/api';
import { FaClock, FaUtensils, FaWalking, FaImage, FaMedal, FaSmile, FaNotesMedical, FaBook } from 'react-icons/fa';
import ParentPortalLayout from '../../components/ParentPortalLayout';

const ActivityFeed = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const studentRes = await api.get(`/students/${studentId}`);
        setStudent(studentRes.data);

        const activitiesRes = await api.get(`/activities/student/${studentId}`);
        setActivities(activitiesRes.data || []);

        setError('');
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load activities');
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [studentId]);

  const getActivityIcon = (activityType) => {
    switch (activityType?.toLowerCase()) {
      case 'general':
        return <FaBook className="text-blue-600" />;
      case 'respective':
        return <FaNotesMedical className="text-indigo-600" />;
      case 'class_note':
        return <FaBook className="text-amber-600" />;
      case 'nap':
        return <FaClock className="text-blue-600" />;
      case 'meal':
      case 'food':
        return <FaUtensils className="text-green-600" />;
      case 'potty':
        return <FaWalking className="text-purple-600" />;
      case 'photo':
      case 'media':
        return <FaImage className="text-pink-600" />;
      case 'milestone':
        return <FaMedal className="text-yellow-600" />;
      case 'mood':
        return <FaSmile className="text-orange-600" />;
      default:
        return <FaNotesMedical className="text-gray-600" />;
    }
  };

  const getActivityColor = (activityType) => {
    switch (activityType?.toLowerCase()) {
      case 'general':
        return 'bg-blue-50 border-l-4 border-blue-500';
      case 'respective':
        return 'bg-indigo-50 border-l-4 border-indigo-500';
      case 'class_note':
        return 'bg-amber-50 border-l-4 border-amber-400';
      case 'nap':
        return 'bg-blue-50 border-l-4 border-blue-500';
      case 'meal':
      case 'food':
        return 'bg-green-50 border-l-4 border-green-500';
      case 'potty':
        return 'bg-purple-50 border-l-4 border-purple-500';
      case 'photo':
      case 'media':
        return 'bg-pink-50 border-l-4 border-pink-500';
      case 'milestone':
        return 'bg-yellow-50 border-l-4 border-yellow-500';
      case 'mood':
        return 'bg-orange-50 border-l-4 border-orange-500';
      default:
        return 'bg-gray-50 border-l-4 border-gray-500';
    }
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filterActivities = () => {
    if (filterType === 'all') {
      return activities;
    }
    return activities.filter(a => a.activityType?.toLowerCase() === filterType.toLowerCase());
  };

  const filteredActivities = filterActivities();

  if (loading) {
    return (
      <ParentPortalLayout
        title="Activity Feed"
        subtitle="Daily activities, updates, and teacher notes"
        accent="blue"
        rightAction={{ label: 'Back to Dashboard', onClick: () => navigate('/parent/dashboard') }}
      >
        <div className="flex items-center justify-center min-h-96 bg-white rounded-3xl border border-slate-200 shadow-sm">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-600">Loading activities...</p>
          </div>
        </div>
      </ParentPortalLayout>
    );
  }

  return (
    <ParentPortalLayout
      title="Activity Feed"
      subtitle={student ? `${student.firstName}'s classroom activity timeline` : 'Daily activities, updates, and teacher notes'}
      accent="blue"
      rightAction={{ label: 'Back to Dashboard', onClick: () => navigate('/parent/dashboard') }}
    >
      {error && (
        <div className="mb-6 rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
          {error}
        </div>
      )}

      {student && (
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-3xl p-6 text-white shadow-sm mb-6">
          <h2 className="text-3xl font-bold mb-2">{student.firstName}'s Activity Feed</h2>
          <p className="text-blue-100">Latest updates from {student.class?.name}</p>
        </div>
      )}

      <div className="mb-6 flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterType('all')}
          className={`px-4 py-2 rounded-full font-medium transition ${
            filterType === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-slate-800 border border-slate-300 hover:bg-slate-50'
          }`}
        >
          All Activities
        </button>
        <button
          onClick={() => setFilterType('general')}
          className={`px-4 py-2 rounded-full font-medium transition ${
            filterType === 'general' ? 'bg-blue-600 text-white' : 'bg-white text-slate-800 border border-slate-300 hover:bg-slate-50'
          }`}
        >
          General
        </button>
        <button
          onClick={() => setFilterType('respective')}
          className={`px-4 py-2 rounded-full font-medium transition ${
            filterType === 'respective' ? 'bg-blue-600 text-white' : 'bg-white text-slate-800 border border-slate-300 hover:bg-slate-50'
          }`}
        >
          Respective
        </button>
        <button
          onClick={() => setFilterType('class_note')}
          className={`px-4 py-2 rounded-full font-medium transition ${
            filterType === 'class_note' ? 'bg-amber-500 text-white' : 'bg-white text-slate-800 border border-slate-300 hover:bg-slate-50'
          }`}
        >
          📚 Homework & Notes
        </button>
      </div>

      <div className="space-y-4">
        {filteredActivities.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm text-center py-12 px-4">
            <p className="text-slate-700 text-lg">No activities yet.</p>
            <p className="text-slate-500">Teachers will log activities here as your child completes them.</p>
          </div>
        ) : (
          filteredActivities.map((activity) => (
            <div key={activity.id} className={`bg-white rounded-3xl shadow-sm p-5 ${getActivityColor(activity.activityType)}`}>
              <div className="flex gap-4">
                <div className="text-3xl">{getActivityIcon(activity.activityType)}</div>

                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2 gap-3">
                    <h3 className="text-xl font-bold text-slate-800 capitalize">
                      {activity.activityType === 'class_note'
                        ? (activity.caption || 'Homework & Notes')
                        : activity.activityType}
                    </h3>
                    <span className="text-sm text-slate-500 whitespace-nowrap">{formatTime(activity.createdAt)}</span>
                  </div>

                    {/* Activity Details */}
                    {activity.activityType?.toLowerCase() === 'nap' && (
                      <div className="space-y-2 text-slate-700">
                        {activity.napStartTime && (
                          <p><strong>Start Time:</strong> {new Date(activity.napStartTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                        )}
                        {activity.napEndTime && (
                          <p><strong>End Time:</strong> {new Date(activity.napEndTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                        )}
                        {activity.napDuration && (
                          <p><strong>Duration:</strong> {activity.napDuration} minutes</p>
                        )}
                      </div>
                    )}

                    {activity.activityType?.toLowerCase() === 'meal' && (
                      <div className="space-y-2 text-slate-700">
                        {activity.mealType && <p><strong>Type:</strong> {activity.mealType}</p>}
                        {activity.foodItems && activity.foodItems.length > 0 && (
                          <p><strong>Items:</strong> {activity.foodItems.join(', ')}</p>
                        )}
                        {activity.intakeLevel && <p><strong>Intake:</strong> {activity.intakeLevel}</p>}
                      </div>
                    )}

                    {activity.activityType?.toLowerCase() === 'mood' && (
                      <div className="space-y-2 text-slate-700">
                        {activity.moodAtArrival && <p><strong>Arrival:</strong> {activity.moodAtArrival}</p>}
                        {activity.moodAtDeparture && <p><strong>Departure:</strong> {activity.moodAtDeparture}</p>}
                        {activity.moodNotes && <p><strong>Notes:</strong> {activity.moodNotes}</p>}
                      </div>
                    )}

                    {activity.activityType?.toLowerCase() === 'class_note' && (
                      <div className="space-y-1 text-slate-700">
                        {activity.notes && (
                          <p className="whitespace-pre-wrap">{activity.notes}</p>
                        )}
                      </div>
                    )}

                    {activity.activityType?.toLowerCase() === 'milestone' && (
                      <div className="space-y-2 text-slate-700">
                        {activity.milestoneAchieved && <p><strong>Milestone:</strong> {activity.milestoneAchieved}</p>}
                        {activity.domain && <p><strong>Domain:</strong> {activity.domain}</p>}
                        {activity.description && <p><strong>Details:</strong> {activity.description}</p>}
                      </div>
                    )}

                    {activity.mediaUrl && (
                      <div className="mt-3">
                        {activity.mediaType?.startsWith('image') ? (
                          <img src={activity.mediaUrl} alt="Activity" className="w-full max-w-sm rounded-2xl" />
                        ) : (
                          <video src={activity.mediaUrl} controls className="w-full max-w-sm rounded-2xl" />
                        )}
                        {activity.caption && <p className="mt-2 text-slate-700"><strong>Caption:</strong> {activity.caption}</p>}
                      </div>
                    )}

                    {activity.notes && (
                      <div className="mt-3 bg-yellow-50 p-3 rounded-2xl border border-yellow-200">
                        <p className="text-slate-800"><strong>Teacher's Note:</strong> {activity.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
    </ParentPortalLayout>
  );
};

export default ActivityFeed;
