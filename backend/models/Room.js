const mongoose = require("mongoose");

const roomTypeSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
      trim: true
    },
    shareType: {
      type: String,
      enum: ["single", "double", "triple", "quad", "dorm", "custom"],
      default: "custom"
    },
    acType: {
      type: String,
      enum: ["ac", "non_ac"],
      default: "ac"
    },
    occupancy: {
      type: Number,
      required: true,
      min: 1
    },
    totalRooms: {
      type: Number,
      required: true,
      min: 0
    },
    pricePerNight: {
      type: Number,
      required: true,
      min: 0
    },
    description: {
      type: String,
      trim: true,
      default: ""
    },
    images: {
      type: [String],
      default: []
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { _id: true }
);

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    location: {
      type: String,
      required: true,
      trim: true
    },
    address: {
      type: String,
      trim: true,
      default: ""
    },
    description: {
      type: String,
      trim: true,
      default: ""
    },
    coverImage: {
      type: String,
      default: ""
    },
    gallery: {
      type: [String],
      default: []
    },
    amenities: {
      type: [String],
      default: []
    },
    nearbyLandmarks: {
      type: [String],
      default: []
    },
    checkInTime: {
      type: String,
      trim: true,
      default: "12:00"
    },
    checkOutTime: {
      type: String,
      trim: true,
      default: "10:00"
    },
    roomTypes: {
      type: [roomTypeSchema],
      default: []
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Room", roomSchema);
