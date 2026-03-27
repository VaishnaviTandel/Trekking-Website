const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: true
    },
    age: {
      type: Number,
      min: 1
    },
    gender: {
      type: String,
      default: "Prefer not to say"
    }
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema({
  tripId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Trip",
    required: true
  },
  tripTitle: {
    type: String,
    trim: true
  },
  selectedBatchId: String,
  selectedBatch: {
    type: String,
    trim: true,
    default: "Standard Batch"
  },
  departureDate: Date,
  endDate: Date,
  participants: {
    type: Number,
    min: 1,
    required: true
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
  customerAge: {
    type: Number,
    min: 1
  },
  customerGender: {
    type: String,
    default: "Prefer not to say"
  },
  members: {
    type: [memberSchema],
    default: []
  },
  pricePerPerson: {
    type: Number,
    min: 0,
    required: true
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
  paymentScreenshot: String,
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
}, { timestamps: true });

module.exports = mongoose.model("Booking", bookingSchema);
