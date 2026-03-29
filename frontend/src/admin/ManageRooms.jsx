import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import AdminLayout from "./AdminLayout";

const API_BASE = "https://southfriends.onrender.com";

const formatPrice = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(value) || 0);

const getImageUrl = (imagePath = "") => {
  if (!imagePath) {
    return "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=900&q=80";
  }

  if (/^https?:\/\//i.test(imagePath)) {
    return imagePath;
  }

  return `${API_BASE}/uploads/${imagePath}`;
};

export default function ManageRooms() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const response = await axios.get("https://southfriends.onrender.com/api/rooms");
        setRooms(Array.isArray(response.data) ? response.data : []);
      } catch (_error) {
        setRooms([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, []);

  const deleteRoom = async (id) => {
    if (!window.confirm("Delete this room?")) {
      return;
    }

    try {
      await axios.delete(`https://southfriends.onrender.com/api/rooms/${id}`);
      setRooms((current) => current.filter((room) => room._id !== id));
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to delete room.");
    }
  };

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <h2 className="text-2xl font-bold mb-6">Manage Rooms</h2>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <p className="p-6">Loading rooms...</p>
            ) : (
              <table className="w-full min-w-[950px]">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-4 text-left">Image</th>
                    <th className="p-4 text-left">Property</th>
                    <th className="p-4 text-left">Location</th>
                    <th className="p-4 text-left">Room Types</th>
                    <th className="p-4 text-left">Starting Price</th>
                    <th className="p-4 text-left">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {rooms.map((room) => {
                    const roomTypes = Array.isArray(room.roomTypes) ? room.roomTypes : [];

                    return (
                      <tr key={room._id} className="border-t hover:bg-gray-50">
                        <td className="p-4">
                          <img
                            src={getImageUrl(room.coverImage || room.gallery?.[0] || "")}
                            alt={room.name}
                            className="w-20 h-14 object-cover rounded"
                          />
                        </td>

                        <td className="p-4 font-semibold">{room.name}</td>
                        <td className="p-4">{room.location}</td>
                        <td className="p-4">{roomTypes.length}</td>
                        <td className="p-4 text-green-700 font-bold">
                          {formatPrice(room.startingPrice)}
                        </td>

                        <td className="p-4">
                          <div className="flex flex-wrap gap-3">
                            <button
                              onClick={() => navigate(`/admin/edit-room/${room._id}`)}
                              className="bg-blue-500 text-white px-4 py-1 rounded hover:bg-blue-600"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => deleteRoom(room._id)}
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
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
