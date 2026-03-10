import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { getTripById, getTrips } from "../services/api";

const API_BASE = "http://localhost:5000";

const toDateKey = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const parseDurationDays = (trip) => {
  const parsed = Number(trip?.durationDays);

  if (Number.isInteger(parsed) && parsed > 0) {
    return parsed;
  }

  const matched = String(trip?.duration || "").match(/\d+/);
  const fromText = matched ? Number(matched[0]) : 1;

  return Number.isInteger(fromText) && fromText > 0 ? fromText : 1;
};

const addDays = (value, daysToAdd) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setDate(date.getDate() + daysToAdd);
  return date;
};

const formatDate = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};

const formatDateRange = (startDate, endDate) => {
  const start = formatDate(startDate);
  const end = formatDate(endDate);

  if (start === end) {
    return start;
  }

  return `${start} to ${end}`;
};

const TripDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [trip, setTrip] = useState(null);
  const [otherTrips, setOtherTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const durationDays = parseDurationDays(trip);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const tripData = await getTripById(id);
        const tripsData = await getTrips();

        setTrip(tripData);
        setOtherTrips(tripsData);
      } catch (error) {
        console.error("Error loading trip:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const sortedDepartures = useMemo(() => {
    if (!trip?.departures?.length) {
      return [];
    }

    return [...trip.departures].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [trip]);

  const todayKey = toDateKey(new Date());

  const visibleDepartures = useMemo(() => {
    const upcoming = sortedDepartures.filter((departure) => toDateKey(departure.date) >= todayKey);

    return upcoming.length ? upcoming : sortedDepartures;
  }, [sortedDepartures, todayKey]);

  if (loading) {
    return <div className="p-10 text-center text-lg font-semibold">Loading trek details...</div>;
  }

  if (!trip) {
    return <div className="p-10 text-center text-red-500">Trek not found.</div>;
  }

  const primaryBookDate = visibleDepartures.find(
    (departure) => departure.totalSeats - departure.bookedSeats > 0
  );

  return (
    <div className="bg-gray-50 min-h-screen">
      <div
        className="h-[420px] bg-cover bg-center flex items-end"
        style={{
          backgroundImage: `url(${API_BASE}/uploads/${trip.coverImage})`
        }}
      >
        <div className="bg-black/60 w-full p-10 text-white">
          <h1 className="text-4xl font-bold">{trip.title}</h1>
          <p className="mt-2 text-lg">
            {trip.location} | {trip.duration}
          </p>
        </div>
      </div>

      <div className="sticky top-0 bg-white border-b shadow-sm z-50">
        <div className="max-w-7xl mx-auto flex gap-10 px-10 py-4 text-sm font-semibold text-gray-700">
          <a href="#overview" className="hover:text-green-600">
            Overview
          </a>
          <a href="#gallery" className="hover:text-green-600">
            Photo Gallery
          </a>
          <a href="#itinerary" className="hover:text-green-600">
            Itinerary
          </a>
          <a href="#departures" className="hover:text-green-600">
            Dates
          </a>
          <a href="#reviews" className="hover:text-green-600">
            Reviews
          </a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-10 p-10">
        <div className="md:col-span-2">
          <section id="overview" className="scroll-mt-24">
            <h2 className="text-2xl font-bold mb-4">Overview</h2>

            <p className="text-gray-700 mb-6 whitespace-pre-line">{trip.description}</p>

            <div className="bg-white border rounded-lg p-5">
              <h3 className="text-lg font-semibold mb-4">Departure Snapshot</h3>

              {visibleDepartures.length ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {visibleDepartures.slice(0, 4).map((departure) => {
                    const seatsLeft = departure.totalSeats - departure.bookedSeats;
                    const departureKey = toDateKey(departure.date);
                    const endDate = addDays(departure.date, durationDays - 1);

                    return (
                      <button
                        key={departure._id}
                        type="button"
                        onClick={() =>
                          navigate(`/booking/${trip._id}?date=${departureKey}&batch=${departure._id}`)
                        }
                        disabled={seatsLeft <= 0}
                        className="text-left border rounded p-3 hover:border-green-500 disabled:opacity-50"
                      >
                        <p className="font-semibold">{departure.batchLabel || "Standard Batch"}</p>
                        <p className="text-sm text-gray-700 mt-1">
                          {formatDateRange(departure.date, endDate)}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {seatsLeft <= 0 ? "Sold Out" : `${seatsLeft} seats left`}
                        </p>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-600">No departures available right now.</p>
              )}
            </div>
          </section>

          <section id="gallery" className="scroll-mt-24 mt-10">
            <h2 className="text-2xl font-bold mb-6">Photo Gallery</h2>

            {trip.gallery && trip.gallery.length > 0 && (
              <div className="relative flex items-center">
                <button
                  onClick={() =>
                    setGalleryIndex((prev) =>
                      prev === 0 ? trip.gallery.length - 2 : prev - 1
                    )
                  }
                  className="absolute left-0 z-10 bg-white shadow p-2 rounded-full"
                >
                  &lt;
                </button>

                <div className="flex gap-4 mx-10">
                  {trip.gallery.slice(galleryIndex, galleryIndex + 2).map((img, index) => (
                    <img
                      key={index}
                      src={`${API_BASE}/uploads/${img}`}
                      alt="trek"
                      className="w-64 h-44 object-cover rounded-lg shadow hover:scale-105 transition"
                    />
                  ))}
                </div>

                <button
                  onClick={() =>
                    setGalleryIndex((prev) =>
                      prev + 2 >= trip.gallery.length ? 0 : prev + 1
                    )
                  }
                  className="absolute right-0 z-10 bg-white shadow p-2 rounded-full"
                >
                  &gt;
                </button>
              </div>
            )}
          </section>

          <section id="itinerary" className="scroll-mt-24 mt-10">
            <h2 className="text-2xl font-bold mb-4">Itinerary</h2>

            <ul className="list-disc ml-5 space-y-2 text-gray-700">
              {trip.itinerary?.split("\n").map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </section>

          <section id="departures" className="scroll-mt-24 mt-12">
            <h2 className="text-2xl font-bold mb-6">Available Departures</h2>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {visibleDepartures.map((departure) => {
                const seatsLeft = departure.totalSeats - departure.bookedSeats;
                const endDate = addDays(departure.date, durationDays - 1);

                return (
                  <div
                    key={departure._id}
                    className={`p-4 rounded-lg border text-center ${
                      seatsLeft === 0 ? "bg-red-100" : "bg-green-100"
                    }`}
                  >
                    <p className="font-semibold">{departure.batchLabel || "Standard Batch"}</p>

                    <p className="text-sm mt-1">{formatDateRange(departure.date, endDate)}</p>

                    <p className="text-sm mt-1">
                      {seatsLeft === 0 ? "Sold Out" : `${seatsLeft} seats left`}
                    </p>

                    <button
                      disabled={seatsLeft === 0}
                      onClick={() =>
                        navigate(
                          `/booking/${trip._id}?date=${toDateKey(departure.date)}&batch=${departure._id}`
                        )
                      }
                      className="mt-2 bg-green-600 text-white px-3 py-1 rounded disabled:bg-gray-400"
                    >
                      Book Now
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          <section id="reviews" className="scroll-mt-24 mt-10">
            <h2 className="text-2xl font-bold mb-4">Reviews</h2>

            <p className="text-gray-600">No reviews yet.</p>
          </section>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-lg sticky top-24">
            <h2 className="text-3xl font-bold text-green-600">INR {trip.price}</h2>

            <p className="text-gray-500 mb-4">Admin Confirmation + Invoice by Email</p>

            <button
              type="button"
              onClick={() =>
                navigate(
                  `/booking/${trip._id}${
                    primaryBookDate ? `?date=${toDateKey(primaryBookDate.date)}` : ""
                  }`
                )
              }
              className="w-full mt-2 bg-green-600 text-white py-2 rounded hover:bg-green-700"
            >
              Book This Trek
            </button>
          </div>

          <div className="bg-white p-6 rounded-xl shadow">
            <h3 className="text-lg font-bold mb-4">Other Treks</h3>

            {otherTrips
              .filter((trek) => trek._id !== trip._id)
              .slice(0, 4)
              .map((trek) => (
                <Link
                  to={`/trip/${trek._id}`}
                  key={trek._id}
                  className="flex items-center gap-3 mb-4 hover:bg-gray-100 p-2 rounded transition"
                >
                  <img
                    src={`${API_BASE}/uploads/${trek.coverImage}`}
                    alt={trek.title}
                    className="w-16 h-12 object-cover rounded"
                  />

                  <div>
                    <p className="text-sm font-semibold">{trek.title}</p>
                    <p className="text-xs text-gray-500">INR {trek.price}</p>
                  </div>
                </Link>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TripDetails;
