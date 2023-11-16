const { Types } = require('mongoose');
const db = require('../db');

const Schema = db.Schema;

const userSchema = new db.Schema({
  username: { type: String },
  email: { type: String },
  password: { type: String },
  avatar: { type: String },
  content: String,
  author: {
    type: Types.ObjectId,
    ref: 'User',
  },
  createdAt: { type: Date, default: Date.now }
});

const User = db.model('User', userSchema);
module.exports = User;
