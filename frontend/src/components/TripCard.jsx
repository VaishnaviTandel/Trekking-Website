import { Link } from "react-router-dom";

const TripCard = ({ trip }) => {
  return (
    <Link to={`/trip/${trip._id}`}>
      <div className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition duration-300 group">

        {/* Image */}
        <div className="relative h-56 overflow-hidden">
          <img src={trip.coverImage} alt={trip.title} 
            className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
          />

          {/* Price badge */}
          <div className="absolute top-3 right-3 bg-green-500 text-white px-3 py-1 rounded-lg text-sm font-semibold">
            ₹ {trip.price}
          </div>
        </div>

        {/* Content */}
        <div className="p-5">

          <h2 className="text-xl font-bold mb-2 group-hover:text-green-600">
            {trip.title}
          </h2>

          <p className="text-gray-500 mb-1">
            📍 {trip.location}
          </p>

          <p className="text-gray-500 mb-3">
            ⏱ {trip.duration}
          </p>

          <button className="w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition">
            View Details
          </button>

        </div>

      </div>
    </Link>
  );
};

export default TripCard;