import { Link } from "react-router-dom";

const API_BASE = "https://southfriends.onrender.com";

const formatPrice = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(value) || 0);

const toImageUrl = (imagePath = "") => {
  if (!imagePath) {
    return "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=900&q=80";
  }

  if (/^https?:\/\//i.test(imagePath)) {
    return imagePath;
  }

  return `${API_BASE}/uploads/${imagePath}`;
};

export default function RoomCard({ room }) {
  const roomTypes = Array.isArray(room?.roomTypes) ? room.roomTypes.filter((type) => type?.isActive) : [];
  const startingPrice = Number(room?.startingPrice || roomTypes[0]?.pricePerNight || 0);
  const cover = toImageUrl(room?.coverImage || room?.gallery?.[0] || "");

  return (
    <div className="bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition">
      <img src={cover} alt={room?.name} className="w-full h-56 object-cover" />

      <div className="p-4">
        <h3 className="text-lg font-bold text-gray-900">{room?.name}</h3>
        <p className="text-sm text-gray-600 mt-1">{room?.location}</p>

        <div className="mt-3 flex flex-wrap gap-2">
          {roomTypes.slice(0, 3).map((type) => (
            <span key={type._id} className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
              {type.label}
            </span>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Starting from</p>
            <p className="text-lg font-bold text-green-700">{formatPrice(startingPrice)} / night</p>
          </div>

          <Link
            to={`/room/${room?._id}`}
            className="bg-green-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-700"
          >
            View Room
          </Link>
        </div>
      </div>
    </div>
  );
}
