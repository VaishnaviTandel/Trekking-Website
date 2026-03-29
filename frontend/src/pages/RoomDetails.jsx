import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getRoomAvailability, getRoomById, getRooms } from "../services/rooms";
import RoomTypeDetailsModal from "../components/RoomTypeDetailsModal";

const API_BASE = "https://southfriends.onrender.com";

const formatPrice = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(value) || 0);

const toImageUrl = (imagePath = "") => {
  if (!imagePath) {
    return "";
  }

  if (/^https?:\/\//i.test(imagePath)) {
    return imagePath;
  }

  return `${API_BASE}/uploads/${imagePath}`;
};

const toInputDate = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().split("T")[0];
};

const addDays = (value, daysToAdd) => {
  const date = new Date(value);
  date.setDate(date.getDate() + daysToAdd);
  return toInputDate(date);
};

export default function RoomDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [otherRooms, setOtherRooms] = useState([]);

  const [checkIn, setCheckIn] = useState(searchParams.get("checkIn") || addDays(new Date(), 1));
  const [checkOut, setCheckOut] = useState(searchParams.get("checkOut") || addDays(new Date(), 2));
  const [selectedTypeId, setSelectedTypeId] = useState(searchParams.get("type") || "");
  const [selectedTypeImageIndex, setSelectedTypeImageIndex] = useState(0);
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
  const [selectedGalleryImageIndex, setSelectedGalleryImageIndex] = useState(0);
  const [availabilityByType, setAvailabilityByType] = useState({});
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");

  useEffect(() => {
    const fetchRoom = async () => {
      setLoading(true);
      setError("");

      try {
        const [roomData, roomsData] = await Promise.all([getRoomById(id), getRooms({ active: true })]);
        setRoom(roomData);
        setOtherRooms((Array.isArray(roomsData) ? roomsData : []).filter((item) => item._id !== id).slice(0, 4));

        const roomTypes = Array.isArray(roomData?.roomTypes) ? roomData.roomTypes : [];
        const activeTypes = roomTypes.filter((type) => type?.isActive !== false);

        setSelectedTypeId((current) => {
          const hasSelectedType = activeTypes.some(
            (type) => String(type._id) === String(current)
          );

          if ((!current || !hasSelectedType) && activeTypes.length) {
            return String(activeTypes[0]._id);
          }

          return current;
        });
      } catch (apiError) {
        setError(apiError?.response?.data?.message || "Failed to load room details.");
      } finally {
        setLoading(false);
      }
    };

    fetchRoom();
  }, [id]);

  useEffect(() => {
    const fetchAvailability = async () => {
      if (!room?._id || !checkIn || !checkOut) {
        return;
      }

      setAvailabilityLoading(true);
      setAvailabilityError("");

      try {
        const data = await getRoomAvailability(room._id, { checkIn, checkOut });
        const mapped = (data?.availability || []).reduce((acc, typeAvailability) => {
          acc[String(typeAvailability.roomTypeId)] = typeAvailability;
          return acc;
        }, {});
        setAvailabilityByType(mapped);
      } catch (apiError) {
        setAvailabilityError(apiError?.response?.data?.message || "Failed to check room availability.");
        setAvailabilityByType({});
      } finally {
        setAvailabilityLoading(false);
      }
    };

    fetchAvailability();
  }, [room?._id, checkIn, checkOut]);

  const galleryImages = useMemo(() => {
    if (!room) {
      return [];
    }

    const images = [];

    if (room.coverImage) {
      images.push(room.coverImage);
    }

    if (Array.isArray(room.gallery)) {
      room.gallery.forEach((image) => {
        if (image && !images.includes(image)) {
          images.push(image);
        }
      });
    }

    return images;
  }, [room]);

  const handleGalleryImageClick = (index) => {
    setSelectedGalleryImageIndex(index);
    setIsGalleryModalOpen(true);
  };

  const handleGalleryNavigate = (direction) => {
    setSelectedGalleryImageIndex((current) => {
      const total = galleryImages.length;
      if (direction === "next") {
        return current === total - 1 ? 0 : current + 1;
      } else {
        return current === 0 ? total - 1 : current - 1;
      }
    });
  };

  useEffect(() => {
    if (!isGalleryModalOpen) return;

    const handleKeydown = (event) => {
      if (event.key === "ArrowLeft") {
        setSelectedGalleryImageIndex((current) => {
          const total = galleryImages.length;
          return current === 0 ? total - 1 : current - 1;
        });
      } else if (event.key === "ArrowRight") {
        setSelectedGalleryImageIndex((current) => {
          const total = galleryImages.length;
          return current === total - 1 ? 0 : current + 1;
        });
      } else if (event.key === "Escape") {
        setIsGalleryModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [isGalleryModalOpen, galleryImages.length]);

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) {
      return 0;
    }

    const start = new Date(`${checkIn}T00:00:00.000Z`);
    const end = new Date(`${checkOut}T00:00:00.000Z`);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    return diff > 0 ? diff : 0;
  }, [checkIn, checkOut]);

  const activeRoomTypes = useMemo(
    () =>
      Array.isArray(room?.roomTypes)
        ? room.roomTypes.filter((type) => type?.isActive !== false)
        : [],
    [room?.roomTypes]
  );

  const hasValidDateRange = nights > 0;

  const visibleRoomTypes = useMemo(() => {
    if (!hasValidDateRange) {
      return activeRoomTypes;
    }

    return activeRoomTypes.filter((type) => {
      const availability = availabilityByType[String(type._id)];
      const availableRooms = Number(availability?.availableRooms ?? type.totalRooms ?? 0);
      return availableRooms > 0;
    });
  }, [activeRoomTypes, availabilityByType, hasValidDateRange]);

  useEffect(() => {
    setSelectedTypeId((current) => {
      const hasCurrent = visibleRoomTypes.some((type) => String(type._id) === String(current));

      if (hasCurrent) {
        return current;
      }

      return visibleRoomTypes[0]?._id ? String(visibleRoomTypes[0]._id) : "";
    });
  }, [visibleRoomTypes]);

  useEffect(() => {
    setSelectedTypeImageIndex(0);
  }, [selectedTypeId]);

  const selectedType = useMemo(
    () => activeRoomTypes.find((type) => String(type._id) === String(selectedTypeId)) || null,
    [activeRoomTypes, selectedTypeId]
  );

  const selectedTypeAvailability = useMemo(
    () => availabilityByType[String(selectedTypeId)] || null,
    [availabilityByType, selectedTypeId]
  );

  const selectedTypeAvailableRooms = Number(
    selectedTypeAvailability?.availableRooms ?? selectedType?.totalRooms ?? 0
  );

  const selectedTypeImages = useMemo(() => {
    const typeImages = Array.isArray(selectedType?.images)
      ? selectedType.images.filter(Boolean)
      : [];

    if (typeImages.length > 0) {
      return typeImages;
    }

    return galleryImages;
  }, [selectedType?.images, galleryImages]);

  const mapQuery = useMemo(
    () => String(room?.address || room?.location || "").trim(),
    [room?.address, room?.location]
  );
  const mapEmbedUrl = useMemo(
    () =>
      mapQuery
        ? `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`
        : "",
    [mapQuery]
  );
  const mapOpenUrl = useMemo(
    () =>
      mapQuery
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`
        : "",
    [mapQuery]
  );

  if (loading) {
    return <div className="p-10 text-center text-lg font-semibold">Loading room details...</div>;
  }

  if (error || !room) {
    return <div className="p-10 text-center text-red-600">{error || "Room not found."}</div>;
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
              {galleryImages[0] ? (
                <img
                  src={toImageUrl(galleryImages[0])}
                  alt={room.name}
                  className="w-full h-[340px] object-cover"
                />
              ) : (
                <div className="h-[340px] bg-gray-100 flex items-center justify-center text-gray-500">
                  No image available
                </div>
              )}

              {galleryImages.length > 1 && (
                <div className="grid grid-cols-4 gap-2 p-3 bg-gray-50">
                  {galleryImages.slice(1, 5).map((image, index) => (
                    <button
                      key={`${image}-${index}`}
                      type="button"
                      onClick={() => handleGalleryImageClick(index + 1)}
                      className="h-20 w-full object-cover rounded hover:opacity-80 transition cursor-pointer overflow-hidden"
                      aria-label={`View gallery image ${index + 2}`}
                    >
                      <img
                        src={toImageUrl(image)}
                        alt={`${room.name} ${index + 2}`}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border shadow-sm p-6">
              <h1 className="text-3xl font-bold">{room.name}</h1>
              <p className="text-gray-600 mt-2">{room.location}</p>
              {room.address && <p className="text-sm text-gray-600 mt-1">{room.address}</p>}

              {room.description && (
                <p className="text-gray-700 mt-5 whitespace-pre-line">{room.description}</p>
              )}

              <div className="mt-5 grid sm:grid-cols-2 gap-4 text-sm">
                <p>
                  <span className="font-semibold">Check-in:</span> {room.checkInTime || "12:00"}
                </p>
                <p>
                  <span className="font-semibold">Check-out:</span> {room.checkOutTime || "10:00"}
                </p>
              </div>

              {Array.isArray(room.amenities) && room.amenities.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold">Amenities</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {room.amenities.map((amenity) => (
                      <span key={amenity} className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm">
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {Array.isArray(room.nearbyLandmarks) && room.nearbyLandmarks.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold">Nearby</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {room.nearbyLandmarks.map((item) => (
                      <span key={item} className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border shadow-sm p-6">
              <h2 className="text-2xl font-bold">Room Types</h2>
              <p className="text-gray-600 mt-1">
                Select share type and AC/Non-AC variant for your stay. Click a room type to open full details.
              </p>

              <div className="grid md:grid-cols-2 gap-4 mt-5">
                {visibleRoomTypes.map((type) => {
                  const availability = availabilityByType[String(type._id)];
                  const availableRooms = Number(availability?.availableRooms ?? type.totalRooms ?? 0);
                  const isSelected = String(type._id) === String(selectedTypeId);

                  return (
                    <button
                      type="button"
                      key={type._id}
                      onClick={() => {
                        setSelectedTypeId(String(type._id));
                        setIsTypeModalOpen(true);
                      }}
                      className={`border rounded-xl p-4 text-left transition ${
                        isSelected ? "border-green-500 bg-green-50" : "border-gray-200 bg-white"
                      }`}
                    >
                      <p className="font-semibold">{type.label}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {type.shareType?.toUpperCase()} | {type.acType === "non_ac" ? "Non-AC" : "AC"}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">Max {type.occupancy} guest(s) per room</p>
                      <p className="text-green-700 font-bold mt-2">{formatPrice(type.pricePerNight)} / night</p>
                      <p className="text-sm mt-1">
                        Available: <span className={availableRooms > 0 ? "text-green-700" : "text-red-600"}>{availableRooms}</span>
                      </p>
                    </button>
                  );
                })}
              </div>

              {visibleRoomTypes.length === 0 && hasValidDateRange && (
                <p className="text-sm text-amber-700 mt-4">
                  No room types are available for selected dates. Please change dates.
                </p>
              )}

              {selectedType && selectedTypeImages.length > 0 && (
                <div className="mt-6 border rounded-xl p-3 bg-gray-50">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-gray-700">
                      {selectedType.label} Room Images
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsTypeModalOpen(true)}
                      className="text-sm text-green-700 font-semibold hover:text-green-800"
                    >
                      View full details
                    </button>
                  </div>
                  <div className="relative max-w-md">
                    <img
                      src={toImageUrl(selectedTypeImages[selectedTypeImageIndex])}
                      alt={`${selectedType.label} ${selectedTypeImageIndex + 1}`}
                      className="w-full h-44 object-cover rounded-lg"
                    />
                    {selectedTypeImages.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedTypeImageIndex((current) =>
                              current === 0 ? selectedTypeImages.length - 1 : current - 1
                            )
                          }
                          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 text-white"
                          aria-label="Previous room image"
                        >
                          {"<"}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedTypeImageIndex((current) =>
                              current === selectedTypeImages.length - 1 ? 0 : current + 1
                            )
                          }
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 text-white"
                          aria-label="Next room image"
                        >
                          {">"}
                        </button>
                      </>
                    )}
                  </div>

                  {selectedTypeImages.length > 1 && (
                    <div className="mt-2 flex gap-2 overflow-x-auto">
                      {selectedTypeImages.map((image, index) => (
                        <button
                          key={`${image}-${index}`}
                          type="button"
                          onClick={() => setSelectedTypeImageIndex(index)}
                          className={`shrink-0 rounded overflow-hidden border ${
                            index === selectedTypeImageIndex
                              ? "border-green-500"
                              : "border-gray-200"
                          }`}
                          aria-label={`Select room image ${index + 1}`}
                        >
                          <img src={toImageUrl(image)} alt="" className="w-14 h-10 object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {availabilityError && <p className="text-sm text-red-600 mt-4">{availabilityError}</p>}
            </div>

            {isGalleryModalOpen && galleryImages.length > 0 && (
              <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                  <button
                    type="button"
                    onClick={() => setIsGalleryModalOpen(false)}
                    className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-gray-900 text-white font-bold hover:bg-gray-800 transition flex items-center justify-center text-lg"
                    aria-label="Close gallery"
                  >
                    ×
                  </button>

                  <div className="relative flex-1 overflow-hidden bg-black/10">
                    <img
                      src={toImageUrl(galleryImages[selectedGalleryImageIndex])}
                      alt={`${room.name} ${selectedGalleryImageIndex + 1}`}
                      className="w-full h-full object-contain"
                    />

                    {galleryImages.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleGalleryNavigate("prev")}
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white transition flex items-center justify-center"
                          aria-label="Previous image"
                        >
                          ‹
                        </button>
                        <button
                          type="button"
                          onClick={() => handleGalleryNavigate("next")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white transition flex items-center justify-center"
                          aria-label="Next image"
                        >
                          ›
                        </button>
                      </>
                    )}
                  </div>

                  <div className="bg-gray-50 border-t p-4">
                    {galleryImages.length > 1 && (
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm text-gray-700 font-semibold">
                          {selectedGalleryImageIndex + 1} / {galleryImages.length}
                        </p>
                        <div className="flex gap-2 overflow-x-auto flex-1">
                          {galleryImages.map((image, index) => (
                            <button
                              key={`modal-${image}-${index}`}
                              type="button"
                              onClick={() => setSelectedGalleryImageIndex(index)}
                              className={`shrink-0 rounded overflow-hidden border-2 transition ${
                                index === selectedGalleryImageIndex
                                  ? "border-green-500"
                                  : "border-gray-300 hover:border-gray-400"
                              }`}
                              aria-label={`Select image ${index + 1}`}
                            >
                              <img
                                src={toImageUrl(image)}
                                alt=""
                                className="w-12 h-10 object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <p className="text-center text-gray-600 text-xs mt-2">Use arrow keys or click to navigate</p>
                  </div>
                </div>
              </div>
            )}

            {mapEmbedUrl && (
              <div className="bg-white rounded-2xl border shadow-sm p-6">
                <h2 className="text-2xl font-bold">Property Location</h2>
                <p className="text-gray-600 mt-1">{mapQuery}</p>

                <div className="mt-4 rounded-xl overflow-hidden border">
                  <iframe
                    title="Property location map"
                    src={mapEmbedUrl}
                    loading="lazy"
                    className="w-full h-72"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>

                <a
                  href={mapOpenUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex mt-4 bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-black"
                >
                  Open in Google Maps
                </a>
              </div>
            )}
          </div>

          <aside className="space-y-6">
            <div className="bg-white rounded-2xl border shadow-sm p-5 lg:sticky lg:top-24">
              <h3 className="text-xl font-bold">Book This Room</h3>

              <div className="grid gap-3 mt-4">
                <label className="text-sm text-gray-600">Check-in</label>
                <input
                  type="date"
                  value={checkIn}
                  min={toInputDate(new Date())}
                  onChange={(event) => setCheckIn(event.target.value)}
                  className="border rounded-lg px-3 py-2"
                />

                <label className="text-sm text-gray-600">Check-out</label>
                <input
                  type="date"
                  value={checkOut}
                  min={checkIn || toInputDate(new Date())}
                  onChange={(event) => setCheckOut(event.target.value)}
                  className="border rounded-lg px-3 py-2"
                />
              </div>

              <p className="text-sm text-gray-600 mt-4">
                Nights: <span className="font-semibold">{nights || 0}</span>
              </p>

              {availabilityLoading && <p className="text-sm text-gray-600 mt-2">Checking availability...</p>}

              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/room-booking/${room._id}?type=${selectedTypeId}&checkIn=${checkIn}&checkOut=${checkOut}`
                  )
                }
                disabled={!selectedTypeId || nights <= 0 || selectedTypeAvailableRooms <= 0}
                className="w-full mt-5 bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
              >
                Continue to Booking
              </button>
            </div>

            <div className="bg-white rounded-2xl border shadow-sm p-5">
              <h3 className="text-lg font-semibold">Other Rooms</h3>
              <div className="mt-4 space-y-3">
                {otherRooms.map((otherRoom) => (
                  <Link
                    to={`/room/${otherRoom._id}`}
                    key={otherRoom._id}
                    className="flex gap-3 p-2 rounded-lg hover:bg-gray-50"
                  >
                    <img
                      src={toImageUrl(otherRoom.coverImage || otherRoom.gallery?.[0] || "")}
                      alt={otherRoom.name}
                      className="w-16 h-14 rounded object-cover"
                    />
                    <div>
                      <p className="text-sm font-semibold">{otherRoom.name}</p>
                      <p className="text-xs text-gray-600">{otherRoom.location}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>

      <RoomTypeDetailsModal
        isOpen={isTypeModalOpen && Boolean(selectedType)}
        onClose={() => setIsTypeModalOpen(false)}
        roomName={room.name}
        type={selectedType}
        availableRooms={selectedTypeAvailableRooms}
        images={selectedTypeImages}
        roomAmenities={room.amenities}
        nearbyLandmarks={room.nearbyLandmarks}
        toImageUrl={toImageUrl}
      />
    </div>
  );
}
