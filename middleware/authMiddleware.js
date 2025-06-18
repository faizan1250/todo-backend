// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // import your User model

const authMiddleware = async (req, res, next) => {
  const token = req.header('Authorization')?.split(" ")[1]; // Bearer <token>
  if (!token) return res.status(401).json({ msg: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    req.user = user; // now req.user is a full mongoose User document
    next();
  } catch (err) {
    console.error('Auth error:', err);
    res.status(401).json({ msg: 'Invalid token' });
  }
};

module.exports = authMiddleware;
