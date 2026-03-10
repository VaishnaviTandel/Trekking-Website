import { Link } from "react-router-dom";

const treks = [
  {
    id: 1,
    title: "Upcoming Treks in Mumbai",
    price: "₹699",
    tours: 13,
    image:
      "https://images.unsplash.com/photo-1501785888041-af3ef285b470",
  },
  {
    id: 2,
    title: "Upcoming Treks in Pune",
    price: "₹899",
    tours: 10,
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee",
  },
  {
    id: 3,
    title: "Weekend Trip Mumbai & Pune",
    price: "₹5499",
    tours: 18,
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e",
  },
  {
    id: 4,
    title: "Weekend Trips from Delhi",
    price: "₹4499",
    tours: 30,
    image:
      "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429",
  },
];

const PopularTreks = () => {
  return (
    <div className="max-w-7xl mx-auto mt-10 px-4">

      <h2 className="text-3xl font-bold mb-6">
        Popular Treks
      </h2>

      <div className="grid md:grid-cols-2 gap-6">

        {treks.map((trek) => (
          <div
            key={trek.id}
            className="relative group overflow-hidden rounded-lg shadow-lg"
          >
            <img
              src={trek.image}
              alt={trek.title}
              className="w-full h-72 object-cover transform group-hover:scale-110 transition duration-500"
            />

            {/* Overlay */}
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition"></div>

            {/* Content */}
            <div className="absolute bottom-6 left-6 text-white">

              <h3 className="text-2xl font-bold">
                {trek.title}
              </h3>

              <p className="text-sm">
                Tours {trek.tours} • Starting From {trek.price}
              </p>

              <Link
                to={`/trip/${trek.id}`}
                className="inline-block mt-3 border px-4 py-2 hover:bg-white hover:text-black transition"
              >
                View Details
              </Link>

            </div>

          </div>
        ))}

      </div>

    </div>
  );
};

export default PopularTreks;