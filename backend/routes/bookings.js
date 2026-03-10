const express = require("express");
const Booking = require("../models/Booking");
const Trip = require("../models/Trip");
const Contact = require("../models/Contact");
const sendEmail = require("../utils/emailService");

const router = express.Router();

const PAYMENT_METHODS = ["upi", "card", "netbanking", "cash"];

const formatDateKey = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().split("T")[0];
};

const parseDurationDays = (durationDaysValue, durationText) => {
  const parsedDurationDays = Number(durationDaysValue);

  if (Number.isInteger(parsedDurationDays) && parsedDurationDays > 0) {
    return parsedDurationDays;
  }

  const matched = String(durationText || "").match(/\d+/);
  const parsedFromText = matched ? Number(matched[0]) : 1;

  return Number.isInteger(parsedFromText) && parsedFromText > 0 ? parsedFromText : 1;
};

const addDays = (dateInput, daysToAdd) => {
  const date = new Date(dateInput);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setUTCDate(date.getUTCDate() + daysToAdd);
  return date;
};

const formatDisplayDate = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};

const formatCurrency = (amount) => {
  const numericAmount = Number(amount) || 0;

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numericAmount);
};

const formatDateRange = (startDate, endDate) => {
  const start = formatDisplayDate(startDate);
  const end = formatDisplayDate(endDate);

  if (start === end) {
    return start;
  }

  return `${start} to ${end}`;
};

const escapeHtml = (unsafeValue) =>
  String(unsafeValue || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const buildInvoiceHtml = (booking) => {
  const dateRange = formatDateRange(booking.departureDate, booking.endDate);
  const createdDate = formatDisplayDate(booking.createdAt || new Date());
  const subtotalAmount = formatCurrency(booking.subtotalAmount);
  const gstAmount = formatCurrency(booking.gstAmount);
  const amount = formatCurrency(booking.totalAmount);

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Invoice ${escapeHtml(booking.invoiceNumber)}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #111; margin: 32px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; }
          .brand { font-size: 22px; font-weight: 700; }
          .muted { color: #666; font-size: 13px; }
          .status { padding: 6px 10px; border-radius: 999px; font-size: 12px; text-transform: uppercase; font-weight: 700; }
          .status.pending { background: #fef3c7; color: #92400e; }
          .status.confirmed { background: #dcfce7; color: #166534; }
          .status.cancelled { background: #fee2e2; color: #991b1b; }
          .payment { padding: 6px 10px; border-radius: 999px; font-size: 12px; text-transform: uppercase; font-weight: 700; background: #e0f2fe; color: #075985; display: inline-block; margin-top: 8px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          td, th { border: 1px solid #e5e7eb; padding: 10px; text-align: left; }
          .amount { font-size: 26px; font-weight: 700; margin-top: 18px; }
          .footer { margin-top: 28px; font-size: 12px; color: #666; }
          .actions { margin-top: 16px; }
          .actions button { padding: 8px 12px; border: none; background: #111; color: #fff; border-radius: 8px; cursor: pointer; }
          @media print { .actions { display: none; } body { margin: 12px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">Trek Platform Invoice</div>
            <div class="muted">Invoice: ${escapeHtml(booking.invoiceNumber)}</div>
            <div class="muted">Created: ${escapeHtml(createdDate)}</div>
            <div class="payment">Payment: ${escapeHtml(booking.paymentStatus)} via ${escapeHtml(booking.paymentMethod)}</div>
          </div>
          <div class="status ${escapeHtml(booking.status)}">${escapeHtml(booking.status)}</div>
        </div>

        <table>
          <tr><th>Customer</th><td>${escapeHtml(booking.customerName)}</td></tr>
          <tr><th>Email</th><td>${escapeHtml(booking.customerEmail)}</td></tr>
          <tr><th>Phone</th><td>${escapeHtml(booking.customerPhone || "-")}</td></tr>
          <tr><th>Trip</th><td>${escapeHtml(booking.tripTitle)}</td></tr>
          <tr><th>Batch</th><td>${escapeHtml(booking.selectedBatch)}</td></tr>
          <tr><th>Trek Dates</th><td>${escapeHtml(dateRange)}</td></tr>
          <tr><th>Duration</th><td>${escapeHtml(`${booking.durationDays} day(s)`)}</td></tr>
          <tr><th>Participants</th><td>${escapeHtml(booking.participants)}</td></tr>
          <tr><th>Payment Ref</th><td>${escapeHtml(booking.paymentReference || "-")}</td></tr>
          <tr><th>Subtotal</th><td>${escapeHtml(subtotalAmount)}</td></tr>
          <tr><th>GST (${escapeHtml(`${Number((booking.gstRate || 0) * 100).toFixed(0)}%`)})</th><td>${escapeHtml(gstAmount)}</td></tr>
        </table>

        <div class="amount">Total: ${escapeHtml(amount)}</div>

        <div class="actions">
          <button onclick="window.print()">Print / Save PDF</button>
        </div>

        <div class="footer">
          This invoice is generated by the Trek Platform booking system.
        </div>
      </body>
    </html>
  `;
};

const generateInvoiceNumber = async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = `INV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const alreadyUsed = await Booking.exists({ invoiceNumber: candidate });

    if (!alreadyUsed) {
      return candidate;
    }
  }

  return `INV-${Date.now()}-${Math.floor(100000 + Math.random() * 900000)}`;
};

const findDepartureForBooking = ({ trip, departureId, departureDateKey, selectedBatch }) => {
  const departuresOnDate = trip.departures.filter(
    (departure) => formatDateKey(departure.date) === departureDateKey
  );

  if (!departuresOnDate.length) {
    return { error: "Selected date is not available for this trek" };
  }

  if (departureId) {
    const matchedById = trip.departures.id(departureId);

    if (!matchedById) {
      return { error: "Selected batch is not available" };
    }

    if (formatDateKey(matchedById.date) !== departureDateKey) {
      return { error: "Selected batch does not belong to the selected date" };
    }

    return { departure: matchedById };
  }

  if (selectedBatch) {
    const selectedBatchLower = String(selectedBatch).trim().toLowerCase();
    const matchedByBatch = departuresOnDate.find(
      (departure) => String(departure.batchLabel || "").trim().toLowerCase() === selectedBatchLower
    );

    if (!matchedByBatch) {
      return { error: "Selected batch is not available" };
    }

    return { departure: matchedByBatch };
  }

  if (departuresOnDate.length > 1) {
    return { error: "Please select a batch for the selected departure date" };
  }

  return { departure: departuresOnDate[0] };
};

const getTripDepartureByBooking = (trip, booking) => {
  if (booking.departureId) {
    const matchedById = trip.departures.id(booking.departureId);

    if (matchedById) {
      return matchedById;
    }
  }

  return trip.departures.find(
    (departure) =>
      formatDateKey(departure.date) === booking.departureDateKey &&
      String(departure.batchLabel || "").trim().toLowerCase() ===
        String(booking.selectedBatch || "").trim().toLowerCase()
  );
};

const sendBookingReceivedEmail = async (booking) => {
  const subject = `Booking Request Received - ${booking.tripTitle}`;
  const dateRange = formatDateRange(booking.departureDate, booking.endDate);
  const subtotalAmount = formatCurrency(booking.subtotalAmount);
  const gstAmount = formatCurrency(booking.gstAmount);
  const amount = formatCurrency(booking.totalAmount);

  const text = [
    `Hi ${booking.customerName},`,
    "",
    "We have received your booking request.",
    `Trip: ${booking.tripTitle}`,
    `Batch: ${booking.selectedBatch}`,
    `Trek Dates: ${dateRange}`,
    `Participants: ${booking.participants}`,
    `Subtotal: ${subtotalAmount}`,
    `GST: ${gstAmount}`,
    `Amount: ${amount}`,
    `Payment: ${booking.paymentStatus} via ${booking.paymentMethod}`,
    `Invoice: ${booking.invoiceNumber}`,
    "Status: Pending admin confirmation",
    "",
    "We will send your final confirmation email shortly.",
    ""
  ].join("\n");

  await sendEmail(booking.customerEmail, subject, { text });
};

const sendBookingConfirmedEmail = async (booking) => {
  const subject = `Booking Confirmed - ${booking.tripTitle} (${booking.invoiceNumber})`;
  const dateRange = formatDateRange(booking.departureDate, booking.endDate);
  const subtotalAmount = formatCurrency(booking.subtotalAmount);
  const gstAmount = formatCurrency(booking.gstAmount);
  const amount = formatCurrency(booking.totalAmount);
  const confirmedAt = formatDisplayDate(booking.confirmedAt || new Date());
  const backendBaseUrl = process.env.BACKEND_BASE_URL || "http://localhost:5000";
  const invoiceUrl = `${backendBaseUrl}/api/bookings/${booking._id}/invoice`;

  const text = [
    `Hi ${booking.customerName},`,
    "",
    "Your trek booking is now confirmed.",
    `Trip: ${booking.tripTitle}`,
    `Batch: ${booking.selectedBatch}`,
    `Trek Dates: ${dateRange}`,
    `Participants: ${booking.participants}`,
    `Subtotal: ${subtotalAmount}`,
    `GST: ${gstAmount}`,
    `Total Paid: ${amount}`,
    `Payment: ${booking.paymentStatus} via ${booking.paymentMethod}`,
    `Invoice Number: ${booking.invoiceNumber}`,
    `Confirmation Date: ${confirmedAt}`,
    `Invoice Link: ${invoiceUrl}`,
    "",
    "Please carry a valid ID during check-in.",
    ""
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; color:#111; line-height:1.6;">
      <h2 style="margin-bottom:8px;">Booking Confirmed</h2>
      <p>Hi ${booking.customerName},</p>
      <p>Your trek booking has been confirmed. Please find your invoice details below.</p>
      <table style="border-collapse: collapse; width: 100%; max-width: 520px; margin-top: 12px;">
        <tr><td style="border:1px solid #ddd; padding:8px;">Invoice</td><td style="border:1px solid #ddd; padding:8px;">${booking.invoiceNumber}</td></tr>
        <tr><td style="border:1px solid #ddd; padding:8px;">Trip</td><td style="border:1px solid #ddd; padding:8px;">${booking.tripTitle}</td></tr>
        <tr><td style="border:1px solid #ddd; padding:8px;">Batch</td><td style="border:1px solid #ddd; padding:8px;">${booking.selectedBatch}</td></tr>
        <tr><td style="border:1px solid #ddd; padding:8px;">Trek Dates</td><td style="border:1px solid #ddd; padding:8px;">${dateRange}</td></tr>
        <tr><td style="border:1px solid #ddd; padding:8px;">Participants</td><td style="border:1px solid #ddd; padding:8px;">${booking.participants}</td></tr>
        <tr><td style="border:1px solid #ddd; padding:8px;">Subtotal</td><td style="border:1px solid #ddd; padding:8px;">${subtotalAmount}</td></tr>
        <tr><td style="border:1px solid #ddd; padding:8px;">GST</td><td style="border:1px solid #ddd; padding:8px;">${gstAmount}</td></tr>
        <tr><td style="border:1px solid #ddd; padding:8px;">Total</td><td style="border:1px solid #ddd; padding:8px;">${amount}</td></tr>
        <tr><td style="border:1px solid #ddd; padding:8px;">Payment</td><td style="border:1px solid #ddd; padding:8px;">${booking.paymentStatus} via ${booking.paymentMethod}</td></tr>
        <tr><td style="border:1px solid #ddd; padding:8px;">Confirmed On</td><td style="border:1px solid #ddd; padding:8px;">${confirmedAt}</td></tr>
      </table>
      <p style="margin-top:12px;">Invoice URL: <a href="${invoiceUrl}">${invoiceUrl}</a></p>
      <p style="margin-top:16px;">Thank you for booking with us.</p>
    </div>
  `;

  await sendEmail(booking.customerEmail, subject, {
    text,
    html,
    attachments: [
      {
        filename: `${booking.invoiceNumber}.html`,
        content: buildInvoiceHtml(booking),
        contentType: "text/html"
      }
    ]
  });
};

const sendBookingCancelledEmail = async (booking) => {
  const subject = `Booking Update - ${booking.tripTitle}`;
  const dateRange = formatDateRange(booking.departureDate, booking.endDate);

  const text = [
    `Hi ${booking.customerName},`,
    "",
    "Your booking has been marked as cancelled by admin.",
    `Trip: ${booking.tripTitle}`,
    `Batch: ${booking.selectedBatch}`,
    `Trek Dates: ${dateRange}`,
    `Invoice: ${booking.invoiceNumber}`,
    "",
    "For support, please reply to this email.",
    ""
  ].join("\n");

  await sendEmail(booking.customerEmail, subject, { text });
};

router.post("/", async (req, res) => {
  try {
    const {
      tripId,
      departureDate,
      departureId,
      selectedBatch,
      participants,
      customerName,
      customerEmail,
      customerPhone,
      notes,
      paymentMethod,
      paymentReference,
      paymentStatus
    } = req.body;

    const participantCount = Number(participants);

    if (!tripId || !departureDate || !customerName || !customerEmail || !participantCount) {
      return res.status(400).json({ message: "Please provide all required booking fields" });
    }

    if (!Number.isInteger(participantCount) || participantCount < 1) {
      return res.status(400).json({ message: "Participants must be at least 1" });
    }

    const departureDateKey = formatDateKey(departureDate);

    if (!departureDateKey) {
      return res.status(400).json({ message: "Invalid departure date" });
    }

    const sanitizedPaymentMethod = PAYMENT_METHODS.includes(String(paymentMethod || "").toLowerCase())
      ? String(paymentMethod).toLowerCase()
      : "cash";

    const sanitizedPaymentReference = String(paymentReference || "").trim().slice(0, 100);
    const requestedPaymentStatus = String(paymentStatus || "").toLowerCase();

    if (
      sanitizedPaymentMethod !== "cash" &&
      requestedPaymentStatus === "paid" &&
      !sanitizedPaymentReference
    ) {
      return res.status(400).json({ message: "Payment reference is required for paid status" });
    }

    const trip = await Trip.findById(tripId);

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    const departureResult = findDepartureForBooking({
      trip,
      departureId,
      departureDateKey,
      selectedBatch
    });

    if (departureResult.error) {
      return res.status(400).json({ message: departureResult.error });
    }

    const matchedDeparture = departureResult.departure;

    if (matchedDeparture.bookedSeats >= matchedDeparture.totalSeats) {
      return res.status(400).json({ message: "Selected departure batch is sold out" });
    }

    const seatsLeft = matchedDeparture.totalSeats - matchedDeparture.bookedSeats;

    if (participantCount > seatsLeft) {
      return res.status(400).json({ message: "Selected departure batch does not have enough seats" });
    }

    const durationDays = parseDurationDays(trip.durationDays, trip.duration);
    const startDate = new Date(`${departureDateKey}T00:00:00.000Z`);
    const endDate = addDays(startDate, durationDays - 1);

    if (!endDate) {
      return res.status(400).json({ message: "Unable to calculate trek end date" });
    }

    const invoiceNumber = await generateInvoiceNumber();
    const subtotalAmount = (Number(trip.price) || 0) * participantCount;
    const gstRate = 0.05;
    const gstAmount = Number((subtotalAmount * gstRate).toFixed(2));
    const totalAmount = Number((subtotalAmount + gstAmount).toFixed(2));
    const finalPaymentStatus =
      sanitizedPaymentMethod === "cash"
        ? "pending"
        : requestedPaymentStatus === "paid"
        ? "paid"
        : "pending";

    const booking = await Booking.create({
      trip: trip._id,
      tripTitle: trip.title,
      tripPrice: trip.price,
      departureDate: startDate,
      endDate,
      departureDateKey,
      departureId: String(matchedDeparture._id),
      durationDays,
      selectedBatch: matchedDeparture.batchLabel || "Standard Batch",
      participants: participantCount,
      customerName,
      customerEmail,
      customerPhone,
      notes,
      totalAmount,
      subtotalAmount,
      gstRate,
      gstAmount,
      paymentMethod: sanitizedPaymentMethod,
      paymentStatus: finalPaymentStatus,
      paymentReference: sanitizedPaymentReference || undefined,
      invoiceNumber
    });

    try {
      await sendBookingReceivedEmail(booking);
    } catch (emailError) {
      console.log("Booking received email failed:", emailError.message);
    }

    if (process.env.ADMIN_EMAIL) {
      try {
        const adminText = [
          "New booking request received",
          `Trip: ${booking.tripTitle}`,
          `Batch: ${booking.selectedBatch}`,
          `Dates: ${formatDateRange(booking.departureDate, booking.endDate)}`,
          `Participants: ${booking.participants}`,
          `Customer: ${booking.customerName} (${booking.customerEmail})`,
          `Payment: ${booking.paymentStatus} via ${booking.paymentMethod}`,
          `Invoice: ${booking.invoiceNumber}`
        ].join("\n");

        await sendEmail(process.env.ADMIN_EMAIL, `New Booking - ${booking.tripTitle}`, {
          text: adminText
        });
      } catch (adminEmailError) {
        console.log("Admin booking notification failed:", adminEmailError.message);
      }
    }

    res.status(201).json(booking);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error creating booking" });
  }
});

router.get("/", async (req, res) => {
  try {
    const filter = {};
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 10, 1), 100);
    const searchQuery = (req.query.q || "").trim();

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (searchQuery) {
      const regex = new RegExp(searchQuery, "i");

      filter.$or = [
        { customerName: regex },
        { customerEmail: regex },
        { customerPhone: regex },
        { tripTitle: regex },
        { invoiceNumber: regex },
        { selectedBatch: regex }
      ];
    }

    const [items, total] = await Promise.all([
      Booking.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("trip", "title location coverImage price"),
      Booking.countDocuments(filter)
    ]);

    const pages = Math.max(Math.ceil(total / limit), 1);

    res.json({
      items,
      total,
      page,
      pages,
      limit
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching bookings" });
  }
});

router.get("/summary", async (req, res) => {
  try {
    const [
      totalTrips,
      totalMessages,
      totalBookings,
      pendingBookings,
      confirmedBookings,
      cancelledBookings,
      revenueResult
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

    res.json({
      totalTrips,
      totalMessages,
      totalBookings,
      pendingBookings,
      confirmedBookings,
      cancelledBookings,
      totalRevenue: revenueResult[0]?.totalRevenue || 0
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching admin summary" });
  }
});

router.get("/:id/invoice", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const html = buildInvoiceHtml(booking);

    if (req.query.format === "json") {
      return res.json({ html });
    }

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (error) {
    res.status(500).json({ message: "Error generating invoice" });
  }
});

router.patch("/:id/status", async (req, res) => {
  try {
    const { status, adminNote, paymentStatus } = req.body;

    if (!status && !paymentStatus) {
      return res.status(400).json({ message: "Nothing to update" });
    }

    if (status && !["pending", "confirmed", "cancelled"].includes(status)) {
      return res.status(400).json({ message: "Invalid booking status" });
    }

    if (paymentStatus && !["pending", "paid"].includes(paymentStatus)) {
      return res.status(400).json({ message: "Invalid payment status" });
    }

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const previousStatus = booking.status;

    if (status === "confirmed" && previousStatus !== "confirmed") {
      const trip = await Trip.findById(booking.trip);

      if (!trip) {
        return res.status(404).json({ message: "Associated trip not found" });
      }

      const matchedDeparture = getTripDepartureByBooking(trip, booking);

      if (!matchedDeparture) {
        return res.status(400).json({ message: "Departure no longer exists in this trip" });
      }

      const seatsLeft = matchedDeparture.totalSeats - matchedDeparture.bookedSeats;

      if (seatsLeft < booking.participants) {
        return res.status(400).json({ message: "Not enough seats left to confirm this booking" });
      }

      matchedDeparture.bookedSeats += booking.participants;
      await trip.save();

      booking.confirmedAt = new Date();
      booking.cancelledAt = undefined;
    }

    if (status === "cancelled") {
      if (previousStatus === "confirmed") {
        const trip = await Trip.findById(booking.trip);

        if (trip) {
          const matchedDeparture = getTripDepartureByBooking(trip, booking);

          if (matchedDeparture) {
            matchedDeparture.bookedSeats = Math.max(
              0,
              matchedDeparture.bookedSeats - booking.participants
            );
            await trip.save();
          }
        }
      }

      booking.cancelledAt = new Date();
    }

    if (status) {
      booking.status = status;
    }

    if (paymentStatus) {
      booking.paymentStatus = paymentStatus;
    }

    if (typeof adminNote === "string") {
      booking.adminNote = adminNote;
    }

    await booking.save();

    try {
      if (status === "confirmed" && previousStatus !== "confirmed") {
        await sendBookingConfirmedEmail(booking);
      }

      if (status === "cancelled" && previousStatus !== "cancelled") {
        await sendBookingCancelledEmail(booking);
      }
    } catch (emailError) {
      console.log("Booking status email failed:", emailError.message);
    }

    const updatedBooking = await Booking.findById(booking._id).populate(
      "trip",
      "title location coverImage price"
    );

    res.json(updatedBooking);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error updating booking status" });
  }
});

module.exports = router;
