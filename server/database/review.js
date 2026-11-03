const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  id: {type: Number, required: true, unique: true},
  user_id: Number,
  name: {type: String, required: true, maxlength: 160},
  dealership: {type: Number, required: true},
  review: {type: String, required: true, minlength: 5, maxlength: 3000},
  purchase: {type: Boolean, required: true},
  purchase_date: String, car_make: String, car_model: String, car_year: Number,
  sentiment: {type: String, enum: ['positive', 'neutral', 'negative']},
  created_at: {type: Date, default: Date.now},
});
module.exports = mongoose.model('reviews', schema);
