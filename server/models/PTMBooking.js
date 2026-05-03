const mongoose = require('mongoose');

const ptmBookingSchema = new mongoose.Schema({
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
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
  meetingDate: {
    type: Date,
    required: [true, 'Meeting date is required'],
  },
  startTime: {
    type: String,
    required: [true, 'Start time is required'],
  },
  endTime: {
    type: String,
    required: [true, 'End time is required'],
  },
  status: {
    type: String,
    enum: ['available', 'booked', 'completed', 'cancelled'],
    default: 'available',
  },
  bookedOn: Date,
  location: String,
  meetingNotes: String,
  feedback: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('PTMBooking', ptmBookingSchema);
