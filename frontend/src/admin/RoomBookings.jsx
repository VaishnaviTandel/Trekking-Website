import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import AdminLayout from "./AdminLayout";

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

const formatPrice = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(amount) || 0);

const statusClass = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700"
};

const paymentClass = {
  paid: "bg-sky-100 text-sky-700",
  pending: "bg-orange-100 text-orange-700",
  rejected: "bg-rose-100 text-rose-700"
};

export default function RoomBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const fetchBookings = useCallback(async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams();

      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }

      params.set("page", String(page));
      params.set("limit", "10");

      if (searchQuery) {
        params.set("q", searchQuery);
      }

      const response = await axios.get(`https://southfriends.onrender.com/api/room-bookings?${params.toString()}`);
      setBookings(response.data?.items || []);
      setPages(response.data?.pages || 1);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, statusFilter]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const updateStatus = async (bookingId, status) => {
    setUpdatingId(bookingId);

    try {
      await axios.patch(`https://southfriends.onrender.com/api/room-bookings/${bookingId}/status`, { status });
      await fetchBookings();
    } catch (error) {
      alert(error.response?.data?.message || "Status update failed");
    } finally {
      setUpdatingId("");
    }
  };

  const updatePaymentStatus = async (bookingId, paymentStatus) => {
    setUpdatingId(bookingId);

    try {
      await axios.patch(`https://southfriends.onrender.com/api/room-bookings/${bookingId}/status`, {
        paymentStatus
      });
      await fetchBookings();
    } catch (error) {
      alert(error.response?.data?.message || "Payment update failed");
    } finally {
      setUpdatingId("");
    }
  };

  const deleteBooking = async (bookingId) => {
    if (!window.confirm("Are you sure you want to delete this room booking?")) {
      return;
    }

    setUpdatingId(bookingId);

    try {
      await axios.delete(`https://southfriends.onrender.com/api/room-bookings/${bookingId}`);
      await fetchBookings();
      alert("Room booking deleted successfully");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to delete room booking");
    } finally {
      setUpdatingId("");
    }
  };

  const applySearch = () => {
    setPage(1);
    setSearchQuery(searchInput.trim());
  };

  const resetSearch = () => {
    setSearchInput("");
    setSearchQuery("");
    setPage(1);
  };

  const changeFilter = (status) => {
    setStatusFilter(status);
    setPage(1);
  };

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <h1 className="text-3xl font-bold mb-6">Room Bookings</h1>

        <div className="flex flex-wrap gap-2 mb-4">
          {["all", "pending", "confirmed", "cancelled"].map((status) => (
            <button
              key={status}
              onClick={() => changeFilter(status)}
              className={`px-4 py-2 rounded-full text-sm font-semibold border ${
                statusFilter === status
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-700 border-gray-200"
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="bg-white p-4 rounded shadow mb-5 flex flex-wrap gap-3 items-center">
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                applySearch();
              }
            }}
            placeholder="Search by customer, room, type, invoice, phone"
            className="flex-1 min-w-[260px] border rounded px-3 py-2"
          />

          <button type="button" onClick={applySearch} className="bg-gray-900 text-white px-4 py-2 rounded">
            Search
          </button>

          <button type="button" onClick={resetSearch} className="bg-gray-100 text-gray-700 px-4 py-2 rounded border">
            Reset
          </button>
        </div>

        <div className="bg-white p-4 sm:p-6 shadow rounded overflow-x-auto">
          {loading ? (
            <p>Loading bookings...</p>
          ) : bookings.length === 0 ? (
            <p className="text-gray-600">No room bookings yet.</p>
          ) : (
            <table className="w-full min-w-[1200px]">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="text-left p-3">Customer</th>
                  <th className="text-left p-3">Room</th>
                  <th className="text-left p-3">Stay</th>
                  <th className="text-left p-3">Guests</th>
                  <th className="text-left p-3">Guest Split</th>
                  <th className="text-left p-3">Amount</th>
                  <th className="text-left p-3">Payment</th>
                  <th className="text-left p-3">Invoice</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Actions</th>
                </tr>
              </thead>

              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking._id} className="border-b align-top">
                    <td className="p-3">
                      <p className="font-semibold">{booking.customerName}</p>
                      <p className="text-sm text-gray-600">{booking.customerEmail}</p>
                      <p className="text-sm text-gray-600">{booking.customerPhone}</p>
                    </td>

                    <td className="p-3">
                      <p className="font-medium">{booking.roomName}</p>
                      <p className="text-sm text-gray-600">{booking.roomLocation}</p>
                      <p className="text-sm text-gray-600">{booking.roomTypeLabel}</p>
                      <p className="text-xs text-gray-500">
                        {booking.shareType?.toUpperCase()} |{" "}
                        {booking.acType === "non_ac" ? "Non-AC" : "AC"}
                      </p>
                    </td>

                    <td className="p-3">
                      <p className="text-sm">
                        {formatDate(booking.checkIn)} to {formatDate(booking.checkOut)}
                      </p>
                      <p className="text-xs text-gray-500">{booking.nights} night(s)</p>
                      <p className="text-xs text-gray-500">{booking.roomsCount} room(s)</p>
                    </td>

                    <td className="p-3">{booking.guestsCount}</td>
                    <td className="p-3 text-xs text-gray-600">
                      <p>Adults: {booking.adultsCount ?? "-"}</p>
                      <p>Children 10+: {booking.childrenAbove10Count ?? 0}</p>
                      <p>Children &lt;10: {booking.childrenBelow10Count ?? 0}</p>
                    </td>

                    <td className="p-3">
                      <p>{formatPrice(booking.totalAmount)}</p>
                      {Number(booking.concessionAmount || 0) > 0 && (
                        <p className="text-xs text-green-700 mt-1">
                          Concession: -{formatPrice(booking.concessionAmount)}
                        </p>
                      )}
                    </td>

                    <td className="p-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          paymentClass[booking.paymentStatus] || "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {booking.paymentStatus || "pending"} via {booking.paymentMethod || "upi_qr"}
                      </span>
                      <p className="text-xs text-gray-600 mt-2">
                        Ref: {booking.paymentReference || "N/A"}
                      </p>
                      {booking.paymentScreenshot && (
                        <a
                          href={`https://southfriends.onrender.com/uploads/${booking.paymentScreenshot}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-700 underline"
                        >
                          View payment proof
                        </a>
                      )}
                    </td>

                    <td className="p-3 text-sm">{booking.invoiceNumber}</td>

                    <td className="p-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          statusClass[booking.status] || "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {booking.status}
                      </span>
                    </td>

                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => updatePaymentStatus(booking._id, "paid")}
                          disabled={updatingId === booking._id || booking.paymentStatus === "paid"}
                          className="bg-sky-600 text-white px-3 py-1 rounded disabled:bg-gray-400"
                        >
                          Mark Paid
                        </button>

                        <button
                          onClick={() => updateStatus(booking._id, "confirmed")}
                          disabled={updatingId === booking._id || booking.status === "confirmed"}
                          className="bg-green-600 text-white px-3 py-1 rounded disabled:bg-gray-400"
                        >
                          Confirm
                        </button>

                        <button
                          onClick={() => updateStatus(booking._id, "cancelled")}
                          disabled={updatingId === booking._id || booking.status === "cancelled"}
                          className="bg-red-500 text-white px-3 py-1 rounded disabled:bg-gray-400"
                        >
                          Cancel
                        </button>

                        <button
                          onClick={() => deleteBooking(booking._id)}
                          disabled={updatingId === booking._id}
                          className="bg-red-700 text-white px-3 py-1 rounded disabled:bg-gray-400"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-3 items-center justify-between">
          <p className="text-sm text-gray-600">
            Page {page} of {pages}
          </p>

          <div className="flex gap-2">
            <button
              onClick={() => setPage((current) => Math.max(current - 1, 1))}
              disabled={page === 1 || loading}
              className="px-4 py-2 border rounded disabled:opacity-40"
            >
              Previous
            </button>

            <button
              onClick={() => setPage((current) => Math.min(current + 1, pages))}
              disabled={page === pages || loading}
              className="px-4 py-2 border rounded disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
