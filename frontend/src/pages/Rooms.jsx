import { useEffect, useState } from "react";
import RoomCard from "../components/RoomCard";
import { getRooms } from "../services/rooms";

export default function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const fetchRooms = async (params = {}) => {
    setLoading(true);
    setError("");

    try {
      const data = await getRooms({ active: true, ...params });
      setRooms(Array.isArray(data) ? data : []);
    } catch (_error) {
      setError("Failed to load rooms.");
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const applySearch = () => {
    const query = searchInput.trim();
    setLocationFilter(query);
    fetchRooms(query ? { location: query } : {});
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Available Rooms</h1>
          <p className="text-gray-600 mt-1">Choose from single/double share AC or Non-AC stays.</p>
        </div>

        <div className="flex gap-2">
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                applySearch();
              }
            }}
            placeholder="Search by location"
            className="border rounded-lg px-3 py-2 w-56"
          />
          <button
            type="button"
            onClick={applySearch}
            className="bg-gray-900 text-white px-4 py-2 rounded-lg"
          >
            Search
          </button>
        </div>
      </div>

      {locationFilter && (
        <p className="text-sm text-gray-600 mb-4">
          Showing rooms near: <span className="font-semibold">{locationFilter}</span>
        </p>
      )}

      {loading ? (
        <p className="text-gray-700">Loading rooms...</p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : rooms.length === 0 ? (
        <p className="text-gray-600">No rooms available right now.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room) => (
            <RoomCard key={room._id} room={room} />
          ))}
        </div>
      )}
    </div>
  );
}
