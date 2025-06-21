
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  nickname: { type: String, default: null },

  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  nicknames: {
    type: Map,
    of: String,
    default: {}
  },
  profilePic: { type: String, default: '' },  // <-- added
  todoPoints: { type: Number, default: 0 },

});

module.exports = mongoose.model('User', userSchema);


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
  notified: { type: Boolean, default: false },
  expoPushToken: { type: String },
  sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

module.exports = mongoose.model('Todo', TodoSchema);


const express = require('express');
const router = express.Router();
const { getTodos, createTodo, updateTodo, deleteTodo , getTodoStats,syncTodos} = require('../controllers/todoController');
const authMiddleware = require('../middleware/authMiddleware'); // assuming you have JWT auth

const todoController = require('../controllers/todoController');


// Toggle subtask


router.use(authMiddleware);

router.get('/', getTodos);
router.get('/stats', getTodoStats); // add this line
router.get('/sync', syncTodos);
router.post('/', createTodo);
router.put('/:id', updateTodo);
router.patch('/todos/:id/subtasks/:index',  todoController.toggleSubtask);
router.delete('/:id', deleteTodo);

module.exports = router;

const Todo = require('../models/Todo');
const User = require('../models/User');
const moment = require('moment');
const mongoose = require('mongoose');



exports.getTodos = async (req, res) => {
  try {
    const {
      status,
      priority,
      tag,
      dueBefore,
      dueAfter,
      sort = 'dueDate', // default sort field
      order = 'asc',     // asc or desc
      limit = 100
    } = req.query;

    const query = { userId: req.user.id };

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (tag) query.tags = tag;
    if (dueBefore) query.dueDate = { ...query.dueDate, $lte: new Date(dueBefore) };
    if (dueAfter) query.dueDate = { ...query.dueDate, $gte: new Date(dueAfter) };

    const todos = await Todo.find(query)
      .sort({ [sort]: order === 'desc' ? -1 : 1 })
      .limit(parseInt(limit));

    res.json(todos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch todos' });
  }
};



exports.createTodo = async (req, res) => {
  try {
    const {
      title,
      description,
      dueDate,
      priority,
      status,
      tags,
      subtasks,
      repeatInterval,
      reminder,
      isStarred
    } = req.body;

    const todo = new Todo({
      userId: req.user.id,
      title,
      description,
      dueDate,
      priority,
      status,
      tags,
      subtasks,
      repeatInterval,
      reminder,
      isStarred
    });

    await todo.save();
    res.status(201).json(todo);
  } catch (err) {
    console.error('❌ Failed to create todo:', err.message);
    res.status(400).json({ error: 'Failed to create todo' });
  }
};



//const Todo = require('../models/Todo');



exports.updateTodo = async (req, res) => {
  try {
    const todo = await Todo.findOne({ _id: req.params.id, userId: req.user.id });
    if (!todo) return res.status(404).json({ error: 'Todo not found' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const prevStatus = todo.status;

    const {
      title,
      description,
      dueDate,
      priority,
      status,
      tags,
      subtasks,
      repeatInterval,
      reminder,
      isStarred,
      assignedPoints
    } = req.body;

    if (title !== undefined) todo.title = title;
    if (description !== undefined) todo.description = description;
    if (dueDate !== undefined) todo.dueDate = dueDate;
    if (priority !== undefined) todo.priority = priority;
    if (status !== undefined) todo.status = status;
    if (tags !== undefined) todo.tags = tags;
    if (subtasks !== undefined) todo.subtasks = subtasks;
    if (repeatInterval !== undefined) todo.repeatInterval = repeatInterval;
    if (reminder !== undefined) todo.reminder = reminder;
    if (isStarred !== undefined) todo.isStarred = isStarred;
    if (assignedPoints !== undefined) todo.assignedPoints = assignedPoints;

    await todo.save();

    // 🧠 Handle todoPoints logic
    if (prevStatus !== 'done' && todo.status === 'done') {
      user.todoPoints += todo.assignedPoints || 0;
      await user.save();
    } else if (prevStatus === 'done' && todo.status !== 'done') {
      user.todoPoints -= todo.assignedPoints || 0;
      if (user.todoPoints < 0) user.todoPoints = 0;
      await user.save();
    }

    res.json(todo);
  } catch (err) {
    console.error('❌ Failed to update todo:', err.message);
    res.status(400).json({ error: 'Failed to update todo' });
  }
};



exports.deleteTodo = async (req, res) => {
  try {
    const result = await Todo.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!result) return res.status(404).json({ error: 'Todo not found' });
    res.json({ message: 'Todo deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete todo' });
  }
};

exports.getTodoStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const [user, todos, trend] = await Promise.all([
      User.findById(userId),
      Todo.find({ userId }),
      Todo.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            status: 'done',
            updatedAt: {
              $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // last 7 days
            },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const completedTodos = todos.filter((todo) => todo.status === 'done');
    const total = todos.length;
    const completed = completedTodos.length;

    const totalAvailableTodoPoints = todos.reduce(
      (acc, todo) => acc + (todo.assignedPoints || 0),
      0
    );

    const earnedTodoPoints = user.todoPoints || 0;
    const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);

    res.json({
      total,
      completed,
      completionRate,
      trend: trend.map((day) => ({ date: day._id, completed: day.count })),
      earnedTodoPoints,
      totalAvailableTodoPoints,
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};


exports.syncTodos = async (req, res) => {
  try {
    const userId = req.user.id;
    const since = req.query.since;

    if (!since) {
      return res.status(400).json({ error: "Missing 'since' query param" });
    }

    const sinceDate = new Date(since);
    if (isNaN(sinceDate.getTime())) {
      return res.status(400).json({ error: "Invalid date format for 'since'" });
    }

    const todos = await Todo.find({
      userId,
      updatedAt: { $gt: sinceDate }
    }).sort({ updatedAt: 1 });

    res.json(todos);
  } catch (err) {
    console.error('Sync error:', err);
    res.status(500).json({ error: 'Failed to sync todos' });
  }
};

exports.toggleSubtask = async (req, res) => {
  const { id, index } = req.params;

  try {
    const todo = await Todo.findOne({ _id: id, userId: req.user.id });
    if (!todo) return res.status(404).json({ error: 'Todo not found' });

    const idx = parseInt(index);
    if (!todo.subtasks[idx]) {
      return res.status(400).json({ error: 'Invalid subtask index' });
    }

    todo.subtasks[idx].done = !todo.subtasks[idx].done;
    await todo.save();
    res.json(todo);
  } catch (err) {
    console.error('❌ Failed to toggle subtask:', err.message);
    res.status(500).json({ error: 'Failed to toggle subtask' });
  }
};


exports.getCalendarTodos = async (req, res) => {
  try {
    const userId = req.user.id;
    const from = req.query.from ? moment(req.query.from).startOf('day') : moment().startOf('month');
    const to = req.query.to ? moment(req.query.to).endOf('day') : moment().endOf('month');

    const todos = await Todo.find({
      userId,
      dueDate: { $gte: from.toDate(), $lte: to.toDate() }
    });

    const grouped = {};

    todos.forEach(todo => {
      const dateKey = moment(todo.dueDate).format('YYYY-MM-DD');
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(todo);
    });

    res.json(grouped);
  } catch (err) {
    console.error('❌ Calendar fetch failed:', err.message);
    res.status(500).json({ error: 'Failed to fetch calendar todos' });
  }
};
const cron = require('node-cron');
const Todo = require('../models/Todo');
const { sendPushNotification } = require('../utils/pushUtils'); // we’ll define this

// Run every minute
cron.schedule('* * * * *', async () => {
  const now = new Date();
  try {
    const todos = await Todo.find({
      reminder: { $lte: now },
      notified: false
    }).populate('userId');

    for (let todo of todos) {
      // 🔔 Optional: Check if user has pushToken
      const pushToken = todo.userId?.expoPushToken;
      if (pushToken) {
        await sendPushNotification(pushToken, {
          title: '⏰ Reminder',
          body: `Task: ${todo.title}`,
        });
      }

      todo.notified = true;
      await todo.save();
    }
  } catch (err) {
    console.error('Cron reminder error:', err);
  }
});
const cron = require('node-cron');
const Todo = require('../models/Todo');
const moment = require('moment'); // If not installed: npm i moment

// Runs every day at 1am
cron.schedule('0 1 * * *', async () => {
  console.log('🕐 Running recurring todo job...');

  const today = moment().startOf('day');

  const repeatingTodos = await Todo.find({
    repeatInterval: { $ne: 'none' },
    dueDate: { $lte: today.toDate() }
  });

  for (const todo of repeatingTodos) {
    const newDueDate = moment(todo.dueDate);

    switch (todo.repeatInterval) {
      case 'daily':
        newDueDate.add(1, 'day');
        break;
      case 'weekly':
        newDueDate.add(1, 'week');
        break;
      case 'monthly':
        newDueDate.add(1, 'month');
        break;
      default:
        continue;
    }

    const newTodo = new Todo({
      userId: todo.userId,
      title: todo.title,
      description: todo.description,
      dueDate: newDueDate.toDate(),
      priority: todo.priority,
      status: 'todo',
      tags: todo.tags,
      subtasks: todo.subtasks,
      repeatInterval: todo.repeatInterval,
      isStarred: todo.isStarred,
      reminder: todo.reminder,
      expoPushToken: todo.expoPushToken
    });

    await newTodo.save();

    // Optional: mark old one as archived
    todo.status = 'archived';
    await todo.save();
  }

  console.log(`🔁 ${repeatingTodos.length} recurring todos processed.`);
});



const { Expo } = require('expo-server-sdk');
const expo = new Expo();

exports.sendPushNotification = async (pushToken, message) => {
  try {
    if (!Expo.isExpoPushToken(pushToken)) {
      console.error(`Invalid Expo push token: ${pushToken}`);
      return;
    }

    const ticketChunk = await expo.sendPushNotificationsAsync([{
      to: pushToken,
      sound: 'default',
      ...message,
    }]);
    console.log('Push sent:', ticketChunk);
  } catch (error) {
    console.error('Push error:', error);
  }
};
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    require('./cron/reminderJob'); // after connecting to DB
    require('./cron/repeatJob'); // ⬅️ after MongoDB connects
    server.listen(PORT, () => console.log('🚀 Server started on port 5000'));
  })
  .catch((err) => console.error(err));

