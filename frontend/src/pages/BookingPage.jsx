import React, { useEffect, useMemo, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

const API = "http://localhost:5000";

const toDateKey = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatDate = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};

const formatDateRange = (start, end) => {
  if (!start || !end) {
    return formatDate(start);
  }

  const startText = formatDate(start);
  const endText = formatDate(end);

  if (startText === endText) {
    return startText;
  }

  return `${startText} to ${endText}`;
};

const formatPrice = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(amount) || 0);

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[0-9]{10,15}$/;

export default function BookingPage() {
  const { tripId, id } = useParams();
  const resolvedTripId = tripId || id;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preSelectedDate = searchParams.get("date");
  const preSelectedBatch = searchParams.get("batch");

  const [trip, setTrip] = useState(null);
  const [qrCode, setQrCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);

  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);
  const [participants, setParticipants] = useState(1);
  const [screenshot, setScreenshot] = useState(null);
  const [paymentReference, setPaymentReference] = useState("");

  const [primaryPerson, setPrimaryPerson] = useState({
    name: "",
    email: "",
    phone: "",
    age: "",
    gender: "Male"
  });

  const [members, setMembers] = useState([]);
  const [successData, setSuccessData] = useState(null);

  useEffect(() => {
    const fetchTrip = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`${API}/api/trips/${resolvedTripId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.message || "Failed to load trip.");
        }

        setTrip(data);
      } catch (apiError) {
        setError(apiError.message || "Failed to load trip.");
      } finally {
        setLoading(false);
      }
    };

    if (resolvedTripId) {
      fetchTrip();
    }
  }, [resolvedTripId]);

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

  const departures = useMemo(() => {
    if (!trip?.departures?.length) {
      return [];
    }

    return [...trip.departures]
      .filter((departure) => departure?.date)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [trip]);

  const departuresByDate = useMemo(() => {
    const map = new Map();

    departures.forEach((departure) => {
      const key = toDateKey(departure.date);
      const current = map.get(key) || [];
      current.push(departure);
      map.set(key, current);
    });

    return map;
  }, [departures]);

  const availableDateKeys = useMemo(() => {
    const set = new Set();

    departures.forEach((departure) => {
      const seats = Number(departure.totalSeats || 0) - Number(departure.bookedSeats || 0);

      if (seats > 0) {
        set.add(toDateKey(departure.date));
      }
    });

    return set;
  }, [departures]);

  useEffect(() => {
    if (!departures.length) {
      return;
    }

    const fromBatch = preSelectedBatch
      ? departures.find((departure) => String(departure._id) === preSelectedBatch)
      : null;

    const fromDate = preSelectedDate
      ? departures.find((departure) => toDateKey(departure.date) === preSelectedDate)
      : null;

    const withSeats =
      departures.find(
        (departure) => Number(departure.totalSeats || 0) - Number(departure.bookedSeats || 0) > 0
      ) || departures[0];

    const initialDeparture = fromBatch || fromDate || withSeats;

    setSelectedBatchId(String(initialDeparture?._id || ""));
    setSelectedCalendarDate(initialDeparture?.date ? new Date(initialDeparture.date) : null);
  }, [departures, preSelectedBatch, preSelectedDate]);

  const selectedDateKey = useMemo(() => toDateKey(selectedCalendarDate), [selectedCalendarDate]);

  const departuresForSelectedDate = useMemo(() => {
    if (!selectedDateKey) {
      return [];
    }

    return departuresByDate.get(selectedDateKey) || [];
  }, [departuresByDate, selectedDateKey]);

  useEffect(() => {
    if (!selectedDateKey) {
      return;
    }

    const selectedInDay = departuresForSelectedDate.find(
      (departure) => String(departure._id) === selectedBatchId
    );

    if (selectedInDay) {
      return;
    }

    const withSeats = departuresForSelectedDate.find(
      (departure) => Number(departure.totalSeats || 0) - Number(departure.bookedSeats || 0) > 0
    );

    setSelectedBatchId(String(withSeats?._id || departuresForSelectedDate[0]?._id || ""));
  }, [departuresForSelectedDate, selectedBatchId, selectedDateKey]);

  const selectedDeparture = useMemo(
    () => departures.find((departure) => String(departure._id) === selectedBatchId),
    [departures, selectedBatchId]
  );

  const seatsLeft = useMemo(() => {
    if (!selectedDeparture) {
      return 0;
    }

    return Math.max(
      0,
      Number(selectedDeparture.totalSeats || 0) - Number(selectedDeparture.bookedSeats || 0)
    );
  }, [selectedDeparture]);

  useEffect(() => {
    if (seatsLeft === 0) {
      setParticipants(1);
      return;
    }

    if (participants > seatsLeft) {
      setParticipants(seatsLeft);
    }
  }, [participants, seatsLeft]);

  useEffect(() => {
    const additionalCount = Math.max(0, participants - 1);
    setMembers((current) => {
      const next = [...current];

      if (next.length < additionalCount) {
        for (let index = next.length; index < additionalCount; index += 1) {
          next.push({ name: "", age: "", gender: "Male" });
        }
      } else if (next.length > additionalCount) {
        next.splice(additionalCount);
      }

      return next;
    });
  }, [participants]);

  const amount = useMemo(() => Number(trip?.price || 0) * participants, [participants, trip?.price]);

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
    if (!selectedCalendarDate) {
      setError("Please select date from the calendar.");
      return false;
    }

    if (!selectedDeparture) {
      setError("Please select an available batch for selected date.");
      return false;
    }

    if (seatsLeft <= 0) {
      setError("Selected departure is sold out. Please choose another date.");
      return false;
    }

    if (participants < 1 || participants > seatsLeft) {
      setError(`Please choose between 1 and ${seatsLeft} participant(s).`);
      return false;
    }

    setError("");
    return true;
  };

  const validateStepTwo = () => {
    if (!primaryPerson.name.trim()) {
      setError("Lead traveler name is required.");
      return false;
    }

    if (!emailPattern.test(primaryPerson.email.trim())) {
      setError("Please enter a valid email address.");
      return false;
    }

    if (!phonePattern.test(primaryPerson.phone.trim())) {
      setError("Please enter a valid phone number.");
      return false;
    }

    const missingMember = members.find((member) => !member.name.trim());

    if (missingMember) {
      setError("Please fill names for all additional members.");
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
      setError("Please enter your payment reference number.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const payload = new FormData();
      payload.append("tripId", resolvedTripId);
      payload.append("selectedBatchId", selectedBatchId);
      payload.append("departureDate", toDateKey(selectedDeparture?.date));
      payload.append("participants", String(participants));
      payload.append("customerName", primaryPerson.name.trim());
      payload.append("customerEmail", primaryPerson.email.trim());
      payload.append("customerPhone", primaryPerson.phone.trim());
      payload.append("customerAge", primaryPerson.age ? String(primaryPerson.age) : "");
      payload.append("customerGender", primaryPerson.gender);
      payload.append("members", JSON.stringify(members));
      payload.append("paymentReference", paymentReference.trim());

      if (screenshot) {
        payload.append("screenshot", screenshot);
      }

      const response = await fetch(`${API}/api/bookings`, {
        method: "POST",
        body: payload
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Booking submission failed.");
      }

      setSuccessData(data?.booking || null);
    } catch (submitError) {
      setError(submitError.message || "Booking submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-10 text-center text-lg font-semibold">Loading booking page...</div>;
  }

  if (error && !trip) {
    return <div className="p-10 text-center text-red-600">{error}</div>;
  }

  if (!trip) {
    return <div className="p-10 text-center text-red-600">Trip not found.</div>;
  }

  if (successData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-lg p-8 border border-green-100">
          <h1 className="text-3xl font-bold text-green-700">Booking submitted successfully</h1>
          <p className="mt-3 text-gray-700">
            Your payment reference has been recorded. Our admin team will verify and confirm your
            booking.
          </p>
          <p className="mt-2 text-gray-700">
            Invoice Number: <span className="font-semibold">{successData.invoiceNumber}</span>
          </p>
          <p className="mt-2 text-gray-700">
            Once confirmed, an invoice email will be sent to{" "}
            <span className="font-semibold">{successData.customerEmail}</span>.
          </p>

          <button
            type="button"
            onClick={() => navigate("/trips")}
            className="mt-6 bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700"
          >
            Explore More Treks
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
            {["Trip & Seats", "Traveler Details", "Payment & Submit"].map((label, index) => (
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
              <h2 className="text-2xl font-bold text-gray-900">Select Date and People</h2>
              <p className="text-gray-600 mt-1">
                Choose date from calendar. Only this trip's available dates are selectable.
              </p>

              <div className="mt-5 grid md:grid-cols-[320px,1fr] gap-5 items-start">
                <div className="booking-calendar-wrap border rounded-xl p-3 bg-gray-50">
                  <Calendar
                    className="booking-calendar"
                    onChange={(value) => {
                      const selectedValue = Array.isArray(value) ? value[0] : value;
                      setSelectedCalendarDate(selectedValue || null);
                    }}
                    value={selectedCalendarDate}
                    tileDisabled={({ date, view }) =>
                      view === "month" && !availableDateKeys.has(toDateKey(date))
                    }
                    tileClassName={({ date, view }) => {
                      if (view !== "month") {
                        return null;
                      }

                      const dateKey = toDateKey(date);
                      const classes = [];

                      if (availableDateKeys.has(dateKey)) {
                        classes.push("available-date");
                      }

                      if (selectedDateKey && dateKey === selectedDateKey) {
                        classes.push("selected-date");
                      }

                      return classes.join(" ") || null;
                    }}
                  />
                  <p className="text-xs text-gray-500 mt-2">Green dates are available for booking.</p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Available batches</p>

                  {departuresForSelectedDate.length === 0 ? (
                    <p className="text-sm text-gray-500 border rounded-lg p-4 bg-gray-50">
                      No departures for selected date. Please choose another available date.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {departuresForSelectedDate.map((departure) => {
                        const departureSeatsLeft = Math.max(
                          0,
                          Number(departure.totalSeats || 0) - Number(departure.bookedSeats || 0)
                        );

                        const endDate = new Date(departure.date);
                        const durationDays = Number(trip.durationDays) || 1;
                        endDate.setUTCDate(endDate.getUTCDate() + durationDays - 1);

                        return (
                          <label
                            key={departure._id}
                            className={`booking-batch-card block border rounded-xl p-4 cursor-pointer transition ${
                              String(departure._id) === selectedBatchId ? "is-selected" : "is-default"
                            } ${departureSeatsLeft <= 0 ? "is-disabled" : ""}`}
                          >
                            <input
                              type="radio"
                              name="departure"
                              className="mr-2"
                              value={departure._id}
                              checked={String(departure._id) === selectedBatchId}
                              disabled={departureSeatsLeft <= 0}
                              onChange={() => setSelectedBatchId(String(departure._id))}
                            />
                            <span className="font-semibold">
                              {departure.batchLabel || "Standard Batch"}
                            </span>
                            <p className="booking-batch-meta text-sm mt-1">
                              {formatDateRange(departure.date, endDate)}
                            </p>
                            <p className="booking-batch-meta text-sm mt-1">
                              {departureSeatsLeft <= 0
                                ? "Sold Out"
                                : `${departureSeatsLeft} / ${Number(
                                    departure.totalSeats || 0
                                  )} seats available`}
                            </p>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <p className="text-sm text-gray-500">Travelers</p>
                <div className="mt-2 inline-flex items-center border rounded-lg overflow-hidden">
                  <button
                    type="button"
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200"
                    onClick={() => setParticipants((current) => Math.max(1, current - 1))}
                  >
                    -
                  </button>
                  <span className="px-5 py-2 font-semibold">{participants}</span>
                  <button
                    type="button"
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200"
                    onClick={() =>
                      setParticipants((current) => Math.min(Math.max(1, seatsLeft), current + 1))
                    }
                  >
                    +
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">Max allowed for selected date: {seatsLeft}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Current seats left: {seatsLeft} / {Number(selectedDeparture?.totalSeats || 0)}
                </p>
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
              <h2 className="text-2xl font-bold text-gray-900">Traveler Details</h2>
              <p className="text-gray-600 mt-1">Lead traveler and additional member information.</p>

              <div className="mt-5 grid md:grid-cols-2 gap-3">
                <input
                  className="border rounded-lg px-3 py-2"
                  placeholder="Lead traveler name"
                  value={primaryPerson.name}
                  onChange={(event) =>
                    setPrimaryPerson((current) => ({ ...current, name: event.target.value }))
                  }
                />
                <input
                  className="border rounded-lg px-3 py-2"
                  placeholder="Email"
                  value={primaryPerson.email}
                  onChange={(event) =>
                    setPrimaryPerson((current) => ({ ...current, email: event.target.value }))
                  }
                />
                <input
                  className="border rounded-lg px-3 py-2"
                  placeholder="Phone"
                  value={primaryPerson.phone}
                  onChange={(event) =>
                    setPrimaryPerson((current) => ({ ...current, phone: event.target.value }))
                  }
                />
                <input
                  className="border rounded-lg px-3 py-2"
                  placeholder="Age"
                  type="number"
                  min="1"
                  value={primaryPerson.age}
                  onChange={(event) =>
                    setPrimaryPerson((current) => ({ ...current, age: event.target.value }))
                  }
                />
                <select
                  className="border rounded-lg px-3 py-2 md:col-span-2"
                  value={primaryPerson.gender}
                  onChange={(event) =>
                    setPrimaryPerson((current) => ({ ...current, gender: event.target.value }))
                  }
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>

              {members.length > 0 && (
                <div className="mt-7">
                  <h3 className="text-lg font-semibold">Additional Members</h3>
                  <div className="space-y-4 mt-3">
                    {members.map((member, index) => (
                      <div key={`member-${index}`} className="border rounded-lg p-4 bg-gray-50">
                        <p className="font-medium mb-3">Member {index + 2}</p>
                        <div className="grid md:grid-cols-3 gap-3">
                          <input
                            className="border rounded-lg px-3 py-2"
                            placeholder="Name"
                            value={member.name}
                            onChange={(event) =>
                              setMembers((current) => {
                                const next = [...current];
                                next[index] = { ...next[index], name: event.target.value };
                                return next;
                              })
                            }
                          />
                          <input
                            className="border rounded-lg px-3 py-2"
                            placeholder="Age"
                            type="number"
                            min="1"
                            value={member.age}
                            onChange={(event) =>
                              setMembers((current) => {
                                const next = [...current];
                                next[index] = { ...next[index], age: event.target.value };
                                return next;
                              })
                            }
                          />
                          <select
                            className="border rounded-lg px-3 py-2"
                            value={member.gender}
                            onChange={(event) =>
                              setMembers((current) => {
                                const next = [...current];
                                next[index] = { ...next[index], gender: event.target.value };
                                return next;
                              })
                            }
                          >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                            <option value="Prefer not to say">Prefer not to say</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
              <p className="text-gray-600 mt-1">
                Make payment using QR code, then submit payment reference.
              </p>

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
                  Pay {formatPrice(amount)} for {participants} traveler(s)
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
          <h3 className="text-xl font-bold text-gray-900">{trip.title}</h3>
          <p className="text-gray-600 mt-1">{trip.location}</p>

          <div className="mt-5 space-y-2 text-sm text-gray-700">
            <p>
              <span className="font-semibold">Batch:</span>{" "}
              {selectedDeparture?.batchLabel || "Select a date"}
            </p>
            <p>
              <span className="font-semibold">Date:</span> {formatDate(selectedDeparture?.date)}
            </p>
            <p>
              <span className="font-semibold">People:</span> {participants}
            </p>
            <p>
              <span className="font-semibold">Current Seats Left:</span> {seatsLeft} /{" "}
              {Number(selectedDeparture?.totalSeats || 0)}
            </p>
            <p>
              <span className="font-semibold">Per Person:</span> {formatPrice(trip.price)}
            </p>
          </div>

          <div className="mt-6 pt-4 border-t">
            <p className="text-sm text-gray-600">Total Amount</p>
            <p className="text-3xl font-bold text-green-700">{formatPrice(amount)}</p>
          </div>

          <p className="mt-4 text-xs text-gray-500">
            Booking remains pending until admin verifies payment and confirms. Invoice is sent by
            email after confirmation.
          </p>
        </aside>
      </div>
    </div>
  );
}
