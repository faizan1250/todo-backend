// ./routes/userRoutes.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const streamifier = require('streamifier');

const { cloudinary } = require('../utils/cloudinary'); // Cloudinary config
const User = require('../models/User');
const FriendNickname = require('../models/friendNickname');
const authMiddleware = require('../middleware/authMiddleware');

// ----------------------- Multer Setup -----------------------
const storage = multer.memoryStorage(); // Store file in memory
const upload = multer({ storage });     // Middleware for single file upload

// --------------------- Set Friend Nickname ---------------------
// PUT /api/users/:id/nickname
router.put('/:id/nickname', authMiddleware, async (req, res) => {
  const { nickname } = req.body;
  const setterId = req.user.id;
  const targetId = req.params.id;

  try {
    const targetUser = await User.findById(targetId);
    if (!targetUser) return res.status(404).json({ msg: 'User not found' });

    await FriendNickname.findOneAndUpdate(
      { setter: setterId, target: targetId },
      { nickname },
      { upsert: true, new: true }
    );

    res.json({ msg: 'Friend nickname set successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------- Get Friend Nicknames ---------------------
// GET /api/users/friends/nicknames
router.get('/friends/nicknames', authMiddleware, async (req, res) => {
  try {
    const nicknames = await FriendNickname.find({ setter: req.user.id })
      .populate('target', 'name email profilePic');
    res.json(nicknames);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------- Search Users ---------------------
// GET /api/users/search?q=someName
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const q = req.query.q || '';
    const users = await User.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ],
    }).select('name email profilePic');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------- Upload Profile Picture ---------------------
// POST /api/users/upload-profile-pic
router.post(
  '/upload-profile-pic',
  authMiddleware,
  upload.single('profilePic'),
  async (req, res) => {
    console.log('Received upload-profile-pic request');
    console.log('Headers:', req.headers);
    console.log('File:', req.file);

    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      // Upload file buffer to Cloudinary using upload_stream
      const streamUpload = (fileBuffer) => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: 'timero/profiles',
              resource_type: 'image',
            },
            (error, result) => {
              if (result) resolve(result);
              else reject(error);
            }
          );
          streamifier.createReadStream(fileBuffer).pipe(stream);
        });
      };

      const result = await streamUpload(req.file.buffer);

      // Update user's profilePic in DB
      const updatedUser = await User.findByIdAndUpdate(
        req.user.id,
        { profilePic: result.secure_url },
        { new: true }
      ).select('-password'); // Exclude password from response

      res.status(200).json({
        message: 'Upload successful',
        user: updatedUser,
      });
    } catch (err) {
      console.error('Cloudinary Upload Error:', err);
      res.status(500).json({ message: 'Upload failed', error: err.message });
    }
  }
);

module.exports = router;
