// controllers/leaderboardController.js
const mongoose = require('mongoose');
const Completion = require('../models/Completion');
const Todo       = require('../models/Todo');
const User       = require('../models/User');

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
