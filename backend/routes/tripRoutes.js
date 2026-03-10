const express = require("express");
const router = express.Router();

const Trip = require("../models/Trip");
const upload = require("../uploads/upload");

const parseDurationDays = (durationText, rawDays) => {
  const numericRawDays = Number(rawDays);

  if (Number.isInteger(numericRawDays) && numericRawDays > 0) {
    return numericRawDays;
  }

  const matched = String(durationText || "").match(/\d+/);
  const parsed = matched ? Number(matched[0]) : 1;

  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
};

const parseDepartures = (rawDepartures, existingDepartures = []) => {
  if (!rawDepartures) {
    return [];
  }

  const parsed =
    typeof rawDepartures === "string"
      ? JSON.parse(rawDepartures)
      : rawDepartures;

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .filter((departure) => departure && departure.date && departure.totalSeats !== "")
    .map((departure) => {
      const existing = departure._id
        ? existingDepartures.id(departure._id)
        : null;

      const totalSeats = Number(departure.totalSeats);
      const bookedSeatsInput = Number(departure.bookedSeats);
      const bookedSeats = Number.isFinite(bookedSeatsInput)
        ? bookedSeatsInput
        : existing?.bookedSeats || 0;

      if (!Number.isInteger(totalSeats) || totalSeats < 1) {
        throw new Error("Each departure must have at least 1 seat.");
      }

      if (bookedSeats < 0) {
        throw new Error("Booked seats cannot be negative.");
      }

      if (totalSeats < bookedSeats) {
        throw new Error("Total seats cannot be less than booked seats.");
      }

      const parsedDate = new Date(departure.date);

      if (Number.isNaN(parsedDate.getTime())) {
        throw new Error("Invalid departure date provided.");
      }

      const batchLabel = String(departure.batchLabel || existing?.batchLabel || "Standard Batch")
        .trim()
        .slice(0, 60);

      if (!batchLabel) {
        throw new Error("Batch label cannot be empty.");
      }

      return {
        _id: existing?._id,
        date: parsedDate,
        batchLabel,
        totalSeats,
        bookedSeats
      };
    });
};


/* ================= ADD TRIP ================= */

router.post(
  "/",
  upload.fields([
    { name: "coverImage", maxCount: 1 },
    { name: "gallery", maxCount: 5 }
  ]),
  async (req, res) => {

    try {

      const coverImage = req.files.coverImage
        ? req.files.coverImage[0].filename
        : "";

      const gallery = req.files.gallery
        ? req.files.gallery.map(file => file.filename)
        : [];

      const trip = new Trip({
        title: req.body.title,
        location: req.body.location,
        price: Number(req.body.price) || 0,
        duration: req.body.duration,
        durationDays: parseDurationDays(req.body.duration, req.body.durationDays),
        difficulty: req.body.difficulty,
        description: req.body.description,
        itinerary: req.body.itinerary,
        departures: parseDepartures(req.body.departures),
        coverImage,
        gallery
      });

      await trip.save();

      res.json(trip);

    } catch (error) {

      console.log(error);
      const isValidationError =
        typeof error.message === "string" &&
        (error.message.includes("departure") || error.message.includes("seat"));

      res.status(isValidationError ? 400 : 500).json({
        message: isValidationError ? error.message : "Error creating trip"
      });

    }

  }
);



/* ================= GET ALL TRIPS ================= */

router.get("/", async (req, res) => {

  try {

    const trips = await Trip.find();

    res.json(trips);

  } catch (error) {

    res.status(500).json({
      message: "Error fetching trips"
    });

  }

});



/* ================= GET SINGLE TRIP ================= */

router.get("/:id", async (req, res) => {

  try {

    const trip = await Trip.findById(req.params.id);

    res.json(trip);

  } catch (error) {

    res.status(500).json({
      message: "Trip not found"
    });

  }

});



/* ================= UPDATE TRIP ================= */

router.put(
  "/:id",
  upload.fields([
    { name: "coverImage", maxCount: 1 },
    { name: "gallery", maxCount: 5 }
  ]),
  async (req, res) => {

    try {

      const trip = await Trip.findById(req.params.id);

      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      /* Update text fields */

      trip.title = req.body.title || trip.title;
      trip.location = req.body.location || trip.location;
      trip.price = req.body.price ? Number(req.body.price) : trip.price;
      trip.duration = req.body.duration || trip.duration;
      trip.durationDays = parseDurationDays(
        req.body.duration || trip.duration,
        req.body.durationDays || trip.durationDays
      );
      trip.difficulty = req.body.difficulty || trip.difficulty;
      trip.description = req.body.description || trip.description;
      trip.itinerary = req.body.itinerary || trip.itinerary;

      if (Object.prototype.hasOwnProperty.call(req.body, "departures")) {
        trip.departures = parseDepartures(req.body.departures, trip.departures);
      }


      /* Update Cover Image */

      if (req.files && req.files.coverImage) {

        trip.coverImage = req.files.coverImage[0].filename;

      }


      /* Update Gallery */

      if (req.files && req.files.gallery) {

        trip.gallery = req.files.gallery.map(
          file => file.filename
        );

      }


      await trip.save();

      res.json(trip);

    } catch (error) {

      console.log(error);
      const isValidationError =
        typeof error.message === "string" &&
        (error.message.includes("departure") || error.message.includes("seat"));

      res.status(isValidationError ? 400 : 500).json({
        message: isValidationError ? error.message : "Error updating trip"
      });

    }

  }
);



/* ================= DELETE TRIP ================= */

router.delete("/:id", async (req, res) => {

  try {

    await Trip.findByIdAndDelete(req.params.id);

    res.json({
      message: "Trip Deleted"
    });

  } catch (error) {

    res.status(500).json({
      message: "Error deleting trip"
    });

  }

});


module.exports = router;
