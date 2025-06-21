// models/Todo.js
const mongoose = require('mongoose');

const SubtaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  done: { type: Boolean, default: false }
});

const TodoSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String },
  dueDate: { type: Date },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  status: { type: String, enum: ['todo', 'in-progress', 'done', 'archived'], default: 'todo' },
  tags: [{ type: String }],
  subtasks: [SubtaskSchema],

  repeatInterval: { type: String, enum: ['none', 'daily', 'weekly', 'monthly'], default: 'none' },

  reminder: { type: Date },
  isStarred: { type: Boolean, default: false },
  assignedPoints: { type: Number, default: 0 },
  category: { type: String },
  startTime: { type: Date },
  endTime: { type: Date },

  notified: { type: Boolean, default: false },
  expoPushToken: { type: String },
  sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

module.exports = mongoose.model('Todo', TodoSchema);
