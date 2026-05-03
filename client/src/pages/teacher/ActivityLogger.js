import React, { useEffect, useMemo, useState } from 'react';
import TeacherPortalLayout from '../../components/TeacherPortalLayout';
import api from '../../api/api';
import { FaBook, FaUpload, FaSave, FaImage, FaVideo } from 'react-icons/fa';

const ACTIVITY_TYPES = ['general', 'respective'];

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const ActivityLogger = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const [schoolData, setSchoolData] = useState(null);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [students, setStudents] = useState([]);

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState('');

  const [recentActivities, setRecentActivities] = useState([]);

  const [form, setForm] = useState({
    studentId: '',
    batchId: '',
    activityType: 'general',
    notes: '',
    caption: '',
    mediaUrl: '',
    mediaType: '',
    description: '',
  });

  const allBatches = useMemo(() => {
    if (!schoolData?.classes) return [];
    return schoolData.classes.flatMap((cls) =>
      (cls.batches || []).map((b) => ({
        id: b.id,
        label: `${cls.name}${cls.section ? ` (${cls.section})` : ''} - ${b.shiftName} (${b.startTime}-${b.endTime})`,
      }))
    );
  }, [schoolData]);

  const showMsg = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3500);
  };

  const loadSchoolData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/teacher/attendance/data');
      setSchoolData(res.data);
      const firstBatch = (res.data?.classes || []).flatMap((c) => c.batches || [])[0];
      if (firstBatch?.id) {
        setSelectedBatchId(firstBatch.id);
        setForm((prev) => ({ ...prev, batchId: firstBatch.id }));
      }
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Failed to load school data');
    } finally {
      setLoading(false);
    }
  };

  const loadBatchStudents = async (batchId) => {
    if (!batchId) return;
    setLoading(true);
    try {
      const res = await api.get(`/teacher/attendance/batch/${batchId}?date=${new Date().toISOString().slice(0, 10)}`);
      const list = res.data?.batch?.students || [];
      setStudents(list);
    } catch (err) {
      setStudents([]);
      showMsg('error', err.response?.data?.error || 'Failed to load batch students');
    } finally {
      setLoading(false);
    }
  };

  const loadRecentActivities = async ({ studentId, batchId }) => {
    try {
      if (studentId) {
        const res = await api.get(`/activities/student/${studentId}`);
        setRecentActivities((res.data || []).slice(0, 12));
        return;
      }

      if (batchId) {
        const res = await api.get(`/activities/batch/${batchId}/recent?take=12`);
        setRecentActivities(res.data || []);
        return;
      }

      setRecentActivities([]);
    } catch (err) {
      setRecentActivities([]);
    }
  };

  useEffect(() => {
    loadSchoolData();
  }, []);

  useEffect(() => {
    if (selectedBatchId) {
      loadBatchStudents(selectedBatchId);
      setForm((prev) => ({ ...prev, batchId: selectedBatchId, studentId: '' }));
      loadRecentActivities({ studentId: '', batchId: selectedBatchId });
    }
  }, [selectedBatchId]);

  useEffect(() => {
    loadRecentActivities({ studentId: form.studentId, batchId: selectedBatchId });
  }, [form.studentId]);

  const uploadMedia = async () => {
    if (!selectedFile) return null;

    setUploading(true);
    try {
      const dataUrl = await fileToDataUrl(selectedFile);
      const res = await api.post('/activities/upload', {
        fileName: selectedFile.name,
        contentType: selectedFile.type,
        dataUrl,
      });

      const media = {
        mediaUrl: res.data.mediaUrl,
        mediaType: res.data.mediaType,
        previewUrl: res.data.previewUrl || res.data.mediaUrl,
      };

      setForm((prev) => ({ ...prev, mediaUrl: media.mediaUrl, mediaType: media.mediaType }));
      setMediaPreviewUrl(media.previewUrl);
      showMsg('success', 'Media uploaded');
      return media;
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Media upload failed');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.batchId || !form.activityType) {
      return showMsg('error', 'Batch and activity type are required');
    }

    if (form.activityType === 'respective' && !form.studentId) {
      return showMsg('error', 'Student is required for respective activity');
    }

    let mediaPayload = { mediaUrl: form.mediaUrl, mediaType: form.mediaType };
    if (selectedFile && !form.mediaUrl) {
      const uploaded = await uploadMedia();
      if (!uploaded) return;
      mediaPayload = uploaded;
    }

    try {
      await api.post('/activities', {
        ...form,
        ...mediaPayload,
        studentId: form.activityType === 'general' ? undefined : form.studentId,
      });

      showMsg('success', 'Activity logged successfully');
      setSelectedFile(null);
      setMediaPreviewUrl('');
      setForm((prev) => ({
        ...prev,
        activityType: 'general',
        notes: '',
        caption: '',
        mediaUrl: '',
        mediaType: '',
        description: '',
      }));
      loadRecentActivities({ studentId: form.studentId, batchId: selectedBatchId });
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Failed to log activity');
    }
  };

  return (
    <TeacherPortalLayout title="Log Activities">
      <div>
        <h2 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-3">
          <FaBook /> Log Activities
        </h2>
        <p className="text-gray-500 mb-6">Batch-based activity logging with image/video support for parent portal.</p>

        {message && (
          <div className={`alert mb-5 ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="label">Batch *</label>
                <select
                  className="input"
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  required
                >
                  <option value="">Select batch</option>
                  {allBatches.map((b) => (
                    <option key={b.id} value={b.id}>{b.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Student {form.activityType === 'respective' ? '*' : '(optional for general)'}</label>
                <select
                  className="input"
                  value={form.studentId}
                  onChange={(e) => setForm((prev) => ({ ...prev, studentId: e.target.value }))}
                  required={form.activityType === 'respective'}
                >
                  <option value="">{form.activityType === 'general' ? 'No specific student (all parents in batch)' : 'Select student'}</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Activity Type *</label>
                <select
                  className="input"
                  value={form.activityType}
                  onChange={(e) => setForm((prev) => ({ ...prev, activityType: e.target.value }))}
                  required
                >
                  {ACTIVITY_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <textarea
                className="input"
                rows={2}
                placeholder={form.activityType === 'general' ? 'General class activity details (visible to all parents of this batch)' : 'Respective activity details (visible only to selected student parent)'}
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              />

              <textarea
                className="input"
                rows={3}
                placeholder="Teacher notes"
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              />

              <input
                className="input"
                placeholder="Caption for media"
                value={form.caption}
                onChange={(e) => setForm((prev) => ({ ...prev, caption: e.target.value }))}
              />

              <div>
                <label className="label">Attach Image/Video</label>
                <input
                  className="input"
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => {
                    setSelectedFile(e.target.files?.[0] || null);
                    setMediaPreviewUrl('');
                    setForm((prev) => ({ ...prev, mediaUrl: '', mediaType: '' }));
                  }}
                />
                {selectedFile && (
                  <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                    {selectedFile.type.startsWith('image') ? <FaImage /> : <FaVideo />} {selectedFile.name}
                  </div>
                )}
                {(mediaPreviewUrl || form.mediaUrl) && (
                  <a href={mediaPreviewUrl || form.mediaUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 mt-1 inline-block">
                    Uploaded media preview link
                  </a>
                )}
              </div>

              <div className="flex gap-2">
                <button type="button" onClick={uploadMedia} className="btn btn-outline flex items-center gap-2" disabled={!selectedFile || uploading}>
                  <FaUpload /> {uploading ? 'Uploading...' : 'Upload Media'}
                </button>
                <button type="submit" className="btn btn-primary flex items-center gap-2" disabled={loading}>
                  <FaSave /> Save Activity
                </button>
              </div>
            </form>
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-3">Recent Activities {form.studentId ? '(Selected Student)' : '(Selected Batch)'}</h3>
            {recentActivities.length === 0 ? (
              <p className="text-sm text-gray-500">No recent activities.</p>
            ) : (
              <div className="space-y-3 max-h-[640px] overflow-auto pr-1">
                {recentActivities.map((a) => (
                  <div key={a.id} className="border rounded-lg p-3">
                    <div className="font-medium text-gray-800 capitalize">{a.activityType}</div>
                    <div className="text-xs text-gray-500">{new Date(a.createdAt).toLocaleString()}</div>
                    {a.notes && <div className="text-sm text-gray-700 mt-1">{a.notes}</div>}
                    {a.mediaUrl && (
                      <div className="mt-2">
                        {a.mediaType?.startsWith('image') ? (
                          <img src={a.mediaUrl} alt="activity" className="rounded-lg w-full max-w-xs" />
                        ) : (
                          <video src={a.mediaUrl} controls className="rounded-lg w-full max-w-xs" />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </TeacherPortalLayout>
  );
};

export default ActivityLogger;
