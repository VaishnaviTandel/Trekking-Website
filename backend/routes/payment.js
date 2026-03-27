const express = require("express");
const router = express.Router();
const upload = require("../uploads/upload");
const Payment = require("../models/Payment");
const Admin = require("../models/Admin");
const { extractBearerToken, verifyToken } = require("../utils/adminAuth");

const requireAdmin = async (req, res, next) => {
  try {
    const token = extractBearerToken(req.headers.authorization);
    const parsed = verifyToken(token);

    if (!parsed?.adminId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const admin = await Admin.findById(parsed.adminId);

    if (!admin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    return next();
  } catch (_error) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

router.post("/upload-qr", requireAdmin, upload.single("qr"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "QR image is required." });
  }

  let payment = await Payment.findOne();

  if (!payment) payment = new Payment();

  const normalized = String(req.file.path || req.file.filename)
    .replace(/\\/g, "/")
    .replace(/^uploads\//, "");

  payment.qrCode = normalized;
  await payment.save();

  res.json({ message: "QR uploaded", qrCode: payment.qrCode });
});

router.get("/qr", async (req, res) => {
  const payment = await Payment.findOne();
  res.json({ qrCode: payment?.qrCode || "" });
});

module.exports = router;
