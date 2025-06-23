const SessionLog = require('../models/SessionLog');
const Challenge = require('../models/Challenge');
const MonthlyLeaderboard = require('../models/MonthlyLeaderboard');
const User = require('../models/User');

module.exports = async function calculateMonthlyLeaderboard() {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`; // previous month
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1); // e.g., May 1
  const end = new Date(now.getFullYear(), now.getMonth(), 1);       // e.g., June 1

  const logs = await SessionLog.find({
    endTime: { $gte: start, $lt: end }
  })
    .populate('user')
    .populate('challenge');

  const leaderboardMap = {};

  for (const log of logs) {
    if (!log.challenge || !log.user) continue;

    const { challenge, user } = log;
    const totalDuration = challenge.totalHours * 3600;
    if (totalDuration === 0) continue;

    const pointPerSecond = challenge.totalPoints / totalDuration;
    const earned = log.duration * pointPerSecond;

    const key = `${user._id}_${challenge._id}`;
    if (!leaderboardMap[key]) {
      leaderboardMap[key] = {
        userId: user._id,
        challenge: challenge._id,
        month,
        totalPoints: 0,
        challengesParticipated: 1,
        isWinner: false
      };
    }

    leaderboardMap[key].totalPoints += earned;
  }

  // 🔁 Clean up old entries
  await MonthlyLeaderboard.deleteMany({ month });

  // 📥 Insert new ones
  const entries = Object.values(leaderboardMap).map(entry => ({
    ...entry,
    totalPoints: Math.floor(entry.totalPoints)
  }));

  await MonthlyLeaderboard.insertMany(entries);

  // 🏆 Determine winners by total points (group by user)
  const userTotals = {};

  for (const entry of entries) {
    const uid = entry.userId.toString();
    if (!userTotals[uid]) userTotals[uid] = 0;
    userTotals[uid] += entry.totalPoints;
  }

  const maxPoints = Math.max(...Object.values(userTotals));
  const winners = Object.entries(userTotals)
    .filter(([_, points]) => points === maxPoints)
    .map(([uid]) => uid);

  await Promise.all(winners.map(async uid => {
    await User.findByIdAndUpdate(uid, {
      $inc: { totalWins: 1 },
      $push: { winHistory: month }
    });
  }));

  return { entries: entries.length, winners: winners.length, month };
};
