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
  totalRevenue: 0
};

export default function AdminDashboard() {
  const [summary, setSummary] = useState(initialSummary);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/bookings/summary");
        setSummary(response.data || initialSummary);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  return (
    <AdminLayout>
      <div className="p-8">
        <h2 className="text-2xl font-bold mb-6">Admin Dashboard</h2>

        {loading ? (
          <div className="bg-white p-6 rounded shadow">Loading dashboard...</div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
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

            <div className="bg-white p-6 shadow rounded border-l-4 border-yellow-400">
              <h3 className="text-gray-500">Pending Bookings</h3>
              <p className="text-3xl font-bold">{summary.pendingBookings}</p>
            </div>

            <div className="bg-white p-6 shadow rounded border-l-4 border-green-500">
              <h3 className="text-gray-500">Confirmed Bookings</h3>
              <p className="text-3xl font-bold">{summary.confirmedBookings}</p>
            </div>

            <div className="bg-white p-6 shadow rounded border-l-4 border-red-500">
              <h3 className="text-gray-500">Cancelled Bookings</h3>
              <p className="text-3xl font-bold">{summary.cancelledBookings}</p>
            </div>

            <div className="bg-white p-6 shadow rounded md:col-span-3">
              <h3 className="text-gray-500">Revenue from Confirmed Bookings</h3>
              <p className="text-3xl font-bold text-green-700 mt-1">
                {formatPrice(summary.totalRevenue)}
              </p>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
