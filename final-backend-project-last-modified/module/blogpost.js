const db = require('../db');

const blogPostSchema = new db.Schema(
  {
    title: { type: String },
    content: { type: String },
    author: { type: db.Schema.Types.ObjectId, ref: 'User'},
    comments: [{ type: db.Schema.Types.ObjectId, ref: 'Comment' }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  }
);


const Blogpost = db.model('BlogPost', blogPostSchema);

module.exports = Blogpost;
