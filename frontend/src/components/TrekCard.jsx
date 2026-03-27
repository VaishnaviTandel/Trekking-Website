import { Link } from "react-router-dom";

const TrekCard = ({ trip }) => {
  return (
    <div className="relative overflow-hidden rounded-xl shadow-lg group">
      <img
        src={`http://localhost:5000/uploads/${trip.coverImage}`}
        alt={trip.title}
        className="w-full h-60 object-cover"
      />

      <div className="absolute inset-0 bg-black bg-opacity-40 flex flex-col justify-end p-4 text-white">
        <h3 className="text-lg font-bold">{trip.title}</h3>

        <p className="text-sm">Location: {trip.location}</p>

        <p className="text-sm mb-2">INR {trip.price}</p>

        <Link
          to={`/trip/${trip._id}`}
          className="bg-green-500 text-center py-2 rounded hover:bg-green-600"
        >
          View Details
        </Link>
      </div>
    </div>
  );
};

export default TrekCard;
