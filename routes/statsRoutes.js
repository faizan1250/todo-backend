// routes/statsRoutes.js
const express = require('express');
const router = express.Router();
const SessionLog = require('../models/SessionLog');
const mongoose = require('mongoose');

// 📊 Overview
// router.get('/overview', async (req, res) => {
//   const userId = req.query.userId;
//   const today = new Date(); today.setHours(0, 0, 0, 0);
//   const weekStart = new Date(today); weekStart.setDate(today.getDate() - today.getDay());
//   const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

//   const stats = await SessionLog.aggregate([
//     { $match: { user: new mongoose.Types.ObjectId(userId), isBreak: false } },
//     {
//       $group: {
//         _id: null,
//         today: {
//           $sum: {
//             $cond: [{ $gte: ['$startTime', today] }, '$duration', 0]
//           }
//         },
//         week: {
//           $sum: {
//             $cond: [{ $gte: ['$startTime', weekStart] }, '$duration', 0]
//           }
//         },
//         month: {
//           $sum: {
//             $cond: [{ $gte: ['$startTime', monthStart] }, '$duration', 0]
//           }
//         }
//       }
//     }
//   ]);

//   res.json({
//     today: Math.round((stats[0]?.today || 0) / 60),
//     week: Math.round((stats[0]?.week || 0) / 60),
//     month: Math.round((stats[0]?.month || 0) / 60),
//   });
// });
router.get('/overview', async (req, res) => {
  const { userId, challengeId } = req.query;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const weekStart = new Date(today); weekStart.setDate(today.getDate() - today.getDay());
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const matchStage = {
    user: new mongoose.Types.ObjectId(userId),
    isBreak: false,
    ...(challengeId && { challenge: new mongoose.Types.ObjectId(challengeId) })
  };

  const stats = await SessionLog.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        today: { $sum: { $cond: [{ $gte: ['$startTime', today] }, '$duration', 0] }},
        week: { $sum: { $cond: [{ $gte: ['$startTime', weekStart] }, '$duration', 0] }},
        month: { $sum: { $cond: [{ $gte: ['$startTime', monthStart] }, '$duration', 0] }},
      }
    }
  ]);

  res.json({
    today: Math.round((stats[0]?.today || 0) / 60),
    week: Math.round((stats[0]?.week || 0) / 60),
    month: Math.round((stats[0]?.month || 0) / 60),
  });
});


// 📈 Daily
// router.get('/daily', async (req, res) => {
//   const userId = req.query.userId;
//   const days = Number(req.query.days || 14);
//   const from = new Date(); from.setDate(from.getDate() - days);

//   const stats = await SessionLog.aggregate([
//     { $match: {
//         user: new mongoose.Types.ObjectId(userId),
//         isBreak: false,
//         startTime: { $gte: from }
//       }
//     },
//     {
//       $group: {
//         _id: { $dateToString: { format: '%Y-%m-%d', date: '$startTime' } },
//         totalDuration: { $sum: '$duration' },
//       }
//     },
//     { $sort: { '_id': 1 } },
//   ]);

//   res.json(stats.map(s => ({ date: s._id, minutes: Math.round(s.totalDuration / 60) })));
// });
router.get('/daily', async (req, res) => {
  const { userId, challengeId, days = 14 } = req.query;
  const from = new Date(); from.setDate(from.getDate() - Number(days));

  const matchStage = {
    user: new mongoose.Types.ObjectId(userId),
    isBreak: false,
    startTime: { $gte: from },
    ...(challengeId && { challenge: new mongoose.Types.ObjectId(challengeId) })
  };

  const stats = await SessionLog.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$startTime' } },
        totalDuration: { $sum: '$duration' },
      }
    },
    { $sort: { '_id': 1 } },
  ]);

  res.json(stats.map(s => ({ date: s._id, minutes: Math.round(s.totalDuration / 60) })));
});


// 🕒 Hourly
// router.get('/hourly', async (req, res) => {
//   const userId = req.query.userId;

//   const stats = await SessionLog.aggregate([
//     { $match: { user: new mongoose.Types.ObjectId(userId), isBreak: false } },
//     {
//       $group: {
//         _id: { hour: { $hour: '$startTime' } },
//         totalDuration: { $sum: '$duration' },
//       }
//     },
//     { $sort: { '_id.hour': 1 } }
//   ]);

//   res.json(stats.map(h => ({
//     hour: h._id.hour,
//     minutes: Math.round(h.totalDuration / 60)
//   })));
// });

router.get('/hourly', async (req, res) => {
  const { userId, challengeId } = req.query;

  const matchStage = {
    user: new mongoose.Types.ObjectId(userId),
    isBreak: false,
    ...(challengeId && { challenge: new mongoose.Types.ObjectId(challengeId) })
  };

  const stats = await SessionLog.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: { hour: { $hour: '$startTime' } },
        totalDuration: { $sum: '$duration' },
      }
    },
    { $sort: { '_id.hour': 1 } }
  ]);

  res.json(stats.map(h => ({
    hour: h._id.hour,
    minutes: Math.round(h.totalDuration / 60)
  })));
});

// 🌡️ Heatmap
// router.get('/heatmap', async (req, res) => {
//   const userId = req.query.userId;

//   const stats = await SessionLog.aggregate([
//     { $match: { user: new mongoose.Types.ObjectId(userId), isBreak: false } },
//     {
//       $group: {
//         _id: {
//           y: { $year: '$startTime' },
//           m: { $month: '$startTime' },
//           d: { $dayOfMonth: '$startTime' },
//           weekday: { $dayOfWeek: '$startTime' }
//         },
//         total: { $sum: '$duration' }
//       }
//     }
//   ]);

//   res.json(stats);
// });
router.get('/heatmap', async (req, res) => {
  const { userId, challengeId } = req.query;

  const matchStage = {
    user: new mongoose.Types.ObjectId(userId),
    isBreak: false,
    ...(challengeId && { challenge: new mongoose.Types.ObjectId(challengeId) })
  };

  const stats = await SessionLog.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          y: { $year: '$startTime' },
          m: { $month: '$startTime' },
          d: { $dayOfMonth: '$startTime' },
          weekday: { $dayOfWeek: '$startTime' }
        },
        total: { $sum: '$duration' }
      }
    }
  ]);

  res.json(stats);
});


// ⚖️ Focus/Break Ratio
// router.get('/focus-break', async (req, res) => {
//   const userId = req.query.userId;
//   const month = Number(req.query.month);
//   const year = Number(req.query.year);

//   const from = new Date(year, month - 1, 1);
//   const to = new Date(year, month, 1);

//   const stats = await SessionLog.aggregate([
//     {
//       $match: {
//         user: new mongoose.Types.ObjectId(userId),
//         startTime: { $gte: from, $lt: to }
//       }
//     },
//     {
//       $group: {
//         _id: '$isBreak',
//         total: { $sum: '$duration' }
//       }
//     }
//   ]);

//   const focus = stats.find(s => !s._id)?.total || 0;
//   const breaks = stats.find(s => s._id)?.total || 0;
//   const total = focus + breaks;

//   res.json({
//     focusMinutes: Math.round(focus / 60),
//     breakMinutes: Math.round(breaks / 60),
//     focusPercent: total ? Math.round((focus / total) * 100) : 0,
//     breakPercent: total ? Math.round((breaks / total) * 100) : 0
//   });
// });
router.get('/focus-break', async (req, res) => {
  const { userId, challengeId, month, year } = req.query;

  const from = new Date(year, month - 1, 1);
  const to = new Date(year, month, 1);

  const matchStage = {
    user: new mongoose.Types.ObjectId(userId),
    startTime: { $gte: from, $lt: to },
    ...(challengeId && { challenge: new mongoose.Types.ObjectId(challengeId) })
  };

  const stats = await SessionLog.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$isBreak',
        total: { $sum: '$duration' }
      }
    }
  ]);

  const focus = stats.find(s => !s._id)?.total || 0;
  const breaks = stats.find(s => s._id)?.total || 0;
  const total = focus + breaks;

  res.json({
    focusMinutes: Math.round(focus / 60),
    breakMinutes: Math.round(breaks / 60),
    focusPercent: total ? Math.round((focus / total) * 100) : 0,
    breakPercent: total ? Math.round((breaks / total) * 100) : 0
  });
});


module.exports = router;
