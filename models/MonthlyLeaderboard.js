const mongoose = require('mongoose');

const MonthlyLeaderboardSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  challenge: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Challenge',
  required: true,
},

  month: { type: String, required: true }, // Format: "YYYY-MM"
  totalPoints: { type: Number, default: 0 },
  challengesParticipated: { type: Number, default: 0 },
  isWinner: { type: Boolean, default: false },
}, { timestamps: true });

MonthlyLeaderboardSchema.index({ userId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('MonthlyLeaderboard', MonthlyLeaderboardSchema);
