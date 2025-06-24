const Todo = require('../models/Todo');
const User = require('../models/User');
const Completion = require('../models/Completion'); // adjust path if needed

const mongoose = require('mongoose');
const moment = require('moment');
const generateJoinCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase(); // e.g. 'F8KD2R'
};

function calculateStreaks(dates) {
  let currentStreak = 0, longestStreak = 0, streak = 0;
  const today = moment().startOf('day');
  const sortedDates = [...new Set(dates)].sort();

  for (let i = sortedDates.length - 1; i >= 0; i--) {
    const date = moment(sortedDates[i], 'YYYY-MM-DD');

    if (i === sortedDates.length - 1 && !date.isSame(today, 'day')) continue;

    if (i < sortedDates.length - 1) {
      const prev = moment(sortedDates[i + 1], 'YYYY-MM-DD');
      if (prev.diff(date, 'days') !== 1) break;
    }

    currentStreak++;
  }

  streak = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    const prev = moment(sortedDates[i - 1], 'YYYY-MM-DD');
    const curr = moment(sortedDates[i], 'YYYY-MM-DD');

    if (curr.diff(prev, 'days') === 1) {
      streak++;
      longestStreak = Math.max(longestStreak, streak);
    } else {
      streak = 1;
    }
  }

  longestStreak = Math.max(longestStreak, currentStreak);

  return { currentStreak, longestStreak };
}




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
      assignedPoints,
      isStarred,
      category,
      startTime,
      endTime
    } = req.body;
const joinCode = generateJoinCode();
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
      assignedPoints,
      isStarred,
      category,
      startTime,
      endTime,
       joinCode,
  participants: [req.user.id],
    });

    await todo.save();
    console.log({todo});
    res.status(201).json(todo);
  } catch (err) {
    console.error('❌ Failed to create todo:', err.message);
    res.status(400).json({ error: 'Failed to create todo' });
  }
};



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
      assignedPoints,
      category,
      startTime,
      endTime
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
    if (category !== undefined) todo.category = category;
    if (startTime !== undefined) todo.startTime = startTime;
    if (endTime !== undefined) todo.endTime = endTime;

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

    const [todos, trend] = await Promise.all([
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

    const earnedTodoPoints = completedTodos.reduce(
      (acc, todo) => acc + (todo.assignedPoints || 0),
      0
    );

    const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);

    const streakDates = completedTodos.map((t) =>
      moment(t.updatedAt).format('YYYY-MM-DD')
    );
    const { currentStreak, longestStreak } = calculateStreaks(streakDates);
    const categoryStats = {};
const priorityStats = { low: { total: 0, completed: 0 }, medium: { total: 0, completed: 0 }, high: { total: 0, completed: 0 } };

todos.forEach(todo => {
  const cat = todo.category || 'Uncategorized';
  const prio = todo.priority || 'low';

  // Category group
  if (!categoryStats[cat]) categoryStats[cat] = { total: 0, completed: 0 };
  categoryStats[cat].total++;
  if (todo.status === 'done') categoryStats[cat].completed++;

  // Priority group
  if (!priorityStats[prio]) priorityStats[prio] = { total: 0, completed: 0 };
  priorityStats[prio].total++;
  if (todo.status === 'done') priorityStats[prio].completed++;
});


    res.json({
      total,
      completed,
      completionRate,
      trend: trend.map((day) => ({ date: day._id, completed: day.count })),
      earnedTodoPoints,
      totalAvailableTodoPoints,
      currentStreak,
      longestStreak,
      categoryStats,
      priorityStats
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

    // 🔁 Find todos overlapping with the date range
    const todos = await Todo.find({
      userId,
      startTime: { $lte: to.toDate() },   // starts before end of range
      endTime: { $gte: from.toDate() }    // ends after start of range
    });

    const grouped = {};

    todos.forEach(todo => {
      // Use startTime as the key day to group
      const dateKey = moment(todo.startTime).format('YYYY-MM-DD');
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(todo);
    });

    res.json(grouped);
  } catch (err) {
    console.error('❌ Calendar fetch failed:', err.message);
    res.status(500).json({ error: 'Failed to fetch calendar todos' });
  }
};
exports.joinTodoByCode = async (req, res) => {
  const { code } = req.body;

  const todo = await Todo.findOne({ joinCode: code });
  if (!todo) {
    return res.status(404).json({ error: 'Invalid join code' });
  }

  const alreadyJoined = todo.participants.some(
    p => String(p) === String(req.user.id)
  );

  if (alreadyJoined) {
    await todo.populate('participants', 'name email');
    return res.status(200).json({ message: 'You are already a participant', todo });
  }

  todo.participants.push(req.user.id);
  await todo.save();

  await todo.populate('participants', 'name email');
  res.json({ message: 'Joined successfully', todo });
};


exports.completeSharedTodo = async (req, res) => {
  const todo = await Todo.findById(req.params.id);
  if (!todo || !todo.participants.includes(req.user.id)) {
    return res.status(403).json({ error: 'Not allowed to complete this todo' });
  }

  // Check if user has already completed via Completion collection
  const alreadyCompleted = await Completion.findOne({
    todoId: todo._id,
    userId: req.user.id
  });

  if (alreadyCompleted) {
    return res.status(400).json({ error: 'Already completed' });
  }

  // Create new Completion entry
  const completion = new Completion({
    userId: req.user.id,
    todoId: todo._id,
    pointsEarned: todo.assignedPoints || 0
  });

  await completion.save();

  // Push its ID to the todo
  todo.completions.push(completion._id);
  await todo.save();

  // Award points to user
  const user = await User.findById(req.user.id);
  user.todoPoints += todo.assignedPoints || 0;
  await user.save();

  res.json({ message: 'Todo marked as done', todo });
};


exports.getTodoLeaderboard = async (req, res) => {
  try {
    const leaderboard = await Completion.aggregate([
      {
        $group: {
          _id: '$userId',
          totalPoints: { $sum: '$pointsEarned' }
        }
      },
      { $sort: { totalPoints: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          name: '$user.name',
          totalPoints: 1
        }
      }
    ]);

    res.json(leaderboard);
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
};

// Add this to your todoController.js
exports.getTodoDetails = async (req, res) => {
  try {
    const todo = await Todo.findOne({
      _id: req.params.id,
      $or: [
        { userId: req.user.id }, // Owner can always view
        { participants: req.user.id } // Participants can view
      ]
    })
    .populate('participants', 'name email')
    .populate({
      path: 'completions',
      populate: {
        path: 'userId',
        select: 'name'
      }
    });

    if (!todo) {
      return res.status(404).json({ error: 'Todo not found or access denied' });
    }

    res.json(todo);
  } catch (err) {
    console.error('Failed to fetch todo details:', err);
    res.status(500).json({ error: 'Failed to fetch todo details' });
  }
};

exports.updateTodoStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const todo = await Todo.findOneAndUpdate(
      {
        _id: req.params.id,
        $or: [
          { userId: req.user.id },
          { participants: req.user.id }
        ]
      },
      { status },
      { new: true }
    );

    if (!todo) {
      return res.status(404).json({ error: 'Todo not found or access denied' });
    }

    // Handle points and completion history
    if (status === 'done') {
      // Add completion record
      const completion = new Completion({
        userId: req.user.id,
        todoId: todo._id,
        pointsEarned: todo.assignedPoints || 0,
        completedAt: new Date()
      });
      await completion.save();

      // Update user points
      const user = await User.findById(req.user.id);
      user.todoPoints += todo.assignedPoints || 0;
      await user.save();
      
      // Add completion to todo (optional)
      todo.completions.push(completion._id);
      await todo.save();
    } 
    else if (todo.status === 'done') {
      // Undo completion if status changed from done
      await Completion.deleteOne({ 
        userId: req.user.id, 
        todoId: todo._id 
      });

      const user = await User.findById(req.user.id);
      user.todoPoints -= todo.assignedPoints || 0;
      await user.save();
    }

    // Populate completions before returning
    const updatedTodo = await Todo.findById(todo._id)
      .populate('completions')
      .populate('completions.userId', 'name');

    res.json(updatedTodo);
  } catch (err) {
    console.error('Failed to update status:', err);
    res.status(500).json({ error: 'Failed to update status' });
  }
};