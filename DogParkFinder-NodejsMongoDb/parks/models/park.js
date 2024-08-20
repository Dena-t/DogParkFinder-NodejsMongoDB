const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const parkSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  snippet: {
    type: String,
    required: true,
  },
  body: {
    type: String,
    required: true
  },
}, { timestamps: true });

const Park = mongoose.model('Park', parkSchema);
module.exports = Park;