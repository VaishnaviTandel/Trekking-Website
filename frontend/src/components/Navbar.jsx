import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { fetchPublicProfile } from "../services/publicProfile";

const Navbar = ({ theme = "light", onToggleTheme }) => {
  const location = useLocation();
  const [companyName, setCompanyName] = useState("TrekPlatform");
  const [brandLogo, setBrandLogo] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  const logoUrl = brandLogo
    ? /^https?:\/\//i.test(brandLogo)
      ? brandLogo
      : `http://localhost:5000/uploads/${brandLogo}`
    : "";

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      try {
        const profile = await fetchPublicProfile();

        if (mounted) {
          if (profile?.companyName) {
            setCompanyName(profile.companyName);
          }
          setBrandLogo(String(profile?.brandLogo || "").trim());
        }
      } catch (_error) {
        if (mounted) {
          setCompanyName("TrekPlatform");
          setBrandLogo("");
        }
      }
    };

    loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="site-navbar sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-3">
          <div className="flex items-center gap-3 min-w-0 pr-3">
            {logoUrl && (
              <img
                src={logoUrl}
                alt="Brand logo"
                className="w-9 h-9 object-cover rounded-md border border-gray-200 shrink-0"
              />
            )}
            <h1 className="text-lg sm:text-xl font-bold truncate">{companyName}</h1>
          </div>

          <button
            type="button"
            className="md:hidden border rounded-lg px-3 py-2 text-sm"
            onClick={() => setMobileOpen((current) => !current)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? "Close" : "Menu"}
          </button>

          <div className="hidden md:flex gap-6 items-center">
            <Link to="/">Home</Link>
            <Link to="/trips">Treks</Link>
            <Link to="/contact">Contact Us</Link>
            <button
              type="button"
              onClick={onToggleTheme}
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
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden pb-4 border-t border-gray-200/70 pt-3 space-y-3">
            <Link to="/" className="block">
              Home
            </Link>
            <Link to="/trips" className="block">
              Treks
            </Link>
            <Link to="/contact" className="block">
              Contact Us
            </Link>
            <button
              type="button"
              onClick={onToggleTheme}
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
          </div>
        )}
      </div>
    </div>
  );
};

export default Navbar;
