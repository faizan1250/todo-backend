const Todo = require('../models/Todo');
const User = require('../models/User');
const Completion = require('../models/Completion'); // adjust path if needed

const mongoose = require('mongoose');
const moment = require('moment');
const generateJoinCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase(); // e.g. 'F8KD2R'
};


function calculateStreaks(dates) {
  const uniqueDates = [...new Set(dates)].sort(); // Deduplicate & sort
  const formattedDates = uniqueDates.map(d => moment(d, 'YYYY-MM-DD'));

  let currentStreak = 0;
  let longestStreak = 0;
  let streak = 1;

  // Check current streak from the end
  for (let i = formattedDates.length - 1; i >= 0; i--) {
    const date = formattedDates[i];
    const expected = moment().startOf('day').subtract(formattedDates.length - 1 - i, 'days');

    if (date.isSame(expected, 'day')) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Check longest streak overall
  for (let i = 1; i < formattedDates.length; i++) {
    const prev = formattedDates[i - 1];
    const curr = formattedDates[i];

    if (curr.diff(prev, 'days') === 1) {
      streak++;
    } else {
      longestStreak = Math.max(longestStreak, streak);
      streak = 1;
    }
  }

  longestStreak = Math.max(longestStreak, streak);

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
      sort = 'dueDate',
      order = 'asc',
      limit = 100
    } = req.query;

    // 🔁 Fetch todos owned or shared with the user
    const query = {
      $or: [
        { userId: req.user.id },
        { participants: req.user.id }
      ]
    };

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

// exports.getTodoStats = async (req, res) => {
//   try {
//     const userId = req.user.id;

//     const [todos, trend] = await Promise.all([
//       Todo.find({ userId }),
//       Todo.aggregate([
//         {
//           $match: {
//             userId: new mongoose.Types.ObjectId(userId),
//             status: 'done',
//             updatedAt: {
//               $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // last 7 days
//             },
//           },
//         },
//         {
//           $group: {
//             _id: {
//               $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' },
//             },
//             count: { $sum: 1 },
//           },
//         },
//         { $sort: { _id: 1 } },
//       ]),
//     ]);

//     const completedTodos = todos.filter((todo) => todo.status === 'done');
//     const total = todos.length;
//     const completed = completedTodos.length;

//     const totalAvailableTodoPoints = todos.reduce(
//       (acc, todo) => acc + (todo.assignedPoints || 0),
//       0
//     );

//     const earnedTodoPoints = completedTodos.reduce(
//       (acc, todo) => acc + (todo.assignedPoints || 0),
//       0
//     );

//     const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);

//     const streakDates = completedTodos.map((t) =>
//       moment(t.updatedAt).format('YYYY-MM-DD')
//     );
//     const { currentStreak, longestStreak } = calculateStreaks(streakDates);
//     const categoryStats = {};
// const priorityStats = { low: { total: 0, completed: 0 }, medium: { total: 0, completed: 0 }, high: { total: 0, completed: 0 } };

// todos.forEach(todo => {
//   const cat = todo.category || 'Uncategorized';
//   const prio = todo.priority || 'low';

//   // Category group
//   if (!categoryStats[cat]) categoryStats[cat] = { total: 0, completed: 0 };
//   categoryStats[cat].total++;
//   if (todo.status === 'done') categoryStats[cat].completed++;

//   // Priority group
//   if (!priorityStats[prio]) priorityStats[prio] = { total: 0, completed: 0 };
//   priorityStats[prio].total++;
//   if (todo.status === 'done') priorityStats[prio].completed++;
// });


//     res.json({
//       total,
//       completed,
//       completionRate,
//       trend: trend.map((day) => ({ date: day._id, completed: day.count })),
//       earnedTodoPoints,
//       totalAvailableTodoPoints,
//       currentStreak,
//       longestStreak,
//       categoryStats,
//       priorityStats
//     });
//   } catch (err) {
//     console.error('Stats error:', err);
//     res.status(500).json({ error: 'Failed to fetch stats' });
//   }
// };



//32



exports.getTodoStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch todos where user is owner or participant
    const todos = await Todo.find({
      $or: [{ userId }, { participants: userId }]
    }).select('_id title category priority assignedPoints userId participants');

    // Build valid todo ID list (user has access)
    const validTodoIds = new Set(
      todos.map(t => t._id.toString())
    );

    // Fetch user's completions
    const completions = await Completion.find({ userId });

    // Filter completions to only include valid todos
    const validCompletions = completions.filter(c =>
      validTodoIds.has(c.todoId.toString())
    );

    // 1. Completion Trend (last 7 days)
    const trend = await Completion.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          completedAt: {
            $gte: moment().subtract(7, 'days').startOf('day').toDate()
          },
          todoId: { $in: Array.from(validTodoIds).map(id => new mongoose.Types.ObjectId(id)) }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$completedAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 2. Point Calculations
    const total = todos.length;
    const completed = validCompletions.length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const earnedTodoPoints = validCompletions.reduce(
      (sum, c) => sum + (c.pointsEarned || 0), 0
    );

    const totalAvailableTodoPoints = todos.reduce((sum, t) => {
      const isUserParticipant =
        t.userId.toString() === userId ||
        (t.participants || []).map(p => p.toString()).includes(userId);
      return isUserParticipant ? sum + (t.assignedPoints || 0) : sum;
    }, 0);

    // 3. Streak Calculation
    const streakDates = validCompletions.map(c =>
      moment(c.completedAt).format('YYYY-MM-DD')
    );
    const { currentStreak, longestStreak } = calculateStreaks(streakDates);

    // 4. Category & Priority Stats
    const categoryStats = {};
    const priorityStats = {
      low: { total: 0, completed: 0 },
      medium: { total: 0, completed: 0 },
      high: { total: 0, completed: 0 }
    };

    for (const todo of todos) {
      const cat = todo.category || 'Uncategorized';
      const prio = todo.priority || 'low';

      if (!categoryStats[cat]) categoryStats[cat] = { total: 0, completed: 0 };
      categoryStats[cat].total++;

      if (!priorityStats[prio]) priorityStats[prio] = { total: 0, completed: 0 };
      priorityStats[prio].total++;

      const isCompleted = validCompletions.some(c =>
        c.todoId.toString() === todo._id.toString()
      );
      if (isCompleted) {
        categoryStats[cat].completed++;
        priorityStats[prio].completed++;
      }
    }

    // Final result
    res.json({
      total,
      completed,
      completionRate,
      trend: trend.map(day => ({ date: day._id, completed: day.count })),
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



/* =========================================================================
 *  PATCH  /api/todos/:id/status
 * ========================================================================= */
exports.updateTodoStatus = async (req, res) => {
  try {
    const { status } = req.body;

    /* ---------------------------------------------------------------------
     * 1.  Find the todo the caller can access (creator OR participant)
     * ------------------------------------------------------------------- */
    const todo = await Todo.findOne({
      _id: req.params.id,
      $or: [{ userId: req.user.id }, { participants: req.user.id }],
    });

    if (!todo) {
      return res
        .status(404)
        .json({ error: 'Todo not found or access denied' });
    }

    const isShared = (todo.participants?.length ?? 0) > 1;
    const now      = new Date();

    /* ---------------------------------------------------------------------
     * 2.  Guard: no updates after end-time
     * ------------------------------------------------------------------- */
    if (now > todo.endTime) {
      return res
        .status(400)
        .json({ error: 'This todo has expired. You cannot update its status.' });
    }

    /* ---------------------------------------------------------------------
     * 3.  Shared todos must use /complete for "done"
     * ------------------------------------------------------------------- */
    if (status === 'done' && isShared) {
      return res
        .status(400)
        .json({ error: 'Use /:id/complete to mark done' });
    }

    let message      = '';
    let pointsEarned = 0;

    /* =====================================================================
     * 4-A.  SOLO TODO  —  mark DONE
     * =================================================================== */
    if (status === 'done') {
      if (todo.status === 'done') {
        return res.status(400).json({ error: 'Already marked as done' });
      }

      if (now < todo.startTime) {
        return res
          .status(400)
          .json({ error: 'Cannot complete before the start time' });
      }

      /* create completion */
      const completion = new Completion({
        userId:       req.user.id,
        todoId:       todo._id,
        pointsEarned: todo.assignedPoints || 0,
        completedAt:  now,
      });
      await completion.save();

      /* update todo */
      todo.status = 'done';
      todo.completions.push(completion._id);
      await todo.save();

      /* update user points */
      const user = await User.findById(req.user.id);
      if (user) {
        user.todoPoints += todo.assignedPoints || 0;
        await user.save();
      }

      pointsEarned = todo.assignedPoints || 0;
      message      = `Task completed! +${pointsEarned} points`;
    }

    /* =====================================================================
     * 4-B.  Revert solo DONE  →  any other status
     * =================================================================== */
    else if (todo.status === 'done' && status !== 'done') {
      /* remove completion */
      const removed = await Completion.findOneAndDelete({
        todoId: todo._id,
        userId: req.user.id,
      });

      if (removed) {
        /* adjust user points */
        const user = await User.findById(req.user.id);
        if (user) {
          user.todoPoints -= removed.pointsEarned || 0;
          await user.save();
        }

        /* drop reference from todo */
        todo.completions = todo.completions.filter(
          id => String(id) !== String(removed._id)
        );
      }

      /* update status */
      todo.status = status;
      await todo.save();

      message = `Status reverted to "${status}"`;
    }

    /* =====================================================================
     * 4-C.  Plain status change (shared or solo)
     * =================================================================== */
    else {
      todo.status = status;
      await todo.save();
      message = `Status updated to "${status}"`;
    }

    /* ---------------------------------------------------------------------
     * 5.  Return fresh, populated todo
     * ------------------------------------------------------------------- */
    const updatedTodo = await Todo.findById(todo._id)
      .populate('participants', 'name')
      .populate({
        path: 'completions',
        populate: { path: 'userId', select: 'name' },
      });

    return res.json({ message, pointsEarned, todo: updatedTodo });
  } catch (err) {
    console.error('❌ Failed to update status:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
};



/* =========================================================================
 *  POST  /api/todos/:id/complete    (shared todos)
 * ========================================================================= */
// exports.completeSharedTodo = async (req, res) => {
//   try {
//     const todo   = await Todo.findById(req.params.id);
//     const userId = req.user.id;

//     /* -------------------------------------------------------------------
//      * 1.  Access / time guards
//      * ----------------------------------------------------------------- */
//     if (
//       !todo ||
//       !todo.participants.some(pid => pid.toString() === userId)
//     ) {
//       return res.status(403).json({ error: 'Access denied' });
//     }

//     const now = new Date();
//     if (now > todo.endTime) {
//       return res
//         .status(400)
//         .json({ error: 'This todo has expired. You cannot update its status.' });
//     }

//     /* -------------------------------------------------------------------
//      * 2.  Find existing completion (if any)
//      * ----------------------------------------------------------------- */
//     const existing = await Completion.findOne({ userId, todoId: todo._id });

//     let message      = '';
//     let pointsEarned = 0;

//     /* ===================================================================
//      * 3-A.  REVERT completion
//      * ================================================================= */
//     if (req.body.revert === true) {
//       if (!existing) {
//         return res
//           .status(400)
//           .json({ error: 'You have not completed this todo yet' });
//       }

//       /* delete completion */
//       await Completion.deleteOne({ _id: existing._id });

//       /* remove reference */
//       todo.completions = todo.completions.filter(
//         id => String(id) !== String(existing._id)
//       );
//       await todo.save();

//       /* deduct points */
//       const user = await User.findById(userId);
//       if (user) {
//         user.todoPoints -= existing.pointsEarned || 0;
//         await user.save();
//       }

//       message = '✅ Completion reverted';
//     }

//     /* ===================================================================
//      * 3-B.  MARK as completed
//      * ================================================================= */
//     else {
//       if (existing) {
//         return res
//           .status(400)
//           .json({ error: 'You already completed this todo' });
//       }

//       /* create completion */
//       const completion = new Completion({
//         userId,
//         todoId: todo._id,
//         pointsEarned: todo.assignedPoints || 0,
//         completedAt:  now,
//       });
//       await completion.save();

//       /* add reference */
//       todo.completions.push(completion._id);
//       await todo.save();

//       /* add points */
//       const user = await User.findById(userId);
//       if (user) {
//         user.todoPoints += todo.assignedPoints || 0;
//         await user.save();
//       }

//       pointsEarned = todo.assignedPoints || 0;
//       message      = `✅ Completed! +${pointsEarned} points`;
//     }

//     /* -------------------------------------------------------------------
//      * 4.  Return fresh todo
//      * ----------------------------------------------------------------- */
//     const updatedTodo = await Todo.findById(todo._id)
//       .populate('participants', 'name')
//       .populate({
//         path: 'completions',
//         populate: { path: 'userId', select: 'name' },
//       });

//     return res.json({ message, pointsEarned, todo: updatedTodo });
//   } catch (err) {
//     console.error('❌ Failed to complete shared todo:', err);
//     return res.status(500).json({ error: 'Something went wrong' });
//   }
// };

exports.completeSharedTodo = async (req, res) => {
  try {
    // 1. Fetch the todo with necessary population
    const todo = await Todo.findById(req.params.id)
      .populate('participants')
      .populate({
        path: 'completions',
        populate: { path: 'userId' }
      });
    
    const userId = req.user.id;

    // =====================================================================
    // ACCESS CONTROL & VALIDATION
    // =====================================================================
    
    if (!todo || !todo.participants.some(pid => pid._id.toString() === userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const now = new Date();
    if (now > todo.endTime) {
      return res.status(400).json({ 
        error: 'This todo has expired. You cannot update its status.' 
      });
    }

    // =====================================================================
    // COMPLETION LOGIC
    // =====================================================================

    const existing = todo.completions.find(c => c.userId._id.toString() === userId);
    let message = '';
    let pointsEarned = 0;
    let shouldUpdateTodoStatus = false;

    // ---------------------------------------------------------------------
    // CASE 1: REVERTING COMPLETION
    // ---------------------------------------------------------------------
    if (req.body.revert === true) {
      if (!existing) {
        return res.status(400).json({ 
          error: 'You have not completed this todo yet' 
        });
      }

      await Completion.deleteOne({ _id: existing._id });
      todo.completions = todo.completions.filter(
        c => c._id.toString() !== existing._id.toString()
      );
      await todo.save();

      const user = await User.findById(userId);
      if (user) {
        user.todoPoints -= existing.pointsEarned || 0;
        await user.save();
      }

      shouldUpdateTodoStatus = true;
      message = '✅ Completion reverted';
    } 
    
    // ---------------------------------------------------------------------
    // CASE 2: MARKING AS COMPLETED
    // ---------------------------------------------------------------------
    else {
      if (existing) {
        return res.status(400).json({ 
          error: 'You already completed this todo' 
        });
      }

      const completion = new Completion({
        userId,
        todoId: todo._id,
        pointsEarned: todo.assignedPoints || 0,
        completedAt: now,
      });
      await completion.save();

      // Populate the new completion for response
      const populatedCompletion = await Completion.populate(completion, {
        path: 'userId',
        select: 'name'
      });

      todo.completions.push(populatedCompletion);
      await todo.save();

      const user = await User.findById(userId);
      if (user) {
        user.todoPoints += todo.assignedPoints || 0;
        await user.save();
      }

      pointsEarned = todo.assignedPoints || 0;
      message = `✅ Completed! +${pointsEarned} points`;

      // Check if all participants have completed
      const allCompleted = todo.participants.every(participant => 
        todo.completions.some(c => c.userId._id.toString() === participant._id.toString())
      );

      if (allCompleted) {
        shouldUpdateTodoStatus = true;
      }
    }

    // =====================================================================
    // UPDATE TODO STATUS IF NEEDED
    // =====================================================================
    if (shouldUpdateTodoStatus) {
      const newStatus = req.body.revert ? 'in-progress' : 'done';
      todo.status = newStatus;
      await todo.save();
    }

    // =====================================================================
    // RETURN UPDATED TODO
    // =====================================================================
    // Refresh the todo with latest data
    const updatedTodo = await Todo.findById(todo._id)
      .populate('participants', 'name')
      .populate({
        path: 'completions',
        populate: { path: 'userId', select: 'name' },
      })
      .lean();

    return res.json({ 
      success: true,
      message, 
      pointsEarned, 
      todo: updatedTodo,
      statusUpdated: shouldUpdateTodoStatus
    });

  } catch (err) {
    console.error('❌ Failed to complete shared todo:', err);
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};


exports.getTodoLeaderboard = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const mode   = (req.query.mode || 'live').toString();  // live, month, hall
    const year   = new Date().getFullYear();

    /* ------------------------------------------------------------
     * 0.  Base $match: completions only on shared todos
     *     where *current user* is creator or participant
     * ---------------------------------------------------------- */
    const baseMatch = [
      // join todo
      {
        $lookup: {
          from: 'todos',
          localField: 'todoId',
          foreignField: '_id',
          as: 'todo'
        }
      },
      { $unwind: '$todo' },

      // shared & I'm involved
      {
        $match: {
          $expr: { $gt: [ { $size: '$todo.participants' }, 1 ] },
          $or: [
            { 'todo.userId': userId },
            { 'todo.participants': userId }
          ]
        }
      }
    ];

    /* ============================================================
     * 1.  LIVE  –  lifetime leaderboard
     * ========================================================== */
    if (mode === 'live') {
      const leaderboard = await Completion.aggregate([
        ...baseMatch,
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

      return res.json({ mode: 'live', leaderboard });
    }

    /* ============================================================
     * 2.  MONTH  –  leaderboard for a given month of current year
     * ========================================================== */
    if (mode === 'month') {
      const monthInt = parseInt(req.query.month, 10) || (new Date().getMonth() + 1);
      if (monthInt < 1 || monthInt > 12)
        return res.status(400).json({ error: 'Month must be 1-12' });

      const monthStart = new Date(year, monthInt - 1, 1);
      const monthEnd   = new Date(year, monthInt, 1);  // first day of next month

      const leaderboard = await Completion.aggregate([
        ...baseMatch,
        {
          $match: {
            completedAt: { $gte: monthStart, $lt: monthEnd }
          }
        },
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
            name:   '$user.name',
            totalPoints: 1
          }
        }
      ]);

      return res.json({ mode: 'month', month: monthInt, leaderboard });
    }

    /* ============================================================
     * 3.  HALL OF FAME  –  wins per user this year
     * ========================================================== */
    if (mode === 'hall') {
      /* 3-A.  aggregate points per (month, user) */
      const monthlyPoints = await Completion.aggregate([
        ...baseMatch,
        {
          $match: {
            completedAt: {
              $gte: new Date(`${year}-01-01T00:00:00Z`),
              $lt:  new Date(`${year + 1}-01-01T00:00:00Z`)
            }
          }
        },
        {
          $group: {
            _id: {
              month: { $month: '$completedAt' },
              user:  '$userId'
            },
            points: { $sum: '$pointsEarned' }
          }
        }
      ]);

      /* 3-B.  build a winner map in JS */
      const wins = new Map();           // userId → winCount
      const monthBuckets = Array.from({ length: 12 }, () => []);

      monthlyPoints.forEach(p => {
        monthBuckets[p._id.month - 1].push(p);
      });

      monthBuckets.forEach(bucket => {
        if (!bucket.length) return;
        const max = Math.max(...bucket.map(b => b.points));
        bucket
          .filter(b => b.points === max) // handle ties
          .forEach(b => {
            const key = String(b._id.user);
            wins.set(key, (wins.get(key) || 0) + 1);
          });
      });

      /* 3-C.  fetch user names and format */
      const hallOfFame = await Promise.all(
        Array.from(wins.entries()).map(async ([uid, winCount]) => {
          const user = await User.findById(uid, 'name');
          return {
            userId: uid,
            name: user ? user.name : 'Unknown',
            wins: winCount
          };
        })
      );

      hallOfFame.sort((a, b) => b.wins - a.wins); // most wins first

      return res.json({ mode: 'hall', year, hallOfFame });
    }

    return res.status(400).json({ error: 'Invalid mode' });
  } catch (err) {
    console.error('Leaderboard error:', err);
    return res.status(500).json({ error: 'Failed to get leaderboard' });
  }
};