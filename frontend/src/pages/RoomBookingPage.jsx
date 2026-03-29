import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { createRoomBooking, getRoomAvailability, getRoomById } from "../services/rooms";

const API = "http://localhost:5000";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[0-9]{10,15}$/;

const formatPrice = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(amount) || 0);

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

export default function RoomBookingPage() {
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);

  const [roomTypeId, setRoomTypeId] = useState(searchParams.get("type") || "");
  const [checkIn, setCheckIn] = useState(searchParams.get("checkIn") || addDays(new Date(), 1));
  const [checkOut, setCheckOut] = useState(searchParams.get("checkOut") || addDays(new Date(), 2));
  const [roomsCount, setRoomsCount] = useState(1);
  const [adultsCount, setAdultsCount] = useState(1);
  const [childrenCount, setChildrenCount] = useState(0);
  const [availabilityByType, setAvailabilityByType] = useState({});
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [qrCode, setQrCode] = useState("");

  const [customer, setCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    specialRequest: ""
  });

  const [paymentReference, setPaymentReference] = useState("");
  const [screenshot, setScreenshot] = useState(null);
  const [successData, setSuccessData] = useState(null);

  useEffect(() => {
    const fetchRoom = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await getRoomById(roomId);
        setRoom(data);

        const activeTypes = Array.isArray(data?.roomTypes)
          ? data.roomTypes.filter((type) => type?.isActive !== false)
          : [];

        setRoomTypeId((current) => {
          const hasSelectedType = activeTypes.some(
            (type) => String(type._id) === String(current)
          );

          if ((!current || !hasSelectedType) && activeTypes.length) {
            return String(activeTypes[0]._id);
          }

          return current;
        });
      } catch (apiError) {
        setError(apiError?.response?.data?.message || "Failed to load room.");
      } finally {
        setLoading(false);
      }
    };

    fetchRoom();
  }, [roomId]);

  useEffect(() => {
    const fetchAvailability = async () => {
      if (!room?._id || !checkIn || !checkOut) {
        return;
      }

      setAvailabilityLoading(true);

      try {
        const data = await getRoomAvailability(room._id, { checkIn, checkOut });
        const mapped = (data?.availability || []).reduce((acc, row) => {
          acc[String(row.roomTypeId)] = row;
          return acc;
        }, {});
        setAvailabilityByType(mapped);
      } catch (apiError) {
        setError(apiError?.response?.data?.message || "Failed to check availability.");
        setAvailabilityByType({});
      } finally {
        setAvailabilityLoading(false);
      }
    };

    fetchAvailability();
  }, [room?._id, checkIn, checkOut]);

  useEffect(() => {
    const fetchQr = async () => {
      try {
        const response = await fetch(`${API}/api/payment/qr`);
        const data = await response.json();
        setQrCode(data?.qrCode || "");
      } catch (_error) {
        setQrCode("");
      }
    };

    fetchQr();
  }, []);

  const activeTypes = useMemo(
    () => (Array.isArray(room?.roomTypes) ? room.roomTypes.filter((type) => type?.isActive !== false) : []),
    [room?.roomTypes]
  );

  const bookableTypes = useMemo(() => {
    if (!checkIn || !checkOut) {
      return activeTypes;
    }

    return activeTypes.filter((type) => {
      const typeAvailability = availabilityByType[String(type._id)];
      const typeAvailableRooms = Number(typeAvailability?.availableRooms ?? type.totalRooms ?? 0);
      return typeAvailableRooms > 0;
    });
  }, [activeTypes, availabilityByType, checkIn, checkOut]);

  useEffect(() => {
    setRoomTypeId((current) => {
      const hasCurrent = bookableTypes.some((type) => String(type._id) === String(current));

      if (hasCurrent) {
        return current;
      }

      return bookableTypes[0]?._id ? String(bookableTypes[0]._id) : "";
    });
  }, [bookableTypes]);

  const selectedType = useMemo(
    () => activeTypes.find((type) => String(type._id) === String(roomTypeId)) || null,
    [activeTypes, roomTypeId]
  );

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) {
      return 0;
    }

    const start = new Date(`${checkIn}T00:00:00.000Z`);
    const end = new Date(`${checkOut}T00:00:00.000Z`);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    return diff > 0 ? diff : 0;
  }, [checkIn, checkOut]);

  const selectedAvailability = useMemo(
    () => availabilityByType[String(roomTypeId)] || null,
    [availabilityByType, roomTypeId]
  );

  const guestsCount = adultsCount + childrenCount;
  const availableRooms = Number(selectedAvailability?.availableRooms || selectedType?.totalRooms || 0);
  const maxGuestsAllowed = Math.max(1, roomsCount * Number(selectedType?.occupancy || 1));

  useEffect(() => {
    if (roomsCount > availableRooms && availableRooms > 0) {
      setRoomsCount(availableRooms);
    } else if (availableRooms === 0) {
      setRoomsCount(1);
    }
  }, [availableRooms, roomsCount]);

  useEffect(() => {
    if (guestsCount <= maxGuestsAllowed) {
      return;
    }

    let overflow = guestsCount - maxGuestsAllowed;
    let nextChildren = childrenCount;
    let nextAdults = adultsCount;

    const reduceValue = (value, min = 0) => {
      const reduced = Math.min(Math.max(0, overflow), Math.max(0, value - min));
      overflow -= reduced;
      return value - reduced;
    };

    nextChildren = reduceValue(nextChildren, 0);
    nextAdults = reduceValue(nextAdults, 1);

    if (nextChildren !== childrenCount) {
      setChildrenCount(nextChildren);
    }
    if (nextAdults !== adultsCount) {
      setAdultsCount(nextAdults);
    }
  }, [adultsCount, childrenCount, guestsCount, maxGuestsAllowed]);

  const baseAmount = (Number(selectedType?.pricePerNight || 0) || 0) * nights * roomsCount;
  const totalAmount = Math.max(0, baseAmount);
  const mapQuery = String(room?.address || room?.location || "").trim();
  const mapEmbedUrl = mapQuery
    ? `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`
    : "";
  const mapOpenUrl = mapQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`
    : "";

  const qrImageUrl = useMemo(() => {
    if (!qrCode) {
      return "";
    }

    if (/^https?:\/\//i.test(qrCode)) {
      return qrCode;
    }

    if (qrCode.includes("/")) {
      return `${API}/uploads/${qrCode}`;
    }

    return `${API}/uploads/qr/${qrCode}`;
  }, [qrCode]);

  const validateStepOne = () => {
    if (!roomTypeId || !selectedType) {
      setError("Please select room type.");
      return false;
    }

    if (!checkIn || !checkOut || nights <= 0) {
      setError("Please select valid check-in and check-out dates.");
      return false;
    }

    if (availableRooms <= 0) {
      setError("Selected room type is sold out for selected dates.");
      return false;
    }

    if (roomsCount < 1 || roomsCount > availableRooms) {
      setError(`Please select between 1 and ${availableRooms} room(s).`);
      return false;
    }

    if (guestsCount < 1 || guestsCount > maxGuestsAllowed) {
      setError(`Guests must be between 1 and ${maxGuestsAllowed}.`);
      return false;
    }

    if (adultsCount < 1) {
      setError("At least 1 adult is required.");
      return false;
    }

    setError("");
    return true;
  };

  const validateStepTwo = () => {
    if (!customer.name.trim()) {
      setError("Name is required.");
      return false;
    }

    if (!emailPattern.test(customer.email.trim())) {
      setError("Enter a valid email address.");
      return false;
    }

    if (!phonePattern.test(customer.phone.trim())) {
      setError("Enter a valid phone number.");
      return false;
    }

    setError("");
    return true;
  };

  const submitBooking = async () => {
    if (!validateStepOne() || !validateStepTwo()) {
      return;
    }

    if (!paymentReference.trim()) {
      setError("Payment reference is required.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const payload = new FormData();
      payload.append("roomId", roomId);
      payload.append("roomTypeId", roomTypeId);
      payload.append("checkIn", checkIn);
      payload.append("checkOut", checkOut);
      payload.append("roomsCount", String(roomsCount));
      payload.append("guestsCount", String(guestsCount));
      payload.append("adultsCount", String(adultsCount));
      payload.append("childrenCount", String(childrenCount));
      payload.append("customerName", customer.name.trim());
      payload.append("customerEmail", customer.email.trim());
      payload.append("customerPhone", customer.phone.trim());
      payload.append("specialRequest", customer.specialRequest.trim());
      payload.append("paymentReference", paymentReference.trim());

      if (screenshot) {
        payload.append("screenshot", screenshot);
      }

      const response = await createRoomBooking(payload);
      setSuccessData(response?.booking || null);
    } catch (submitError) {
      setError(submitError?.response?.data?.message || "Failed to submit booking.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-10 text-center text-lg font-semibold">Loading room booking page...</div>;
  }

  if (!room) {
    return <div className="p-10 text-center text-red-600">{error || "Room not found."}</div>;
  }

  if (successData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-lg p-8 border border-green-100">
          <h1 className="text-3xl font-bold text-green-700">Room booking submitted successfully</h1>
          <p className="mt-3 text-gray-700">
            Booking request is received and waiting for admin verification.
          </p>
          <p className="mt-2 text-gray-700">
            Invoice Number: <span className="font-semibold">{successData.invoiceNumber}</span>
          </p>
          <p className="mt-2 text-gray-700">
            A confirmation email will be sent after payment verification.
          </p>

          <button
            type="button"
            onClick={() => navigate("/rooms")}
            className="mt-6 bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700"
          >
            Explore More Rooms
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-[1.7fr,1fr] gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-wrap gap-2 mb-6">
            {["Stay Details", "Guest Details", "Payment & Submit"].map((label, index) => (
              <span
                key={label}
                className={`px-3 py-1.5 text-sm rounded-full ${
                  step >= index + 1
                    ? "bg-green-100 text-green-700 font-semibold"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {index + 1}. {label}
              </span>
            ))}
          </div>

          {step === 1 && (
            <section>
              <h2 className="text-2xl font-bold text-gray-900">Select Room and Dates</h2>

              <div className="mt-5 grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Check-in</label>
                  <input
                    type="date"
                    value={checkIn}
                    min={toInputDate(new Date())}
                    onChange={(event) => setCheckIn(event.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Check-out</label>
                  <input
                    type="date"
                    value={checkOut}
                    min={checkIn || toInputDate(new Date())}
                    onChange={(event) => setCheckOut(event.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div className="mt-5">
                <p className="text-sm text-gray-600 mb-2">Room Type</p>
                <div className="grid md:grid-cols-2 gap-3">
                  {bookableTypes.map((type) => {
                    const typeAvailability = availabilityByType[String(type._id)];
                    const typeAvailableRooms = Number(typeAvailability?.availableRooms ?? type.totalRooms ?? 0);
                    const selected = String(type._id) === String(roomTypeId);

                    return (
                      <label
                        key={type._id}
                        className={`block border rounded-xl p-4 cursor-pointer ${
                          selected ? "border-green-500 bg-green-50" : "border-gray-200"
                        }`}
                      >
                        <input
                          type="radio"
                          className="mr-2"
                          name="roomType"
                          value={type._id}
                          checked={selected}
                          onChange={() => setRoomTypeId(String(type._id))}
                        />
                        <span className="font-semibold">{type.label}</span>
                        <p className="text-sm text-gray-600 mt-1">
                          {type.shareType?.toUpperCase()} | {type.acType === "non_ac" ? "Non-AC" : "AC"}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {formatPrice(type.pricePerNight)} / night
                        </p>
                        <p className="text-sm mt-1">
                          Available:{" "}
                          <span className={typeAvailableRooms > 0 ? "text-green-700" : "text-red-600"}>
                            {typeAvailableRooms}
                          </span>
                        </p>
                      </label>
                    );
                  })}
                </div>
                {bookableTypes.length === 0 && (
                  <p className="text-sm text-amber-700 mt-3">
                    No room types available for selected dates. Please change dates.
                  </p>
                )}
              </div>

              <div className="mt-6 grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">Number of Rooms</p>
                  <div className="inline-flex items-center border rounded-lg overflow-hidden">
                    <button
                      type="button"
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200"
                      onClick={() => setRoomsCount((current) => Math.max(1, current - 1))}
                    >
                      -
                    </button>
                    <span className="px-5 py-2 font-semibold">{roomsCount}</span>
                    <button
                      type="button"
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200"
                      onClick={() => setRoomsCount((current) => Math.min(Math.max(1, availableRooms), current + 1))}
                    >
                      +
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Available rooms: {availableRooms}</p>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">Adults</label>
                  <input
                    type="number"
                    min="1"
                    max={maxGuestsAllowed}
                    value={adultsCount}
                    onChange={(event) => setAdultsCount(Math.max(1, Number(event.target.value) || 1))}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-600 mb-1">Children</label>
                  <input
                    type="number"
                    min="0"
                    max={maxGuestsAllowed}
                    value={childrenCount}
                    onChange={(event) =>
                      setChildrenCount(Math.max(0, Number(event.target.value) || 0))
                    }
                    className="w-full border rounded-lg px-3 py-2"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Max allowed guests: {maxGuestsAllowed} | Current selected: {guestsCount}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (validateStepOne()) {
                    setStep(2);
                  }
                }}
                className="mt-6 bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700"
              >
                Continue
              </button>
            </section>
          )}

          {step === 2 && (
            <section>
              <h2 className="text-2xl font-bold text-gray-900">Guest Details</h2>
              <p className="text-gray-600 mt-1">Please share the lead guest details.</p>

              <div className="mt-5 grid md:grid-cols-2 gap-3">
                <input
                  className="border rounded-lg px-3 py-2"
                  placeholder="Full name"
                  value={customer.name}
                  onChange={(event) => setCustomer((current) => ({ ...current, name: event.target.value }))}
                />
                <input
                  className="border rounded-lg px-3 py-2"
                  placeholder="Email"
                  value={customer.email}
                  onChange={(event) => setCustomer((current) => ({ ...current, email: event.target.value }))}
                />
                <input
                  className="border rounded-lg px-3 py-2 md:col-span-2"
                  placeholder="Phone number"
                  value={customer.phone}
                  onChange={(event) => setCustomer((current) => ({ ...current, phone: event.target.value }))}
                />
                <textarea
                  className="border rounded-lg px-3 py-2 md:col-span-2 h-24"
                  placeholder="Special request (optional)"
                  value={customer.specialRequest}
                  onChange={(event) =>
                    setCustomer((current) => ({ ...current, specialRequest: event.target.value }))
                  }
                />
              </div>

              <div className="mt-7 flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (validateStepTwo()) {
                      setStep(3);
                    }
                  }}
                  className="bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700"
                >
                  Continue to Payment
                </button>
              </div>
            </section>
          )}

          {step === 3 && (
            <section>
              <h2 className="text-2xl font-bold text-gray-900">Pay and Submit</h2>

              <div className="mt-5 border rounded-xl p-5 bg-gray-50">
                {qrImageUrl ? (
                  <img
                    src={qrImageUrl}
                    alt="Payment QR"
                    className="w-56 h-56 object-contain mx-auto bg-white rounded-lg p-3 border"
                  />
                ) : (
                  <p className="text-sm text-red-600 text-center">
                    QR code is not configured yet. Contact admin.
                  </p>
                )}
                <p className="text-center text-lg font-semibold mt-4">
                  Pay {formatPrice(totalAmount)} for {nights} night(s)
                </p>

              </div>

              <div className="mt-5 grid gap-3">
                <input
                  className="border rounded-lg px-3 py-2"
                  placeholder="Payment reference number (UTR / UPI Ref)"
                  value={paymentReference}
                  onChange={(event) => setPaymentReference(event.target.value)}
                />

                <label className="text-sm text-gray-600">
                  Upload payment screenshot (optional but recommended)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  className="border rounded-lg px-3 py-2 bg-white"
                  onChange={(event) => setScreenshot(event.target.files?.[0] || null)}
                />
              </div>

              <div className="mt-7 flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={submitBooking}
                  className="bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                >
                  {submitting ? "Submitting..." : "Submit Booking"}
                </button>
              </div>
            </section>
          )}

          {error && <p className="mt-5 text-sm text-red-600">{error}</p>}
        </div>

        <aside className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-fit lg:sticky lg:top-24">
          <h3 className="text-xl font-bold text-gray-900">{room.name}</h3>
          <p className="text-gray-600 mt-1">{room.location}</p>
          {room.address && <p className="text-xs text-gray-500 mt-1">{room.address}</p>}

          <div className="mt-5 space-y-2 text-sm text-gray-700">
            <p>
              <span className="font-semibold">Room Type:</span> {selectedType?.label || "Select a type"}
            </p>
            <p>
              <span className="font-semibold">Dates:</span> {checkIn} to {checkOut}
            </p>
            <p>
              <span className="font-semibold">Nights:</span> {nights}
            </p>
            <p>
              <span className="font-semibold">Rooms:</span> {roomsCount}
            </p>
            <p>
              <span className="font-semibold">Guests:</span> {guestsCount}
            </p>
            <p>
              <span className="font-semibold">Adults:</span> {adultsCount}
            </p>
            <p>
              <span className="font-semibold">Children:</span> {childrenCount}
            </p>
            <p>
              <span className="font-semibold">Price/Night:</span>{" "}
              {formatPrice(selectedType?.pricePerNight || 0)}
            </p>
            <p>
              <span className="font-semibold">Availability:</span> {availabilityLoading ? "Checking..." : availableRooms}
            </p>
          </div>

          <div className="mt-6 pt-4 border-t">
            <p className="text-sm text-gray-600">Final Amount</p>
            <p className="text-3xl font-bold text-green-700">{formatPrice(totalAmount)}</p>
          </div>

          {mapEmbedUrl && (
            <div className="mt-6 pt-4 border-t">
              <p className="text-sm font-semibold text-gray-700 mb-2">Room Location Map</p>
              <div className="rounded-lg overflow-hidden border">
                <iframe
                  title="Room location map"
                  src={mapEmbedUrl}
                  loading="lazy"
                  className="w-full h-44"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
              <a
                href={mapOpenUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex mt-3 text-sm bg-gray-900 text-white px-3 py-1.5 rounded hover:bg-black"
              >
                Open Map
              </a>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
