const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ msg: 'User already exists' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed });

    res.status(201).json({ msg: 'User created', userId: user._id });
  } catch (err) {
    console.log(err);
    
    res.status(500).json({ error: err.message });
  }
};





exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ msg: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
   res.status(200).json({ token, userId: user._id, user});
//   res.status(200).json({
//   token,
//   userId: user._id,
//   user: {
//     name: user.name,
//     email: user.email,
//     profilePicUrl: user.profilePic, // <-- Ensure it's included
//   },
// });
  
} catch (err) {
    res.status(500).json({ error: err.message });
  }
};
