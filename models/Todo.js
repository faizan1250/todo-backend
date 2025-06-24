
const mongoose = require('mongoose');

const SubtaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  done: { type: Boolean, default: false }
});


const TodoSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: String,
  dueDate: Date,
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  status: { type: String, enum: ['todo', 'in-progress', 'done', 'archived'], default: 'todo' },
  tags: [String],
  subtasks: [SubtaskSchema],
  repeatInterval: { type: String, enum: ['none', 'daily', 'weekly', 'monthly'], default: 'none' },
  reminder: Date,
  isStarred: { type: Boolean, default: false },
  assignedPoints: { type: Number, default: 0 },
  category: String,
  startTime: Date,
  endTime: Date,
  notified: { type: Boolean, default: false },
  expoPushToken: String,
  sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  joinCode: { type: String, unique: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
 completions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Completion' }]

}, { timestamps: true });

module.exports = mongoose.model('Todo', TodoSchema);
