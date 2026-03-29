const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");

const Booking = require("../models/Booking");
const Trip = require("../models/Trip");
const Contact = require("../models/Contact");
const Admin = require("../models/Admin");
const PDFDocument = require("pdfkit");
const sendEmail = require("../utils/emailService");
const upload = require("../uploads/upload");

const ALLOWED_STATUSES = new Set(["pending", "confirmed", "cancelled"]);
const ALLOWED_PAYMENT_STATUSES = new Set(["pending", "paid", "rejected"]);

const toDateKey = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const parseJsonValue = (value, fallback = null) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
};

const normalizeUploadPath = (filePath = "") =>
  String(filePath).replace(/\\/g, "/").replace(/^uploads\//, "");

const generateInvoiceNumber = () => {
  const timePart = Date.now().toString().slice(-8);
  const randomPart = Math.floor(Math.random() * 900 + 100);
  return `INV-${timePart}-${randomPart}`;
};

const parseMembers = (rawMembers) => {
  const parsed = parseJsonValue(rawMembers, []);

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .map((member) => ({
      name: String(member?.name || "").trim(),
      age: Number(member?.age) || undefined,
      gender: String(member?.gender || "Prefer not to say").trim()
    }))
    .filter((member) => member.name);
};

const computeEndDate = (startDate, durationDays) => {
  const start = new Date(startDate);

  if (Number.isNaN(start.getTime())) {
    return null;
  }

  const parsedDuration = Number(durationDays);
  const safeDuration = Number.isInteger(parsedDuration) && parsedDuration > 0 ? parsedDuration : 1;

  start.setUTCDate(start.getUTCDate() + safeDuration - 1);
  return start;
};

const findDeparture = (trip, selectedBatchId, departureDateKey) => {
  if (!trip?.departures?.length) {
    return null;
  }

  if (selectedBatchId) {
    const byId =
      trip.departures.find(
        (departure) => String(departure?._id || "") === String(selectedBatchId)
      ) || null;

    if (byId) {
      return byId;
    }
  }

  if (departureDateKey) {
    return (
      trip.departures.find((departure) => toDateKey(departure.date) === departureDateKey) || null
    );
  }

  return null;
};

const formatDate = (value) => {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};

const formatPrice = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(value) || 0);

const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const mapBooking = (booking) => {
  const source = typeof booking.toObject === "function" ? booking.toObject() : booking;

  return {
    ...source,
    customerName: source.customerName || source.name || "N/A",
    customerEmail: source.customerEmail || source.email || "N/A",
    customerPhone: source.customerPhone || source.phone || "N/A",
    selectedBatch: source.selectedBatch || source.batch || "Standard Batch",
    departureDate: source.departureDate || source.date || null,
    tripTitle: source.tripTitle || source.tripId?.title || "",
    paymentStatus: source.paymentStatus || (source.paymentReference ? "paid" : "pending"),
    paymentMethod: source.paymentMethod || "upi_qr",
    members: Array.isArray(source.members) ? source.members : []
  };
};

const getBrandingProfile = async () => {
  const admin = await Admin.findOne().sort({ createdAt: -1 });

  return {
    companyName: admin?.companyName || "TrekPlatform",
    supportEmail: admin?.supportEmail || "support@trekplatform.com",
    supportPhone: admin?.phone || "+919876543210",
    companyAddress: admin?.companyAddress || "India",
    brandLogo: admin?.brandLogo || ""
  };
};

const getLogoPublicUrl = (brandLogo = "") => {
  const safeLogo = String(brandLogo || "").trim();

  if (!safeLogo) {
    return "";
  }

  if (/^https?:\/\//i.test(safeLogo)) {
    return safeLogo;
  }

  const base = String(
    process.env.PUBLIC_BASE_URL || process.env.API_BASE_URL || "https://southfriends.onrender.com"
  ).replace(/\/$/, "");

  return `${base}/uploads/${safeLogo}`;
};

const getLogoLocalPath = (brandLogo = "") => {
  const safeLogo = String(brandLogo || "").trim();

  if (!safeLogo || /^https?:\/\//i.test(safeLogo)) {
    return "";
  }

  const localPath = path.join(__dirname, "..", "uploads", safeLogo.replace(/^\/+/, ""));
  return fs.existsSync(localPath) ? localPath : "";
};

const buildInvoiceHtml = (booking, branding = {}) => {
  const logoUrl = getLogoPublicUrl(branding.brandLogo);
  const companyName = branding.companyName || "TrekPlatform";
  const supportEmail = branding.supportEmail || "support@trekplatform.com";
  const supportPhone = branding.supportPhone || "+919876543210";
  const companyAddress = branding.companyAddress || "India";
  const members = Array.isArray(booking.members) ? booking.members : [];
  const attendees = [
    {
      name: booking.customerName || "N/A",
      age: booking.customerAge || "-",
      gender: booking.customerGender || "Prefer not to say",
      role: "Lead"
    },
    ...members.map((member) => ({
      name: member?.name || "N/A",
      age: member?.age || "-",
      gender: member?.gender || "Prefer not to say",
      role: "Member"
    }))
  ];
  const membersRows =
    attendees.length > 0
      ? attendees
          .map(
            (member, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(member.name)}</td>
        <td>${escapeHtml(member.age || "-")}</td>
        <td>${escapeHtml(member.gender || "-")}</td>
        <td>${escapeHtml(member.role || "-")}</td>
      </tr>`
          )
          .join("")
      : `
      <tr>
        <td colspan="5">No attendees</td>
      </tr>`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Invoice ${escapeHtml(booking.invoiceNumber)}</title>
    <style>
      body { font-family: Arial, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 24px; }
      .card { max-width: 960px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; }
      .header { display: flex; justify-content: space-between; align-items: center; gap: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 16px; }
      .brand { display: flex; align-items: center; gap: 12px; }
      .logo { width: 52px; height: 52px; border-radius: 8px; object-fit: cover; border: 1px solid #e2e8f0; background: #fff; }
      .brand-meta h1 { margin: 0; font-size: 20px; }
      .brand-meta p { margin: 4px 0 0; font-size: 12px; color: #64748b; }
      .tag { display: inline-block; padding: 6px 12px; border-radius: 999px; background: #dcfce7; color: #166534; font-size: 12px; font-weight: bold; }
      table { width: 100%; border-collapse: collapse; margin-top: 14px; }
      td, th { border: 1px solid #e2e8f0; padding: 8px; text-align: left; font-size: 14px; }
      th { background: #f1f5f9; }
      .meta { margin-top: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px 20px; }
      .meta p { margin: 0; font-size: 14px; }
      .section-title { margin-top: 20px; margin-bottom: 8px; font-size: 16px; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="header">
        <div class="brand">
          ${
            logoUrl
              ? `<img src="${escapeHtml(logoUrl)}" alt="Logo" class="logo" />`
              : ""
          }
          <div class="brand-meta">
            <h1>${escapeHtml(companyName)} - Booking Invoice</h1>
            <p>${escapeHtml(supportEmail)} | ${escapeHtml(supportPhone)}</p>
          </div>
        </div>
        <div>
          <span class="tag">${escapeHtml(booking.status || "pending").toUpperCase()}</span>
          <p style="margin:8px 0 0;font-size:12px;color:#64748b;">${escapeHtml(companyAddress)}</p>
        </div>
      </div>

      <div class="meta">
        <p><strong>Invoice No:</strong> ${escapeHtml(booking.invoiceNumber)}</p>
        <p><strong>Date:</strong> ${escapeHtml(formatDate(booking.createdAt))}</p>
        <p><strong>Customer:</strong> ${escapeHtml(booking.customerName)}</p>
        <p><strong>Email:</strong> ${escapeHtml(booking.customerEmail)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(booking.customerPhone)}</p>
        <p><strong>Trip:</strong> ${escapeHtml(booking.tripTitle || booking.tripId?.title || "N/A")}</p>
        <p><strong>Batch:</strong> ${escapeHtml(booking.selectedBatch || "Standard Batch")}</p>
        <p><strong>Dates:</strong> ${escapeHtml(formatDate(booking.departureDate))} to ${escapeHtml(
    formatDate(booking.endDate)
  )}</p>
      </div>

      <table>
        <thead>
          <tr>
            <th>People</th>
            <th>Price per Person</th>
            <th>Total</th>
            <th>Payment Ref</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${escapeHtml(booking.participants)}</td>
            <td>${escapeHtml(formatPrice(booking.pricePerPerson))}</td>
            <td>${escapeHtml(formatPrice(booking.totalAmount))}</td>
            <td>${escapeHtml(booking.paymentReference || "-")}</td>
          </tr>
        </tbody>
      </table>

      <h3 class="section-title">Attendees (Lead + Members)</h3>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>Age</th>
            <th>Gender</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>${membersRows}</tbody>
      </table>

      <p style="margin-top:20px;font-size:13px;color:#475569;">
        This invoice is auto-generated after admin confirmation.
      </p>
    </div>
  </body>
</html>`;
};

const buildInvoicePdfBuffer = (booking, branding = {}) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const members = Array.isArray(booking.members) ? booking.members : [];
    const logoPath = getLogoLocalPath(branding.brandLogo);
    const attendees = [
      {
        name: booking.customerName || "N/A",
        age: booking.customerAge || "-",
        gender: booking.customerGender || "Prefer not to say",
        role: "Lead"
      },
      ...members.map((member) => ({
        name: member?.name || "N/A",
        age: member?.age || "-",
        gender: member?.gender || "Prefer not to say",
        role: "Member"
      }))
    ];

    const companyName = branding.companyName || "TrekPlatform";
    const supportEmail = branding.supportEmail || "support@trekplatform.com";
    const supportPhone = branding.supportPhone || "+919876543210";
    const companyAddress = branding.companyAddress || "India";

    doc
      .rect(40, 40, doc.page.width - 80, 84)
      .fillAndStroke("#f8fafc", "#e2e8f0");

    if (logoPath) {
      doc.image(logoPath, 50, 56, { fit: [48, 48], align: "center", valign: "center" });
    }

    doc.fillColor("#0f172a").fontSize(17).text(`${companyName} - Booking Invoice`, 110, 56);
    doc.fontSize(10).fillColor("#475569").text(`${supportEmail} | ${supportPhone}`, 110, 80);
    doc.text(companyAddress, 110, 94, { width: 280 });

    doc
      .fontSize(10)
      .fillColor("#334155")
      .text(`Invoice: ${booking.invoiceNumber || "N/A"}`, 400, 60, { align: "right" });
    doc
      .text(`Status: ${String(booking.status || "pending").toUpperCase()}`, 400, 76, {
        align: "right"
      });
    doc.text(`Date: ${formatDate(booking.createdAt)}`, 400, 92, { align: "right" });

    let y = 146;
    const label = (text, value, x, top, width = 250) => {
      doc.fontSize(10).fillColor("#64748b").text(text, x, top, { width });
      doc.fontSize(11).fillColor("#0f172a").text(value || "-", x, top + 14, { width });
    };

    label("Customer", booking.customerName || "N/A", 40, y);
    label("Email", booking.customerEmail || "N/A", 300, y, 240);
    y += 36;
    label("Phone", booking.customerPhone || "N/A", 40, y);
    label("Trip", booking.tripTitle || booking.tripId?.title || "N/A", 300, y, 240);
    y += 36;
    label("Batch", booking.selectedBatch || "Standard Batch", 40, y);
    label(
      "Dates",
      `${formatDate(booking.departureDate)} to ${formatDate(booking.endDate)}`,
      300,
      y,
      240
    );
    y += 42;

    doc.fontSize(13).fillColor("#0f172a").text("Charges", 40, y);
    y += 22;
    doc.rect(40, y, 515, 24).fill("#e2e8f0");
    doc.fillColor("#0f172a").fontSize(10);
    doc.text("Participants", 48, y + 7, { width: 95 });
    doc.text("Price / Person", 170, y + 7, { width: 110 });
    doc.text("Total", 320, y + 7, { width: 110 });
    doc.text("Payment Ref", 420, y + 7, { width: 125 });

    y += 24;
    doc.rect(40, y, 515, 26).stroke("#e2e8f0");
    doc.fillColor("#0f172a").fontSize(10);
    doc.text(String(booking.participants || 0), 48, y + 8, { width: 95 });
    doc.text(formatPrice(booking.pricePerPerson), 170, y + 8, { width: 110 });
    doc.text(formatPrice(booking.totalAmount), 320, y + 8, { width: 110 });
    doc.text(booking.paymentReference || "-", 420, y + 8, { width: 125 });

    y += 44;
    doc.fontSize(13).fillColor("#0f172a").text("Attendees (Lead + Members)", 40, y);
    y += 20;

    doc.rect(40, y, 515, 24).fill("#e2e8f0");
    doc.fillColor("#0f172a").fontSize(10);
    doc.text("#", 48, y + 7, { width: 30 });
    doc.text("Name", 82, y + 7, { width: 170 });
    doc.text("Age", 260, y + 7, { width: 60 });
    doc.text("Gender", 325, y + 7, { width: 90 });
    doc.text("Role", 425, y + 7, { width: 120 });
    y += 24;

    attendees.forEach((attendee, index) => {
      if (y > 760) {
        doc.addPage();
        y = 50;
      }

      doc.rect(40, y, 515, 22).stroke("#e2e8f0");
      doc.fillColor("#0f172a").fontSize(10);
      doc.text(String(index + 1), 48, y + 6, { width: 30 });
      doc.text(attendee.name || "-", 82, y + 6, { width: 170 });
      doc.text(String(attendee.age || "-"), 260, y + 6, { width: 60 });
      doc.text(attendee.gender || "-", 325, y + 6, { width: 90 });
      doc.text(attendee.role || "-", 425, y + 6, { width: 120 });
      y += 22;
    });

    doc
      .fontSize(10)
      .fillColor("#64748b")
      .text("This invoice is auto-generated after admin confirmation.", 40, 804, {
        width: 515,
        align: "center"
      });

    doc.end();
  });

const sendConfirmationEmail = async (booking) => {
  if (!booking.customerEmail) {
    return;
  }

  const subject = `Booking Confirmed - ${booking.invoiceNumber}`;
  const text = [
    `Hi ${booking.customerName},`,
    "",
    "Your trek booking is confirmed.",
    `Trip: ${booking.tripTitle}`,
    `Dates: ${formatDate(booking.departureDate)} to ${formatDate(booking.endDate)}`,
    `Participants: ${booking.participants}`,
    `Invoice Number: ${booking.invoiceNumber}`,
    `Total Amount: ${formatPrice(booking.totalAmount)}`,
    "",
    "Thank you for booking with us."
  ].join("\n");

  const branding = await getBrandingProfile();
  const html = buildInvoiceHtml(booking, branding);
  const attachments = [];

  try {
    const pdfBuffer = await buildInvoicePdfBuffer(booking, branding);
    attachments.push({
      filename: `${booking.invoiceNumber || "invoice"}.pdf`,
      content: pdfBuffer,
      contentType: "application/pdf"
    });
  } catch (pdfError) {
    console.log("Invoice PDF generation failed:", pdfError.message);
  }

  await sendEmail(booking.customerEmail, subject, {
    text,
    html,
    attachments
  });

  try {
    await sendAdminNotificationEmail(`Booking Confirmed - ${booking.tripTitle}`, [
      "A trek booking has been confirmed.",
      "",
      `Customer: ${booking.customerName} <${booking.customerEmail}>`,
      `Trip: ${booking.tripTitle}`,
      `Departure: ${formatDate(booking.departureDate)}`,
      `Participants: ${booking.participants}`,
      `Amount: ${formatPrice(booking.totalAmount)}`,
      `Invoice Number: ${booking.invoiceNumber || "-"}`,
      "",
      `Admin panel: ${process.env.CLIENT_URL || "http://localhost:3000"}/admin`
    ].join("\n"));
  } catch (emailError) {
    console.log("Admin booking confirmation notification failed:", emailError.message);
  }
};

const sendAdminNotificationEmail = async (subject, text) => {
  const admin = await Admin.findOne().sort({ createdAt: -1 });
  const recipient = admin?.supportEmail || admin?.email || process.env.EMAIL_USER;

  if (!recipient) {
    return;
  }

  await sendEmail(recipient, subject, text);
};

const sendBookingReceivedEmail = async (booking) => {
  if (!booking.customerEmail) {
    return;
  }

  const subject = `Booking Received - ${booking.tripTitle}`;
  const text = [
    `Hi ${booking.customerName},`,
    "",
    "We received your booking request.",
    `Trip: ${booking.tripTitle}`,
    `Departure: ${formatDate(booking.departureDate)}`,
    `Participants: ${booking.participants}`,
    `Amount: ${formatPrice(booking.totalAmount)}`,
    `Payment Reference: ${booking.paymentReference || "-"}`,
    "",
    "Your booking is currently pending admin verification.",
    "You will receive another email once it is confirmed."
  ].join("\n");

  await sendEmail(booking.customerEmail, subject, text);

  try {
    await sendAdminNotificationEmail(`New Booking Received - ${booking.tripTitle}`, [
      "A new trek booking has been received.",
      "",
      `Customer: ${booking.customerName} <${booking.customerEmail}>`,
      `Phone: ${booking.customerPhone}`,
      `Trip: ${booking.tripTitle}`,
      `Departure: ${formatDate(booking.departureDate)}`,
      `Participants: ${booking.participants}`,
      `Amount: ${formatPrice(booking.totalAmount)}`,
      `Payment Reference: ${booking.paymentReference || "-"}`,
      `Status: ${booking.status || "pending"}`,
      "",
      `Admin panel: ${process.env.CLIENT_URL || "http://localhost:3000"}/admin`
    ].join("\n"));
  } catch (emailError) {
    console.log("Admin booking received notification failed:", emailError.message);
  }
};

const sendBookingCancelledEmail = async (booking) => {
  if (!booking.customerEmail) {
    return;
  }

  const subject = `Booking Cancelled - ${booking.tripTitle}`;
  const text = [
    `Hi ${booking.customerName},`,
    "",
    "Your trek booking has been cancelled.",
    `Trip: ${booking.tripTitle}`,
    `Departure: ${formatDate(booking.departureDate)}`,
    `Participants: ${booking.participants}`,
    `Amount: ${formatPrice(booking.totalAmount)}`,
    `Invoice Number: ${booking.invoiceNumber || "-"}`,
    "",
    "If you have questions, please contact us."
  ].join("\n");

  await sendEmail(booking.customerEmail, subject, text);

  try {
    await sendAdminNotificationEmail(`Booking Cancelled - ${booking.tripTitle}`, [
      "A trek booking has been cancelled.",
      "",
      `Customer: ${booking.customerName} <${booking.customerEmail}>`,
      `Trip: ${booking.tripTitle}`,
      `Departure: ${formatDate(booking.departureDate)}`,
      `Participants: ${booking.participants}`,
      `Amount: ${formatPrice(booking.totalAmount)}`,
      `Invoice Number: ${booking.invoiceNumber || "-"}`,
      "",
      `Admin panel: ${process.env.CLIENT_URL || "http://localhost:3000"}/admin`
    ].join("\n"));
  } catch (emailError) {
    console.log("Admin booking cancellation notification failed:", emailError.message);
  }
};

const createBookingHandler = async (req, res) => {
  try {
    const tripId = req.body.tripId;
    const selectedBatchId = req.body.selectedBatchId || req.body.batch || "";
    const departureDateKey = req.body.departureDate || req.body.date || "";
    const participants = Math.max(1, Number(req.body.participants || req.body.participantsCount || 1));

    const customerName = String(req.body.customerName || req.body.name || "").trim();
    const customerEmail = String(req.body.customerEmail || req.body.email || "").trim();
    const customerPhone = String(req.body.customerPhone || req.body.phone || "").trim();
    const customerAge = Number(req.body.customerAge || req.body.age) || undefined;
    const customerGender = String(req.body.customerGender || req.body.gender || "Prefer not to say");

    const paymentReference = String(req.body.paymentReference || req.body.paymentId || "").trim();
    const members = parseMembers(req.body.members);

    if (!tripId) {
      return res.status(400).json({ message: "Trip is required." });
    }

    if (!customerName || !customerEmail || !customerPhone) {
      return res.status(400).json({ message: "Customer name, email and phone are required." });
    }

    if (!paymentReference) {
      return res.status(400).json({ message: "Payment reference number is required." });
    }

    const trip = await Trip.findById(tripId);

    if (!trip) {
      return res.status(404).json({ message: "Trip not found." });
    }

    const departure = findDeparture(trip, selectedBatchId, departureDateKey);

    if (!departure) {
      return res.status(400).json({ message: "Selected departure is invalid." });
    }

    const seatsLeft = Number(departure.totalSeats || 0) - Number(departure.bookedSeats || 0);

    if (participants > seatsLeft) {
      return res.status(400).json({
        message: `Only ${Math.max(0, seatsLeft)} seat(s) left for this departure.`
      });
    }

    const pricePerPerson = Number(trip.price) || 0;
    const totalAmount = pricePerPerson * participants;
    const endDate = computeEndDate(departure.date, trip.durationDays);

    const booking = new Booking({
      tripId: trip._id,
      tripTitle: trip.title,
      selectedBatchId: String(departure._id),
      selectedBatch: departure.batchLabel || "Standard Batch",
      departureDate: departure.date,
      endDate,
      participants,
      customerName,
      customerEmail,
      customerPhone,
      customerAge,
      customerGender,
      members,
      pricePerPerson,
      totalAmount,
      paymentMethod: "upi_qr",
      paymentReference,
      paymentScreenshot: req.file ? normalizeUploadPath(req.file.path) : "",
      paymentStatus: "pending",
      status: "pending",
      invoiceNumber: generateInvoiceNumber()
    });

    departure.bookedSeats = Number(departure.bookedSeats || 0) + participants;
    await trip.save();

    try {
      await booking.save();
    } catch (saveError) {
      departure.bookedSeats = Math.max(0, Number(departure.bookedSeats || 0) - participants);
      await trip.save();
      throw saveError;
    }

    try {
      await sendBookingReceivedEmail(booking);
    } catch (emailError) {
      console.log("Booking received email failed:", emailError.message);
    }

    return res.status(201).json({
      message: "Booking submitted. Waiting for admin confirmation.",
      booking: mapBooking(booking)
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Booking failed." });
  }
};

router.post("/", upload.single("screenshot"), createBookingHandler);
router.post("/create", upload.single("screenshot"), createBookingHandler);

router.get("/summary", async (_req, res) => {
  try {
    const [
      totalTrips,
      totalMessages,
      totalBookings,
      pendingBookings,
      confirmedBookings,
      cancelledBookings,
      revenue
    ] = await Promise.all([
      Trip.countDocuments(),
      Contact.countDocuments(),
      Booking.countDocuments(),
      Booking.countDocuments({ status: "pending" }),
      Booking.countDocuments({ status: "confirmed" }),
      Booking.countDocuments({ status: "cancelled" }),
      Booking.aggregate([
        { $match: { status: "confirmed" } },
        { $group: { _id: null, totalRevenue: { $sum: "$totalAmount" } } }
      ])
    ]);

    return res.json({
      totalTrips,
      totalMessages,
      totalBookings,
      pendingBookings,
      confirmedBookings,
      cancelledBookings,
      totalRevenue: revenue[0]?.totalRevenue || 0
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load dashboard summary." });
  }
});

router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const status = String(req.query.status || "all").toLowerCase();
    const q = String(req.query.q || "").trim();

    const query = {};

    if (status !== "all" && ALLOWED_STATUSES.has(status)) {
      query.status = status;
    }

    if (q) {
      const regex = new RegExp(q, "i");
      query.$or = [
        { customerName: regex },
        { customerEmail: regex },
        { customerPhone: regex },
        { tripTitle: regex },
        { selectedBatch: regex },
        { invoiceNumber: regex },
        { paymentReference: regex }
      ];
    }

    const [total, items] = await Promise.all([
      Booking.countDocuments(query),
      Booking.find(query)
        .populate("tripId", "title coverImage")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
    ]);

    return res.json({
      items: items.map(mapBooking),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit))
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load bookings." });
  }
});

router.patch("/:id/status", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    const nextStatus = req.body.status ? String(req.body.status).toLowerCase() : booking.status;
    const nextPaymentStatus = req.body.paymentStatus
      ? String(req.body.paymentStatus).toLowerCase()
      : booking.paymentStatus;

    if (req.body.status && !ALLOWED_STATUSES.has(nextStatus)) {
      return res.status(400).json({ message: "Invalid booking status." });
    }

    if (req.body.paymentStatus && !ALLOWED_PAYMENT_STATUSES.has(nextPaymentStatus)) {
      return res.status(400).json({ message: "Invalid payment status." });
    }

    if (nextStatus === "confirmed" && nextPaymentStatus !== "paid") {
      return res.status(400).json({
        message: "Mark payment as paid before confirming this booking."
      });
    }

    const previousStatus = booking.status;
    let trip = null;
    let departure = null;

    const statusChanged = previousStatus !== nextStatus;
    const previousHoldsSeat = previousStatus !== "cancelled";
    const nextHoldsSeat = nextStatus !== "cancelled";
    const needsSeatUpdate = statusChanged && previousHoldsSeat !== nextHoldsSeat;

    if (needsSeatUpdate) {
      trip = await Trip.findById(booking.tripId);

      if (!trip) {
        return res.status(400).json({ message: "Trip not found for this booking." });
      }

      departure = findDeparture(trip, booking.selectedBatchId, toDateKey(booking.departureDate));

      if (!departure) {
        return res.status(400).json({ message: "Departure not found for this booking." });
      }
    }

    if (statusChanged && !previousHoldsSeat && nextHoldsSeat) {
      const seatsLeft = Number(departure.totalSeats || 0) - Number(departure.bookedSeats || 0);

      if (booking.participants > seatsLeft) {
        return res.status(400).json({
          message: `Cannot update status. Only ${Math.max(0, seatsLeft)} seat(s) left.`
        });
      }

      departure.bookedSeats = Number(departure.bookedSeats || 0) + Number(booking.participants || 0);
    }

    if (statusChanged && previousHoldsSeat && !nextHoldsSeat) {
      departure.bookedSeats = Math.max(
        0,
        Number(departure.bookedSeats || 0) - Number(booking.participants || 0)
      );
    }

    if (statusChanged && nextStatus === "confirmed") {
      booking.confirmedAt = new Date();
      booking.cancelledAt = null;
    } else if (statusChanged && nextStatus === "cancelled") {
      booking.cancelledAt = new Date();
      booking.confirmedAt = null;
    } else if (statusChanged && nextStatus === "pending") {
      booking.cancelledAt = null;
      booking.confirmedAt = null;
    }

    booking.status = nextStatus;
    booking.paymentStatus = nextPaymentStatus;

    if (nextStatus === "confirmed" && !booking.invoiceNumber) {
      booking.invoiceNumber = generateInvoiceNumber();
    }

    if (trip) {
      await trip.save();
    }

    // Legacy records may miss newer required fields; skip full document validation
    // when updating status/payment fields so admin actions still work.
    await booking.save({ validateBeforeSave: false });

    if (previousStatus !== "confirmed" && booking.status === "confirmed") {
      try {
        await sendConfirmationEmail(booking);
      } catch (emailError) {
        console.log("Invoice email failed:", emailError.message);
      }
    }

    if (previousStatus !== "cancelled" && booking.status === "cancelled") {
      try {
        await sendBookingCancelledEmail(booking);
      } catch (emailError) {
        console.log("Cancellation email failed:", emailError.message);
      }
    }

    return res.json({
      message: "Booking updated.",
      booking: mapBooking(booking)
    });
  } catch (error) {
    console.log("Failed to update booking status:", error.message);
    return res.status(500).json({ message: error.message || "Failed to update booking status." });
  }
});

router.get("/:id/invoice.pdf", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate("tripId", "title");

    if (!booking) {
      return res.status(404).send("Booking not found.");
    }

    const mapped = mapBooking(booking);
    const branding = await getBrandingProfile();
    const pdfBuffer = await buildInvoicePdfBuffer(mapped, branding);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${mapped.invoiceNumber || "invoice"}.pdf"`
    );

    return res.send(pdfBuffer);
  } catch (error) {
    return res.status(500).send("Failed to generate PDF invoice.");
  }
});

router.get("/:id/invoice", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate("tripId", "title");

    if (!booking) {
      return res.status(404).send("Booking not found.");
    }

    const branding = await getBrandingProfile();
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(buildInvoiceHtml(mapBooking(booking), branding));
  } catch (error) {
    return res.status(500).send("Failed to generate invoice.");
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    res.json({ message: "Booking deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete booking" });
  }
});

module.exports = router;
