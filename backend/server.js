const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();
const path = require("path");
const contactRoutes = require("./routes/contact");
const connectDB = require("./config/db");
const tripRoutes = require("./routes/tripRoutes");
const replyRoutes = require("./routes/reply");
const departuresRoute = require("./routes/departures");
const bookingRoutes = require("./routes/bookings");
const adminRoutes = require("./routes/admin");

const app = express();

/* ===============================
   CONNECT DATABASE
================================ */
connectDB();

/* ===============================
   MIDDLEWARE
================================ */

app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ===============================
   STATIC FOLDER FOR IMAGES
================================ */

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ===============================
   ROUTES
================================ */

app.use("/api/trips", tripRoutes);
app.use("/api/contact",contactRoutes);
app.use("/api/reply", replyRoutes);
app.use("/api/trips", departuresRoute);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payment", require("./routes/payment"));
app.use("/api/admin", adminRoutes);

/* ===============================
   TEST ROUTE
================================ */

app.get("/", (req, res) => {
  res.send("Trek Booking API Running");
});

/* ===============================
   SERVER START
================================ */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
