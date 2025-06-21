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
