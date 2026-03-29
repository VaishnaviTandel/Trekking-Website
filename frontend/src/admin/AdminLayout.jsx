import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { clearAdminSession, getAdminProfileFromStorage } from "../services/adminAuth";

export default function AdminLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const admin = getAdminProfileFromStorage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");

  const applyTheme = (nextTheme) => {
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("themechange", { detail: { theme: nextTheme } }));
    }
  };

  const handleToggleTheme = () => {
    applyTheme(theme === "dark" ? "light" : "dark");
  };

  const handleLogout = () => {
    clearAdminSession();
    navigate("/admin/login", { replace: true });
  };

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="lg:hidden sticky top-0 z-40 bg-gray-900 text-white px-4 py-3 flex items-center justify-between">
        <p className="font-semibold">Trek Admin</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleTheme}
            className="theme-toggle inline-flex items-center gap-2 border rounded-full px-3 py-1 text-sm"
            aria-label="Toggle theme"
          >
            <span>{theme === "dark" ? "Dark" : "Light"}</span>
            <span className="relative w-10 h-5 rounded-full bg-gray-400/60">
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
                  theme === "dark" ? "left-5" : "left-0.5"
                }`}
              />
            </span>
          </button>
          <button
            type="button"
            className="border border-gray-600 rounded px-3 py-1 text-sm"
            onClick={() => setMobileOpen((current) => !current)}
            aria-expanded={mobileOpen}
            aria-label="Toggle admin menu"
          >
            {mobileOpen ? "Close" : "Menu"}
          </button>
        </div>
      </header>

      <div className="flex min-h-screen lg:min-h-0">
        {mobileOpen && (
          <button
            type="button"
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close admin menu overlay"
          />
        )}

        <aside
          className={`fixed lg:static top-0 left-0 h-full w-72 lg:w-64 bg-gray-900 text-white p-6 z-50 transform transition-transform duration-200 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          <h1 className="text-xl font-bold mb-8">Trek Admin</h1>

          {admin?.fullName && (
            <p className="text-xs text-gray-300 mb-5">Logged in as {admin.fullName}</p>
          )}

          <button
            type="button"
            onClick={handleToggleTheme}
            className="theme-toggle w-full inline-flex items-center justify-center gap-2 border rounded-full px-3 py-2 text-sm mb-6"
            aria-label="Toggle theme"
          >
            <span>{theme === "dark" ? "Dark" : "Light"}</span>
            <span className="relative w-10 h-5 rounded-full bg-gray-400/60">
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
                  theme === "dark" ? "left-5" : "left-0.5"
                }`}
              />
            </span>
          </button>

          <nav className="flex flex-col gap-4">
            <Link to="/admin" className="hover:text-green-400">
              Dashboard
            </Link>
            <Link to="/admin/add-trip" className="hover:text-green-400">
              Add Trip
            </Link>
            <Link to="/admin/trips" className="hover:text-green-400">
              Manage Trips
            </Link>
            <Link to="/admin/add-room" className="hover:text-green-400">
              Add Room
            </Link>
            <Link to="/admin/rooms" className="hover:text-green-400">
              Manage Rooms
            </Link>
            <Link to="/admin/messages" className="hover:text-green-400">
              Contact Messages
            </Link>
            <Link to="/admin/bookings" className="hover:text-green-400">
              Trek Bookings
            </Link>
            <Link to="/admin/room-bookings" className="hover:text-green-400">
              Room Bookings
            </Link>
            <Link to="/admin/settings" className="hover:text-green-400">
              Settings
            </Link>
            <Link to="/admin/payment-settings" className="hover:text-green-400">
              Payment Settings
            </Link>
          </nav>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-8 w-full bg-gray-700 hover:bg-gray-600 py-2 rounded text-sm"
          >
            Logout
          </button>
        </aside>

        <main className="flex-1 min-w-0 bg-gray-100 lg:ml-0">{children}</main>
      </div>
    </div>
  );
}
