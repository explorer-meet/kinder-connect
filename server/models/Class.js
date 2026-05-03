const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Class name is required'],
    enum: ['Toddler Care', 'Nursery', 'Jr. KG', 'Sr. KG'],
  },
  section: String,
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true,
  },
  teachers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  students: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
    },
  ],
  capacity: Number,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Class', classSchema);
