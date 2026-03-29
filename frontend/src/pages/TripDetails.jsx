import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { getTripById, getTrips } from "../services/api";
import { getRooms } from "../services/rooms";

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

const getSeatsLeft = (departure) =>
  Math.max(0, Number(departure?.totalSeats || 0) - Number(departure?.bookedSeats || 0));

const getImageUrl = (imagePath = "") => {
  if (!imagePath) {
    return "";
  }

  if (/^https?:\/\//i.test(imagePath)) {
    return imagePath;
  }

  return `${API_BASE}/uploads/${imagePath}`;
};

const TripDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [trip, setTrip] = useState(null);
  const [otherTrips, setOtherTrips] = useState([]);
  const [nearbyRooms, setNearbyRooms] = useState([]);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const durationDays = parseDurationDays(trip);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tripData, tripsData] = await Promise.all([getTripById(id), getTrips()]);
        setTrip(tripData);
        setOtherTrips(tripsData);

        const roomData = await getRooms({
          active: true,
          location: tripData?.location || ""
        });
        setNearbyRooms((Array.isArray(roomData) ? roomData : []).slice(0, 4));
      } catch (error) {
        console.error("Error loading trip:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  useEffect(() => {
    setActiveGalleryIndex(0);
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

  const galleryImages = useMemo(() => {
    const gallery = Array.isArray(trip?.gallery) ? trip.gallery.filter(Boolean) : [];

    if (gallery.length > 0) {
      return gallery;
    }

    return trip?.coverImage ? [trip.coverImage] : [];
  }, [trip]);

  if (loading) {
    return <div className="p-10 text-center text-lg font-semibold">Loading trek details...</div>;
  }

  if (!trip) {
    return <div className="p-10 text-center text-red-500">Trek not found.</div>;
  }

  const primaryBookDate = visibleDepartures.find((departure) => getSeatsLeft(departure) > 0);

  return (
    <div className="bg-gray-50 min-h-screen">
      <div
        className="h-[300px] sm:h-[360px] md:h-[420px] bg-cover bg-center flex items-end"
        style={{
          backgroundImage: `url(${API_BASE}/uploads/${trip.coverImage})`
        }}
      >
        <div className="bg-black/60 w-full p-4 sm:p-6 lg:p-10 text-white">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">{trip.title}</h1>
          <p className="mt-2 text-sm sm:text-base md:text-lg">
            {trip.location} | {trip.duration}
          </p>
        </div>
      </div>

      <div className="sticky top-0 bg-white border-b shadow-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 overflow-x-auto">
          <div className="flex gap-6 sm:gap-10 text-sm font-semibold text-gray-700 min-w-max">
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
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid lg:grid-cols-3 gap-6 lg:gap-10 px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="lg:col-span-2">
          <section id="overview" className="scroll-mt-24">
            <h2 className="text-2xl font-bold mb-4">Overview</h2>

            <p className="text-gray-700 mb-6 whitespace-pre-line">{trip.description}</p>

            <div className="bg-white border rounded-lg p-5">
              <h3 className="text-lg font-semibold mb-4">Departure Snapshot</h3>

              {visibleDepartures.length ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {visibleDepartures.slice(0, 4).map((departure) => {
                    const seatsLeft = getSeatsLeft(departure);
                    const totalSeats = Number(departure.totalSeats || 0);
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
                        className="trip-snapshot-card text-left border rounded p-3 hover:border-green-500 disabled:opacity-50"
                      >
                        <p className="font-semibold">{departure.batchLabel || "Standard Batch"}</p>
                        <p className="text-sm trip-card-meta mt-1">
                          {formatDateRange(departure.date, endDate)}
                        </p>
                        <p className="text-sm trip-card-meta mt-1">
                          {seatsLeft <= 0 ? "Sold Out" : `${seatsLeft} / ${totalSeats} seats left`}
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

            {galleryImages.length > 0 ? (
              <div className="bg-white border rounded-xl p-4">
                <div className="relative max-w-2xl">
                  <img
                    src={getImageUrl(galleryImages[activeGalleryIndex])}
                    alt={`${trip.title} ${activeGalleryIndex + 1}`}
                    className="w-full h-48 sm:h-52 md:h-56 object-contain bg-slate-100 rounded-lg shadow-sm"
                  />

                  {galleryImages.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveGalleryIndex((current) =>
                            current === 0 ? galleryImages.length - 1 : current - 1
                          )
                        }
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 text-white text-lg hover:bg-black/80"
                        aria-label="Previous photo"
                      >
                        {"<"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setActiveGalleryIndex((current) =>
                            current === galleryImages.length - 1 ? 0 : current + 1
                          )
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 text-white text-lg hover:bg-black/80"
                        aria-label="Next photo"
                      >
                        {">"}
                      </button>
                    </>
                  )}
                </div>

                {galleryImages.length > 1 && (
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {galleryImages.map((img, index) => (
                      <button
                        key={`${img}-${index}`}
                        type="button"
                        onClick={() => setActiveGalleryIndex(index)}
                        className={`shrink-0 rounded-md overflow-hidden border ${
                          index === activeGalleryIndex ? "border-green-500" : "border-gray-200"
                        }`}
                        aria-label={`Show photo ${index + 1}`}
                      >
                        <img
                          src={getImageUrl(img)}
                          alt={`${trip.title} thumbnail ${index + 1}`}
                          className="w-16 h-12 object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-600">No gallery images available.</p>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {visibleDepartures.map((departure) => {
                const seatsLeft = getSeatsLeft(departure);
                const totalSeats = Number(departure.totalSeats || 0);
                const endDate = addDays(departure.date, durationDays - 1);

                return (
                  <div
                    key={departure._id}
                    className={`trip-departure-card p-4 rounded-lg border text-center ${
                      seatsLeft === 0 ? "is-sold" : "is-open"
                    }`}
                  >
                    <p className="font-semibold">{departure.batchLabel || "Standard Batch"}</p>
                    <p className="text-sm mt-1 trip-card-meta">
                      {formatDateRange(departure.date, endDate)}
                    </p>
                    <p className="text-sm mt-1 trip-card-meta">
                      {seatsLeft === 0 ? "Sold Out" : `${seatsLeft} / ${totalSeats} seats left`}
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
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-lg lg:sticky lg:top-24">
            <h2 className="text-3xl font-bold text-green-600">INR {trip.price}</h2>
            <p className="text-gray-500 mb-4">Admin Confirmation + Invoice by Email</p>

            <button
              type="button"
              onClick={() =>
                navigate(
                  `/booking/${trip._id}${primaryBookDate ? `?date=${toDateKey(primaryBookDate.date)}` : ""}`
                )
              }
              disabled={!visibleDepartures.length}
              className="w-full mt-2 bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
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

          <div className="bg-white p-6 rounded-xl shadow">
            <h3 className="text-lg font-bold mb-4">Nearby Stay Options</h3>

            {nearbyRooms.length === 0 ? (
              <p className="text-sm text-gray-600">No nearby rooms added yet.</p>
            ) : (
              nearbyRooms.map((room) => (
                <Link
                  to={`/room/${room._id}`}
                  key={room._id}
                  className="flex items-center gap-3 mb-4 hover:bg-gray-100 p-2 rounded transition"
                >
                  <img
                    src={
                      room.coverImage
                        ? /^https?:\/\//i.test(room.coverImage)
                          ? room.coverImage
                          : `${API_BASE}/uploads/${room.coverImage}`
                        : "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=640&q=80"
                    }
                    alt={room.name}
                    className="w-16 h-12 object-cover rounded"
                  />

                  <div>
                    <p className="text-sm font-semibold">{room.name}</p>
                    <p className="text-xs text-gray-500">Starts from INR {room.startingPrice}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TripDetails;
