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
