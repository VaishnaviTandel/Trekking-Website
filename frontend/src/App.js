import { useEffect, useState } from "react";
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
import Settings from "./admin/Settings";
import PaymentSettings from "./admin/PaymentSettings";
import AdminLogin from "./admin/AdminLogin";
import AdminRegister from "./admin/AdminRegister";
import AdminRoute from "./admin/AdminRoute";

function App() {
  const location = useLocation();
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  const adminSiteUrl = process.env.REACT_APP_ADMIN_SITE_URL || "";
  const userSiteUrl = process.env.REACT_APP_USER_SITE_URL || "";

  // Check if current page is admin
  const isAdmin = location.pathname.startsWith("/admin");

  useEffect(() => {
    localStorage.setItem("theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const currentOrigin = window.location.origin;
    const pathWithQuery = `${location.pathname}${location.search || ""}`;

    if (isAdmin && adminSiteUrl) {
      try {
        const target = new URL(adminSiteUrl);
        if (target.origin !== currentOrigin) {
          window.location.href = `${target.origin}${pathWithQuery}`;
        }
      } catch (_error) {
        // Ignore invalid URL env configuration
      }
      return;
    }

    if (!isAdmin && userSiteUrl) {
      try {
        const target = new URL(userSiteUrl);
        if (target.origin !== currentOrigin) {
          window.location.href = `${target.origin}${pathWithQuery}`;
        }
      } catch (_error) {
        // Ignore invalid URL env configuration
      }
    }
  }, [adminSiteUrl, userSiteUrl, isAdmin, location.pathname, location.search]);

  const toggleTheme = () => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  };

  return (
    <div className={`app-shell ${theme}`}>

      {/* SHOW NAVBAR ONLY FOR USER PAGES */}
      {!isAdmin && <Navbar theme={theme} onToggleTheme={toggleTheme} />}

      <Routes>

        {/* USER ROUTES */}

        <Route path="/" element={<Home />} />

        <Route path="/trips" element={<Trips />} />

        <Route path="/trip/:id" element={<TripDetails />} />

        <Route path="/contact" element={<Contact />} />
        <Route path="/booking/:tripId" element={<BookingPage />} />
        <Route path="/booking/:id/select" element={<BookingPage />} />

        {/* ADMIN AUTH ROUTES */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/register" element={<AdminRegister />} />

        {/* PROTECTED ADMIN ROUTES */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/add-trip"
          element={
            <AdminRoute>
              <AddTrip />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/trips"
          element={
            <AdminRoute>
              <ManageTrips />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/edit/:id"
          element={
            <AdminRoute>
              <EditTrip />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/messages"
          element={
            <AdminRoute>
              <ContactMessages />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/bookings"
          element={
            <AdminRoute>
              <Bookings />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <AdminRoute>
              <Settings />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/payment-settings"
          element={
            <AdminRoute>
              <PaymentSettings />
            </AdminRoute>
          }
        />

      </Routes>

      {/* SHOW FOOTER ONLY FOR USER PAGES */}

      {!isAdmin && <Footer />}

    </div>
  );
}

export default App;
