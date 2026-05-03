const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
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
  month: {
    type: Number,
    required: [true, 'Month is required'],
    min: 1,
    max: 12,
  },
  year: {
    type: Number,
    required: [true, 'Year is required'],
  },
  
  // Developmental Domains
  domains: [
    {
      domain: {
        type: String,
        enum: ['social', 'emotional', 'motor', 'language', 'cognitive'],
      },
      milestones: [
        {
          milestone: String,
          isAchieved: Boolean,
        },
      ],
      notes: String,
      overallRating: {
        type: String,
        enum: ['emerging', 'developing', 'proficient', 'advanced'],
      },
    },
  ],
  
  overallSummary: String,
  highlights: [String],
  areasForImprovement: [String],
  recommendedActivities: [String],
  
  reportStatus: {
    type: String,
    enum: ['draft', 'completed', 'sent_to_parent'],
    default: 'draft',
  },
  sentToParentOn: Date,
  
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Report', reportSchema);
