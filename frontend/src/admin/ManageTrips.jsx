import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import AdminLayout from "./AdminLayout";

const getSeatSummary = (trip) => {
  const departures = Array.isArray(trip?.departures) ? trip.departures : [];
  const totalSeats = departures.reduce(
    (sum, departure) => sum + Number(departure?.totalSeats || 0),
    0
  );
  const bookedSeats = departures.reduce(
    (sum, departure) => sum + Number(departure?.bookedSeats || 0),
    0
  );

  return {
    departuresCount: departures.length,
    totalSeats,
    seatsLeft: Math.max(0, totalSeats - bookedSeats)
  };
};

export default function ManageTrips() {
  const [trips, setTrips] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    axios
      .get("https://southfriends.onrender.com/api/trips")
      .then((res) => {
        setTrips(res.data);
      })
      .catch(() => {
        setTrips([]);
      });
  }, []);

  const deleteTrip = async (id) => {
    await axios.delete(`https://southfriends.onrender.com/api/trips/${id}`);
    alert("Trip Deleted");
    setTrips((current) => current.filter((trip) => trip._id !== id));
  };

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <h2 className="text-2xl font-bold mb-6">Manage Treks</h2>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-4 text-left">Image</th>
                  <th className="p-4 text-left">Title</th>
                  <th className="p-4 text-left">Location</th>
                  <th className="p-4 text-left">Price</th>
                  <th className="p-4 text-left">Departures</th>
                  <th className="p-4 text-left">Current Seats</th>
                  <th className="p-4 text-left">Actions</th>
                </tr>
              </thead>

              <tbody>
                {trips.map((trip) => {
                  const summary = getSeatSummary(trip);

                  return (
                    <tr key={trip._id} className="border-t hover:bg-gray-50">
                      <td className="p-4">
                        <img
                          src={`https://southfriends.onrender.com/uploads/${trip.coverImage}`}
                          alt={trip.title}
                          className="w-20 h-14 object-cover rounded"
                        />
                      </td>

                      <td className="p-4 font-semibold">{trip.title}</td>

                      <td className="p-4">{trip.location}</td>

                      <td className="p-4 text-green-600 font-bold">INR {trip.price}</td>

                      <td className="p-4">{summary.departuresCount}</td>

                      <td className="p-4">
                        {summary.seatsLeft} / {summary.totalSeats}
                      </td>

                      <td className="p-4">
                        <div className="flex flex-wrap gap-3">
                          <button
                            onClick={() => navigate(`/admin/edit/${trip._id}`)}
                            className="bg-blue-500 text-white px-4 py-1 rounded hover:bg-blue-600"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => deleteTrip(trip._id)}
                            className="bg-red-500 text-white px-4 py-1 rounded hover:bg-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
