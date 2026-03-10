const Trip = require("../models/Trip");


/* ================= CREATE TRIP ================= */

exports.createTrip = async (req, res) => {

  try {

    const coverImage = req.files?.coverImage
      ? req.files.coverImage[0].filename
      : "";

    const gallery = req.files?.gallery
      ? req.files.gallery.map(file => file.filename)
      : [];

    const trip = new Trip({
      title: req.body.title,
      location: req.body.location,
      price: req.body.price,
      duration: req.body.duration,
      difficulty: req.body.difficulty,
      description: req.body.description,
      itinerary: req.body.itinerary,
      coverImage,
      gallery
    });

    await trip.save();

    res.status(201).json(trip);

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Error creating trip"
    });

  }

};



/* ================= GET ALL TRIPS ================= */

exports.getTrips = async (req, res) => {

  try {

    const trips = await Trip.find();

    res.json(trips);

  } catch (error) {

    res.status(500).json({
      message: "Error fetching trips"
    });

  }

};



/* ================= GET SINGLE TRIP ================= */

exports.getTrip = async (req, res) => {

  try {

    const trip = await Trip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({
        message: "Trip not found"
      });
    }

    res.json(trip);

  } catch (error) {

    res.status(500).json({
      message: "Error fetching trip"
    });

  }

};



/* ================= UPDATE TRIP ================= */

exports.updateTrip = async (req, res) => {

  try {

    const trip = await Trip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({
        message: "Trip not found"
      });
    }

    /* Update text fields */

    trip.title = req.body.title || trip.title;
    trip.location = req.body.location || trip.location;
    trip.price = req.body.price || trip.price;
    trip.duration = req.body.duration || trip.duration;
    trip.difficulty = req.body.difficulty || trip.difficulty;
    trip.description = req.body.description || trip.description;
    trip.itinerary = req.body.itinerary || trip.itinerary;


    /* Update cover image */

    if (req.files?.coverImage) {

      trip.coverImage = req.files.coverImage[0].filename;

    }


    /* Update gallery */

    if (req.files?.gallery) {

      trip.gallery = req.files.gallery.map(file => file.filename);

    }


    await trip.save();

    res.json(trip);

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Error updating trip"
    });

  }

};



/* ================= DELETE TRIP ================= */

exports.deleteTrip = async (req, res) => {

  try {

    const trip = await Trip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({
        message: "Trip not found"
      });
    }

    await Trip.findByIdAndDelete(req.params.id);

    res.json({
      message: "Trip deleted successfully"
    });

  } catch (error) {

    res.status(500).json({
      message: "Error deleting trip"
    });

  }

};