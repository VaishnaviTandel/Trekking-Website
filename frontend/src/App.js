import { useEffect, useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import Home from "./pages/Home";
import Trips from "./pages/Trips";
import TripDetails from "./pages/TripDetails";
import Contact from "./pages/Contact";
import BookingPage from "./pages/BookingPage";
import Rooms from "./pages/Rooms";
import RoomDetails from "./pages/RoomDetails";
import RoomBookingPage from "./pages/RoomBookingPage";

/* ADMIN IMPORTS */
import AdminDashboard from "./admin/AdminDashboard";
import AddTrip from "./admin/AddTrip";
import ManageTrips from "./admin/ManageTrips";
import EditTrip from "./admin/EditTrip";
import AddRoom from "./admin/AddRoom";
import ManageRooms from "./admin/ManageRooms";
import EditRoom from "./admin/EditRoom";
import ContactMessages from "./admin/ContactMessages";
import Bookings from "./admin/Bookings";
import RoomBookings from "./admin/RoomBookings";
import Settings from "./admin/Settings";
import PaymentSettings from "./admin/PaymentSettings";
import AdminLogin from "./admin/AdminLogin";
import AdminRegister from "./admin/AdminRegister";
import ForgotPassword from "./admin/ForgotPassword";
import ResetPassword from "./admin/ResetPassword";
import AdminRoute from "./admin/AdminRoute";

function App() {
  const location = useLocation();
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  const [showMainNavbar, setShowMainNavbar] = useState(true);
  const adminSiteUrl = process.env.REACT_APP_ADMIN_SITE_URL || "";
  const userSiteUrl = process.env.REACT_APP_USER_SITE_URL || "";

  // Check if current page is admin
  const isAdmin = location.pathname.startsWith("/admin");
  const isTripDetailsPage = /^\/trip\/[^/]+/.test(location.pathname);

  useEffect(() => {
    localStorage.setItem("theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const syncTheme = (value) => {
      const nextTheme = value === "dark" ? "dark" : "light";
      setTheme(nextTheme);
    };

    const handleThemeChange = (event) => {
      syncTheme(event?.detail?.theme);
    };

    const handleStorage = (event) => {
      if (event.key === "theme") {
        syncTheme(event.newValue);
      }
    };

    window.addEventListener("themechange", handleThemeChange);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("themechange", handleThemeChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

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

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    let previousScrollY = window.scrollY || 0;

    const handleScroll = () => {
      if (isAdmin || !isTripDetailsPage) {
        setShowMainNavbar(true);
        previousScrollY = window.scrollY || 0;
        return;
      }

      const currentScrollY = window.scrollY || 0;

      if (currentScrollY <= 90) {
        setShowMainNavbar(true);
      } else if (currentScrollY < previousScrollY - 4) {
        setShowMainNavbar(true);
      } else if (currentScrollY > previousScrollY + 4) {
        setShowMainNavbar(false);
      }

      previousScrollY = currentScrollY;
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, [isAdmin, isTripDetailsPage, location.pathname]);

  const toggleTheme = () => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  };

  return (
    <div className={`app-shell ${theme}`}>

      {/* SHOW NAVBAR ONLY FOR USER PAGES */}
      {!isAdmin && showMainNavbar && <Navbar theme={theme} onToggleTheme={toggleTheme} />}

      <Routes>

        {/* USER ROUTES */}

        <Route path="/" element={<Home />} />

        <Route path="/trips" element={<Trips />} />
        <Route path="/rooms" element={<Rooms />} />

        <Route path="/trip/:id" element={<TripDetails />} />
        <Route path="/room/:id" element={<RoomDetails />} />

        <Route path="/contact" element={<Contact />} />
        <Route path="/booking/:tripId" element={<BookingPage />} />
        <Route path="/booking/:id/select" element={<BookingPage />} />
        <Route path="/room-booking/:roomId" element={<RoomBookingPage />} />

        {/* ADMIN AUTH ROUTES */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/register" element={<AdminRegister />} />
        <Route path="/admin/forgot-password" element={<ForgotPassword />} />
        <Route path="/admin/reset-password" element={<ResetPassword />} />

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
          path="/admin/add-room"
          element={
            <AdminRoute>
              <AddRoom />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/rooms"
          element={
            <AdminRoute>
              <ManageRooms />
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
          path="/admin/edit-room/:id"
          element={
            <AdminRoute>
              <EditRoom />
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
          path="/admin/room-bookings"
          element={
            <AdminRoute>
              <RoomBookings />
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
