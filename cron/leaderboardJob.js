const cron = require('node-cron');
const calculateMonthlyLeaderboard = require('../utils/calculateMonthlyLeaderboard');

function setupLeaderboardCronJob() {
  // Runs at 00:01 on the 1st of every month
  cron.schedule('1 0 1 * *', async () => {
    try {
      console.log('📊 Running monthly leaderboard job...');
      const result = await calculateMonthlyLeaderboard();
      console.log('✅ Leaderboard calculated:', result);
    } catch (err) {
      console.error('🔥 Cron job error:', err.message);
    }
  });
}

module.exports = setupLeaderboardCronJob;
