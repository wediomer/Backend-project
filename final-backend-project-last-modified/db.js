const db = require('mongoose');

db.connect('mongodb://localhost:27017/Mydatabase');

module.exports = db;