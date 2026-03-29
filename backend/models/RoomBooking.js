const mongoose = require("mongoose");

const roomBookingSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true
    },
    roomName: {
      type: String,
      trim: true
    },
    roomLocation: {
      type: String,
      trim: true
    },
    roomTypeId: {
      type: String,
      required: true,
      trim: true
    },
    roomTypeLabel: {
      type: String,
      trim: true
    },
    shareType: {
      type: String,
      trim: true
    },
    acType: {
      type: String,
      trim: true
    },
    checkIn: {
      type: Date,
      required: true
    },
    checkOut: {
      type: Date,
      required: true
    },
    nights: {
      type: Number,
      min: 1,
      required: true
    },
    roomsCount: {
      type: Number,
      min: 1,
      required: true
    },
    guestsCount: {
      type: Number,
      min: 1,
      required: true
    },
    adultsCount: {
      type: Number,
      min: 0,
      default: 1
    },
    childrenAbove10Count: {
      type: Number,
      min: 0,
      default: 0
    },
    childrenBelow10Count: {
      type: Number,
      min: 0,
      default: 0
    },
    customerName: {
      type: String,
      trim: true,
      required: true
    },
    customerEmail: {
      type: String,
      trim: true,
      required: true
    },
    customerPhone: {
      type: String,
      trim: true,
      required: true
    },
    specialRequest: {
      type: String,
      trim: true,
      default: ""
    },
    pricePerNight: {
      type: Number,
      min: 0,
      required: true
    },
    baseAmount: {
      type: Number,
      min: 0,
      default: 0
    },
    concessionPercent: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    concessionAmount: {
      type: Number,
      min: 0,
      default: 0
    },
    totalAmount: {
      type: Number,
      min: 0,
      required: true
    },
    paymentMethod: {
      type: String,
      default: "upi_qr"
    },
    paymentReference: {
      type: String,
      trim: true
    },
    paymentScreenshot: {
      type: String,
      default: ""
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "rejected"],
      default: "pending"
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending"
    },
    invoiceNumber: {
      type: String,
      trim: true
    },
    confirmedAt: Date,
    cancelledAt: Date
  },
  { timestamps: true }
);

module.exports = mongoose.model("RoomBooking", roomBookingSchema);
