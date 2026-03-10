import { Routes, Route, useLocation } from "react-router-dom";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import Home from "./pages/Home";
import Trips from "./pages/Trips";
import TripDetails from "./pages/TripDetails";
import Contact from "./pages/Contact";
import BookingPage from "./pages/BookingPage";

/* ADMIN IMPORTS */
import AdminDashboard from "./admin/AdminDashboard";
import AddTrip from "./admin/AddTrip";
import ManageTrips from "./admin/ManageTrips";
import EditTrip from "./admin/EditTrip";
import ContactMessages from "./admin/ContactMessages";
import Bookings from "./admin/Bookings";

function App() {

  const location = useLocation();

  // Check if current page is admin
  const isAdmin = location.pathname.startsWith("/admin");

  return (

    <div>

      {/* SHOW NAVBAR ONLY FOR USER PAGES */}

      {!isAdmin && <Navbar />}

      <Routes>

        {/* USER ROUTES */}

        <Route path="/" element={<Home />} />

        <Route path="/trips" element={<Trips />} />

        <Route path="/trip/:id" element={<TripDetails />} />

        <Route path="/contact" element={<Contact />} />
        <Route path="/booking/:id" element={<BookingPage />} />

        {/* ADMIN ROUTES */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/add-trip" element={<AddTrip />} />

        <Route path="/admin/trips" element={<ManageTrips />} />

        <Route path="/admin/edit/:id" element={<EditTrip />} />

        <Route path="/admin/messages" element={<ContactMessages />} />
        <Route path="/admin/bookings" element={<Bookings />} />

      </Routes>

      {/* SHOW FOOTER ONLY FOR USER PAGES */}

      {!isAdmin && <Footer />}

    </div>

  );

}

export default App;
