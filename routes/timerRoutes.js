const express = require('express');
const router = express.Router();

const User = require('../models/User');
const Session = require('../models/Session');

// Save focus session
router.post('/log', async (req, res) => {
  try {
    const { userId, duration } = req.body;
    if (!userId || !duration) return res.status(400).json({ msg: 'Missing data' });

    const session = new Session({ userId, duration });
    await session.save();

    res.json({ msg: 'Session saved' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// Add coins to user
router.post('/coins/add', async (req, res) => {
  try {
    const { userId, coins } = req.body;
    if (!userId || !coins) return res.status(400).json({ msg: 'Missing data' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    user.coins += coins;
    await user.save();

    res.json({ msg: 'Coins updated', coins: user.coins });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
