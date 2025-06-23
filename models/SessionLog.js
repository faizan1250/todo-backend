const mongoose = require('mongoose');

const sessionLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  challenge: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge', required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date },
  duration: { type: Number }, // in seconds
  isBreak: { type: Boolean, default: false },
  isTest: { type: Boolean, default: false },
}, { timestamps: true });

// Auto-calculate duration if not provided
sessionLogSchema.pre('save', function (next) {
  if (!this.duration && this.endTime && this.startTime) {
    this.duration = Math.floor((this.endTime - this.startTime) / 1000);
  }
  next();
});

module.exports = mongoose.model('SessionLog', sessionLogSchema);
