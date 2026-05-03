const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
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
  date: {
    type: Date,
    default: Date.now,
  },
  activityType: {
    type: String,
    enum: ['nap', 'meal', 'potty', 'mood', 'play', 'learning', 'incident', 'photo', 'milestone', 'attendance'],
    required: true,
  },
  // Nap Details
  napStartTime: Date,
  napEndTime: Date,
  napDuration: Number, // in minutes
  
  // Meal/Snack Details
  mealType: String, // breakfast, lunch, snack
  foodItems: [String],
  intakeLevel: {
    type: String,
    enum: ['full', 'half', 'refused'],
  },
  
  // Potty/Diaper Details
  pottyType: {
    type: String,
    enum: ['wet', 'soiled', 'toilet'],
  },
  time: Date,
  notes: String,
  
  // Mood
  moodAtArrival: String,
  moodAtDeparture: String,
  moodNotes: String,
  
  // Photo/Video
  mediaUrl: String,
  mediaType: String, // photo, video
  caption: String,
  
  // Milestone
  milestoneAchieved: String,
  domain: {
    type: String,
    enum: ['social', 'emotional', 'motor', 'language', 'cognitive'],
  },
  
  // General Notes
  description: String,
  
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('ActivityLog', activityLogSchema);
