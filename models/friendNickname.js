// models/FriendNickname.js
const mongoose = require('mongoose');

const friendNicknameSchema = new mongoose.Schema({
  setter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  target: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  nickname: { type: String, required: true }
});

module.exports = mongoose.model('FriendNickname', friendNicknameSchema);
