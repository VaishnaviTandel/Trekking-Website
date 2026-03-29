const express = require("express");
const mongoose = require("mongoose");

const Room = require("../models/Room");
const RoomBooking = require("../models/RoomBooking");
const Admin = require("../models/Admin");
const sendEmail = require("../utils/emailService");
const upload = require("../uploads/upload");

const router = express.Router();

const ALLOWED_STATUSES = new Set(["pending", "confirmed", "cancelled"]);
const ALLOWED_PAYMENT_STATUSES = new Set(["pending", "paid", "rejected"]);
const HOLD_STATUSES = ["pending", "confirmed"];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[0-9]{10,15}$/;
const CHILD_CONCESSION_PERCENT = Math.min(
  100,
  Math.max(0, Number(process.env.ROOM_CHILD_UNDER10_CONCESSION_PERCENT || 50))
);

const normalizeUploadPath = (filePath = "") =>
  String(filePath).replace(/\\/g, "/").replace(/^uploads\//, "");

const parseDate = (value) => {
  const text = String(value || "").trim();

  if (!text) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return new Date(`${text}T00:00:00.000Z`);
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getNights = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) {
    return 0;
  }

  const ms = checkOut.getTime() - checkIn.getTime();
  const diff = Math.ceil(ms / (24 * 60 * 60 * 1000));
  return Number.isInteger(diff) && diff > 0 ? diff : 0;
};

const formatPrice = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(value) || 0);

const generateInvoiceNumber = () => {
  const timePart = Date.now().toString().slice(-8);
  const randomPart = Math.floor(Math.random() * 900 + 100);
  return `RINV-${timePart}-${randomPart}`;
};

const findRoomType = (room, roomTypeId) => {
  const roomTypes = Array.isArray(room?.roomTypes) ? room.roomTypes : [];

  return roomTypes.find((type) => String(type?._id) === String(roomTypeId)) || null;
};

const getReservedRooms = async ({
  roomId,
  roomTypeId,
  checkIn,
  checkOut,
  ignoreBookingId = ""
}) => {
  const match = {
    roomId: new mongoose.Types.ObjectId(String(roomId)),
    roomTypeId: String(roomTypeId),
    status: { $in: HOLD_STATUSES },
    checkIn: { $lt: checkOut },
    checkOut: { $gt: checkIn }
  };

  if (ignoreBookingId) {
    match._id = { $ne: new mongoose.Types.ObjectId(String(ignoreBookingId)) };
  }

  const grouped = await RoomBooking.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        reservedRooms: { $sum: "$roomsCount" }
      }
    }
  ]);

  return Number(grouped[0]?.reservedRooms || 0);
};

const mapBooking = (booking) => {
  const source = typeof booking.toObject === "function" ? booking.toObject() : booking;

  return {
    ...source,
    roomName: source.roomName || source.roomId?.name || "",
    roomLocation: source.roomLocation || source.roomId?.location || "",
    roomCoverImage: source.roomId?.coverImage || "",
    adultsCount: Number(source.adultsCount || 0),
    childrenAbove10Count: Number(source.childrenAbove10Count || 0),
    childrenBelow10Count: Number(source.childrenBelow10Count || 0),
    concessionPercent: Number(source.concessionPercent || 0),
    concessionAmount: Number(source.concessionAmount || 0),
    baseAmount: Number(source.baseAmount || source.totalAmount || 0)
  };
};

const roundMoney = (value) => Math.round(Number(value || 0) * 100) / 100;

const formatDate = (value) => {
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

const sendRoomConfirmationEmail = async (bookingInput) => {
  const booking = mapBooking(bookingInput);

  if (!booking.customerEmail) {
    return;
  }

  const admin = await Admin.findOne().sort({ createdAt: -1 });
  const companyName = admin?.companyName || "TrekPlatform";

  const subject = `Room Booking Confirmed - ${booking.invoiceNumber || "Booking"}`;
  const text = [
    `Hi ${booking.customerName},`,
    "",
    `Your room booking is confirmed by ${companyName}.`,
    `Property: ${booking.roomName}`,
    `Room Type: ${booking.roomTypeLabel}`,
    `Stay: ${formatDate(booking.checkIn)} to ${formatDate(booking.checkOut)} (${booking.nights} night(s))`,
    `Adults: ${booking.adultsCount}`,
    `Children (10+): ${booking.childrenAbove10Count}`,
    `Children (<10): ${booking.childrenBelow10Count}`,
    `Concession (${booking.concessionPercent}%): ${formatPrice(booking.concessionAmount)}`,
    `Final Amount: ${formatPrice(booking.totalAmount)}`,
    `Invoice Number: ${booking.invoiceNumber}`,
    "",
    "Thank you for booking with us."
  ].join("\n");

  await sendEmail(booking.customerEmail, subject, text);

  try {
    const admin = await Admin.findOne().sort({ createdAt: -1 });
    const recipient = admin?.supportEmail || admin?.email || process.env.EMAIL_USER;

    if (recipient) {
      await sendEmail(
        recipient,
        `Room Booking Confirmed - ${booking.roomName}`,
        [
          "A room booking has been confirmed.",
          "",
          `Customer: ${booking.customerName} <${booking.customerEmail}>`,
          `Room: ${booking.roomName}`,
          `Type: ${booking.roomTypeLabel}`,
          `Stay: ${formatDate(booking.checkIn)} to ${formatDate(booking.checkOut)}`,
          `Amount: ${formatPrice(booking.totalAmount)}`,
          `Invoice: ${booking.invoiceNumber}`,
          "",
          `Admin panel: ${process.env.CLIENT_URL || "http://localhost:3000"}/admin`
        ].join("\n")
      );
    }
  } catch (emailError) {
    console.log("Room confirmation admin email failed:", emailError.message);
  }
};

const sendRoomBookingReceivedEmail = async (bookingInput) => {
  const booking = mapBooking(bookingInput);

  if (!booking.customerEmail) {
    return;
  }

  const subject = `Room Booking Received - ${booking.roomName}`;
  const text = [
    `Hi ${booking.customerName},`,
    "",
    "We received your room booking request.",
    `Property: ${booking.roomName}`,
    `Room Type: ${booking.roomTypeLabel}`,
    `Stay: ${formatDate(booking.checkIn)} to ${formatDate(booking.checkOut)}`,
    `Nights: ${booking.nights}`,
    `Amount: ${formatPrice(booking.totalAmount)}`,
    "",
    "Your booking is pending admin confirmation. You will receive an update soon."
  ].join("\n");

  await sendEmail(booking.customerEmail, subject, text);

  try {
    const admin = await Admin.findOne().sort({ createdAt: -1 });
    const recipient = admin?.supportEmail || admin?.email || process.env.EMAIL_USER;

    if (recipient) {
      await sendEmail(
        recipient,
        `New Room Booking Received - ${booking.roomName}`,
        [
          "A new room booking has been submitted.",
          "",
          `Customer: ${booking.customerName} <${booking.customerEmail}>`,
          `Phone: ${booking.customerPhone}`,
          `Room: ${booking.roomName}`,
          `Type: ${booking.roomTypeLabel}`,
          `Check-in: ${formatDate(booking.checkIn)}`,
          `Check-out: ${formatDate(booking.checkOut)}`,
          `Amount: ${formatPrice(booking.totalAmount)}`,
          `Status: ${booking.status}`,
          "",
          `Admin panel: ${process.env.CLIENT_URL || "http://localhost:3000"}/admin`
        ].join("\n")
      );
    }
  } catch (emailError) {
    console.log("Room booking received admin email failed:", emailError.message);
  }
};

const sendRoomCancellationEmail = async (bookingInput) => {
  const booking = mapBooking(bookingInput);

  if (!booking.customerEmail) {
    return;
  }

  const admin = await Admin.findOne().sort({ createdAt: -1 });
  const companyName = admin?.companyName || "TrekPlatform";

  const subject = `Room Booking Cancelled - ${booking.invoiceNumber || "Booking"}`;
  const text = [
    `Hi ${booking.customerName},`,
    "",
    `We regret to inform you that your room booking has been cancelled.`,
    `Property: ${booking.roomName}`,
    `Room Type: ${booking.roomTypeLabel}`,
    `Stay: ${formatDate(booking.checkIn)} to ${formatDate(booking.checkOut)} (${booking.nights} night(s))`,
    `Adults: ${booking.adultsCount}`,
    `Children (10+): ${booking.childrenAbove10Count}`,
    `Children (<10): ${booking.childrenBelow10Count}`,
    `Concession (${booking.concessionPercent}%): ${formatPrice(booking.concessionAmount)}`,
    `Final Amount: ${formatPrice(booking.totalAmount)}`,
    `Invoice Number: ${booking.invoiceNumber}`,
    "",
    "If you have any questions, please contact us.",
    "",
    "Thank you for your understanding."
  ].join("\n");

  await sendEmail(booking.customerEmail, subject, text);

  try {
    const admin = await Admin.findOne().sort({ createdAt: -1 });
    const recipient = admin?.supportEmail || admin?.email || process.env.EMAIL_USER;

    if (recipient) {
      await sendEmail(
        recipient,
        `Room Booking Cancelled - ${booking.roomName}`,
        [
          "A room booking has been cancelled.",
          "",
          `Customer: ${booking.customerName} <${booking.customerEmail}>`,
          `Room: ${booking.roomName}`,
          `Type: ${booking.roomTypeLabel}`,
          `Stay: ${formatDate(booking.checkIn)} to ${formatDate(booking.checkOut)}`,
          `Amount: ${formatPrice(booking.totalAmount)}`,
          `Invoice: ${booking.invoiceNumber}`,
          "",
          `Admin panel: ${process.env.CLIENT_URL || "http://localhost:3000"}/admin`
        ].join("\n")
      );
    }
  } catch (emailError) {
    console.log("Room cancellation admin email failed:", emailError.message);
  }
};

router.post("/", upload.single("screenshot"), async (req, res) => {
  try {
    const roomId = String(req.body.roomId || "").trim();
    const roomTypeId = String(req.body.roomTypeId || "").trim();
    const checkIn = parseDate(req.body.checkIn);
    const checkOut = parseDate(req.body.checkOut);
    const nights = getNights(checkIn, checkOut);
    const roomsCount = Math.max(1, Number(req.body.roomsCount || 1));
    const guestsCountInput = Number(req.body.guestsCount || 0);
    const adultsCount = Math.max(0, Number(req.body.adultsCount || 0));
    const childrenAbove10Count = Math.max(0, Number(req.body.childrenAbove10Count || 0));
    const childrenBelow10Count = Math.max(0, Number(req.body.childrenBelow10Count || 0));
    const customerName = String(req.body.customerName || "").trim();
    const customerEmail = String(req.body.customerEmail || "").trim().toLowerCase();
    const customerPhone = String(req.body.customerPhone || "").trim();
    const specialRequest = String(req.body.specialRequest || "").trim();
    const paymentReference = String(req.body.paymentReference || "").trim();

    if (!roomId || !roomTypeId || !checkIn || !checkOut) {
      return res.status(400).json({
        message: "Room, room type, check-in and check-out are required."
      });
    }

    if (nights <= 0) {
      return res.status(400).json({
        message: "Check-out date must be after check-in date."
      });
    }

    if (!customerName || !customerEmail || !customerPhone) {
      return res.status(400).json({
        message: "Customer name, email and phone are required."
      });
    }

    if (!emailPattern.test(customerEmail)) {
      return res.status(400).json({ message: "Please enter valid email." });
    }

    if (!phonePattern.test(customerPhone.replace(/[^0-9]/g, ""))) {
      return res.status(400).json({ message: "Please enter valid phone number." });
    }

    if (!paymentReference) {
      return res.status(400).json({ message: "Payment reference is required." });
    }

    const room = await Room.findById(roomId);

    if (!room || room.isActive === false) {
      return res.status(404).json({ message: "Room not found." });
    }

    const roomType = findRoomType(room, roomTypeId);

    if (!roomType || roomType.isActive === false) {
      return res.status(400).json({ message: "Selected room type is unavailable." });
    }

    const reservedRooms = await getReservedRooms({
      roomId,
      roomTypeId,
      checkIn,
      checkOut
    });
    const totalRooms = Number(roomType.totalRooms || 0);
    const availableRooms = Math.max(0, totalRooms - reservedRooms);

    if (roomsCount > availableRooms) {
      return res.status(400).json({
        message: `Only ${availableRooms} room(s) left for selected dates.`
      });
    }

    const guestBreakupTotal = adultsCount + childrenAbove10Count + childrenBelow10Count;
    const guestsCount = Math.max(
      1,
      guestBreakupTotal || guestsCountInput || roomsCount * Number(roomType.occupancy || 1)
    );
    const maxGuestsAllowed = roomsCount * Number(roomType.occupancy || 1);

    if (guestsCount > maxGuestsAllowed) {
      return res.status(400).json({
        message: `Maximum allowed guests for selected rooms: ${maxGuestsAllowed}.`
      });
    }

    if (adultsCount < 1) {
      return res.status(400).json({
        message: "At least 1 adult is required for room booking."
      });
    }

    if (guestBreakupTotal > 0 && guestBreakupTotal !== guestsCount) {
      return res.status(400).json({
        message: "Guest breakup mismatch. Please check adults and children count."
      });
    }

    if (guestsCountInput > 0 && guestsCountInput !== guestsCount) {
      return res.status(400).json({
        message: "Guests count does not match passenger breakup."
      });
    }

    const pricePerNight = Number(roomType.pricePerNight || 0);
    const baseAmount = roundMoney(pricePerNight * nights * roomsCount);
    const concessionRatio = guestsCount > 0 ? childrenBelow10Count / guestsCount : 0;
    const concessionAmount = roundMoney(
      baseAmount * concessionRatio * (CHILD_CONCESSION_PERCENT / 100)
    );
    const totalAmount = roundMoney(Math.max(0, baseAmount - concessionAmount));

    const booking = await RoomBooking.create({
      roomId: room._id,
      roomName: room.name,
      roomLocation: room.location,
      roomTypeId: String(roomType._id),
      roomTypeLabel: roomType.label,
      shareType: roomType.shareType,
      acType: roomType.acType,
      checkIn,
      checkOut,
      nights,
      roomsCount,
      guestsCount,
      adultsCount,
      childrenAbove10Count,
      childrenBelow10Count,
      customerName,
      customerEmail,
      customerPhone,
      specialRequest,
      pricePerNight,
      baseAmount,
      concessionPercent: CHILD_CONCESSION_PERCENT,
      concessionAmount,
      totalAmount,
      paymentMethod: "upi_qr",
      paymentReference,
      paymentScreenshot: req.file ? normalizeUploadPath(req.file.path || req.file.filename) : "",
      paymentStatus: "pending",
      status: "pending",
      invoiceNumber: generateInvoiceNumber()
    });

    try {
      await sendRoomBookingReceivedEmail(booking);
    } catch (emailError) {
      console.log("Room booking received email failed:", emailError.message);
    }

    return res.status(201).json({
      message: `Room booking submitted for ${nights} night(s), total ${formatPrice(totalAmount)}.`,
      booking: mapBooking(booking)
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Room booking failed." });
  }
});

router.get("/summary", async (_req, res) => {
  try {
    const [totalRoomBookings, pendingRoomBookings, confirmedRoomBookings, cancelledRoomBookings, revenue] =
      await Promise.all([
        RoomBooking.countDocuments(),
        RoomBooking.countDocuments({ status: "pending" }),
        RoomBooking.countDocuments({ status: "confirmed" }),
        RoomBooking.countDocuments({ status: "cancelled" }),
        RoomBooking.aggregate([
          { $match: { status: "confirmed" } },
          { $group: { _id: null, totalRevenue: { $sum: "$totalAmount" } } }
        ])
      ]);

    return res.json({
      totalRoomBookings,
      pendingRoomBookings,
      confirmedRoomBookings,
      cancelledRoomBookings,
      totalRoomRevenue: Number(revenue[0]?.totalRevenue || 0)
    });
  } catch (_error) {
    return res.status(500).json({ message: "Failed to load room booking summary." });
  }
});

router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const status = String(req.query.status || "all").toLowerCase();
    const paymentStatus = String(req.query.paymentStatus || "all").toLowerCase();
    const q = String(req.query.q || "").trim();

    const query = {};

    if (status !== "all" && ALLOWED_STATUSES.has(status)) {
      query.status = status;
    }

    if (paymentStatus !== "all" && ALLOWED_PAYMENT_STATUSES.has(paymentStatus)) {
      query.paymentStatus = paymentStatus;
    }

    if (q) {
      const regex = new RegExp(q, "i");
      query.$or = [
        { customerName: regex },
        { customerEmail: regex },
        { customerPhone: regex },
        { roomName: regex },
        { roomLocation: regex },
        { roomTypeLabel: regex },
        { paymentReference: regex },
        { invoiceNumber: regex }
      ];
    }

    const [total, items] = await Promise.all([
      RoomBooking.countDocuments(query),
      RoomBooking.find(query)
        .populate("roomId", "name location coverImage")
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
  } catch (_error) {
    return res.status(500).json({ message: "Failed to load room bookings." });
  }
});

router.patch("/:id/status", async (req, res) => {
  try {
    const booking = await RoomBooking.findById(req.params.id);

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
    const statusChanged = previousStatus !== nextStatus;
    const movingFromCancelled = booking.status === "cancelled" && nextStatus !== "cancelled";

    if (movingFromCancelled) {
      const room = await Room.findById(booking.roomId);
      const roomType = findRoomType(room, booking.roomTypeId);

      if (!room || !roomType || roomType.isActive === false) {
        return res.status(400).json({
          message: "Room or room type is no longer available."
        });
      }

      const reservedRooms = await getReservedRooms({
        roomId: booking.roomId,
        roomTypeId: booking.roomTypeId,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        ignoreBookingId: booking._id
      });
      const totalRooms = Number(roomType.totalRooms || 0);
      const availableRooms = Math.max(0, totalRooms - reservedRooms);

      if (Number(booking.roomsCount || 0) > availableRooms) {
        return res.status(400).json({
          message: `Cannot restore booking. Only ${availableRooms} room(s) left for selected dates.`
        });
      }
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

    await booking.save({ validateBeforeSave: false });

    if (previousStatus !== "confirmed" && booking.status === "confirmed") {
      try {
        await sendRoomConfirmationEmail(booking);
      } catch (emailError) {
        console.log("Room confirmation email failed:", emailError.message);
      }
    }

    if (previousStatus !== "cancelled" && booking.status === "cancelled") {
      try {
        await sendRoomCancellationEmail(booking);
      } catch (emailError) {
        console.log("Room cancellation email failed:", emailError.message);
      }
    }

    return res.json({
      message: "Room booking updated.",
      booking: mapBooking(booking)
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Failed to update room booking."
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const booking = await RoomBooking.findByIdAndDelete(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "Room booking not found" });
    }
    res.json({ message: "Room booking deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete room booking" });
  }
});

module.exports = router;
