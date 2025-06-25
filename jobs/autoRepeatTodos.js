
const Todo = require('../models/Todo');
const Completion = require('../models/Completion');
const User = require('../models/User');

// jobs/autoRepeatTodos.js


/* --------------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------------ */

// true if this todo currently has more than one participant
const isSharedTodo = (todo) =>
  Array.isArray(todo.participants) && todo.participants.length > 1;

// generate guaranteed-unique 6-char code
async function generateUniqueJoinCode() {
  let code, clash;
  do {
    code   = Math.random().toString(36).substr(2, 6).toUpperCase();
    clash  = await Todo.exists({ joinCode: code });
  } while (clash);
  return code;
}

// clone the base todo for the next cycle
const cloneTodoFromBase = async (baseTodo) => {
  const duration   = baseTodo.endTime - baseTodo.startTime;
  const nextStart  = new Date();                       // now
  const nextEnd    = new Date(nextStart.getTime() + duration);
  const shared     = isSharedTodo(baseTodo);

  const newTodoData = {
    userId:          baseTodo.userId,
    title:           baseTodo.title,
    description:     baseTodo.description,
    category:        baseTodo.category,
    startTime:       nextStart,
    endTime:         nextEnd,
    repeatInterval:  baseTodo.repeatInterval,
    assignedPoints:  baseTodo.assignedPoints,
    status:          'todo',
    participants:    baseTodo.participants,
    priority:        baseTodo.priority,
    tags:            baseTodo.tags,
    subtasks:        baseTodo.subtasks,
    isStarred:       baseTodo.isStarred,
    reminder:        baseTodo.reminder,
    expoPushToken:   baseTodo.expoPushToken,
    wasRepeated:     false,
    createdFrom:     baseTodo.createdFrom || baseTodo._id, // keep root link
  };

  if (shared) {
    newTodoData.joinCode = await generateUniqueJoinCode();
  }

  const newTodo = new Todo(newTodoData);
  await newTodo.save();
  return newTodo;
};

/* --------------------------------------------------------------------------
 * Main cron job
 * ------------------------------------------------------------------------ */
module.exports = async function autoRepeatTodos() {
  try {
    const now = new Date();
    console.log(`⏰ Running auto-repeat at ${now.toISOString()}`);

    // only todos that have ended & not processed yet
    const todosToRepeat = await Todo.find({
      repeatInterval: 'repeat',
      wasRepeated:    false,
      endTime:        { $lte: now },
    })
      .populate('participants')
      .lean();

    let repeatedCount = 0;

    for (const todo of todosToRepeat) {
      try {
        /* --------------------------------------
         * 1.  Mark solo todo as "missed" if needed
         * ------------------------------------ */
        if (!isSharedTodo(todo) && todo.status !== 'done' && todo.status !== 'missed') {
          await Todo.updateOne({ _id: todo._id }, { $set: { status: 'missed' } });
        }

        /* --------------------------------------
         * 2.  Clone for next cycle
         * ------------------------------------ */
        const newTodo = await cloneTodoFromBase(todo);
        repeatedCount++;

        /* --------------------------------------
         * 3.  Flag original as processed
         * ------------------------------------ */
        await Todo.updateOne({ _id: todo._id }, { $set: { wasRepeated: true } });

        console.log(
          `🔄 Repeated todo ${todo._id} → ${newTodo._id} (${isSharedTodo(todo) ? 'shared' : 'solo'})`
        );
      } catch (err) {
        console.error(`❌ Failed to repeat todo ${todo._id}:`, err.message);
      }
    }

    console.log(`✅ Successfully repeated ${repeatedCount} todos`);
    return { success: true, count: repeatedCount };
  } catch (err) {
    console.error('❌ Error in autoRepeatTodos:', err);
    return { success: false, error: err.message };
  }
};
