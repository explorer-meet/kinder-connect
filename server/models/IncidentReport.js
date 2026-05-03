const mongoose = require('mongoose');

const incidentReportSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true,
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  incidentType: {
    type: String,
    enum: ['bump', 'fall', 'scratch', 'fever', 'allergic_reaction', 'other'],
    required: true,
  },
  description: {
    type: String,
    required: [true, 'Incident description is required'],
  },
  severity: {
    type: String,
    enum: ['minor', 'moderate', 'severe'],
    default: 'minor',
  },
  photo: String,
  actionTaken: String,
  parentNotified: {
    type: Boolean,
    default: false,
  },
  parentNotificationTime: Date,
  followUpRequired: Boolean,
  followUpNotes: String,
  incidentTime: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('IncidentReport', incidentReportSchema);
