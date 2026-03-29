import { useEffect, useMemo, useState } from "react";
import { getTrips } from "../services/api";
import TrekCard from "../components/TrekCard";
import RoomCard from "../components/RoomCard";
import { Link } from "react-router-dom";
import { fetchPublicProfile } from "../services/publicProfile";
import { getRooms } from "../services/rooms";

const typingLines = [
  "Explore Beautiful Treks...",
  "Weekend Adventures Await...",
  "Book Your Next Summit..."
];

const FALLBACK_HERO =
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1900&q=80";

const Home = () => {
  const [trips, setTrips] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [scrollY, setScrollY] = useState(0);
  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [heroImage, setHeroImage] = useState(FALLBACK_HERO);

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const [tripsData, roomsData] = await Promise.all([getTrips(), getRooms({ active: true })]);
        setTrips((Array.isArray(tripsData) ? tripsData : []).slice(0, 6));
        setRooms((Array.isArray(roomsData) ? roomsData : []).slice(0, 6));
      } catch (_error) {
        setTrips([]);
        setRooms([]);
      }
    };

    fetchHomeData();
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      try {
        const profile = await fetchPublicProfile();

        if (!mounted) {
          return;
        }

        const image = String(profile?.mainBackgroundImage || "").trim();

        if (!image) {
          setHeroImage(FALLBACK_HERO);
          return;
        }

        if (/^https?:\/\//i.test(image)) {
          setHeroImage(image);
          return;
        }

        setHeroImage(`http://localhost:5000/uploads/${image}`);
      } catch (_error) {
        if (mounted) {
          setHeroImage(FALLBACK_HERO);
        }
      }
    };

    loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY || 0);

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const currentLine = typingLines[lineIndex];

    const timeout = setTimeout(
      () => {
        if (!isDeleting && charIndex < currentLine.length) {
          setCharIndex((current) => current + 1);
          return;
        }

        if (!isDeleting && charIndex === currentLine.length) {
          setIsDeleting(true);
          return;
        }

        if (isDeleting && charIndex > 0) {
          setCharIndex((current) => current - 1);
          return;
        }

        setIsDeleting(false);
        setLineIndex((current) => (current + 1) % typingLines.length);
      },
      isDeleting ? 45 : 95
    );

    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, lineIndex]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.15
      }
    );

    const elements = document.querySelectorAll(".scroll-reveal");
    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [trips]);

  const typedText = useMemo(
    () => typingLines[lineIndex].slice(0, charIndex),
    [lineIndex, charIndex]
  );

  return (
    <div>
      <section className="relative h-[460px] sm:h-[520px] overflow-hidden flex items-center justify-center">
        <div
          className="absolute inset-0 bg-cover bg-center scale-110"
          style={{
            backgroundImage: `url(${heroImage})`,
            transform: `translateY(${Math.min(scrollY * 0.35, 180)}px) scale(1.12)`
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/50 to-black/70" />

        <div className="relative z-10 bg-black/45 backdrop-blur-sm border border-white/20 p-6 sm:p-8 md:p-10 rounded-2xl text-center max-w-3xl mx-4 sm:mx-5 animate-fadeUp">
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-3 min-h-[74px] md:min-h-[90px]">
            {typedText}
            <span className="typing-caret">|</span>
          </h1>

          <p className="text-white/90 text-sm md:text-base mb-7">
            Curated mountain experiences with fixed departures and instant booking flow.
          </p>

          <Link
            to="/trips"
            className="floating-cta inline-flex items-center justify-center bg-green-500 hover:bg-green-600 text-white px-7 py-3 rounded-xl font-semibold transition"
          >
            Explore Treks
          </Link>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h2 className="text-3xl font-bold mb-8 text-center">Popular Treks</h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {trips.map((trip, index) => (
            <div
              key={trip._id}
              className="scroll-reveal"
              style={{ transitionDelay: `${index * 90}ms` }}
            >
              <TrekCard trip={trip} />
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-14">
        <div className="flex items-end justify-between gap-4 mb-8">
          <h2 className="text-3xl font-bold">Available Rooms</h2>
          <Link to="/rooms" className="text-green-700 font-semibold hover:underline">
            View All Rooms
          </Link>
        </div>

        {rooms.length === 0 ? (
          <p className="text-center text-gray-600">Room inventory will be visible here once admin adds rooms.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {rooms.map((room) => (
              <RoomCard key={room._id} room={room} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Home;
