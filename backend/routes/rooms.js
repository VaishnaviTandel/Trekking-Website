const express = require("express");
const mongoose = require("mongoose");

const Room = require("../models/Room");
const RoomBooking = require("../models/RoomBooking");
const upload = require("../uploads/upload");

const router = express.Router();

const HOLD_STATUSES = ["pending", "confirmed"];

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

const parseBoolean = (value, fallback = true) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (typeof value === "boolean") {
    return value;
  }

  return String(value).toLowerCase() === "true";
};

const normalizeUploadPath = (filePath = "") =>
  String(filePath).replace(/\\/g, "/").replace(/^uploads\//, "");

const extractFilesFromAny = (files = []) => {
  const list = Array.isArray(files) ? files : [];
  return {
    coverImageFile: list.find((file) => file.fieldname === "coverImage") || null,
    galleryFiles: list.filter((file) => file.fieldname === "gallery"),
    roomTypeFilesByIndex: list.reduce((acc, file) => {
      const matched = String(file.fieldname || "").match(/^roomTypeImages_(\d+)$/);

      if (!matched) {
        return acc;
      }

      const index = Number(matched[1]);

      if (!Number.isInteger(index) || index < 0) {
        return acc;
      }

      const current = acc[index] || [];
      current.push(normalizeUploadPath(file.path || file.filename));
      acc[index] = current;
      return acc;
    }, {})
  };
};

const parseStringList = (rawValue, limit = 40) => {
  const parsed = parseJsonValue(rawValue, rawValue);

  if (Array.isArray(parsed)) {
    return parsed
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .slice(0, limit);
  }

  return String(rawValue || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, limit);
};

const normalizeShareType = (value = "") => {
  const lower = String(value).trim().toLowerCase();

  if (["single", "double", "triple", "quad", "dorm", "custom"].includes(lower)) {
    return lower;
  }

  if (lower.includes("single")) {
    return "single";
  }
  if (lower.includes("double")) {
    return "double";
  }
  if (lower.includes("triple")) {
    return "triple";
  }
  if (lower.includes("quad")) {
    return "quad";
  }
  if (lower.includes("dorm")) {
    return "dorm";
  }

  return "custom";
};

const normalizeAcType = (value = "") => {
  const lower = String(value).trim().toLowerCase();
  return lower.includes("non") ? "non_ac" : "ac";
};

const fallbackOccupancyByShareType = {
  single: 1,
  double: 2,
  triple: 3,
  quad: 4,
  dorm: 8,
  custom: 2
};

const parseRoomTypes = (rawRoomTypes, uploadedTypeImagesByIndex = {}) => {
  const parsed = parseJsonValue(rawRoomTypes, []);

  if (!Array.isArray(parsed)) {
    throw new Error("Room types must be an array.");
  }

  return parsed
    .map((type, index) => {
      const label = String(type?.label || "").trim();

      if (!label) {
        throw new Error(`Room type #${index + 1} label is required.`);
      }

      const shareType = normalizeShareType(type?.shareType);
      const acType = normalizeAcType(type?.acType);
      const occupancyInput = Number(type?.occupancy);
      const occupancy = Number.isInteger(occupancyInput) && occupancyInput > 0
        ? occupancyInput
        : fallbackOccupancyByShareType[shareType] || 2;

      const totalRooms = Number(type?.totalRooms);
      const pricePerNight = Number(type?.pricePerNight);
      const rawTypeId = String(type?._id || "").trim();
      const parsedTypeId = mongoose.Types.ObjectId.isValid(rawTypeId)
        ? new mongoose.Types.ObjectId(rawTypeId)
        : null;

      if (!Number.isInteger(totalRooms) || totalRooms < 0) {
        throw new Error(`Room type "${label}" must have valid total rooms.`);
      }

      if (!Number.isFinite(pricePerNight) || pricePerNight < 0) {
        throw new Error(`Room type "${label}" must have valid price per night.`);
      }

      return {
        ...(parsedTypeId ? { _id: parsedTypeId } : {}),
        label,
        shareType,
        acType,
        occupancy,
        totalRooms,
        pricePerNight,
        description: String(type?.description || "").trim(),
        images: [
          ...parseStringList(type?.images, 20),
          ...(Array.isArray(uploadedTypeImagesByIndex[index])
            ? uploadedTypeImagesByIndex[index]
            : [])
        ].filter(Boolean),
        isActive: parseBoolean(type?.isActive, true)
      };
    })
    .filter((roomType) => roomType.label);
};

const mapRoom = (room) => {
  const source = typeof room.toObject === "function" ? room.toObject() : room;
  const roomTypes = Array.isArray(source.roomTypes) ? source.roomTypes : [];
  const activeTypes = roomTypes.filter((type) => type?.isActive !== false);
  const prices = activeTypes.map((type) => Number(type?.pricePerNight || 0));

  return {
    ...source,
    roomTypes,
    startingPrice: prices.length ? Math.min(...prices) : 0
  };
};

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

const getTypeReservations = async (roomId, checkIn, checkOut, selectedTypeId = "") => {
  if (!checkIn || !checkOut) {
    return {};
  }

  const match = {
    roomId: new mongoose.Types.ObjectId(String(roomId)),
    status: { $in: HOLD_STATUSES },
    checkIn: { $lt: checkOut },
    checkOut: { $gt: checkIn }
  };

  if (selectedTypeId) {
    match.roomTypeId = String(selectedTypeId);
  }

  const grouped = await RoomBooking.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$roomTypeId",
        reservedRooms: { $sum: "$roomsCount" }
      }
    }
  ]);

  return grouped.reduce((acc, row) => {
    acc[String(row._id)] = Number(row.reservedRooms || 0);
    return acc;
  }, {});
};

router.get("/", async (req, res) => {
  try {
    const query = {};
    const location = String(req.query.location || "").trim();
    const q = String(req.query.q || "").trim();

    if (location) {
      query.location = new RegExp(location, "i");
    }

    if (q) {
      const regex = new RegExp(q, "i");
      query.$or = [{ name: regex }, { location: regex }, { address: regex }];
    }

    if (req.query.active === "true") {
      query.isActive = true;
    }

    const rooms = await Room.find(query).sort({ createdAt: -1 });
    return res.json(rooms.map(mapRoom));
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to load rooms." });
  }
});

router.get("/:id/availability", async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ message: "Room not found." });
    }

    const checkIn = parseDate(req.query.checkIn);
    const checkOut = parseDate(req.query.checkOut);
    const roomTypeId = String(req.query.roomTypeId || "").trim();

    if ((checkIn && !checkOut) || (!checkIn && checkOut)) {
      return res.status(400).json({
        message: "Please send both check-in and check-out date."
      });
    }

    if (checkIn && checkOut && checkIn >= checkOut) {
      return res.status(400).json({
        message: "Check-out date must be after check-in date."
      });
    }

    const roomTypes = Array.isArray(room.roomTypes) ? room.roomTypes : [];
    const reservations = await getTypeReservations(room._id, checkIn, checkOut, roomTypeId);
    const availability = roomTypes
      .filter((type) => (roomTypeId ? String(type._id) === roomTypeId : true))
      .map((type) => {
        const reservedRooms = Number(reservations[String(type._id)] || 0);
        const totalRooms = Number(type.totalRooms || 0);
        const availableRooms = Math.max(0, totalRooms - reservedRooms);

        return {
          roomTypeId: String(type._id),
          label: type.label,
          shareType: type.shareType,
          acType: type.acType,
          occupancy: Number(type.occupancy || 1),
          totalRooms,
          reservedRooms,
          availableRooms,
          pricePerNight: Number(type.pricePerNight || 0),
          isActive: Boolean(type.isActive)
        };
      });

    return res.json({
      roomId: String(room._id),
      checkIn,
      checkOut,
      availability
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to load availability." });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ message: "Room not found." });
    }

    return res.json(mapRoom(room));
  } catch (error) {
    return res.status(500).json({ message: "Failed to load room details." });
  }
});

router.post(
  "/",
  upload.any(),
  async (req, res) => {
    try {
      const { coverImageFile, galleryFiles, roomTypeFilesByIndex } = extractFilesFromAny(req.files);
      const roomTypes = parseRoomTypes(req.body.roomTypes, roomTypeFilesByIndex);

      if (!roomTypes.length) {
        return res.status(400).json({ message: "Please add at least one room type." });
      }

      const coverImage = coverImageFile
        ? normalizeUploadPath(coverImageFile.path || coverImageFile.filename)
        : "";

      const gallery = Array.isArray(galleryFiles)
        ? galleryFiles.map((file) => normalizeUploadPath(file.path || file.filename))
        : [];

      const room = await Room.create({
        name: String(req.body.name || "").trim(),
        location: String(req.body.location || "").trim(),
        address: String(req.body.address || "").trim(),
        description: String(req.body.description || "").trim(),
        amenities: parseStringList(req.body.amenities, 30),
        nearbyLandmarks: parseStringList(req.body.nearbyLandmarks, 20),
        checkInTime: String(req.body.checkInTime || "12:00").trim(),
        checkOutTime: String(req.body.checkOutTime || "10:00").trim(),
        isActive: parseBoolean(req.body.isActive, true),
        roomTypes,
        coverImage,
        gallery
      });

      return res.status(201).json(mapRoom(room));
    } catch (error) {
      return res.status(400).json({ message: error.message || "Failed to create room." });
    }
  }
);

router.put(
  "/:id",
  upload.any(),
  async (req, res) => {
    try {
      const room = await Room.findById(req.params.id);

      if (!room) {
        return res.status(404).json({ message: "Room not found." });
      }

      room.name = String(req.body.name || room.name).trim();
      room.location = String(req.body.location || room.location).trim();
      room.address = String(req.body.address || room.address).trim();
      room.description = String(req.body.description || room.description).trim();
      room.checkInTime = String(req.body.checkInTime || room.checkInTime || "12:00").trim();
      room.checkOutTime = String(req.body.checkOutTime || room.checkOutTime || "10:00").trim();
      room.isActive = parseBoolean(req.body.isActive, room.isActive);

      if (Object.prototype.hasOwnProperty.call(req.body, "amenities")) {
        room.amenities = parseStringList(req.body.amenities, 30);
      }

      if (Object.prototype.hasOwnProperty.call(req.body, "nearbyLandmarks")) {
        room.nearbyLandmarks = parseStringList(req.body.nearbyLandmarks, 20);
      }

      if (Object.prototype.hasOwnProperty.call(req.body, "roomTypes")) {
        const { roomTypeFilesByIndex } = extractFilesFromAny(req.files);
        const roomTypes = parseRoomTypes(req.body.roomTypes, roomTypeFilesByIndex);

        if (!roomTypes.length) {
          return res.status(400).json({ message: "Please keep at least one room type." });
        }

        room.roomTypes = roomTypes;
      }

      const { coverImageFile, galleryFiles } = extractFilesFromAny(req.files);

      if (coverImageFile) {
        room.coverImage = normalizeUploadPath(
          coverImageFile.path || coverImageFile.filename
        );
      }

      // Handle cover image deletion
      if (req.body.coverImage === "" && !coverImageFile) {
        room.coverImage = "";
      }

      // Handle gallery image updates
      if (galleryFiles && galleryFiles.length > 0) {
        // Keep existing gallery images and add new ones
        const newGalleryImages = galleryFiles.map((file) => normalizeUploadPath(file.path || file.filename));
        room.gallery = [
          ...(Array.isArray(room.gallery) ? room.gallery : []),
          ...newGalleryImages
        ];
      }

      // Handle gallery image deletions
      const deletedGalleryImages = parseJsonValue(req.body.deletedGalleryImages, []);
      if (Array.isArray(deletedGalleryImages) && deletedGalleryImages.length > 0) {
        room.gallery = (Array.isArray(room.gallery) ? room.gallery : []).filter(
          (img) => !deletedGalleryImages.includes(img)
        );
      }

      await room.save();
      return res.json(mapRoom(room));
    } catch (error) {
      return res.status(400).json({ message: error.message || "Failed to update room." });
    }
  }
);

router.delete("/:id", async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ message: "Room not found." });
    }

    const activeBookings = await RoomBooking.countDocuments({
      roomId: room._id,
      status: { $ne: "cancelled" }
    });

    if (activeBookings > 0) {
      return res.status(409).json({
        message: "Cannot delete this room while active bookings exist."
      });
    }

    await room.deleteOne();
    return res.json({ message: "Room deleted." });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete room." });
  }
});

module.exports = router;
