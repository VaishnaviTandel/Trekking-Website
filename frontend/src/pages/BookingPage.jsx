import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import Calendar from "react-calendar";
import axios from "axios";
import "react-calendar/dist/Calendar.css";

const API_BASE = "http://localhost:5000";
const PAYMENT_METHODS = ["upi", "card", "netbanking", "cash"];
const GST_RATE = 0.05;
const UPI_ID = process.env.REACT_APP_UPI_ID || "trekplatform@upi";
const UPI_PAYEE_NAME = process.env.REACT_APP_UPI_NAME || "Trek Platform";

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

const formatPrice = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(amount) || 0);

const BookingPage = () => {
  const { id } = useParams();
  const location = useLocation();

  const [trip, setTrip] = useState(null);
  const [departures, setDepartures] = useState([]);
  const [selectedDateKey, setSelectedDateKey] = useState("");
  const [selectedDepartureId, setSelectedDepartureId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successBooking, setSuccessBooking] = useState(null);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  const [form, setForm] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    participants: 1,
    notes: "",
    paymentMethod: "upi",
    paymentReference: ""
  });

  const preselectedDate = useMemo(() => {
    const queryDate = new URLSearchParams(location.search).get("date");
    return toDateKey(queryDate);
  }, [location.search]);

  const preselectedBatchId = useMemo(
    () => new URLSearchParams(location.search).get("batch") || "",
    [location.search]
  );

  useEffect(() => {
    const fetchData = async () => {
      const [tripRes, departuresRes] = await Promise.all([
        axios.get(`${API_BASE}/api/trips/${id}`),
        axios.get(`${API_BASE}/api/trips/${id}/departures`)
      ]);

      setTrip(tripRes.data);
      setDepartures(departuresRes.data || []);
    };

    fetchData();
  }, [id]);

  const departuresByDate = useMemo(() => {
    const grouped = {};

    departures.forEach((departure) => {
      const key = toDateKey(departure.date);

      if (!key) {
        return;
      }

      if (!grouped[key]) {
        grouped[key] = [];
      }

      grouped[key].push(departure);
    });

    return grouped;
  }, [departures]);

  const todayKey = toDateKey(new Date());

  const selectedDateBatches = useMemo(
    () => (selectedDateKey ? departuresByDate[selectedDateKey] || [] : []),
    [departuresByDate, selectedDateKey]
  );

  const selectedDeparture = selectedDateBatches.find(
    (departure) => departure._id === selectedDepartureId
  );

  const durationDays = parseDurationDays(trip);

  const selectedStartDate = selectedDateKey ? new Date(selectedDateKey) : null;
  const selectedEndDate = selectedStartDate ? addDays(selectedStartDate, durationDays - 1) : null;
  const selectedSeatsLeft = selectedDeparture
    ? Math.max(0, selectedDeparture.totalSeats - selectedDeparture.bookedSeats)
    : 0;

  const participantCount = Math.max(1, Number(form.participants) || 1);
  const pricePerPerson = Number(trip?.price) || 0;
  const subtotalAmount = pricePerPerson * participantCount;
  const gstAmount = Number((subtotalAmount * GST_RATE).toFixed(2));
  const totalAmount = Number((subtotalAmount + gstAmount).toFixed(2));

  const upiNote = `${trip?.title || "Trek Booking"} - ${selectedDateKey || "date"} - ${
    selectedDeparture?.batchLabel || "batch"
  }`;
  const upiLink = `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(
    UPI_PAYEE_NAME
  )}&am=${encodeURIComponent(totalAmount.toFixed(2))}&cu=INR&tn=${encodeURIComponent(upiNote)}`;
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    upiLink
  )}`;

  useEffect(() => {
    if (!selectedDateBatches.length) {
      setSelectedDepartureId("");
      return;
    }

    const availableBatch = selectedDateBatches.find(
      (departure) => departure.totalSeats - departure.bookedSeats > 0
    );

    if (!availableBatch) {
      setSelectedDepartureId("");
      return;
    }

    setSelectedDepartureId((current) => {
      const isCurrentStillAvailable = selectedDateBatches.some(
        (departure) => departure._id === current && departure.totalSeats - departure.bookedSeats > 0
      );

      return isCurrentStillAvailable ? current : availableBatch._id;
    });
  }, [selectedDateBatches]);

  useEffect(() => {
    if (!preselectedDate) {
      return;
    }

    const batches = departuresByDate[preselectedDate] || [];

    if (!batches.length || preselectedDate < todayKey) {
      return;
    }

    const hasAvailability = batches.some(
      (departure) => departure.totalSeats - departure.bookedSeats > 0
    );

    if (hasAvailability) {
      setSelectedDateKey(preselectedDate);

      const matchedBatch = batches.find(
        (departure) =>
          departure._id === preselectedBatchId &&
          departure.totalSeats - departure.bookedSeats > 0
      );

      if (matchedBatch) {
        setSelectedDepartureId(matchedBatch._id);
      }
    }
  }, [preselectedDate, preselectedBatchId, departuresByDate, todayKey]);

  const getStatus = (date) => {
    const key = toDateKey(date);
    const batches = departuresByDate[key] || [];

    if (!batches.length || key < todayKey) {
      return "disabled";
    }

    const totalSeats = batches.reduce((sum, batch) => sum + (batch.totalSeats || 0), 0);
    const bookedSeats = batches.reduce((sum, batch) => sum + (batch.bookedSeats || 0), 0);
    const seatsLeft = totalSeats - bookedSeats;

    if (seatsLeft <= 0) {
      return "sold";
    }

    if (seatsLeft <= Math.ceil(totalSeats * 0.3)) {
      return "fast";
    }

    return "available";
  };

  const requiresPaymentReference = form.paymentMethod !== "cash";

  useEffect(() => {
    if (form.paymentMethod === "cash") {
      setPaymentConfirmed(false);
    }
  }, [form.paymentMethod]);

  useEffect(() => {
    if (form.paymentMethod !== "cash") {
      setPaymentConfirmed(false);
    }
  }, [selectedDateKey, selectedDepartureId, form.participants, form.paymentMethod]);

  useEffect(() => {
    if (!selectedSeatsLeft) {
      return;
    }

    setForm((current) => {
      const currentParticipants = Math.max(1, Number(current.participants) || 1);

      if (currentParticipants <= selectedSeatsLeft) {
        return current;
      }

      return {
        ...current,
        participants: selectedSeatsLeft
      };
    });
  }, [selectedSeatsLeft]);

  const handleInputChange = (e) => {
    if (e.target.name === "participants") {
      const rawValue = Number(e.target.value);
      const parsedValue = Number.isFinite(rawValue) ? rawValue : 1;
      const cappedBySeats = selectedSeatsLeft ? Math.min(parsedValue, selectedSeatsLeft) : parsedValue;

      setForm({
        ...form,
        participants: Math.max(1, cappedBySeats)
      });

      return;
    }

    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const submitBooking = async (e) => {
    e.preventDefault();

    if (!selectedDateKey) {
      setError("Please choose a start date.");
      return;
    }

    if (!selectedDepartureId) {
      setError("Please choose an available batch.");
      return;
    }

    if (selectedSeatsLeft && participantCount > selectedSeatsLeft) {
      setError("Participants cannot be more than seats left in selected batch.");
      return;
    }

    if (requiresPaymentReference && !form.paymentReference.trim()) {
      setError("Payment reference is required for online payment.");
      return;
    }

    if (requiresPaymentReference && !paymentConfirmed) {
      setError("Please complete payment confirmation before submitting booking.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const response = await axios.post(`${API_BASE}/api/bookings`, {
        tripId: id,
        departureDate: selectedDateKey,
        departureId: selectedDepartureId,
        selectedBatch: selectedDeparture?.batchLabel,
        participants: participantCount,
        customerName: form.customerName,
        customerEmail: form.customerEmail,
        customerPhone: form.customerPhone,
        notes: form.notes,
        paymentMethod: form.paymentMethod,
        paymentReference: form.paymentReference,
        paymentStatus: requiresPaymentReference && paymentConfirmed ? "paid" : "pending"
      });

      setSuccessBooking(response.data);
    } catch (apiError) {
      setError(apiError.response?.data?.message || "Booking failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!trip) {
    return <div className="p-10 text-center">Loading...</div>;
  }

  if (successBooking) {
    return (
      <div className="bg-gray-100 min-h-screen p-8 md:p-12">
        <div className="max-w-3xl mx-auto bg-white rounded-xl shadow p-8">
          <h1 className="text-3xl font-bold text-green-600">Booking Request Submitted</h1>
          <p className="text-gray-700 mt-3">
            Your booking is pending admin confirmation. Invoice and payment details are recorded.
          </p>

          <div className="mt-6 border rounded-lg p-5 bg-gray-50 space-y-2 text-sm">
            <p>
              <span className="font-semibold">Invoice:</span> {successBooking.invoiceNumber}
            </p>
            <p>
              <span className="font-semibold">Trip:</span> {successBooking.tripTitle}
            </p>
            <p>
              <span className="font-semibold">Batch:</span> {successBooking.selectedBatch}
            </p>
            <p>
              <span className="font-semibold">Trek Dates:</span>{" "}
              {formatDateRange(successBooking.departureDate, successBooking.endDate)}
            </p>
            <p>
              <span className="font-semibold">Participants:</span> {successBooking.participants}
            </p>
            <p>
              <span className="font-semibold">Subtotal:</span> {formatPrice(successBooking.subtotalAmount)}
            </p>
            <p>
              <span className="font-semibold">GST:</span> {formatPrice(successBooking.gstAmount)}
            </p>
            <p>
              <span className="font-semibold">Amount:</span> {formatPrice(successBooking.totalAmount)}
            </p>
            <p>
              <span className="font-semibold">Payment:</span>{" "}
              {successBooking.paymentStatus} via {successBooking.paymentMethod}
            </p>
            <p>
              <span className="font-semibold">Status:</span> Pending confirmation
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen">
      <div
        className="h-[300px] bg-cover bg-center flex items-end"
        style={{ backgroundImage: `url(${API_BASE}/uploads/${trip.coverImage})` }}
      >
        <div className="bg-black/55 w-full p-6 text-white">
          <h1 className="text-3xl font-bold">{trip.title}</h1>
          <p>
            {trip.duration} ({durationDays} day{durationDays > 1 ? "s" : ""})
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 md:p-10 -mt-16">
        <div className="bg-white rounded-xl shadow-xl p-6 md:p-8 grid md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-2xl text-green-700 font-bold mb-4">Select Trek Start Date</h2>

            <Calendar
              onClickDay={(value) => {
                const status = getStatus(value);

                if (status === "available" || status === "fast") {
                  setSelectedDateKey(toDateKey(value));
                }
              }}
              value={selectedDateKey ? new Date(selectedDateKey) : null}
              tileDisabled={({ date }) => {
                const status = getStatus(date);
                return status === "disabled" || status === "sold";
              }}
              tileClassName={({ date }) => {
                const status = getStatus(date);

                if (status === "available") {
                  return "bg-green-100";
                }

                if (status === "fast") {
                  return "bg-yellow-100";
                }

                if (status === "sold") {
                  return "bg-red-100 text-gray-600";
                }

                return "opacity-40";
              }}
            />

            <div className="mt-5 grid grid-cols-1 gap-2 text-sm text-gray-600">
              <p>
                <span className="inline-block w-3 h-3 bg-green-100 border border-green-300 mr-2" /> Available
              </p>
              <p>
                <span className="inline-block w-3 h-3 bg-yellow-100 border border-yellow-300 mr-2" /> Fast filling
              </p>
              <p>
                <span className="inline-block w-3 h-3 bg-red-100 border border-red-300 mr-2" /> Sold out
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-gray-900">Booking Details</h3>

            <p className="text-sm text-gray-600 mt-2 mb-5">
              Select only the first day. End date is auto-calculated based on trek duration.
            </p>

            <form className="space-y-4" onSubmit={submitBooking}>
              <input
                type="text"
                name="customerName"
                placeholder="Full Name"
                value={form.customerName}
                onChange={handleInputChange}
                className="w-full border rounded px-3 py-2"
                required
              />

              <input
                type="email"
                name="customerEmail"
                placeholder="Email"
                value={form.customerEmail}
                onChange={handleInputChange}
                className="w-full border rounded px-3 py-2"
                required
              />

              <input
                type="text"
                name="customerPhone"
                placeholder="Phone"
                value={form.customerPhone}
                onChange={handleInputChange}
                className="w-full border rounded px-3 py-2"
                required
              />

              <div>
                <label className="block text-sm text-gray-700 mb-1">Choose Batch</label>
                <select
                  value={selectedDepartureId}
                  onChange={(e) => setSelectedDepartureId(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  required
                  disabled={!selectedDateKey}
                >
                  <option value="">Select batch</option>
                  {selectedDateBatches.map((departure) => {
                    const seatsLeft = departure.totalSeats - departure.bookedSeats;

                    return (
                      <option
                        key={departure._id}
                        value={departure._id}
                        disabled={seatsLeft <= 0}
                      >
                        {departure.batchLabel || "Standard Batch"} ({seatsLeft <= 0 ? "Sold Out" : `${seatsLeft} seats left`})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">Participants</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        participants: Math.max(1, Number(current.participants || 1) - 1)
                      }))
                    }
                    className="w-10 h-10 rounded border text-lg"
                  >
                    -
                  </button>

                  <input
                    type="number"
                    name="participants"
                    min="1"
                    max={selectedSeatsLeft || undefined}
                    value={form.participants}
                    onChange={handleInputChange}
                    className="w-full border rounded px-3 py-2 text-center"
                    required
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setForm((current) => {
                        const nextValue = Number(current.participants || 1) + 1;
                        const cappedValue = selectedSeatsLeft
                          ? Math.min(nextValue, selectedSeatsLeft)
                          : nextValue;

                        return {
                          ...current,
                          participants: cappedValue
                        };
                      })
                    }
                    className="w-10 h-10 rounded border text-lg"
                    disabled={Boolean(selectedSeatsLeft && participantCount >= selectedSeatsLeft)}
                  >
                    +
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {formatPrice(pricePerPerson)} per person x {participantCount} participant(s)
                </p>
              </div>

              <div className="border rounded p-3 bg-gray-50">
                <p className="text-sm font-semibold mb-2">Payment</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {PAYMENT_METHODS.map((method) => (
                    <label key={method} className="flex items-center gap-2 capitalize">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={method}
                        checked={form.paymentMethod === method}
                        onChange={handleInputChange}
                      />
                      {method}
                    </label>
                  ))}
                </div>

                <input
                  type="text"
                  name="paymentReference"
                  placeholder={
                    requiresPaymentReference
                      ? "Payment Ref / UPI Txn ID"
                      : "Payment reference (optional for cash)"
                  }
                  value={form.paymentReference}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 mt-3"
                />

                {requiresPaymentReference && (
                  <div className="mt-4 border rounded-lg p-3 bg-white">
                    <p className="text-sm font-semibold mb-2">Scan UPI QR and Pay</p>
                    <img
                      src={qrCodeImageUrl}
                      alt="UPI QR Code"
                      className="w-44 h-44 mx-auto border rounded"
                    />

                    <div className="text-xs text-gray-600 mt-3 space-y-1">
                      <p>
                        <span className="font-semibold">UPI ID:</span> {UPI_ID}
                      </p>
                      <p>
                        <span className="font-semibold">Subtotal:</span> {formatPrice(subtotalAmount)}
                      </p>
                      <p>
                        <span className="font-semibold">GST (5%):</span> {formatPrice(gstAmount)}
                      </p>
                      <p>
                        <span className="font-semibold">Payable:</span> {formatPrice(totalAmount)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (!form.paymentReference.trim()) {
                          setError("Enter payment reference/UTR after payment.");
                          return;
                        }

                        setPaymentConfirmed(true);
                        setError("");
                      }}
                      className="w-full mt-3 bg-green-600 text-white py-2 rounded hover:bg-green-700"
                    >
                      I Have Paid - Confirm Payment
                    </button>

                    {paymentConfirmed && (
                      <p className="text-green-700 text-sm mt-2 font-semibold">
                        Payment successful. You can now submit booking.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <textarea
                name="notes"
                placeholder="Special request (optional)"
                value={form.notes}
                onChange={handleInputChange}
                className="w-full border rounded px-3 py-2 h-24"
              />

              <div className="bg-gray-50 border rounded p-4 text-sm space-y-1">
                <p>
                  <span className="font-semibold">Batch:</span>{" "}
                  {selectedDeparture?.batchLabel || "Not selected"}
                </p>
                <p>
                  <span className="font-semibold">Trek Dates:</span>{" "}
                  {selectedStartDate && selectedEndDate
                    ? formatDateRange(selectedStartDate, selectedEndDate)
                    : "Not selected"}
                </p>
                <p>
                  <span className="font-semibold">Seats left:</span>{" "}
                  {selectedDeparture ? selectedSeatsLeft : "-"}
                </p>
                <p>
                  <span className="font-semibold">Subtotal:</span> {formatPrice(subtotalAmount)}
                </p>
                <p>
                  <span className="font-semibold">GST (5%):</span> {formatPrice(gstAmount)}
                </p>
                <p>
                  <span className="font-semibold">Total:</span> {formatPrice(totalAmount)}
                </p>
              </div>

              {error && <p className="text-red-600 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={submitting || !selectedDateKey || !selectedDepartureId}
                className="w-full bg-green-600 text-white py-3 rounded font-semibold hover:bg-green-700 disabled:bg-gray-400"
              >
                {submitting ? "Submitting..." : "Pay & Submit Booking"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;
