const Todo = require('../models/Todo');
const NodeCache = require('node-cache');
const moment = require('moment');

const cache = new NodeCache({ stdTTL: 300 }); // 5-minute cache

// Get scoped date range
const getDateRange = (scope, year, month, week) => {
  const now = moment();
  switch (scope) {
    case 'monthly':
      return {
        start: moment({ year, month: month - 1 }).startOf('month').toDate(),
        end: moment({ year, month: month - 1 }).endOf('month').toDate()
      };
    case 'weekly':
      const startOfMonth = moment({ year, month: month - 1 }).startOf('month');
      const weekStart = startOfMonth.clone().add((week - 1) * 7, 'days');
      const weekEnd = weekStart.clone().add(6, 'days');
      return {
        start: weekStart.toDate(),
        end: weekEnd.endOf('day').toDate()
      };
    case 'all-time':
    default:
      return {
        start: moment({ year }).startOf('year').toDate(),
        end: now.toDate()
      };
  }
};

exports.getLeaderboard = async (req, res) => {
  try {
    const { scope = 'all-time', year, month, week, current } = req.query;
    const userId = req.user.id;

    const y = parseInt(year) || moment().year();
    const m = parseInt(month);
    const w = parseInt(week);

    const { start, end } = getDateRange(scope, y, m, w);
    const cacheKey = `leaderboard:${userId}:${scope}:${y}:${m || ''}:${w || ''}`;

    let leaderboard = cache.get(cacheKey);
    if (!leaderboard) {
      leaderboard = await Todo.aggregate([
        {
          $match: {
            participants: { $in: [req.user._id] }, // ✅ user is part of the todo
            $expr: { $gt: [{ $size: "$participants" }, 1] } // ✅ must be shared
          }
        },
        { $unwind: '$completions' },
        {
          $match: {
            'completions.completedAt': { $gte: start, $lt: end }
          }
        },
        {
          $group: {
            _id: '$completions.userId',
            totalPoints: { $sum: '$completions.pointsEarned' }
          }
        },
        { $sort: { totalPoints: -1 } },
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
            userId: '$_id',
            name: '$user.name',
            totalPoints: 1,
            _id: 0
          }
        }
      ]);

      cache.set(cacheKey, leaderboard);
    }

    const topUsers = leaderboard.slice(0, 10);

    let currentUser = null;
    const index = leaderboard.findIndex(u => u.userId.toString() === userId.toString());
    if (current === 'true' && index !== -1) {
      currentUser = {
        ...leaderboard[index],
        rank: index + 1
      };
    }
console.log({topUsers, currentUser});
console.log('✅ [HIT] /api/todos/leaderboard route called');

    return res.json({ topUsers, currentUser });
  } catch (err) {
    console.error('❌ Leaderboard error:', err);
    return res.status(500).json({ error: 'Failed to load leaderboard' });
  }
};
