const mongoose = require('mongoose');

const circularSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Circular title is required'],
  },
  description: {
    type: String,
    required: [true, 'Circular description is required'],
  },
  content: String,
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true,
  },
  classIds: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
    },
  ], // Empty means school-wide
  circularType: {
    type: String,
    enum: ['event', 'holiday', 'fee_reminder', 'ptm', 'general_notice'],
  },
  publishDate: {
    type: Date,
    default: Date.now,
  },
  expiryDate: Date,
  isPublished: {
    type: Boolean,
    default: true,
  },
  attachments: [String],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Circular', circularSchema);
