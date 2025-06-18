
const mongoose = require('mongoose');

const ParticipantSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  secondsCompleted: { type: Number, default: 0 },
  currentSessionStart: { type: Date, default: null },
  percentageCompleted: { type: Number, default: 0 },
  pointsEarned: { type: Number, default: 0 },
   isComplete: { type: Boolean, default: false },
}, { timestamps: true });

const ChallengeSchema = new mongoose.Schema({
  title: String,
  description: String,
  totalHours: Number, // Total hours for the challenge (e.g., 150)
  durationDays: Number, // Duration in days (e.g., 31)
  startDate: Date, // Specific start date (e.g., 7 Mar 2025)
  endDate: Date, // Calculated end date (e.g., 7 Apr 2025)
  totalPoints: Number,
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  challengeCode: String,
  participants: [ParticipantSchema],
  status: { 
    type: String, 
    enum: ['Waiting', 'Active', 'Completed'], 
    default: 'Waiting' 
  },
  startTime: { type: Date, default: null },
  hashtags: [String], // For #studytips, #uni, etc.
}, { timestamps: true });

module.exports = mongoose.model('Challenge', ChallengeSchema);
