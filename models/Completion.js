const mongoose = require('mongoose');

const CompletionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  todoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Todo', required: true },
  pointsEarned: { type: Number, default: 0 },
  completedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Completion', CompletionSchema);