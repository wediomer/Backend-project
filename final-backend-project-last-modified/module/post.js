const db = require('../db');

const postSchema = new db.Schema({
  title: { type: String },
  content: { type: String },
  author: { type: db.Schema.Types.ObjectId, ref: 'User'},
  comments: [{ type: db.Schema.Types.ObjectId, ref: 'Comment' }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  
});



const Post = db.model('Post', postSchema);

module.exports = Post;