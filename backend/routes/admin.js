const express = require("express");
const Admin = require("../models/Admin");
const upload = require("../uploads/upload");
const {
  createPasswordRecord,
  verifyPassword,
  signToken,
  verifyToken,
  extractBearerToken
} = require("../utils/adminAuth");

const router = express.Router();

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[0-9]{10,15}$/;

const normalizeUploadPath = (filePath = "") =>
  String(filePath).replace(/\\/g, "/").replace(/^uploads\//, "");

const parseStringList = (rawValue, limit = 10) => {
  if (!rawValue) {
    return [];
  }

  if (Array.isArray(rawValue)) {
    return rawValue.map((item) => String(item || "").trim()).filter(Boolean).slice(0, limit);
  }

  const text = String(rawValue).trim();

  if (!text) {
    return [];
  }

  try {
    const parsed = JSON.parse(text);

    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item || "").trim()).filter(Boolean).slice(0, limit);
    }
  } catch (_error) {
    // Ignore and fallback to line split
  }

  return text
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, limit);
};

const sanitizeAdmin = (admin) => ({
  id: String(admin._id),
  fullName: admin.fullName,
  username: admin.username,
  email: admin.email,
  phone: admin.phone,
  companyName: admin.companyName,
  supportEmail: admin.supportEmail,
  companyAddress: admin.companyAddress,
  trendingDestinations: Array.isArray(admin.trendingDestinations) ? admin.trendingDestinations : [],
  supportTagline: admin.supportTagline || "We are available 24x7 Mon-Fri",
  supportPhones: Array.isArray(admin.supportPhones) ? admin.supportPhones : [],
  mainBackgroundImage: admin.mainBackgroundImage || "",
  brandLogo: admin.brandLogo || "",
  privacyPolicy: admin.privacyPolicy || "",
  termsAndConditions: admin.termsAndConditions || "",
  footerCopyright: admin.footerCopyright || "\u00A9 2026 trek-platform",
  createdAt: admin.createdAt
});

const getAuthenticatedAdmin = async (req) => {
  const token = extractBearerToken(req.headers.authorization);
  const parsed = verifyToken(token);

  if (!parsed?.adminId) {
    return null;
  }

  const admin = await Admin.findById(parsed.adminId);
  return admin || null;
};

router.post("/register", async (req, res) => {
  try {
    const fullName = String(req.body.fullName || "").trim();
    const username = String(req.body.username || "").trim().toLowerCase();
    const email = String(req.body.email || "").trim().toLowerCase();
    const phone = String(req.body.phone || "").trim();
    const companyName = String(req.body.companyName || "").trim();
    const supportEmail = String(req.body.supportEmail || "").trim().toLowerCase();
    const companyAddress = String(req.body.companyAddress || "").trim();
    const password = String(req.body.password || "");

    if (
      !fullName ||
      !username ||
      !email ||
      !phone ||
      !companyName ||
      !supportEmail ||
      !companyAddress ||
      !password
    ) {
      return res.status(400).json({ message: "All fields are required." });
    }

    if (!emailPattern.test(email) || !emailPattern.test(supportEmail)) {
      return res.status(400).json({ message: "Please enter valid email address." });
    }

    if (!phonePattern.test(phone)) {
      return res.status(400).json({ message: "Please enter valid phone number." });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    const existing = await Admin.findOne({
      $or: [{ username }, { email }]
    });

    if (existing) {
      return res.status(409).json({ message: "Username or email already exists." });
    }

    const { salt, hash } = createPasswordRecord(password);

    const admin = await Admin.create({
      fullName,
      username,
      email,
      phone,
      companyName,
      supportEmail,
      companyAddress,
      passwordSalt: salt,
      passwordHash: hash
    });

    const token = signToken(admin._id.toString());

    return res.status(201).json({
      message: "Admin registered successfully.",
      token,
      admin: sanitizeAdmin(admin)
    });
  } catch (_error) {
    return res.status(500).json({ message: "Admin registration failed." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const username = String(req.body.username || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required." });
    }

    const admin = await Admin.findOne({ username });

    if (!admin) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const isValid = verifyPassword(password, admin.passwordSalt, admin.passwordHash);

    if (!isValid) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const token = signToken(admin._id.toString());

    return res.json({
      message: "Login successful.",
      token,
      admin: sanitizeAdmin(admin)
    });
  } catch (_error) {
    return res.status(500).json({ message: "Admin login failed." });
  }
});

router.get("/me", async (req, res) => {
  try {
    const admin = await getAuthenticatedAdmin(req);

    if (!admin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    return res.json({ admin: sanitizeAdmin(admin) });
  } catch (_error) {
    return res.status(500).json({ message: "Failed to load admin profile." });
  }
});

router.patch(
  "/profile",
  upload.fields([
    { name: "mainBackgroundImage", maxCount: 1 },
    { name: "brandLogo", maxCount: 1 }
  ]),
  async (req, res) => {
  try {
    const admin = await getAuthenticatedAdmin(req);

    if (!admin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const fullName = String(req.body.fullName || admin.fullName).trim();
    const phone = String(req.body.phone || admin.phone).trim();
    const companyName = String(req.body.companyName || admin.companyName).trim();
    const supportEmail = String(req.body.supportEmail || admin.supportEmail).trim().toLowerCase();
    const companyAddress = String(req.body.companyAddress || admin.companyAddress).trim();
    const supportTagline = String(req.body.supportTagline || admin.supportTagline || "")
      .trim()
      .slice(0, 120);
    const privacyPolicy = String(req.body.privacyPolicy || admin.privacyPolicy || "")
      .trim()
      .slice(0, 1200);
    const termsAndConditions = String(
      req.body.termsAndConditions || admin.termsAndConditions || ""
    )
      .trim()
      .slice(0, 1200);
    const footerCopyright = String(req.body.footerCopyright || admin.footerCopyright || "")
      .trim()
      .slice(0, 120);
    const trendingDestinations = parseStringList(
      req.body.trendingDestinations,
      12
    );
    const supportPhones = parseStringList(req.body.supportPhones, 10);

    if (!fullName || !phone || !companyName || !supportEmail || !companyAddress) {
      return res.status(400).json({ message: "All profile fields are required." });
    }

    if (!emailPattern.test(supportEmail)) {
      return res.status(400).json({ message: "Invalid support email." });
    }

    if (!phonePattern.test(phone.replace(/[^0-9]/g, ""))) {
      return res.status(400).json({ message: "Invalid phone number." });
    }

    admin.fullName = fullName;
    admin.phone = phone;
    admin.companyName = companyName;
    admin.supportEmail = supportEmail;
    admin.companyAddress = companyAddress;
    admin.supportTagline = supportTagline || admin.supportTagline;
    admin.privacyPolicy = privacyPolicy || admin.privacyPolicy;
    admin.termsAndConditions = termsAndConditions || admin.termsAndConditions;
    admin.footerCopyright = footerCopyright || "\u00A9 2026 trek-platform";

    if (trendingDestinations.length > 0) {
      admin.trendingDestinations = trendingDestinations;
    }

    if (supportPhones.length > 0) {
      admin.supportPhones = supportPhones;
    }

    const backgroundFile = req.files?.mainBackgroundImage?.[0];
    const logoFile = req.files?.brandLogo?.[0];

    if (backgroundFile) {
      admin.mainBackgroundImage = normalizeUploadPath(
        backgroundFile.path || backgroundFile.filename
      );
    }

    if (logoFile) {
      admin.brandLogo = normalizeUploadPath(logoFile.path || logoFile.filename);
    }

    await admin.save();

    return res.json({
      message: "Profile updated successfully.",
      admin: sanitizeAdmin(admin)
    });
  } catch (_error) {
    return res.status(500).json({ message: "Failed to update admin profile." });
  }
}
);

router.get("/public-profile", async (_req, res) => {
  try {
    const admin = await Admin.findOne().sort({ createdAt: -1 });

    if (!admin) {
      return res.json({
        companyName: "TrekPlatform",
        supportEmail: "support@trekplatform.com",
        phone: "+919876543210",
        companyAddress: "Pune, Maharashtra, India",
        trendingDestinations: [
          "Monsoon Treks 2024",
          "Weekend Trips Mumbai & Pune",
          "Weekend Trips Delhi",
          "Himachal Tours",
          "Uttarakhand Tours",
          "Rajasthan Tours",
          "Kerala Tours",
          "Winter Treks"
        ],
        supportTagline: "We are available 24x7 Mon-Fri",
        supportPhones: ["+919876543210"],
        mainBackgroundImage: "",
        brandLogo: "",
        privacyPolicy:
          "Your personal information is used only for booking, support, and service communication.",
        termsAndConditions:
          "Bookings are confirmed after payment verification. Cancellations and refunds depend on trek policy.",
        footerCopyright: "\u00A9 2026 trek-platform"
      });
    }

    return res.json({
      companyName: admin.companyName,
      supportEmail: admin.supportEmail,
      phone: admin.phone,
      companyAddress: admin.companyAddress,
      trendingDestinations: Array.isArray(admin.trendingDestinations)
        ? admin.trendingDestinations
        : [],
      supportTagline: admin.supportTagline || "We are available 24x7 Mon-Fri",
      supportPhones: Array.isArray(admin.supportPhones) ? admin.supportPhones : [],
      mainBackgroundImage: admin.mainBackgroundImage || "",
      brandLogo: admin.brandLogo || "",
      privacyPolicy: admin.privacyPolicy || "",
      termsAndConditions: admin.termsAndConditions || "",
      footerCopyright: admin.footerCopyright || "\u00A9 2026 trek-platform"
    });
  } catch (_error) {
    return res.status(500).json({ message: "Failed to load public profile." });
  }
});

module.exports = router;
