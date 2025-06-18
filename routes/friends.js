const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

// Add Friend
router.post('/add', authMiddleware, async (req, res) => {
  const { friendEmail } = req.body;
  const user = req.user;

  try {
    const friend = await User.findOne({ email: friendEmail });
    if (!friend) return res.status(404).json({ msg: 'User not found' });

    if (user.friends.includes(friend._id))
      return res.status(400).json({ msg: 'Already friends' });

    user.friends.push(friend._id);
    await user.save();
    res.json({ msg: 'Friend added' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// Remove Friend
router.post('/remove', authMiddleware, async (req, res) => {
  const { friendId } = req.body;
  const user = req.user;

  try {
    user.friends = user.friends.filter(id => id.toString() !== friendId);
    user.nicknames.delete(friendId);
    await user.save();
    res.json({ msg: 'Friend removed' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// List Friends
router.get('/list', authMiddleware, async (req, res) => {
  try {
    await req.user.populate('friends');
    const list = req.user.friends.map(friend => ({
      id: friend._id,
      name: friend.name,
      email: friend.email,
      profilePic: friend.profilePic || null,
      nickname: req.user.nicknames.get(friend._id.toString()) || null
     
    }));
    res.json(list);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// Set Nickname
router.post('/set-nickname', authMiddleware, async (req, res) => {
  const { friendId, nickname } = req.body;

  try {
    req.user.nicknames.set(friendId, nickname);
    await req.user.save();
    res.json({ msg: 'Nickname set' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
