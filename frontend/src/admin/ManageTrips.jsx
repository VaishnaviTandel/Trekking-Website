import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import AdminLayout from "./AdminLayout";

export default function ManageTrips(){

  const [trips, setTrips] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {

    axios.get("http://localhost:5000/api/trips")
    .then(res => {
      setTrips(res.data);
    });

  }, []);

  const deleteTrip = async (id) => {

    await axios.delete(`http://localhost:5000/api/trips/${id}`);

    alert("Trip Deleted");

    setTrips(trips.filter(t => t._id !== id));

  };

  return(

    <AdminLayout>

      <div className="p-8">

        <h2 className="text-2xl font-bold mb-6">
          Manage Treks
        </h2>

        <div className="bg-white rounded-lg shadow overflow-hidden">

          <table className="w-full">

            <thead className="bg-gray-100">

              <tr>
                <th className="p-4 text-left">Image</th>
                <th className="p-4 text-left">Title</th>
                <th className="p-4 text-left">Location</th>
                <th className="p-4 text-left">Price</th>
                <th className="p-4 text-left">Actions</th>
              </tr>

            </thead>

            <tbody>

              {trips.map((trip) => (

                <tr
                  key={trip._id}
                  className="border-t hover:bg-gray-50"
                >

                  <td className="p-4">
                    <img
                      src={`http://localhost:5000/uploads/${trip.coverImage}`}
                      alt={trip.title}
                      className="w-20 h-14 object-cover rounded"
                    />
                  </td>

                  <td className="p-4 font-semibold">
                    {trip.title}
                  </td>

                  <td className="p-4">
                    {trip.location}
                  </td>

                  <td className="p-4 text-green-600 font-bold">
                    ₹{trip.price}
                  </td>

                  <td className="p-4 flex gap-3">

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

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      </div>

    </AdminLayout>

  );

}