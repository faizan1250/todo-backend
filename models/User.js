

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  nickname: { type: String, default: null },

  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  nicknames: {
    type: Map,
    of: String,
    default: {}
  },
  profilePic: { type: String, default: '' },  // <-- added
  todoPoints: { type: Number, default: 0 },
  winHistory: [
  {
    month: { type: String }, // e.g., "2025-06"
    points: Number
  }
],
totalWins: { type: Number, default: 0 }

});

module.exports = mongoose.model('User', userSchema);
