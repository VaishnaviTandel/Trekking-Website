import { useEffect, useState } from "react";
import axios from "axios";
import AdminLayout from "./AdminLayout";

const formatPrice = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(amount) || 0);

const initialSummary = {
  totalTrips: 0,
  totalMessages: 0,
  totalBookings: 0,
  pendingBookings: 0,
  confirmedBookings: 0,
  cancelledBookings: 0,
  totalRevenue: 0,
  totalRoomBookings: 0,
  pendingRoomBookings: 0,
  confirmedRoomBookings: 0,
  cancelledRoomBookings: 0,
  totalRoomRevenue: 0
};

export default function AdminDashboard() {
  const [summary, setSummary] = useState(initialSummary);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const [trekSummary, roomSummary] = await Promise.all([
          axios.get("http://localhost:5000/api/bookings/summary"),
          axios.get("http://localhost:5000/api/room-bookings/summary")
        ]);
        setSummary({
          ...initialSummary,
          ...(trekSummary.data || {}),
          ...(roomSummary.data || {})
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  const clearAllData = async () => {
    if (!window.confirm("Are you sure you want to delete ALL bookings, room bookings, and contact messages? This action cannot be undone.")) {
      return;
    }

    setClearing(true);
    try {
      await axios.delete("http://localhost:5000/api/admin/clear-data");
      alert("All data cleared successfully");
      // Refresh summary
      window.location.reload();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to clear data");
    } finally {
      setClearing(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Admin Dashboard</h2>
          <button
            onClick={clearAllData}
            disabled={clearing}
            className="bg-red-600 text-white px-4 py-2 rounded disabled:bg-gray-400"
          >
            {clearing ? "Clearing..." : "Clear All Data"}
          </button>
        </div>

        {loading ? (
          <div className="bg-white p-6 rounded shadow">Loading dashboard...</div>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            <div className="bg-white p-6 shadow rounded">
              <h3 className="text-gray-500">Total Trips</h3>
              <p className="text-3xl font-bold">{summary.totalTrips}</p>
            </div>

            <div className="bg-white p-6 shadow rounded">
              <h3 className="text-gray-500">Messages</h3>
              <p className="text-3xl font-bold">{summary.totalMessages}</p>
            </div>

            <div className="bg-white p-6 shadow rounded">
              <h3 className="text-gray-500">Total Bookings</h3>
              <p className="text-3xl font-bold">{summary.totalBookings}</p>
            </div>

            <div className="bg-white p-6 shadow rounded">
              <h3 className="text-gray-500">Total Room Bookings</h3>
              <p className="text-3xl font-bold">{summary.totalRoomBookings}</p>
            </div>

            <div className="bg-white p-6 shadow rounded border-l-4 border-yellow-400">
              <h3 className="text-gray-500">Pending Bookings</h3>
              <p className="text-3xl font-bold">{summary.pendingBookings}</p>
            </div>

            <div className="bg-white p-6 shadow rounded border-l-4 border-green-500">
              <h3 className="text-gray-500">Confirmed Bookings</h3>
              <p className="text-3xl font-bold">{summary.confirmedBookings}</p>
            </div>

            <div className="bg-white p-6 shadow rounded border-l-4 border-green-500">
              <h3 className="text-gray-500">Confirmed Room Bookings</h3>
              <p className="text-3xl font-bold">{summary.confirmedRoomBookings}</p>
            </div>

            <div className="bg-white p-6 shadow rounded border-l-4 border-red-500">
              <h3 className="text-gray-500">Cancelled Bookings</h3>
              <p className="text-3xl font-bold">{summary.cancelledBookings}</p>
            </div>

            <div className="bg-white p-6 shadow rounded sm:col-span-2 xl:col-span-3">
              <h3 className="text-gray-500">Revenue from Confirmed Bookings</h3>
              <p className="text-3xl font-bold text-green-700 mt-1">
                {formatPrice(summary.totalRevenue)}
              </p>
            </div>

            <div className="bg-white p-6 shadow rounded sm:col-span-2 xl:col-span-3">
              <h3 className="text-gray-500">Revenue from Confirmed Room Bookings</h3>
              <p className="text-3xl font-bold text-green-700 mt-1">
                {formatPrice(summary.totalRoomRevenue)}
              </p>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
