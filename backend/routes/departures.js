const express = require("express");
const router = express.Router();
const Trip = require("../models/Trip");

router.get("/:id/departures", async (req, res) => {

  try {

    const trip = await Trip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    res.json(trip.departures);

  } catch (error) {

    res.status(500).json({message:"Error fetching departures"});

  }

});

module.exports = router;
