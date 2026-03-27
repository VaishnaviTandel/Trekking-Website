const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true
    },
    username: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    companyName: {
      type: String,
      required: true,
      trim: true
    },
    supportEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    companyAddress: {
      type: String,
      required: true,
      trim: true
    },
    trendingDestinations: {
      type: [String],
      default: [
        "Monsoon Treks 2024",
        "Weekend Trips Mumbai & Pune",
        "Weekend Trips Delhi",
        "Himachal Tours",
        "Uttarakhand Tours",
        "Rajasthan Tours",
        "Kerala Tours",
        "Winter Treks"
      ]
    },
    supportTagline: {
      type: String,
      default: "We are available 24x7 Mon-Fri",
      trim: true
    },
    supportPhones: {
      type: [String],
      default: ["+919876543210"]
    },
    mainBackgroundImage: {
      type: String,
      default: ""
    },
    brandLogo: {
      type: String,
      default: ""
    },
    privacyPolicy: {
      type: String,
      default:
        "Your personal information is used only for booking, support, and service communication.",
      trim: true
    },
    termsAndConditions: {
      type: String,
      default:
        "Bookings are confirmed after payment verification. Cancellations and refunds depend on trek policy.",
      trim: true
    },
    footerCopyright: {
      type: String,
      default: "\u00A9 2026 trek-platform",
      trim: true
    },
    passwordSalt: {
      type: String,
      required: true
    },
    passwordHash: {
      type: String,
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Admin", adminSchema);
