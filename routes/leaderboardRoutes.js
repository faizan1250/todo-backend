
// module.exports = router;

// const express = require('express');
// const mongoose = require('mongoose');
// const router = express.Router();
// const MonthlyLeaderboard = require('../models/MonthlyLeaderboard');
// const User = require('../models/User');
// const SessionLog = require('../models/SessionLog');
// const Challenge = require('../models/Challenge');
// const authMiddleware = require('../middleware/authMiddleware');

// // 🔹 GET /leaderboard/monthly/:month
// router.get('/monthly/:month', async (req, res) => {
//   const { month } = req.params;

//   try {
//     const data = await MonthlyLeaderboard.find({ month })
//       .sort({ totalPoints: -1 })
//       .populate('userId', 'name profileColor totalWins');

//     const formatted = data.map(entry => ({
//       _id: entry.userId._id,
//       name: entry.userId.name,
//       profileColor: entry.userId.profileColor,
//       totalWins: entry.userId.totalWins || 0,
//       points: entry.totalPoints || 0,
//       carryoverPoints: 0, // if you want, or remove
//     }));

//     res.json(formatted);
//   } catch (err) {
//     res.status(500).json({ msg: 'Server error', error: err.message });
//   }
// });



// router.get('/monthly/:month/shared', authMiddleware, async (req, res) => {
//   const { month } = req.params;
//   const userId = req.user.id;

//   try {
//     // Find shared challenges the user participates in (2+ participants)
//     const sharedChallenges = await Challenge.find({
//   'participants.user': userId,
//   $expr: { $gte: [{ $size: "$participants" }, 2] }
// }).select('_id');


//     const sharedChallengeIds = sharedChallenges.map(ch => ch._id.toString());

//     // Find MonthlyLeaderboard entries for the month
//     const rawEntries = await MonthlyLeaderboard.find({ month })
//       .sort({ totalPoints: -1 })
//       .populate('userId', 'name totalWins');

//     const validEntries = [];

//     for (const entry of rawEntries) {
//       if (!entry.challenge) continue;

//       // Make sure challenge is ObjectId
//       let challengeId;
//       try {
//         challengeId = entry.challenge instanceof mongoose.Types.ObjectId
//           ? entry.challenge
//           : mongoose.Types.ObjectId(entry.challenge);
//       } catch {
//         console.warn('Invalid challengeId:', entry.challenge);
//         continue;
//       }

//       // Only include shared challenges user participates in
//       if (!sharedChallengeIds.includes(challengeId.toString())) continue;

//       // Optionally fetch challenge again to verify participants (extra safety)
//       const challenge = await Challenge.findById(challengeId).select('participants');
//       if (!challenge || challenge.participants.length < 2) continue;

//       validEntries.push({
//         _id: entry.userId._id,
//         name: entry.userId.name,
//         totalWins: entry.userId.totalWins,
//         points: entry.totalPoints,
//       });
//     }

//     res.json(validEntries);
//   } catch (err) {
//     console.error('🔥 /monthly/:month/shared error:', err);
//     res.status(500).json({ msg: 'Server error', error: err.message });
//   }
// });





// // 🔹 GET /leaderboard/current
// router.get('/current', async (req, res) => {
//   const now = new Date();
//   const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

//   try {
//     const data = await MonthlyLeaderboard.find({ month: currentMonth })
//       .sort({ totalPoints: -1 })
//       .populate('userId', 'name profileColor totalWins');

//     res.json(data);
//   } catch (err) {
//     res.status(500).json({ msg: 'Server error', error: err.message });
//   }
// });

// // 🔹 GET /leaderboard/win-history
// router.get('/win-history', async (req, res) => {
//   try {
//     const users = await User.find(
//       { 'winHistory.0': { $exists: true } },
//       'name profileColor totalWins winHistory'
//     );

//     const sorted = users.sort((a, b) => b.totalWins - a.totalWins);

//     res.json(sorted);
//   } catch (err) {
//     res.status(500).json({ msg: 'Server error', error: err.message });
//   }
// });

// // 🔹 GET /leaderboard/summary
// router.get('/summary', async (req, res) => {
//   try {
//     const now = new Date();
//     const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
//     const previousMonth = `${now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()}-${String(now.getMonth() === 0 ? 12 : now.getMonth()).padStart(2, '0')}`;
//     const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

//     const sessionLogs = await SessionLog.find({ endTime: { $gte: startOfMonth } }).populate('challenge user');

//     const pointsByUser = {};

//     for (const log of sessionLogs) {
//       if (!log.challenge || !log.user) continue;

//       const userId = log.user._id.toString();
//       const challenge = log.challenge;
//       const totalPoints = challenge.totalPoints || 0;
//       const totalDuration = challenge.totalHours * 3600;
//       const pointPerSecond = totalPoints / totalDuration;

//       const earned = log.duration * pointPerSecond;

//       if (!pointsByUser[userId]) {
//         pointsByUser[userId] = {
//           user: log.user,
//           points: 0,
//           carryoverPoints: 0,
//         };
//       }

//       const challengeStart = new Date(challenge.startDate);
//       const isCarryover = challengeStart < startOfMonth;

//       if (isCarryover) {
//         pointsByUser[userId].carryoverPoints += earned;
//       }

//       pointsByUser[userId].points += earned;
//     }

//     const currentMonthLeaderboard = Object.entries(pointsByUser)
//       .map(([userId, data]) => ({
//         _id: data.user._id,
//         name: data.user.name,
//         totalWins: data.user.totalWins || 0,
//         points: Math.floor(data.points),
//         carryoverPoints: Math.floor(data.carryoverPoints),
//       }))
//       .sort((a, b) => b.points - a.points);

//     const prev = await MonthlyLeaderboard.find({ month: previousMonth }).sort({ totalPoints: -1 });
//     const maxPoints = prev.length ? prev[0].totalPoints : 0;
//     const winners = prev.filter(entry => entry.totalPoints === maxPoints);

//     const previousMonthWinner = {
//       month: previousMonth,
//       winners: await Promise.all(winners.map(async entry => {
//         const user = await User.findById(entry.userId);
//         return {
//           name: user.name,
//           points: entry.totalPoints
//         };
//       }))
//     };

//     const users = await User.find({ 'winHistory.0': { $exists: true } }, 'name winHistory totalWins');
//     const winSummary = users.map(user => ({
//       name: user.name,
//       totalWins: user.totalWins,
//       winHistory: user.winHistory
//     }));

//     res.json({
//       currentMonth,
//       currentMonthLeaderboard,
//       previousMonthWinner,
//       winSummary
//     });

//   } catch (err) {
//     console.error('🔥 /leaderboard/summary error:', err);
//     res.status(500).json({ msg: 'Server error', error: err.message });
//   }
// });

// // 🔹 GET /leaderboard/shared-summary (Live shared view)
// router.get('/shared-summary', authMiddleware, async (req, res) => {
//   try {
//     const now = new Date();
//     const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
//     const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
//     const userId = req.user.id;

//     const sessionLogs = await SessionLog.find({ endTime: { $gte: startOfMonth } })
//       .populate({
//         path: 'challenge',
//         select: 'totalHours totalPoints startDate participants'
//       })
//       .populate('user');

//     const pointsByUser = {};

//     for (const log of sessionLogs) {
//       const challenge = log.challenge;
//       const user = log.user;
//       if (!challenge || !user) continue;

//       const participantIds = challenge.participants.map(p =>
//         typeof p === 'string' ? p : p._id.toString()
//       );

//       // ✅ Include only shared challenges where current user is also a participant
//       if (!participantIds.includes(userId) || participantIds.length < 2) continue;

//       const uid = user._id.toString();
//       const totalPoints = challenge.totalPoints || 0;
//       const totalDuration = challenge.totalHours * 3600;
//       if (totalDuration === 0) continue;

//       const earned = log.duration * (totalPoints / totalDuration);
//       const isCarryover = new Date(challenge.startDate) < startOfMonth;

//       if (!pointsByUser[uid]) {
//         pointsByUser[uid] = {
//           user,
//           points: 0,
//           carryoverPoints: 0,
//         };
//       }

//       pointsByUser[uid].points += earned;
//       if (isCarryover) {
//         pointsByUser[uid].carryoverPoints += earned;
//       }
//     }

//     const currentMonthLeaderboard = Object.entries(pointsByUser)
//       .map(([uid, data]) => ({
//         _id: data.user._id,
//         name: data.user.name,
//         totalWins: data.user.totalWins || 0,
//         points: Math.floor(data.points),
//         carryoverPoints: Math.floor(data.carryoverPoints),
//       }))
//       .sort((a, b) => b.points - a.points);

//     res.json({ currentMonth, currentMonthLeaderboard });

//   } catch (err) {
//     console.error('🔥 /leaderboard/shared-summary error:', err);
//     res.status(500).json({ msg: 'Server error', error: err.message });
//   }
// });


// // module.exports = router;
// const express = require('express');
// const mongoose = require('mongoose');
// const router = express.Router();
// const MonthlyLeaderboard = require('../models/MonthlyLeaderboard');
// const User = require('../models/User');
// const SessionLog = require('../models/SessionLog');
// const Challenge = require('../models/Challenge');
// const authMiddleware = require('../middleware/authMiddleware');

// // Helper function to get month string
// const getMonthString = (date) => {
//   return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
// };

// // 🔹 GET /leaderboard/summary (Updated with monthly breakdown)
// router.get('/summary', async (req, res) => {
//   try {
//     const now = new Date();
//     const currentMonth = getMonthString(now);
//     const previousMonth = getMonthString(new Date(now.getFullYear(), now.getMonth() - 1, 1));
//     const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

//     // Get all active challenges
//     const challenges = await Challenge.find({
//       status: 'Active',
//       endDate: { $gte: startOfMonth }
//     }).populate('participants.user');

//     // Calculate points with monthly breakdown
//     const pointsByUser = {};

//     challenges.forEach(challenge => {
//       const challengeDate = new Date(challenge.startDate);
//       const isCurrentMonth = challengeDate >= startOfMonth;
//       const isPreviousMonth = challengeDate < startOfMonth && challengeDate >= new Date(now.getFullYear(), now.getMonth() - 1, 1);

//       challenge.participants.forEach(participant => {
//         const userId = participant.user._id.toString();
        
//         if (!pointsByUser[userId]) {
//           pointsByUser[userId] = {
//             user: participant.user,
//             currentMonthPoints: 0,
//             previousMonthPoints: 0,
//             totalPoints: 0
//           };
//         }

//         const points = participant.pointsEarned || 0;
        
//         if (isCurrentMonth) {
//           pointsByUser[userId].currentMonthPoints += points;
//         } else if (isPreviousMonth) {
//           pointsByUser[userId].previousMonthPoints += points;
//         }
        
//         pointsByUser[userId].totalPoints += points;
//       });
//     });

//     // Format leaderboard data
//     const currentMonthLeaderboard = Object.values(pointsByUser)
//       .map(data => ({
//         _id: data.user._id,
//         name: data.user.name,
//         profileColor: data.user.profileColor,
//         totalWins: data.user.totalWins || 0,
//         points: data.totalPoints,
//         currentMonthPoints: data.currentMonthPoints,
//         previousMonthPoints: data.previousMonthPoints
//       }))
//       .sort((a, b) => b.currentMonthPoints - a.currentMonthPoints);

//     // Get previous month winner
//     const prevMonthData = await MonthlyLeaderboard.find({ month: previousMonth })
//       .sort({ totalPoints: -1 })
//       .limit(1)
//       .populate('userId', 'name');

//     const previousMonthWinner = {
//       month: previousMonth,
//       winners: prevMonthData.length > 0 ? [{
//         name: prevMonthData[0].userId.name,
//         points: prevMonthData[0].totalPoints
//       }] : []
//     };

//     // Get win history
//     const winSummary = await User.find({ 'winHistory.0': { $exists: true } })
//       .select('name winHistory totalWins')
//       .sort({ totalWins: -1 });

//     res.json({
//       currentMonth,
//       currentMonthLeaderboard,
//       previousMonthWinner,
//       winSummary: winSummary.map(user => ({
//         name: user.name,
//         totalWins: user.totalWins,
//         winHistory: user.winHistory
//       }))
//     });

//   } catch (err) {
//     console.error('🔥 /leaderboard/summary error:', err);
//     res.status(500).json({ msg: 'Server error', error: err.message });
//   }
// });

// // 🔹 GET /leaderboard/current (Updated)
// // 🔹 GET /leaderboard/current (Updated with monthly breakdown)
// router.get('/current', async (req, res) => {
//   try {
//     const now = new Date();
//     const currentMonth = getMonthString(now);
//     const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
//     const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

//     const challenges = await Challenge.find({
//       status: 'Active',
//       $or: [
//         { startDate: { $gte: startOfMonth } }, // Current month challenges
//         { 
//           startDate: { $gte: startOfPreviousMonth, $lt: startOfMonth }, // Previous month challenges
//           endDate: { $gte: now } // Still active
//         }
//       ]
//     }).populate('participants.user');

//     const leaderboard = {};

//     challenges.forEach(challenge => {
//       const isCurrentMonth = new Date(challenge.startDate) >= startOfMonth;
//       const isCarryover = !isCurrentMonth && challenge.status === 'Active';

//       challenge.participants.forEach(participant => {
//         const userId = participant.user._id.toString();
        
//         if (!leaderboard[userId]) {
//           leaderboard[userId] = {
//             user: participant.user,
//             currentMonthPoints: 0,
//             carryoverPoints: 0
//           };
//         }

//         const points = participant.pointsEarned || 0;
        
//         if (isCurrentMonth) {
//           leaderboard[userId].currentMonthPoints += points;
//         } else if (isCarryover) {
//           leaderboard[userId].carryoverPoints += points;
//         }
//       });
//     });

//     const formattedLeaderboard = Object.values(leaderboard).map(entry => ({
//       _id: entry.user._id,
//       name: entry.user.name,
//       profileColor: entry.user.profileColor,
//       totalWins: entry.user.totalWins || 0,
//       currentMonthPoints: entry.currentMonthPoints,
//       carryoverPoints: entry.carryoverPoints,
//       totalPoints: entry.currentMonthPoints + entry.carryoverPoints
//     })).sort((a, b) => b.currentMonthPoints - a.currentMonthPoints);

//     res.json({
//       currentMonth,
//       leaderboard: formattedLeaderboard
//     });

//   } catch (err) {
//     res.status(500).json({ msg: 'Server error', error: err.message });
//   }
// });

// // 🔹 GET /leaderboard/monthly/:month (Updated with breakdown)
// router.get('/monthly/:month', async (req, res) => {
//   const { month } = req.params;

//   try {
//     const [year, monthNum] = month.split('-').map(Number);
//     const startOfMonth = new Date(year, monthNum - 1, 1);
//     const startOfPreviousMonth = new Date(year, monthNum - 2, 1);

//     // Get all challenges that were active during this month
//     const challenges = await Challenge.find({
//       $or: [
//         { 
//           startDate: { $lt: new Date(year, monthNum, 1) },
//           endDate: { $gte: startOfMonth }
//         },
//         {
//           startDate: { $gte: startOfMonth, $lt: new Date(year, monthNum, 1) }
//         }
//       ]
//     }).populate('participants.user');

//     const leaderboard = {};

//     challenges.forEach(challenge => {
//       const isCurrentMonth = new Date(challenge.startDate) >= startOfMonth;
//       const isCarryover = !isCurrentMonth && new Date(challenge.startDate) >= startOfPreviousMonth;

//       challenge.participants.forEach(participant => {
//         const userId = participant.user._id.toString();
        
//         if (!leaderboard[userId]) {
//           leaderboard[userId] = {
//             user: participant.user,
//             currentMonthPoints: 0,
//             carryoverPoints: 0
//           };
//         }

//         const points = participant.pointsEarned || 0;
        
//         if (isCurrentMonth) {
//           leaderboard[userId].currentMonthPoints += points;
//         } else if (isCarryover) {
//           leaderboard[userId].carryoverPoints += points;
//         }
//       });
//     });

//     const formatted = Object.values(leaderboard).map(entry => ({
//       _id: entry.user._id,
//       name: entry.user.name,
//       profileColor: entry.user.profileColor,
//       totalWins: entry.user.totalWins || 0,
//       currentMonthPoints: entry.currentMonthPoints,
//       carryoverPoints: entry.carryoverPoints,
//       totalPoints: entry.currentMonthPoints + entry.carryoverPoints
//     })).sort((a, b) => b.currentMonthPoints - a.currentMonthPoints);

//     res.json(formatted);

//   } catch (err) {
//     res.status(500).json({ msg: 'Server error', error: err.message });
//   }
// });

// // 🔹 GET /leaderboard/shared-summary (Updated)
// router.get('/shared-summary', authMiddleware, async (req, res) => {
//   try {
//     const now = new Date();
//     const currentMonth = getMonthString(now);
//     const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
//     const userId = req.user.id;

//     // Find shared challenges the user participates in
//     const sharedChallenges = await Challenge.find({
//       'participants.user': userId,
//       $expr: { $gte: [{ $size: "$participants" }, 2] },
//       status: 'Active'
//     }).populate('participants.user');

//     const pointsByUser = {};

//     sharedChallenges.forEach(challenge => {
//       const isCurrentMonth = new Date(challenge.startDate) >= startOfMonth;
//       const isPreviousMonth = new Date(challenge.startDate) < startOfMonth && 
//                             new Date(challenge.startDate) >= new Date(now.getFullYear(), now.getMonth() - 1, 1);

//       challenge.participants.forEach(participant => {
//         const uid = participant.user._id.toString();
        
//         if (!pointsByUser[uid]) {
//           pointsByUser[uid] = {
//             user: participant.user,
//             currentMonthPoints: 0,
//             previousMonthPoints: 0
//           };
//         }

//         const points = participant.pointsEarned || 0;
        
//         if (isCurrentMonth) {
//           pointsByUser[uid].currentMonthPoints += points;
//         } else if (isPreviousMonth) {
//           pointsByUser[uid].previousMonthPoints += points;
//         }
//       });
//     });

//     const currentMonthLeaderboard = Object.values(pointsByUser)
//       .map(data => ({
//         _id: data.user._id,
//         name: data.user.name,
//         totalWins: data.user.totalWins || 0,
//         points: data.currentMonthPoints + data.previousMonthPoints,
//         currentMonthPoints: data.currentMonthPoints,
//         previousMonthPoints: data.previousMonthPoints
//       }))
//       .sort((a, b) => b.currentMonthPoints - a.currentMonthPoints);

//     res.json({ currentMonth, currentMonthLeaderboard });

//   } catch (err) {
//     console.error('🔥 /leaderboard/shared-summary error:', err);
//     res.status(500).json({ msg: 'Server error', error: err.message });
//   }
// });

// // Existing routes (unchanged)
// router.get('/win-history', async (req, res) => {
//   try {
//     const users = await User.find(
//       { 'winHistory.0': { $exists: true } },
//       'name profileColor totalWins winHistory'
//     ).sort({ totalWins: -1 });

//     res.json(users);
//   } catch (err) {
//     res.status(500).json({ msg: 'Server error', error: err.message });
//   }
// });

// module.exports = router;
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const MonthlyLeaderboard = require('../models/MonthlyLeaderboard');
const User = require('../models/User');
const SessionLog = require('../models/SessionLog');
const Challenge = require('../models/Challenge');
const authMiddleware = require('../middleware/authMiddleware');

// Helper function to get month string
const getMonthString = (date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

// 🔹 GET /leaderboard/summary (Updated to include completed challenges)
router.get('/summary', async (req, res) => {
  try {
    const now = new Date();
    const currentMonth = getMonthString(now);
    const previousMonth = getMonthString(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get all active AND completed challenges
    const challenges = await Challenge.find({
      status: { $in: ['Active', 'Completed'] },
      endDate: { $gte: startOfMonth }
    }).populate('participants.user');

    // Calculate points with monthly breakdown
    const pointsByUser = {};

    challenges.forEach(challenge => {
      const challengeDate = new Date(challenge.startDate);
      const isCurrentMonth = challengeDate >= startOfMonth;
      const isPreviousMonth = challengeDate < startOfMonth && challengeDate >= new Date(now.getFullYear(), now.getMonth() - 1, 1);

      challenge.participants.forEach(participant => {
        const userId = participant.user._id.toString();
        
        if (!pointsByUser[userId]) {
          pointsByUser[userId] = {
            user: participant.user,
            currentMonthPoints: 0,
            previousMonthPoints: 0,
            totalPoints: 0
          };
        }

        const points = participant.pointsEarned || 0;
        
        if (isCurrentMonth) {
          pointsByUser[userId].currentMonthPoints += points;
        } else if (isPreviousMonth) {
          pointsByUser[userId].previousMonthPoints += points;
        }
        
        pointsByUser[userId].totalPoints += points;
      });
    });

    // Format leaderboard data
    const currentMonthLeaderboard = Object.values(pointsByUser)
      .map(data => ({
        _id: data.user._id,
        name: data.user.name,
        profileColor: data.user.profileColor,
        totalWins: data.user.totalWins || 0,
        points: data.totalPoints,
        currentMonthPoints: data.currentMonthPoints,
        previousMonthPoints: data.previousMonthPoints
      }))
      .sort((a, b) => b.currentMonthPoints - a.currentMonthPoints);

    // Get previous month winner
    const prevMonthData = await MonthlyLeaderboard.find({ month: previousMonth })
      .sort({ totalPoints: -1 })
      .limit(1)
      .populate('userId', 'name');

    const previousMonthWinner = {
      month: previousMonth,
      winners: prevMonthData.length > 0 ? [{
        name: prevMonthData[0].userId.name,
        points: prevMonthData[0].totalPoints
      }] : []
    };

    // Get win history
    const winSummary = await User.find({ 'winHistory.0': { $exists: true } })
      .select('name winHistory totalWins')
      .sort({ totalWins: -1 });

    res.json({
      currentMonth,
      currentMonthLeaderboard,
      previousMonthWinner,
      winSummary: winSummary.map(user => ({
        name: user.name,
        totalWins: user.totalWins,
        winHistory: user.winHistory
      }))
    });

  } catch (err) {
    console.error('🔥 /leaderboard/summary error:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// 🔹 GET /leaderboard/current (Updated to include completed challenges)
router.get('/current', async (req, res) => {
  try {
    const now = new Date();
    const currentMonth = getMonthString(now);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const challenges = await Challenge.find({
      status: { $in: ['Active', 'Completed'] },
      $or: [
        { startDate: { $gte: startOfMonth } },
        { 
          startDate: { $gte: startOfPreviousMonth, $lt: startOfMonth },
          endDate: { $gte: now }
        }
      ]
    }).populate('participants.user');

    const leaderboard = {};

    challenges.forEach(challenge => {
      const isCurrentMonth = new Date(challenge.startDate) >= startOfMonth;
      const isCarryover = !isCurrentMonth && challenge.status === 'Active';

      challenge.participants.forEach(participant => {
        const userId = participant.user._id.toString();
        
        if (!leaderboard[userId]) {
          leaderboard[userId] = {
            user: participant.user,
            currentMonthPoints: 0,
            carryoverPoints: 0
          };
        }

        const points = participant.pointsEarned || 0;
        
        if (isCurrentMonth) {
          leaderboard[userId].currentMonthPoints += points;
        } else if (isCarryover) {
          leaderboard[userId].carryoverPoints += points;
        }
      });
    });

    const formattedLeaderboard = Object.values(leaderboard).map(entry => ({
      _id: entry.user._id,
      name: entry.user.name,
      profileColor: entry.user.profileColor,
      totalWins: entry.user.totalWins || 0,
      currentMonthPoints: entry.currentMonthPoints,
      carryoverPoints: entry.carryoverPoints,
      totalPoints: entry.currentMonthPoints + entry.carryoverPoints
    })).sort((a, b) => b.currentMonthPoints - a.currentMonthPoints);

    res.json({
      currentMonth,
      leaderboard: formattedLeaderboard
    });

  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// 🔹 GET /leaderboard/monthly/:month (Updated to include completed challenges)
router.get('/monthly/:month', async (req, res) => {
  const { month } = req.params;

  try {
    const [year, monthNum] = month.split('-').map(Number);
    const startOfMonth = new Date(year, monthNum - 1, 1);
    const startOfPreviousMonth = new Date(year, monthNum - 2, 1);

    const challenges = await Challenge.find({
      status: { $in: ['Active', 'Completed'] },
      $or: [
        { 
          startDate: { $lt: new Date(year, monthNum, 1) },
          endDate: { $gte: startOfMonth }
        },
        {
          startDate: { $gte: startOfMonth, $lt: new Date(year, monthNum, 1) }
        }
      ]
    }).populate('participants.user');

    const leaderboard = {};

    challenges.forEach(challenge => {
      const isCurrentMonth = new Date(challenge.startDate) >= startOfMonth;
      const isCarryover = !isCurrentMonth && new Date(challenge.startDate) >= startOfPreviousMonth;

      challenge.participants.forEach(participant => {
        const userId = participant.user._id.toString();
        
        if (!leaderboard[userId]) {
          leaderboard[userId] = {
            user: participant.user,
            currentMonthPoints: 0,
            carryoverPoints: 0
          };
        }

        const points = participant.pointsEarned || 0;
        
        if (isCurrentMonth) {
          leaderboard[userId].currentMonthPoints += points;
        } else if (isCarryover) {
          leaderboard[userId].carryoverPoints += points;
        }
      });
    });

    const formatted = Object.values(leaderboard).map(entry => ({
      _id: entry.user._id,
      name: entry.user.name,
      profileColor: entry.user.profileColor,
      totalWins: entry.user.totalWins || 0,
      currentMonthPoints: entry.currentMonthPoints,
      carryoverPoints: entry.carryoverPoints,
      totalPoints: entry.currentMonthPoints + entry.carryoverPoints
    })).sort((a, b) => b.currentMonthPoints - a.currentMonthPoints);

    res.json(formatted);

  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// 🔹 GET /leaderboard/shared-summary (Updated to include completed challenges)
router.get('/shared-summary', authMiddleware, async (req, res) => {
  try {
    const now = new Date();
    const currentMonth = getMonthString(now);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const userId = req.user.id;

    const sharedChallenges = await Challenge.find({
      'participants.user': userId,
      $expr: { $gte: [{ $size: "$participants" }, 2] },
      status: { $in: ['Active', 'Completed'] }
    }).populate('participants.user');

    const pointsByUser = {};

    sharedChallenges.forEach(challenge => {
      const isCurrentMonth = new Date(challenge.startDate) >= startOfMonth;
      const isPreviousMonth = new Date(challenge.startDate) < startOfMonth && 
                            new Date(challenge.startDate) >= new Date(now.getFullYear(), now.getMonth() - 1, 1);

      challenge.participants.forEach(participant => {
        const uid = participant.user._id.toString();
        
        if (!pointsByUser[uid]) {
          pointsByUser[uid] = {
            user: participant.user,
            currentMonthPoints: 0,
            previousMonthPoints: 0
          };
        }

        const points = participant.pointsEarned || 0;
        
        if (isCurrentMonth) {
          pointsByUser[uid].currentMonthPoints += points;
        } else if (isPreviousMonth) {
          pointsByUser[uid].previousMonthPoints += points;
        }
      });
    });

    const currentMonthLeaderboard = Object.values(pointsByUser)
      .map(data => ({
        _id: data.user._id,
        name: data.user.name,
        totalWins: data.user.totalWins || 0,
        points: data.currentMonthPoints + data.previousMonthPoints,
        currentMonthPoints: data.currentMonthPoints,
        previousMonthPoints: data.previousMonthPoints
      }))
      .sort((a, b) => b.currentMonthPoints - a.currentMonthPoints);

    res.json({ currentMonth, currentMonthLeaderboard });

  } catch (err) {
    console.error('🔥 /leaderboard/shared-summary error:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// Existing win-history route
router.get('/win-history', async (req, res) => {
  try {
    const users = await User.find(
      { 'winHistory.0': { $exists: true } },
      'name profileColor totalWins winHistory'
    ).sort({ totalWins: -1 });

    res.json(users);
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

module.exports = router;