const db = require('../db');

const commentSchema = new db.Schema({
  postId:{type: String},
  content: { type: String, required: true },
  author: { type: String},
  createdAt: { type: Date, default: Date.now },
});

module.exports = db.model('Comment', commentSchema);
