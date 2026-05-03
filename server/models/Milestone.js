const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema({
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
  domain: {
    type: String,
    enum: ['social', 'emotional', 'motor', 'language', 'cognitive'],
    required: true,
  },
  milestone: {
    type: String,
    required: [true, 'Milestone name is required'],
  },
  description: String,
  isAchieved: {
    type: Boolean,
    default: false,
  },
  achievedDate: Date,
  month: Number, // 1-12
  year: Number,
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Milestone', milestoneSchema);
