const Todo = require('../models/Todo');

const cloneTodoFromBase = async (baseTodo) => {
  const duration = baseTodo.endTime - baseTodo.startTime;
  const now = new Date();

  const nextStart = now;
  const nextEnd = new Date(nextStart.getTime() + duration);

  const newTodo = new Todo({
    userId: baseTodo.userId,
    title: baseTodo.title,
    description: baseTodo.description,
    category: baseTodo.category,
    startTime: nextStart,
    endTime: nextEnd,
    repeatInterval: baseTodo.repeatInterval,
    assignedPoints: baseTodo.assignedPoints,
    status: 'todo',
    participants: [baseTodo.userId],
    joinCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
    priority: baseTodo.priority,
    tags: baseTodo.tags,
    subtasks: baseTodo.subtasks,
    isStarred: baseTodo.isStarred,
    reminder: baseTodo.reminder,
    expoPushToken: baseTodo.expoPushToken,
    wasRepeated: false,
    createdFrom: baseTodo.createdFrom || baseTodo._id
  });

  await newTodo.save();
};

module.exports = async function autoRepeatTodos() {
  try {
    const now = new Date();

    const rootTodos = await Todo.find({
      repeatInterval: 'repeat',
      createdFrom: { $exists: false }
    });

    let repeatedCount = 0;

    for (const root of rootTodos) {
      const lastInstance = await Todo.findOne({
        $or: [
          { _id: root._id },
          { createdFrom: root._id }
        ]
      }).sort({ startTime: -1 });

      // ❌ Skip if not ended yet or already repeated
      if (
        !lastInstance ||
        !lastInstance.endTime ||
        lastInstance.endTime > now ||
        lastInstance.wasRepeated
      ) {
        continue;
      }

      // 🟠 Mark as missed if not done
      if (lastInstance.status !== 'done' && lastInstance.status !== 'missed') {
        lastInstance.status = 'missed';
        await lastInstance.save();
      }

      // ✅ Generate next
      await cloneTodoFromBase(lastInstance);

      // ✅ Prevent re-cloning
      lastInstance.wasRepeated = true;
      await lastInstance.save();

      repeatedCount++;
    }

    console.log(`🔁 Repeated ${repeatedCount} todos at ${now.toLocaleString()}`);
  } catch (err) {
    console.error('❌ Error in autoRepeatTodos cron:', err);
  }
};
