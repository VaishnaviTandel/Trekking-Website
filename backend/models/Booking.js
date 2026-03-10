const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true
    },
    tripTitle: {
      type: String,
      required: true
    },
    tripPrice: {
      type: Number,
      required: true
    },
    departureDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    departureDateKey: {
      type: String,
      required: true
    },
    departureId: {
      type: String,
      required: true
    },
    durationDays: {
      type: Number,
      required: true,
      min: 1,
      default: 1
    },
    selectedBatch: {
      type: String,
      required: true,
      trim: true
    },
    participants: {
      type: Number,
      required: true,
      min: 1,
      default: 1
    },
    customerName: {
      type: String,
      required: true,
      trim: true
    },
    customerEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    customerPhone: {
      type: String,
      trim: true
    },
    notes: {
      type: String,
      trim: true
    },
    totalAmount: {
      type: Number,
      required: true
    },
    subtotalAmount: {
      type: Number,
      required: true
    },
    gstRate: {
      type: Number,
      required: true,
      default: 0.05
    },
    gstAmount: {
      type: Number,
      required: true,
      default: 0
    },
    paymentMethod: {
      type: String,
      enum: ["upi", "card", "netbanking", "cash"],
      default: "cash"
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending"
    },
    paymentReference: {
      type: String,
      trim: true
    },
    invoiceNumber: {
      type: String,
      required: true,
      unique: true
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending"
    },
    adminNote: {
      type: String,
      trim: true
    },
    confirmedAt: Date,
    cancelledAt: Date
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Booking", bookingSchema);
