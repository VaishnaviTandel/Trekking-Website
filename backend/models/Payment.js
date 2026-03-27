const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  qrCode: String
});

module.exports = mongoose.model("Payment", paymentSchema);