const mongoose = require("mongoose");

const departureSchema = new mongoose.Schema({
  date: Date,
  batchLabel: {
    type: String,
    default: "Standard Batch"
  },
  totalSeats: Number,
  bookedSeats: {
    type: Number,
    default: 0
  }
});

const tripSchema = new mongoose.Schema({
  title: String,
  location: String,
  duration: String,
  durationDays: {
    type: Number,
    default: 1
  },
  price: Number,
  difficulty: String,
  coverImage: String,
  gallery: [String],
  description: String,
  itinerary: String,

  departures: [departureSchema]
});

module.exports = mongoose.model("Trip", tripSchema);
