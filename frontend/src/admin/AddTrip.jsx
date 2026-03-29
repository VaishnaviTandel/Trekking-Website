import { useState } from "react";
import axios from "axios";
import AdminLayout from "./AdminLayout";

const emptyTrip = {
  title: "",
  location: "",
  price: "",
  duration: "",
  durationDays: 1,
  difficulty: "",
  description: "",
  itinerary: ""
};

const emptyDeparture = {
  batchLabel: "Batch A",
  date: "",
  totalSeats: ""
};

export default function AddTrip() {
  const [trip, setTrip] = useState(emptyTrip);
  const [coverImage, setCoverImage] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [departures, setDepartures] = useState([{ ...emptyDeparture }]);

  const handleChange = (e) => {
    setTrip({
      ...trip,
      [e.target.name]: e.target.value
    });
  };

  const handleDepartureChange = (index, field, value) => {
    setDepartures((current) =>
      current.map((departure, depIndex) =>
        depIndex === index
          ? {
              ...departure,
              [field]: value
            }
          : departure
      )
    );
  };

  const addDepartureRow = () => {
    setDepartures((current) => [...current, { ...emptyDeparture }]);
  };

  const removeDepartureRow = (index) => {
    setDepartures((current) => current.filter((_, depIndex) => depIndex !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validDepartures = departures
      .filter((departure) => departure.date && departure.totalSeats)
      .map((departure) => ({
        batchLabel: departure.batchLabel || "Standard Batch",
        date: departure.date,
        totalSeats: Number(departure.totalSeats)
      }));

    if (!validDepartures.length) {
      alert("Please add at least one departure with seats.");
      return;
    }

    const formData = new FormData();

    formData.append("title", trip.title);
    formData.append("location", trip.location);
    formData.append("price", trip.price);
    formData.append("duration", trip.duration);
    formData.append("durationDays", trip.durationDays);
    formData.append("difficulty", trip.difficulty);
    formData.append("description", trip.description);
    formData.append("itinerary", trip.itinerary);
    formData.append("departures", JSON.stringify(validDepartures));

    if (coverImage) {
      formData.append("coverImage", coverImage);
    }

    gallery.forEach((img) => {
      formData.append("gallery", img);
    });

    await axios.post("https://southfriends.onrender.com/api/trips", formData);

    alert("Trip Added Successfully");

    setTrip(emptyTrip);
    setCoverImage(null);
    setGallery([]);
    setDepartures([{ ...emptyDeparture }]);
  };

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto bg-white p-4 sm:p-6 lg:p-8 rounded-lg shadow">
          <h2 className="text-2xl font-bold mb-6">Add New Trip</h2>

          <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block mb-1 font-semibold">Trip Title</label>
            <input
              name="title"
              placeholder="Kudremukh Trek"
              value={trip.title}
              onChange={handleChange}
              className="w-full border p-2 rounded"
              required
            />
          </div>

          <div>
            <label className="block mb-1 font-semibold">Location</label>
            <input
              name="location"
              placeholder="Karnataka"
              value={trip.location}
              onChange={handleChange}
              className="w-full border p-2 rounded"
              required
            />
          </div>

          <div>
            <label className="block mb-1 font-semibold">Price</label>
            <input
              name="price"
              type="number"
              min="0"
              placeholder="4500"
              value={trip.price}
              onChange={handleChange}
              className="w-full border p-2 rounded"
              required
            />
          </div>

          <div>
            <label className="block mb-1 font-semibold">Duration</label>
            <input
              name="duration"
              placeholder="2 Days"
              value={trip.duration}
              onChange={handleChange}
              className="w-full border p-2 rounded"
              required
            />
          </div>

          <div>
            <label className="block mb-1 font-semibold">Duration (Days)</label>
            <input
              name="durationDays"
              type="number"
              min="1"
              value={trip.durationDays}
              onChange={handleChange}
              className="w-full border p-2 rounded"
              required
            />
          </div>

          <div>
            <label className="block mb-1 font-semibold">Difficulty</label>
            <input
              name="difficulty"
              placeholder="Easy / Moderate / Hard"
              value={trip.difficulty}
              onChange={handleChange}
              className="w-full border p-2 rounded"
            />
          </div>

          <div>
            <label className="block mb-1 font-semibold">Cover Image</label>
            <input
              type="file"
              onChange={(e) => setCoverImage(e.target.files[0])}
              className="w-full border p-2 rounded"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block mb-1 font-semibold">Gallery Images</label>
            <input
              type="file"
              multiple
              onChange={(e) => setGallery([...e.target.files])}
              className="w-full border p-2 rounded"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block mb-1 font-semibold">Trip Overview</label>
            <textarea
              name="description"
              placeholder="Write trek overview..."
              value={trip.description}
              onChange={handleChange}
              className="w-full border p-2 rounded h-24"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block mb-1 font-semibold">Itinerary</label>
            <textarea
              name="itinerary"
              placeholder="Day 1: Base camp to camp 1..."
              value={trip.itinerary}
              onChange={handleChange}
              className="w-full border p-2 rounded h-24"
            />
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <label className="font-semibold">Departures</label>
              <button
                type="button"
                onClick={addDepartureRow}
                className="bg-gray-900 text-white text-sm px-4 py-2 rounded hover:bg-black"
              >
                Add Departure
              </button>
            </div>

            <div className="space-y-3">
              {departures.map((departure, index) => (
                <div key={index} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <input
                    type="text"
                    value={departure.batchLabel}
                    onChange={(e) => handleDepartureChange(index, "batchLabel", e.target.value)}
                    placeholder="Batch name"
                    className="sm:col-span-4 border p-2 rounded"
                  />

                  <input
                    type="date"
                    value={departure.date}
                    onChange={(e) => handleDepartureChange(index, "date", e.target.value)}
                    className="sm:col-span-3 border p-2 rounded"
                  />

                  <input
                    type="number"
                    min="1"
                    placeholder="Seats"
                    value={departure.totalSeats}
                    onChange={(e) => handleDepartureChange(index, "totalSeats", e.target.value)}
                    className="sm:col-span-3 border p-2 rounded"
                  />

                  <button
                    type="button"
                    onClick={() => removeDepartureRow(index)}
                    className="sm:col-span-2 bg-red-500 text-white py-2 rounded hover:bg-red-600"
                    disabled={departures.length === 1}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              className="bg-green-600 text-white px-6 py-3 rounded hover:bg-green-700"
            >
              Add Trip
            </button>
          </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}
