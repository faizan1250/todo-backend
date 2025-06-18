// models/SessionLog.js
const mongoose = require('mongoose');

const sessionLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  challenge: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge' },
  startTime: { type: Date, required: true },
  endTime: { type: Date },
  duration: { type: Number }, // in seconds
  isBreak: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('SessionLog', sessionLogSchema);
