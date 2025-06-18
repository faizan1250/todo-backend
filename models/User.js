// const mongoose = require('mongoose');

// const userSchema = new mongoose.Schema({
//   name: { type: String, required: true },
//   email: { type: String, required: true, unique: true },
//   password: { type: String, required: true },
//   nickname: { type: String, default: null }, // assigned by other users

//   // New fields for Friend System
//   friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
//   nicknames: {
//     type: Map,
//     of: String,
//     default: {}
//   }
// });

// module.exports = mongoose.model('User', userSchema);

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
  profilePic: { type: String, default: '' }  // <-- added
});

module.exports = mongoose.model('User', userSchema);
